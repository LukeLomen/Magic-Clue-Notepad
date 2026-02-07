export class InteractiveButton {
    constructor({
        text = "",
        type = "primary",
        parent = document.body,
        id = null,
        onPress
    }) {
        this.state = {
            enabled: true,
            hovered: false,
            selected: false,
            pressed: false
        };
        this.onPress = onPress;
        this.root = document.createElement("button");
        this.root.classList.add("btn", `btn--${type}`);
        if (id) this.root.id = id;
        this.root._instance = this;

        this.textEl = document.createElement("span");
        this.textEl.className = "btn__text";
        this.textEl.textContent = text;

        this.root.appendChild(this.textEl);
        parent.appendChild(this.root);

        this.root.addEventListener('pointerenter', e => this._HandleMove(e));
        this.root.addEventListener('pointerleave', e => this._HandleLeave(e));
        this.root.addEventListener('pointerup', e => this._HandleSubmit(e));
        this.root.addEventListener('keydown', e => this._HandleSubmit(e));
    }

    /// Event handlers
    _HandleMove() {
        this.SetHovered(true);
    }

    _HandleLeave() {
        this.SetHovered(false);
    }

    _HandleSubmit(e) {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        this.SetPressed(true);
        if (this.state.selected) {
            this.SetSelected(false);
        } else {
            this.SetSelected(true);
        }
    }

    SetSelected(selected) {
        this.state.selected = selected;
        this._ApplyStateClass("selected", selected);
        this.SetHovered(false);
    }

    SetHovered(hovered) {
        if (!this.state.enabled) return;
        this.state.hovered = hovered;
        this._ApplyStateClass("hovered", hovered);
    }

    SetPressed(pressed) {
        if (!this.state.enabled) return;
        this.state.pressed = pressed;
        this._ApplyStateClass("pressed", pressed);
        if (pressed) {
            this.root.classList.add("btn--pressed");
            this.root.addEventListener("animationend", () =>
                this.root.classList.remove("btn--pressed"), {
                    once: true
                }
            );
        }
        this.onPress();
    }

    HideButton(hide) {
        if (hide) {
            this.root.classList.add("hidden")
        } else {
            this.root.classList.remove("hidden")
        }
    }

    SetEnabled(enabled) {
        this.state.enabled = enabled;
        this._ApplyStateClass("disabled", !enabled);
        this.SetSelected(false);
    }

    SetButtonDisplayNone(display) {
        this._ApplyStateClass("hidden", display);
    }

    SetTextDisplayNone(display) {
        this._ApplyStateClass("text-only", display);
    }

    SetText(text) {
        this.textEl.textContent = text;
    }

    GetState() {
        return {
            ...this.state
        };
    }

    _ApplyStateClass(stateKey, isActive) {
        const className = `btn--${stateKey}`;
        this.root.classList.toggle(className, isActive);
    }
}