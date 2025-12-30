// popup.js

// Constants
const RADIUS = 120;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// View State
const viewState = {
    dayOffset: 0,
    weekOffset: 0,
    monthOffset: 0
};

// DOM Elements
const els = {
    tabs: document.querySelectorAll('.tab-btn'),
    contents: document.querySelectorAll('.tab-content'),
    progressRing: document.querySelector('.progress-ring'),
    timerText: document.querySelector('.timer-text'),
    modeText: document.querySelector('.mode-text'),
    btnStart: document.querySelector('#btn-start'),
    btnStop: document.querySelector('#btn-stop'),
    btnSkip: document.querySelector('#btn-skip'),
    btnPause: document.querySelector('#btn-pause'),
    btnResume: document.querySelector('#btn-resume'),
    modeToggle: document.querySelector('#mode-toggle'),
    modeLabel: document.querySelector('#mode-label'),
    // Settings
    inpWork: document.querySelector('#sets-work'),
    inpShort: document.querySelector('#sets-short'),
    inpLong: document.querySelector('#sets-long'),
    divDurations: document.querySelector('#tab-settings h3'), // Helper to hide
    btnSave: document.querySelector('#btn-save'),
    // Day Recap
    dayTimeline: document.querySelector('#day-timeline')
};

// Tab Switching
els.tabs.forEach(btn => {
    btn.addEventListener('click', () => {
        els.tabs.forEach(b => b.classList.remove('active'));
        els.contents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

        if (btn.dataset.tab === 'day') updateDayView();
        if (btn.dataset.tab === 'week') updateWeekView();
        if (btn.dataset.tab === 'month') updateMonthView();
        if (btn.dataset.tab === 'settings') loadSettings();
    });
});

// UI Updates
function updateUI() {
    chrome.storage.local.get(["timer", "settings"], (data) => {
        if (!data.timer) return;
        const t = data.timer;
        const isFocused = t.mode_type === 'focused';

        // Toggle State
        els.modeToggle.checked = isFocused;
        els.modeLabel.textContent = isFocused ? "Focused Mode" : "Normal Mode";

        // Calculate Time
        let remaining = 0;
        if (isFocused) {
            // Count UP
            if (t.running) {
                remaining = Date.now() - t.startTime;
            } else {
                // Not running, but possibly paused/stopped.
                // If stopped, duration is 0. If paused (break), it's duration of break? 
                // Wait, background logic resets duration to 0 on stop.
                remaining = 0;
                // If we are in 'short_break' mode in Focused, we are technically "Paused" from Work.
                // But timer should show Break Duration counting up?
                if (t.mode === 'short_break' && t.running) {
                    remaining = Date.now() - t.startTime; // Counting up break
                }
            }
        } else {
            // Normal Count DOWN
            remaining = t.duration;
            if (t.running && t.targetTime) {
                remaining = Math.max(0, t.targetTime - Date.now());
            }
        }

        // Update Text
        const totalSecs = Math.floor(remaining / 1000);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        els.timerText.textContent = (!t.running && !isFocused && remaining === t.duration && t.mode === 'work' && t.pomodoro_count === 0) ? "Ready" : timeStr;
        // Logic for Focused Ready state? StartTime is null.
        if (isFocused && !t.running && t.mode === 'work') els.timerText.textContent = "Ready";
        if (isFocused && t.running) els.timerText.textContent = timeStr;


        let modeLabel = "Ready";
        if (t.mode === 'work') {
            modeLabel = "Work";
        }
        else if (t.mode === 'short_break') modeLabel = isFocused ? "Break (Paused)" : "Short Break";
        else if (t.mode === 'long_break') modeLabel = "Long Break";
        els.modeText.textContent = modeLabel;

        // Update Ring
        if (isFocused) {
            // Focused mode: Full ring or simple animation? Let's keep it full.
            els.progressRing.style.strokeDashoffset = 0;
        } else {
            const total = t.duration;
            const offset = CIRCUMFERENCE - (remaining / total) * CIRCUMFERENCE;
            els.progressRing.style.strokeDashoffset = offset;
        }

        // Colors
        let color = '#e64a19';
        if (t.mode === 'short_break') color = '#43a047'; // Green for break
        if (t.mode === 'long_break') color = '#1976d2';
        els.progressRing.style.stroke = color;

        // Buttons Visibility
        // Reset all first
        [els.btnStart, els.btnStop, els.btnSkip, els.btnPause, els.btnResume].forEach(b => b.classList.add('hidden'));

        if (t.running) {
            if (isFocused) {
                // Focused Running
                if (t.mode === 'work') {
                    // Running Work -> Show Pause, Stop
                    els.btnPause.classList.remove('hidden');
                    els.btnStop.classList.remove('hidden');
                } else {
                    // Running Break (Paused) -> Show Resume, Stop
                    els.btnResume.classList.remove('hidden');
                    els.btnStop.classList.remove('hidden');
                }
            } else {
                // Normal Running -> Stop, Skip
                els.btnStop.classList.remove('hidden');
                els.btnSkip.classList.remove('hidden');
            }
        } else {
            // Idle
            els.btnStart.classList.remove('hidden');
        }
    });
}

