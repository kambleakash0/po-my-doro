// Background Service Worker

// Constants
const DEFAULTS = {
    settings: { work: 25, short: 5, long: 15 },
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
        finishSegment("completed");
    }
});

function finishSegment(status = "completed") {
    chrome.storage.local.get(["timer", "settings", "history"], (data) => {
        const { timer, settings, history } = data;
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

        if (status === "skipped") {
            nextTimer.running = true;
            nextTimer.startTime = now;
            nextTimer.targetTime = now + nextDuration;
            chrome.alarms.create("timer_end", { when: nextTimer.targetTime });
        } else {
            chrome.alarms.clear("timer_end");
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
    chrome.storage.local.get("timer", (data) => {
        const t = data.timer;
        t.mode_type = type;
        // Reset if switching? Yes, user interaction implies idle.
        t.running = false;
        t.mode = 'work';
        t.pomodoro_count = 0;
        chrome.storage.local.set({ timer: t });
    });
}

function startTimer() {
    chrome.storage.local.get("timer", (data) => {
        const t = data.timer;
        const now = Date.now();

        t.running = true;
        t.startTime = now;

        if (t.mode_type === 'focused') {
            t.targetTime = null; // No alarm for focused mode
        } else {
            const target = now + t.duration;
            t.targetTime = target;
            chrome.alarms.create("timer_end", { when: target });
        }

        chrome.storage.local.set({ timer: t });
    });
}

function stopTimer() {
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
