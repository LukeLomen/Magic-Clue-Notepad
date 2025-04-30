import {
    SYMBOLS
} from './table_symbols.js';
import {
    InteractiveButton
} from './interactive_button.js';
import {
    GameManager
} from "./game_manager.js";

const gm = new GameManager();

/// Input handle
document.addEventListener('contextmenu', (event) => {
    /// Prevent context menu on long press / right-click
    event.preventDefault();
});
document.addEventListener('pointerdown', onPointerDown);
document.addEventListener('pointermove', onPointerMove);
document.addEventListener('pointerup', onPointerUp);

let hoveredElement = null;

function SetHoverState(target, hover) {
    if (target._instance instanceof InteractiveButton) {
        const button = target._instance;
        button.SetHovered(hover);
    } else if (target.tagName === 'TD' || target.tagName === 'TH') {
        if (hover) {
            gm.interactiveTable.FocusTarget(target);
        } else {
            gm.interactiveTable.ClearFocus();
        }
    }
}

/// Hover
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

/// Press
function onPointerUp(event) {
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    SetHoverState(hoveredElement, false);
    if (hoveredElement._instance instanceof InteractiveButton) {
        const button = hoveredElement._instance;
        button.SetPressed(true);
    } else if (hoveredElement.tagName === 'TD' || hoveredElement.tagName === 'TH') {
        gm.interactiveTable.ToggleTarget(hoveredElement);
    }
}

////////////////////////////////////////////////////////DEBUG

function DisplayTurn(turn) {
    gm.DisplayTurn(turn);
}
window.DisplayTurn = DisplayTurn;

//DebugGame0();
//DebugGameA();
//DebugGameB();
DebugGameC();

function DebugGame0() {
    gm.StartGame(['You', 'Tim', 'Dallas', 'Andrew']);
}

function DebugGameA() {
    gm.SetCardPreset('simpsons');
    gm.StartGame(['DEBUG A', 'ReallyLong PlayerName', 'Durf McDurfface']);
    gm.SetStartingCards([1, 14, 19, 20, 2, 3]);
}

function DebugGameB() {
    gm.SetCardPreset('2016');
    gm.StartGame(['DEBUG B', 'ReallyLong PlayerName', 'Durf McDurfface', 'Asshat McGee']);
    gm.SetStartingCards([5, 6, 9, 13]);
    gm.SetExtraCards([0, 3]);
}

function DebugGameC() {
    gm.SetCardPreset('classic');
    gm.StartGame(['DEBUG C', 'KnobGobbler5000', 'Sarah', 'John', 'Samwise']);
    gm.SetStartingCards([0, 1, 7]);
    gm.SetExtraCards([20, 19, 18]);
    //gm.SetExtraCards([2, 3, 4]);

    gm.dm.AddSuggestion([4, 6, 12], 0, 1, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([4, 6, 12], 0, 2, 4);
    gm.dm.AddSuggestion([5, 7, 13], 1, 2, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([1, 6, 20], 1, 3, SYMBOLS.possibleCard);
    gm.dm.AddSuggestion([5, 7, 14], 2, 2, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([4, 9, 18], 1, 4, SYMBOLS.possibleCard);
    gm.dm.AddSuggestion([4, 9, 19], 2, 4, SYMBOLS.knownVoid);

    gm.DisplayTurn(100);

}