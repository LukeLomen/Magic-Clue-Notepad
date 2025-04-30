import {
    InteractiveButton
} from './interactive_button.js';
import {
    InteractiveTable
} from './interactive_table.js';
import {
    ControlPanel
} from './control_panel.js';
import {
    GameSetup
} from './game_setup.js'
import {
    DataManager
} from './clue_data.js';
import {
    cardsAPI
} from './clue_cards.js';

export class GameManager {
    constructor() {
        this.dm = new DataManager();
        this.interactiveTable = new InteractiveTable({
            container: document.getElementById('interactive-table-container'),
            id: 'interactive-table-1',
            rowCount: 6,
            colCount: 21,
            catetoryStarts: new Set([1, 7, 13]),
            OnToggleCol: (selectedRowsSet) => this._HandleTableRowToggle(selectedRowsSet),
            OnToggleRow: (selectedCols) => console.log(selectedCols),
        });
        this.controlPanel = new ControlPanel({
            //OnPressStart: () => this.StartGame(this.gameSetup.GetTextInputArray()),
            OnPressConfirmStarting: () => this.SetStartingCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmExtra: () => this.SetExtraCards(this.interactiveTable.GetSelectedCols()),
            OnPressForward: () => this.IncreaseTurn(),
            OnPressNewSuggestion: () => this.StartNewSuggestion(),
            OnPressNewGame: () => this.NewGame(),
            OnPressBack: () => this.DecreaseTurn(),
            OnPressSuggestionResponse: (responseButton) => this.ConfirmSuggestionResponse(responseButton)
        });

        this.gameSetup = new GameSetup({
            onStartGame: () => this.StartGame(this.gameSetup.GetTextInputArray())
        });

        this.currentTurn = 0;

        this.NewGame();
    }

    _HandleTableRowToggle(selectedRowsSet) {
        const requirement = this.dm.numCards;
        //If state == starting or extra cards
        this.controlPanel.SetValidationText(`${selectedRowsSet.size} / ${requirement}`)
        if (selectedRowsSet.size == requirement) {
            //console.log('confirm button should now be active')
        } else {
            //console.log('confirm button should now be disabled')
        }
    }

    /// Display States
    DisplayNewGame() {
        this.interactiveTable.HideTable(true);
        this.gameSetup.HideGameSetup(false);
        this.controlPanel.ChangeState(this.controlPanel.NEW_GAME)
    }

    DisplayStartingCards() {
        this.dm.WritePlayerDataFromSuggestionHistory(0);
        this.WriteTableCellDataFromPlayerData();

        this.interactiveTable.HideTable(false);
        this.gameSetup.HideGameSetup(true);
        this.controlPanel.ChangeState(this.controlPanel.STARTING_CARDS)
        this.interactiveTable.colTargetActive = true;
    }

    DisplayExtraCards() {
        this.dm.WritePlayerDataFromSuggestionHistory(0);
        this.WriteTableCellDataFromPlayerData();

        this.controlPanel.ChangeState(this.controlPanel.EXTRA_CARDS)
    }

    DisplayNewSuggestion() {
        this.dm.WritePlayerDataFromSuggestionHistory(10000);
        this.WriteTableCellDataFromPlayerData();

        this.controlPanel.ChangeState(this.controlPanel.NEW_SUGGESTION)
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.categorySelectionMode = true;
        this.interactiveTable.ClearAllSelection();
    }

