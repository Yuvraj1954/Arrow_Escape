const SETTINGS_KEY = "arrowEscapeSettings";
const PROGRESS_KEY = "arrowEscapeProgress";

const defaultSettings = {
    sound: true,
    music: true,
    hints: true,
    confirmReset: true,
    masterVolume: 85
};

const defaultProgress = {
    unlockedLevel: 1,
    completedLevels: [],
    levelsCleared: 0,
    bestScore: 0,
    stars: {},
    bestMoves: {},
    currentStreak: 0,
    bestStreak: 0,
    coins: 1000
};

function loadJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
    } catch {
        return { ...fallback };
    }
}

function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function normalizeProgress(raw) {
    const p = { ...defaultProgress, ...raw };
    const completed = new Set(p.completedLevels || []);

    if (completed.size === 0 && p.levelsCleared > 0) {
        for (let i = 1; i <= p.levelsCleared; i++) completed.add(i);
    }

    p.completedLevels = Array.from(completed).sort((a, b) => a - b);
    p.levelsCleared = p.completedLevels.length;
    p.stars = p.stars || {};
    p.bestMoves = p.bestMoves || {};
    if (!p.currentStreak) p.currentStreak = 0;
    if (!p.bestStreak) p.bestStreak = 0;
    if (!p.unlockedLevel) p.unlockedLevel = 1;
    if (typeof p.coins !== 'number') p.coins = 1000;

    const maxId = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;
    if (p.unlockedLevel < p.completedLevels.length + 1) {
        p.unlockedLevel = Math.min(p.completedLevels.length + 1, maxId + 1);
    }
    return p;
}

let gameSettings = loadJson(SETTINGS_KEY, defaultSettings);
let progress = normalizeProgress(loadJson(PROGRESS_KEY, defaultProgress));

function getSettings() {
    return gameSettings;
}

function saveSettings(next) {
    gameSettings = { ...gameSettings, ...next };
    saveJson(SETTINGS_KEY, gameSettings);
    applySettingsToUI();
}

function getProgress() {
    return progress;
}

function saveProgress(next) {
    progress = normalizeProgress({ ...progress, ...next });
    saveJson(PROGRESS_KEY, progress);
}

function resetProgress() {
    progress = { ...defaultProgress };
    saveJson(PROGRESS_KEY, progress);
    
    // Reset hints and tutorial flag
    localStorage.setItem("arrowEscapeHints", 5);
    localStorage.removeItem("arrowEscapeTutorialCompleted");
    if (typeof initHints === "function") initHints();
    
    // Update UI immediately after reset
    if (typeof updateHomeStats === "function") updateHomeStats();
    if (typeof updateLevelsScreenStats === "function") updateLevelsScreenStats();
}

function updateVolumeLabel(value) {
    const label = document.getElementById("volumeValue");
    if (label) label.textContent = value + "%";
}

function applySettingsToUI() {
    const sound = document.getElementById("settingSound");
    const music = document.getElementById("settingMusic");
    const confirmReset = document.getElementById("settingConfirmReset");
    const volume = document.getElementById("masterVolume");

    const vol = typeof gameSettings.masterVolume === "number" ? gameSettings.masterVolume : 85;

    if (sound) sound.checked = gameSettings.sound !== false;
    if (music) music.checked = !!gameSettings.music;
    if (confirmReset) confirmReset.checked = gameSettings.confirmReset !== false;
    if (volume) {
        volume.value = String(vol);
        updateVolumeLabel(vol);
    }
}

function updateHomeStats() {
    const best = document.getElementById("homeBestScore");
    const cleared = document.getElementById("homeLevelsCleared");

    if (best) best.textContent = String(progress.bestStreak ?? 0);
    if (cleared) cleared.textContent = String(progress.completedLevels?.length ?? 0);

    updateCoinDisplays();
    updateLevelsScreenStats();
}

function updateCoinDisplays() {
    const homeCoins = document.getElementById("homeCoinBalance");
    const storeCoins = document.getElementById("storeCoinBalance");
    const bal = progress.coins ?? 1000;
    if (homeCoins) homeCoins.textContent = bal.toLocaleString();
    if (storeCoins) storeCoins.textContent = bal.toLocaleString();
}

function formatStarRating(count) {
    const n = Math.max(0, Math.min(3, count));
    let s = "";
    for (let i = 0; i < 3; i++) s += i < n ? "★" : "☆";
    return s;
}

function getTotalStarsEarned(starsMap, maxPlayable) {
    let total = 0;
    for (let i = 1; i <= maxPlayable; i++) {
        total += Math.max(0, Math.min(3, starsMap[String(i)] || 0));
    }
    return total;
}