// Initial Sync & Interval
updateUI();
setInterval(updateUI, 1000);

// Actions
els.btnStart.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "start_timer" });
    setTimeout(updateUI, 100);
});

els.btnStop.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "stop_timer" });
    setTimeout(updateUI, 100);
});

els.btnSkip.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "skip_timer" });
    // UI update might lag slightly behind async logic, intervals will catch it
    // UI update might lag slightly behind async logic, intervals will catch it
    els.timerText.textContent = "Loading...";
});

els.btnPause.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "pause_timer" });
    setTimeout(updateUI, 100);
});

els.btnResume.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "resume_timer" });
    setTimeout(updateUI, 100);
});

els.modeToggle.addEventListener('change', (e) => {
    const isFocused = e.target.checked;
    chrome.runtime.sendMessage({ action: "set_mode_type", payload: isFocused ? 'focused' : 'normal' });
    setTimeout(updateUI, 100);
});

// Day View Status Helpers
function getStatusTag(status) {
    if (status === 'skipped') return '<span class="tag skipped">Skipped</span>';
    if (status === 'interrupted') return '<span class="tag interrupted">Interrupted</span>';
    return '';
}

// Settings
const inpWork = document.getElementById('sets-work');
const inpShort = document.getElementById('sets-short');
const inpLong = document.getElementById('sets-long');

function loadSettings() {
    chrome.storage.local.get(["settings", "timer"], (res) => {
        const s = res.settings || { work: 25, short: 5, long: 15 };
        els.inpWork.value = s.work;
        els.inpShort.value = s.short;
        els.inpLong.value = s.long;

        // Hide durations if focused mode
        const isFocused = res.timer && res.timer.mode_type === 'focused';
        if (isFocused) {
            // Simplified: Hide all setting rows related to duration.
            document.querySelectorAll('.setting-row').forEach(row => row.style.display = 'none');
            document.querySelector('#tab-settings h3').style.display = 'none'; // "Durations (minutes)"
        } else {
            document.querySelectorAll('.setting-row').forEach(row => row.style.display = 'block');
            document.querySelector('#tab-settings h3').style.display = 'block';
        }
    });
}

if (document.getElementById('btn-save')) {
    document.getElementById('btn-save').addEventListener('click', () => {
        const newSettings = {
            work: parseInt(inpWork.value) || 25,
            short: parseInt(inpShort.value) || 5,
            long: parseInt(inpLong.value) || 15
        };
        chrome.storage.local.set({ settings: newSettings }, () => {
            // Reset timer to apply?
            chrome.runtime.sendMessage({ action: "stop_timer" });
            alert("Settings saved. Timer reset.");
        });
    });
}

// Reset History
if (document.getElementById('btn-reset-history')) {
    document.getElementById('btn-reset-history').addEventListener('click', () => {
        if (confirm("Are you sure you want to delete ALL history? This cannot be undone.")) {
            chrome.storage.local.set({ history: [] }, () => {
                alert("History cleared.");
                updateDayView(); // Refresh if open
            });
        }
    });
}

