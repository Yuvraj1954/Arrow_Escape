// IMMEDIATE FIX: Hide and disable the modal overlay immediately to prevent blocking!
(function() {
    const overlay = document.getElementById("gameModalOverlay");
    if (overlay) {
        console.log("ui.js: Initializing game modal overlay...");
        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";
        overlay.hidden = true;
    }
})();

const HEART_FULL_SVG =
    '<svg class="heart-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path class="heart-shape" d="M12 20.5s-6.2-4-8.4-7.2C1.8 10.6 2.6 6.8 5.4 5.4c2-.9 4.2-.2 5.6 1.5.3.4.6.4.9 0 1.4-1.7 3.6-2.4 5.6-1.5 2.8 1.4 3.6 5.2 1.8 8-2.2 3.2-8.3 7.1-8.3 7.1z" fill="currentColor"/>' +
    '<path class="heart-crack" d="M12 8v5M10 10l2 2 2-2" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0"/>' +
    "</svg>";

const HEART_EMPTY_SVG =
    '<svg class="heart-svg heart-svg--empty" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 20.5s-6.2-4-8.4-7.2C1.8 10.6 2.6 6.8 5.4 5.4c2-.9 4.2-.2 5.6 1.5.3.4.6.4.9 0 1.4-1.7 3.6-2.4 5.6-1.5 2.8 1.4 3.6 5.2 1.8 8-2.2 3.2-8.3 7.1-8.3 7.1z" fill="currentColor" opacity="0.2" stroke="currentColor" stroke-width="1.5"/>' +
    "</svg>";

const REWARD_BY_STARS = {
    3: "PERFECT!",
    2: "EXCELLENT!",
    1: "AMAZING!",
    0: "OUTSTANDING!"
};

function formatTime(seconds) {
    const s = Math.max(0, Math.floor(seconds));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return m + ":" + String(r).padStart(2, "0");
}

function formatStarRating(count) {
    const n = Math.max(0, Math.min(3, count));
    let s = "";
    for (let i = 0; i < 3; i++) s += i < n ? "★" : "☆";
    return s;
}

function getRewardTitle(stars) {
    return REWARD_BY_STARS[stars] || REWARD_BY_STARS[3];
}

function renderHearts(container, lives, maxLives) {
    container.classList.add("hearts");
    container.innerHTML = "";

    for (let i = 0; i < maxLives; i++) {
        const span = document.createElement("span");
        const active = i < lives;
        span.className = "heart" + (active ? " heart--full" : " heart--empty");
        span.style.setProperty("--heart-index", String(i));
        span.innerHTML = active ? HEART_FULL_SVG : HEART_EMPTY_SVG;
        container.appendChild(span);
    }

    container.setAttribute("aria-label", `${lives} lives remaining`);
}

function animateHeartLossElement(lostHeart, container, onDone) {
    lostHeart.classList.add("heart--crack");
    const crack = lostHeart.querySelector(".heart-crack");
    if (crack) crack.setAttribute("opacity", "0.85");

    setTimeout(() => {
        lostHeart.classList.remove("heart--crack");
        lostHeart.classList.add("heart--break");
        playSound("heartBreak");

        const rect = lostHeart.getBoundingClientRect();
        const parentRect = container.getBoundingClientRect();

        setTimeout(() => onDone?.(), 400);
    }, 220);
}

function updateLivesDisplay(lives, maxLives, animateLoss) {
    const container = document.getElementById("heartsDisplay");
    if (!container) return;

    if (animateLoss) {
        const lostIndex = lives;
        const lostHeart = container.querySelectorAll(".heart")[lostIndex];

        if (lostHeart && lostHeart.classList.contains("heart--full")) {
            animateHeartLossElement(lostHeart, container, () => {
                renderHearts(container, lives, maxLives);
            });
            return;
        }
    }

    renderHearts(container, lives, maxLives);
}

function showDefeatSequence(callback) {
    const wrap = document.querySelector(".board-wrap");
    if (wrap) wrap.classList.add("board-wrap--defeat-fade");
    shakeBoardDefeat();
    setTimeout(() => {
        showLoseModal();
        callback?.();
    }, 480);
}

const DIFFICULTY_LABELS = {
    easy: "EASY",
    medium: "MEDIUM",
    hard: "HARD",
    insane: "INSANE",
    expert: "HARD",
    master: "INSANE"
};



function updateGameHeader(levelId) {
    const current = document.getElementById("levelCurrent");
    const total = document.getElementById("levelTotal");
    const nameEl = document.getElementById("levelName");
    const game = document.getElementById("game");
    const maxId = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;

    if (current) current.textContent = String(levelId);
    if (total) total.textContent = String(maxId);

    if (nameEl) {
        nameEl.hidden = true;
        nameEl.textContent = "";
        nameEl.removeAttribute("title");
        nameEl.classList.remove("level-name--boss");
    }

    if (game) {
        game.classList.remove("game-screen--boss");
        delete game.dataset.boss;
    }
}

