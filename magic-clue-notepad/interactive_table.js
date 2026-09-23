import {
  InteractiveBadge
} from './interactive_badge.js';

/// Builds and manages the whole deduction grid as a raw HTML <table>. Rows are players
/// (plus the header row), columns are cards (plus the row-header column at col 0), and every
/// cell carries data-row/data-col attributes so a single set of pointer listeners can figure
/// out which cell any given pointer event landed on - there's no per-cell listener.
///
/// Selection works like "click-and-drag paint": pointerdown starts a drag, pointermove while
/// the pointer is down keeps updating which cell is focused/highlighted, and pointerup on a
/// cell actually toggles it and fires the OnToggleCol/OnToggleRow callbacks GameManager uses
/// to react to the change. The corner cell (row 0, col 0) is special-cased as the menu button.
export class InteractiveTable {
  constructor({
    container = document.body,
    id = null,
    colCount = 0,
    rowCount = 0,
    catetoryStarts = new Set(), /// column indexes where a new card category (suspects/weapons/rooms) begins, for the dashed divider line
    OnToggleCol,
    OnToggleRow,
    OnToggleMenu
  }) {
    /// Constructor Functions
    this.OnToggleCol = OnToggleCol;
    this.OnToggleRow = OnToggleRow;
    this.OnToggleMenu = OnToggleMenu;
    /// Table Selection Modes - whether clicking a column/row header is currently allowed to
    /// select it at all (see EnableColSelectMode/EnableRowSelectMode, toggled by GameManager
    /// depending on what step of the game you're in).
    this.colTargetActive = false;
    this.rowTargetActive = false;
    this.menuTargetActive = false;
    /// When true, selecting a column in the same card category as an already-selected column
    /// replaces it instead of adding to the selection (used while picking suggestion cards,
    /// where you can only suggest one suspect/weapon/room at a time).
    this.categorySelectionMode = false;
    /// When true, selecting ANY column replaces the entire column selection, regardless of
    /// category - used for manual card entry, which only ever wants a single card chosen
    /// total (not one-per-category like a suggestion). Takes priority over categorySelectionMode
    /// when both happen to be true (see ToggleCol).
    this.exclusiveColSelectionMode = false;
    /// Builder Variables
    this.colTotal = colCount + 1; /// +1 for the row-header column
    this.rowCount = rowCount;
    /// Lookup - flat arrays indexed by (row * colTotal + col), built once in _CreateTable and
    /// never resized, so every other method can address a cell/span by row+col in O(1).
    this.cellArray = [];
    this.spanArray = [];
    this.catetoryStarts = catetoryStarts;
    this.colCatetoryMap = new Map(); /// column index -> which category number it belongs to
    this.badgeArray = [];
    /// Selection - the currently-selected columns/rows (col 0 = corner, not included here).
    this.selectedColumns = new Set();
    this.selectedRows = new Set();
    this.selected2Rows = new Set(); /// the "second" highlighted row (the suggestee), shown with a different style than a plain selected row
    this.focus = null; /// the col/row/menu currently under the pointer during a drag, or null
    this.hiddenRows = new Set();
    /// Html Construction
    this.container = container;
    this.table = document.createElement('table');
    if (id) this.table.id = id;
    this.container.appendChild(this.table);
    this.table.innerHTML = "";
    this._CreateTable();
    this._ResizeTopRow();
    /// Event listeners - the global ones just track whether the pointer is currently held down
    /// (needed because pointermove/pointerleave on the table itself doesn't know that on its
    /// own); the table-scoped ones do the actual cell targeting.
    this.pointerIsDown = false;
    document.addEventListener('pointerdown', this._onGlobalPointerDown.bind(this));
    document.addEventListener('pointerup', this._onGlobalPointerUp.bind(this));
    document.addEventListener('pointercancel', this._onGlobalPointerUp.bind(this));
    this.table.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.table.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.table.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.table.addEventListener('pointerleave', this._onPointerLeave.bind(this));
  }

  /// Event handlers
  _onGlobalPointerDown(e) {
    this.pointerIsDown = true;
  }

  _onGlobalPointerUp(e) {
    this.pointerIsDown = false;
  }

  _onPointerDown(e) {
    const target = this._GetTableCellFromEvent(e);
    if (!target) return;
    this.FocusTarget(target);
  }

