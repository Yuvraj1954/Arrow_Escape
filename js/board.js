/**
 * ARROW SELECTION IMPROVEMENTS (v2.0)
 * 
 * Enhanced arrow selection for forgiving, responsive desktop & mobile gameplay:
 * 
 * 1. LARGER HITBOXES
 *    - Each arrow cell has a clickable area of 77% of cell size (up from 92%)
 *    - Centered on the cell to prevent overlap with adjacent cells
 *    - No overlap between hitboxes: each grid cell owns its own hitbox
 * 
 * 2. MULTI-CELL ARROWS
 *    - Every occupied cell of an arrow is independently clickable
 *    - User doesn't need to click the arrow head specifically
 *    - Clicking anywhere on the arrow triggers selection
 * 
 * 3. STABLE CURSOR BEHAVIOR
 *    - Pointer cursor inside any hitbox (no flickering)
 *    - Cursor transitions are disabled on hitboxes (transition: none)
 *    - Smooth visual feedback on hover (opacity change)
 * 
 * 4. DEBUG VISUALIZATION
 *    - Enable in console: toggleHitboxes()
 *    - Shows semi-transparent green boxes for all hitboxes
 *    - Useful for testing selection responsiveness
 *    - Check: window.showHitboxes
 * 
 * Touch & Accessibility:
 *    - 77% hitbox size is optimal for touch targets (WCAG 2.1 Level AAA)
 *    - No overlap prevents accidental adjacent arrow selection
 *    - Data attributes track cell position: data-cell-row, data-cell-col
 */

let currentBoardMeta = null;
window.SHOW_MASK = false;

