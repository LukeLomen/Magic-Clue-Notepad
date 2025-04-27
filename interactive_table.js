export class InteractiveTable {
  constructor({
    container = document.body,
    id = null,
    colCount = 0,
    rowCount = 0,
    catetoryStarts = new Set(),
    OnToggleCol,
    OnToggleRow,
    OnToggleMenu
  }) {
    this.OnToggleCol = OnToggleCol;
    this.OnToggleRow = OnToggleRow;
    this.OnToggleMenu = OnToggleMenu;
    this.colSelectionActive = false;
    this.rowSelectionActive = false;
    this.menuSelectionActive = false;

    this.colTotal = colCount + 1;
    this.rowCount = rowCount;
    this.catetoryStarts = catetoryStarts;
    this.cellArray = [];
    this.spanArray = [];

    this.selectedColumns = new Set();
    this.selectedRows = new Set();
    this.focus = null;
    this.hiddenRows = new Set();

    this.container = container;
    this.table = document.createElement('table');
    if (id) this.table.id = id;
    this.container.appendChild(this.table);
    this.table.innerHTML = "";

    this._CreateTable();
    this._ResizeTopRow();
  }

  _CreateTable() {
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
          th.classList.add('category-start');
        }
      }
      th.dataset.row = "0";
      th.dataset.col = c.toString();
      headerRow.appendChild(th);
      this.cellArray.push(th);
      /// Add a span in each cell for display 
      const span = document.createElement('span');
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

  _ResizeTopRow() {
    const numRows = this.rowCount - this.hiddenRows.size;
    document.documentElement.style.setProperty('--row-count', numRows);
  }
  _GetColCellArray(col) {
    let colCellArray = [];
    for (let r = 0; r <= this.rowCount; r++) {
      const cell = this.cellArray[col + (r * this.colTotal)];
      colCellArray.push(cell);
    }
    return colCellArray;
  }

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

  HideTable(hide) {
    if (hide) {
      this.container.classList.add('hidden');
    } else {
      this.container.classList.remove('hidden');
    }
  }

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
    this._ResizeTopRow()
  }

  HideRows(indexStart, indexEnd, hide) {
    for (let i = indexStart; i <= indexEnd; i++) {
      this.HideRow(i, hide);
    }
  }

  /// Selection and Focus API
  ClearFocus() {
    if (this.focus == null) return;
    if (this.focus[0] == "col") {
      this._GetColCellArray(this.focus[1]).forEach(cell => {
        cell.classList.remove('focused-col')
      });
    } else if (this.focus[0] == "row") {
      this._GetRowCellArray(this.focus[1]).forEach(cell => {
        cell.classList.remove('focused-row')
      });
    }
    this.focus = null;
  }

  FocusCol(col) {
    if (!this.colSelectionActive) return;
    this.ClearFocus();
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.add('focused-col');
    });
    this.focus = ["col", col];
  }

  FocusRow(row) {
    if (!this.rowSelectionActive) return;
    this.ClearFocus();
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.add('focused-row');
    });
    this.focus = ["row", row]
  }

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

  ClearAllSelection() {
    //this.UnSelectRow(selectedRow)
    this._GetSelectedColumns().forEach(col => {
      this.UnSelectCol(col);
    });
    this.selectedColumns = new Set();
  }

  SelectCol(col) {
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.add('selected-col');
    });
    this.selectedColumns.add(col);
  }

  SelectRow(row) {
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.add('selected-row');
    });
    this.selectedRows.add(row);
  }

  ToggleRow(row) {
    if (this.selectedRows.has(row)) {
      this.UnSelectRow(row)
    } else {
      this.SelectRow(row);
    }
  }

  ToggleCol(col) {
    if (this.selectedColumns.has(col)) {
      this.UnSelectCol(col)
    } else {
      this.SelectCol(col);
    }
  }

  FocusTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row == null || col == null) return;
    if (row === 0 && col === 0) {
      //Corner Menu
    } else if (col === 0) {
      this.FocusRow(row);
    } else {
      this.FocusCol(col);
    }
  }

  ToggleTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row === 0 && col === 0) {
      //Corner Menu
    } else if (col === 0) {
      if (!this.rowSelectionActive) return;
      this.ToggleRow(row);
      this.OnToggleCol(this.selectedRows);
    } else {
      if (!this.colSelectionActive) return;
      this.ToggleCol(col);
      this.OnToggleCol(this.selectedColumns);
    }
  }
}