  _onPointerMove(e) {
    if (!this.pointerIsDown) return;
    const target = this._GetTableCellFromEvent(e);
    if (!target) return;
    this.FocusTarget(target);
  }

  /// Only a pointerup that started with a pointerdown (pointerIsDown) actually toggles the
  /// cell - this is what turns a drag into "select whatever you released on", matching how
  /// the drag-to-select mechanic is meant to feel (you can drag across several cells while
  /// only focus-highlighting them, and only the one you let go on gets selected).
  _onPointerUp(e) {
    if (!this.pointerIsDown) return;
    const target = this._GetTableCellFromEvent(e);
    if (target) {
      this.ToggleTarget(target);
    }
    this.ClearFocus();
  }

  _onPointerLeave(e) {
    if (this.pointerIsDown) {
      this.ClearFocus();
    }
  }

  /// Pointer events don't tell you which element is "under" them directly (the event target
  /// is wherever the drag started), so this uses elementFromPoint at the current coordinates
  /// instead, then walks up to the nearest td/th in case the point landed on a child (a span
  /// or badge) rather than the cell itself.
  _GetTableCellFromEvent(e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return null;
    if (el.tagName === 'TD' || el.tagName === 'TH') {
      return el;
    }
    return el.closest('td, th'); /// Fallback if clicking on child elements inside cell
  }

  /// Table Creation
  /// Builds the header row (col 0 = corner menu cell, cols 1+ = card name headers) and the
  /// body rows (one per player, col 0 = row-header/name cell with its InteractiveBadge, cols
  /// 1+ = the actual deduction cells). Runs once in the constructor - the table's row/column
  /// count is fixed for the lifetime of this instance.
  _CreateTable() {
    let currentCategory = -1;
    /// Build table header (the first row)
    const thead = this.table.createTHead();
    const headerRow = thead.insertRow();
    for (let c = 0; c < this.colTotal; c++) {
      const th = document.createElement('th');
      if (c == 0) { /// Top-left cell
        th.classList.add('row-head');

      } else { /// Column header cells
        th.classList.add('col-head');
        if (this.catetoryStarts.has(c)) {
          currentCategory++;
          th.classList.add('category-start');
        }
        this.colCatetoryMap.set(c, currentCategory);
      }
      th.dataset.row = "0";
      th.dataset.col = c.toString();
      headerRow.appendChild(th);
      this.cellArray.push(th);
      /// Add a span in each cell for display
      const span = document.createElement('span');
      if (c == 0) span.textContent = '☰'; /// corner cell doubles as the menu button
      this.spanArray.push(span);
      th.appendChild(span);
    }
    /// Build table body (rows)
    const tbody = this.table.createTBody();
    for (let r = 1; r <= this.rowCount; r++) {
      const tr = tbody.insertRow();
      for (let c = 0; c < this.colTotal; c++) {
        const cell = document.createElement('td');
        cell.dataset.row = r.toString();
        cell.dataset.col = c.toString();
        if (c == 0) { /// Row header cells
          cell.classList.add('row-head');
          const b = (new InteractiveBadge({
            symbol: "0",
            parent: cell
          }))
          this.badgeArray.push(b);
        } else { /// Other cells
          if (this.catetoryStarts.has(c)) {
            cell.classList.add('category-start');
          }
        }
        tr.appendChild(cell);
        this.cellArray.push(cell);
        /// Add a span in each cell for display
        const span = document.createElement('span');
        this.spanArray.push(span);
        cell.appendChild(span);
      }
    }
  }

  /// Header row height is driven by a CSS custom property scaled by how many VISIBLE rows
  /// there are, so the table always fills its container height evenly regardless of player
  /// count. Recalculated whenever a row is hidden/shown (see HideRow).
  _ResizeTopRow() {
    const numRows = this.rowCount - this.hiddenRows.size;
    document.documentElement.style.setProperty('--row-count', numRows);
  }
  /// Collects every cell in a column (including the header cell at row 0) into one array, in
  /// top-to-bottom order. Used anywhere an operation needs to apply to a whole column at once
  /// (selection, focus, the discovery-animation waterfall).
  _GetColCellArray(col) {
    let colCellArray = [];
    for (let r = 0; r <= this.rowCount; r++) {
      const cell = this.cellArray[col + (r * this.colTotal)];
      colCellArray.push(cell);
    }
    return colCellArray;
  }

