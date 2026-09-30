import {
    SYMBOLS
} from './table_symbols.js';
import {
    InteractiveButton
} from './interactive_button.js';

/// Describes one "mode" of the lower control panel: what text to show, whether the
/// suggestion-response buttons are visible, what the big forward button does, and whether the
/// whole panel (or just the turn-number text, or the history nav arrows) should be hidden.
/// GameManager switches between the states defined below via ChangeState() as the game moves
/// through its steps (naming players -> selecting starting cards -> selecting extra cards ->
/// making suggestions).
class State {
    constructor({
        mainText = "",
        validationText = "",
        suggestionButtonContainerHidden = true,
        forwardButtonText = "Confirm",
        forwardButtonFunction,
        hidden = false,
        historyControlsHidden = true,
        clearTurnText = false,
        manualBackButtonHidden = true
    }) {
        this.mainText = mainText;
        this.validationText = validationText;
        this.suggestionButtonContainerHidden = suggestionButtonContainerHidden;
        this.forwardButtonText = forwardButtonText;
        this.forwardButtonFunction = forwardButtonFunction;
        this.hidden = hidden;
        this.historyControlsHidden = historyControlsHidden;
        this.clearTurnText = clearTurnText;
        this.manualBackButtonHidden = manualBackButtonHidden;
    }
}

/// Owns the whole lower control panel: the turn-number/status text, the suspect/weapon/room +
/// none/unknown response buttons, the back/forward history-browsing arrows, and the single
/// big "Confirm"/"Edit" button whose label and behavior change depending on context. Like the
/// other Interactive* classes, this is pure UI plumbing - GameManager decides what state to be
/// in and what the buttons should do; this class just renders that and reports back through
/// the On* callbacks passed into the constructor.
export class ControlPanel {
    constructor({
        OnPressConfirmStarting,
        OnPressConfirmExtra,
        OnPressConfirmSuggestionResponse,
        OnPressEditSuggestionResponse,
        OnPressGoBack,
        OnPressGoForward,
        OnPressManualConfirm,
        OnPressManualBack
    }) {
        this.controlPanel = document.getElementById('control-panel');
        this.turnText = document.getElementById('turn-text');
        this.validationText = document.getElementById('validation-text');
        this.mainText = document.getElementById('main-text');
        this.suggestionArea = document.getElementById('suggestion-area');
        this.forwardButtonContainer = document.getElementById('forward-button-container');
        this.historyBackContainer = document.getElementById('history-back-container');
        this.historyForwardContainer = document.getElementById('history-forward-container');
        this.suggestionButtonContainer = document.getElementById('suggestion-buttons-container');
        this.secondaryButtonContainer = document.getElementById('secondary-buttons-container');


        this.forwardButton = new InteractiveButton({
            text: "Confirm",
            parent: this.forwardButtonContainer,
            type: "primary",
            id: "forward-button",
        });

        /// Only shown during the MANUAL state (manual card entry) alongside the forward button
        /// (which doubles as "Confirm" there too). Placed in the same container as the forward
        /// button and pulled in front of it via CSS `order` so it reads "Back  Confirm" left to
        /// right, matching the Back/Confirm ordering used in the menu's popup dialogs.
        this.manualBackButton = new InteractiveButton({
            text: "Back",
            parent: this.forwardButtonContainer,
            type: "secondary",
            id: "manual-back-button",
            onPress: () => OnPressManualBack()
        });
        this.manualBackButton.root.style.order = '-1';
        this.manualBackButton.SetEnabled(true); /// unlike most buttons here, Back is always pressable whenever it's shown - there's no "invalid" state for cancelling

        /// autoToggleSelect: false - these arrows don't visually "select" themselves on click;
        /// their highlighted look is instead driven by SetHistoryButtonsHighlighted below, to
        /// mean "you're viewing a past turn" rather than "this arrow was just pressed".
        this.historyBackButton = new InteractiveButton({
            text: "‹",
            parent: this.historyBackContainer,
            type: "secondary",
            id: "history-back-button",
            autoToggleSelect: false,
            onPress: () => OnPressGoBack()
        });

        this.historyForwardButton = new InteractiveButton({
            text: "›",
            parent: this.historyForwardContainer,
            type: "secondary",
            id: "history-forward-button",
            autoToggleSelect: false,
            onPress: () => OnPressGoForward()
        });

        /// The suggestion-category buttons (top row) - which category of card the suggestee
        /// responded with (used with response 'suspect'/'weapon'/'room' - see
        /// DataManager.ConfirmSuggestionResponse, which turns that into the actual card index
        /// from the current suggestion's cardArray).
        this.suspectButton = new InteractiveButton({
            text: "Suspect",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "suspect-button",
            onPress: () => this.SelectSuggestionResponse(this.suspectButton)
        });

        this.weaponButton = new InteractiveButton({
            text: "Weapon",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "weapon-button",
            onPress: () => this.SelectSuggestionResponse(this.weaponButton)
        });

        this.roomButton = new InteractiveButton({
            text: "Room",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "room-button",
            onPress: () => this.SelectSuggestionResponse(this.roomButton)
        });

        /// The secondary response buttons (bottom row) - "Unknown" means "showed one of the
        /// three but I don't know which" (SYMBOLS.possibleCard); "None" means they have none
        /// of the three suggested cards (SYMBOLS.knownVoid).
        this.unknownButton = new InteractiveButton({
            text: "Unknown",
            parent: this.secondaryButtonContainer,
            type: "secondary",
            id: "unknown-button",
            onPress: () => this.SelectSuggestionResponse(this.unknownButton)
        });

        this.noneButton = new InteractiveButton({
            text: "None",
            parent: this.secondaryButtonContainer,
            type: "secondary",
            id: "none-button",
            onPress: () => this.SelectSuggestionResponse(this.noneButton)
        });

        this.suggestionButtons = [this.suspectButton, this.weaponButton, this.roomButton, this.unknownButton, this.noneButton];
        this.selectedSuggestionButton = null;
        /// Optional hook GameManager attaches to react whenever the selected response button
        /// changes - used to decide whether the Edit button should light up while browsing a
        /// past turn (see _OnSuggestionSelectionChanged/HighlightExistingResponse there).
        this.onSuggestionSelectionChanged = null;

        this.forwardButton.SetEnabled(false);

        /// The forward button's onPress swaps between these two depending on SetForwardButtonMode:
        /// _confirmHandler commits a brand-new live suggestion, _editHandler overwrites the
        /// response on a past turn that's currently being viewed.
        this._confirmHandler = () => OnPressConfirmSuggestionResponse(this.ConfirmSuggestionResponse());
        this._editHandler = () => OnPressEditSuggestionResponse(this.ConfirmSuggestionResponse());
        /// manual mode doesn't have a "response" to translate (see ConfirmSuggestionResponse) -
        /// GameManager reads the chosen player/card straight off the table when this fires.
        this._manualConfirmHandler = () => OnPressManualConfirm();

        /// States - one per step of the game. See the State class doc comment above for what
        /// each field controls.
        this.NEW_GAME = new State({
            hidden: true,
            clearTurnText: true
        });

        this.STARTING_CARDS = new State({
            mainText: "Select your cards",
            forwardButtonFunction: () => OnPressConfirmStarting(),
            clearTurnText: true
        });

        this.EXTRA_CARDS = new State({
            mainText: "Select extra cards",
            forwardButtonFunction: () => OnPressConfirmExtra(),
            clearTurnText: true
        });

        this.SUGGESTION = new State({
            suggestionButtonContainerHidden: false,
            historyControlsHidden: false,
            forwardButtonFunction: this._confirmHandler
        });

        /// "I saw a card I'm not supposed to" - manual entry, opened from the corner menu. No
        /// suggestion buttons (there's no suspect/weapon/room to pick, just one card), no
        /// history arrows (browsing history mid-entry would be confusing), and the Back button
        /// appears alongside the repurposed forward ("Confirm") button.
        this.MANUAL = new State({
            mainText: "Select a known card",
            forwardButtonFunction: this._manualConfirmHandler,
            manualBackButtonHidden: false
        });
    }

