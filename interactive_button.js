export class InteractiveButton {
    constructor({
        text = "",
        icon = "",
        type = "primary",
        parent = document.body,
        id = null,
        onSelect
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
        this.root._instance = this;

        this.iconEl = document.createElement("span");
        this.iconEl.className = "btn__icon";
        this.iconEl.textContent = icon;

        this.textEl = document.createElement("span");
        this.textEl.className = "btn__text";
        this.textEl.textContent = text;

        this.root.appendChild(this.iconEl);
        this.root.appendChild(this.textEl);
        parent.appendChild(this.root);

        this._ObserveResize();

        /*this.root.addEventListener('pointerenter', e => this._HandleMove(e));
        this.root.addEventListener('pointerup', e => this._HandleUp(e));
        this.root.addEventListener('pointerleave', e => this._HandleLeave(e));

        this.onSelect = onSelect;*/
    }

    _HandleMove(event) {
        this.SetHovered(true);
    }

    _HandleUp() {
        this.SetPressed(true);
        if (this.state.selected) {
            this.SetSelected(false);
        } else {
            this.SetSelected(true);
        }
    }

    _HandleLeave() {
        this.SetHovered(false);
    }

    SetSelected(selected) {
        this.state.selected = selected;
        this._ApplyStateClass("selected", selected);
        this.onSelect?.();
    }

    SetHovered(hovered) {
        this.state.hovered = hovered;
        this._ApplyStateClass("hovered", hovered);
    }

    SetPressed(pressed) {
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
    }

    SetEnabled(enabled) {
        this.state.enabled = enabled;
        this._ApplyStateClass("disabled", !enabled);
    }

    SetButtonDisplayNone(display) {
        this._ApplyStateClass("hidden", display);
    }

    SetTextDisplayNone(display) {
        this._ApplyStateClass("text-only", display);
    }

    SetIconDisplayNone(display) {
        this._ApplyStateClass("icon-only", display);
    }

    SetText(text) {
        this.textEl.textContent = text;
        this._CheckTextOverflow();
    }

    SetIcon(icon, animate = true) {
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

    GetState() {
        return {
            ...this.state
        };
    }

    _ApplyStateClass(stateKey, isActive) {
        const className = `btn--${stateKey}`;
        this.root.classList.toggle(className, isActive);
    }

    _ObserveResize() {
        const ro = new ResizeObserver(() => this._CheckTextOverflow());
        ro.observe(this.root);
    }

    _CheckTextOverflow() {
        const shouldHide = this.textEl.scrollWidth > this.root.clientWidth;
        this.root.classList.toggle("btn--icon-only", shouldHide);
    }
}