    DisplaySuggestion(suggestion) {
        // unselect everything
        // set turn # (turn)
        // write text area (all)
        // select 3 table cols (cardArray)
        // select 1 table row (suggester)
        // highlight 1 table row (suggestee)

        //console.log(`displaying suggestion #: ${suggestion.turn}`)
        //console.log(suggestion)

        this.dm.WritePlayerDataFromSuggestionHistory(100000);
        this.WriteTableCellDataFromPlayerData();

        this.interactiveTable.colTargetActive = false;
        this.interactiveTable.rowTargetActive = false;

        const suggesterName = suggestion.suggester.name;
        const suggesteeName = suggestion.suggestee.name;
        const suspectName = cardsAPI.getCardFromIndex(suggestion.cardArray[0]);
        const weaponName = cardsAPI.getCardFromIndex(suggestion.cardArray[1]);
        const roomName = cardsAPI.getCardFromIndex(suggestion.cardArray[2]);

        this.controlPanel.ChangeState(this.controlPanel.SUGGESTION);
        this.interactiveTable.ClearAllSelection();
        this.controlPanel.mainText.textContent = `[${suggestion.turn}] ${suggesterName} suggested to ${suggesteeName}: ${suspectName}, ${weaponName}, ${roomName}`;
        suggestion.cardArray.forEach(col => {
            this.interactiveTable.SelectCol(col + 1)
        });
        this.interactiveTable.SelectRow(suggestion.suggestee.index + 1);
    }


    /// Actions
    NewGame() {
        this.DisplayNewGame();
        this.interactiveTable.HideRows(0, 6, false);
    }

    StartGame(playerNames) {
        this.dm = new DataManager();
        this.dm.CreatePlayers(playerNames);
        this.WritePlayerNamesToTable();
        this.WriteCardNamesToTable();
        this.DisplayStartingCards();
    }

    SetStartingCards(cardArray) {
        this.dm.SetStartingCards(cardArray);
        if (this.dm.numExtra > 0) {
            this.DisplayExtraCards();
        } else {
            this.DisplayNewSuggestion();
        }
        this.interactiveTable.ClearAllSelection();
    }

    SetExtraCards(cardArray) {
        this.dm.SetExtraCards(cardArray);
        this.DisplayNewSuggestion();
        this.interactiveTable.ClearAllSelection();
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    StartNewSuggestion() {
        const suggester = this.interactiveTable.GetSelectedRows().shift();
        const cards = this.interactiveTable.GetSelectedCols().sort((a, b) => a - b);
        if (suggester == undefined || cards.length != 3) {
            console.warn(`Cant start new suggestion: selection invalid`);
            return;
        }
        this.dm.StartNewSuggestion(cards, suggester);
        this.DisplaySuggestion(this.dm.newSuggestion);
    }

    ContinueSuggestion() {
        this.DisplaySuggestion(this.dm.newSuggestion);
    }

    EndSuggestion() {
        this.DisplayNewSuggestion();
    }

    ConfirmSuggestionResponse(responseButton) {
        this.IncreaseTurn();

        this.dm.ConfirmSuggestionResponse(responseButton);
        if (this.dm.EndSuggestion()) {
            this.EndSuggestion();
        } else {
            this.ContinueSuggestion();
        }
    }


    /// Methods for writing to table
    SetCardPreset(preset) {
        cardsAPI.loadPreset(preset);
        this.WriteCardNamesToTable();
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
        this.dm.players.forEach((player, index) => {
            this.interactiveTable.WriteTableData(index + 1, 0, player.name);
        });
        this.interactiveTable.HideRows(this.dm.numPlayers + 1, 6, true);
    }

    WriteTableCellDataFromPlayerData() {
        this.dm.players.forEach((player, index) => {
            const row = index + 1;
            player.cardArray.forEach((card, index) => {
                const col = index + 1;
                this.interactiveTable.WriteTableData(row, col, card);
            });
        });
    }

    DisplayTurn(turn) {
        if (turn > this.dm.suggestionHistory.length - 1) {
            turn = this.dm.suggestionHistory.length - 1;
        }
        this.currentTurn = turn;
        this.dm.WritePlayerDataFromSuggestionHistory(turn);
        this.WriteTableCellDataFromPlayerData()
    }

    IncreaseTurn() {
        if (this.currentTurn >= this.dm.suggestionHistory.length) return;
        this.currentTurn++;
        this.DisplayTurn(this.currentTurn);
    }

    DecreaseTurn() {
        if (this.currentTurn <= 0) return;
        this.currentTurn--;
        this.DisplayTurn(this.currentTurn);
    }
}