// Export Data
if (document.getElementById('btn-export')) {
    document.getElementById('btn-export').addEventListener('click', () => {
        chrome.storage.local.get(null, (data) => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pomodoro-history-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    });
}

// Import Data Trigger
if (document.getElementById('btn-import-trigger')) {
    document.getElementById('btn-import-trigger').addEventListener('click', () => {
        document.getElementById('file-import').click();
    });
}

// Import Logic
if (document.getElementById('file-import')) {
    document.getElementById('file-import').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!importedData.history || !Array.isArray(importedData.history)) {
                    alert("Invalid file format: No history found.");
                    return;
                }

                chrome.storage.local.get("history", (res) => {
                    const currentHistory = res.history || [];
                    const newHistory = importedData.history;

                    // Merge: Add if startTime doesn't exist
                    let addedCount = 0;
                    const existingStarts = new Set(currentHistory.map(h => h.start));

                    newHistory.forEach(h => {
                        if (!existingStarts.has(h.start)) {
                            currentHistory.push(h);
                            existingStarts.add(h.start);
                            addedCount++;
                        }
                    });

                    // Sort by start time
                    currentHistory.sort((a, b) => a.start - b.start);

                    chrome.storage.local.set({ history: currentHistory }, () => {
                        alert(`Import successful! Merged ${addedCount} new sessions.`);
                        updateDayView(); // Refresh
                    });
                });
            } catch (err) {
                alert("Error parsing JSON file.");
                console.error(err);
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    });
}

