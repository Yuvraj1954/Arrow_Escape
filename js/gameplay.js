let currentLevel = 1;
window.currentLevel = null; // For easy access in other modules
let lives = 3;
let gameState = null;
let inputLocked = false;
let moveCount = 0;
let mistakeCount = 0;
let levelStartTime = 0;
let timerInterval = null;

window.levelCache = new Map();

async function precacheNextLevels(currentId) {
    // No-op. Levels are pre-bundled in levels_bundle.json and loaded instantly.
}

async function generateAndCacheLevel(level) {
    // No-op. Levels are pre-bundled.
}

/**
 * DEBUG MODE: Arrow Selection Visualization
 * 
 * Shows semi-transparent green hitboxes for all arrows on the board.
 * Useful for testing selection responsiveness and debugging click issues.
 * 
 * Toggle in console:
 *   toggleHitboxes()
 * 
 * Or directly:
 *   window.showHitboxes = true/false
 * 
 * When enabled, hitboxes are rebuilt on level load with debug visualization.
 */

// Debug mode: Display hitbox visualization
window.showHitboxes = false;

/**
 * Toggle debug hitbox visualization
 * Usage in console: toggleHitboxes()
 */
function toggleHitboxes() {
    window.showHitboxes = !window.showHitboxes;
    // Rebuild board to apply/remove debug visualization
    if (gameState && window.currentLevel) {
        const board = document.getElementById("board");
        if (board) {
            const wrap = board.querySelector(".board-wrap");
            createBoard(window.currentLevel);
            bindBoardClicks();
        }
    }
    return window.showHitboxes;
}

// Expose to window for console access
window.toggleHitboxes = toggleHitboxes;

function handleResizeOrOrientation() {
    if (gameState) {
        fitBoardToScreen(window.currentLevel);
    }
}

window.addEventListener("resize", handleResizeOrOrientation);
window.addEventListener("orientationchange", handleResizeOrOrientation);

const FLY_MS = 180;
const TAP_MS = 50;
const FLASH_MS = 50;

function buildGameState(level) {
    window.currentLevel = level; // Save for other modules
    const rows = level.rows || level.size || 4;
    const cols = level.cols || level.size || 4;
    const arrows = level.arrows.map((a, i) => {
        const norm = ArrowMaze.normalizeArrow(a, i);
        return {
            id: norm.id,
            cells: norm.cells.map(([r, c]) => [r, c]),
            dir: norm.dir,
            removing: false
        };
    });

    return {
        levelId: level.id,
        rows,
        cols,
        lives: level.lives ?? 3,
        maxLives: level.lives ?? 3,
        arrows
    };
}

function getArrowById(state, id) {
    return state.arrows.find(a => !a.removing && a.id === id);
}

function refreshMovableArrows() {
    // Temporarily disabled arrow glow/hint styling
    // if (!gameState) return;
    // const showHints = typeof getSettings === "function" ? getSettings().hints !== false : true;

    // document.querySelectorAll(".arrow-maze-item").forEach(item => {
    //     const arrowId = item.dataset.arrowId;
    //     const arrow = gameState.arrows.find(a => String(a.id) === String(arrowId));
    //     item.classList.remove("arrow-maze-item--hint");
    //     const arrowPath = item.querySelector("path[fill]");
    //     if (showHints && arrow && !arrow.removing && ArrowMaze.canEscape(arrow, gameState.arrows, gameState.rows, gameState.cols)) {
    //         item.classList.add("arrow-maze-item--hint");
    //         if (arrowPath) arrowPath.setAttribute("fill", "#43a0ff");
    //     } else {
    //         if (arrowPath) arrowPath.setAttribute("fill", "#18245A");
    //     }
    // });
}