function showGameModal(modalId) {
    console.log("ui.js: showGameModal called for id:", modalId);
    const overlay = document.getElementById("gameModalOverlay");
    const modal = document.getElementById(modalId);
    if (!overlay || !modal) return;

    overlay.hidden = false;
    overlay.style.display = "flex";
    overlay.style.pointerEvents = "auto";
    modal.hidden = false;
    console.log("  overlay.hidden now false, modal.hidden now false");
    requestAnimationFrame(() => {
        console.log("  requestAnimationFrame callback, adding is-visible");
        overlay.classList.add("is-visible");
        modal.classList.add("is-visible");
        console.log("  overlay.classList:", overlay.classList);
        console.log("  modal.classList:", modal.classList);
    });
}

function hideGameModals() {
    console.log("ui.js: hideGameModals called!");
    const overlay = document.getElementById("gameModalOverlay");
    if (!overlay) return;
    console.log("  overlay found, removing classes");

    overlay.classList.remove(
        "is-visible",
        "game-modal-overlay--celebrate",
        "game-modal-overlay--boss-win",
        "game-modal-overlay--defeat"
    );
    overlay.querySelectorAll(".game-modal").forEach(m => m.classList.remove("is-visible"));
    overlay.querySelectorAll(".particle--screen").forEach(p => p.remove());

    const wrap = document.querySelector(".board-wrap");
    if (wrap) {
        wrap.classList.remove("board-wrap--win-glow", "board-wrap--boss-win", "board-wrap--defeat-fade");
    }

    const winModal = document.getElementById("winModal");
    if (winModal) winModal.classList.remove("game-modal--boss-win");

    const container = document.querySelector("#game .game-container");
    if (container) container.classList.remove("game-container--punch");

    // IMMEDIATELY set pointer-events and display to prevent blocking!
    console.log("  Immediately setting overlay.pointerEvents to none and display to none");
    overlay.style.pointerEvents = "none";
    overlay.style.display = "none";
    overlay.hidden = true;
    overlay.querySelectorAll(".game-modal").forEach(m => {
        m.hidden = true;
    });
}

function resetWinStars() {
    const stars = document.querySelectorAll("#winStars .star");
    stars.forEach(star => {
        star.textContent = "☆";
        star.classList.remove("earned");
    });
}

function revealWinStars(count) {
    const stars = document.querySelectorAll("#winStars .star");
    const nextButton = document.getElementById("modalNext");
    if (!stars.length) return;

    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            if (i < count) {
                stars[i].textContent = "★";
                stars[i].classList.add("earned");
                playSound("star");
            }
            // Pulse the next button after last star
            if (i === 2 && nextButton) {
                nextButton.classList.add("pulse");
            }
        }, 300 + i * 200);
    }
}

// Confetti for win screen
function spawnWinConfetti() {
    const container = document.getElementById("confettiContainer");
    if (!container) return;

    const colors = ["#1684f5", "#f0b429", "#e84a6a", "#34c759", "#7c4dff"];
    const numConfetti = 30;

    for (let i = 0; i < numConfetti; i++) {
        const confetti = document.createElement("div");
        confetti.className = "confetti-piece";
        confetti.style.left = Math.random() * 100 + "%";
        confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
        confetti.style.animationDuration = (Math.random() * 1.2 + 1.5) + "s";
        confetti.style.animationDelay = Math.random() * 0.3 + "s";
        container.appendChild(confetti);

        setTimeout(() => confetti.remove(), 3000);
    }
}

function showLoseModal() {
    console.log("ui.js: showLoseModal called");
    const overlay = document.getElementById("gameModalOverlay");
    const gameContainer = document.querySelector("#game .game-container");
    
    playSound("lose");
    if (overlay) overlay.classList.add("game-modal-overlay--defeat");
    
    // Add screen shake
    if (gameContainer) {
        gameContainer.classList.add("game-container--shake");
        setTimeout(() => gameContainer.classList.remove("game-container--shake"), 500);
    }

    showGameModal("loseModal");
}

