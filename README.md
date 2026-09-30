# Magic Clue Notepad

This is not a game of Clue vs AI. Magic Clue Notepad is a digital replacement for the paper
notepad you'd normally scribble on while playing the board game Clue (Cluedo) with family or
friends&mdash;except it does all the bookkeeping and deduction for you. You just record what
happens on each turn; the notepad works out and fills in everything that can be deduced from
that, automatically, for every player.

It's a single self-contained web page (`index.html` + plain JavaScript/CSS, no build step, no
server, no account) meant to be opened locally and used at the table on a phone, tablet, or
laptop while everyone else plays with the physical board and cards.

## Setup

1. Open `index.html` in a browser.
2. Enter each player's name, in clockwise seating order around the table. The first slot
   defaults to "You" if left blank; only the first 3 are required, up to 6 are supported.
3. Tap **Start Game**.
4. Tap your own starting cards on the table (the app knows how many you should have based on
   player count) and confirm.
5. If the cards don't divide evenly among players, you'll also be asked to pick the leftover
   "extra" cards that were dealt face up rather than into anyone's hand.

## Playing a turn

1. Tap a row to choose which player is making a suggestion, then tap one suspect, one weapon,
   and one room column. The next player in the circle is automatically selected as the one
   being asked.
2. Tap the button matching how they responded:
   - The specific card name, if you can see which card they showed (e.g. you're the one being
     shown, or it's your own suggestion).
   - **Unknown**, if they showed someone else a card but you couldn't see which one.
   - **None**, if they have none of the three suggested cards.
3. A **None** response automatically moves the same suggestion on to the next player in the
   circle, repeating until someone responds or everyone's been asked.
4. Every other player's row updates automatically as the notepad works out what it can from
   each response&mdash;including chaining further deductions once a player's whole hand becomes
   known, or the hidden (envelope) card becomes identifiable by elimination.

## Table symbols

| Symbol | Meaning |
| :---: | --- |
| `X` | This player **has** this card |
| `/` | This player does **not** have this card |
| `?` | This player showed someone one of a few possible cards, not yet narrowed down to one |
| `\|` | An extra card, dealt face up rather than into anyone's hand |
| `$` | The hidden card&mdash;nobody's hand; it's the one in the envelope |

## Reviewing and fixing past turns

Someone at the table will eventually make a mistake&mdash;forgetting to show a card they should
have, misreading a response, or just fat-fingering the wrong button. The notepad is built
around this happening:

- The `‹` / `›` arrows step backward and forward through every past turn, showing the table
  exactly as it looked at that point in the game (not with hindsight from later turns).
- While viewing a past turn, pick a different response and press **Edit** to correct it.
  Everything that happened after that turn is automatically recomputed from scratch, so a fix
  ripples forward correctly rather than leaving stale deductions behind.
- If you just made a mistake picking the suggester/cards on the CURRENT, still-open turn, the
  corner menu's **Undo** removes it entirely so you can redo it from scratch, rather than
  editing it in place.

## The corner menu (☰)

Tap the menu icon in the table's top-left corner for:

- **New Game** &mdash; erases everything and starts over from player names.
- **Cards** &mdash; switches the suspect/weapon/room names between the classic set and a few
  real licensed Clue editions (Big Bang Theory, Golden Girls, Friends, etc.), or the 2016
  refresh with Dr. Orchid in place of Mrs. White.
- **Undo** &mdash; see above.
- **Manual Entry** &mdash; see below.
- **About** &mdash; the in-app version of this README, plus quick strategy tips.

## Manual Entry

Sometimes you already know a card is in a specific player's hand without it having come up in
a suggestion&mdash;you saw it get dealt, someone told you outside the flow of the game, or a
real accusation was made and confirmed. **Manual Entry** lets you record that directly: it
temporarily clears the table's selection, you tap the one player and the one card, and press
**Confirm**. The card is marked as known-have for that player and every deduction that follows
from it (e.g. every other player is void for that card) happens exactly as if it had come from
a real suggestion. Press **Back** instead to cancel without recording anything&mdash;either way,
whatever you had selected before opening Manual Entry is restored afterward. A manual entry can
be removed with **Undo** just like any other turn.

## Clue strategy

- Target the last player in the round&mdash;if everyone before them has "none," they're forced
  to reveal something (or confirm none of the three suggested cards exist outside the
  envelope).
- Focus on the category with the fewest known/extra cards, often rooms, since there are usually
  more of them and each newly-void one narrows things down faster.
- Avoid being predictable when suggesting. Narrowing down a category by suggesting one of your
  own cards, a known extra card, or the hidden card is a good way to test a category without
  giving away information&mdash;but reusing the same "bait" card every time lets sharp opponents
  catch on, especially once they've seen it in your hand.

## License

Made by Luke Lomen. &copy; 2026 Luke Lomen. You're free to use, share, and modify this
software, but not to sell it&mdash;or any modified version of it.