    /// Applies a State object (one of the constants above) to the actual DOM - shows/hides the
    /// panel, sets its text, shows/hides the suggestion buttons and history arrows, and wires
    /// the forward button to whatever that state's action should be. Does NOT touch the
    /// forward button's mode (Confirm vs Edit) - that's set separately via
    /// SetForwardButtonMode once inside the SUGGESTION state, depending on whether the viewed
    /// turn is live or a past one.
    ChangeState(state) {
        if (state.hidden) {
            this.controlPanel.classList.add('hidden')
        } else {
            this.controlPanel.classList.remove('hidden')
        }
        if (state.clearTurnText) {
            this.ClearTurnText();
        }
        this.SetMainText(state.mainText);
        this.SetValidationText(state.validationText);
        this.HideSuggestionButtonContainer(state.suggestionButtonContainerHidden);
        this.forwardButton.SetText(state.forwardButtonText);
        this.forwardButton.onPress = state.forwardButtonFunction;
        this.historyBackButton.HideButton(state.historyControlsHidden);
        this.historyForwardButton.HideButton(state.historyControlsHidden);
        this.manualBackButton.HideButton(state.manualBackButtonHidden);
    }

    HideSuggestionButtonContainer(hide) {
        if (hide) {
            this.suggestionArea.classList.add('hidden');
        } else {
            this.suggestionArea.classList.remove('hidden');
        }
    }

