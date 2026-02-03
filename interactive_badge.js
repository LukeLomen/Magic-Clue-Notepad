export class InteractiveBadge {
    constructor({
        symbol = "",
        parent = document.body,
        id = null,
    }) {
        this.root = document.createElement("button");
        this.root.classList.add("interactive-badge");
        if (id) this.root.id = id;
        this.root._instance = this;

        this.symbol = document.createElement("span");
        this.symbol.className = "badge_symbol";
        this.symbol.textContent = symbol;

        this.root.appendChild(this.symbol);
        parent.appendChild(this.root);
    }
}