function computeMazeFlyEscape(item, dir, wrap) {
    const svg = wrap?.querySelector(".arrow-maze-svg");
    const pastEdge = 300; // even longer to fully leave white box!
    if (!svg || !wrap) return [500, 0];

    const itemRect = item.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();

    const cx = itemRect.left + itemRect.width / 2 - wrapRect.left;
    const cy = itemRect.top + itemRect.height / 2 - wrapRect.top;
    const gx = svgRect.left - wrapRect.left;
    const gy = svgRect.top - wrapRect.top;

    switch (dir) {
        case "right":
            return [gx + svgRect.width - cx + pastEdge, 0];
        case "left":
            return [-(cx - gx) - pastEdge, 0];
        case "down":
            return [0, gy + svgRect.height - cy + pastEdge];
        case "up":
            return [0, -(cy - gy) - pastEdge];
        default:
            return [240, 0];
    }
}

function createExitFlash(item) {
    const wrap = item.closest(".board-wrap");
    const rect = item.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    
    const centerX = rect.left - wrapRect.left + rect.width / 2;
    const centerY = rect.top - wrapRect.top + rect.height / 2;
    
    const flash = document.createElement("div");
    flash.classList.add("arrow-exit-flash");
    flash.style.left = centerX + "px";
    flash.style.top = centerY + "px";
    
    wrap.appendChild(flash);
    
    setTimeout(() => {
        flash.remove();
    }, 80);
}

function animateFlyOff(item, dir, onComplete) {
    
    // Play soft airy whoosh
    playSound("remove");
    
    // Set CSS variables for animation
    item.classList.add("arrow-maze-item--escaping");
    
    const shaft = item.querySelector(".arrow-shaft");
    const head = item.querySelector(".arrow-head");
    
    const dist = parseFloat(item.dataset.escapeDist || "280");
    const dc = parseFloat(item.dataset.dc || "0");
    const dr = parseFloat(item.dataset.dr || "0");
    
    const durStr = item.dataset.escapeDuration || "0.85";
    const durMs = parseFloat(durStr) * 1000;
    
    // Set dynamic fade duration
    item.style.animationDuration = `${durStr}s`;

    if (shaft) {
        // Trigger CSS transition for the snaking effect
        // Request animation frame ensures the browser applies the initial state before transitioning
        requestAnimationFrame(() => {
            shaft.style.strokeDashoffset = `-${dist}px`;
        });
    }
    
    if (head) {
        requestAnimationFrame(() => {
            head.style.transform = `translate(${dc * dist}px, ${dr * dist}px)`;
        });
    }
    
    // Clear inline transform
    item.style.transform = "";
    
    // Call onComplete after animation is done
    setTimeout(() => {
        item.remove();
        onComplete?.();
    }, durMs);
}

function handleWrongMove(item, onComplete) {
    mistakeCount++;
    const maxLives = gameState?.maxLives ?? 3;

    // Use bump based on item's direction
    const dc = parseFloat(item.dataset.dc || "0");
    const dr = parseFloat(item.dataset.dr || "0");
    item.style.setProperty("--bump-x", dc);
    item.style.setProperty("--bump-y", dr);
    
    item.classList.add("arrow-maze-item--wrong-bump");
    item.classList.add("arrow-maze-item--stuck");
    playSound("invalid");

    // Spawn error particles
    if (typeof boardParticleCoords === "function" && typeof spawnParticles === "function") {
        const coords = boardParticleCoords(item);
        if (coords) spawnParticles(coords.x, coords.y, { count: 12, color: "#ef4444", spread: 28 });
    }

    setTimeout(() => item.classList.remove("arrow-maze-item--wrong-bump"), 400);

    setTimeout(() => {
        lives--;
        updateLivesDisplay(lives, maxLives, true);

        if (navigator.vibrate) {
            try { navigator.vibrate(40); } catch (_) { /* ignore */ }
        }

        if (lives <= 0) {
            inputLocked = true;
            stopLevelTimer();
            
            // STREAK LOGIC: Reset current streak on level loss
            if (typeof getProgress === "function" && typeof saveProgress === "function") {
                const prog = getProgress();
                prog.currentStreak = 0;
                saveProgress(prog);
                if (typeof updateHomeStats === "function") updateHomeStats();
            }
            
            setTimeout(() => showDefeatSequence(onComplete), 520);
        } else {
            onComplete?.();
        }
    }, 300);
}

function remainingArrows(state) {
    return state.arrows.filter(a => !a.removing);
}