    /// Formats the turn indicator as "round:step " (e.g. "3:2 " - the third suggestion,
    /// currently on the second player asked in that round).
    SetTurnText(roundNumber, stepInRound) {
        this.turnText.textContent = `${roundNumber}:${stepInRound} `;
    }

    ClearTurnText() {
        this.turnText.textContent = '';
    }

    SetMainText(text) {
        this.mainText.textContent = text;
    }

    SetValidationText(text) {
        this.validationText.textContent = text;
    }

    ConfirmButtonEnabled(enabled) {
        this.forwardButton.SetEnabled(enabled);
    }

    SetBackEnabled(enabled) {
        this.historyBackButton.SetEnabled(enabled);
    }

    SetForwardEnabled(enabled) {
        this.historyForwardButton.SetEnabled(enabled);
    }

    /// Highlights both nav arrows together to indicate "you're looking at a past turn",
    /// rather than either arrow reacting to being clicked. Call this AFTER SetBackEnabled/
    /// SetForwardEnabled, since SetEnabled always clears selection state as a side effect.
    SetHistoryButtonsHighlighted(highlighted) {
        this.historyBackButton.SetSelected(highlighted);
        this.historyForwardButton.SetSelected(highlighted);
    }

    /// 'confirm' commits the in-progress live suggestion; 'edit' overwrites just the response
    /// on a past turn; 'manual' commits a manually-entered known-have card.
    SetForwardButtonMode(mode) {
        if (mode === 'edit') {
            this.forwardButton.SetText('Edit');
            this.forwardButton.onPress = this._editHandler;
        } else if (mode === 'manual') {
            this.forwardButton.SetText('Confirm');
            this.forwardButton.onPress = this._manualConfirmHandler;
        } else {
            this.forwardButton.SetText('Confirm');
            this.forwardButton.onPress = this._confirmHandler;
        }
    }

    SuggestionButtonsEnabled(enabled) {
        this.suspectButton.SetEnabled(enabled);
        this.weaponButton.SetEnabled(enabled);
        this.roomButton.SetEnabled(enabled);
        this.unknownButton.SetEnabled(enabled);
        this.noneButton.SetEnabled(enabled);
    }

    /// Clicking an already-selected response button deselects it (back to "nothing chosen");
    /// clicking a different one replaces the selection. Enables/disables the forward button to
    /// match whether anything is currently selected, then notifies GameManager via
    /// onSuggestionSelectionChanged so it can decide whether Edit should be enabled.
    SelectSuggestionResponse(responseButton) {
        if (responseButton.GetState().selected) {
            this.selectedSuggestionButton = null;
        } else {
            this.selectedSuggestionButton = responseButton;
            this.UnselectSuggestionButtons();
        }
        if (this.selectedSuggestionButton != null) {
            this.ConfirmButtonEnabled(true);
        } else {
            this.ConfirmButtonEnabled(false);
        }
        if (this.onSuggestionSelectionChanged) this.onSuggestionSelectionChanged();
    }

    UnselectSuggestionButtons() {
        this.suggestionButtons.forEach(button => {
            if (this.selectedSuggestionButton != button) {
                button.SetSelected(false);
            }
        });
    }

    /// Translates the currently-selected response button into the string/symbol
    /// DataManager.ConfirmSuggestionResponse expects.
    ConfirmSuggestionResponse() {
        if (this.selectedSuggestionButton == this.suspectButton) {
            return 'suspect'
        } else if (this.selectedSuggestionButton == this.weaponButton) {
            return 'weapon'
        } else if (this.selectedSuggestionButton == this.roomButton) {
            return 'room'
        } else if (this.selectedSuggestionButton == this.unknownButton) {
            return SYMBOLS.possibleCard
        } else if (this.selectedSuggestionButton == this.noneButton) {
            return SYMBOLS.knownVoid
        }
    }

    /// Relabels the suspect/weapon/room buttons with the actual card names that were
    /// suggested (falling back to the generic category name, dimmed via disable-highlight, for
    /// any category that wasn't part of this suggestion - e.g. a category with no column
    /// selected yet).
    WriteSuggestionButtons(s, w, r) {
        if (s == undefined) {
            s = 'Suspect'
            this.suspectButton.root.classList.add('disable-highlight');
        } else {
            this.suspectButton.root.classList.remove('disable-highlight');
        }
        if (w == undefined) {
            w = 'Weapon'
            this.weaponButton.root.classList.add('disable-highlight');
        } else {
            this.weaponButton.root.classList.remove('disable-highlight');
        }
        if (r == undefined) {
            r = 'Room'
            this.roomButton.root.classList.add('disable-highlight');
        } else {
            this.roomButton.root.classList.remove('disable-highlight');
        }
        this.suspectButton.SetText(s);
        this.weaponButton.SetText(w);
        this.roomButton.SetText(r);
    }
}
