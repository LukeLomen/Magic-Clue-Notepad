import {
    GameManager
} from './clue.js';
let playerNames = ['You', 'ReallyLong PlayerName', 'Player 3', 'Player 4', 'Player 5'];
const gm = new GameManager();

gm.SetCardPreset('classic')
gm.CreatePlayers(playerNames);
gm.CreateGameTable();


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
gm.interactiveTable.FocusCol(16);


///////////////////////////////////////////////////////////

/// Prevent context menu on long press / right-click
document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
});
document.addEventListener('pointerdown', onPointerDown);
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);

/// Input handle
function onPointerDown(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    console.log(`pointer down on target: ${target.id}`)
    if (!target) return;
    if (target.id === `interactive-table-1`) {
        //interactiveTable.handlePointerDown(target);
    } else if (target.id == 'forward-button') {
        gm.IncreaseTurn();
    } else if (target.id == 'back-button') {
        gm.DecreaseTurn();
    }
}

function onPointerMove(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    if (target.id === `interactive-table-1`) {
        //gm.interactiveTable.handlePointerMove(target);
    } else {
        //interactiveTable.handlePointerLeave();
    }
}

function onPointerUp(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    if (target.id === `interactive-table-1`) {
        //interactiveTable.handlePointerUp();
    }
}