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

        let touchInside = false;
        this.root.addEventListener('pointerenter', e => this._HandleMove(e));
        this.root.addEventListener('pointerleave', e => this._HandleLeave(e));
        this.root.addEventListener('pointerup', e => this._HandleSubmit(e));
        this.root.addEventListener('keydown', e => this._HandleSubmit(e));

        //Buttons not tracking touch movement to deselect or select when touch moves into button area
        
        //************** */ Trying to get buttons to work with touch so that they stop hover when touch leaves button and they only get pressed with touch up on the specific button*/

        /*document.addEventListener('touchmove', (event) => {
            const touch = event.touches[0];
            if (touchInside && !this._IsTouchInside(this.root, touch)) {
                touchInside = false;
                this.SetHovered(false);
            } else if (!touchInside && this._IsTouchInside(this.root, touch)) {
                touchInside = true;
                this.SetHovered(true);
            }
        });

        this.root.addEventListener('touchend', (event) => {
            if (touchInside) {
                if (this.state.selected) {
                    this.SetSelected(false);
                } else {
                    this.SetSelected(true);
                }
                this.SetPressed(true);
            }
            touchInside = false; // Reset state
        });*/
    }

    /// Event handlers
    _IsTouchInside(button, touch) {
        const rect = button.getBoundingClientRect();
        return touch.clientX >= rect.left &&
            touch.clientX <= rect.right &&
            touch.clientY >= rect.top &&
            touch.clientY <= rect.bottom;
    }

    _HandleMove() {
        this.SetHovered(true);
    }

    _HandleLeave() {
        this.SetHovered(false);
    }

    _HandleSubmit(e) {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        if (e.target != this.root) return;
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