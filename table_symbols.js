/// The full set of "what do we know about this card, for this player" states that can appear
/// in a single table cell. Every other file imports these instead of hard-coding the raw
/// characters, so the meaning of a symbol only has to be defined in one place.
///
/// - unknown:      nothing recorded yet (empty cell)
/// - knownHave:    this player is confirmed to hold this exact card ('X')
/// - possibleCard: this player showed ONE of a small set of cards but we don't know which
///                 ('?' - narrowed down by process of elimination as other possibilities are ruled out)
/// - knownVoid:    this player has been proven NOT to hold this card ('/')
/// - hiddenCard:   nobody's hand - the card is in the confidential envelope, or it's one of the
///                 "extra" cards dealt face-down and not held by any player ('$')
/// - extraCard:    marks a card as one of the known face-down extra cards for this game ('|')
export const SYMBOLS = {
    unknown: '',
    knownHave: 'X',
    possibleCard: '?',
    knownVoid: '/',
    hiddenCard: '$',
    extraCard: '|'
}
