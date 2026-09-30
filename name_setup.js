import {
    InteractiveButton
} from './interactive_button.js';

/// The very first screen: collecting player names (in clockwise seating order) before a game
/// starts. Up to 6 name inputs are pre-built in index.html; this class just wires them up,
/// enforces the 3-6 player minimum/maximum via the Start button's enabled state, and hands
/// the final name list back to GameManager through onStartGame.
export class NameSetup {
    constructor({
        onStartGame,
        onAbout
    }) {
        this.onStartGame = onStartGame;
        this.onAbout = onAbout;

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
            parent: document.getElementById('name-setup-lower'),
            type: "primary",
            id: "start-button",
            onPress: () => this.StartGame()
        });

        /// Opens the same #about-overlay popup as the corner menu's About item (see
        /// GameManager, which passes onAbout through to whatever opens that overlay) - always
        /// enabled, since there's nothing to validate before looking at the About screen.
        /// autoToggleSelect: false so it never sticks in the green "selected" look after being
        /// pressed (see InteractiveButton) - it's a one-shot action, not a toggle.
        this.AboutButton = new InteractiveButton({
            text: "About",
            parent: document.getElementById('name-setup-lower'),
            type: "secondary",
            id: "name-setup-about-button",
            onPress: () => this.onAbout(),
            autoToggleSelect: false
        });
        this.AboutButton.SetEnabled(true);

        this.DisableStartButton();
        this.ResetValues();

        this.container.addEventListener('input', this._HandleInput.bind(this));

        /// Enter in one name field jumps focus to the next, so a whole player list can be
        /// typed without reaching for the mouse; Enter on the last field focuses Start instead.
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

    /// Re-evaluates how many names are currently filled in on every keystroke (delegated via
    /// one 'input' listener on the container rather than one per field) and enables/disables
    /// Start accordingly - Clue needs at least 3 players.
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

    /// Returns just the filled-in names, in seat order, defaulting the very first slot to
    /// "You" if left blank (that field's placeholder says "optional" for exactly this reason).
    /// Blank optional slots (2 through 6) are simply skipped rather than becoming empty-named
    /// players.
    GetTextInputArray() {
        return this.inputs.map((input, index) =>
            input.value !== '' ? input.value : (index === 0 ? 'You' : '')
        ).filter(name => name !== '');
    }

    StartGame() {
        this.DisplayNameSetup(false);
        this.onStartGame();
    }

    /// Restores the form to its just-opened state: "You" in the first field, everything else
    /// blank. Called both on first load and by GameManager.NewGame() to fully reset the app.
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