function updateLevelsScreenStats() {
    const maxPlayable = typeof getMaxLevelId === "function" ? getMaxLevelId() : 100;
    const completedSet = new Set(progress.completedLevels || []);
    const completedCount = completedSet.size;
    const unlocked = progress.unlockedLevel || 1;
    const streak = progress.bestStreak || 0;
    const percent = Math.round((completedCount / maxPlayable) * 100);
    const starsMap = progress.stars || {};
    const totalStars = getTotalStarsEarned(starsMap, maxPlayable);
    const maxStars = maxPlayable * 3;

    const countEl = document.getElementById("levelsCompletedCount");
    const clearedEl = document.getElementById("levelsClearedDisplay");
    const streakEl = document.getElementById("levelsStreakDisplay");
    const percentEl = document.getElementById("levelsPercentDisplay");
    const fillEl = document.getElementById("levelsProgressFill");
    const totalStarsEl = document.getElementById("levelsTotalStars");
    const totalCountEl = document.getElementById("levelsTotalCount");
    const maxStarsEl = document.getElementById("levelsTotalMaxStars");

    if (countEl) countEl.textContent = String(completedCount);
    if (clearedEl) clearedEl.textContent = String(completedCount);
    if (percentEl) percentEl.textContent = percent + "%";
    
    // Update best streak display
    const bestStreakEl = document.getElementById("levelsBestStreakValue");
    if (bestStreakEl) bestStreakEl.textContent = String(streak);
    
    // Show current streak indicator if there's an active streak
    const currentStreak = progress.currentStreak || 0;
    const streakMarkerEl = document.querySelector(".levels-current-streak-marker");
    if (streakMarkerEl) {
        if (currentStreak > 0) {
            streakMarkerEl.textContent = "";
            streakMarkerEl.style.opacity = "0.7";
        } else {
            streakMarkerEl.textContent = "";
        }
    }
    
    if (fillEl) fillEl.style.width = percent + "%";
    if (totalCountEl) totalCountEl.textContent = String(maxPlayable);
    if (maxStarsEl) maxStarsEl.textContent = String(maxStars);
    if (totalStarsEl) totalStarsEl.textContent = totalStars + " / " + maxStars;

    const grid = document.getElementById("levelGrid");
    if (!grid) return;

    let currentId = unlocked;
    for (let i = 1; i <= maxPlayable; i++) {
        if (!completedSet.has(i) && i <= unlocked) {
            currentId = i;
            break;
        }
    }

    grid.querySelectorAll(".level-card").forEach(btn => {
        const level = Number(btn.dataset.level);
        const starsEl = btn.querySelector(".level-card-stars");
        const starCount = starsMap[String(level)] || 0;

        btn.classList.remove("is-completed", "is-current", "is-locked", "is-unlocked");
        btn.disabled = false;

        if (level > unlocked) {
            btn.classList.add("is-locked");
            btn.disabled = true;
            if (starsEl) {
                starsEl.textContent = "";
                starsEl.setAttribute("aria-hidden", "true");
            }
        } else if (completedSet.has(level)) {
            btn.classList.add("is-completed");
            if (starsEl) {
                starsEl.textContent = formatStarRating(starCount);
                starsEl.setAttribute("aria-hidden", "true");
            }
        } else if (level === currentId) {
            btn.classList.add("is-current");
            if (starsEl) {
                starsEl.textContent = "☆☆☆";
                starsEl.setAttribute("aria-hidden", "true");
            }
        } else {
            btn.classList.add("is-unlocked");
            if (starsEl) {
                starsEl.textContent = "☆☆☆";
                starsEl.setAttribute("aria-hidden", "true");
            }
        }
    });
}

function bindSettingsControls() {
    const volume = document.getElementById("masterVolume");
    if (volume) {
        volume.addEventListener("input", () => {
            const val = Number(volume.value);
            saveSettings({ masterVolume: val });
            updateVolumeLabel(val);
            // Keep BGM volume in sync while the slider is dragged.
            if (typeof playSound === "function") playSound("syncBGM");
            playSound("click");
        });
    }

    const map = {
        settingSound: "sound",
        settingMusic: "music",
        settingConfirmReset: "confirmReset"
    };

    Object.entries(map).forEach(([id, key]) => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener("change", () => {
            saveSettings({ [key]: el.checked });
            if (key === "music" && typeof playSound === "function") {
                if (el.checked) {
                    playSound("playBGM");
                } else {
                    playSound("pauseBGM");
                }
            }
            if (key === "hints" && typeof refreshMovableArrows === "function") {
                refreshMovableArrows();
            }
        });
    });

    const resetBtn = document.getElementById("resetProgressBtn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            const ok = confirm("Reset all progress? This cannot be undone.");
            if (!ok) return;

            resetProgress();
            updateHomeStats();
            updateLevelsScreenStats();
        });
    }
}

function initSettings() {
    applySettingsToUI();
    updateHomeStats();
    bindSettingsControls();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initSettings);
} else {
    initSettings();
}