function showWinModal(stats) {
    console.log("ui.js: showWinModal called");
    const movesEl = document.getElementById("winMoves");
    const starsStatEl = document.getElementById("winStarsStat");
    const coinsStatEl = document.getElementById("winCoinsStat");
    const rewardEl = document.getElementById("winReward");
    const eyebrowEl = document.getElementById("winModalTitle");
    const overlay = document.getElementById("gameModalOverlay");
    const wrap = document.querySelector(".board-wrap");
    const starCount = Math.min(3, Math.max(0, stats?.stars ?? 3));

    if (movesEl) {
        const finalMoves = stats?.moves ?? (gameState?.moveCount ?? 0);
        // Animate move count up
        let current = 0;
        const duration = 800;
        const stepTime = 30;
        const steps = duration / stepTime;
        const increment = finalMoves / steps;
        const timer = setInterval(() => {
            current += increment;
            if (current >= finalMoves) {
                movesEl.textContent = finalMoves;
                clearInterval(timer);
            } else {
                movesEl.textContent = Math.floor(current);
            }
        }, stepTime);
    }
    
    if (starsStatEl) starsStatEl.textContent = String(starCount);
    if (coinsStatEl) coinsStatEl.textContent = `+${stats?.coins ?? 0} 🪙`;
    if (rewardEl) {
        rewardEl.textContent = getRewardTitle(starCount);
    }
    if (eyebrowEl) {
        eyebrowEl.textContent = "LEVEL COMPLETE";
    }

    resetWinStars();

    playSound("win");
    showGameModal("winModal");

    if (overlay) {
        overlay.classList.add("game-modal-overlay--celebrate");
    }

    spawnWinConfetti();
    revealWinStars(starCount);
}

function bindGameModals(handlers) {
    console.log("ui.js: bindGameModals called");
    document.getElementById("modalRetry")?.addEventListener("click", () => {
        console.log("ui.js: modalRetry clicked");
        playSound("click");
        hideGameModals();
        handlers.onRetry?.();
    });

    document.getElementById("modalLevelSelect")?.addEventListener("click", () => {
        console.log("ui.js: modalLevelSelect clicked");
        playSound("click");
        hideGameModals();
        handlers.onLevelSelect?.();
    });

    document.getElementById("modalNext")?.addEventListener("click", () => {
        console.log("ui.js: modalNext clicked");
        playSound("click");
        hideGameModals();
        handlers.onNext?.();
    });

    document.getElementById("modalReplay")?.addEventListener("click", () => {
        console.log("ui.js: modalReplay clicked");
        playSound("click");
        hideGameModals();
        handlers.onReplay?.();
    });

    document.getElementById("btnGoToStore")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
        
        // Show store screen
        const storeScreen = document.getElementById("store");
        if (storeScreen && typeof show === "function") {
            show(storeScreen);
        }
    });

    document.getElementById("btnCloseHintsModal")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
    });
}

function pulseLevelUnlock(levelId) {
    const btn = document.querySelector(`#levelGrid .level-card[data-level="${levelId}"]`);
    if (!btn) return;

    btn.classList.add("level-unlock-pulse");
    playSound("unlock");

    const rect = btn.getBoundingClientRect();
    const grid = document.getElementById("levelGrid");
    const gridRect = grid?.getBoundingClientRect();
    if (gridRect) {
        spawnSparkles(
            rect.left - gridRect.left + rect.width / 2,
            rect.top - gridRect.top + rect.height / 2,
            16
        );
    }

    setTimeout(() => btn.classList.remove("level-unlock-pulse"), 950);
}

function bindArrowHoverSounds() {
    const board = document.getElementById("board");
    if (!board || board.dataset.hoverSound === "1") return;
    board.dataset.hoverSound = "1";

    board.addEventListener("mouseenter", e => {
        const item = e.target.closest(".arrow-maze-item--hint");
        if (item) playHoverSound();
    }, true);
}

function bindStoreUI() {
    const storeItems = document.querySelectorAll(".store-item");
    storeItems.forEach(item => {
        item.addEventListener("click", () => {
            const hints = parseInt(item.dataset.hints, 10);
            const cost = parseInt(item.dataset.cost, 10);
            
            if (typeof buyHints === "function") {
                const success = buyHints(hints, cost);
                if (!success) {
                    item.classList.add("insufficient-funds");
                    setTimeout(() => item.classList.remove("insufficient-funds"), 400);
                }
            }
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindStoreUI);
} else {
    bindStoreUI();
}

// Global click ripple effect
window.addEventListener("mousedown", function(e) {
    // Only show on gameplay screen (or active screens)
    const currentScreen = document.querySelector('.screen.active');
    if (!currentScreen || currentScreen.id !== 'game') return;

    for (let i = 0; i < 2; i++) {
        const ripple = document.createElement("div");
        ripple.className = "global-click-ripple";
        ripple.style.left = e.clientX + "px";
        ripple.style.top = e.clientY + "px";
        ripple.style.animationDelay = (i * 0.08) + "s";
        document.body.appendChild(ripple);

        setTimeout(() => {
            ripple.remove();
        }, 1000);
    }
}, true);
