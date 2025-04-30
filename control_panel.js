import {
    InteractiveButton
} from './interactive_button.js';

class State{
    constructor({
        mainText = "",
        validationText = "",
        suggestionButtonContainerHidden = true,
        backButtonContainerHidden = true,
        forwardButtonText = "Next",
        backButtonText = "Back",
        forwardButtonFunction

    }){
        this.mainText = mainText;
        this.validationText = validationText;
        this.suggestionButtonContainerHidden = suggestionButtonContainerHidden;
        this.backButtonContainerHidden = backButtonContainerHidden;
        this.forwardButtonText = forwardButtonText;
        this.backButtonText = backButtonText;
        this.forwardButtonFunction = forwardButtonFunction;
    }
}

export class ControlPanel {
    constructor({
        OnPressStart,
        OnPressConfirmStarting,
        OnPressConfirmExtra,
        OnPressNewSuggestion,
        OnPressForward,
        OnPressNewGame,
        OnPressBack,
        OnPressSuggestionResponse,
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
            onPress: () => OnPressSuggestionResponse('suspect')
        });

        this.weaponButton = new InteractiveButton({
            text: "Weapon",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "weapon-button",
            onPress: () => OnPressSuggestionResponse('weapon')
        });

        this.roomButton = new InteractiveButton({
            text: "Room",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "room-button",
            onPress: () => OnPressSuggestionResponse('room')
        });

        this.unknownButton = new InteractiveButton({
            text: "Unknown",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "unknown-button",
            onPress: () => OnPressSuggestionResponse(possibleCard)
        });

        this.noneButton = new InteractiveButton({
            text: "None",
            parent: this.suggestionButtonContainer,
            type: "secondary",
            id: "none-button",
            onPress: () => OnPressSuggestionResponse(knownVoid)
        });

        /// States
        this.NEW_GAME = new State({
            mainText: "",
            forwardButtonText: "Start",
            forwardButtonFunction: () => OnPressStart(),
            backButtonContainerHidden: true
        });

        this.STARTING_CARDS = new State({
            mainText: "Select Starting Cards",
            forwardButtonText: "Confirm",
            backButtonText: "Back",
            backButtonContainerHidden: false,
            forwardButtonFunction: () => OnPressConfirmStarting()
        });

        this.EXTRA_CARDS = new State({
            mainText: "Select Extra Cards",
            forwardButtonText: "Confirm",
            backButtonText: "Back",
            backButtonContainerHidden: false,
            forwardButtonFunction: () => OnPressConfirmExtra()
        });

        this.NEW_SUGGESTION = new State({
            mainText: "New Suggestion",
            forwardButtonText: "Confirm",
            backButtonText: "Back",
            backButtonContainerHidden: false,
            //forwardButtonFunction: () => OnPressNewSuggestion()
            forwardButtonFunction: () => OnPressForward()
        });

        this.SUGGESTION = new State({
            suggestionButtonContainerHidden: false,

        });
    }

    ChangeState(state){
        this.SetMainText(state.mainText);
        this.SetValidationText(state.validationText);
        this.HideSuggestionButtonContainer(state.suggestionButtonContainerHidden);
        this.HideBackButtonContainer(state.backButtonContainerHidden);
        this.forwardButton.SetText(state.forwardButtonText);
        this.forwardButton.onPress = state.forwardButtonFunction;
        this.backButton.SetText(state.backButtonText);
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
}