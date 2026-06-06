let LEVELS = [];

// Helper to convert pointing direction (U/D/L/R) to ArrowMaze direction
function pointingToDir(pointing) {
    const map = {
        "U": "up",
        "D": "down",
        "L": "left",
        "R": "right"
    };
    return map[pointing] || "right";
}

function getDifficultyTier(id) {
    if (id <= 35)  return "easy";
    if (id <= 70)  return "medium";
    return "hard";
}

function normalizeLevel(raw) {
    const rows = raw.rows ?? raw.grid_size ?? raw.size ?? 10;
    const cols = raw.cols ?? raw.grid_size ?? raw.size ?? 10;
    const size = Math.max(rows, cols);
    
    let arrows = [];
    if (raw.arrows && raw.arrows.length > 0 && raw.arrows[0].body !== undefined) {
        arrows = raw.arrows.map((a, i) => {
            let cells = a.body.map(cell => [cell.row, cell.col]).reverse();
            if (a.head) {
                cells.push([a.head.row, a.head.col]);
            }
            const seen = new Set();
            const uniqueCells = [];
            for (const cell of cells) {
                const key = `${cell[0]},${cell[1]}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    uniqueCells.push(cell);
                }
            }
            return {
                id: a.id.toString(),
                cells: uniqueCells,
                dir: pointingToDir(a.pointing)
            };
        });
    } else if (raw.arrows && raw.arrows.length > 0 && raw.arrows[0].cells) {
        arrows = raw.arrows.map((a, i) => ({
            id: a.id ?? `a${i}`,
            cells: a.cells.map(([r, c]) => [r, c]),
            dir: a.dir
        }));
    }

    return {
        id: raw.level ?? raw.id,
        size,
        rows: rows,
        cols: cols,
        lives: raw.lives ?? 3,
        difficulty: raw.difficulty || getDifficultyTier(raw.level ?? raw.id),
        pattern: raw.pattern || raw.shape || "maze",
        arrows,
        archetype: raw.archetype || raw.pattern || "maze",
        title: raw.title || null,
        puzzleIdea: raw.puzzleIdea || null,
        shape: raw.shape || null,
        boss: Boolean(raw.boss),
        bossKey: raw.bossKey || null,
        mechanics: raw.mechanics || { enabled: [], tiles: [] },
        obstacles: []
    };
}

function validateLevelLayout(level) {
    return true;
}

function applyCampaignLevels(rawList) {
    LEVELS = (rawList || []).map(normalizeLevel);
}

async function loadLevelsData() {
    try {
        const response = await fetch("assets/levels/levels_bundle.json?v=" + new Date().getTime());
        const bundle = await response.json();
        
        LEVELS = Object.values(bundle).sort((a, b) => Number(a.id) - Number(b.id));
        
    } catch (error) {
        LEVELS = [];
    }
    const totalCountEl = document.getElementById("levelsTotalCount");
    if (totalCountEl) {
        totalCountEl.textContent = LEVELS.length;
    }
    return LEVELS;
}

const levelsReady = loadLevelsData();

function getLevelById(id) {
    const numId = Number(id);
    return LEVELS.find(level => level.id === numId);
}

function getMaxLevelId() {
    return LEVELS.length;
}

function getFixedGridSize(level) {
    if (level && level.size) return level.size;
    return 10;
}
