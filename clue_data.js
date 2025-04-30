export class Suggestion {
  constructor({
    cardArray,
    suggester,
    suggestee,
    response,
    turn
  }) {
    this.turn = turn;
    this.cardArray = cardArray;
    this.suggester = suggester;
    this.suggestee = suggestee;
    this.response = response;
  }
  Clone() {
    const clone = new Suggestion({
      cardArray: this.cardArray,
      suggester: this.suggester,
      suggestee: this.suggestee,
      response: this.response,
      turn: this.turn
    })
    return clone
  }
}

class Player {
  constructor(name, index, numPlayers, playersArray, numCards) {
    this.name = name;
    this.index = index;
    this.numPlayers = numPlayers;
    this.playersArray = playersArray;
    this.numCards = numCards;

    this.cardArray = new Array(21).fill(unknown);
    this.possibleCards = new Array();
    this.cardsKnown = 0;
    this.allCardsKnown = false;
  }

  GetNextPlayer() {
    return this.playersArray[(this.index + 1) % this.numPlayers];
  }

  ClearData() {
    this.cardArray.fill(unknown);
    this.possibleCards = new Array();
    this.cardsKnown = 0;
    this.allCardsKnown = false;
  }

  SetCardArray(card, value) {
    this.cardArray[card] = value;
  }

  SetExtra(card) {
    this.SetCardArray(card, extraCard);
  }

  SetKnownVoid(card) {
    if (this.cardArray[card] == extraCard) {
      return;
    }
    this.SetCardArray(card, knownVoid);
    this.CheckPossibleCards();
  }

  SetKnownHave(card) {
    this.SetCardArray(card, knownHave);
    this.cardsKnown++;
    if (this.cardsKnown == this.numCards) {
      this.AllCardsKnown();
    } else {
      this.CheckPossibleCards();
    }
    this.playersArray.forEach(p => {
      if (p != this) {
        p.SetKnownVoid(card);
      }
    });
  }

  SetPossible(possibleCardsArray) {
    this.possibleCards.push(structuredClone(possibleCardsArray));
    possibleCardsArray.forEach(card => {
      if (this.cardArray[card] == unknown) {
        this.SetCardArray(card, possibleCard);
      }
    });
    this.CheckPossibleCards();
  }

  CheckPossibleCards() {
    this.possibleCards.forEach((array, i) => {
      /// First look through all the arrays. Then compare each item in the nested arrays with this.cardArray; if the number in the possible card array is known void or have then remove that number and setknownvoid; after removing impossible cards if any of the array lengths are 1 then that card has been inferred: setknownhave and remove the 1 length array.
      array.forEach((card, index) => {
        if (this.cardArray[card] != possibleCard) {
          array.splice(index, 1);
        }
      });
      if (array.length == 1) {
        this.SetKnownHave(array[0]);
      } else if (array.length == 0) {
        this.possibleCards.splice(i, 1);
      }
    });
  }

  SetHidden(card) {
    this.SetCardArray(card, hiddenCard);
  }

  AllCardsKnown() {
    this.allCardsKnown = true;
    this.possibleCards = new Array();
    this.cardArray.forEach((card, index) => {
      if (card != knownHave) {
        this.SetKnownVoid(index);
      }
    });
  }
}

export class DataManager {
  constructor() {
    this.numPlayers = 0;
    this.players = new Array();
    this.suggestionHistory = new Array();
    this.startingCards = new Array();
    this.extraCards = new Array();
    this.numCards = 0;
    this.numExtra = 0;

    this.newSuggestion
  }

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

  AddSuggestion(cardArray, suggester, suggestee, response, turn) {
    if (turn == undefined) {
      turn = this.suggestionHistory.length + 1;
    }
    this.suggestionHistory.push(new Suggestion({
      cardArray: cardArray,
      suggester: this.players[suggester],
      suggestee: this.players[suggestee],
      response: response,
      turn: turn
    }));
  }

  StartNewSuggestion(newCardArray, suggesterIndex) {
    this.newSuggestion = new Suggestion({
      cardArray: newCardArray,
      suggester: this.players[suggesterIndex],
      suggestee: this.players[suggesterIndex].GetNextPlayer(),
      turn: this.suggestionHistory.length + 1
    });
  }

  ConfirmSuggestionResponse(newResponse) {
    if (newResponse == knownVoid || newResponse == possibleCard) {

    } else if (newResponse == 'suspect') {
      newResponse = this.newSuggestion.cardArray[0];
    } else if (newResponse == 'weapon') {
      newResponse = this.newSuggestion.cardArray[1];
    } else if (newResponse == 'room') {
      newResponse = this.newSuggestion.cardArray[2];
    } else {
      return console.warn(`Can't ConfirmSuggestionResponse: ${newResponse} is not a valid response`)
    }
    this.newSuggestion.response = newResponse;
    this.suggestionHistory.push(this.newSuggestion.Clone());
  }

  ContinueSuggestion() {
    this.newSuggestion.suggestee = this.newSuggestion.suggestee.GetNextPlayer();
    this.newSuggestion.response = null;
    this.newSuggestion.turn++;
  }

  EndSuggestion() {
    if (this.newSuggestion.response != knownVoid || this.newSuggestion.suggester == this.newSuggestion.suggestee.GetNextPlayer()) {
      return true
    } else {
      this.ContinueSuggestion();
      return false
    }
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

  SetHiddenCard(card) {
    this.players.forEach(player => {
      player.SetHidden(card);
    })
  }

  CheckForHiddenCard(card) {
    let tally = 0;
    this.players.forEach(player => {
      if (player.cardArray[card] == knownVoid) {
        tally++;
      }
    })
    if (tally == this.numPlayers) {
      this.SetHiddenCard(card);
    }
  }

  CheckCategoriesForHiddenCard() {
    let suspectSet = new Set([0, 1, 2, 3, 4, 5]);
    let weaponSet = new Set([6, 7, 8, 9, 10, 11]);
    let roomSet = new Set([12, 13, 14, 15, 16, 17, 18, 19, 20]);
    let categoryArrays = [suspectSet, weaponSet, roomSet]

    categoryArrays.forEach((categoryArray) => {
      categoryArray.forEach((card) => {
        this.players.forEach(player => {
          if (player.cardArray[card] == knownHave || player.cardArray[card] == extraCard) {
            categoryArray.delete(card);
          }
        });
      });
      if (categoryArray.size == 1) {
        this.SetHiddenCard(categoryArray.values().next().value);
      }
    });
  }

  CheckForHiddenCards() {
    for (let card = 0; card < 21; card++) {
      this.CheckForHiddenCard(card);
    }
    this.CheckCategoriesForHiddenCard();
  }

  InterpretSuggestion(suggestion) {
    const suggestee = suggestion.suggestee;
    if (suggestee.allCardsKnown) {
      return;
    }
    if (suggestion.response >= 0) {
      suggestee.SetKnownHave(suggestion.response);
    } else if (suggestion.response == knownVoid) {
      suggestion.cardArray.forEach(card => {
        suggestee.SetKnownVoid(card);
      });
    } else if (suggestion.response == possibleCard) {
      suggestee.SetPossible(suggestion.cardArray);
    }
  }

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