function getLevelElapsedSeconds() {
    return levelStartTime ? Math.floor((Date.now() - levelStartTime) / 1000) : 0;
}

function stopLevelTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function checkWin(state) {
    if (remainingArrows(state).length === 0) {
        stopLevelTimer();
        // Trigger shape reveal animation
        if (typeof window.triggerShapeReveal === "function" && window.currentLevel) {
            window.triggerShapeReveal(window.currentLevel);
        }
        const stats = { moves: moveCount, time: getLevelElapsedSeconds() };
        // Delay to allow shape reveal (≈720ms total)
        setTimeout(() => {
            inputLocked = true;
            const starCount = calcStarsFromLives(lives, gameState?.maxLives ?? 3);
            const result = completeLevel(state.levelId, { ...stats, stars: starCount });
            showWinModal({ ...stats, stars: starCount, levelId: state.levelId, coins: result.earnedCoins });
            if (result.nextUnlock) pulseLevelUnlock(result.nextUnlock);
        }, 720);
    }
}

function calcStarsFromLives(livesLeft, maxLives) {
    if (livesLeft >= maxLives) return 3;
    if (livesLeft >= maxLives - 1) return 2;
    if (livesLeft >= maxLives - 2) return 1;
    return 0;
}

function completeLevel(levelId, stats) {
    const maxId = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;
    const prev = typeof getProgress === "function" ? getProgress() : { unlockedLevel: 1, completedLevels: [], stars: {} };
    const completed = new Set(prev.completedLevels || []);

    // Check if this is a NEW completion (not a replay)
    const isNewCompletion = !completed.has(levelId);

    for (let i = 1; i <= (prev.levelsCleared || 0); i++) completed.add(i);
    completed.add(levelId);

    const completedArr = Array.from(completed).filter(id => id <= maxId).sort((a, b) => a - b);
    const nextUnlock = Math.min(levelId + 1, maxId + 1);
    const unlockedLevel = Math.max(prev.unlockedLevel || 1, nextUnlock);
    const wasLocked = (prev.unlockedLevel || 1) < nextUnlock && nextUnlock <= maxId;

    const stars = { ...(prev.stars || {}) };
    const oldStarCount = stars[String(levelId)] || 0;
    const starCount = stats.stars ?? calcStarsFromLives(lives, gameState?.maxLives ?? 3);
    stars[String(levelId)] = Math.max(oldStarCount, starCount);

    const bestMoves = { ...(prev.bestMoves || {}) };
    const key = String(levelId);
    const moves = stats.moves ?? 0;
    if (!bestMoves[key] || moves < bestMoves[key]) {
        bestMoves[key] = moves;
    }

    // STREAK LOGIC: Increment streak only on NEW completions (not replays)
    // and only if no lives were lost (perfect level)
    let currentStreak = (prev.currentStreak || 0);
    let bestStreak = (prev.bestStreak || 0);
    
    if (isNewCompletion && starCount > 0) {
        // New completion with at least 1 star (meaning no all-lives lost)
        currentStreak++;
        
        // Check if we beat the best streak
        if (currentStreak > bestStreak) {
            bestStreak = currentStreak;
        }
    }

    // COINS LOGIC: Award coins for NEW stars earned (100 coins per star)
    let earnedCoins = 0;
    if (starCount > oldStarCount) {
        earnedCoins = (starCount - oldStarCount) * 100;
    }
    const coins = (prev.coins ?? 1000) + earnedCoins;

    if (typeof saveProgress === "function") {
        saveProgress({
            completedLevels: completedArr,
            levelsCleared: completedArr.length,
            unlockedLevel,
            stars,
            bestMoves,
            currentStreak,
            bestStreak,
            coins
        });
    }

    if (typeof updateHomeStats === "function") updateHomeStats();

    return { 
        nextUnlock: wasLocked ? nextUnlock : null,
        earnedCoins
    };
}

