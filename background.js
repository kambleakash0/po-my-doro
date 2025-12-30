// Background Service Worker

// Constants
const DEFAULTS = {
    settings: { work: 25, short: 5, long: 15, preEndDelta: 1 },
    timer: {
        mode: "work", // work, short_break, long_break
        mode_type: "normal", // normal, focused
        pomodoro_count: 0,
        running: false,
        startTime: null, // timestamp when it started
        targetTime: null, // timestamp when it ends (for alarm)
        duration: 25 * 60 * 1000 // expected duration in ms (for normal mode)
    },
    history: []
};

// Init
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get(["settings", "timer", "history"], (res) => {
        if (!res.settings) chrome.storage.local.set({ settings: DEFAULTS.settings });
        if (!res.timer) chrome.storage.local.set({ timer: DEFAULTS.timer });

        // History Pruning (90 days)
        let history = res.history || [];
        const ninetyDaysAgo = Date.now() - (90 * 24 * 60 * 60 * 1000);
        const originalLen = history.length;
        history = history.filter(h => h.start > ninetyDaysAgo);

        chrome.storage.local.set({ history: history });
        if (originalLen > history.length) console.log("Pruned old history.");
    });
});

// Alarm Listener (Tick)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "timer_end") {
        playSound('play_chime');
        playSound('stop_clock');
        finishSegment("completed");
    } else if (alarm.name === "pre_end_warning") {
        playSound('play_pre_end');
    }
});

// Audio & Offscreen Helpers
const OFFSCREEN_PATH = 'offscreen.html';
let creatingOffscreen;

async function ensureOffscreen() {
    const existing = await chrome.offscreen.hasDocument();
    if (existing) return;

    if (creatingOffscreen) {
        await creatingOffscreen;
    } else {
        creatingOffscreen = chrome.offscreen.createDocument({
            url: OFFSCREEN_PATH,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Play notification sounds for timer events'
        });
        await creatingOffscreen;
        creatingOffscreen = null;
    }
}

function playSound(action) {
    ensureOffscreen().then(() => {
        chrome.runtime.sendMessage({ action: action }).catch(() => { });
    });
}

function finishSegment(status = "completed") {
    chrome.storage.local.get(["timer", "settings", "history"], (data) => {
        const { timer, history } = data;
        const settings = data.settings || DEFAULTS.settings;
        const now = Date.now();

        let durationSecs = 0;
        if (timer.startTime) {
            durationSecs = Math.floor((now - timer.startTime) / 1000);
        }

        // Log History
        history.push({
            start: timer.startTime || now,
            end: now,
            duration: durationSecs,
            type: timer.mode,
            status: status
        });

        // Notify if completed
        if (status === "completed") {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "icons/icon128.png",
                title: "Tomato Cycle",
                message: `${timer.mode.replace("_", " ")} finished!`
            });
        }

        // Interrupted = Stop = Reset Logic, no auto transition usually?
        // User requested: "stop active tracking... back to initial clock screen"
        // So we reset state.
        // Transition Logic
        let nextMode = timer.mode;
        let nextDuration = 0;
        let nextCount = timer.pomodoro_count;

        // FOCUSED MODE LOGIC
        if (timer.mode_type === 'focused') {
            if (status === "interrupted") {
                // Stop button pressed
                nextMode = "work";
                nextCount = 0;
                // Stay stopped
                const defaults = {
                    mode: "work",
                    mode_type: "focused",
                    pomodoro_count: 0,
                    running: false,
                    startTime: null,
                    targetTime: null,
                    duration: 0
                };
                playSound('stop_clock');
                chrome.storage.local.set({ timer: defaults, history: history });
                return;
            } else {
                // "Completed" here means Pause/Resume triggered (manual switch)
                if (timer.mode === 'work') {
                    // Was Work, now Break
                    nextMode = "short_break"; // Use short_break for generic break
                } else {
                    // Was Break, now Work
                    nextMode = "work";
                }

                // Auto-start next leg immediately
                const nextTimer = {
                    mode: nextMode,
                    mode_type: "focused",
                    pomodoro_count: nextCount, // Keep count? irrelevant in focused really
                    running: true,
                    startTime: now,
                    targetTime: null,
                    duration: 0
                };
                chrome.storage.local.set({ timer: nextTimer, history: history });
                return;
            }
        }

        // NORMAL MODE LOGIC
        if (status === "interrupted") {
            chrome.alarms.clear("timer_end");
            const defaults = {
                mode: "work",
                mode_type: "normal", // preserve normal
                pomodoro_count: 0,
                running: false,
                startTime: null,
                targetTime: null,
                duration: settings.work * 60 * 1000
            };
            playSound('stop_clock');
            chrome.storage.local.set({ timer: defaults, history: history });
            return;
        }

        if (timer.mode === "work") {
            nextCount++;
            if (nextCount < 4) {
                nextMode = "short_break";
                nextDuration = settings.short * 60 * 1000;
            } else {
                nextMode = "long_break";
                nextDuration = settings.long * 60 * 1000;
                nextCount = 0;
            }
        } else {
            nextMode = "work";
            nextDuration = settings.work * 60 * 1000;
        }

        const nextTimer = {
            mode: nextMode,
            mode_type: "normal",
            pomodoro_count: nextCount,
            running: false,
            startTime: null,
            targetTime: null,
            duration: nextDuration
        };

        if (status === "skipped" || status === "completed") {
            nextTimer.running = true;
            nextTimer.startTime = now;
            // Determine duration based on new mode? (Already set in nextDuration)
            // Recalculate target
            nextTimer.targetTime = now + nextDuration; // Using the nextDuration calculated above

            // Create Alarm even if completed (Auto-cycle)
            chrome.alarms.create("timer_end", { when: nextTimer.targetTime });

            // Pre-end Warning (only for normal mode technically, but safe to check settings)
            const deltaMins = settings.preEndDelta || 1;
            const warningTime = nextTimer.targetTime - (deltaMins * 60 * 1000);
            if (warningTime > now) {
                chrome.alarms.create("pre_end_warning", { when: warningTime });
            }
        } else {
            chrome.alarms.clear("timer_end");
            chrome.alarms.clear("pre_end_warning");
        }

        chrome.storage.local.set({
            timer: nextTimer,
            history: history
        });
    });
}

