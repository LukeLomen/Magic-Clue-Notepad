import {
  SYMBOLS
} from "./table_symbols.js";
import {
  cardsAPI
} from './clue_cards.js';

/// One row of the game's "history log": a single suggestion made by one player to another
/// (or, for a solo player's own turn, a note about which card(s) they showed). The entire
/// board state is never stored directly - it's always recomputed by replaying every
/// Suggestion in `suggestionHistory` in order (see DataManager.WritePlayerDataFromSuggestionHistory).
/// That's what makes it possible to browse back to an old turn, edit just its response, and
/// have every downstream deduction recompute correctly.
export class Suggestion {
  constructor({
    cardArray = ['', '', ''], /// the [suspect, weapon, room] card indexes that were suggested
    suggester, /// Player who made the suggestion
    suggestee, /// Player who was asked to respond
    response, /// how they responded - see ConfirmSuggestionResponse for the possible shapes
    turn, /// index of this suggestion within suggestionHistory (also its "turn number")
    roundNumber = 1, /// which suggestion this is overall, 1-based (the "3" in "3:2")
    stepInRound = 1 /// which player-in-the-circle this is for that suggestion, 1-based (the "2" in "3:2")
  }) {
    this.turn = turn;
    this.cardArray = cardArray;
    this.suggester = suggester;
    this.suggestee = suggestee;
    this.response = response;
    this.roundNumber = roundNumber;
    this.stepInRound = stepInRound;
  }
  Clone() {
    const clone = new Suggestion({
      cardArray: this.cardArray,
      suggester: this.suggester,
      suggestee: this.suggestee,
      response: this.response,
      turn: this.turn,
      roundNumber: this.roundNumber,
      stepInRound: this.stepInRound
    })
    return clone;
  }
}

/// Tracks one player's per-card knowledge state (their row on the table) plus the
/// "possible card" groups used for process-of-elimination deduction. A Player object is
/// rebuilt from scratch on every WritePlayerDataFromSuggestionHistory() replay - it never
/// persists across turns, so any bug here only affects the CURRENT recompute, not stored data.
class Player {
  constructor(name, index, numPlayers, playersArray, numCards) {
    this.name = name;
    this.index = index; /// this player's seat position, used to find "the next player" in turn order
    this.numPlayers = numPlayers;
    this.playersArray = playersArray; /// shared reference to ALL players, so a player can update others (e.g. SetKnownHave marking everyone else void for that card)
    this.numCards = numCards; /// how many cards this player was dealt - once this many are known, the rest can be inferred void

    /// One symbol per possible card index (0-20: 6 suspects + 6 weapons + 9 rooms).
    this.cardArray = new Array(21).fill(SYMBOLS.unknown);
    /// Groups of "could be any one of these cards" from an unresolved possible-card response.
    /// Each entry is an array of card indexes; as other suggestions narrow things down, cards
    /// get removed from these groups until only one is left, at which point it's promoted to
    /// a known-have (see CheckPossibleCards).
    this.possibleCards = new Array();
    this.cardsKnown = 0;
    this.allCardsKnown = false;
  }

  /// The next player in turn order (clockwise), used to figure out who gets asked next when a
  /// suggestion is passed around the table ("stepInRound" increasing).
  GetNextPlayer() {
    return this.playersArray[(this.index + 1) % this.numPlayers];
  }

  /// Wipes this player back to a blank slate, ready to be replayed forward again.
  ClearData() {
    this.cardArray.fill(SYMBOLS.unknown);
    this.possibleCards = new Array();
    this.cardsKnown = 0;
    this.allCardsKnown = false;
  }

  GetCardSymbol(index) {
    return this.cardArray[index];
  }

  /// True if we've already proven this player doesn't hold `card` - void, extra (dealt
  /// face-down, so nobody holds it), or the hidden/envelope card.
  TheyDontHave(card) {
    const c = this.cardArray[card];
    if (
      c == SYMBOLS.knownVoid ||
      c == SYMBOLS.extraCard ||
      c == SYMBOLS.hiddenCard
    ) {
      return true
    } else {
      return false
    }
  }

  SetCardArray(card, value) {
    this.cardArray[card] = value;
  }

  SetExtra(card) {
    this.SetCardArray(card, SYMBOLS.extraCard);
  }

  /// Marks a card void for this player, unless we already know something stronger/conflicting
  /// about it (TheyDontHave short-circuits so this never overwrites e.g. an extra-card marker).
  /// Also cleans up any possible-card groups that included this card, which may in turn resolve
  /// another group down to a single card (see CheckPossibleCards).
  SetKnownVoid(card) {
    if (this.TheyDontHave(card)) {
      return;
    }
    this.SetCardArray(card, SYMBOLS.knownVoid);
    this.RemovePossibleCard(card);
    this.CheckPossibleCards();
  }

