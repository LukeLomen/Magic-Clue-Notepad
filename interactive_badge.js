/// A tiny corner badge shown in each player's row header, displaying how many cards are
/// currently known-have or hidden for that player (see GameManager's badge-updating code,
/// which recomputes this count each time the board is redrawn). Not interactive despite the
/// "Interactive" naming convention shared with the other components in this project - it's
/// just a small self-contained UI piece with its own pop animation on update.
export class InteractiveBadge {
    constructor({
        symbol = "",
        parent = document.body,
        id = null,
    }) {
        this.root = document.createElement("div");
        this.root.classList.add("interactive-badge");
        if (id) this.root.id = id;
        this.root._instance = this;

        this.symbol = document.createElement("span");
        this.symbol.className = "badge-symbol";
        this.symbol.textContent = symbol;

        this.root.appendChild(this.symbol);
        parent.appendChild(this.root);
    }

    /// Updates the displayed count/text and replays the "pop" animation (remove/reflow/add,
    /// the same restart trick used elsewhere in this project) so it's noticeable even if the
    /// value happens to change to something visually similar.
    UpdateBadge(value) {
        this.symbol.textContent = value;
        this.root.classList.remove('animate-badge');
        void this.root.offsetWidth;
        this.root.classList.add('animate-badge');
    }
}
