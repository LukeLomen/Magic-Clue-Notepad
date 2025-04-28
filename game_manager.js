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
            OnPressStart: () => this.StartGame(this.gameSetup.GetTextInputArray()),
            OnPressConfirmStarting: () => this.SetStartingCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmExtra: () => this.SetExtraCards(this.interactiveTable.GetSelectedCols()),
            //OnPressForward: () => ,
            OnPressBack: () => this.NewGame(),
            OnPressSuspect: () => this.SuspectButton(),
            OnPressWeapon: () => this.WeaponButton(),
            OnPressRoom: () => this.RoomButton(),
            OnPressUnknown: () => this.UnknownButton(),
            OnPressNone: () => this.NoneButton()
            // All validaiton of presses can be done here before sending to gm
        });

        this.gameSetup = new GameSetup();
        this.textInputArray = new Array(6);

        this.currentTurn = 0;

        this.NewGame();
    }

    _HandleTableRowToggle(selectedRowsSet) {
        const requirement = this.dm.numCards;
        //If state == starting or extra cards
        this.controlPanel.SetValidationText(`${selectedRowsSet.size} / ${requirement}`)
        if (selectedRowsSet.size == requirement) {
            console.log('confirm button should now be active')
        } else {
            console.log('confirm button should now be disabled')
        }
    }

    DisplayNewGame() {
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.HideTable(true);
        this.gameSetup.HideGameSetup(false);
        this.controlPanel.ChangeState(this.controlPanel.NEW_GAME)
    }

    DisplayStartingCards() {
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.HideTable(false);
        this.gameSetup.HideGameSetup(true);
        this.controlPanel.ChangeState(this.controlPanel.STARTING_CARDS)
        this.interactiveTable.colTargetActive = true;
    }

    DisplayExtraCards() {
        this.controlPanel.ChangeState(this.controlPanel.EXTRA_CARDS)

    }

    DisplayNewSuggestion() {
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
        this.controlPanel.ChangeState(this.controlPanel.NEW_SUGGESTION)
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.categorySelectionMode = true;
    }

    DisplayCurrentSuggestion() {

    }

    DisplaySuggestionHistory() {

    }

    NewGame() {
        this.dm = new DataManager();
        this.DisplayNewGame();
        this.interactiveTable.HideRows(0, 6, false);
    }

    StartGame(playerNames) {
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
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    SetExtraCards(cardArray) {
        this.dm.SetExtraCards(cardArray);
        this.DisplayNewSuggestion();
        this.interactiveTable.ClearAllSelection();
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    AddSuggestion(cardArray, suggester, suggestee, response) {
        this.dm.AddSuggestion(cardArray, suggester, suggestee, response)
    }


    /////////
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
}