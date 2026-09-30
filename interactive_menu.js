/// The corner "hamburger" menu attached to the table's top-left cell, plus the three popup
/// confirmation dialogs it opens (New Game / Undo / About). This class only deals with
/// showing/hiding UI - it doesn't know anything about game state; GameManager passes in
/// onNewGame/onUndo/onSelectPreset callbacks and calls SetUndoAvailable to reflect whether
/// there's anything to undo.
export class InteractiveMenu {
    constructor({
        onNewGame,
        onUndo,
        onManualEntry,
        onSelectPreset,
        presets = []
    }) {
        this.onNewGame = onNewGame;
        this.onUndo = onUndo;
        this.onManualEntry = onManualEntry;
        this.onSelectPreset = onSelectPreset;

        this.panel = document.getElementById('table-menu-panel');
        this.newGameBtn = document.getElementById('menu-newgame-btn');
        this.undoBtn = document.getElementById('menu-undo-btn');
        this.manualBtn = document.getElementById('menu-manual-btn');
        this.aboutBtn = document.getElementById('menu-about-btn');
        this.donateBtn = document.getElementById('menu-donate-btn');
        this.presetSelect = document.getElementById('menu-preset-select');

        this.newGameOverlay = document.getElementById('newgame-overlay');
        this.newGameConfirmBtn = document.getElementById('newgame-confirm-button');
        this.newGameBackBtn = document.getElementById('newgame-back-button');

        this.undoOverlay = document.getElementById('undo-overlay');
        this.undoConfirmBtn = document.getElementById('undo-confirm-button');
        this.undoBackBtn = document.getElementById('undo-back-button');

        this.aboutOverlay = document.getElementById('about-overlay');
        this.aboutCloseBtn = document.getElementById('about-close-button');

        /// The URL to open lives on the overlay itself (data-donate-url in index.html) rather
        /// than hardcoded here, so updating the real donation link is a one-line HTML edit.
        this.donateOverlay = document.getElementById('donate-overlay');
        this.donateConfirmBtn = document.getElementById('donate-confirm-button');
        this.donateBackBtn = document.getElementById('donate-back-button');

        this.overlays = [this.newGameOverlay, this.undoOverlay, this.aboutOverlay, this.donateOverlay];
        this._openLockTimeout = null;

        this._BuildPresetOptions(presets);
        this._BindEvents();
    }