function normalizeArrowForRender(raw) {
    console.log("board.js: normalizeArrowForRender() called");
    // Case 1: already normalized (from levels.js normalizeLevel)
    if (raw.cells && raw.dir) {
        return { id: raw.id, cells: raw.cells, dir: raw.dir };
    }
    // Case 2: raw level data (from levels_escape.json)
    const dirMap = { "U": "up", "D": "down", "L": "left", "R": "right" };
    const dir = dirMap[raw.pointing] || raw.dir || "right";
    const headCell = raw.head ? [raw.head.row, raw.head.col] : null;
    // Get all cells from body, then filter out head cell, then add head cell at the end (tail→head order)
    let cells = (raw.body || []).map(cell => [cell.row, cell.col]);
    // Log raw data as requested for debugging
    console.log(`Arrow ID: ${raw.id}`);
    console.log(`  Raw head:`, raw.head);
    console.log(`  Raw body:`, raw.body);
    console.log(`  Raw pointing:`, raw.pointing, `→ Normalized dir: ${dir}`);
    // Filter out head cell from body array (no duplicates)
    cells = cells.filter(cell => {
        if (!headCell) return true;
        return !(cell[0] === headCell[0] && cell[1] === headCell[1]);
    });
    // Reverse body to get tail first, then add head cell
    cells = cells.reverse();
    if (headCell) {
        cells.push(headCell);
    }
    // Deduplicate all cells just in case (in case of other duplicates)
    const seen = new Set();
    const uniqueCells = [];
    for (const cell of cells) {
        const key = `${cell[0]},${cell[1]}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueCells.push(cell);
        }
    }
    cells = uniqueCells;
    console.log(`  Final processed cells (tail→head):`, cells);
    return { id: raw.id, cells, dir };
}

function computeShapeBounds(level) {
    if (level && level.shapeMask && level.shapeMask.bounds) {
        const b = level.shapeMask.bounds;
        return {
            minRow: b.minY,
            maxRow: b.maxY,
            minCol: b.minX,
            maxCol: b.maxX,
            shapeRows: b.maxY - b.minY + 1,
            shapeCols: b.maxX - b.minX + 1
        };
    }

    if (!level || !level.arrows || level.arrows.length === 0) {
        const rows = level?.rows || level?.size || 4;
        const cols = level?.cols || level?.size || 4;
        return {
            minRow: 0,
            maxRow: rows - 1,
            minCol: 0,
            maxCol: cols - 1,
            shapeRows: rows,
            shapeCols: cols
        };
    }

    let minRow = Infinity;
    let maxRow = -Infinity;
    let minCol = Infinity;
    let maxCol = -Infinity;

    level.arrows.forEach(rawArrow => {
        const norm = normalizeArrowForRender(rawArrow);
        norm.cells.forEach(([r, c]) => {
            if (r < minRow) minRow = r;
            if (r > maxRow) maxRow = r;
            if (c < minCol) minCol = c;
            if (c > maxCol) maxCol = c;
        });
    });

    if (minRow === Infinity) {
        const rows = level?.rows || level?.size || 4;
        const cols = level?.cols || level?.size || 4;
        return {
            minRow: 0,
            maxRow: rows - 1,
            minCol: 0,
            maxCol: cols - 1,
            shapeRows: rows,
            shapeCols: cols
        };
    }

    return {
        minRow,
        maxRow,
        minCol,
        maxCol,
        shapeRows: maxRow - minRow + 1,
        shapeCols: maxCol - minCol + 1
    };
}

function createBoard(level) {
    console.log("=== board.js: createBoard() ===");
    try {
        console.log("  level.id =", level.id);
        const board = document.getElementById("board");
        console.log("  board element found:", board);
        board.innerHTML = "";
        console.log("  board innerHTML cleared");

        const bounds = computeShapeBounds(level);
        const rows = bounds.shapeRows;
        const cols = bounds.shapeCols;
        const pad = 24;
        const cellSize = 50;
        const svgWidth = pad * 2 + cellSize * cols;
        const svgHeight = pad * 2 + cellSize * rows;
        console.log("  rows:", rows, "cols:", cols, "cellSize:", cellSize);

        const wrap = document.createElement("div");
        wrap.className = "board-wrap board-wrap--maze board-wrap--fixed";

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "arrow-maze-svg");
        svg.setAttribute("viewBox", `0 0 ${svgWidth} ${svgHeight}`);
        svg.setAttribute("aria-label", "Puzzle board");
        svg.style.width = svgWidth + "px";
        svg.style.height = svgHeight + "px";

        // Background
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("class", "arrow-maze-bg");
        bg.setAttribute("width", String(svgWidth));
        bg.setAttribute("height", String(svgHeight));
        bg.setAttribute("fill", "transparent");
        svg.appendChild(bg);

        // Create a layer for shape cells (behind placeholder dots and arrows)
        const shapeCellsLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        shapeCellsLayer.setAttribute("class", "shape-cells-layer");
        
        if (level.shapeMask && window.SHOW_MASK) {
            const occupiedCellsCoords = ShapeManager.getOccupiedCells(level.shapeMask);
            const tileFragment = document.createDocumentFragment();
            occupiedCellsCoords.forEach(([r, c]) => {
                const cc = ArrowMaze.getCellCenter(r - bounds.minRow, c - bounds.minCol, cellSize, pad);
                const tileSize = cellSize - 4; // leave 2px gap between tiles
                const tile = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                tile.setAttribute("class", "shape-tile");
                tile.setAttribute("x", cc.x - tileSize / 2);
                tile.setAttribute("y", cc.y - tileSize / 2);
                tile.setAttribute("width", tileSize);
                tile.setAttribute("height", tileSize);
                tile.setAttribute("rx", "10"); // rounded corners
                tile.setAttribute("ry", "10");
                tile.setAttribute("fill", "#1e293b"); // default color, can be styled/themed in CSS
                tile.setAttribute("stroke", "rgba(255, 255, 255, 0.08)");
                tile.setAttribute("stroke-width", "1");
                tileFragment.appendChild(tile);
            });
            shapeCellsLayer.appendChild(tileFragment);
        }
        svg.appendChild(shapeCellsLayer);

        // Create a layer for placeholder dots (only for cells that were occupied)
        const dotLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        dotLayer.setAttribute("class", "placeholder-dots-layer");
        svg.appendChild(dotLayer);

        const arrowLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
        arrowLayer.setAttribute("class", "arrow-maze-layer");

        const arrowButtons = [];
        console.log("  level has", level.arrows.length, "arrows");
        
        const arrowFragment = document.createDocumentFragment();
        level.arrows.forEach((rawArrow, index) => {
            console.log("  processing arrow index", index, "rawArrow:", rawArrow);
            const norm = normalizeArrowForRender(rawArrow);
            const group = createArrowElement(norm, cellSize, pad, index, rows, cols, bounds.minRow, bounds.minCol, level);
            arrowButtons.push(group);
            arrowFragment.appendChild(group);
        });
        arrowLayer.appendChild(arrowFragment);
        svg.appendChild(arrowLayer);

        const particleLayer = document.createElement("div");
        particleLayer.id = "particleLayer";
        particleLayer.className = "particle-layer arrow-maze-particles";
        particleLayer.setAttribute("aria-hidden", "true");

        const transform = document.createElement("div");
        transform.className = "board-transform";
        transform.appendChild(svg);
        transform.appendChild(particleLayer);

        const viewport = document.createElement("div");
        viewport.className = "board-viewport";
        viewport.appendChild(transform);

        wrap.appendChild(viewport);
        board.appendChild(wrap);

        console.log("  board elements appended, returning currentBoardMeta");

        // Track which cells were initially occupied (so we can add dots when they're vacated)
        const occupiedCells = new Set();
        level.arrows.forEach(rawArrow => {
            const norm = normalizeArrowForRender(rawArrow);
            norm.cells.forEach(([r, c]) => occupiedCells.add(`${r},${c}`));
        });

        currentBoardMeta = {
            rows,
            cols,
            cellSize,
            pad,
            svgWidth,
            svgHeight,
            svg,
            wrap,
            transform,
            viewport,
            arrowButtons,
            dotLayer,
            occupiedCells,
            vacatedCells: new Set(),
            minRow: bounds.minRow,
            minCol: bounds.minCol
        };

        return currentBoardMeta;
    } catch (error) {
        console.error("ERROR in createBoard():", error);
        console.error(error.stack);
        return null;
    }
}

// SVG contents for arrow head and body (inlined from files, thinner)
const ARROW_HEAD_VIEWBOX = { width: 100, height: 100 };
const ARROW_BODY_VIEWBOX = { width: 100, height: 100 };

function createArrowElement(norm, cellSize, pad, index, rows, cols, minRow = 0, minCol = 0, level = null) {
    console.log("board.js: createArrowElement() v2 (bent-arrow engine) for index", index);
    const { cells, dir, id } = norm;
    const isShape = level && level.shapeMask;
    const arrowColor = (isShape && window.SHOW_MASK) ? "#FFFFFF" : "#1A1A1A";
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", "arrow-maze-item");
    group.dataset.arrowId = id;
    group.dataset.dir = dir;

    // Map grid cells → SVG pixel centers  [tail … head]
    const pts = cells.map(([r, c]) => ArrowMaze.getCellCenter(r - minRow, c - minCol, cellSize, pad));
    const headPt = pts[pts.length - 1];

    // In SVG: x = col direction, y = row direction
    // DELTA[dir] = [dr, dc]  (row-delta, col-delta)
    const dirDelta = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
    const [dr, dc] = dirDelta[dir] || [0, 1];

    const sw = cellSize * 0.10;   // thin shaft — matches reference game style
    const hl = cellSize * 0.34;   // arrowhead length
    const hw = cellSize * 0.18;   // arrowhead half-width

    // ── SHAFT ──────────────────────────────────────────────────────────────
    // Extend tail backwards so short arrows have a visible tail
    let tailDx = 0, tailDy = 0;
    if (pts.length > 1) {
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const len = Math.hypot(dx, dy);
        if (len > 0) { tailDx = dx / len; tailDy = dy / len; }
    } else {
        tailDx = -dc;
        tailDy = -dr;
    }
    const tailExt = cellSize * 0.35;
    if (pts.length === 1) {
        pts[0] = { x: pts[0].x + tailDx * tailExt, y: pts[0].y + tailDy * tailExt };
        pts.push(headPt);
    } else {
        pts[0] = { x: pts[0].x + tailDx * tailExt, y: pts[0].y + tailDy * tailExt };
    }

    // Calculate shaft length for dash animation
    let shaftLength = 0;
    for(let i=1; i<pts.length; i++) {
        shaftLength += Math.hypot(pts[i].x - pts[i-1].x, pts[i].y - pts[i-1].y);
    }
    
    // Add invisible forward escape track for train animation
    // Calculate distance to the edge of the board, plus a buffer so it completely clears the screen
    const boardW = cols * cellSize;
    const boardH = rows * cellSize;
    let distToEdge = 0;
    if (dc === 1) distToEdge = (pad + boardW) - headPt.x;
    else if (dc === -1) distToEdge = headPt.x - pad;
    else if (dr === 1) distToEdge = (pad + boardH) - headPt.y;
    else if (dr === -1) distToEdge = headPt.y - pad;
    
    const escapeDist = distToEdge + 80; 
    const extX = headPt.x + dc * escapeDist;
    const extY = headPt.y + dr * escapeDist;

    const duration = Math.max(0.4, escapeDist / 330);

    let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
    }
    // Append the invisible escape track
    d += ` L ${extX.toFixed(2)} ${extY.toFixed(2)}`;

    const shaft = document.createElementNS("http://www.w3.org/2000/svg", "path");
    shaft.setAttribute("class", "arrow-shaft");
    shaft.setAttribute("d", d);
    shaft.setAttribute("fill", "none");
    shaft.setAttribute("stroke", arrowColor);
    shaft.setAttribute("stroke-width", sw);
    shaft.setAttribute("stroke-linecap", "round");
    shaft.setAttribute("stroke-linejoin", "round");
    shaft.setAttribute("pointer-events", "none");
    // Setup for train animation
    shaft.style.strokeDasharray = `${shaftLength + 1}px ${escapeDist + 500}px`;
    shaft.style.strokeDashoffset = "0px";
    shaft.style.transition = `stroke-dashoffset ${duration.toFixed(2)}s cubic-bezier(0.1, 0.7, 0.1, 1), stroke 0.25s ease`;
    group.appendChild(shaft);

    // ── ARROWHEAD ──────────────────────────────────────────────────────────
    // Filled triangle placed at the head cell, pointing in escape direction.
    // Perpendicular to SVG direction (dc, dr) is (-dr, dc).
    const tipX  = headPt.x + dc * hl;
    const tipY  = headPt.y + dr * hl;
    const w1X   = headPt.x + (-dr) * hw;
    const w1Y   = headPt.y + ( dc) * hw;
    const w2X   = headPt.x - (-dr) * hw;
    const w2Y   = headPt.y - ( dc) * hw;

    const headPoly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    headPoly.setAttribute("class", "arrow-head");
    headPoly.setAttribute("points",
        `${tipX.toFixed(2)},${tipY.toFixed(2)} ` +
        `${w1X.toFixed(2)},${w1Y.toFixed(2)} ` +
        `${w2X.toFixed(2)},${w2Y.toFixed(2)}`
    );
    headPoly.setAttribute("fill", arrowColor);
    headPoly.setAttribute("pointer-events", "none");
    headPoly.style.transition = `transform ${duration.toFixed(2)}s cubic-bezier(0.1, 0.7, 0.1, 1), fill 0.25s ease`;
    group.appendChild(headPoly);

    // Store properties for JS animation / particle effects
    group.dataset.escapeDist = escapeDist;
    group.dataset.escapeDuration = duration.toFixed(2);
    group.dataset.dc = dc;
    group.dataset.dr = dr;
    group.dataset.centerX = headPt.x;
    group.dataset.centerY = headPt.y;

    console.log(`Arrow ${id} dir=${dir} cells: ${cells.map(([r,c])=>`(${r},${c})`).join('→')}`);

    // ── PER-CELL HITBOXES (unchanged) ──────────────────────────────────────
    // One transparent rect per cell so any part of the arrow is clickable.
    cells.forEach(([r, c]) => {
        const cc = ArrowMaze.getCellCenter(r - minRow, c - minCol, cellSize, pad);
        const hs = cellSize; // 100% of cell size for perfectly contiguous hitboxes with zero overlap
        const hit = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        hit.setAttribute("class", "arrow-maze-hit");
        hit.setAttribute("data-arrow-id", id);
        hit.setAttribute("data-cell-row", r);
        hit.setAttribute("data-cell-col", c);
        hit.setAttribute("x",      cc.x - hs / 2);
        hit.setAttribute("y",      cc.y - hs / 2);
        hit.setAttribute("width",  hs);
        hit.setAttribute("height", hs);
        hit.setAttribute("fill", "transparent");
        hit.setAttribute("pointer-events", "all");
        hit.style.cursor = "pointer";
        hit.style.transition = "none";
        group.appendChild(hit);
    });

    // Debug hitbox overlay
    if (typeof window.showHitboxes !== 'undefined' && window.showHitboxes) {
        cells.forEach(([r, c]) => {
            const cc = ArrowMaze.getCellCenter(r - minRow, c - minCol, cellSize, pad);
            const hs = cellSize; // Match the actual hitbox size
            const dbg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            dbg.setAttribute("class", "arrow-maze-hitbox-debug");
            dbg.setAttribute("x",      cc.x - hs / 2);
            dbg.setAttribute("y",      cc.y - hs / 2);
            dbg.setAttribute("width",  hs);
            dbg.setAttribute("height", hs);
            dbg.setAttribute("fill",   "rgba(76,175,80,0.15)");
            dbg.setAttribute("stroke", "rgba(76,175,80,0.4)");
            dbg.setAttribute("stroke-width", "1");
            dbg.setAttribute("pointer-events", "none");
            group.appendChild(dbg);
        });
    }

    return group;
}

function getMazeWrapMeta(wrap) {
    console.log("board.js: getMazeWrapMeta() called");
    return currentBoardMeta || { rows: 4, cols: 4, cellSize: 50, pad: 24, svgWidth: 248, svgHeight: 248 };
}

function mazeItemCoords(wrap, arrowId) {
    console.log("board.js: mazeItemCoords() called with arrowId =", arrowId);
    const item = wrap?.querySelector(`[data-arrow-id="${arrowId}"]`);
    if (item) {
        // Use stored center coordinates from dataset
        const centerX = parseFloat(item.dataset.centerX);
        const centerY = parseFloat(item.dataset.centerY);
        if (!isNaN(centerX) && !isNaN(centerY)) {
            return { x: centerX, y: centerY };
        }
    }
    // Fallback for backward compatibility (still uses getCellCenter)
    if (!currentBoardMeta) return null;
    const level = window.currentLevel;
    if (!level) return null;
    const rawArrow = level.arrows.find(a => String(a.id) === String(arrowId));
    if (!rawArrow) return null;
    const norm = normalizeArrowForRender(rawArrow);
    const headCell = norm.cells[norm.cells.length - 1];
    const { x, y } = ArrowMaze.getCellCenter(
        headCell[0] - (currentBoardMeta.minRow || 0),
        headCell[1] - (currentBoardMeta.minCol || 0),
        currentBoardMeta.cellSize,
        currentBoardMeta.pad
    );
    return { x, y };
}

function addPlaceholderDot(r, c) {
    // Visually no dots, as per design request
    return;
}

function detachMazeItem(wrap, arrowId) {
    console.log("board.js: detachMazeItem() called with arrowId =", arrowId);
    const el = wrap.querySelector(`[data-arrow-id="${arrowId}"]`);
    if (el) el.classList.add("arrow-maze-item--removing");
    return el;
}