  /// Marks a card as confirmed held by this player. This is the one place that can cascade
  /// across ALL players: everyone else is automatically marked void for this card (nobody
  /// else can hold a card that's already someone's), and if this pushes this player's known
  /// count up to their full hand size, every remaining card of theirs becomes inferable void.
  SetKnownHave(card) {
    if (this.cardArray[card] == SYMBOLS.knownHave || this.TheyDontHave(card)) {
      return
    }
    this.cardsKnown++;
    if (this.cardsKnown == this.numCards) {
      this.AllCardsKnown();
    }
    this.SetCardArray(card, SYMBOLS.knownHave);
    this.playersArray.forEach(p => {
      if (p != this) {
        p.SetKnownVoid(card);
      }
    });
  }

  /// Records a "showed one of these cards, but we don't know which" response. Cards in the
  /// group that are still unknown get marked with the possibleCard symbol on the table; the
  /// group itself is tracked so future information can narrow it down (see RemovePossibleCard/
  /// CheckPossibleCards). Duplicate groups (the exact same set of cards) are not tracked twice.
  SetPossible(possibleCardsArray) {
    var pArray = new Array();
    possibleCardsArray.forEach(card => {
      const c = this.cardArray[card]
      if (c == SYMBOLS.unknown || c == SYMBOLS.possibleCard || c == SYMBOLS.knownHave) {
        pArray.push(card);
        if (c == SYMBOLS.unknown) {
          this.SetCardArray(card, SYMBOLS.possibleCard);
        }
      }
    });
    if (pArray.length > 0) {
      const alreadyTracked = this.possibleCards.some(array => this.AreArraysEqual(pArray, array));
      if (!alreadyTracked) {
        this.possibleCards.push(structuredClone(pArray));
      }
    }
    this.CheckPossibleCards();
  }

  AreArraysEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    return arr1.every((element, index) => {
      return element === arr2[index];
    });
  }

  /// Removes `card` from every tracked possible-card group (e.g. once it's been proven void
  /// or known-have some other way, it can't still be "one of the possible cards" in a group).
  /// Iterates backward so splicing mid-loop doesn't skip the next element.
  RemovePossibleCard(card) {
    this.possibleCards.forEach(array => {
      for (let index = array.length - 1; index >= 0; index--) {
        if (array[index] == card) {
          array.splice(index, 1);
        }
      }
    })
  }

  /// Resolves any possible-card group that's been narrowed down to exactly one remaining
  /// card (promote it to known-have) or emptied out entirely (nothing left to track).
  /// Iterates backward since SetKnownHave/splice can shrink `possibleCards` mid-loop.
  CheckPossibleCards() {
    for (let i = this.possibleCards.length - 1; i >= 0; i--) {
      const array = this.possibleCards[i];
      if (array.length == 1) {
        this.SetKnownHave(array[0]);
        this.possibleCards.splice(i, 1);
      } else if (array.length == 0) {
        this.possibleCards.splice(i, 1);
      }
    }
  }

  /// Marks a card as the hidden/envelope card (or an un-held extra) for this player's row.
  SetHidden(card) {
    this.RemovePossibleCard(card);
    this.SetCardArray(card, SYMBOLS.hiddenCard);
  }

  /// Once every card this player was dealt is accounted for, every other card on their row
  /// that isn't already known-have or hidden must be void - there's nothing left to be unsure
  /// about for them.
  AllCardsKnown() {
    this.allCardsKnown = true;
    this.possibleCards = new Array();
    this.cardArray.forEach((card, index) => {
      if (card != SYMBOLS.knownHave && card != SYMBOLS.hiddenCard) {
        this.SetKnownVoid(index);
      }
    });
  }
}

/// The top-level data/deduction engine. Owns the list of players and the append-only
/// `suggestionHistory` log, and is responsible for turning that log into the current
/// (or any past) board state on demand. GameManager is the only thing that talks to this
/// class directly; it never touches Player objects itself.
export class DataManager {
  constructor() {
    this.numPlayers = 0;
    this.players = new Array();
    this.suggestionHistory = new Array();
    this.startingCards = new Array();
    this.extraCards = new Array();
    this.numCards = 0;
    this.numExtra = 0;
  }

  GetNextPlayer(index) {
    const nextPlayer = this.players[index].GetNextPlayer();
    return nextPlayer
  }

