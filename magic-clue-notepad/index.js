import {
    GameManager
} from "./game_manager.js";

/// The whole app boots from this one line - everything else is wired up inside GameManager's
/// constructor, which in turn constructs every other component (table, control panel, menu,
/// name setup, data manager).
const gm = new GameManager();

////////////////////////////////////////////////////////DEBUG
/// Exposes GameManager.DisplayTurn on `window` so a specific turn's board state can be
/// inspected from the browser devtools console while debugging (e.g. `DisplayTurn(2)`),
/// without needing to click through the history back/forward buttons.
function DisplayTurn(turn) {
    gm.DisplayTurn(turn);
}
window.DisplayTurn = DisplayTurn;

//DebugGame0();
//DebugGameA();
//DebugGameB();
//DebugGameC();

/// NOTE (unused/outdated - candidates for removal): DebugGame0/A/B/C below are canned
/// game setups (fixed player names + starting/extra cards) for quickly getting into a
/// mid-game state without manually typing names and clicking cards every time, while working
/// on this file. None of them are currently invoked (all four calls above are commented out),
/// and calling one would need to happen before the name-setup screen is used normally, since
/// they call gm.StartGame directly. Keep them if they're still useful during development,
/// otherwise safe to delete along with the DisplayTurn/window.DisplayTurn debug hook above.
function DebugGame0() {
    gm.StartGame(['You', 'Tim', 'Dallas', 'Andrew']);
}

function DebugGameA() {
    gm.SetCardPreset('default');
    gm.StartGame(['You', 'ReallyLongName', 'Durf McDurfface', 'Jesus Christ', 'Your Mom', 'Billy']);
    gm.SetStartingCards([1, 8, 20]);
}

function DebugGameB() {
    gm.SetCardPreset('2016');
    gm.StartGame(['DEBUG B', 'ReallyLong PlayerName', 'Durf McDurfface', 'Asshat McGee']);
    gm.SetStartingCards([5, 6, 9, 13]);
    gm.SetExtraCards([0, 3]);
}

function DebugGameC() {
    gm.SetCardPreset('classic');
    gm.StartGame(['DEBUG C', 'Nancy', 'Sarah', 'John', 'Samwise', 'JimBob']);
    gm.SetStartingCards([0, 1, 7]);
}
