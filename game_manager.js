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
    InteractiveMenu
} from './interactive_menu.js';
import {
    DataManager,
    Suggestion
} from './clue_data.js';
import {
    cardsAPI,
    presets
} from './clue_cards.js';
import {
    SYMBOLS
} from './table_symbols.js';


/// The orchestrator that ties every other piece together: DataManager (the deduction engine),
/// InteractiveTable (the grid), ControlPanel (the bottom bar), NameSetup (the first screen)
/// and InteractiveMenu (the corner menu + its popups). Every one of those classes is "dumb" UI
/// or "dumb" data - GameManager is the only place that knows what step of the game you're on
/// (this.state: 'name' / 'starting' / 'extra' / 'suggestion') and what should happen next.
///
/// Two turn counters matter throughout this file:
/// - currentTurn: the index of the LIVE, in-progress (or about to start) suggestion - the
///   actual "how far the game has gotten" pointer.
/// - viewedTurn: whichever turn is currently being DISPLAYED, which may be currentTurn (the
///   live game) or an earlier turn the user is browsing back to with the history arrows.
/// They're equal almost all the time; they only diverge while browsing history, and
/// GoBack/GoForward/DisplayViewedTurn are what keeps them in sync.
export class GameManager {
    constructor() {
        this.dm = new DataManager();
        this.nameSetup = new NameSetup({
            onStartGame: () => this.StartGame(this.nameSetup.GetTextInputArray()),
            onAbout: () => this.menu.ShowAbout() /// this.menu is constructed further below, but by the time this fires (a later button press) it always exists
        });
        this.interactiveTable = new InteractiveTable({
            container: document.getElementById('interactive-table-container'),
            id: 'interactive-table-1',
            rowCount: 6, /// always built for the max player count (6); unused rows are hidden, not removed - see WritePlayerNamesToTable
            colCount: 21, /// 6 suspects + 6 weapons + 9 rooms, matching cardsAPI's flat indexing
            catetoryStarts: new Set([1, 7, 13]), /// column numbers (1-based, header col excluded) where each category begins, for the dashed divider
            OnToggleCol: (selectedColsSet) => this._HandleTableColToggle(selectedColsSet),
            OnToggleRow: (selectedRowsSet) => this._HandleTableRowToggle(selectedRowsSet),
            OnToggleMenu: () => this.menu.ToggleMenu(),
        });
        this.controlPanel = new ControlPanel({
            OnPressConfirmStarting: () => this.SetStartingCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmExtra: () => this.SetExtraCards(this.interactiveTable.GetSelectedCols()),
            OnPressConfirmSuggestionResponse: (responseButton) => this.ConfirmSuggestionResponse(responseButton),
            OnPressEditSuggestionResponse: (responseButton) => this.EditSuggestionResponse(responseButton),
            OnPressGoBack: () => this.GoBack(),
            OnPressGoForward: () => this.GoForward(),
            OnPressManualConfirm: () => this.ConfirmManualEntry(),
            OnPressManualBack: () => this.CancelManualEntry()
        });
        this.menu = new InteractiveMenu({
            onNewGame: () => this.NewGame(),
            onUndo: () => this.UndoSuggestion(),
            onManualEntry: () => this.EnterManualEntry(),
            onSelectPreset: (name) => this.SetCardPreset(name),
            presets: Object.keys(presets)
        });
        this.controlPanel.onSuggestionSelectionChanged = () => this._OnSuggestionSelectionChanged();
        this._editOriginalButton = null; /// tracks the response button that was selected before an edit, so a no-op re-selection doesn't enable Edit - see HighlightExistingResponse/_OnSuggestionSelectionChanged
        this._preManualSnapshot = null; /// the table selection to restore once manual entry (see below) is confirmed or cancelled
        this.currentTurn = 0;
        this.viewedTurn = 0;
        this.roundCounter = 0; /// how many players have been asked so far in the CURRENT round (resets each round, capped at numPlayers - 1 - see ContinueSuggestion)
        /// Cells ("row-col") that have already played the ~2s discovery animation - played once
        /// per game, never replayed just because the table re-renders or history is browsed.
        this.discoveredCells = new Set();
        this.state;
        this.NewGame();
    }