// Day View
function updateDayView() {
    chrome.storage.local.get("history", (res) => {
        const history = res.history || [];
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + viewState.dayOffset);
        const targetStr = targetDate.toDateString();

        const todaysSessions = history.filter(h => new Date(h.start).toDateString() === targetStr);

        const dateHeader = targetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

        // Count & Total
        const workSessions = todaysSessions.filter(h => h.type === 'work');
        const workCount = workSessions.length;
        const totalSecs = workSessions.reduce((acc, cur) => acc + (cur.duration || 0), 0);

        const h = Math.floor(totalSecs / 3600);
        const m = Math.floor((totalSecs % 3600) / 60);
        const s = totalSecs % 60;
        const mainTimeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        const secStr = `:${s.toString().padStart(2, '0')}`;

        // Render
        let html = `
            <div style="padding:10px 0;">
                <!-- Date -->
                <!-- Date -->
                <!-- Year/Date Header with Nav -->
                <div style="height:60px; display:flex; flex-direction:column; justify-content:center; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button id="btn-day-prev" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&lt;</button>
                        <div style="font-size:18px; color:#e0e0e0; min-width:140px; text-align:center;">${dateHeader}</div>
                        <button id="btn-day-next" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&gt;</button>
                    </div>
                </div>
                
                <!-- Circular Summary -->
                <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:30px;">
                    <div style="width:100px; height:100px; background:#82b1ff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,0,0,0.4);">
                        <div style="width:60px; height:60px; background:#1e1e1e; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:28px; font-weight:bold;">
                            ${workCount}
                        </div>
                    </div>
                    <!-- Timer Total -->
                    <div style="font-size:32px; margin-top:10px; font-weight:normal; color:#e0e0e0; font-family:monospace;">${mainTimeStr}<small style="font-size:14px; color:#555;">${secStr}</small></div>
                </div>
                
                <!-- Day Overview Bar -->
                <div style="margin-bottom:30px;">
                    <div style="color:#aaa; font-size:14px; margin-bottom:5px;">Day overview</div>
                    <div style="display:flex; justify-content:space-between; font-size:12px; color:#777; margin-bottom:4px; padding:0 5px;">
                        <span>🌙</span><span style="margin-left:5px">☀️</span><span>🌙</span>
                    </div>
                    <!-- Track with markers -->
                    <div style="position:relative; width:100%; height:16px; background:#333; border-radius:2px; overflow:hidden;">
                         <!-- Markers 6/12/18 -->
                         <div style="position:absolute; left:25%; height:100%; width:1px; background:#444;"></div>
                         <div style="position:absolute; left:50%; height:100%; width:1px; background:#444;"></div>
                         <div style="position:absolute; left:75%; height:100%; width:1px; background:#444;"></div>
                         
                         <!-- Sessions (Work Only) -->
                        ${workSessions.map(h => {
            const start = new Date(h.start);
            const mid = new Date(start); mid.setHours(0, 0, 0, 0);
            const ms = start - mid;
            const leftPct = (ms / 86400000) * 100;
            const widthPct = ((h.duration * 1000) / 86400000) * 100;
            const color = '#e64a19'; // Work color

            return `<div style="position:absolute; left:${leftPct}%; width:${Math.max(0.5, widthPct)}%; height:100%; background:${color};"></div>`;
        }).join('')}
                        
                        <!-- Current Time Marker (Only if today) -->
                        ${viewState.dayOffset === 0 ? `<div style="position:absolute; left:${(new Date().getHours() * 3600 + new Date().getMinutes() * 60 + new Date().getSeconds()) / 86400 * 100}%; width:2px; height:100%; background:#fff; opacity:0.5;"></div>` : ''}
                    </div>
                </div>
                
                <!-- Pomodoro Recap List -->
                <div style="color:#aaa; font-size:14px; margin-bottom:15px;">Pomodoro recap</div>
                <div style="position:relative; padding-left:15px; border-left:1px solid #444; margin-left:11px;">
        `;

        // List Items
        workSessions.sort((a, b) => a.start - b.start).forEach(h => {
            const start = new Date(h.start);
            const end = new Date(h.end);
            const startStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
            const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            const m = Math.floor(h.duration / 60);
            const s = h.duration % 60;
            const durStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const dotColor = '#e64a19';

            html += `
                <div style="position:relative; margin-bottom:25px; padding-left:15px;">
                    <!-- Dot -->
                    <div style="position:absolute; left:-20px; top:0; width:9px; height:9px; background:${dotColor}; border-radius:50%; border:2px solid #1e1e1e;"></div>
                    
                    <div style="font-size:13px; color:#888;">${startStr}</div>
                    <div style="font-size:20px; font-weight:normal; color:#fff; margin:2px 0; font-family:monospace;">${durStr}<span style="font-size:12px; color:#555;"></span></div>
                    <div style="font-size:13px; color:#888;">${endStr}</div>
                    
                    ${h.status !== 'completed' ? (() => {
                    const statusColor = h.status === 'skipped' ? '#ffb74d' : '#ef5350';
                    return `<div style="font-size:11px; color:${statusColor}; margin-top:4px; font-weight:bold;">${h.status.toUpperCase()}</div>`;
                })() : ''}
                </div>
            `;
        });

        if (workSessions.length === 0) {
            html += `<div style="padding-left:15px; color:#555; font-style:italic;">No work sessions today.</div>`;
        }

        html += `
                </div>
            </div>`;

        els.dayTimeline.innerHTML = html;

        // Attach Navigation Listeners
        document.getElementById('btn-day-prev').addEventListener('click', () => {
            viewState.dayOffset--;
            updateDayView();
        });
        document.getElementById('btn-day-next').addEventListener('click', () => {
            viewState.dayOffset++;
            updateDayView();
        });
    });
}