  /// Same idea as _GetColCellArray but for one row, left-to-right (including the row-header cell).
  _GetRowCellArray(row) {
    let rowCellArray = [];
    for (let c = 0; c < this.colTotal; c++) {
      const cell = this.cellArray[(row * this.colTotal) + c];
      rowCellArray.push(cell);
    }
    return rowCellArray;
  }

  WriteTableData(rowIndex, colIndex, text) {
    if (
      rowIndex >= 0 && rowIndex <= this.rowCount &&
      colIndex >= 0 && colIndex < this.colTotal
    ) {
      this.spanArray[(rowIndex * this.colTotal + colIndex)].textContent = text;
    } else {
      console.warn(`Invalid cell coordinates: (${rowIndex}, ${colIndex})`);
    }
  }

  /// Plays the small "spin + grow" animation used for an ordinary (non-discovery) cell update -
  /// e.g. re-displaying a symbol while browsing history. Removes then re-adds the animation
  /// class with a forced reflow in between so it restarts even if the class never actually left
  /// (browsers otherwise treat re-adding an already-present class as a no-op and skip replaying
  /// the animation).
  SpinTableCell(rowIndex, colIndex) {
    if (
      rowIndex >= 0 && rowIndex <= this.rowCount &&
      colIndex >= 0 && colIndex < this.colTotal
    ) {
      const targetSpan = this.spanArray[(rowIndex * this.colTotal + colIndex)];

      targetSpan.classList.remove("animation-spingrow");
      void targetSpan.offsetWidth; /// Force reflow so the animation restarts even if the class was already present
      targetSpan.classList.add("animation-spingrow");
    } else {
      console.warn(`Invalid cell coordinates: (${rowIndex}, ${colIndex})`);
    }
  }

  /// Plays a ~2s "discovery" animation the first time a cell becomes known-have or hidden-card.
  /// Always just the one cell that was found - never anything else on the board. kind is
  /// 'have' or 'hidden'.
  /// - 'have': the cell's text spins briefly and its background flashes in the "have" color -
  ///   a known-have is a confirmed fact, so it gets a color callout.
  /// - 'hidden': no color at all - the "$" symbol itself spins a full turn while growing and
  ///   shrinking back down, once, over ~2s. No column-wide effect either way.
  PlayDiscoveryAnimation(rowIndex, colIndex, kind) {
    if (
      rowIndex < 0 || rowIndex > this.rowCount ||
      colIndex < 0 || colIndex >= this.colTotal
    ) {
      console.warn(`Invalid cell coordinates: (${rowIndex}, ${colIndex})`);
      return;
    }

    const targetIndex = rowIndex * this.colTotal + colIndex;
    const targetCell = this.cellArray[targetIndex];
    const targetSpan = this.spanArray[targetIndex];

    if (kind === 'hidden') {
      /// Symbol-only animation: no background color, just the "$" spinning + growing/shrinking.
      const spinGrowClass = 'animation-discover-hidden-spin';
      targetSpan.classList.remove(spinGrowClass);
      void targetSpan.offsetWidth; /// force reflow so this restarts even if somehow still mid-animation
      targetSpan.classList.add(spinGrowClass);
      setTimeout(() => {
        targetSpan.classList.remove(spinGrowClass);
      }, 2000);
      return;
    }

    /// known-have: quick spin plus a background color flash on the cell itself.
    const spinClass = 'animation-discover-spin';
    const cellClass = 'animation-discover-have';

    targetSpan.classList.remove(spinClass);
    targetCell.classList.remove(cellClass);
    void targetCell.offsetWidth; /// force reflow so this restarts even if somehow still mid-animation
    targetSpan.classList.add(spinClass);
    targetCell.classList.add(cellClass);
    setTimeout(() => {
      targetSpan.classList.remove(spinClass);
      targetCell.classList.remove(cellClass);
    }, 2000);
  }

  /// Converts the internal 1-based column set into 0-based card indexes matching cardsAPI's
  /// flat card-index scheme (column 1 = card index 0, etc., since column 0 is the row-header).
  GetSelectedCols() {
    let returnArray = new Array();
    this.selectedColumns.forEach(col => {
      returnArray.push(col - 1);
    });
    return returnArray;
  }

  /// Same idea as GetSelectedCols but for rows -> player indexes.
  GetSelectedRows() {
    let returnArray = new Array();
    this.selectedRows.forEach(row => {
      returnArray.push(row - 1);
    });
    return returnArray;
  }

