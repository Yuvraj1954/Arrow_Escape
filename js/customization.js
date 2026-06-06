// customization.js - Handles theme customizations

// SKINS removed; arrow colors are now handled by themes
const SKINS = {};

const THEMES = {
    default: {
        '--arrow-color-primary': 'var(--navy)',
        '--arrow-color-secondary': 'var(--title)',
        '--arrow-trail-color': 'rgba(15, 58, 37, 0.4)'
    },
    ocean: {
        '--arrow-color-primary': '#0369a1',
        '--arrow-color-secondary': '#0284c7',
        '--arrow-trail-color': 'rgba(2, 132, 199, 0.4)'
    },
    sunset: {
        '--arrow-color-primary': '#9a3412',
        '--arrow-color-secondary': '#c2410c',
        '--arrow-trail-color': 'rgba(194, 65, 12, 0.4)'
    },
    forest: {
        '--arrow-color-primary': '#166534',
        '--arrow-color-secondary': '#15803d',
        '--arrow-trail-color': 'rgba(21, 128, 61, 0.4)'
    },
    midnight: {
        '--arrow-color-primary': '#4c1d95',
        '--arrow-color-secondary': '#7e22ce',
        '--arrow-trail-color': 'rgba(126, 34, 206, 0.4)'
    },
    sakura: {
        '--arrow-color-primary': '#9d174d',
        '--arrow-color-secondary': '#be185d',
        '--arrow-trail-color': 'rgba(190, 24, 93, 0.4)'
    },
    nebula: {
        '--arrow-color-primary': '#a855f7',
        '--arrow-color-secondary': '#d946ef',
        '--arrow-trail-color': 'rgba(168, 85, 247, 0.4)'
    }
};

function applyTheme(themeName) {
    if (themeName === "gold") themeName = "nebula";
    const theme = THEMES[themeName] || THEMES.default;
    for (const [prop, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(prop, value);
    }
    localStorage.setItem("selectedTheme", themeName);
}

function updateCustomizationUI() {
    const savedTheme = localStorage.getItem("selectedTheme") || "default";
    
    // In case getProgress doesn't exist, provide a fallback
    const prog = typeof getProgress === "function" ? getProgress() : { unlockedThemes: ["default"] };
    const unlockedThemes = prog.unlockedThemes || ["default"];

    const themeButtons = document.querySelectorAll("#themeSelector .store-item");
    themeButtons.forEach(btn => {
        const theme = btn.dataset.theme;
        if (!theme) return;

        const isUnlocked = unlockedThemes.includes(theme);
        const isEquipped = theme === savedTheme;
        const priceSpan = btn.querySelector('.store-item-price') || btn.querySelector(`#theme-price-${theme}`);
        
        if (isEquipped) {
            btn.style.boxShadow = "0 0 0 4px var(--blue)";
            if (priceSpan) priceSpan.innerHTML = "Equipped";
            btn.classList.remove("is-locked");
        } else if (isUnlocked) {
            btn.style.boxShadow = "none";
            if (priceSpan) priceSpan.innerHTML = "Equip";
            btn.classList.remove("is-locked");
        } else {
            btn.style.boxShadow = "none";
            btn.classList.add("is-locked");
            if (priceSpan && !priceSpan.innerHTML.includes("svg")) {
                const cost = parseInt(btn.dataset.cost || "0", 10);
                priceSpan.innerHTML = `<svg class="premium-coin" viewBox="0 0 24 24" width="16" height="16"><use href="#icon-coin"/></svg> ${cost.toLocaleString()}`;
            }
        }
    });
}

function handleCustomizationClick(btn) {
    const id = btn.dataset.theme;
    if (!id) return;
    const cost = parseInt(btn.dataset.cost || "0", 10);
    
    if (typeof getProgress !== "function" || typeof saveProgress !== "function") {
        applyTheme(id);
        updateCustomizationUI();
        return;
    }

    const prog = getProgress();
    const unlockedThemes = prog.unlockedThemes || ["default"];
    
    if (unlockedThemes.includes(id)) {
        if (typeof playSound === "function") playSound("click");
        applyTheme(id);
        updateCustomizationUI();
    } else {
        if (prog.coins >= cost) {
            if (typeof playSound === "function") playSound("buy");
            btn.classList.add("store-item--bought");
            setTimeout(() => btn.classList.remove("store-item--bought"), 600);
            
            // Add satisfying visual juices!
            if (typeof spawnScreenConfetti === "function") spawnScreenConfetti();
            
            prog.coins -= cost;
            unlockedThemes.push(id);
            
            prog.unlockedThemes = unlockedThemes;
            saveProgress({ coins: prog.coins, unlockedThemes: unlockedThemes });
            applyTheme(id);
            
            if (typeof updateHomeStats === "function") updateHomeStats();
            
            updateCustomizationUI();
        } else {
            if (typeof playSound === "function") playSound("invalid");
            btn.classList.add("insufficient-funds");
            setTimeout(() => btn.classList.remove("insufficient-funds"), 400);
        }
    }
}

function initCustomization() {
    const savedTheme = localStorage.getItem("selectedTheme") || "default";
    applyTheme(savedTheme);

    const themeButtons = document.querySelectorAll("#themeSelector .store-item");
    themeButtons.forEach(btn => {
        btn.addEventListener("click", () => handleCustomizationClick(btn));
    });
    
    updateCustomizationUI();
}

document.addEventListener("DOMContentLoaded", initCustomization);