// Week View
function updateWeekView() {
    const container = document.getElementById('week-chart');
    if (!container) return;

    chrome.storage.local.get("history", (res) => {
        const history = res.history || [];
        const now = new Date();
        now.setDate(now.getDate() + (viewState.weekOffset * 7));

        // Calculate standard week (Mon-Sun)
        const day = now.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust if sunday
        const monday = new Date(now.getFullYear(), now.getMonth(), diff);
        monday.setHours(0, 0, 0, 0);

        const weekDates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            weekDates.push(d);
        }
        const startOfWeek = weekDates[0];
        const endOfWeek = weekDates[6];

        // Filter history for this week
        const weekHistory = history.filter(h => {
            const d = new Date(h.start);
            return d >= startOfWeek && d < new Date(endOfWeek.getTime() + 86400000);
        });

        // Weekly Totals
        const totalSessions = weekHistory.filter(h => h.type === 'work');
        const weekCount = totalSessions.length;
        const totalWeekSecs = totalSessions.reduce((acc, cur) => acc + (cur.duration || 0), 0);

        const wh = Math.floor(totalWeekSecs / 3600);
        const wm = Math.floor((totalWeekSecs % 3600) / 60);
        const ws = totalWeekSecs % 60;
        const mainTimeStr = `${wh.toString().padStart(2, '0')}:${wm.toString().padStart(2, '0')}`;
        const secStr = `:${ws.toString().padStart(2, '0')}`;

        // Week number calculation
        const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);

        const rangeStr = `${startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} `;

        // Render
        let html = `
            <div style="padding:10px 0;">
                <!-- Header -->
                <!-- Header -->
                <!-- Header -->
                <div style="height:60px; display:flex; flex-direction:column; justify-content:center; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button id="btn-week-prev" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&lt;</button>
                        <div style="font-size:18px; color:#e0e0e0; margin-bottom:4px; text-align:center;">Week ${weekNo} <span style="color:#777; font-size:16px;">${now.getFullYear()}</span></div>
                        <button id="btn-week-next" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&gt;</button>
                    </div>
                    <div style="font-size:13px; color:#aaa;">${rangeStr}</div>
                </div>

                <!-- Circular Summary -->
                <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:30px;">
                    <div style="width:100px; height:100px; background:#cddc39; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,0,0,0.4);">
                        <div style="width:60px; height:60px; background:#1e1e1e; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:28px; font-weight:bold;">
                            ${weekCount}
                        </div>
                    </div>
                    <div style="font-size:32px; margin-top:10px; font-weight:normal; color:#e0e0e0; font-family:monospace;">${mainTimeStr}<small style="font-size:14px; color:#555;">${secStr}</small></div>
                </div>
                
                <!-- Overview Header (Sun/Moon) -->
                <div style="margin-bottom:10px; padding-left:35px; padding-right:75px;">
                     <div style="display:flex; justify-content:space-between; font-size:14px; color:#777;">
                        <span>🌙</span><span>☀️</span><span>🌙</span>
                     </div>
                </div>

                <!-- Days List -->
                <div style="display:flex; flex-direction:column; gap:10px;">
        `;

        weekDates.forEach(date => {
            const dateNum = date.getDate();
            const dayStr = date.toDateString();

            // Sessions for this day
            const daySessions = weekHistory.filter(h => new Date(h.start).toDateString() === dayStr);
            const daySecs = daySessions.filter(h => h.type === 'work').reduce((acc, cur) => acc + (cur.duration || 0), 0);

            let dayTimeStr = '';
            if (daySecs > 0) {
                const m = Math.floor(daySecs / 60);
                const s = daySecs % 60;
                dayTimeStr = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }

            // Timeline Bars
            const barsHtml = daySessions.map(h => {
                const start = new Date(h.start);
                const mid = new Date(start); mid.setHours(0, 0, 0, 0);
                const ms = start - mid;
                const leftPct = (ms / 86400000) * 100;
                const widthPct = Math.max(((h.duration * 1000) / 86400000) * 100, 0.5);
                const color = h.type === 'work' ? '#cddc39' : '#81c784';
                return `<div style="position:absolute; left:${leftPct}%; width:${widthPct}%; height:100%; background:${color}; opacity:0.9;"></div>`;
            }).join('');

            html += `
                <div style="display:flex; align-items:center; height:12px;">
                    <!-- Date Num -->
                    <div style="width:30px; font-size:12px; color:#888; text-align:right; margin-right:10px;">${dateNum}</div>

                    <!-- Bar Track -->
                    <div style="flex:1; height:100%; background:#333; position:relative; border-radius:2px; overflow:hidden;">
                        <!-- Markers -->
                        <div style="position:absolute; left:25%; height:100%; width:1px; background:#444;"></div>
                        <div style="position:absolute; left:50%; height:100%; width:1px; background:#444;"></div>
                        <div style="position:absolute; left:75%; height:100%; width:1px; background:#444;"></div>
                        ${barsHtml}
                    </div>

                    <!-- Duration -->
                    <div style="width:60px; font-size:11px; color:#aaa; text-align:right; margin-left:10px; font-family:monospace;">${dayTimeStr}</div>
                </div>
                `;
        });

        html += `   </div>
            </div > `;

        container.innerHTML = html;

        // Attach Navigation Listeners
        document.getElementById('btn-week-prev').addEventListener('click', () => {
            viewState.weekOffset--;
            updateWeekView();
        });
        document.getElementById('btn-week-next').addEventListener('click', () => {
            viewState.weekOffset++;
            updateWeekView();
        });
    });
}

