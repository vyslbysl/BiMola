export function focusWindow(puzzle, entry, page = 0) {
  const rows = Math.min(5, puzzle.rows), cols = Math.min(5, puzzle.cols);
  const pages = Math.max(1, Math.ceil((entry?.length || 1) / 3));
  page = Math.max(0, Math.min(pages - 1, page));
  const step = Math.min(page * 3, (entry?.length || 1) - 1);
  const row = (entry?.startRow || 0) + (entry?.direction === 'down' ? step : 0);
  const col = (entry?.startCol || 0) + (entry?.direction === 'across' ? step : 0);
  return {rows, cols, row:Math.max(0,Math.min(puzzle.rows - rows,row - 1)), col:Math.max(0,Math.min(puzzle.cols - cols,col - 1)), page, pages};
}

export function panWindow(puzzle, area, rowDelta, colDelta) {
  return {...area, row:Math.max(0,Math.min(puzzle.rows-area.rows,area.row+rowDelta)), col:Math.max(0,Math.min(puzzle.cols-area.cols,area.col+colDelta))};
}
