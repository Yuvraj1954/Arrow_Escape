// IMMEDIATE FIX: Hide and disable the modal overlay immediately to prevent blocking!
(function() {
    const overlay = document.getElementById("gameModalOverlay");
    if (overlay) {
        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";
        overlay.hidden = true;
    }
})();

const HEART_FULL_SVG =
    '<svg class="heart-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<use href="#icon-heart"/>' +
    '<path class="heart-crack" d="M12 8v5M10 10l2 2 2-2" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity="0"/>' +
    "</svg>";

const HEART_EMPTY_SVG =
    '<svg class="heart-svg heart-svg--empty" viewBox="0 0 24 24" fill="none" aria-hidden="true" opacity="0.3" style="filter: grayscale(1);">' +
    '<use href="#icon-heart"/>' +
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
    for (let i = 0; i < 3; i++) {
        s += `<svg class="star-icon" viewBox="0 0 24 24" width="16" height="16" style="color: ${i < n ? '#fbbf24' : '#9ca3af'};"><use href="${i < n ? '#icon-star' : '#icon-star-outline'}"/></svg>`;
    }
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
    const overlay = document.getElementById("gameModalOverlay");
    const modal = document.getElementById(modalId);
    if (!overlay || !modal) return;

    overlay.hidden = false;
    overlay.style.display = "flex";
    overlay.style.pointerEvents = "auto";
    modal.hidden = false;
    requestAnimationFrame(() => {
        overlay.classList.add("is-visible");
        modal.classList.add("is-visible");
    });
}

function hideGameModals() {
    const overlay = document.getElementById("gameModalOverlay");
    if (!overlay) return;
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
        star.innerHTML = '<svg class="star-icon" viewBox="0 0 24 24" width="32" height="32" style="color:#9ca3af;"><use href="#icon-star-outline"/></svg>';
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
                stars[i].innerHTML = '<svg class="star-icon" viewBox="0 0 24 24" width="32" height="32" style="color:#fbbf24;"><use href="#icon-star"/></svg>';
                stars[i].classList.add("earned");
                // Physical stamp animation class
                stars[i].classList.add("star-stamp");
                playSound("starStamp");
            }
            // Pulse the next button after last star
            if (i === 2 && nextButton) {
                nextButton.classList.add("pulse");
            }
        }, 150 + i * 200); // Faster stamping
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
    const overlay = document.getElementById("gameModalOverlay");
    const gameContainer = document.querySelector("#game .game-container");
    
    playSound("lose");
    if (typeof triggerHaptic === "function") triggerHaptic([50, 50, 50]);
    if (overlay) overlay.classList.add("game-modal-overlay--defeat");
    
    // Add screen shake
    if (gameContainer) {
        gameContainer.classList.add("game-container--shake");
        setTimeout(() => gameContainer.classList.remove("game-container--shake"), 500);
    }

    showGameModal("loseModal");
}

function showWinModal(stats) {
    const movesEl = document.getElementById("winMoves");
    const starsStatEl = document.getElementById("winStarsStat");
    const coinsStatEl = document.getElementById("winCoinsStat");
    const rewardEl = document.getElementById("winReward");
    const eyebrowEl = document.getElementById("winModalTitle");
    const overlay = document.getElementById("gameModalOverlay");
    const wrap = document.querySelector(".board-wrap");
    const starCount = Math.min(3, Math.max(0, stats?.stars ?? 3));

    if (movesEl) {
        movesEl.textContent = stats?.moves ?? (gameState?.moveCount ?? 0);
    }
    
    if (starsStatEl) starsStatEl.textContent = String(starCount);
    if (coinsStatEl) coinsStatEl.innerHTML = `+${stats?.coins ?? 0} <svg class="premium-coin" viewBox="0 0 24 24" width="18" height="18"><use href="#icon-coin"/></svg>`;
    if (rewardEl) {
        rewardEl.textContent = getRewardTitle(starCount);
    }
    if (eyebrowEl) {
        eyebrowEl.textContent = "LEVEL COMPLETE";
    }

    resetWinStars();

    playSound("win");
    if (typeof triggerHaptic === "function") triggerHaptic([30, 50, 30]);
    showGameModal("winModal");

    if (overlay) {
        overlay.classList.add("game-modal-overlay--celebrate");
    }

    spawnWinConfetti();
    revealWinStars(starCount);
}

