import {
    GameManager
} from "./game_manager.js";

const gm = new GameManager();

////////////////////////////////////////////////////////DEBUG
function DisplayTurn(turn) {
    gm.DisplayTurn(turn);
}
window.DisplayTurn = DisplayTurn;

//DebugGame0();
//DebugGameA();
//DebugGameB();
//DebugGameC();

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