function getParticleLayer() {
    let layer = document.getElementById("particleLayer");
    if (!layer) {
        layer = document.createElement("div");
        layer.id = "particleLayer";
        layer.className = "particle-layer";
        layer.setAttribute("aria-hidden", "true");
        const parent =
            document.querySelector(".board-viewport") ||
            document.querySelector(".board-wrap") ||
            document.getElementById("board");
        if (parent) parent.appendChild(layer);
    }
    return layer;
}

function spawnParticles(x, y, options = {}) {
    const layer = getParticleLayer();
    const count = options.count ?? 10;
    const color = options.color ?? "#1684f5";
    const spread = options.spread ?? 36;

    for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        p.className = "particle" + (options.kind ? " particle--" + options.kind : "");
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
        const dist = 12 + Math.random() * spread;
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.background = color;
        p.style.setProperty("--dx", dx + "px");
        p.style.setProperty("--dy", dy + "px");

        layer.appendChild(p);
        p.addEventListener("animationend", () => p.remove());
    }
}

function spawnGlowBurst(x, y) {
    const layer = getParticleLayer();
    const ring = document.createElement("span");
    ring.className = "glow-burst";
    ring.style.left = x + "px";
    ring.style.top = y + "px";
    layer.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove());

    const primary = "#1684f5";
    const sparkle = "#7eb8ff";
    spawnParticles(x, y, { count: 18, color: primary, spread: 34 });
    spawnParticles(x, y, { count: 8, color: sparkle, spread: 22, kind: "sparkle" });
}

function spawnArrowTrail(x, y, dir) {
    const layer = getParticleLayer();
    const unit = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0]
    };
    const [ux, uy] = unit[dir] || [0, -1];
    const step = 14;

    for (let i = 0; i < 8; i++) {
        const p = document.createElement("span");
        p.className = "particle particle--trail";
        const along = i * step;
        p.style.left = x + ux * along + "px";
        p.style.top = y + uy * along + "px";
        p.style.background = i < 3 ? "rgba(126, 184, 255, 0.95)" : "rgba(22, 132, 245, 0.75)";
        p.style.setProperty("--dx", ux * 18 + "px");
        p.style.setProperty("--dy", uy * 18 + "px");
        p.style.animationDelay = i * 0.02 + "s";
        layer.appendChild(p);
        p.addEventListener("animationend", () => p.remove());
    }
}

/** Staggered trail while the arrow crosses the board. */
function spawnEscapeTrail(x, y, dir, distance, durationMs) {
    const unit = {
        up: [0, -1],
        down: [0, 1],
        left: [-1, 0],
        right: [1, 0]
    };
    const [ux, uy] = unit[dir] || [0, -1];
    const steps = 6;
    const interval = Math.max(60, Math.floor(durationMs / steps));
    let step = 0;

    const id = setInterval(() => {
        step += 1;
        const t = step / steps;
        const px = x + ux * distance * t * 0.88;
        const py = y + uy * distance * t * 0.88;
        spawnParticles(px, py, {
            count: 2,
            color: "rgba(126, 184, 255, 0.9)",
            spread: 10,
            kind: "trail"
        });
        if (step >= steps) clearInterval(id);
    }, interval);
}

function spawnSparkles(x, y, count = 14) {
    spawnParticles(x, y, { count, color: "#7eb8ff", spread: 42, kind: "sparkle" });
}

function spawnConfetti() {
    const layer = getParticleLayer();
    const rect = layer.getBoundingClientRect();
    const colors = ["#1684f5", "#2a94ff", "#1f2a60", "#7eb8ff", "#ffffff"];
    const count = 80;

    for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        p.className = "particle particle--confetti";
        const x = rect.width * (0.1 + Math.random() * 0.8);
        const y = rect.height * (0.15 + Math.random() * 0.25);
        const dx = (Math.random() - 0.5) * 180;
        const dy = 40 + Math.random() * 120;

        p.style.left = x + "px";
        p.style.top = y + "px";
        p.style.background = colors[i % colors.length];
        p.style.setProperty("--dx", dx + "px");
        p.style.setProperty("--dy", dy + "px");
        p.style.animationDelay = Math.random() * 0.22 + "s";

        layer.appendChild(p);
        p.addEventListener("animationend", () => p.remove());
    }
}

function spawnScreenConfetti() {
    const overlay = document.getElementById("gameModalOverlay");
    if (!overlay) return spawnConfetti();

    const colors = ["#1684f5", "#2a94ff", "#1f2a60", "#7eb8ff", "#ffffff"];
    for (let i = 0; i < 48; i++) {
        const p = document.createElement("span");
        p.className = "particle particle--confetti particle--screen";
        p.style.left = 10 + Math.random() * 80 + "%";
        p.style.top = 8 + Math.random() * 30 + "%";
        p.style.background = colors[i % colors.length];
        p.style.setProperty("--dx", (Math.random() - 0.5) * 120 + "px");
        p.style.setProperty("--dy", 60 + Math.random() * 140 + "px");
        p.style.animationDelay = Math.random() * 0.3 + "s";
        overlay.appendChild(p);
        p.addEventListener("animationend", () => p.remove());
    }
}

function flashBoardWrong() {
    const wrap = document.querySelector(".board-wrap");
    if (wrap) {
        wrap.classList.add("board-flash-wrong");
        setTimeout(() => wrap.classList.remove("board-flash-wrong"), 320);
    }
}

function shakeBoardDefeat() {
    const wrap = document.querySelector(".board-wrap");
    const board = document.getElementById("board");
    if (wrap) {
        wrap.classList.add("board-wrap--defeat-shake");
        setTimeout(() => wrap.classList.remove("board-wrap--defeat-shake"), 520);
    }
    if (board) {
        board.classList.add("board--defeat-shake");
        setTimeout(() => board.classList.remove("board--defeat-shake"), 520);
    }
}

function bumpObstaclesForArrow(_btn) {
    /* maze board has no obstacles */
}

function boardParticleCoords(btn) {
    const wrap = document.querySelector(".board-wrap");
    if (!wrap) return null;

    const item = btn?.closest?.(".arrow-maze-item") || btn;
    if (item?.classList?.contains("arrow-maze-item")) {
        // Use stored center coordinates from dataset (single source of truth)
        const centerX = parseFloat(item.dataset.centerX);
        const centerY = parseFloat(item.dataset.centerY);
        if (!isNaN(centerX) && !isNaN(centerY)) {
            return { x: centerX, y: centerY };
        }
        // Fallback
        return mazeItemCoords(wrap, item.dataset.arrowId);
    }

    const rect = btn.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    return {
        x: rect.left - wrapRect.left + rect.width / 2,
        y: rect.top - wrapRect.top + rect.height / 2
    };
}

function triggerCameraPunch() {
    const container = document.querySelector("#game .game-container");
    if (!container) return;
    container.classList.remove("game-container--punch");
    void container.offsetWidth;
    container.classList.add("game-container--punch");
    setTimeout(() => container.classList.remove("game-container--punch"), 450);
}
