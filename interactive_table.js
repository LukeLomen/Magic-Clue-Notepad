export class InteractiveTable {
  constructor({
    container = document,
    id = null,
    colCount = 0,
    rowCount = 0,

  }) {
    this.colTotal = colCount + 1;
    this.rowCount = rowCount;
    this.rowsDisplayed = this.rowCount;
    this.cellArray = [];
    this.spanArray = [];

    this.selectedColumns = new Set();
    this.selectedRow = null;
    this.focus = null;

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
        th.classList.add('zone1');
        th.classList.add('row-head');
      } else { /// Column header cells belong to Zone 3
        th.classList.add('zone3');
        th.classList.add('col-head');
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
          cell.classList.add('zone2');
          cell.classList.add('row-head');
        } else { /// Other cells
          cell.classList.add('zone3');
          cell.classList.add('zone2');
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
    document.documentElement.style.setProperty('--row-count', this.rowsDisplayed);
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

  HideRows(indexStart, indexEnd, hide) {
    // rowsDisplayed wont be correct if calling hide rows and some rows are aleady hidden but I will only ever be using this to hide the bottom rows with no player 
    this.rowsDisplayed = this.rowCount - (indexEnd - indexStart);
    for (let i = indexStart; i <= indexEnd; i++) {
      const rowCellArray = this._GetRowCellArray(i);
      rowCellArray.forEach(cell => {
        if (hide) {
          cell.classList.add('hidden');
        } else {
          cell.classList.remove('hidden');
        }
      });
    }
    this._ResizeTopRow()
  }


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
    this.focus = ["row", row]
  }

  UnselectCol(col) {
    this._GetColCellArray(col).forEach(cell => {
      cell.classList.remove('selected-col');
    });
  }

  UnSelectRow(row) {
    this._GetRowCellArray(row).forEach(cell => {
      cell.classList.remove('selected-row');
    });
    this.selectedRow = null;
  }

  ClearSelection() {
    this.UnSelectRow(selectedRow)
    this._GetSelectedColumns().forEach(col => {
      this.UnselectCol(col);
    });
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
    this.selectedRow = row;
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

  SelectTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row === 0 && col === 0) {

    } else if (col === 0) {
      this.SelectRow(row);
    } else {
      this.SelectCol(col);
    }
  }
}






