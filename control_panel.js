import {
    InteractiveButton
} from './interactive_button.js';

export class ControlPanel {
    constructor({
        OnPressForward,
        OnPressBack,
        OnPressSuspect,
        OnPressWeapon,
        OnPressRoom,
        OnPressUnknown,
        OnPressNone
    }) {
        this.validationText = document.getElementById('validation-text');
        this.mainText = document.getElementById('main-text');
        this.forwardButtonContainer = document.getElementById('forward-button-container');
        this.backButtonContainer = document.getElementById('back-button-container');
        this.suggestionButtonContainer = document.getElementById('suggestion-buttons-container');

        this.forwardButton = new InteractiveButton({
            text: "Next",
            icon: "→",
            parent: this.forwardButtonContainer,
            type: "primary",
            id: "forward-button",
            onPress: () => OnPressForward()
        });

        this.backButton = new InteractiveButton({
            text: "Back",
            icon: "<",
            parent: this.backButtonContainer,
            type: "primary",
            id: "back-button",
            onPress: () => OnPressBack()
        });

        this.suspectButton = new InteractiveButton({
            text: "Suspect",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "suspect-button",
            onPress: () => OnPressSuspect()
        });

        this.weaponButton = new InteractiveButton({
            text: "Weapon",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "weapon-button",
            onPress: () => OnPressWeapon()
        });

        this.roomButton = new InteractiveButton({
            text: "Room",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "room-button",
            onPress: () => OnPressRoom()
        });

        this.unknownButton = new InteractiveButton({
            text: "Unknown",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "unknown-button",
            onPress: () => OnPressUnknown()
        });

        this.noneButton = new InteractiveButton({
            text: "None",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "none-button",
            onPress: () => OnPressNone()
        });
    }

    HideSuggestionButtonContainer(hide) {
        if (hide) {
            this.suggestionButtonContainer.classList.add('hidden')
        } else {
            this.suggestionButtonContainer.classList.remove('hidden')
        }
    }

    HideBackButtonContainer(hide) {
        if (hide) {
            this.backButtonContainer.classList.add('hidden')
        } else {
            this.backButtonContainer.classList.remove('hidden')
        }
    }

    SetMainText(text) {
        this.mainText.textContent = text;
    }

    SetValidationText(text) {
        this.validationText.textContent = text;
    }

    /// States
    ShowNewGameScreen() {
        this.HideSuggestionButtonContainer(true);
        this.HideBackButtonContainer(true);
        this.SetMainText("3 Players Required to Play Clue");
        //this.forwardButton.SetEnabled(false);
        this.forwardButton.SetText('Start Game');
        this.forwardButton.onSelect = () => this.ShowStartingCardsScreen();
    }

    ShowStartingCardsScreen() {
        this.HideBackButtonContainer(false);
        this.SetMainText("Select starting cards");
        //this.forwardButton.SetEnabled(false);
        this.forwardButton.SetText('Confirm');
        this.backButton.SetText('Back');

    }

    ShowExtraCardsScreen() {
        this.HideBackButtonContainer(false);
        this.SetMainText("Select extra cards");
        //this.forwardButton.SetEnabled(false);
        this.forwardButton.SetText('Confirm');
    }

    ShowNewSuggestionScreen(history) {
        this.HideBackButtonContainer(false);
        this.HideSuggestionButtonContainer(false);
        this.SetMainText("New Suggestion");
        this.forwardButton.SetText('New Suggestion');
        if (history) {
            this.backButton.SetText('History');
        } else {
            this.backButton.SetText('Back');

        }
    }
}