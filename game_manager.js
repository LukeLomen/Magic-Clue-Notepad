import {
    ControlPanel
} from './control_panel.js';
import {
    InteractiveTable
} from './interactive_table.js';
import {
    DataManager
} from './clue_data.js';
import {
    cardsAPI
} from './clue_cards.js';
/* 
The game manager creates the display manager and sets all the callbacks for controls
The display manager creates all the elements (gm doesnt need to know about (import) any of the interactive elements it just sets the callbacks)
index.js is where the input management is done and where the gm is created (and tested) -  settting which element is in focus and setting pressed for the focued element on pointer up. Pressed tells the interactive element to send a callback (abstracted to gm)

Instead of dramaticaly changing the function of a button from a state the button should just be replaced with a button that directly coresponds to a specific function in the gm

GM tells the display manager what state to display and thus what buttons are displayed

All input verification can be done in the display manager:
The GM doesn't need to know about how many cols are selected or if the correct number of cols are selected for starting cards, it doesen't need to handle deselecting cols (or rows) when more than one of a category are selected; all this is done in the display manager which in turn enables buttons -  buttons onpressed function (and table toggle col or row) should only work if the button(/table) is enabled.
-Callback Functions can come into the display manager and be processed before being sent to the gm

If relating to DND the GM is the books and the DM is the dungeon master who interperates the books and tells the story
*/

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
            OnToggleCol: (selectedRows) => this._HandleTableRowToggle(selectedRows),
            OnToggleRow: (selectedCols) => console.log(selectedCols),
        });
        this.controlPanel = new ControlPanel({
            OnPressForward: () => this.StartGame(this.textInputArray),
            OnPressBack: () => this.NewGame(),
            OnPressSuspect: () => this.SuspectButton(),
            OnPressWeapon: () => this.WeaponButton(),
            OnPressRoom: () => this.RoomButton(),
            OnPressUnknown: () => this.UnknownButton(),
            OnPressNone: () => this.NoneButton()
            // All validaiton of presses can be done here before sending to gm
        });

        this.gameSetup = document.getElementById('game-setup');
        this.gameSetup.addEventListener('input', this._HandleTextInput);
        this.textInputArray = new Array(6);

        this.NewGame();
    }

    _HandleTextInput(event) {
        const target = event.target;
        const data = event.data;
        const value = target.value;
        if (!target) return;
        if (value) {
            // text input has letters
            this.textInputArray[1] = value;
            console.log(value)
        } else {
            /// text input empty
            console.log('empty')
        }
    }

    _HandleTableRowToggle(selectedRows) {
        const s = 6;
        //If state == starting or extra cards
        this.controlPanel.SetValidationText(`${selectedRows.size} / ${s}`)
        if (selectedRows.size == 6) {
            console.log('confirm button should now be active')
        }
    }

    DisplayNewGame() {
        this.interactiveTable.HideTable(true);
        this.gameSetup.classList.remove('hidden');
        this.controlPanel.ShowNewGameScreen();
    }

    DisplayStartingCards() {
        this.interactiveTable.HideTable(false);
        this.gameSetup.classList.add('hidden');
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