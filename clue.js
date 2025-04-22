import {
  CreateInteractiveTable
} from './interactive_table.js';
import {
  cardsAPI
} from './clue_cards.js';
import {
  ControlPanel
} from './control_panel.js';

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
  constructor(name, index, numPlayers, playersArray) {
    this.name = name;
    this.index = index;
    this.numPlayers = numPlayers;
    this.playersArray = playersArray;
    this.numCards = Math.floor(18 / numPlayers);
    this.numExtraCards = 18 - numPlayers * this.numCards; //remove
  }
  cardArray = new Array(21).fill(unknown);
  possibleCards = new Array(0);
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
        /// first look through all the arrays. Then compare each item in the nested arrays with this.cardArray; if the number in the possible card array is known void or have then remove that number and setknownvoid; after removing impossible cards if any of the array lengths are 1 then that card has been inferred: setknownhave and remove the 1 length array.
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

export class GameManager {
  /* The game manager represents all game data and sets the display:
  Functions to modify the data are called from the main script (inputManager) - ex: when buttons/table are selected. Then the data changes the display and thus what is able to be selected by the inputManager.
  */
  constructor() {
    this.numPlayers = 0;
    this.players = new Array();
    this.suggestionHistory = new Array();
    this.startingCards = new Array();
    this.extraCards = new Array();
    this.interactiveTable;
    this.forwardButton = document.getElementById('forward-button');
    this.backButton = document.getElementById('back-button');
    this.textArea = document.getElementById('text-area');
    this.currentTurn = 0;
  }

  CreatePlayers(playerNames) {
    this.numPlayers = playerNames.length;
    for (let i = 0; i < this.numPlayers; i++) {
      this.players[i] = new Player(playerNames[i], i, this.numPlayers, this.players);
    }
  }

  CreateGameTable() {
    const container = document.getElementById('interactive-table-container');
    this.interactiveTable = CreateInteractiveTable(
      container,
      'interactive-table-1',
      21,
      this.numPlayers,
      (colIndex) => {
        console.log("column selected: ", colIndex);
      });
    this.WriteCardNamesToTable();
    this.WritePlayerNamesToTable();
  }

  WriteCardNamesToTable() {
    const allCards = (() => {
      const {
        suspects,
        weapons,
        rooms
      } = cardsAPI.getCards();
      return [...suspects, ...weapons, ...rooms];
    })();

    allCards.forEach((cardName, index) => {
      this.interactiveTable.WriteTableData(0, index + 1, cardName);
    });
  }

  WritePlayerNamesToTable() {
    this.players.forEach((player, index) => {
      this.interactiveTable.WriteTableData(index + 1, 0, player.name);
    });
  }

  WriteTableCellDataFromPlayerData() {
    this.players.forEach((player, index) => {
      const row = index + 1;
      player.cardArray.forEach((card, index) => {
        const col = index + 1;
        this.interactiveTable.WriteTableData(row, col, card);
      });
    });
  }

  /*/// Clue Logic
  "the goal of clue is not to find what other players have it is to find what they don't have"

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
        }
      });
    });
    for (let turn = 0; turn <= toTurn; turn++) {
      this.InterpretSuggestion(this.suggestionHistory[turn]);
    }
    this.CheckForHiddenCards();
  }

  SelectDisplayElementsFromSuggestion(suggestion) {
    const suspectName = cardsAPI.getCardFromIndex(suggestion.cardArray[0]);
    const weaponName = cardsAPI.getCardFromIndex(suggestion.cardArray[1]);
    const roomName = cardsAPI.getCardFromIndex(suggestion.cardArray[2]);
    // unselect everything
    // set turn # (turn)
    // write text area (all)
    // select 3 table cols (cardArray)
    // select 1 table row (suggester)
    // highlight 1 table row (suggestee)
    this.interactiveTable.ClearFocus();
    this.interactiveTable.ClearSelection();
    this.textArea.textContent = `[${suggestion.turn}] ${suggestion.suggester.name} suggested to ${suggestion.suggestee.name}: ${suspectName}, ${weaponName}, ${roomName}`;
    suggestion.cardArray.forEach(col => {
      this.interactiveTable.SelectCol(col + 1)
    });
    this.interactiveTable.FocusRow(suggestion.suggester.index + 1);
    this.interactiveTable.SelectRow(suggestion.suggestee.index + 1);
  }
  /////////////////////

  DisplayTurn(turn) {
    if (turn > this.suggestionHistory.length - 1) {
      turn = this.suggestionHistory.length - 1;
    }
    this.currentTurn = turn;
    this.WritePlayerDataFromSuggestionHistory(turn);
    this.WriteTableCellDataFromPlayerData();
    this.SelectDisplayElementsFromSuggestion(this.suggestionHistory[turn]);
  }

  IncreaseTurn() {
    if (this.currentTurn >= this.suggestionHistory.length) return;
    this.currentTurn++;
    this.DisplayTurn(this.currentTurn);
  }

  DecreaseTurn() {
    if (this.currentTurn <= 0) return;
    this.currentTurn--;
    this.DisplayTurn(this.currentTurn);
  }

  SetCardPreset(preset) {
    cardsAPI.loadPreset(preset);
  }

  AddStartingCards(cardArray) {
    this.startingCards = cardArray;
  }

  AddExtraCards(cardArray) {
    this.extraCards = cardArray;
  }

  AddSuggestion(cardArray, suggester, suggestee, response) {
    const turn = this.suggestionHistory.length;
    this.suggestionHistory.push(new Suggestion(cardArray, this.players[suggester], this.players[suggestee], response, turn));
  }
}