function bindGameModals(handlers) {
    document.getElementById("modalRetry")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
        handlers.onRetry?.();
    });

    document.getElementById("modalLevelSelect")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
        handlers.onLevelSelect?.();
    });

    document.getElementById("modalNext")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
        handlers.onNext?.();
    });

    document.getElementById("modalReplay")?.addEventListener("click", () => {
        playSound("click");
        hideGameModals();
        handlers.onReplay?.();
    });

    document.querySelectorAll(".btnGoToStore").forEach(btn => {
        btn.addEventListener("click", () => {
            playSound("click");
            hideGameModals();
            
            // Show store screen
            const storeScreen = document.getElementById("store");
            if (storeScreen && typeof show === "function") {
                show(storeScreen);
            }
        });
    });

    document.querySelectorAll(".btnCloseModal").forEach(btn => {
        btn.addEventListener("click", () => {
            playSound("click");
            hideGameModals();
        });
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
    const storeItems = document.querySelectorAll(".store-item, .store-deal-hero");
    storeItems.forEach(item => {
        item.addEventListener("click", () => {
            const cost = parseInt(item.dataset.cost, 10);
            if (isNaN(cost)) return;
            
            let success = false;
            
            if (item.hasAttribute("data-pack")) {
                const hints = parseInt(item.dataset.hints || "0", 10);
                const skips = parseInt(item.dataset.skips || "0", 10);
                const lives = parseInt(item.dataset.lives || "0", 10);
                if (typeof buyPack === "function") {
                    success = buyPack(cost, hints, skips, lives);
                }
            } else if (item.hasAttribute("data-hints")) {
                const hints = parseInt(item.dataset.hints, 10);
                if (typeof buyHints === "function") {
                    success = buyHints(hints, cost);
                }
            } else if (item.hasAttribute("data-skips")) {
                const skips = parseInt(item.dataset.skips, 10);
                if (typeof buySkips === "function") {
                    success = buySkips(skips, cost);
                }
            } else if (item.hasAttribute("data-lives")) {
                const lives = parseInt(item.dataset.lives, 10);
                if (typeof buyPack === "function") {
                    success = buyPack(cost, 0, 0, lives);
                }
            } else if (item.hasAttribute("data-theme") || item.hasAttribute("data-skin")) {
                return; // Let customization.js handle it
            }
            
            if (!success) {
                item.classList.add("insufficient-funds");
                setTimeout(() => item.classList.remove("insufficient-funds"), 400);
            } else {
                item.classList.add("store-item--bought");
                if (typeof playSound === "function") playSound("buy"); // Fallback if buy sound exists
                
                // --- Store Purchase Juice ---
                // Sparkles at the center of the button
                if (typeof spawnSparkles === "function") {
                    const rect = item.getBoundingClientRect();
                    spawnSparkles(rect.left + rect.width / 2, rect.top + rect.height / 2, 20);
                }
                
                // Satisfying haptic punch
                if (typeof triggerHaptic === "function") triggerHaptic([30, 40]);
                
                // Floating coin deduction
                const floatText = document.createElement("div");
                floatText.className = "store-floating-text";
                floatText.innerHTML = `-${cost} <svg viewBox="0 0 24 24" width="20" height="20" style="display:inline-block; vertical-align:middle; margin-left:4px; fill:currentColor;"><use href="#icon-coin"/></svg>`;
                document.body.appendChild(floatText);
                
                const rect = item.getBoundingClientRect();
                floatText.style.left = (rect.left + rect.width / 2) + "px";
                floatText.style.top = (rect.top + 10) + "px";
                
                setTimeout(() => floatText.remove(), 1000);
                
                setTimeout(() => item.classList.remove("store-item--bought"), 400);
            }
        });
    });

    const tabBtns = document.querySelectorAll(".store-tab-btn");
    const panes = document.querySelectorAll(".store-pane");
    const slider = document.getElementById("storeTabSlider");

    tabBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
            if (btn.classList.contains("active")) return;
            
            if (typeof playSound === "function") playSound("click");
            if (typeof triggerHaptic === "function") triggerHaptic(10);

            // Update button states
            tabBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            // Move the slider
            if (slider) {
                slider.style.transform = `translateX(${index * 100}%)`;
            }

            // Update pane states
            const targetPaneId = btn.dataset.pane;
            panes.forEach(pane => {
                if (pane.id === targetPaneId) {
                    pane.classList.add("active");
                } else {
                    pane.classList.remove("active");
                }
            });
        });
    });
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindStoreUI);
} else {
    bindStoreUI();
}