// Month View
function updateMonthView() {
    const container = document.getElementById('tab-month');
    if (!container) return;

    chrome.storage.local.get("history", (res) => {
        const history = res.history || [];
        const now = new Date();
        now.setDate(1); // Avoid overflow (e.g. Jan 31 -> Feb 28)
        now.setMonth(now.getMonth() + viewState.monthOffset);

        const year = now.getFullYear();
        const month = now.getMonth();

        // Filter for Month
        const monthHistory = history.filter(h => {
            const d = new Date(h.start);
            return d.getFullYear() === year && d.getMonth() === month;
        });

        // Month Totals
        const totalSessions = monthHistory.filter(h => h.type === 'work');
        const monthCount = totalSessions.length;
        const totalMonthSecs = totalSessions.reduce((acc, cur) => acc + (cur.duration || 0), 0);

        const mh = Math.floor(totalMonthSecs / 3600);
        const mm = Math.floor((totalMonthSecs % 3600) / 60);
        const ms = totalMonthSecs % 60;
        const mainTimeStr = `${mh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
        const secStr = `:${ms.toString().padStart(2, '0')}`;

        // Build Weeks (Mon-Sun)
        const weeks = [];
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Find first Monday in view
        let currentDay = new Date(firstDay);
        const startDayOfWeek = currentDay.getDay(); // 0(Sun) - 6(Sat)
        const daysToRewind = (startDayOfWeek + 6) % 7;
        currentDay.setDate(currentDay.getDate() - daysToRewind);

        while (currentDay <= lastDay) {
            const weekStart = new Date(currentDay);
            const weekEnd = new Date(currentDay);
            weekEnd.setDate(weekEnd.getDate() + 6);

            // Data
            const weekSessionData = monthHistory.filter(h => {
                const d = new Date(h.start);
                const s = weekStart.getTime();
                const e = weekEnd.getTime() + 86400000;
                return d.getTime() >= s && d.getTime() < e;
            });
            const wSecs = weekSessionData.filter(h => h.type === 'work').reduce((acc, cur) => acc + (cur.duration || 0), 0);

            weeks.push({
                start: weekStart,
                end: weekEnd,
                secs: wSecs
            });

            currentDay.setDate(currentDay.getDate() + 7);
        }

        // Render
        let html = `
            <div style="padding:10px 0;">
                <!-- Header -->
                <!-- Header -->
                <!-- Header -->
                <div style="height:60px; display:flex; flex-direction:column; justify-content:center; align-items:center; margin-bottom:10px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <button id="btn-month-prev" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&lt;</button>
                        <div style="font-size:18px; color:#e0e0e0; min-width:150px; text-align:center;">${now.toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
                        <button id="btn-month-next" style="background:none; border:none; color:#777; font-size:20px; cursor:pointer; padding:0 10px;">&gt;</button>
                    </div>
                </div>

                <!-- Circular Summary -->
                <div style="display:flex; flex-direction:column; align-items:center; margin-bottom:30px;">
                    <div style="width:100px; height:100px; background:#cddc39; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 15px rgba(0,0,0,0.4);">
                        <div style="width:60px; height:60px; background:#1e1e1e; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:28px; font-weight:bold;">
                            ${monthCount}
                        </div>
                    </div>
                    <div style="font-size:32px; margin-top:10px; font-weight:normal; color:#e0e0e0; font-family:monospace;">${mainTimeStr}<small style="font-size:14px; color:#555;">${secStr}</small></div>
                </div>
                
                <div style="color:#aaa; font-size:14px; margin-bottom:10px;">Month overview</div>
                
                <!--Week Grid-- >
            <div style="margin-bottom:10px;">
                <!-- Headers -->
                <div style="display:flex; justify-content:space-between; padding:0 10px; margin-bottom:5px; color:#777; font-size:12px;">
                    <span style="width:20px; text-align:center;">M</span>
                    <span style="width:20px; text-align:center;">T</span>
                    <span style="width:20px; text-align:center;">W</span>
                    <span style="width:20px; text-align:center;">T</span>
                    <span style="width:20px; text-align:center;">F</span>
                    <span style="width:20px; text-align:center;">S</span>
                    <span style="width:20px; text-align:center;">S</span>
                </div>

                <!-- Rows -->
                <div style="display:flex; flex-direction:column; gap:4px;">
                    `;

        weeks.forEach(w => {
            // Determine active range within this week (clipped to month boundaries)
            const validStart = w.start < firstDay ? firstDay : w.start;
            const validEnd = w.end > lastDay ? lastDay : w.end;

            // Calculate grid position (0-6)
            // Mon=0, Sun=6
            const sIdx = (validStart.getDay() + 6) % 7;
            const eIdx = (validEnd.getDay() + 6) % 7;

            const leftPct = (sIdx / 7) * 100;
            const widthPct = ((eIdx - sIdx + 1) / 7) * 100;

            let durStr = '';
            if (w.secs > 0) {
                const h = Math.floor(w.secs / 3600);
                const m = Math.floor((w.secs % 3600) / 60);
                const s = w.secs % 60;
                durStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }

            const bg = '#2c2c2c';

            html += `
                    <div style="position:relative; height:32px; width:100%;">

                        <!-- The Visual Bar -->
                        <!-- The Visual Bar -->
                        <div style="position:absolute; left:${leftPct}%; width:${widthPct}%; height:100%; background:${bg}; border-radius:2px; display:flex; align-items:center; justify-content:center; box-sizing:border-box;">

                            <!-- Highlight Overlay -->
                            ${w.secs > 0 ? `<div style="position:absolute; top:0; left:0; height:100%; width:100%; background:rgba(205, 220, 57, 0.15);"></div>` : ''}

                            <!-- Start Date -->
                            <span style="position:absolute; left:6px; z-index:2; font-size:12px; color:#aaa; visibility:${validStart.getTime() === w.start.getTime() ? 'visible' : 'hidden'}">${validStart.getDate()}</span>

                            <!-- Duration -->
                            <span style="z-index:1; font-size:12px; color:#e0e0e0; font-family:monospace; font-weight:bold;">${durStr}</span>

                            <!-- End Date -->
                            <span style="position:absolute; right:6px; z-index:2; font-size:12px; color:#aaa; visibility:${(validEnd.getTime() === w.end.getTime() && validStart.getDate() !== validEnd.getDate()) ? 'visible' : 'hidden'}">${validEnd.getDate()}</span>
                        </div>

                    </div>
                    `;
        });

        html += `
                </div>
            </div>
            </div >
            `;

        container.innerHTML = html;

        // Attach Navigation Listeners
        document.getElementById('btn-month-prev').addEventListener('click', () => {
            viewState.monthOffset--;
            updateMonthView();
        });
        document.getElementById('btn-month-next').addEventListener('click', () => {
            viewState.monthOffset++;
            updateMonthView();
        });
    });
}

// Placeholder Icons Generator (optional, executed once if needed)
// For now we rely on user providing them or broken image.
