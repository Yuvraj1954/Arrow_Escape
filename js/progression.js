// progression.js - Tracks levels, streaks, daily login and milestone checks

const MILESTONES = [25, 50, 75, 100];

function updateProgression(levelId) {
    let completedLevels = [];
    try {
        completedLevels = JSON.parse(localStorage.getItem("completedLevels")) || [];
    } catch(e){}

    if (!completedLevels.includes(levelId)) {
        completedLevels.push(levelId);
        localStorage.setItem("completedLevels", JSON.stringify(completedLevels));
        
        // Update stats
        document.getElementById("levelsCompletedCount") && (document.getElementById("levelsCompletedCount").textContent = completedLevels.length);
        
        // Update streak/daily login
        updateDailyLogin();
        
        // Check for milestone
        if (MILESTONES.includes(levelId)) {
            triggerMilestone(levelId);
        }
    }
}

function updateDailyLogin() {
    const today = new Date().toDateString();
    let lastLogin = localStorage.getItem("lastLogin");
    let streak = parseInt(localStorage.getItem("currentStreak") || "0", 10);
    
    if (lastLogin !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastLogin === yesterday.toDateString()) {
            streak++;
        } else {
            streak = 1;
        }
        
        localStorage.setItem("lastLogin", today);
        localStorage.setItem("currentStreak", streak.toString());
        
        const bestStreak = parseInt(localStorage.getItem("bestStreak") || "0", 10);
        if (streak > bestStreak) {
            localStorage.setItem("bestStreak", streak.toString());
        }
    }
    
    // Update UI
    const streakUi = document.getElementById("levelsBestStreakValue");
    if (streakUi) streakUi.textContent = localStorage.getItem("bestStreak") || streak;
}

function triggerMilestone(levelId) {
    // Reveal milestone modal
    const overlay = document.getElementById("gameModalOverlay");
    const modal = document.getElementById("milestoneModal");
    const title = document.getElementById("milestoneModalTitle");
    
    if (overlay && modal && title) {
        if (typeof playSound === "function") playSound("win"); // Reusing win sound
        title.textContent = `Milestone Reached: Level ${levelId}!`;
        
        overlay.hidden = false;
        modal.hidden = false;
        overlay.style.display = "flex";
        overlay.style.pointerEvents = "auto";
        overlay.classList.add("game-modal-overlay--celebrate");
        
        requestAnimationFrame(() => {
            overlay.classList.add("is-visible");
            modal.classList.add("is-visible");
            if (typeof spawnWinConfetti === "function") spawnWinConfetti();
        });
    }
}

// Intercept level completion globally to record progression
const originalShowWinModal = window.showWinModal;
if (originalShowWinModal) {
    window.showWinModal = function(stats) {
        if (window.currentLevel && window.currentLevel.id) {
            updateProgression(window.currentLevel.id);
        }
        return originalShowWinModal.apply(this, arguments);
    };
}

document.addEventListener("DOMContentLoaded", () => {
    updateDailyLogin();
    
    const completedLevels = JSON.parse(localStorage.getItem("completedLevels")) || [];
    document.getElementById("levelsCompletedCount") && (document.getElementById("levelsCompletedCount").textContent = completedLevels.length);
    
    const bestStreak = localStorage.getItem("bestStreak") || "0";
    document.getElementById("levelsBestStreakValue") && (document.getElementById("levelsBestStreakValue").textContent = bestStreak);
});
