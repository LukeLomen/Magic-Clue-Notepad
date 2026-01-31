import {
    InteractiveTable
} from './interactive_table.js';
import {
    ControlPanel
} from './control_panel.js';
import {
    NameSetup
} from './name_setup.js';
import {
    DataManager
} from './clue_data.js';
import {
    cardsAPI
} from './clue_cards.js';
import {
    SYMBOLS
} from './table_symbols.js';


export class GameManager {
    constructor() {
        this.dm = new DataManager();
        this.nameSetup = new NameSetup({
            onStartGame: () => this.StartGame(this.nameSetup.GetTextInputArray())
        });
        this.interactiveTable = new InteractiveTable({
            container: document.getElementById('interactive-table-container'),
            id: 'interactive-table-1',
            rowCount: 6,
            colCount: 21,
            catetoryStarts: new Set([1, 7, 13]),
            OnToggleCol: (selectedColsSet) => this._HandleTableColToggle(selectedColsSet),
            OnToggleRow: (selectedRowsSet) => this._HandleTableRowToggle(selectedRowsSet),
        });
        this.controlPanel = new ControlPanel({
            OnPressConfirmStarting: () => this.SetStartingCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmExtra: () => this.SetExtraCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmSuggestionResponse: (responseButton) => this.ConfirmSuggestionResponse(responseButton)
        });
        this.currentTurn = 0;
        this.roundCounter = 0;
        this.state;
        this.NewGame();
    }

    _HandleTableRowToggle(selectedRowsSet) {
        if (selectedRowsSet.size > 0) {
            const selectedIndex = Array.from(selectedRowsSet)[0] - 1;
            this.dm.SetSuggester(this.currentTurn, selectedIndex);
            this.dm.SetSuggestee(this.currentTurn, this.dm.GetNextPlayer(selectedIndex));
        } else {
            this.dm.SetSuggester(this.currentTurn, undefined);
            this.dm.SetSuggestee(this.currentTurn, undefined);
        }
        this.WriteControlPanelSuggestionText(this.currentTurn);
        this._ValidateSuggestion();
    }

    _HandleTableColToggle(selectedColsSet) {
        var sortedArray = Array.from(selectedColsSet, (x) => x - 1).sort((a, b) => a - b);
        switch (this.state) {
            case 'starting':
                this._ValidateStartingCards(selectedColsSet.size);
                break;
            case 'extra':
                this._ValidateExtraCards(selectedColsSet.size);
                break;
            case 'suggestion':
                this._SelectedCols(sortedArray);
                this._ValidateSuggestion();
                break;
            default:
                console.warn(`state ${this.state} doesn't have a function assigned to col toggle`)
        }
    }

    _SelectedCols(cardArray) {
        const notSelected = '';
        var selectedSuspect = notSelected;
        var selectedWeapon = notSelected;
        var selectedRoom = notSelected;
        cardArray.forEach(index => {
            if (index >= 0 && index < 6) {
                selectedSuspect = index
            } else if (index >= 6 && index < 12) {
                selectedWeapon = index
            } else if (index >= 12 && index < 21) {
                selectedRoom = index
            }
        })
        cardArray = new Array(selectedSuspect, selectedWeapon, selectedRoom);
        this.dm.SetCardArray(this.currentTurn, cardArray);
        this.WriteControlPanelSuggestionButtons(this.currentTurn);
    }

    _ValidateStartingCards(num) {
        const requirement = this.dm.numCards;
        this.controlPanel.SetValidationText(`${num} / ${requirement}`);
        if (num == requirement) {
            this.controlPanel.ConfirmButtonEnabled(true);
        } else {
            this.controlPanel.ConfirmButtonEnabled(false);
        }
    }

    _ValidateExtraCards(num) {
        const requirement = this.dm.numExtra;
        this.controlPanel.SetValidationText(`${num} / ${requirement}`);
        if (num == requirement) {
            this.controlPanel.ConfirmButtonEnabled(true);
        } else {
            this.controlPanel.ConfirmButtonEnabled(false);
        }
    }

    _ValidateSuggestion() {
        const playerSelected = this.interactiveTable.GetSelectedRows()[0];
        const numCols = this.interactiveTable.GetSelectedCols().length;

        if (numCols == 3 && playerSelected >= 0) {
            this.controlPanel.SuggestionButtonsEnabled(true);
            this.ValidateSuggestionButtons();

        } else {
            this.controlPanel.SuggestionButtonsEnabled(false);
        }
    }

    /// Display States
    DisplayNameSetup() {
        this.state = 'name';

        this.nameSetup.DisplayNameSetup(true);
        this.interactiveTable.DisplayTable(false);
        this.controlPanel.ChangeState(this.controlPanel.NEW_GAME);
    }

