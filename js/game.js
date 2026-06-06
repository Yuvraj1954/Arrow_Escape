const home = document.getElementById("home");
const levelsScreen = document.getElementById("levels");
const game = document.getElementById("game");
const settingsScreen = document.getElementById("settings");
const storeScreen = document.getElementById("store");

const screens = [home, levelsScreen, game, settingsScreen, storeScreen].filter(Boolean);

function show(screen) {
    
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
    
    screens.forEach(s => {
        const computed = window.getComputedStyle(screen);
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
    playSound("click");
    
    levelsReady.then(() => {
        const p = typeof getProgress === "function" ? getProgress() : { unlockedLevel: 1 };
        const maxId = getMaxLevelId() || 100;
        const startId = Math.min(p.unlockedLevel || 1, maxId);
        
        if (typeof loadLevel === "function") {
            loadLevel(startId);
        }
        show(game);
    });
});

document.getElementById("levelsBtn").addEventListener("click", () => {
    playSound("click");
    show(levelsScreen);
});

document.getElementById("settingsBtn").addEventListener("click", () => {
    playSound("click");
    lastScreenBeforeSettings = home;
    show(settingsScreen);
});

const storeBtns = [document.getElementById("storeBtn"), document.getElementById("btnHintLevels")];
storeBtns.forEach(btn => {
    btn?.addEventListener("click", () => {
        playSound("click");
        show(storeScreen);
    });
});

document.getElementById("closeStore")?.addEventListener("click", () => {
    playSound("click");
    show(home);
});

document.getElementById("backHome").addEventListener("click", () => {
    playSound("click");
    show(home);
});

document.getElementById("backHomeFromSettings").addEventListener("click", () => {
    playSound("click");
    show(lastScreenBeforeSettings || home);
});

document.getElementById("backLevels").addEventListener("click", () => {
    playSound("click");
    show(levelsScreen);
});

const settingsBtns = [
    document.getElementById("openSettingsFromGame"),
    document.getElementById("openSettingsFromLevels")
];
settingsBtns.forEach(btn => {
    btn?.addEventListener("click", () => {
        playSound("click");
        lastScreenBeforeSettings = levelsScreen.hidden ? game : levelsScreen;
        show(settingsScreen);
    });
});

function buildLevelGrid() {
    const levelGrid = document.getElementById("levelGrid");
    if (!levelGrid) return;

    const maxPlayable = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;

    levelGrid.dataset.built = "1";
    levelGrid.innerHTML = "";
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
            (isBoss ? '<span class="level-card-boss" aria-hidden="true"><svg viewBox="0 0 24 24" width="12" height="12"><use href="#icon-star"/></svg></span>' : '') +
            '<span class="level-card-num">' +
            String(i).padStart(2, "0") +
            "</span>" +
            '<span class="level-card-stars" aria-hidden="true"></span>';

        btn.addEventListener("click", () => {
            if (btn.classList.contains("is-locked") || btn.disabled) return;
            playSound("click");
            const id = Number(btn.dataset.level);
            levelsReady.then(() => {
                if (typeof loadLevel === "function") {
                    loadLevel(id);
                }
                show(game);
            });
        });

        levelGrid.appendChild(btn);
    }
}

levelsReady.then(() => {
    buildLevelGrid();
    if (typeof updateLevelsScreenStats === "function") {
        updateLevelsScreenStats();
    }
});

// Global click catcher to log all clicks
document.addEventListener('click', (e) => {
    let el = e.target;
    while (el) {
        const style = window.getComputedStyle(el);
        el = el.parentElement;
    }
}, true);

