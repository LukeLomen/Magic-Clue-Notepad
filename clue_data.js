class Suggestion {
  constructor(cardArray, suggester, suggestee, response, turn) {
    this.turn = turn;
    this.cardArray = cardArray;
    this.suggester = suggester;
    this.suggestee = suggestee;
    this.response = response;
  }
}

class Player {
  constructor(name, index, numPlayers, playersArray, numCards) {
    this.name = name;
    this.index = index;
    this.numPlayers = numPlayers;
    this.playersArray = playersArray;
    this.numCards = numCards;
  }
  cardArray = new Array(21).fill(unknown);
  possibleCards = new Array();
  cardsKnown = 0;
  allCardsKnown = false;

  GetNextPlayer() {
    return (this.index + 1) % numPlayers;
  }

  ClearData() {
    this.cardArray.fill(unknown);
    this.possibleCards = new Array(0);
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
    this.possibleCards.concat(possibleCardsArray);
    possibleCardsArray.forEach(card => {
      if (this.cardArray[card] == unknown) {
        this.SetCardArray(card, possibleCard);
      }
    });
    this.CheckPossibleCards();
  }

  CheckPossibleCards() {
    if (this.possibleCards.length > 0) {
      this.possibleCards.forEach((array, i) => {
        /// First look through all the arrays. Then compare each item in the nested arrays with this.cardArray; if the number in the possible card array is known void or have then remove that number and setknownvoid; after removing impossible cards if any of the array lengths are 1 then that card has been inferred: setknownhave and remove the 1 length array.
        array.forEach((card, index) => {
          if (this.cardArray[card] != possibleCard) {
            array.splice(index, 1);
          }
        });
        if (array.length == 1) {
          this.SetKnownHave(array[0]);
          this.possibleCards.splice(i, 1);
        }
      });
    }
  }

  SetHidden(card) {
    this.SetCardArray(card, hiddenCard);
  }

  AllCardsKnown() {
    this.allCardsKnown = true;
    this.possibleCards = [];
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

  AddSuggestion(cardArray, suggester, suggestee, response) {
    const turn = this.suggestionHistory.length;
    this.suggestionHistory.push(new Suggestion(cardArray, this.players[suggester], this.players[suggestee], response, turn));
  }

  /*/// Clue Logic
  "the goal of clue is not to find what other players have, it is to find what they don't have"

  -1 Every card known must be void for all other players
  -2 If the count of known cards = total cards per player then all other player cards must be void
  -3 If a card is void for all players then it is the hidden card (extra cards don't count) 

  // Suggestion Interpretation:
  - If they have a card mark the card as known
  - If they dont have any of the cards mark all suggested cards as void
  - If they show something to another player: store the suggested cards array and remove the cards from that array the player must not have (void, extra) until the size of the array is 1 upon which set the card to known have (card inferred) and remove the possible card array

  If the suggestee is you then no info is gained (all row data for you is already filled)
  If the all cards are known for the suggestee there is no need to do any more logic for them
  */

  CheckForHiddenCard(card) {
    let tally = 0;
    this.players.forEach(player => {
      if (player.cardArray[card] == knownVoid) {
        tally++;
      }
    })
    if (tally == this.numPlayers) {
      this.players.forEach(player => {
        player.SetHidden(card);
      })
    }
  }

  CheckForHiddenCards() {
    for (let card = 0; card < 21; card++) {
      this.CheckForHiddenCard(card);
    }
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
      })
    } else if (suggestion.response == possibleCard) {
      suggestee.SetPossible(suggestion.cardArray);
    }
  }

  WritePlayerDataFromSuggestionHistory(toTurn) {
    if (toTurn > this.suggestionHistory.length) {
      toTurn = this.suggestionHistory.length;
    }
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
    for (let turn = 0; turn <= toTurn; turn++) {
      this.InterpretSuggestion(this.suggestionHistory[turn]);
    }
    this.CheckForHiddenCards();
  }
}