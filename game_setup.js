import {
    InteractiveButton
} from './interactive_button.js';

export class GameSetup {
    constructor({
        onStartGame
    }) {
        this.container = document.getElementById('game-setup');
        this.container.addEventListener('input', this._HandleInput.bind(this));

        this.input1 = document.getElementById('playerName0');
        this.input2 = document.getElementById('playerName1');
        this.input3 = document.getElementById('playerName2');
        this.input4 = document.getElementById('playerName3');
        this.input5 = document.getElementById('playerName4');
        this.input6 = document.getElementById('playerName5');

        this.entries = 0;

        this.resetButton = new InteractiveButton({
            text: "Reset",
            icon: "x",
            parent: this.container,
            type: "secondary",
            id: "clear-button",
            onPress: () => this.ResetValues()
        });

        this.StartButton = new InteractiveButton({
            text: "Start Game",
            icon: "+",
            parent: this.container,
            type: "primary",
            id: "start-button",
            onPress: () => this.StartGame()
        });

        this.onStartGame = onStartGame;

        this.ResetValues();
    }

    _HandleInput(event) {
        /// Sets the number of filled entries on change
        const target = event.target;
        if (!target) return;
        this.entries = this.GetTextInputArray().length;
    }

    GetTextInputArray() {
        const returnArray = new Array();
        const inputArray = [this.input1.value, this.input2.value, this.input3.value, this.input4.value, this.input5.value, this.input6.value];
        inputArray.forEach((value, index) => {
            if (value != '') {
                returnArray.push(value);
            } else {
                if (index == 0) {
                    returnArray.push('You');
                }
            }
        })
        return returnArray
    }

    HideGameSetup(hide) {
        if (hide) {
            this.container.classList.add('hidden');
        } else {
            this.container.classList.remove('hidden');
        }
    }

    ResetValues(){
        this.input1.value = "You";
        this.input2.value = "";
        this.input3.value = "";
        this.input4.value = "";
        this.input5.value = "";
        this.input6.value = "";
    }

    StartGame(){
        this.onStartGame()
    }
}