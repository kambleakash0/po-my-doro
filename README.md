# Po-My-Doro 🍅

A powerful, aesthetic, and privacy-focused Pomodoro timer extension for Chrome.

## Features ✨

### 1. Dual Timer Modes

* **Normal Mode**: Classic Pomodoro technique. Work (25m), Short Break (5m), Long Break (15m).
  * *Auto-Cycles*: Automatically transitions between Work and Break sessions.
* **Focused Mode**: A stopwatch-style timer for deep work sessions where you don't want to be constrained by a clock.
  * Tracks exact time spent.
  * Shows "Paused" status in history if interrupted.

### 2. Audio Notifications 🔊

* **Start Sound**: Plays a subtle clock sound at the start of your first work session.
* **Pre-end Warning**: A gentle chime plays *X* minutes before your session ends (Configurable default: 1 min).
* **Completion Chime**: A distinct sound marks the exact end of a session.
* *(Note: Audio uses an offscreen document to ensure reliability in background)*

### 3. Rich History & Analytics 📊

* **Day View**: Visual timeline of your day's work, differentiating between Normal (Green) and Focused (Blue/Indigo) sessions.
* **Week / Month Views**: Aggregate stats to track consistency over time.
* **Tags**: Automatically tags sessions as `[Normal]`, `[Focused]`, `[Completed]`, or `[Paused]`.

### 4. Data Management 💾

* **Offline First**: All data is stored locally in your browser (`chrome.storage.local`).
* **Export/Import**: Backup your history to JSON or migrate between devices. Smart import merges data keeping your history intact.

## Installation 🛠️

Since this is a custom extension, install it via Developer Mode:

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer Mode** (toggle in the top right corner).
4. Click **Load unpacked**.
5. Select the **root directory** of this repository (`po-my-doro`).

## Usage 🚀

1. Click the extension icon to open the popup.
2. **Start**: Click Play to begin the timer.
3. **Toggle Mode**: Use the switch below the timer to swap between "Normal" and "Focused".
4. **Settings**: Click the generic 'Settings' tab to customize durations and audio preferences.

## Tech Stack 💻

* **Manifest V3**: Modern Chrome Extension architecture.
* **Vanilla JS**: Lightweight, no heavy frameworks.
* **Chrome APIs**: `storage`, `alarms`, `offscreen`, `runtime`.

---
*Stay focused, stay productive.*