  /// Clue always deals all 18 non-envelope cards out as evenly as possible; whatever doesn't
  /// divide evenly becomes "extra" cards dealt face up/known rather than into anyone's hand.
  CalculateNumCards(numPlayers) {
    this.numCards = Math.floor(18 / numPlayers);
    this.numExtra = 18 - numPlayers * this.numCards;
  }

  CreatePlayers(playerNames) {
    this.numPlayers = playerNames.length;
    if (this.numPlayers < 3 || this.numPlayers > 6) {
      console.warn(`Incorrect # of players to play clue`);
    }
    this.CalculateNumCards(this.numPlayers);
    for (let i = 0; i < this.numPlayers; i++) {
      this.players[i] = new Player(playerNames[i], i, this.numPlayers, this.players, this.numCards);
    }
  }

  SetStartingCards(cardArray) {
    if (cardArray.length != this.numCards) {
      console.warn(`Starting cards set to an array of the wrong length`);
    }
    this.startingCards = cardArray;
  }

  SetExtraCards(cardArray) {
    if (cardArray.length != this.numExtra) {
      console.warn(`Extra cards set to an array of the wrong length`);
    }
    this.extraCards = cardArray;
  }

  /// NOTE (unused/outdated): nothing in the app calls this anymore. Suggestions are created
  /// incrementally instead, via CreateNewSuggestion() (first ask of a new round) and
  /// ContinueSuggestion() (passing the same suggestion to the next player), with the
  /// suggester/suggestee/cardArray/response filled in afterward through the setter methods
  /// below as the user makes selections. This all-at-once constructor looks like an earlier
  /// version of that flow and is a candidate for deletion.
  AddSuggestion(cardArray, suggester, suggestee, response) {
    this.suggestionHistory.push(new Suggestion({
      cardArray: cardArray,
      suggester: this.players[suggester],
      suggestee: this.players[suggestee],
      response: response,
      turn: this.suggestionHistory.length
    }));
  }

  /// Starts a brand new suggestion (a new "round") with nothing filled in yet - GameManager
  /// fills in suggester/cardArray/suggestee/response as the user makes each selection.
  CreateNewSuggestion() {
    const previous = this.GetMostRecentSuggestion();
    const roundNumber = previous ? previous.roundNumber + 1 : 1;
    this.suggestionHistory.push(new Suggestion({
      turn: this.suggestionHistory.length,
      roundNumber: roundNumber,
      stepInRound: 1
    }))
    console.log(`Creating suggestion # : ${this.suggestionHistory.length}`)
  }

  SetCardArray(turn, cardArray) {
    this.GetSuggestion(turn).cardArray = cardArray;
  }

  SetSuggester(turn, index) {
    this.GetSuggestion(turn).suggester = this.players[index];
  }

  SetSuggestee(turn, suggestee) {
    this.GetSuggestion(turn).suggestee = suggestee;
  }

  /// Turns whatever the user picked in the response buttons ('suspect'/'weapon'/'room' meaning
  /// "showed me the suggested card of that category", or a raw knownVoid/possibleCard symbol)
  /// into the actual card index or symbol stored on the Suggestion, then logs it.
  ConfirmSuggestionResponse(turn, newResponse) {
    const selectedSuggestion = this.GetSuggestion(turn);

    console.log(`Suggestion ${selectedSuggestion.turn+1}: ${selectedSuggestion.suggester.name} asked ${selectedSuggestion.suggestee.name} [${cardsAPI.getCardFromIndex(selectedSuggestion.cardArray[0])}, ${cardsAPI.getCardFromIndex(selectedSuggestion.cardArray[1])}, ${cardsAPI.getCardFromIndex(selectedSuggestion.cardArray[2])}] response: ${newResponse}`);

    if (newResponse == SYMBOLS.knownVoid || newResponse == SYMBOLS.possibleCard) {
      //
    } else if (newResponse == 'suspect') {
      newResponse = selectedSuggestion.cardArray[0];
    } else if (newResponse == 'weapon') {
      newResponse = selectedSuggestion.cardArray[1];
    } else if (newResponse == 'room') {
      newResponse = selectedSuggestion.cardArray[2];
    } else {
      return console.warn(`Can't ConfirmSuggestionResponse: ${newResponse} is not a valid response`);
    }
    selectedSuggestion.response = newResponse;
  }

  /// Advances the SAME suggestion (same cards asked) to the next player in the circle - used
  /// when a suggestion is passed along because a player said "none" and the same three cards
  /// get asked to whoever's next, still within the same round/roundNumber.
  ContinueSuggestion() {
    const previousSuggestion = this.GetMostRecentSuggestion();
    this.suggestionHistory.push(new Suggestion({
      turn: this.suggestionHistory.length,
      roundNumber: previousSuggestion.roundNumber,
      stepInRound: previousSuggestion.stepInRound + 1
    }));
    this.GetMostRecentSuggestion().suggester = previousSuggestion.suggester;
    this.GetMostRecentSuggestion().suggestee = previousSuggestion.suggestee.GetNextPlayer();
    this.GetMostRecentSuggestion().cardArray = previousSuggestion.cardArray;
  }