// Message Handler for Skip / Start / Stop
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
    if (req.action === "start_timer") {
        startTimer();
    } else if (req.action === "stop_timer") {
        stopTimer();
    } else if (req.action === "skip_timer") {
        skipTimer();
    } else if (req.action === "pause_timer") {
        pauseTimer();
    } else if (req.action === "resume_timer") {
        resumeTimer();
    } else if (req.action === "set_mode_type") {
        setModeType(req.payload);
    }
    sendResponse({ status: "ok" });
    return true; // async
});

function setModeType(type) {
    chrome.storage.local.get(["timer", "settings"], (data) => {
        const t = data.timer;
        const s = data.settings || DEFAULTS.settings;

        t.mode_type = type;
        // Reset if switching
        t.running = false;
        t.mode = 'work';
        t.pomodoro_count = 0;

        // Reset Duration based on Type
        if (type === 'normal') {
            t.duration = s.work * 60 * 1000;
        } else {
            t.duration = 0; // or irrelevant
        }

        // Cleanup
        chrome.alarms.clearAll();
        playSound('stop_clock');

        chrome.storage.local.set({ timer: t });
    });
}

function startTimer() {
    chrome.storage.local.get(["timer", "settings"], (data) => {
        const t = data.timer;
        const s = data.settings || DEFAULTS.settings;
        const now = Date.now();

        t.running = true;
        t.startTime = now;

        // Audio: Clock Loop (First Work Session only, until stop)
        // Check if consistent with "first work session" logic: count implies sequence.
        // User request: "only play once at the start of first work session until stop is clicked"
        // This implies if we pause/resume or move to break, it might stop?
        // User said "until stop is clicked (or chrome closed)".
        // So breaks shouldn't stop it? "This is for both, normal and focused mode."
        // If it's for both, and continuous, then it starts on Work #1 and loops forever until Stop button?
        // Let's assume Start triggers it if not running.
        if (t.mode === 'work' && t.pomodoro_count === 0) {
            playSound('play_clock');
        }

        if (t.mode_type === 'focused') {
            t.targetTime = null;
        } else {
            const target = now + t.duration;
            t.targetTime = target;
            chrome.alarms.create("timer_end", { when: target });

            // Pre-end Warning Alarm
            const deltaMins = s.preEndDelta || 1;
            const warningTime = target - (deltaMins * 60 * 1000);
            if (warningTime > now) {
                chrome.alarms.create("pre_end_warning", { when: warningTime });
            }
        }

        chrome.storage.local.set({ timer: t });
    });
}

function stopTimer() {
    playSound('stop_clock');
    chrome.alarms.clear("pre_end_warning");
    finishSegment("interrupted");
}

function skipTimer() {
    finishSegment("skipped");
}

// Focused Mode Actions
function pauseTimer() {
    // Current is WORK. Log it, switch to BREAK, start BREAK.
    finishSegment("completed"); // Logs the work session
    // finishSegment resets logic, we need to override for Focused Mode "Pause" transition
}

function resumeTimer() {
    // Current is BREAK. Log it, switch to WORK, start WORK.
    finishSegment("completed"); // Logs the break session
}
