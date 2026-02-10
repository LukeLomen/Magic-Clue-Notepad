import {
    SYMBOLS
} from './table_symbols.js';
import {
    InteractiveButton
} from './interactive_button.js';

class State {
    constructor({
        mainText = "",
        validationText = "",
        suggestionButtonContainerHidden = true,
        forwardButtonText = "Confirm",
        forwardButtonFunction,
        hidden = false
    }) {
        this.mainText = mainText;
        this.validationText = validationText;
        this.suggestionButtonContainerHidden = suggestionButtonContainerHidden;
        this.forwardButtonText = forwardButtonText;
        this.forwardButtonFunction = forwardButtonFunction;
        this.hidden = hidden;
    }
}

export class ControlPanel {
    constructor({
        OnPressConfirmStarting,
        OnPressConfirmExtra,
        OnPressConfirmSuggestionResponse
    }) {
        this.controlPanel = document.getElementById('control-panel');
        this.turnText = document.getElementById('turn-text');
        this.validationText = document.getElementById('validation-text');
        this.mainText = document.getElementById('main-text');
        this.suggestionArea = document.getElementById('suggestion-area');
        this.forwardButtonContainer = document.getElementById('forward-button-container');
        this.suggestionButtonContainer = document.getElementById('suggestion-buttons-container');
        this.secondaryButtonContainer = document.getElementById('secondary-buttons-container');


        this.forwardButton = new InteractiveButton({
            text: "Confirm",
            parent: this.forwardButtonContainer,
            type: "primary",
            id: "forward-button",
        });

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

        this.forwardButton.SetEnabled(false);

        /// States
        this.NEW_GAME = new State({
            hidden: true
        });

        this.STARTING_CARDS = new State({
            mainText: "Select Your Cards",
            forwardButtonFunction: () => OnPressConfirmStarting()
        });

        this.EXTRA_CARDS = new State({
            mainText: "Select Extra Cards",
            forwardButtonFunction: () => OnPressConfirmExtra()
        });

        this.SUGGESTION = new State({
            suggestionButtonContainerHidden: false,
            forwardButtonFunction: () => OnPressConfirmSuggestionResponse(this.ConfirmSuggestionResponse())
        });
    }

    ChangeState(state) {
        if (state.hidden) {
            this.controlPanel.classList.add('hidden')
        } else {
            this.controlPanel.classList.remove('hidden')
        }
        this.SetMainText(state.mainText);
        this.SetValidationText(state.validationText);
        this.HideSuggestionButtonContainer(state.suggestionButtonContainerHidden);
        this.forwardButton.SetText(state.forwardButtonText);
        this.forwardButton.onPress = state.forwardButtonFunction;
    }

    HideSuggestionButtonContainer(hide) {
        if (hide) {
            this.suggestionArea.classList.add('hidden');
        } else {
            this.suggestionArea.classList.remove('hidden');
        }
    }

    SetTurnText(turnNumber) {
        this.turnText.textContent = `${turnNumber}: `;
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

    SuggestionButtonsEnabled(enabled) {
        this.suspectButton.SetEnabled(enabled);
        this.weaponButton.SetEnabled(enabled);
        this.roomButton.SetEnabled(enabled);
        this.unknownButton.SetEnabled(enabled);
        this.noneButton.SetEnabled(enabled);
    }

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
    }

    UnselectSuggestionButtons() {
        this.suggestionButtons.forEach(button => {
            if (this.selectedSuggestionButton != button) {
                button.SetSelected(false);
            }
        });
    }

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