    /// Fills the card-preset <select> with one <option> per preset name from clue_cards.js's
    /// `presets` object (capitalized for display; the raw lowercase name is the option value
    /// cardsAPI.loadPreset expects).
    _BuildPresetOptions(presets) {
        this.presetSelect.innerHTML = '';
        presets.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name.charAt(0).toUpperCase() + name.slice(1);
            this.presetSelect.appendChild(option);
        });
    }

    /// Wires every menu item, popup button, and the two "dismiss" affordances (Escape key,
    /// clicking outside) exactly once - called only from the constructor.
    _BindEvents() {
        this.newGameBtn.addEventListener('click', () => {
            this.CloseMenu();
            this._ShowOverlay(this.newGameOverlay);
        });

        this.undoBtn.addEventListener('click', () => {
            if (this.undoBtn.disabled) return;
            this.CloseMenu();
            this._ShowOverlay(this.undoOverlay);
        });

        /// No confirmation popup here, unlike New Game/Undo - manual entry's own Confirm/Back
        /// flow (in the control panel) already serves that purpose, and it starts out with
        /// nothing selected, so there's nothing destructive about opening it.
        this.manualBtn.addEventListener('click', () => {
            if (this.manualBtn.disabled) return;
            this.CloseMenu();
            this.onManualEntry();
        });

        this.aboutBtn.addEventListener('click', () => {
            this.CloseMenu();
            this._ShowOverlay(this.aboutOverlay);
        });

        this.donateBtn.addEventListener('click', () => {
            this.CloseMenu();
            this._ShowOverlay(this.donateOverlay);
        });

        this.presetSelect.addEventListener('change', (e) => {
            this.onSelectPreset(e.target.value);
            this.CloseMenu();
        });

        this.newGameBackBtn.addEventListener('click', () => this._HideOverlay(this.newGameOverlay));
        this.newGameConfirmBtn.addEventListener('click', () => {
            this._HideOverlay(this.newGameOverlay);
            this.onNewGame();
        });

        this.undoBackBtn.addEventListener('click', () => this._HideOverlay(this.undoOverlay));
        this.undoConfirmBtn.addEventListener('click', () => {
            this._HideOverlay(this.undoOverlay);
            this.onUndo();
        });

        this.aboutCloseBtn.addEventListener('click', () => this._HideOverlay(this.aboutOverlay));

        this.donateBackBtn.addEventListener('click', () => this._HideOverlay(this.donateOverlay));
        /// window.open with 'noopener' so the new tab can't reach back into this page, and the
        /// return value is checked in case a popup blocker silently refused it - the overlay
        /// stays open either way so the person can Back out or try again.
        this.donateConfirmBtn.addEventListener('click', () => {
            const url = this.donateOverlay.dataset.donateUrl;
            const opened = window.open(url, '_blank', 'noopener');
            if (opened) this._HideOverlay(this.donateOverlay);
        });

        /// Clicking the dimmed backdrop (not the popup content itself) dismisses a popup.
        this.overlays.forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this._HideOverlay(overlay);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!this.panel.classList.contains('hidden')) this.CloseMenu();
            this.overlays.forEach(overlay => {
                if (!overlay.classList.contains('hidden')) this._HideOverlay(overlay);
            });
        });

        /// Close the menu on an outside click, but let the corner cell's own click toggle it
        document.addEventListener('pointerdown', (e) => {
            if (this.panel.classList.contains('hidden')) return;
            if (this.panel.contains(e.target)) return;
            if (e.target.closest('[data-row="0"][data-col="0"]')) return;
            this.CloseMenu();
        });
    }

    /// Resets scroll position before showing - matters most for the About overlay, which is
    /// tall enough to scroll: without this, reopening it after having scrolled down last time
    /// (or Undo/New Game briefly stealing focus) would show it partway down instead of at top.
    _ShowOverlay(overlay) {
        overlay.classList.remove('hidden');
        const content = overlay.querySelector('.popup-content');
        if (content) content.scrollTop = 0;
    }

    _HideOverlay(overlay) {
        overlay.classList.add('hidden');
    }

    ToggleMenu() {
        if (this.panel.classList.contains('hidden')) {
            this.OpenMenu();
        } else {
            this.CloseMenu();
        }
    }

    /// Briefly blocks clicks on the menu items while it animates in. Without this, the same
    /// pointer-up that opens the menu can land on whichever item ends up under the pointer
    /// and fire it immediately.
    /// Sequence: unhide -> add menu-locked (pointer-events: none via CSS) -> force a reflow so
    /// the browser commits that state -> add menu-visible (triggers the fade/scale-in CSS
    /// transition) -> after 180ms (long enough for the opening pointer-up to have already
    /// finished), remove menu-locked so items become clickable again.
    OpenMenu() {
        clearTimeout(this._openLockTimeout);
        this.panel.classList.remove('hidden');
        this.panel.classList.add('menu-locked');
        void this.panel.offsetWidth; /// force reflow so the entrance transition actually plays
        this.panel.classList.add('menu-visible');
        this._openLockTimeout = setTimeout(() => {
            this.panel.classList.remove('menu-locked');
        }, 180);
    }

    CloseMenu() {
        clearTimeout(this._openLockTimeout);
        this.panel.classList.add('hidden');
        this.panel.classList.remove('menu-locked', 'menu-visible');
    }

    /// Opens the About popup directly, without going through the corner menu - used by the
    /// name-setup (player names) screen's own About button, which shows the exact same overlay.
    ShowAbout() {
        this._ShowOverlay(this.aboutOverlay);
    }

    /// Enables/disables the Undo menu item (and its dimmed styling) - GameManager calls this
    /// whenever the suggestion history changes, since there's nothing to undo before the first
    /// suggestion is confirmed, or right after a NewGame reset.
    SetUndoAvailable(available) {
        this.undoBtn.disabled = !available;
        this.undoBtn.classList.toggle('menu-item-disabled', !available);
    }

    /// Sets which option the card-preset <select> shows as chosen, without firing its
    /// 'change' handler (and therefore without re-loading the preset) - used by GameManager to
    /// keep the dropdown in sync when it resets the preset itself (e.g. back to "default" on
    /// New Game), as opposed to the person picking a preset from the menu.
    SetPresetSelection(name) {
        this.presetSelect.value = name;
    }

    /// Enables/disables the Manual Entry menu item - GameManager only allows opening it while
    /// actively viewing the live (not historical) suggestion screen, since manual entry snapshots
    /// and restores that screen's selection state.
    SetManualEntryAvailable(available) {
        this.manualBtn.disabled = !available;
        this.manualBtn.classList.toggle('menu-item-disabled', !available);
    }
}