    /// Fires whenever a row (player) is selected/deselected on the table while making a
    /// suggestion. Only meaningful in the 'suggestion' state, and only for the live turn -
    /// rows aren't selectable at all while viewing history (see DisplayViewedTurn's
    /// EnableRowSelectMode(isLive)), but this guard exists as a defensive backstop.
    /// Only one row can be the suggester at a time; selecting a row sets that player as
    /// suggester and automatically the NEXT player in turn order as suggestee (Select2Row).
    _HandleTableRowToggle(selectedRowsSet) {
        if (this.state === 'manual') {
            this._ValidateManualEntry();
            return;
        }
        if (this.state === 'suggestion' && this.viewedTurn !== this.currentTurn) return;
        if (selectedRowsSet.size > 0) {
            const selectedIndex = Array.from(selectedRowsSet)[0] - 1;
            this.dm.SetSuggester(this.currentTurn, selectedIndex);
            this.dm.SetSuggestee(this.currentTurn, this.dm.GetNextPlayer(selectedIndex));
            this.interactiveTable.Select2Row(this.dm.suggestionHistory[this.currentTurn].suggestee.index + 1);

        } else {
            this.dm.SetSuggester(this.currentTurn, undefined);
            this.dm.SetSuggestee(this.currentTurn, undefined);
            this.interactiveTable.Select2Row(0);
        }
        this.WriteControlPanelSuggestionText(this.currentTurn);
        this._ValidateSuggestion();
    }

    /// Fires whenever a column (card) is selected/deselected. Behavior depends entirely on
    /// which step of the game is active - picking your starting hand, picking the extra/
    /// face-down cards, or picking the three cards of a suggestion.
    _HandleTableColToggle(selectedColsSet) {
        if (this.state === 'manual') {
            this._ValidateManualEntry();
            return;
        }
        if (this.state === 'suggestion' && this.viewedTurn !== this.currentTurn) return;
        var sortedArray = Array.from(selectedColsSet, (x) => x - 1).sort((a, b) => a - b);
        switch (this.state) {
            case 'starting':
                this._ValidateStartingCards(sortedArray);
                break;
            case 'extra':
                this._ValidateExtraCards(sortedArray);
                break;
            case 'suggestion':
                this._SelectedCols(sortedArray);
                this._ValidateSuggestion();
                break;
            default:
                console.warn(`state ${this.state} doesn't have a function assigned to col toggle`)
        }
    }

    /// Sorts whatever columns are currently selected into the suggestion's [suspect, weapon,
    /// room] slots (interactiveTable.categorySelectionMode ensures at most one column per
    /// category can be selected at once, so this never has to pick between two of the same
    /// category). Writes the result into the current suggestion and refreshes the button labels.
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

    /// Enables Confirm once exactly `numCards` starting-hand columns are selected, and shows
    /// a running "x / y" count in the validation text either way.
    _ValidateStartingCards(cardArray) {
        const num = cardArray.length;
        const requirement = this.dm.numCards;
        this.controlPanel.SetValidationText(`${num} / ${requirement}`);
        if (num == requirement) {
            this.controlPanel.ConfirmButtonEnabled(true);
        } else {
            this.controlPanel.ConfirmButtonEnabled(false);
        }
    }

    /// Same idea as _ValidateStartingCards, but also actively rejects any column that was
    /// already claimed as a starting card (a card can't be both in someone's hand and an
    /// extra/face-down card).
    _ValidateExtraCards(cardArray) {
        /// Extra cards cant be starting cards
        cardArray.forEach((card, index) => {
            if (this.dm.startingCards.includes(card)) {
                cardArray.splice(index, 1);
                this.interactiveTable.UnSelectCol(card + 1);
            }
        })
        const num = cardArray.length;
        const requirement = this.dm.numExtra;
        this.controlPanel.SetValidationText(`${num} / ${requirement}`);
        if (num == requirement) {
            this.controlPanel.ConfirmButtonEnabled(true);
        } else {
            this.controlPanel.ConfirmButtonEnabled(false);
        }
    }

    /// A suggestion is ready to be answered once a suggester is chosen (row) AND all three
    /// card categories are chosen (columns) - only then do the response buttons light up.
    _ValidateSuggestion() {
        const playerSelected = this.interactiveTable.GetSelectedRows()[0];
        const numCols = this.interactiveTable.GetSelectedCols().length;

        this.controlPanel.ConfirmButtonEnabled(false);
        if (numCols == 3 && playerSelected >= 0) {
            this.controlPanel.SuggestionButtonsEnabled(true);
            this.ValidateSuggestionButtons();

        } else {
            this.controlPanel.SuggestionButtonsEnabled(false);
        }
    }

    /// Display States
    /// Each Display* method below is a full "screen" of the app: it sets `this.state`, shows/
    /// hides the relevant containers, and configures the table/control panel for that step.
    /// Only one of these is ever "current" at a time.
    DisplayNameSetup() {
        this.state = 'name';

        this.nameSetup.DisplayNameSetup(true);
        this.interactiveTable.DisplayTable(false);
        this.controlPanel.ChangeState(this.controlPanel.NEW_GAME);
    }