function onArrowClick(item) {
    if (inputLocked || !gameState) return;

    const arrow = getArrowById(gameState, item.dataset.arrowId);
    if (!arrow || arrow.removing) return;

    inputLocked = true;
    moveCount++;

    if (ArrowMaze.canEscape(arrow, gameState.arrows, gameState.rows, gameState.cols)) {
            arrow.removing = true;
            playSound("click");
            if (typeof triggerHaptic === "function") triggerHaptic(15);
            
            completeTutorial();

            // Spawn glow burst effect on click
            if (typeof boardParticleCoords === "function" && typeof spawnGlowBurst === "function") {
                const coords = boardParticleCoords(item);
                if (coords) spawnGlowBurst(coords.x, coords.y);
            }

            // Step 1: Release (scale up)
            item.classList.add("arrow-maze-item--tap");
            
            setTimeout(() => {
                // Escape!
                item.classList.remove("arrow-maze-item--tap");
                // Add placeholder dots immediately
                arrow.cells.forEach(([r, c]) => addPlaceholderDot(r, c));
                
                // Spawn escape trail
                if (typeof boardParticleCoords === "function" && typeof spawnEscapeTrail === "function") {
                    const coords = boardParticleCoords(item);
                    const durStr = item.dataset.escapeDuration || "0.85";
                    if (coords) spawnEscapeTrail(coords.x, coords.y, arrow.dir, 400, parseFloat(durStr) * 1000);
                }
                
                animateFlyOff(item, arrow.dir, () => {
                    refreshMovableArrows();
                    inputLocked = false;
                    checkWin(gameState);
                });
            }, 80);
        } else {
        handleWrongMove(item, () => {
            refreshMovableArrows();
            inputLocked = false;
        });
    }
}

function bindBoardClicks() {
    const board = document.getElementById("board");
    if (!board || board.dataset.bound === "1") return;
    board.dataset.bound = "1";

    board.addEventListener("click", e => {
        const isSuppressed = typeof isBoardZoomSuppressingClick === "function" && isBoardZoomSuppressingClick();
        if (isSuppressed) {
            return;
        }
        
        // Try to find the hitbox first (per-cell hitbox from our improved selection)
        const hit = e.target.closest(".arrow-maze-hit");
        
        // If hit found, get its parent arrow group
        // If not, try to find arrow directly (backward compatibility)
        const item = hit?.closest(".arrow-maze-item") || e.target.closest(".arrow-maze-item");
        
        if (item) {
            onArrowClick(item);
        }
    }, false);
}

async function loadLevel(id) {
    try {
        const level = typeof getLevelById === "function" ? getLevelById(id) : null;
        
        if (!level) {
            return;
        }

        // Levels are pre-bundled and fully populated from levels_bundle.json.
        // No runtime generation required!

        currentLevel = id;
        
        hideGameModals();
        
        inputLocked = false;
        moveCount = 0;
        mistakeCount = 0;
        levelStartTime = Date.now();
        stopLevelTimer();

        if (typeof destroyBoardZoom === "function") destroyBoardZoom();

        const boardView = createBoard(level);
        
        gameState = buildGameState(level);
        
        lives = gameState.lives;
        
        updateLivesDisplay(lives, gameState.maxLives, false);
        updateGameHeader(id);

        if (boardView?.transform && typeof initBoardZoom === "function") {
            initBoardZoom(boardView.wrap, boardView.transform, level);
        }

        refreshMovableArrows();
        
        checkTutorial();
        
        precacheNextLevels(id);
        
    } catch (error) {
    }
}

function initGameplay() {
    bindBoardClicks();
    bindArrowHoverSounds();

    bindGameModals({
        onRetry: () => {
            inputLocked = false;
            loadLevel(currentLevel);
        },
        onLevelSelect: () => {
            inputLocked = false;
            document.getElementById("backLevels")?.click();
        },
        onNext: () => {
            inputLocked = false;
            const maxId = getMaxLevelId();
            const next = currentLevel + 1;
            if (next <= maxId) {
                loadLevel(next);
            } else {
                document.getElementById("backLevels")?.click();
            }
        },
        onReplay: () => {
            inputLocked = false;
            loadLevel(currentLevel);
        }
    });

    document.getElementById("btnRestartBoard")?.addEventListener("click", () => {
        if (!inputLocked) {
            playSound("click");
            loadLevel(currentLevel);
        }
    });

    // Removed isolated initHints()
    
    document.getElementById("btnHint")?.addEventListener("click", () => {
        if (inputLocked) return;
        useHint();
    });

    document.getElementById("btnSkip")?.addEventListener("click", () => {
        if (inputLocked) return;
        useSkip();
    });
}

