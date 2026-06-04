const home = document.getElementById("home");
const levelsScreen = document.getElementById("levels");
const game = document.getElementById("game");
const settingsScreen = document.getElementById("settings");
const storeScreen = document.getElementById("store");

const screens = [home, levelsScreen, game, settingsScreen, storeScreen].filter(Boolean);

function show(screen) {
    console.log("=== app.js: show() ===");
    console.log("  called for screen.id =", screen.id);
    console.log("  screen:", screen);
    console.log("  current screens:", screens.map(s => ({id: s.id, active: s.classList.contains("active")})));
    
    screens.forEach(s => s.classList.remove("active"));
    screen.classList.add("active");

    // Start/stop BGM on screen changes:
    // - Play everywhere except the Settings screen.
    if (typeof playSound === "function") {
        if (screen?.id === "settings") {
            playSound("pauseBGM");
        } else {
            playSound("playBGM");
        }
    }
    
    console.log("  after show:");
    screens.forEach(s => {
        const computed = window.getComputedStyle(screen);
        console.log("  screen", screen.id, "display:", computed.display);
        console.log("  screen", screen.id, "classList:", screen.classList);
        console.log("  screen", screen.id, "pointerEvents:", computed.pointerEvents);
        console.log("  screen", screen.id, "width:", screen.offsetWidth, "height:", screen.offsetHeight);
    });
}

// Start BGM for the initial screen (home) unless we begin in Settings.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        const active = document.querySelector(".screen.active");
        if (active?.id === "settings") {
            playSound("pauseBGM");
        } else {
            playSound("playBGM");
        }
    });
} else {
    const active = document.querySelector(".screen.active");
    if (active?.id === "settings") {
        playSound("pauseBGM");
    } else {
        playSound("playBGM");
    }
}

document.getElementById("playBtn").addEventListener("click", () => {
    console.log("PLAY CLICK");
    playSound("click");
    console.log("playBtn: clicked, checking functions...");
    console.log("  typeof getProgress == function?", typeof getProgress === "function");
    console.log("  typeof loadLevel == function?", typeof loadLevel === "function");
    console.log("  typeof getMaxLevelId == function?", typeof getMaxLevelId === "function");
    
    levelsReady.then(() => {
        console.log("playBtn: levelsReady.then() callback");
        const p = typeof getProgress === "function" ? getProgress() : { unlockedLevel: 1 };
        const maxId = getMaxLevelId() || 100;
        const startId = Math.min(p.unlockedLevel || 1, maxId);
        console.log("  p.unlockedLevel =", p.unlockedLevel);
        console.log("  maxId =", maxId);
        console.log("  startId =", startId);
        
        if (typeof loadLevel === "function") {
            console.log("playBtn: calling loadLevel(", startId, ")");
            loadLevel(startId);
        }
        console.log("playBtn: calling show(game)");
        show(game);
    });
});

document.getElementById("levelsBtn").addEventListener("click", () => {
    console.log("LEVEL SELECT OPEN");
    playSound("click");
    show(levelsScreen);
});

document.getElementById("settingsBtn").addEventListener("click", () => {
    console.log("app.js: settingsBtn clicked");
    playSound("click");
    show(settingsScreen);
});

document.getElementById("storeBtn")?.addEventListener("click", () => {
    playSound("click");
    show(storeScreen);
});

document.getElementById("backFromStore")?.addEventListener("click", () => {
    playSound("click");
    show(home);
});

document.getElementById("backHome").addEventListener("click", () => {
    console.log("RETURN HOME");
    playSound("click");
    show(home);
});

document.getElementById("backHomeFromSettings").addEventListener("click", () => {
    console.log("RETURN HOME (from settings)");
    playSound("click");
    show(home);
});

document.getElementById("backLevels").addEventListener("click", () => {
    console.log("RETURN LEVELS");
    playSound("click");
    show(levelsScreen);
});

document.getElementById("openSettingsFromGame")?.addEventListener("click", () => {
    console.log("app.js: openSettingsFromGame clicked");
    playSound("click");
    show(settingsScreen);
});

function buildLevelGrid() {
    console.log("app.js: buildLevelGrid() called");
    const levelGrid = document.getElementById("levelGrid");
    if (!levelGrid) return;

    const maxPlayable = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;

    levelGrid.dataset.built = "1";
    levelGrid.innerHTML = "";
    console.log("  levelGrid.innerHTML cleared, building up to level", maxPlayable);

    for (let i = 1; i <= maxPlayable; i++) {
        const tier =
            typeof getDifficultyTier === "function" ? getDifficultyTier(i) : "easy";
        const lvl = typeof getLevelById === "function" ? getLevelById(i) : null;
        const isBoss = Boolean(lvl?.boss);
        const btn = document.createElement("button");
        btn.className = "level-card" + (isBoss ? " level-card--boss" : "");
        btn.dataset.level = String(i);
        if (isBoss && lvl?.title) btn.title = lvl.title;
        btn.innerHTML =
            (isBoss ? '<span class="level-card-boss" aria-hidden="true">✦</span>' : '') +
            '<span class="level-card-num">' +
            String(i).padStart(2, "0") +
            "</span>" +
            '<span class="level-card-stars" aria-hidden="true"></span>';

        btn.addEventListener("click", () => {
            console.log("LEVEL CARD CLICK for level", i);
            console.log("  btn.classList:", btn.classList);
            console.log("  btn.disabled:", btn.disabled);
            if (btn.classList.contains("is-locked") || btn.disabled) return;
            playSound("click");
            const id = Number(btn.dataset.level);
            levelsReady.then(() => {
                console.log("  level card: levelsReady.then() callback");
                if (typeof loadLevel === "function") {
                    console.log("  level card: calling loadLevel(", id, ")");
                    loadLevel(id);
                }
                console.log("  level card: calling show(game)");
                show(game);
            });
        });

        console.log("  appended level card", i);
        levelGrid.appendChild(btn);
    }
}

levelsReady.then(() => {
    console.log("app.js: initial levelsReady.then() callback");
    buildLevelGrid();
    if (typeof updateLevelsScreenStats === "function") {
        updateLevelsScreenStats();
    }
});

// Global click catcher to log all clicks
document.addEventListener('click', (e) => {
    console.log('GLOBAL CLICK RECEIVED');
    console.log('  target:', e.target);
    console.log('  target.tagName:', e.target.tagName);
    console.log('  pointerEvents on target:', window.getComputedStyle(e.target).pointerEvents);
    let el = e.target;
    while (el) {
        const style = window.getComputedStyle(el);
        console.log('  el:', el, 'pointerEvents:', style.pointerEvents, 'display:', style.display, 'zIndex:', style.zIndex);
        el = el.parentElement;
    }
}, true);