  /// Hide
  DisplayTable(displayed) {
    if (displayed) {
      this.container.classList.remove('hidden');
    } else {
      this.container.classList.add('hidden');
    }
  }

  /// Hides/shows every cell in a whole row (used when there are fewer than 6 players, so the
  /// unused player row templates just get hidden rather than rebuilt) and keeps the header
  /// row's height in sync via _ResizeTopRow.
  HideRow(row, hide) {
    const rowCellArray = this._GetRowCellArray(row);
    rowCellArray.forEach(cell => {
      if (hide) {
        cell.classList.add('hidden');
      } else {
        cell.classList.remove('hidden');
      }
    });
    if (hide) {
      this.hiddenRows.add(row);
    } else {
      this.hiddenRows.delete(row);
    }
    this._ResizeTopRow();
  }

  HideRows(indexStart, indexEnd, hide) {
    for (let i = indexStart; i <= indexEnd; i++) {
      this.HideRow(i, hide);
    }
  }

  /// Focus - the transient "pointer is currently over this" highlight during a drag, as
  /// opposed to Select* below which is the persisted "this is chosen" state. Only one thing
  /// can be focused at a time, so ClearFocus always runs first.
  ClearFocus() {
    if (this.focus == null) return;
    if (this.focus[0] == "col") {
      this._GetColCellArray(this.focus[1]).forEach(cell => {
        cell.classList.remove('focused-col');
      });
    } else if (this.focus[0] == "row") {
      this._GetRowCellArray(this.focus[1]).forEach(cell => {
        cell.classList.remove('focused-row');
      });
    } else if (this.focus[0] == "menu") {
      this.cellArray[0].classList.remove('focused-menu');
    }
    this.focus = null;
  }