    DisplayStartingCards() {
        this.state = 'starting';

        this.nameSetup.DisplayNameSetup(false);
        this.dm.WritePlayerDataFromSuggestionHistory(0);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.controlPanel.ChangeState(this.controlPanel.STARTING_CARDS);
        this._ValidateStartingCards(0)
    }

    DisplayExtraCards() {
        this.state = 'extra';

        this.nameSetup.DisplayNameSetup(false);
        this.dm.WritePlayerDataFromSuggestionHistory(0);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.controlPanel.ChangeState(this.controlPanel.EXTRA_CARDS);
        this._ValidateExtraCards(0);
    }

    /*DisplayNewSuggestion() {
        this.state = 'suggestion';

        this.nameSetup.DisplayNameSetup(false);
        this.dm.WritePlayerDataFromSuggestionHistory(10000);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.categorySelectionMode = true;
        this.interactiveTable.ClearAllSelection();
        this.controlPanel.ChangeState(this.controlPanel.SUGGESTION);
    }*/

    /*
        Instead of having a confirm button for new suggestions, if the suggestion is the first suggestion (table interaction not avaliable if round continues past the first person) of the round: Text & Buttons are displayed and written as table cols + rows are selected - once all 4 requirements have been selected buttons become active according to the dm possible check
        - when displaying history: no table interaction for first suggestion

        - suggestion text and buttons should be written by the suggestion object in suggestionHistory that is currently displayed. Selecting table rows and cols should instantly modify the suggestion that is displayed which in turn tells the suggestion area what to write.
        - maybe in suggestion add bools for changing the active state of buttons (possibility check done internally in DM somehow)
    */

    DisplaySuggestion() {
        const turn = this.currentTurn;
        // instead of writing the control panel from suggestions, select table rows and cols, control panel is writen from table selection

        // Display suggestion only needs to be called once after exiting the setup phase


        this.state = 'suggestion';

        this.nameSetup.DisplayNameSetup(false);
        //this.dm.WritePlayerDataFromSuggestionHistory(suggestion.turn);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.categorySelectionMode = true;

        /*const suggesterName = suggestion.suggester.name;
        const suggesteeName = suggestion.suggestee.name;
        const suspectName = cardsAPI.getCardFromIndex(suggestion.cardArray[0]);
        const weaponName = cardsAPI.getCardFromIndex(suggestion.cardArray[1]);
        const roomName = cardsAPI.getCardFromIndex(suggestion.cardArray[2]);*/

        this.controlPanel.ChangeState(this.controlPanel.SUGGESTION);
        this.interactiveTable.ClearAllSelection();
        /*this.controlPanel.mainText.textContent = `[${suggestion.turn}] ${suggesterName} suggested to ${suggesteeName}:`;
        suggestion.cardArray.forEach(col => {
            this.interactiveTable.SelectCol(col + 1);
        });
        this.interactiveTable.SelectRow(suggestion.suggestee.index + 1);

        console.log(`Turn: ${suggestion.turn} - ${suggesterName} asked ${suggesteeName}: ${suspectName} | ${weaponName} | ${roomName}`);*/


        //this.controlPanel.HideUnknownButton()


        //this._HandleTableRowToggle([]);
        //this._HandleTableColToggle([]);

        this._ValidateSuggestion();
        this.WriteControlPanelSuggestionText(turn);
        this.WriteControlPanelSuggestionButtons(turn);
    }


    /// Actions
    NewGame() {
        console.log(`New game: Initializing game data`);
        this.dm = new DataManager();
        this.DisplayNameSetup();
    }

    StartGame(playerNamesArr) {
        console.log(`Game started with ${playerNamesArr.length} players`);
        this.dm.CreatePlayers(playerNamesArr);
        this.WritePlayerNamesToTable();
        this.WriteCardNamesToTable();
        this.DisplayStartingCards();
    }