/// UNUSED: Old Method
export function CreateInteractiveTable(container, id, colCount, rowCount, onSelect) {
  /// Create and append the table element
  const table = document.createElement('table');
  table.id = id;
  container.innerHTML = "";
  container.appendChild(table);

  const colTotal = colCount + 1;
  let cellArray = [];
  let spanArray = [];

  let selectedColumns = new Set();
  let selectedRow = null;
  let focus = null;

  document.documentElement.style.setProperty('--row-count', rowCount);

  /// Build table header (the first row)
  table.innerHTML = "";
  const thead = table.createTHead();
  const headerRow = thead.insertRow();
  for (let c = 0; c < colTotal; c++) {
    const th = document.createElement('th');
    if (c === 0) { /// Top-left cell
      th.classList.add('zone1');
      th.classList.add('row-head');
    } else { /// Column header cells belong to Zone 3
      th.classList.add('zone3');
      th.classList.add('col-head');
    }
    th.dataset.row = "0";
    th.dataset.col = c.toString();
    headerRow.appendChild(th);
    cellArray.push(th);
    th.id = id;
    /// Add a span in each cell for display 
    const span = document.createElement('span');
    spanArray.push(span);
    th.appendChild(span);
  }
  /// Build table body (rows)
  const tbody = table.createTBody();
  for (let r = 1; r <= rowCount; r++) {
    const tr = tbody.insertRow();
    for (let c = 0; c < colTotal; c++) {
      const cell = document.createElement('td');
      cell.dataset.row = r.toString();
      cell.dataset.col = c.toString();
      if (c === 0) { /// Row header cells
        cell.classList.add('zone2');
        cell.classList.add('row-head');
      } else { /// Other cells
        cell.classList.add('zone3');
        cell.classList.add('zone2');
      }
      tr.appendChild(cell);
      cellArray.push(cell);
      cell.id = id;
      /// Add a span in each cell for display 
      const span = document.createElement('span');
      spanArray.push(span);
      cell.appendChild(span);
    }
  }


  /*
    // Utility functions
    function clearFocus() {
      table.querySelectorAll('.focused-col').forEach(el => el.classList.remove('focused-col'));
      table.querySelectorAll('.focused-row').forEach(el => el.classList.remove('focused-row'));
      table.querySelectorAll('.focused-menu').forEach(el => el.classList.remove('focused-menu'));
      focusedCell = null;
    }


    function focusZone1() {
      clearFocus();
      const cell = cellArray[0];
      if (cell) {
        cell.classList.add('focused-menu');
        focusedCell = cell;
      }
    }

    function focusRow(row) {
      clearFocus();
      for (let c = 0; c <= colCount; c++) {
        const cell = table.querySelector(`[data-row='${row}'][data-col='${c}']`);
        if (cell) cell.classList.add('focused-row');
      }
      focusedCell = {
        zone: 2,
        row: row
      };
    }

    function focusCol(col) {
      clearFocus();
      for (let r = 0; r <= rowCount; r++) {
        const cell = table.querySelector(`[data-row='${r}'][data-col='${col}']`);
        if (cell) cell.classList.add('focused-col');
      }
      focusedCell = {
        zone: 3,
        col: col
      };
    }
  */







  /*



    function setFocusZone1() {
      clearFocus();
      //document.documentElement.style.setProperty('--row-head-width', "20%");

      const cell = table.querySelector('.zone1');
      if (cell) {
        cell.classList.add('focused');
        focusedCell = cell;
      }
    }

    function setFocusZone2(row) {
      clearFocus();
      //document.documentElement.style.setProperty('--row-head-width', "20%");

      for (let c = 0; c <= colCount; c++) {
        const cell = table.querySelector(`[data-row='${row}'][data-col='${c}']`);
        if (cell) cell.classList.add('focused');
      }
      focusedCell = {
        zone: 2,
        row: row
      };
    }

    function setFocusZone3(col) {
      clearFocus();
      for (let r = 0; r <= rowCount; r++) {
        const cell = table.querySelector(`[data-row='${r}'][data-col='${col}']`);
        if (cell) cell.classList.add('focused');
      }
      focusedCell = {
        zone: 3,
        col: col
      };
    }

    // Toggle selection on pointer release
    function applySelection() {
      if (!focusedCell) return;
      if (typeof onSelect === "function") {
        onColSelect(focusedCell); // <- send it out!
      }
      if (focusedCell.classList && focusedCell.classList.contains("zone1")) {
        focusedCell.classList.toggle("selected");
        focusedCell.classList.remove("focused");
        focusedCell = null;
        return;
      }
      if (focusedCell.zone === 2) {
        const row = focusedCell.row;
        const base = table.querySelector(`[data-row='${row}'][data-col='0']`);
        const isSelected = base && base.classList.contains("selected");
        for (let c = 0; c <= colCount; c++) {
          const cell = table.querySelector(`[data-row='${row}'][data-col='${c}']`);
          if (cell) {
            cell.classList.remove("focused");
            if (!isSelected) cell.classList.add("selected");
            else cell.classList.remove("selected");
          }
        }
      } else if (focusedCell.zone === 3) {
        const col = focusedCell.col;
        const base = table.querySelector(`[data-row='0'][data-col='${col}']`);
        const isSelected = base && base.classList.contains("selected");
        for (let r = 0; r <= rowCount; r++) {
          const cell = table.querySelector(`[data-row='${r}'][data-col='${col}']`);
          if (cell) {
            cell.classList.remove("focused");
            if (!isSelected) cell.classList.add("selected");
            else cell.classList.remove("selected");
          }
        }
        if (!isSelected) selectedColumns.add(col);
        else selectedColumns.delete(col);
      }
      focusedCell = null;
    }
  */

  function GetSelectedColumns() {
    return Array.from(selectedColumns);
  }

  function GetColCellArray(col) {
    let colCellArray = [];
    for (let r = 0; r <= rowCount; r++) {
      const cell = cellArray[col + (r * colTotal)];
      colCellArray.push(cell);
    }
    return colCellArray;
  }

  function GetRowCellArray(row) {
    let rowCellArray = [];
    for (let c = 0; c < colTotal; c++) {
      const cell = cellArray[(row * colTotal) + c];
      rowCellArray.push(cell);
    }
    return rowCellArray;
  }

  function ClearFocus() {
    if (!focus) return;
    if (focus[0] == "col") {
      GetColCellArray(focus[1]).forEach(cell => {
        cell.classList.remove('focused-col')
      });
    } else if (focus[0] == "row") {
      GetRowCellArray(focus[1]).forEach(cell => {
        cell.classList.remove('focused-row')
      });
    }
    focus = null;
  }

  function FocusCol(col) {
    ClearFocus();
    GetColCellArray(col).forEach(cell => {
      cell.classList.add('focused-col');
    });
    focus = ["col", col];
  }

  function FocusRow(row) {
    ClearFocus();
    GetRowCellArray(row).forEach(cell => {
      cell.classList.add('focused-row');
    });
    focus = ["row", row]
  }

  function ClearSelection() {
    UnSelectRow(selectedRow)
    GetSelectedColumns().forEach(col => {
      UnselectCol(col);
    });
  }

  function SelectCol(col) {
    GetColCellArray(col).forEach(cell => {
      cell.classList.add('selected-col');
    });
    selectedColumns.add(col);
  }

  function SelectRow(row) {
    GetRowCellArray(row).forEach(cell => {
      cell.classList.add('selected-row');
    });
    selectedRow = row;
  }

  function UnselectCol(col) {
    GetColCellArray(col).forEach(cell => {
      cell.classList.remove('selected-col');
    });
  }

  function UnSelectRow(row) {
    GetRowCellArray(row).forEach(cell => {
      cell.classList.remove('selected-row');
    });
    selectedRow = null;
  }

  function FocusTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    //console.log(target);
    if (row == null || col == null) return;
    if (row === 0 && col === 0) {
      //Corner Menu
    } else if (col === 0) {
      FocusRow(row);
    } else {
      FocusCol(col);
    }
  }

  function SelectTarget(target) {
    const row = parseInt(target.dataset.row, 10);
    const col = parseInt(target.dataset.col, 10);
    if (row === 0 && col === 0) {

    } else if (col === 0) {

    } else {

    }
  }





  function WriteTableData(rowIndex, colIndex, text) {
    if (
      rowIndex >= 0 && rowIndex <= rowCount &&
      colIndex >= 0 && colIndex < colTotal
    ) {
      spanArray[(rowIndex * colTotal + colIndex)].textContent = text;
    } else {
      console.warn(`Invalid cell coordinates: (${rowIndex}, ${colIndex})`);
    }
  }

  // Return an API for reusing the table
  return {
    table,
    GetSelectedColumns,
    WriteTableData,
    ClearFocus,
    ClearSelection,
    SelectRow,
    SelectCol,
    FocusRow,
    FocusCol
  };
}