  FocusCol(col) {
    this.ClearFocus();
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.add('focused-col');
    });
    this.focus = ["col", col];
  }

  FocusRow(row) {
    this.ClearFocus();
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.add('focused-row');
    });
    this.focus = ["row", row];
  }

  FocusMenu() {
    this.ClearFocus();
    this.cellArray[0].classList.add('focused-menu');
    this.focus = ["menu"];
  }

  /// Select - the persisted "this column/row is chosen" state (e.g. the suggested cards, or
  /// the suggester/suggestee rows), independent of pointer focus.
  UnSelectCol(col) {
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.remove('selected-col');
    });
    this.selectedColumns.delete(col);
  }

  UnSelectRow(row) {
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.remove('selected-row');
    });
    this.selectedRows.delete(row);
  }

  ClearColSelection() {
    this.selectedColumns.forEach(col => {
      this.UnSelectCol(col);
    });
  }

  ClearRowSelection() {
    this.selectedRows.forEach(row => {
      this.UnSelectRow(row);
    })
  }

  /// Toggles a marker class on the table root, used only during Manual Entry so the CSS can
  /// give the intersection of the chosen player's row and chosen card's column a distinct
  /// combined look (see .manual-entry-mode rules in interactive_table.css) without changing
  /// how a normal suggestion's row/column overlap looks.
  SetManualMode(active) {
    this.table.classList.toggle('manual-entry-mode', active);
  }

  /// Full reset used by GameManager.NewGame() - clears both selections and the "second
  /// highlighted row" (suggestee) marker.
  ClearAllSelection() {
    this.ClearColSelection();
    this.ClearRowSelection();
    this.Select2Row(0);

  }

  /// Selects `col`, first deselecting any other currently-selected column in the same card
  /// category (suspects/weapons/rooms) - used while picking suggestion cards, where only one
  /// card per category can be chosen at a time.
  SelectColCategory(col) {
    const categoryOfCol = this.colCatetoryMap.get(col);
    this.selectedColumns.forEach(sCol => {
      if (this.colCatetoryMap.get(sCol) == categoryOfCol) {
        this.UnSelectCol(sCol);
      }
    });
    this.SelectCol(col);
  }

  SelectCol(col) {
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.remove('selected-col');
      cell.classList.add('selected-col');
      this.PopVerticalAnimation(cell);
    });
    this.selectedColumns.add(col);
  }

  SelectRow(row) {
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.remove('selected-row');
      cell.classList.add('selected-row');
      this.PopHorizontalAnimation(cell);
    });
    this.selectedRows.add(row);
  }

  /// The "secondary" row highlight - used to mark the suggestee (the player being asked)
  /// distinctly from the suggester's row (selected-row). Only ever one row at a time despite
  /// being tracked as a Set; passing 0 clears it (there is no row 0 in the body, since row 0
  /// is the header).
  Select2Row(row) {
    this.selected2Rows.forEach(row => {
      this._GetRowCellArray(row).forEach(cell => {
        cell.classList.remove('selected2-row');
      });
    })
    this.selected2Rows.clear();
    if (row > 0) {
      this._GetRowCellArray(row).forEach(cell => {
        cell.classList.remove('selected2-row');
        cell.classList.add('selected2-row');
      });
      this.selected2Rows.add(row);
    }
  }

  /// Toggle - what actually runs on a pointerup over a selectable header cell (see ToggleTarget).
  ToggleRow(row) {
    if (this.selectedRows.has(row)) {
      this.UnSelectRow(row);
    } else {
      if (this.categorySelectionMode) {
        this.ClearRowSelection();
      }
      this.SelectRow(row);
    }
  }

  ToggleCol(col) {
    if (this.selectedColumns.has(col)) {
      this.UnSelectCol(col);
    } else {
      if (this.exclusiveColSelectionMode) {
        this.ClearColSelection();
        this.SelectCol(col);
      } else if (this.categorySelectionMode) {
        this.SelectColCategory(col);
      } else {
        this.SelectCol(col);
      }
    }
  }

  /// Target from pointer events elementFromPoint
  /// Applies the transient focus highlight for whatever cell the pointer is currently over,
  /// respecting whichever selection mode(s) are currently enabled (colTargetActive/rowTargetActive)
  /// so dragging over cells that aren't selectable right now doesn't visually suggest they are.
  FocusTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row == null || col == null) return;
    if (row === 0 && col === 0) {
      this.ClearFocus();
      this.FocusMenu();
      /// Corner Menu
    } else if (col === 0) {
      if (!this.rowTargetActive) return;
      this.FocusRow(row);
    } else {
      if (!this.colTargetActive) return;
      this.FocusCol(col);
    }
  }

  /// The actual "commit" step on pointerup: opens the menu for the corner cell, or toggles
  /// the row/column selection and notifies GameManager via the OnToggleRow/OnToggleCol callbacks.
  ToggleTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row === 0 && col === 0) {
      if (this.OnToggleMenu) this.OnToggleMenu();
    } else if (col === 0) {
      if (!this.rowTargetActive) return;
      this.ToggleRow(row);
      this.OnToggleRow(this.selectedRows);
    } else {
      if (!this.colTargetActive) return;
      this.ToggleCol(col);
      this.OnToggleCol(this.selectedColumns);
    }
  }

  /// Enables/disables column selection entirely (used to lock the table while browsing a past
  /// turn read-only) and toggles the `.selectable` class (cursor styling) on every column cell.
  EnableColSelectMode(enable) {
    this.colTargetActive = enable;
    for (let i = 1; i < this.colTotal; i++) {
      this._GetColCellArray(i).forEach(cell => {
        if (enable) {
          cell.classList.add('selectable');
        } else {
          cell.classList.remove('selectable');
        }
      })
    }
  }

  /// Same idea as EnableColSelectMode, but for the row-header column.
  EnableRowSelectMode(enable) {
    this.rowTargetActive = enable;
    this._GetColCellArray(0).forEach(cell => {
      if (enable) {
        cell.classList.add('selectable');
      } else {
        cell.classList.remove('selectable');
      }
    })
  }

  UpdateBadge(index, value) {
    this.badgeArray[index].UpdateBadge(value);
  }

  /// Animations - the little "pop and fade" effect that plays once, in the direction the
  /// selection grew, when a column/row is newly selected. Cleans its own class off via a
  /// one-time animationend listener rather than a setTimeout, since it doesn't need to be
  /// restartable mid-flight the way the discovery/spin animations do.
  PopVerticalAnimation(cell) {
    cell.classList.add("animation-tablepopvertical");
    cell.addEventListener("animationend", () =>
      cell.classList.remove("animation-tablepopvertical"), {
        once: true
      }
    );
  }
  PopHorizontalAnimation(cell) {
    cell.classList.add("animation-tablepophorizontal");
    cell.addEventListener("animationend", () =>
      cell.classList.remove("animation-tablepophorizontal"), {
        once: true
      }
    );
  }
}
