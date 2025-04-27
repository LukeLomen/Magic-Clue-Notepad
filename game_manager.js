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

const GameState = {
    NEW_GAME: 0,
    STARTING_CARDS: 1,
    EXTRA_CARDS: 2,
    NEW_SUGGESTION: 3,
    SUGGESTION: 4,
    HISTORY: 5,
    MENU: 6
};

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
            OnPressForward: () => this.StartGame(this.gameSetup.GetTextInputArray()),
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

        this.NewGame();
    }

    _HandleTableRowToggle(selectedRowsSet) {
        const requirement = this.dm.numCards;
        //If state == starting or extra cards
        this.controlPanel.SetValidationText(`${selectedRowsSet.size} / ${requirement}`)
        if (selectedRowsSet.size == requirement) {
            console.log('confirm button should now be active')
        } else{
            console.log('confirm button should now be disabled')
        }
    }

    DisplayNewGame() {
        this.interactiveTable.HideTable(true);
        this.gameSetup.HideGameSetup(false);
        this.controlPanel.ShowNewGameScreen();
    }

    DisplayStartingCards() {
        this.interactiveTable.HideTable(false);
        this.gameSetup.HideGameSetup(true);
        this.controlPanel.ShowStartingCardsScreen();
        this.interactiveTable.colSelectionActive = true;
        //this.interactiveTable.SelectRow(1);
    }

    DisplayExtraCards() {

    }

    DisplayNewSuggestion() {

    }

    DisplayCurrentSuggestion() {

    }

    DisplaySuggestionHistory() {

    }

    NewGame() {
        //console.log(this.textInputArray)
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