  GetSuggestion(index) {
    return this.suggestionHistory[index];
  }

  GetMostRecentSuggestion() {
    return this.GetSuggestion(this.suggestionHistory.length - 1)
  }

  /*/// Clue Logic
  "the goal of clue is not to find what other players have, it is to find what they don't have"

  -1 Every card known must be void for all other players
  -2 If the count of known cards = total cards per player then all other player cards must be void
  -3 If a card is void for all players then it is the hidden card (extra cards don't count)
  -4 If every card from a category is known except 1 then that one is the hidden card

  // Suggestion Interpretation:
  - If they have a card mark the card as known
  - If they dont have any of the cards mark all suggested cards as void
  - If they show something to another player: store the suggested cards array and remove the cards from that array the player must not have (void, extra) until the size of the array is 1 upon which set the card to known have (card inferred) and remove the possible card array

  If the suggestee is you then no info is gained (all row data for you is already filled)
  If the all cards are known for the suggestee there is no need to do any more logic for them
  */ //

  /// Rule -3 above, applied to one card: if every player has been proven void for it, it must
  /// be the hidden/envelope card (extra cards are dealt separately and already marked, so they
  /// don't get counted as "voided" players here - see SetExtra, which never sets knownVoid).
  SetHiddenCard(card) {
    this.players.forEach(player => {
      player.SetHidden(card);
    })
  }

  CheckForHiddenCard(card) {
    let tally = 0;
    this.players.forEach(player => {
      if (player.cardArray[card] == SYMBOLS.knownVoid) {
        tally++;
      }
    })
    if (tally == this.numPlayers) {
      this.SetHiddenCard(card);
    }
  }

  /// Sweeps all 21 cards looking for any that just became provably hidden. Run once per
  /// full replay (see WritePlayerDataFromSuggestionHistory) rather than after every single
  /// SetKnownVoid, since one suggestion can create several newly-void cards at once.
  CheckForHiddenCards() {
    for (let card = 0; card < 21; card++) {
      this.CheckForHiddenCard(card);
    }
  }

  /// Applies the information from one confirmed suggestion to the suggestee's row. This is
  /// called once per suggestion, in order, during a full replay - never called standalone for
  /// a single suggestion in isolation, since a card might only resolve given everything that
  /// came before it.
  InterpretSuggestion(suggestion) {
    /// An in-progress/unconfirmed suggestion (the live turn, browsed back to and not yet
    /// answered) has no suggestee and/or no response yet - skip it rather than crashing,
    /// since it carries no information until it's actually confirmed.
    const suggestee = suggestion.suggestee;
    if (!suggestee || suggestion.response === undefined) {
      return;
    }
    if (suggestee.allCardsKnown) {
      return;
    }
    if (suggestion.response >= 0) {
      suggestee.SetKnownHave(suggestion.response);
    } else if (suggestion.response == SYMBOLS.knownVoid) {
      suggestion.cardArray.forEach(card => {
        suggestee.SetKnownVoid(card);
      });
    } else if (suggestion.response == SYMBOLS.possibleCard) {
      suggestee.SetPossible(suggestion.cardArray);
    }
  }

  /// The heart of the whole app's "editable history" design: instead of storing the board
  /// state directly, EVERY read of "what does the board look like" is produced by wiping all
  /// players back to blank and replaying suggestionHistory from turn 0 up to (and including)
  /// `toTurn`. This means editing an old suggestion's response, or fixing a card selection,
  /// just requires calling this again - there's no separate "patch up all the derived state"
  /// step to get wrong. The tradeoff is that this does get more expensive to run as the game
  /// goes on (O(turns) every call), but suggestion counts in a real game are small enough
  /// that this has never needed optimizing.
  WritePlayerDataFromSuggestionHistory(toTurn) {
    this.players.forEach(player => {
      player.ClearData();
      this.extraCards.forEach(card => {
        player.SetExtra(card);
      });
      this.startingCards.forEach(card => {
        if (player.index == 0) {
          player.SetKnownHave(card);
        } else {
          player.SetKnownVoid(card);
        }
      });
    });
    this.suggestionHistory.forEach(suggestion => {
      if (suggestion.turn <= toTurn) {
        this.InterpretSuggestion(suggestion);
      }
    });
    this.CheckForHiddenCards();
  }
}
