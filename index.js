import {
    CreateInteractiveTable,
    InteractiveTable
} from './interactive_table.js';
import {
    InteractiveButton as InteractiveButton
} from './interactive_button.js'
import {
    GameManager
} from './clue.js';


/// Prevent context menu on long press / right-click
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});




let playerNames = ['You', 'ReallyLong PlayerName', 'Durf McDurfface', 'Player 4', 'Player 5', 'Asshat McGee'];
//let playerNames = ['You', 'ReallyLong PlayerName', 'Durf McDurfface'];
//let playerNames = ['You'];



/*const gameTable = CreateInteractiveTable(
    document.getElementById('interactive-table-container'),
    'interactive-table-1',
    21,
    6,
    (colIndex) => {
        console.log("column selected: ", colIndex);
    });*/

const gameTable = new InteractiveTable({
    container: document.getElementById('interactive-table-container'),
    id: 'interactive-table-1',
    rowCount: 6,
    colCount: 21,
})


const gm = new GameManager(gameTable);

gm.SetCardPreset('classic');
gm.WriteCardNamesToTable();
gm.CreatePlayers(playerNames);
gm.WritePlayerNamesToTable();


const fBtn = new InteractiveButton({
    text: "Next",
    icon: "→",
    parent: document.getElementById('forward-button-container'),
    type: "primary",
    id: "forward-button",
    //onSelect: () => gm.IncreaseTurn()
});

const bBtn = new InteractiveButton({
    text: "Back",
    icon: "<",
    parent: document.getElementById('back-button-container'),
    type: "primary",
    id: "back-button",
    //onSelect: () => gm.DecreaseTurn()
});

const suspectButton = new InteractiveButton({
    text: "Suspect",
    parent: document.getElementById('suggestion-buttons-container'),
    type: "secondary",
    id: "suspect-button"
})

const weapontButton = new InteractiveButton({
    text: "Weapon",
    parent: document.getElementById('suggestion-buttons-container'),
    type: "secondary",
    id: "weapon-button"
})

const roomButton = new InteractiveButton({
    text: "Room",
    parent: document.getElementById('suggestion-buttons-container'),
    type: "secondary",
    id: "room-button"
})

const unknownButton = new InteractiveButton({
    text: "Unknown",
    parent: document.getElementById('suggestion-buttons-container'),
    type: "secondary",
    id: "unknown-button"
})

const noneButton = new InteractiveButton({
    text: "None",
    parent: document.getElementById('suggestion-buttons-container'),
    type: "secondary",
    id: "none-button"
})



unknownButton.SetButtonDisplayNone(true);
//fBtn.SetSelected(true);
bBtn.SetEnabled(false);



gm.AddStartingCards([1, 14, 19]);
gm.AddExtraCards([0, 3, 2]);

gm.AddSuggestion([1, 6, 12], 0, 1, knownVoid);
gm.AddSuggestion([1, 6, 12], 0, 2, 12);
gm.AddSuggestion([1, 8, 20], 1, 2, possibleCard);
gm.AddSuggestion([0, 8, 13], 0, 2, possibleCard);
gm.AddSuggestion([3, 8, 20], 0, 3, 8);
gm.AddSuggestion([4, 11, 15], 0, 1, knownVoid);
gm.AddSuggestion([4, 11, 15], 0, 3, knownVoid);
gm.AddSuggestion([4, 11, 16], 0, 4, knownVoid);
gm.AddSuggestion([4, 11, 18], 3, 2, knownVoid);

gm.DisplayTurn(100);
//gm.interactiveTable.FocusCol(16);

//gameTable.HideRows(6, 6, true);
//gameTable.HideTable(true);

///////////////////////////////////////////////////////////

let hoveredElement = null;

document.addEventListener('pointerdown', onPointerDown, {
    passive: false
});
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);


/// Input handle
function onPointerDown(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    hoveredElement = target;
    SetHoverState(hoveredElement, true);
}

function onPointerMove(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    if (hoveredElement && target != hoveredElement) {
        SetHoverState(hoveredElement, false);
    }
    hoveredElement = target;
    SetHoverState(hoveredElement, true);
}

function onPointerUp(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    console.log(hoveredElement);
    SetHoverState(hoveredElement, false);
    if (hoveredElement._instance instanceof InteractiveButton) {
        const button = hoveredElement._instance;
        button.SetPressed(true);
    } else if (target.tagName === 'TD' || target.tagName === 'TH') {
        gameTable.SelectTarget(target);
    }
}

function SetHoverState(target, hover) {
    if (target._instance instanceof InteractiveButton) {
        const button = target._instance;
        button.SetHovered(hover);
    } else if (target.tagName === 'TD' || target.tagName === 'TH') {
        if (hover) {
            gameTable.FocusTarget(target);
        } else {
            gameTable.ClearFocus();
        }
    }
}










function ForwardButton() {
    if (gm.currentState == 0) {
        /// New Game
        if (playerNames.length < 3) {
            /// Not enough players
        } else {
            /// Start new game
            gm.CreatePlayers(playerNames);

        }
    } else if (gm.currentState == 1) {
        /// Set Starting Cards
    } else if (gm.currentState == 2) {
        /// Set Extra Cards
    } else if (gm.currentState == 3) {
        /// New Suggestion
    } else if (gm.currentState == 4) {
        /// Suggestion
    }
}