// --- Hint & Skip System Logic ---
function getHints() {
    const p = typeof getProgress === "function" ? getProgress() : null;
    return p?.hints ?? 5;
}

function setHints(amount) {
    const p = typeof getProgress === "function" ? getProgress() : null;
    if (p) {
        p.hints = Math.max(0, parseInt(amount) || 0);
        if (typeof saveProgress === "function") saveProgress(p);
        updateResourceUI();
    }
}

function getSkips() {
    const p = typeof getProgress === "function" ? getProgress() : null;
    return p?.skips ?? 1;
}

function setSkips(amount) {
    const p = typeof getProgress === "function" ? getProgress() : null;
    if (p) {
        p.skips = Math.max(0, parseInt(amount) || 0);
        if (typeof saveProgress === "function") saveProgress(p);
        updateResourceUI();
    }
}

function updateResourceUI() {
    // Update Settings Stats
    if (typeof updateHomeStats === "function") updateHomeStats();
    
    // Update Gameplay Header status row
    const gameHintsEl = document.getElementById("gameplayHintsCount");
    const gameSkipsEl = document.getElementById("gameplaySkipsCount");
    if (gameHintsEl) gameHintsEl.textContent = getHints();
    if (gameSkipsEl) gameSkipsEl.textContent = getSkips();
}

function useHint() {
    if (getHints() <= 0) {
        showHintToast();
        return;
    }
    
    if (!gameState) return;
    
    // Find all arrows that can escape right now
    const movable = gameState.arrows.filter(a => !a.removing && ArrowMaze.canEscape(a, gameState.arrows, gameState.rows, gameState.cols));
    
    // Filter out arrows that are already highlighted
    const unhinted = movable.filter(a => {
        const el = document.querySelector(`.arrow-maze-item[data-arrow-id="${a.id}"]`);
        return el && !el.classList.contains("is-hinted");
    });
    
    if (unhinted.length > 0) {
        // Pick a random available arrow
        const target = unhinted[Math.floor(Math.random() * unhinted.length)];
        const el = document.querySelector(`.arrow-maze-item[data-arrow-id="${target.id}"]`);
        if (el) {
            playSound("unlock"); // Much more rewarding sound
            if (typeof triggerHaptic === "function") triggerHaptic([20, 30, 20]);
            el.classList.add("is-hinted");
            setHints(getHints() - 1);
            
            // Add a satisfying particle burst on the hinted arrow
            if (typeof boardParticleCoords === "function" && typeof spawnGlowBurst === "function") {
                const coords = boardParticleCoords(el);
                if (coords) spawnGlowBurst(coords.x, coords.y);
            }
            
            const btnHint = document.getElementById("btnHint");
            if (btnHint) {
                btnHint.classList.add("pulse-hint");
                setTimeout(() => btnHint.classList.remove("pulse-hint"), 250);
            }
        }
    }
}

function useSkip() {
    if (getSkips() <= 0) {
        showSkipToast();
        return;
    }
    
    playSound("star");
    if (typeof triggerHaptic === "function") triggerHaptic([30, 50, 30]);
    setSkips(getSkips() - 1);
    
    // Skip level logic: grant 1 star and show win screen
    stopLevelTimer();
    if (typeof window.triggerShapeReveal === "function" && window.currentLevel) {
        window.triggerShapeReveal(window.currentLevel);
    }
    
    const stats = { moves: moveCount, time: getLevelElapsedSeconds() };
    setTimeout(() => {
        inputLocked = true;
        const result = completeLevel(gameState.levelId, { ...stats, stars: 1 });
        showWinModal({ ...stats, stars: 1, levelId: gameState.levelId, coins: result.earnedCoins });
        if (result.nextUnlock) pulseLevelUnlock(result.nextUnlock);
    }, 720);
}

