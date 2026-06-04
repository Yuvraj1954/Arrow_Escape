/**
 * Multi-cell arrow maze geometry — shared by board, gameplay, and level builder.
 */
const ArrowMaze = (() => {
    const DELTA = {
        up: [-1, 0],
        down: [1, 0],
        left: [0, -1],
        right: [0, 1]
    };

    const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };

    function cellKey(r, c) {
        return `${r},${c}`;
    }

    function parseCellKey(k) {
        const [r, c] = k.split(",").map(Number);
        return [r, c];
    }

    /** Normalize raw level arrow into { id, cells, dir }. */
    function normalizeArrow(raw, index = 0) {
        if (raw.cells && raw.cells.length >= 1) {
            return {
                id: raw.id ?? `a${index}`,
                cells: raw.cells.map(([r, c]) => [r, c]),
                dir: raw.dir
            };
        }
        if (raw.path && typeof raw.path === "string") {
            return pathToArrow(raw.path, raw.id ?? `a${index}`, raw.dir);
        }
        const len = { short: 1, normal: 2, long: 3, xl: 4 }[raw.len] || 2;
        return straightArrow(raw.r, raw.c, raw.dir, len, raw.id ?? `a${index}`);
    }

    function straightArrow(r, c, dir, len, id = "a") {
        const cells = [];
        const [dr, dc] = DELTA[dir];
        for (let i = len - 1; i >= 0; i--) {
            cells.push([r - dr * i, c - dc * i]);
        }
        return { id, cells, dir };
    }

    /** Path from tail: letters U/D/L/R for steps along current heading; + turn cw, - turn ccw. */
    function pathToArrow(path, id, headDir) {
        const turns = { "+": 1, "-": -1 };
        const rotate = (d, n) => {
            const order = ["up", "right", "down", "left"];
            let i = order.indexOf(d);
            return order[(i + n + 4) % 4];
        };
        let dir = headDir || "right";
        let r = 0;
        let c = 0;
        const cells = [[r, c]];
        const steps = path.toUpperCase().replace(/\s/g, "");
        let i = 0;
        while (i < steps.length) {
            const ch = steps[i];
            if (ch === "+" || ch === "-") {
                dir = rotate(dir, turns[ch]);
                i++;
                continue;
            }
            if (!DELTA[ch === "U" ? "up" : ch === "D" ? "down" : ch === "L" ? "left" : "right"]) {
                i++;
                continue;
            }
            const d = ch === "U" ? "up" : ch === "D" ? "down" : ch === "L" ? "left" : "right";
            dir = d;
            const [dr, dc] = DELTA[d];
            r += dr;
            c += dc;
            cells.push([r, c]);
            i++;
        }
        const head = cells[cells.length - 1];
        const prev = cells[cells.length - 2] || head;
        let escapeDir = dir;
        if (head[0] !== prev[0] || head[1] !== prev[1]) {
            escapeDir =
                head[0] < prev[0]
                    ? "up"
                    : head[0] > prev[0]
                      ? "down"
                      : head[1] < prev[1]
                        ? "left"
                        : "right";
        }
        return { id, cells, dir: headDir || escapeDir };
    }

    function getHead(arrow) {
        return arrow.cells[arrow.cells.length - 1];
    }

    function translateCells(cells, dr, dc) {
        if (cells.length <= 1) {
            return cells.map(([r, c]) => [r + dr, c + dc]);
        }
        const head = cells[cells.length - 1];
        const newHead = [head[0] + dr, head[1] + dc];
        return [...cells.slice(1), newHead];
    }

    function buildOccupancy(arrows, skipId = null) {
        const map = new Map();
        for (const a of arrows) {
            if (a.removing || (skipId && a.id === skipId)) continue;
            for (const [r, c] of a.cells) {
                const k = cellKey(r, c);
                if (map.has(k)) return null;
                map.set(k, a.id);
            }
        }
        return map;
    }

    function isOnBoard(r, c, rows, cols) {
        return r >= 0 && c >= 0 && r < rows && c < cols;
    }

    function allOffBoard(cells, rows, cols) {
        return cells.every(([r, c]) => !isOnBoard(r, c, rows, cols));
    }

    function canEscape(arrow, arrows, rows, cols) {
        const [dr, dc] = DELTA[arrow.dir] || [0, 0];
        const others = new Map();
        for (const a of arrows) {
            if (a.id === arrow.id || a.removing) continue;
            for (const [r, c] of a.cells) others.set(cellKey(r, c), a.id);
        }

        let cells = arrow.cells.map(([r, c]) => [r, c]);
        const maxDist = Math.max(rows, cols);
        for (let step = 0; step < maxDist * 3 + 8; step++) {
            cells = translateCells(cells, dr, dc);
            if (allOffBoard(cells, rows, cols)) return true;
            for (const [r, c] of cells) {
                if (isOnBoard(r, c, rows, cols) && others.has(cellKey(r, c))) return false;
            }
        }
        return false;
    }

    function countMovable(arrows, rows, cols) {
        return arrows.filter(a => !a.removing && canEscape(a, arrows, rows, cols)).length;
    }

    function solveLevel(arrows, rows, cols, removed = new Set()) {
        const left = arrows.filter(a => !removed.has(a.id) && !a.removing);
        if (!left.length) return true;
        for (const a of left) {
            if (canEscape(a, left, rows, cols)) {
                const next = new Set(removed);
                next.add(a.id);
                if (solveLevel(arrows, rows, cols, next)) return true;
            }
        }
        return false;
    }

    function validateLayout(arrows, rows, cols) {
        const seen = new Set();
        for (const a of arrows) {
            for (const [r, c] of a.cells) {
                if (!isOnBoard(r, c, rows, cols)) return false;
                const k = cellKey(r, c);
                if (seen.has(k)) return false;
                seen.add(k);
            }
        }
        return true;
    }

    /** Single source of truth: Get cell center coordinates */
    function getCellCenter(row, col, cellSize, pad) {
        return {
            x: pad + col * cellSize + cellSize / 2,
            y: pad + row * cellSize + cellSize / 2
        };
    }

    // Alias for backward compatibility
    const gridToPixel = getCellCenter;

    /** SVG path through cell centers + arrowhead. */
    function buildArrowSvg(cells, dir, cellSize, pad) {
        if (!cells.length) return { d: "", headX: 0, headY: 0 };

        const w = cellSize * 0.35; // thinner shaft, fixed width
        const pts = cells.map(([r, c]) => getCellCenter(r, c, cellSize, pad));

        const segs = [];
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i+1];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const len = Math.hypot(dx, dy);
            const nx = -dy / len;
            const ny = dx / len;
            segs.push({ a, b, nx, ny });
        }

        const left = [];
        const right = [];

        if (segs.length === 0) {
            // single cell arrow
            const [dr, dc] = DELTA[dir] || [0, 1];
            const nx = -dc;
            const ny = dr;
            left.push({ x: pts[0].x + nx*w/2, y: pts[0].y + ny*w/2 });
            right.push({ x: pts[0].x - nx*w/2, y: pts[0].y - ny*w/2 });
        } else {
            const s0 = segs[0];
            // Tail position is first point, don't extend beyond the cell
            left.push({ x: s0.a.x + s0.nx*w/2, y: s0.a.y + s0.ny*w/2 });
            right.push({ x: s0.a.x - s0.nx*w/2, y: s0.a.y - s0.ny*w/2 });
            
            for (let i = 0; i < segs.length - 1; i++) {
                const s = segs[i];
                const s2 = segs[i+1];
                const bx = s.nx + s2.nx;
                const by = s.ny + s2.ny;
                const blen = Math.hypot(bx, by);
                if (blen > 0.001) {
                    left.push({ x: s.b.x + (bx/blen)*w/2, y: s.b.y + (by/blen)*w/2 });
                    right.push({ x: s.b.x - (bx/blen)*w/2, y: s.b.y - (by/blen)*w/2 });
                } else {
                    left.push({ x: s.b.x + s.nx*w/2, y: s.b.y + s.ny*w/2 });
                    right.push({ x: s.b.x - s.nx*w/2, y: s.b.y - s.ny*w/2 });
                }
            }

            const lastSeg = segs[segs.length-1];
            left.push({ x: lastSeg.b.x + lastSeg.nx*w/2, y: lastSeg.b.y + lastSeg.ny*w/2 });
            right.push({ x: lastSeg.b.x - lastSeg.nx*w/2, y: lastSeg.b.y - lastSeg.ny*w/2 });
        }

        const head = pts[pts.length - 1];
        const [dr, dc] = DELTA[dir] || [0, 1];
        const hl = cellSize * 0.35; // smaller arrowhead
        const hw = cellSize * 0.35; // smaller base width
        const tipX = head.x + dr * hl;
        const tipY = head.y + dc * hl;
        const baseX = head.x - dr * hl * 0.4;
        const baseY = head.y - dc * hl * 0.4;
        const px = dc;
        const py = -dr;

        let d = `M ${left[0].x} ${left[0].y}`;
        for (let i = 1; i < left.length; i++) d += ` L ${left[i].x} ${left[i].y}`;
        d += ` L ${baseX + px*hw/2} ${baseY + py*hw/2}`;
        d += ` L ${tipX} ${tipY}`;
        d += ` L ${baseX - px*hw/2} ${baseY - py*hw/2}`;
        for (let i = right.length - 1; i >= 0; i--) d += ` L ${right[i].x} ${right[i].y}`;
        d += ` Z`;

        return { d, headX: head.x, headY: head.y, tipX, tipY };
    }

    function boardZone(rows, cols, r, c) {
        const edgeR = rows <= 8 ? 1 : 2;
        const edgeC = cols <= 8 ? 1 : 2;
        const top = r < edgeR;
        const bot = r >= rows - edgeR;
        const left = c < edgeC;
        const right = c >= cols - edgeC;
        if (top && left) return "tl";
        if (top && right) return "tr";
        if (bot && left) return "bl";
        if (bot && right) return "br";
        if (top) return "top";
        if (bot) return "bottom";
        if (left) return "left";
        if (right) return "right";
        return "center";
    }

    function zoneSpreadScore(arrows, rows, cols) {
        const zones = new Set();
        for (const a of arrows) {
            for (const [r, c] of a.cells) zones.add(boardZone(rows, cols, r, c));
        }
        return zones.size;
    }

    return {
        DELTA,
        OPPOSITE,
        cellKey,
        parseCellKey,
        normalizeArrow,
        straightArrow,
        pathToArrow,
        getHead,
        translateCells,
        buildOccupancy,
        isOnBoard,
        canEscape,
        countMovable,
        solveLevel,
        validateLayout,
        buildArrowSvg,
        boardZone,
        zoneSpreadScore,
        gridToPixel,
        getCellCenter // Expose the single source of truth
    };
})();