    SetStartingCards(cardArray) {
        console.log(`Starting cards selected ${cardArray}`);
        this.dm.SetStartingCards(cardArray);
        if (this.dm.numExtra > 0) {
            this.DisplayExtraCards();
        } else {
            this.StartNewSuggestion();
        }
        this.controlPanel.ConfirmButtonEnabled(false);
        this.interactiveTable.ClearAllSelection();
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    SetExtraCards(cardArray) {
        console.log(`Extra cards selected ${cardArray}`);
        this.dm.SetExtraCards(cardArray);
        this.StartNewSuggestion();
        this.controlPanel.ConfirmButtonEnabled(false);
        this.interactiveTable.ClearAllSelection();
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    /// Suggestions
    StartNewSuggestion() {
        this.dm.CreateNewSuggestion();
        this.DisplaySuggestion();
        this.interactiveTable.rowTargetActive = true;
        this.interactiveTable.colTargetActive = true;
    }

    ContinueSuggestion() {
        this.roundCounter++;
        if (this.roundCounter >= this.dm.numPlayers - 1) {
            this.EndSuggestion();
            return
        }
        this.dm.ContinueSuggestion();
        this.interactiveTable.rowTargetActive = false;
        this.interactiveTable.colTargetActive = false;
        this._ValidateSuggestion();
    }

    EndSuggestion() {
        this.roundCounter = 0;
        this.interactiveTable.ClearAllSelection();
        this.StartNewSuggestion();
    }

    ConfirmSuggestionResponse(responseButton) {
        const turn = this.currentTurn;
        this.dm.ConfirmSuggestionResponse(turn, responseButton)
        this.IncreaseTurn();

        if (responseButton == SYMBOLS.knownVoid && this.dm.GetMostRecentSuggestion().suggestee) {
            this.ContinueSuggestion();
            this.WriteControlPanelSuggestionText(turn);
        } else {
            this.EndSuggestion();
        }
        this.controlPanel.selectedSuggestionButton = null;
        this.controlPanel.UnselectSuggestionButtons();
        this.controlPanel.ConfirmButtonEnabled(false);
        this.WriteControlPanelSuggestionText(this.currentTurn);
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
        this.interactiveTable.HideRows(1, 6, false);
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

    WriteControlPanelSuggestionText(turn) {
        const targetSuggestion = this.dm.GetSuggestion(turn);
        if (targetSuggestion.suggestee) {
            this.controlPanel.SetMainText(`${targetSuggestion.suggester.name} asked ${targetSuggestion.suggestee.name}`);
        } else {
            this.controlPanel.SetMainText(`Select the player making a suggestion`);
        }
    }

    WriteControlPanelSuggestionButtons(turn) {
        const targetSuggestion = this.dm.GetSuggestion(turn);
        if (targetSuggestion.cardArray) {
            this.controlPanel.suspectButton.SetText(cardsAPI.getCardFromIndex(targetSuggestion.cardArray[0]));
            this.controlPanel.weaponButton.SetText(cardsAPI.getCardFromIndex(targetSuggestion.cardArray[1]));
            this.controlPanel.roomButton.SetText(cardsAPI.getCardFromIndex(targetSuggestion.cardArray[2]));
        }
    }

    ValidateSuggestionButtons() {
        const targetSuggestion = this.dm.GetSuggestion(this.currentTurn);
        const s = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[0]);
        const w = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[1]);
        const r = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[2]);

        if (s == SYMBOLS.knownHave || w == SYMBOLS.knownHave || r == SYMBOLS.knownHave) {
            this.controlPanel.noneButton.SetEnabled(false);
        }

        if (targetSuggestion.suggester.index > 0) {
            /// Someone else is making the suggestion
            this.controlPanel.suspectButton.SetEnabled(false);
            this.controlPanel.weaponButton.SetEnabled(false);
            this.controlPanel.roomButton.SetEnabled(false);
            if (targetSuggestion.suggestee.index == 0) {
                this.controlPanel.unknownButton.SetEnabled(false);
                if (s == SYMBOLS.knownHave) {
                    this.controlPanel.suspectButton.SetEnabled(true);
                }
                if (w == SYMBOLS.knownHave) {
                    this.controlPanel.weaponButton.SetEnabled(true);
                }
                if (r == SYMBOLS.knownHave) {
                    this.controlPanel.roomButton.SetEnabled(true);
                }
            }
        } else {
            /// You are making the suggestion
            this.controlPanel.unknownButton.SetEnabled(false);

            if (s === SYMBOLS.knownVoid || s === SYMBOLS.hiddenCard) {
                this.controlPanel.suspectButton.SetEnabled(false);
            }
            if (w === SYMBOLS.knownVoid || s === SYMBOLS.hiddenCard) {
                this.controlPanel.weaponButton.SetEnabled(false);
            }
            if (r === SYMBOLS.knownVoid || s === SYMBOLS.hiddenCard) {
                this.controlPanel.roomButton.SetEnabled(false);
            }
        }
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
        /*if (this.currentTurn < this.dm.suggestionHistory.length) {
            this.currentTurn++;
        }*/
        this.currentTurn++;
        this.DisplayTurn(this.currentTurn);
    }

    DecreaseTurn() {
        if (this.currentTurn > 0) {
            this.currentTurn--;
        }
        this.DisplayTurn(this.currentTurn);
    }


}