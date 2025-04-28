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

DebugGame0();
//DebugGameA();
//DebugGameB();
//DebugGameC();

function DebugGame0() {
    gm.StartGame(['You', 'p2', 'p3']);
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



    //gm.interactiveTable.FocusCol(16);
    /*
    gameTable.HideRow(6, true);
    gameTable.HideRow(5, true);*/
    //gameTable.HideTable(true);
}

function DebugGameC() {
    gm.SetCardPreset('classic');
    gm.StartGame(['DEBUG C', 'Knob Gobbler 5000', 'Mothalicka', 'Pants-Way', 'Crumbum']);
    gm.SetStartingCards([0, 1, 2]);
    gm.SetExtraCards([20, 19, 18]);

    gm.AddSuggestion([4, 6, 12], 0, 2, 12);
    gm.AddSuggestion([1, 8, 20], 1, 2, possibleCard);
    gm.AddSuggestion([0, 8, 13], 0, 2, possibleCard);
    gm.AddSuggestion([3, 8, 20], 0, 3, 8);
    gm.AddSuggestion([5, 11, 15], 0, 1, knownVoid);
    gm.AddSuggestion([4, 11, 15], 0, 4, knownVoid);
    gm.AddSuggestion([4, 11, 16], 0, 4, knownVoid);
    gm.AddSuggestion([4, 11, 18], 3, 2, knownVoid);

    gm.DisplayTurn(100);

}