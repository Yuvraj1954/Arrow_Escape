const AudioEngine = (() => {
    let ctx = null;
    let bgmAudio = null;

    // Base loudness for `bgm.ogg` at `masterVolume = 100`.
    const BGM_BASE_VOLUME = 0.4;

    function getMusicEnabled() {
        if (typeof getSettings !== "function") return false;
        return !!getSettings().music;
    }

    function getMasterVolume() {
        if (typeof getSettings !== "function") return 85;
        const s = getSettings();
        return typeof s.masterVolume === "number" ? s.masterVolume : 85;
    }

    function getBGMVolume() {
        if (!getMusicEnabled()) return 0;
        const master = Math.max(0, Math.min(100, getMasterVolume()));
        // Keep it within [0,1] (HTMLAudioElement.volume).
        return Math.max(0, Math.min(1, BGM_BASE_VOLUME * (master / 100)));
    }

    function syncBGM() {
        if (!bgmAudio) return;

        bgmAudio.volume = getBGMVolume();

        // If music is enabled and the browser paused it, try resuming.
        if (getMusicEnabled()) {
            if (bgmAudio.paused) bgmAudio.play().catch(() => {});
        } else {
            bgmAudio.pause();
        }
    }

    function ensureBGM() {
        if (bgmAudio) return;
        bgmAudio = document.getElementById("bgmAudio");
        if (!bgmAudio) {
            bgmAudio = new Audio("assets/audio/bgm.ogg");
            bgmAudio.loop = true;
            bgmAudio.preload = "auto";
        }
        bgmAudio.volume = getBGMVolume();
    }

    function getVolumeMultiplier() {
        if (typeof getSettings !== "function") return 1.4;
        const s = getSettings();
        if (s.sound === false) return 0;
        const master = typeof s.masterVolume === "number" ? s.masterVolume : 85;
        return (master / 100) * 2.5;
    }

    function getCtx() {
        if (getVolumeMultiplier() <= 0) return null;
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
        return ctx;
    }

    function tone(freq, duration, type, baseGain, ramp) {
        const ac = getCtx();
        if (!ac) return;
        const gain = baseGain * getVolumeMultiplier();

        const osc = ac.createOscillator();
        const vol = ac.createGain();
        osc.type = type || "sine";
        osc.frequency.setValueAtTime(freq, ac.currentTime);
        if (ramp) {
            osc.frequency.exponentialRampToValueAtTime(Math.max(ramp, 40), ac.currentTime + duration);
        }
        vol.gain.setValueAtTime(gain, ac.currentTime);
        vol.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
        osc.connect(vol);
        vol.connect(ac.destination);
        osc.start();
        osc.stop(ac.currentTime + duration + 0.03);
    }

    function noiseBurst(duration, baseGain) {
        const ac = getCtx();
        if (!ac) return;
        const gain = baseGain * getVolumeMultiplier();
        const bufferSize = ac.sampleRate * duration;
        const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }
        const src = ac.createBufferSource();
        src.buffer = buffer;
        const vol = ac.createGain();
        vol.gain.setValueAtTime(gain, ac.currentTime);
        vol.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
        const filter = ac.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 800;
        src.connect(filter);
        filter.connect(vol);
        vol.connect(ac.destination);
        src.start();
    }

    return {
        click() { 
            // Soothing, gentle pop/chime
            tone(400, 0.12, "sine", 0.08, 200); 
        },
        hover() { tone(720, 0.03, "sine", 0.03); },
        remove() {
            // Ultra-soothing gentle release tone (slightly louder)
            tone(600, 0.16, "sine", 0.035, 900);
        },
        playBGM() {
            ensureBGM();
            bgmAudio.volume = getBGMVolume();
            if (getMusicEnabled()) {
                bgmAudio.play().catch(() => {});
            } else {
                bgmAudio.pause();
            }
        },
        pauseBGM() {
            if (bgmAudio) {
                bgmAudio.pause();
                bgmAudio.volume = 0;
            }
        },
        syncBGM,
        invalid() {
            tone(200, 0.14, "square", 0.08, 100);
            noiseBurst(0.07, 0.04);
        },
        heartLoss() { tone(320, 0.12, "triangle", 0.07, 180); },
        heartBreak() {
            tone(260, 0.18, "triangle", 0.1, 130);
            setTimeout(() => noiseBurst(0.09, 0.04), 70);
        },
        star() {
            const base = 900 + Math.random() * 100;
            tone(base, 0.1, "sine", 0.11, base + 300);
        },
        starStamp() {
            // A satisfying physical thud + bright chime
            tone(150, 0.15, "triangle", 0.15, 80); // thud
            setTimeout(() => tone(1200 + Math.random() * 200, 0.2, "sine", 0.1, 1800), 20); // chime
        },
        win() {
            // Richer victory chord
            tone(523, 0.2, "triangle", 0.1);
            setTimeout(() => tone(659, 0.2, "triangle", 0.1), 80);
            setTimeout(() => tone(784, 0.2, "triangle", 0.1), 160);
            setTimeout(() => {
                tone(1047, 0.4, "sine", 0.15);
                tone(523, 0.4, "sine", 0.1);
            }, 240);
        },
        bossWin() {
            const notes = [523, 659, 784, 988, 1175];
            notes.forEach((freq, i) => {
                setTimeout(() => tone(freq, 0.14, "sine", 0.12), i * 95);
            });
            setTimeout(() => tone(notes[notes.length - 1], 0.35, "triangle", 0.1), notes.length * 95);
        },
        lose() {
            // Soft woosh/thud instead of harsh negative beeps
            tone(200, 0.2, "sine", 0.08, 100);
            setTimeout(() => tone(150, 0.3, "sine", 0.06, 50), 100);
        },
        unlock() {
            tone(880, 0.08, "sine", 0.1, 1400);
            setTimeout(() => tone(1100, 0.1, "sine", 0.09, 1500), 75);
            setTimeout(() => tone(1320, 0.12, "sine", 0.08), 150);
        },
        buy() {
            // Soft calming chime
            tone(500, 0.15, "sine", 0.05, 600);
            setTimeout(() => tone(750, 0.2, "sine", 0.06, 900), 100);
        }
    };
})();