    DisplayStartingCards() {
        this.state = 'starting';

        this.nameSetup.DisplayNameSetup(false);
        this.dm.WritePlayerDataFromSuggestionHistory(0); /// nothing recorded yet, but this seeds each player's cardArray to all-unknown
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.EnableColSelectMode(true);
        this.interactiveTable.EnableRowSelectMode(false); /// no suggester to pick yet - only columns (cards) are selectable here
        this.interactiveTable.Select2Row(1); /// highlight row 1 (you) as a visual hint for whose hand is being picked
        this.controlPanel.ChangeState(this.controlPanel.STARTING_CARDS);
        this._ValidateStartingCards([])
    }

    DisplayExtraCards() {
        this.state = 'extra';

        this.nameSetup.DisplayNameSetup(false);
        this.dm.WritePlayerDataFromSuggestionHistory(0);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.colTargetActive = true;
        this.interactiveTable.EnableColSelectMode(true);
        this.interactiveTable.EnableRowSelectMode(false);
        this.controlPanel.ChangeState(this.controlPanel.EXTRA_CARDS);
        this._ValidateExtraCards([]);
    }

    /// Enters/re-enters the main "make a suggestion" screen for the LIVE turn (as opposed to
    /// DisplayViewedTurn, which renders a possibly-past turn while browsing). Resets viewedTurn
    /// back to currentTurn and clears any leftover selection from a previous suggestion.
    DisplaySuggestion() {
        const turn = this.currentTurn;

        this.state = 'suggestion';

        this.nameSetup.DisplayNameSetup(false);
        this.WriteTableCellDataFromPlayerData();
        this.interactiveTable.DisplayTable(true);
        this.interactiveTable.EnableColSelectMode(true);
        this.interactiveTable.EnableRowSelectMode(true);
        this.interactiveTable.categorySelectionMode = true; /// only one card per category selectable at a time

        this.controlPanel.ChangeState(this.controlPanel.SUGGESTION);
        this.menu.SetUndoAvailable(this.currentTurn > 0);
        this.menu.SetManualEntryAvailable(true); /// only ever reachable while live, per the guard in EnterManualEntry
        this.viewedTurn = this.currentTurn;
        this.controlPanel.SetForwardButtonMode('confirm');
        this.controlPanel.SetBackEnabled(this.viewedTurn > 0);
        this.controlPanel.SetForwardEnabled(false);
        this.controlPanel.SetHistoryButtonsHighlighted(false);
        this.interactiveTable.ClearAllSelection();

        this._ValidateSuggestion();
        this.WriteControlPanelSuggestionText(turn);
        this.WriteControlPanelSuggestionButtons(turn);
    }


    /// Actions
    /// Full reset back to the name-entry screen - wipes the DataManager entirely (a fresh
    /// instance, not just cleared fields) and every piece of UI selection state.
    NewGame() {
        console.log(`New game: Initializing game data`);
        this.dm = new DataManager();
        this.currentTurn = 0;
        this.viewedTurn = 0;
        this.roundCounter = 0;
        this.discoveredCells.clear();

        this.nameSetup.ResetValues();
        this.nameSetup.DisableStartButton();

        this.interactiveTable.ClearAllSelection();
        this.interactiveTable.categorySelectionMode = false;

        this.controlPanel.selectedSuggestionButton = null;
        this.controlPanel.UnselectSuggestionButtons();
        this.controlPanel.SetForwardButtonMode('confirm');

        this.menu.SetUndoAvailable(false);
        this.menu.SetManualEntryAvailable(false);
        this.menu.CloseMenu();

        /// The card preset is deliberately NOT part of DataManager's state, so a fresh
        /// `new DataManager()` above doesn't reset it on its own - the corner menu's card list
        /// should always start back on "default" for a new game, same as a fresh page load.
        this.SetCardPreset('default');
        this.menu.SetPresetSelection('default');

        this.DisplayNameSetup();
    }

    /// Called once names are entered and Start Game is pressed. Builds the actual Player
    /// objects (now that we finally know how many there are), writes their names + the current
    /// card preset's names onto the table, and moves on to picking a starting hand.
    StartGame(playerNamesArr) {
        console.log(`Game started with ${playerNamesArr.length} players`);
        this.dm.CreatePlayers(playerNamesArr);
        this.WritePlayerNamesToTable();
        this.WriteCardNamesToTable();
        this.DisplayStartingCards();
        this.controlPanel.ConfirmButtonEnabled(false);
    }

