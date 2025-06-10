import {
    InteractiveTable
} from './interactive_table.js';
import {
    ControlPanel
} from './control_panel.js';
import {
    NameSetup
} from './name_setup.js'
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
            OnPressConfirmStarting: () => this.SetStartingCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmExtra: () => this.SetExtraCards(this.interactiveTable.GetSelectedCols()),
            OnPressForward: () => this.IncreaseTurn(),
            OnPressNewSuggestion: () => this.StartNewSuggestion(
                this.interactiveTable.GetSelectedRows().shift(),
                this.interactiveTable.GetSelectedCols().sort((a, b) => a - b)
            ),
            OnPressNewGame: () => this.NewGame(),
            OnPressBack: () => this.DecreaseTurn(),
            OnPressSuggestionResponse: (responseButton) => this.ConfirmSuggestionResponse(responseButton)
        });

        this.nameSetup = new NameSetup({
            onStartGame: () => this.StartGame(this.nameSetup.GetTextInputArray())
        });

        this.currentTurn = 0;

        this.NewGame();
    }

    // NOT SURE WHY THIS IS HERE
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
    DisplayNameSetup() {
        this.nameSetup.DisplayNameSetup(true);
        this.interactiveTable.DisplayTable(false);
        //this.controlPanel.ChangeState(this.controlPanel.NEW_GAME)
    }

    DisplayStartingCards() {
        //this.dm.WritePlayerDataFromSuggestionHistory(0);
        //this.WriteTableCellDataFromPlayerData();
        this.nameSetup.DisplayNameSetup(false);
        this.interactiveTable.DisplayTable(false);

        //this.controlPanel.ChangeState(this.controlPanel.STARTING_CARDS)
        //this.interactiveTable.colTargetActive = true;
    }

    DisplayExtraCards() {
        //this.dm.WritePlayerDataFromSuggestionHistory(0);
        //this.WriteTableCellDataFromPlayerData();
        this.nameSetup.DisplayNameSetup(false);
        this.interactiveTable.DisplayTable(false);

        //this.controlPanel.ChangeState(this.controlPanel.EXTRA_CARDS)
    }

    DisplayNewSuggestion() {
        this.nameSetup.DisplayNameSetup(false);
        this.interactiveTable.DisplayTable(true);
        
        this.dm.WritePlayerDataFromSuggestionHistory(10000);
        this.WriteTableCellDataFromPlayerData();

        this.controlPanel.ChangeState(this.controlPanel.NEW_SUGGESTION)
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.categorySelectionMode = true;
        this.interactiveTable.ClearAllSelection();
    }

    /*
        Instead of having a confirm button for new suggestions, if the suggestion is the first suggestion (table interaction not avaliable if round continues past the first person) of the round: Text & Buttons are displayed and written as table cols + rows are selected - once all 4 requirements have been selected buttons become active according to the dm possible check
        - when displaying history: no table interaction for first suggestion

        - suggestion text and buttons should be written by the suggestion object in suggestionHistory that is currently displayed. Selecting table rows and cols should instantly modify the suggestion that is displayed which in turn tells the suggestion area what to write.
        - maybe in suggestion add bools for changing the active state of buttons (possibility check done internally in DM somehow)
    */

    DisplaySuggestion(suggestion) {
        this.dm.WritePlayerDataFromSuggestionHistory(suggestion.turn);
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
        this.controlPanel.mainText.textContent = `[${suggestion.turn}] ${suggesterName} suggested to ${suggesteeName}:`;
        suggestion.cardArray.forEach(col => {
            this.interactiveTable.SelectCol(col + 1)
        });
        this.interactiveTable.SelectRow(suggestion.suggestee.index + 1);
    }


    /// Actions
    NewGame() {
        this.DisplayNameSetup();
    }

    StartGame(playerNamesArr) {
        this.dm = new DataManager();
        this.dm.CreatePlayers(playerNamesArr);
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

    /// Suggestions
    StartNewSuggestion(suggester, cards) {
        if (suggester == undefined || cards.length != 3) {
            return console.warn(`Cant start new suggestion: selection invalid`);
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

    /// Writing game data to table
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
        /*if (turn > this.dm.suggestionHistory.length - 1) {
            turn = this.dm.suggestionHistory.length - 1;
        }*/
        //this.currentTurn = turn;
        this.dm.WritePlayerDataFromSuggestionHistory(turn);
        this.WriteTableCellDataFromPlayerData();
    }

    IncreaseTurn() {
        if (this.currentTurn < this.dm.suggestionHistory.length) {
            this.currentTurn++;
        }
        this.DisplayTurn(this.currentTurn);
    }

    DecreaseTurn() {
        if (this.currentTurn > 0) {
            this.currentTurn--;
        }
        this.DisplayTurn(this.currentTurn);
    }
}