function playSound(name, arg) {
    const fn = AudioEngine[name];
    if (typeof fn === "function") fn(arg);
}

let lastHoverSound = 0;
function playHoverSound() {
    const now = Date.now();
    if (now - lastHoverSound < 100) return;
    lastHoverSound = now;
    playSound("hover");
}

function bindSoundOnClick(selector, soundName) {
    document.querySelectorAll(selector).forEach(el => {
        if (el.dataset.soundBound === "1") return;
        el.dataset.soundBound = "1";
        el.addEventListener("click", () => {
            playSound(soundName);
            if (typeof triggerHaptic === "function") triggerHaptic(10);
        });
    });
}

function unlockAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const c = new Ctx();
    c.resume().then(() => c.close()).catch(() => c.close());
}

function initAudio() {
    document.body.addEventListener("click", unlockAudio, { once: true });
    document.body.addEventListener("touchstart", unlockAudio, { once: true, passive: true });

    // Autoplay with sound is usually blocked until the first user gesture.
    // Start BGM on the first interaction anywhere (unless we're on Settings).
    const startBgmOnFirstGesture = () => {
        const active = document.querySelector(".screen.active");
        if (active?.id === "settings") return;
        playSound("playBGM");
    };
    document.body.addEventListener("pointerdown", startBgmOnFirstGesture, { once: true });

    bindSoundOnClick(
        ".icon-btn, .main-btn, #home .card-btn, .game-modal-btn, #levels .level-card:not(.is-locked)",
        "click"
    );
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAudio);
} else {
    initAudio();
}
