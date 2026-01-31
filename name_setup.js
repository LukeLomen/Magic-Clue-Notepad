import {
    InteractiveButton
} from './interactive_button.js';

export class NameSetup {
    constructor({
        onStartGame
    }) {
        this.onStartGame = onStartGame;

        this.container = document.getElementById('name-setup');

        this.inputs = [
            this.input1 = document.getElementById('playerName0'),
            this.input2 = document.getElementById('playerName1'),
            this.input3 = document.getElementById('playerName2'),
            this.input4 = document.getElementById('playerName3'),
            this.input5 = document.getElementById('playerName4'),
            this.input6 = document.getElementById('playerName5')
        ];

        this.entries = 0;

        this.StartButton = new InteractiveButton({
            text: "Start Game",
            icon: "+",
            parent: document.getElementById('name-setup-lower'),
            type: "primary",
            id: "start-button",
            onPress: () => this.StartGame()
        });

        this.DisableStartButton();
        this.ResetValues();

        this.container.addEventListener('input', this._HandleInput.bind(this));

        this.inputs.forEach((input, index) => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const nextIndex = index + 1;
                    if (nextIndex < this.inputs.length) {
                        this.inputs[nextIndex].focus();
                    } else {
                        this.StartButton.root.focus();
                    }
                }
            });
        });
    }

    _HandleInput(event) {
        /// Sets the number of filled entries on change
        const target = event.target;
        if (!target) return;
        this.entries = this.GetTextInputArray().length;
        if (this.entries < 3) {
            this.DisableStartButton();
        } else {
            this.EnableStartButton()
        }
    }

    DisplayNameSetup(displayed) {
        if (displayed) {
            this.container.classList.remove('hidden');
        } else {
            this.container.classList.add('hidden');
        }
    }

    EnableStartButton() {
        this.StartButton.SetEnabled(true);
    }

    DisableStartButton() {
        this.StartButton.SetEnabled(false);
    }

    GetTextInputArray() {
        return this.inputs.map((input, index) =>
            input.value !== '' ? input.value : (index === 0 ? 'You' : '')
        ).filter(name => name !== '');
    }

    StartGame() {
        this.DisplayNameSetup(false);
        this.onStartGame();
    }

    ResetValues() {
        this.inputs.forEach((input, index) => {
            if (index == 0) {
                input.value = "You";
            } else {
                input.value = "";
            }
        });
    }
}