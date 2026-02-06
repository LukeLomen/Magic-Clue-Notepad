import {
    SYMBOLS
} from './table_symbols.js';
import {
    GameManager
} from "./game_manager.js";

const gm = new GameManager();

////////////////////////////////////////////////////////DEBUG

function DisplayTurn(turn) {
    gm.DisplayTurn(turn);
}

/// Allows user to display turn from the browser console
window.DisplayTurn = DisplayTurn;

//DebugGame0();
//DebugGameA();
DebugGameB();
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

    gm.dm.AddSuggestion([4, 6, 12], 0, 1, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([4, 6, 12], 0, 2, 4);
    gm.dm.AddSuggestion([5, 7, 13], 1, 2, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([1, 6, 20], 1, 3, SYMBOLS.possibleCard);
    gm.dm.AddSuggestion([5, 7, 14], 2, 2, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([4, 9, 18], 1, 4, SYMBOLS.possibleCard);
    gm.dm.AddSuggestion([4, 10, 19], 2, 4, SYMBOLS.knownVoid);


    gm.dm.AddSuggestion([0, 7, 16], 0, 1, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([0, 7, 16], 0, 2, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([0, 7, 16], 0, 3, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([0, 7, 16], 0, 4, SYMBOLS.knownVoid);
    gm.dm.AddSuggestion([0, 7, 16], 0, 5, SYMBOLS.knownVoid);


    gm.DisplayTurn(100);


}