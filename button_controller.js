export class ButtonController {
    constructor({
        text = "",
        icon = "",
        parent = document.body,
        type = "primary",
        id
    }) {
        this.state = {
            enabled: true,
            hovered: false,
            selected: false,
            pressed: false
        };

        this.root = document.createElement("button");
        this.root.classList.add("btn", `btn--${type}`);
        if (id) this.root.id = id;

        this.iconEl = document.createElement("span");
        this.iconEl.className = "btn__icon";
        this.iconEl.textContent = icon;

        this.textEl = document.createElement("span");
        this.textEl.className = "btn__text";
        this.textEl.textContent = text;

        this.root.appendChild(this.iconEl);
        this.root.appendChild(this.textEl);
        parent.appendChild(this.root);

        this._observeResize();
    }

    setText(text) {
        this.textEl.textContent = text;
        this._checkTextOverflow();
    }

    setIcon(icon, animate = true) {
        if (animate) {
            this.iconEl.style.opacity = 0;
            setTimeout(() => {
                this.iconEl.textContent = icon;
                this.iconEl.style.opacity = 1;
            }, 100); // smooth fade
        } else {
            this.iconEl.textContent = icon;
        }
    }

    setSelected(selected) {
        this.state.selected = selected;
        this._applyStateClass("selected", selected);
    }

    setHovered(hovered) {
        this.state.hovered = hovered;
        this._applyStateClass("hovered", hovered);
    }

    setPressed(pressed) {
        this.state.pressed = pressed;
        this._applyStateClass("pressed", pressed);
        if (pressed) {
            this.root.classList.add("btn--pressed");
            this.root.addEventListener("animationend", () =>
                this.root.classList.remove("btn--pressed"), {
                    once: true
                }
            );
        }
    }

    setEnabled(enabled) {
        this.state.enabled = enabled;
        this._applyStateClass("disabled", !enabled);
    }

    setButtonDisplayNone(display) {
        this._applyStateClass("hidden", display);
    }

    setTextDisplayNone(display) {
        this._applyStateClass("text-only", display);
    }

    setIconDisplayNone(display) {
        this._applyStateClass("icon-only", display);
    }


    getState() {
        return {
            ...this.state
        };
    }

    _applyStateClass(stateKey, isActive) {
        const className = `btn--${stateKey}`;
        this.root.classList.toggle(className, isActive);
    }

    _observeResize() {
        const ro = new ResizeObserver(() => this._checkTextOverflow());
        ro.observe(this.root);
    }

    _checkTextOverflow() {
        const shouldHide = this.textEl.scrollWidth > this.root.clientWidth;
        this.root.classList.toggle("btn--icon-only", shouldHide);
    }
}