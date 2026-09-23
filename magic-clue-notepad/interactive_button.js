/// A small wrapper around a single <button> element that tracks its own visual state
/// (enabled/hovered/selected/pressed) as CSS classes (btn--disabled, btn--hovered, etc. -
/// see interactive_button.css) rather than leaving each caller to manage classList calls by
/// hand. Every clickable button in the app (menu items excluded - those are plain <button>s
/// wired directly in interactive_menu.js) is one of these.
export class InteractiveButton {
    constructor({
        text = "",
        type = "primary", /// CSS variant - see btn--primary/btn--secondary styling in interactive_button.css
        parent = document.body,
        id = null,
        onPress,
        /// When true (the default), a press toggles `selected` on its own - fine for buttons
        /// that behave like an on/off toggle (suggestion response buttons). The history back/
        /// forward buttons pass false because THEIR "selected" look is driven externally by
        /// SetHistoryButtonsHighlighted (control_panel.js) to mean "you're viewing a past
        /// turn", not "this arrow was just clicked".
        autoToggleSelect = true
    }) {
        this.state = {
            enabled: true,
            hovered: false,
            selected: false,
            pressed: false
        };
        this.onPress = onPress;
        this.autoToggleSelect = autoToggleSelect;
        this.root = document.createElement("button");
        this.root.classList.add("btn", `btn--${type}`);
        if (id) this.root.id = id;
        this.root._instance = this;

        this.textEl = document.createElement("span");
        this.textEl.className = "btn__text";
        this.textEl.textContent = text;

        this.root.appendChild(this.textEl);
        parent.appendChild(this.root);

        this.SetEnabled(false); /// buttons start disabled until the owning code opts them in

        let touchInside = false;
        this.root.addEventListener('pointerenter', e => this._HandleMove(e));
        this.root.addEventListener('pointerleave', e => this._HandleLeave(e));
        this.root.addEventListener('pointerup', e => this._HandleSubmit(e));
        this.root.addEventListener('keydown', e => this._HandleSubmit(e));
    }

    /// Event handlers

    /// NOTE (unused/dead code): not called from anywhere. This looks like a leftover from an
    /// earlier touch-drag handling approach (the class-level `touchInside` variable declared
    /// in the constructor above is similarly unused) that was superseded by the simpler
    /// pointerup-based _HandleSubmit below. Safe to delete unless touch-specific hit-testing
    /// is reintroduced later.
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

    /// Fires on pointerup (click) or Enter-while-focused. Ignores keydowns other than Enter,
    /// and ignores events that bubbled up from something other than the button itself.
    _HandleSubmit(e) {
        if (e.type === 'keydown' && e.key !== 'Enter') return;
        if (e.target != this.root) return;
        this.SetPressed(true);
        if (this.autoToggleSelect) {
            if (this.state.selected) {
                this.SetSelected(false);
            } else {
                this.SetSelected(true);
            }
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

    /// Also fires the actual onPress callback and plays the short ripple/press animation.
    /// Disabled buttons never reach onPress, since the top guard returns first.
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

    /// IMPORTANT ordering note: this always clears `selected` as a side effect. Any code that
    /// wants a button both enabled AND showing as selected/highlighted (e.g.
    /// ControlPanel.SetHistoryButtonsHighlighted) must call SetEnabled first and SetSelected
    /// after, in that order, or the highlight gets wiped right back off.
    SetEnabled(enabled) {
        this.state.enabled = enabled;
        this._ApplyStateClass("disabled", !enabled);
        this.SetSelected(false);
    }

    /// NOTE (unused/dead code): not called from anywhere in the current codebase. HideButton
    /// above (which toggles the shared `.hidden` utility class from index.css) appears to be
    /// what's actually used to hide buttons; this and its "text-only" btn--text-only styling
    /// look unreferenced elsewhere and are candidates for removal unless you have a use for
    /// them planned.
    SetButtonDisplayNone(display) {
        this._ApplyStateClass("hidden", display);
    }

    /// NOTE (unused/dead code): see SetButtonDisplayNone above - not called anywhere.
    SetTextDisplayNone(display) {
        this._ApplyStateClass("text-only", display);
    }

    SetText(text) {
        this.textEl.textContent = text;
    }

    /// Returns a shallow copy so callers can inspect state without being able to mutate it directly.
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