    /// Confirms the chosen starting hand and moves on to either the extra-cards step (if the
    /// player count doesn't divide 18 evenly) or straight into the first suggestion.
    SetStartingCards(cardArray) {
        console.log(`Starting cards selected ${cardArray.map(card =>cardsAPI.getCardFromIndex(card))}`);
        this.dm.SetStartingCards(cardArray);
        if (this.dm.numExtra > 0) {
            this.DisplayExtraCards();
        } else {
            this.StartNewSuggestion();
        }
        this.controlPanel.ConfirmButtonEnabled(false);
        this.interactiveTable.ClearAllSelection();
        /// NOTE (latent oddity, left as-is for review): called with no `toTurn` argument, so
        /// inside WritePlayerDataFromSuggestionHistory the `suggestion.turn <= toTurn` check
        /// compares against `undefined`, which is always false - no suggestion ever gets
        /// interpreted by this particular call. It happens to be harmless today because
        /// whichever branch above already ran (DisplayExtraCards or StartNewSuggestion) either
        /// recomputed correctly on its own or created a suggestion with no response yet (which
        /// InterpretSuggestion skips regardless), but it's not doing the recompute its call
        /// site's phrasing suggests. Passing `this.currentTurn` explicitly would make the
        /// intent clear.
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    /// Confirms the chosen extra/face-down cards and moves on to the first suggestion. See the
    /// NOTE on SetStartingCards above - the same missing-argument oddity applies here.
    SetExtraCards(cardArray) {
        console.log(`Extra cards selected ${cardArray.map(card =>cardsAPI.getCardFromIndex(card))}`);
        this.dm.SetExtraCards(cardArray);
        this.StartNewSuggestion();
        this.controlPanel.ConfirmButtonEnabled(false);
        this.interactiveTable.ClearAllSelection();
        this.dm.WritePlayerDataFromSuggestionHistory();
        this.WriteTableCellDataFromPlayerData();
    }

    /// Suggestions
    /// Begins a brand new round: a blank Suggestion is appended to history and the suggestion
    /// screen is shown for it.
    StartNewSuggestion() {
        this.dm.CreateNewSuggestion();
        this.DisplaySuggestion();
        this.interactiveTable.EnableColSelectMode(true);
        this.interactiveTable.EnableRowSelectMode(true);
        const suggestion = this.dm.GetMostRecentSuggestion();
        this.controlPanel.SetTurnText(suggestion.roundNumber, suggestion.stepInRound);

    }

    /// Passes the SAME suggestion (same three cards) on to the next player in the circle -
    /// this happens automatically after a "None" response, since the asking player needs to
    /// keep asking around the table until someone can respond (or everyone's been asked).
    /// Stops and finalizes the round once every other player has had a turn.
    ContinueSuggestion() {
        this.roundCounter++;
        if (this.roundCounter >= this.dm.numPlayers - 1) {
            this.EndSuggestion();
            return
        }
        this.dm.ContinueSuggestion();
        this.interactiveTable.EnableColSelectMode(false); /// cards are locked in once a suggestion starts being passed around
        this.interactiveTable.EnableRowSelectMode(false);
        this._ValidateSuggestion();
        const suggestion = this.dm.GetMostRecentSuggestion();
        this.interactiveTable.Select2Row(suggestion.suggestee.index + 1);
        this.controlPanel.SetTurnText(suggestion.roundNumber, suggestion.stepInRound);
        this.menu.SetUndoAvailable(this.currentTurn > 0);
        this.controlPanel.SetForwardButtonMode('confirm');
        this.controlPanel.SetBackEnabled(this.viewedTurn > 0);
        this.controlPanel.SetForwardEnabled(false);
        this.controlPanel.SetHistoryButtonsHighlighted(false);
    }

    /// Wraps up the current round (whether it ended because someone showed a card, or because
    /// it was passed all the way around with no response) and immediately starts the next one.
    EndSuggestion() {
        this.roundCounter = 0;
        this.interactiveTable.ClearAllSelection();
        this.StartNewSuggestion();
    }

    /// Records the response to the LIVE suggestion, advances currentTurn, and decides what
    /// happens next: if the response was "none" (knownVoid) and there's still a suggestee to
    /// pass to, the suggestion continues around the table; otherwise the round is over.
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

    /// Undo the in-progress suggestion and reopen the previous one for editing.
    /// This is deliberately the ONLY way to remove a turn from history entirely (as opposed to
    /// the history back/forward + Edit flow, which only ever overwrites a response in place) -
    /// it's meant for "I picked the wrong suggester/cards and haven't confirmed a response yet"
    /// style mistakes, made right after the fact.
    UndoSuggestion() {
        if (this.state === 'manual') {
            console.warn(`Finish or cancel manual entry before undoing.`);
            return;
        }
        if (this.currentTurn === 0) {
            console.warn(`Nothing to undo.`);
            return;
        }

        /// Discard the suggestion currently being built
        this.dm.suggestionHistory.pop();
        this.currentTurn--;
        this.viewedTurn = this.currentTurn;
        if (this.roundCounter > 0) this.roundCounter--;

        /// Reopen the previous suggestion for editing
        const target = this.dm.GetMostRecentSuggestion();
        target.response = undefined;

        this.dm.WritePlayerDataFromSuggestionHistory(this.currentTurn);
        this.DisplaySuggestion();

        if (target.suggester) {
            this.interactiveTable.SelectRow(target.suggester.index + 1);
        }
        if (target.suggestee) {
            this.interactiveTable.Select2Row(target.suggestee.index + 1);
        }
        if (target.cardArray) {
            target.cardArray.forEach(card => {
                if (card !== '' && card !== undefined) {
                    this.interactiveTable.SelectCol(card + 1);
                }
            });
        }

        this.controlPanel.SetTurnText(target.roundNumber, target.stepInRound);
        this.WriteControlPanelSuggestionText(this.currentTurn);
        this.WriteControlPanelSuggestionButtons(this.currentTurn);
        this._ValidateSuggestion();
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

    /// Writes each player's name into their row header, and hides whichever of the 6 built-in
    /// table rows aren't needed for this player count (rows are never rebuilt, just shown/hidden).
    WritePlayerNamesToTable() {
        this.interactiveTable.HideRows(1, 6, false);
        this.dm.players.forEach((player, index) => {
            this.interactiveTable.WriteTableData(index + 1, 0, player.name);
        });
        this.interactiveTable.HideRows(this.dm.numPlayers + 1, 6, true);
    }

    /// The main "redraw the whole board" step: pushes every player's current cardArray (as
    /// computed by DataManager) onto the table, updates each player's badge count, and decides
    /// which animation (if any) to play per cell - the one-time ~2s discovery animation for a
    /// cell that just became known-have/hidden for the first time ever, or the quick ordinary
    /// spin for any other change. Cells that have already played their discovery animation once
    /// (tracked in `discoveredCells`) fall back to the ordinary spin on subsequent redraws.
    WriteTableCellDataFromPlayerData() {
        this.dm.players.forEach((player, index) => {
            this.interactiveTable.UpdateBadge(index, player.cardsKnown)
            const row = index + 1;
            player.cardArray.forEach((card, cardIndex) => {
                const col = cardIndex + 1;
                this.interactiveTable.WriteTableData(row, col, card);
                if (card != SYMBOLS.unknown) {
                    if (row == 0 || col == 0) {
                        // no-op (row/col 0 are headers - never reached here since row/col start at 1, kept as a defensive guard)
                    } else if (
                        (card === SYMBOLS.knownHave || card === SYMBOLS.hiddenCard) &&
                        !this.discoveredCells.has(`${row}-${col}`)
                    ) {
                        this.discoveredCells.add(`${row}-${col}`);
                        this.interactiveTable.PlayDiscoveryAnimation(row, col, card === SYMBOLS.hiddenCard ? 'hidden' : 'have');
                    } else {
                        this.interactiveTable.SpinTableCell(row, col);
                    }
                }
            });
        });
    }

    /// Sets the "X asked Y" (or "select the player making a suggestion") status line for the
    /// given turn.
    WriteControlPanelSuggestionText(turn) {
        const targetSuggestion = this.dm.GetSuggestion(turn);
        if (targetSuggestion.suggestee && targetSuggestion.suggester) {
            this.controlPanel.SetMainText(`${targetSuggestion.suggester.name} asked ${targetSuggestion.suggestee.name}`);
        } else if (targetSuggestion.suggestee) {
            /// A manual entry (see ConfirmManualEntry) has a suggestee but no suggester - only
            /// reachable here if Undo reopens one for editing, since manual entry's own UI
            /// never uses this text.
            this.controlPanel.SetMainText(`Manually marked ${targetSuggestion.suggestee.name} as having a card`);
        } else {
            this.controlPanel.SetMainText(`Select the player making a suggestion`);
        }
    }

    /// Relabels the suspect/weapon/room response buttons with the actual card names chosen
    /// for this suggestion's turn.
    WriteControlPanelSuggestionButtons(turn) {
        const targetSuggestion = this.dm.GetSuggestion(turn);
        if (targetSuggestion.cardArray) {
            var s = cardsAPI.getCardFromIndex(targetSuggestion.cardArray[0]);
            var w = cardsAPI.getCardFromIndex(targetSuggestion.cardArray[1]);
            var r = cardsAPI.getCardFromIndex(targetSuggestion.cardArray[2]);
            this.controlPanel.WriteSuggestionButtons(s, w, r);
        }
    }

    /// Disables whichever response buttons would contradict what's already known about the
    /// suggestee for this turn's three cards - e.g. if we already know they don't have the
    /// suggested weapon, the "Weapon" response button can't be correct and gets disabled. Also
    /// handles the asymmetry between "you are the suggester" (you already know your own
    /// answer, so only None/Unknown make sense... unless it's someone else asking) and
    /// "someone else is the suggester" (you're recording what THEY told the group, so the
    /// per-card buttons matter, gated on what's already provable).
    ValidateSuggestionButtons(turn = this.currentTurn) {
        /// They dont have the card. knownVoid, extraCard, hiddenCard
        const targetSuggestion = this.dm.GetSuggestion(turn);
        const s = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[0]);
        const w = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[1]);
        const r = targetSuggestion.suggestee.GetCardSymbol(targetSuggestion.cardArray[2]);

        var voidCount = 0;

        if (this.DoesntHave(s)) {
            this.controlPanel.suspectButton.SetEnabled(false);
            voidCount++;
        }
        if (this.DoesntHave(w)) {
            this.controlPanel.weaponButton.SetEnabled(false);
            voidCount++;
        }
        if (this.DoesntHave(r)) {
            this.controlPanel.roomButton.SetEnabled(false);
            voidCount++;
        }

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
            if (voidCount >= 2) {
                if (voidCount == 3) {
                    this.controlPanel.unknownButton.SetEnabled(false);
                }
                if (s == SYMBOLS.unknown || s == SYMBOLS.possibleCard || s == SYMBOLS.knownHave) {
                    this.controlPanel.suspectButton.SetEnabled(true);
                }
                if (w == SYMBOLS.unknown || w == SYMBOLS.possibleCard || w == SYMBOLS.knownHave) {
                    this.controlPanel.weaponButton.SetEnabled(true);
                }
                if (r == SYMBOLS.unknown || r == SYMBOLS.possibleCard || r == SYMBOLS.knownHave) {
                    this.controlPanel.roomButton.SetEnabled(true);
                }

            }
        } else {
            /// You are making the suggestion
            this.controlPanel.unknownButton.SetEnabled(false);
        }
    }

    DoesntHave(c) {
        if (c == SYMBOLS.knownVoid || c == SYMBOLS.extraCard || c == SYMBOLS.hiddenCard) {
            return true
        } else {
            return false
        }
    }

    /// Recomputes and redraws the board as of a given turn. Used both for normal turn
    /// progression (IncreaseTurn) and exposed globally as window.DisplayTurn for manual
    /// debugging from the browser console (see index.js).
    DisplayTurn(turn) {
        this.dm.WritePlayerDataFromSuggestionHistory(turn);
        this.WriteTableCellDataFromPlayerData();
    }

    /// Advances the live game forward by one turn and redraws to match - called right after a
    /// suggestion's response is confirmed.
    IncreaseTurn() {
        this.currentTurn++;
        this.viewedTurn = this.currentTurn;
        this.DisplayTurn(this.currentTurn);
    }

    /// History navigation (Back / Forward)
    /// Both only make sense while actively making suggestions (not during name/starting/extra
    /// setup, which have no history to browse).
    CanGoBack() {
        return this.state === 'suggestion' && this.viewedTurn > 0;
    }

    CanGoForward() {
        return this.state === 'suggestion' && this.viewedTurn < this.currentTurn;
    }

    GoBack() {
        if (!this.CanGoBack()) return;
        this.viewedTurn--;
        this.DisplayViewedTurn();
    }

    GoForward() {
        if (!this.CanGoForward()) return;
        this.viewedTurn++;
        this.DisplayViewedTurn();
    }

    /// Show the suggestion recorded at this.viewedTurn: who was asked, which cards, and what they answered.
    /// Only the live (most recent, unconfirmed) turn is editable via the table; past turns are read-only
    /// except for their response, which can be corrected with the Edit button.
    DisplayViewedTurn() {
        const isLive = this.viewedTurn === this.currentTurn;
        const suggestion = this.dm.GetSuggestion(this.viewedTurn);

        /// Rebuild the table to show the state of knowledge as of this point in time, not the final/live
        /// state - otherwise a later discovery could wrongly grey out a response that was valid back then.
        this.dm.WritePlayerDataFromSuggestionHistory(isLive ? this.currentTurn : this.viewedTurn - 1);
        this.WriteTableCellDataFromPlayerData();

        this.interactiveTable.ClearAllSelection();
        if (suggestion.suggester) {
            this.interactiveTable.SelectRow(suggestion.suggester.index + 1);
        }
        if (suggestion.suggestee) {
            this.interactiveTable.Select2Row(suggestion.suggestee.index + 1);
        }
        if (suggestion.cardArray) {
            suggestion.cardArray.forEach(card => {
                if (card !== '' && card !== undefined) {
                    this.interactiveTable.SelectCol(card + 1);
                }
            });
        }

        this.interactiveTable.EnableColSelectMode(isLive);
        this.interactiveTable.EnableRowSelectMode(isLive);

        this.controlPanel.SetTurnText(suggestion.roundNumber, suggestion.stepInRound);
        this.WriteControlPanelSuggestionText(this.viewedTurn);
        this.WriteControlPanelSuggestionButtons(this.viewedTurn);

        if (isLive) {
            this.controlPanel.SetForwardButtonMode('confirm');
            this.controlPanel.selectedSuggestionButton = null;
            this.controlPanel.UnselectSuggestionButtons();
            this._editOriginalButton = null;
            this._ValidateSuggestion();
        } else {
            this.controlPanel.SetForwardButtonMode('edit');
            this.controlPanel.SuggestionButtonsEnabled(true);
            this.ValidateSuggestionButtons(this.viewedTurn);
            this.HighlightExistingResponse(suggestion);
            /// Edit stays disabled until a genuinely different answer is picked
            this.controlPanel.ConfirmButtonEnabled(false);
        }

        this.controlPanel.SetBackEnabled(this.CanGoBack());
        this.controlPanel.SetForwardEnabled(this.CanGoForward());
        this.controlPanel.SetHistoryButtonsHighlighted(!isLive);
        this.menu.SetManualEntryAvailable(isLive); /// manual entry snapshots/restores the LIVE screen's selection - not meaningful while browsing a past turn
    }

    /// Pre-select whichever response button matches the answer already recorded for this turn,
    /// and remember it so we can tell later whether the user actually changed anything.
    HighlightExistingResponse(suggestion) {
        this.controlPanel.suggestionButtons.forEach(button => button.SetSelected(false));
        this.controlPanel.selectedSuggestionButton = null;

        const response = suggestion.response;
        let match = null;
        if (response === SYMBOLS.knownVoid) {
            match = this.controlPanel.noneButton;
        } else if (response === SYMBOLS.possibleCard) {
            match = this.controlPanel.unknownButton;
        } else if (response === suggestion.cardArray[0]) {
            match = this.controlPanel.suspectButton;
        } else if (response === suggestion.cardArray[1]) {
            match = this.controlPanel.weaponButton;
        } else if (response === suggestion.cardArray[2]) {
            match = this.controlPanel.roomButton;
        }
        if (match) {
            match.SetSelected(true);
            this.controlPanel.selectedSuggestionButton = match;
        }
        this._editOriginalButton = match;
    }

    /// While editing a past turn, only let Edit be pressed once the selection actually differs
    /// from what was originally recorded - just re-selecting the same answer shouldn't count.
    _OnSuggestionSelectionChanged() {
        if (this.viewedTurn === this.currentTurn) return;
        const changed = this.controlPanel.selectedSuggestionButton !== this._editOriginalButton;
        this.controlPanel.ConfirmButtonEnabled(changed && this.controlPanel.selectedSuggestionButton != null);
    }

    /// Overwrite just this one past turn's response, then step forward to the next turn so the
    /// user can immediately see how the edit changed what's known from that point on. Edit mode
    /// only ever shows on a past turn (viewedTurn < currentTurn), so a next turn always exists.
    EditSuggestionResponse(responseButton) {
        if (!responseButton) return;
        this.dm.ConfirmSuggestionResponse(this.viewedTurn, responseButton);
        this.viewedTurn++;
        this.DisplayViewedTurn();
    }

    /// Manual entry - "I saw a card I'm not supposed to (or I'm just more confident than the
    /// deduction engine)". Lets you record a specific player's known-have card directly,
    /// without going through a suggestion. Only reachable while live (see
    /// InteractiveMenu.SetManualEntryAvailable / DisplaySuggestion / DisplayViewedTurn), since it
    /// works by snapshotting and later restoring the live suggestion screen's selection.
    ///
    /// The still-open live suggestion at this.currentTurn is never touched while in this mode -
    /// its suggester/suggestee/cardArray already persist safely in this.dm regardless of what
    /// the table is currently showing - so all that needs saving here is the VISUAL selection,
    /// to put back exactly as it was on Confirm or Back.
    EnterManualEntry() {
        if (this.state !== 'suggestion' || this.viewedTurn !== this.currentTurn) {
            console.warn(`Manual entry is only available while making the current suggestion.`);
            return;
        }

        this._preManualSnapshot = {
            cols: new Set(this.interactiveTable.selectedColumns),
            rows: new Set(this.interactiveTable.selectedRows),
            row2: this.interactiveTable.selected2Rows.size ? [...this.interactiveTable.selected2Rows][0] : 0
        };

        this.state = 'manual';
        this.interactiveTable.ClearAllSelection();
        this.interactiveTable.categorySelectionMode = true; /// restricts row selection to one player at a time (see InteractiveTable.ToggleRow)
        this.interactiveTable.exclusiveColSelectionMode = true; /// restricts column selection to one card total, any category
        this.interactiveTable.SetManualMode(true); /// lets the CSS give the row/column intersection a distinct combined look (see interactive_table.css)

        this.controlPanel.ChangeState(this.controlPanel.MANUAL);
        this.controlPanel.SetForwardButtonMode('manual');
        this.controlPanel.ConfirmButtonEnabled(false);
        this.menu.SetUndoAvailable(false);
        this.menu.SetManualEntryAvailable(false);
        this.menu.CloseMenu();
    }

    /// Confirm only lights up once exactly one player and one card are both chosen.
    _ValidateManualEntry() {
        const hasPlayer = this.interactiveTable.selectedRows.size > 0;
        const hasCard = this.interactiveTable.GetSelectedCols().length === 1;
        this.controlPanel.ConfirmButtonEnabled(hasPlayer && hasCard);
    }

    /// Records the chosen player+card as a known-have fact, then restores the table to
    /// whatever it looked like before manual entry was opened.
    ConfirmManualEntry() {
        const cols = this.interactiveTable.GetSelectedCols();
        const rowArr = [...this.interactiveTable.selectedRows];
        if (cols.length !== 1 || rowArr.length !== 1) return; /// shouldn't happen - the button is only enabled once both are chosen
        const card = cols[0];
        const player = this.dm.players[rowArr[0] - 1];

        console.log(`Manual entry: ${player.name} has ${cardsAPI.getCardFromIndex(card)}`);

        /// Slot the card into its actual category position (suspect/weapon/room), the same
        /// convention _SelectedCols uses for a real suggestion's cardArray - matters if Undo
        /// ever reopens this entry, since WriteControlPanelSuggestionButtons reads cardArray
        /// positionally.
        const manualCardArray = ['', '', ''];
        if (card >= 0 && card < 6) manualCardArray[0] = card;
        else if (card >= 6 && card < 12) manualCardArray[1] = card;
        else manualCardArray[2] = card;

        /// Insert the manual fact as its own completed "suggestion" right before the still-open
        /// live turn - this reuses the normal suggestion-response code path
        /// (InterpretSuggestion's `response >= 0` branch calls Player.SetKnownHave, which also
        /// marks every OTHER player void for this card, exactly like a real suggestion would)
        /// instead of mutating a Player object directly. That means the fact is correctly
        /// replayed by every future WritePlayerDataFromSuggestionHistory call, plays the normal
        /// discovery animation, and can be removed with Undo like any other turn - "all logic
        /// and deductions still work" comes for free rather than needing a parallel code path.
        const manualEntry = new Suggestion({
            suggestee: player,
            cardArray: manualCardArray,
            response: card,
            turn: this.currentTurn,
            roundNumber: this.dm.GetSuggestion(this.currentTurn).roundNumber,
            stepInRound: 0 /// 0 marks this as a manual entry rather than a real asked-in-round step
        });
        this.dm.suggestionHistory.splice(this.currentTurn, 0, manualEntry);
        /// Everything after the manual entry - just the still-open live turn - shifts up by one
        /// index; keep its `.turn` field in sync, since replay compares turns against it
        /// directly (see DataManager.WritePlayerDataFromSuggestionHistory).
        for (let i = this.currentTurn + 1; i < this.dm.suggestionHistory.length; i++) {
            this.dm.suggestionHistory[i].turn = i;
        }
        this.currentTurn++;
        this.viewedTurn = this.currentTurn;

        /// Recompute and redraw BEFORE restoring the suggestion UI, so the validation inside
        /// _ExitManualEntry (which checks the suggestee's now-updated card symbols) sees the
        /// fresh post-entry knowledge rather than stale pre-entry state.
        this.dm.WritePlayerDataFromSuggestionHistory(this.currentTurn);
        this.WriteTableCellDataFromPlayerData();

        this._ExitManualEntry();
    }

    /// Discards whatever was selected for the manual entry and restores the table, without
    /// recording anything.
    CancelManualEntry() {
        this._ExitManualEntry();
    }

    /// Shared cleanup for both Confirm and Back: leaves manual-entry mode and puts the table's
    /// selection back exactly as it was before EnterManualEntry ran.
    _ExitManualEntry() {
        this.state = 'suggestion';
        this.interactiveTable.exclusiveColSelectionMode = false;
        this.interactiveTable.categorySelectionMode = true;
        this.interactiveTable.SetManualMode(false);

        this.controlPanel.ChangeState(this.controlPanel.SUGGESTION);
        this.controlPanel.SetForwardButtonMode('confirm');
        this.controlPanel.SetHistoryButtonsHighlighted(false);

        this.interactiveTable.ClearAllSelection();
        const snap = this._preManualSnapshot;
        if (snap) {
            snap.cols.forEach(col => this.interactiveTable.SelectCol(col));
            snap.rows.forEach(row => this.interactiveTable.SelectRow(row));
            this.interactiveTable.Select2Row(snap.row2);
        }
        this._preManualSnapshot = null;

        this.menu.SetManualEntryAvailable(true);
        this.menu.SetUndoAvailable(this.currentTurn > 0);
        this.controlPanel.SetBackEnabled(this.CanGoBack());
        this.controlPanel.SetForwardEnabled(this.CanGoForward());

        this.WriteControlPanelSuggestionText(this.currentTurn);
        this.WriteControlPanelSuggestionButtons(this.currentTurn);
        this._ValidateSuggestion();
    }
}