function showHintToast() {
    const modal = document.getElementById("outOfHintsModal");
    if (modal) {
        if (typeof showGameModal === "function") showGameModal("outOfHintsModal");
        playSound("invalid");
    }
}

function showSkipToast() {
    const modal = document.getElementById("outOfSkipsModal");
    if (modal) {
        if (typeof showGameModal === "function") showGameModal("outOfSkipsModal");
        playSound("invalid");
    }
}

// Shape Discovery Tracking
function shapeDiscovered(level) {
    if (!level) return;
    const name = level.shapeName || 'Shape';
    const storageKey = 'discoveredShapes';
    let discovered = [];
    try {
        const data = localStorage.getItem(storageKey);
        if (data) discovered = JSON.parse(data);
    } catch (e) {
    }
    const alreadyKnown = discovered.includes(name);
    if (!alreadyKnown) {
        discovered.push(name);
        try {
            localStorage.setItem(storageKey, JSON.stringify(discovered));
        } catch (e) {
        }
        showShapeToast(`New shape discovered: ${name}`);
    } else {
        showShapeToast(`You already know the ${name}!`);
    }
}

function showShapeToast(message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'shape-toast';
    toast.textContent = message;
    container.appendChild(toast);
    // trigger CSS transition
    requestAnimationFrame(() => toast.classList.add('show'));
    // auto-dismiss after 2.5s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

window.shapeDiscovered = shapeDiscovered;

function buyHints(amount, cost) {
    const p = typeof getProgress === "function" ? getProgress() : null;
    if (!p) return false;
    
    const bal = p.coins ?? 1000;
    if (bal >= cost) {
        p.coins = bal - cost;
        if (typeof saveProgress === "function") saveProgress(p);
        if (typeof updateCoinDisplays === "function") updateCoinDisplays();
        
        setHints(getHints() + amount);
        playSound("star");
        if (typeof triggerHaptic === "function") triggerHaptic([20, 30, 20]);
        return true;
    } else {
        playSound("invalid");
        return false;
    }
}

function buySkips(amount, cost) {
    const p = typeof getProgress === "function" ? getProgress() : null;
    if (!p) return false;
    
    const bal = p.coins ?? 1000;
    if (bal >= cost) {
        p.coins = bal - cost;
        if (typeof saveProgress === "function") saveProgress(p);
        if (typeof updateCoinDisplays === "function") updateCoinDisplays();
        
        setSkips(getSkips() + amount);
        playSound("star");
        if (typeof triggerHaptic === "function") triggerHaptic([20, 30, 20]);
        return true;
    } else {
        playSound("invalid");
        return false;
    }
}

function buyPack(cost, packHints, packSkips, packLives) {
    const p = typeof getProgress === "function" ? getProgress() : null;
    if (!p) return false;
    
    const bal = p.coins ?? 1000;
    if (bal >= cost) {
        p.coins = bal - cost;
        if (typeof saveProgress === "function") saveProgress(p);
        if (typeof updateCoinDisplays === "function") updateCoinDisplays();
        
        if (packHints > 0) setHints(getHints() + packHints);
        if (packSkips > 0) setSkips(getSkips() + packSkips);
        if (packLives > 0) {
            lives += packLives;
            if (gameState) {
                gameState.maxLives = (gameState.maxLives || 3) + packLives;
            }
            if (typeof updateLivesDisplay === "function") {
                updateLivesDisplay(lives, gameState ? gameState.maxLives : lives, false);
            }
        }
        
        playSound("star");
        if (typeof triggerHaptic === "function") triggerHaptic([30, 50, 80]);
        return true;
    } else {
        playSound("invalid");
        return false;
    }
}

function checkTutorial() {
    if (String(currentLevel) !== "1") return;
    if (localStorage.getItem("arrowEscapeTutorialCompleted") === "true") {
        return;
    }

    // Find the first escapable arrow
    const escapable = gameState.arrows.find(a => ArrowMaze.canEscape(a, gameState.arrows, gameState.rows, gameState.cols));
    if (!escapable) return;

    const el = document.querySelector(`.arrow-maze-item[data-arrow-id="${escapable.id}"]`);
    if (!el) return;

    // Remove old tutorial hands if any
    document.querySelectorAll(".tutorial-hand, .tutorial-hand-wrapper").forEach(h => h.remove());

    const svgLayer = document.querySelector(".arrow-maze-layer") || document.querySelector(".arrow-maze-svg");
    if (!svgLayer) return;

    // Mathematically calculate the absolute center of the head cell
    const pad = 24;
    const cellSize = 50;
    const headCell = escapable.cells[escapable.cells.length - 1];
    
    const minRow = (typeof currentBoardMeta !== "undefined" && currentBoardMeta) ? (currentBoardMeta.minRow || 0) : 0;
    const minCol = (typeof currentBoardMeta !== "undefined" && currentBoardMeta) ? (currentBoardMeta.minCol || 0) : 0;

    const targetX = pad + (headCell[1] - minCol) * cellSize + cellSize / 2;
    const targetY = pad + (headCell[0] - minRow) * cellSize + cellSize / 2;

    const handGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    // Do not use .tutorial-hand class to avoid CSS transform overwrite bug
    handGroup.setAttribute("class", "tutorial-hand-wrapper");
    
    // Scale up and position tip exactly at target center
    handGroup.setAttribute("transform", `translate(${targetX}, ${targetY})`);
    handGroup.setAttribute("pointer-events", "none");
    
    handGroup.innerHTML = `
        <g transform="rotate(-25)">
            <!-- Animated click ripples radiating from the tip (0,0) -->
            <circle cx="0" cy="0" r="1" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0">
                <animate attributeName="r" values="1; 24" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8; 0" dur="1.2s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="1" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0">
                <animate attributeName="r" values="1; 24" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8; 0" dur="1.2s" begin="0.4s" repeatCount="indefinite" />
            </circle>
            <circle cx="0" cy="0" r="1" fill="none" stroke="#0ea5e9" stroke-width="3" opacity="0">
                <animate attributeName="r" values="1; 24" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8; 0" dur="1.2s" begin="0.8s" repeatCount="indefinite" />
            </circle>

            <!-- Bouncing inner group -->
            <g filter="drop-shadow(0px 6px 8px rgba(0,0,0,0.4))">
                <animateTransform attributeName="transform" type="translate" values="0,0; 0,12; 0,0" dur="1s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.2 1; 0.4 0 0.2 1" />
                
                <!-- Custom Retro Cartoon Glove exactly matching user image -->
                <g transform="scale(0.35) translate(-50, -10)">
                    <path d="
                        M 40 20
                        A 10 10 0 0 1 60 20
                        L 60 50
                        A 9 9 0 0 1 76 54
                        A 9 9 0 0 1 90 64
                        A 9 9 0 0 1 96 76
                        C 96 95, 80 100, 65 98
                        Q 55 90 50 98
                        Q 40 105 30 95
                        C 10 85, 5 70, 10 55
                        A 12 12 0 0 1 30 50
                        Q 35 55 40 50
                        Z
                    " fill="#ffffff" stroke="#000000" stroke-width="10" stroke-linejoin="round" stroke-linecap="round"/>
                    
                    <line x1="45" y1="65" x2="45" y2="82" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
                    <line x1="60" y1="65" x2="60" y2="82" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
                    <line x1="75" y1="65" x2="75" y2="82" stroke="#000000" stroke-width="8" stroke-linecap="round"/>
                </g>
            </g>
        </g>
    `;
    
    svgLayer.appendChild(handGroup);

    // Show tutorial text
    const textEl = document.getElementById("tutorialText");
    if (textEl) {
        textEl.hidden = false;
        textEl.style.animation = "tutorialTextFadeIn 0.5s ease-out forwards";
    }
}

function completeTutorial() {
    if (localStorage.getItem("arrowEscapeTutorialCompleted") !== "true") {
        localStorage.setItem("arrowEscapeTutorialCompleted", "true");
        document.querySelectorAll(".tutorial-hand, .tutorial-hand-wrapper").forEach(h => h.remove());
        const textEl = document.getElementById("tutorialText");
        if (textEl) textEl.hidden = true;
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initGameplay);
} else {
    initGameplay();
}
