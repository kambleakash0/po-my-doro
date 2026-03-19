<div align="center">
  <img src="icons/icon128.png" width="128" alt="Po-My-Doro logo">

# Po-My-Doro

  *A powerful, aesthetic, and privacy-focused Pomodoro timer extension for Chrome, Edge, Brave, and other Chromium-based browsers.*
  
  [![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
</div>

A modern browser extension designed to boost your productivity using the Pomodoro technique. It features multiple timer modes, local-first data storage, and rich analytics to help you focus.

## Features

- **Dual Timer Modes**
  - **Normal Mode**: Classic Pomodoro technique (Work 25m, Short Break 5m, Long Break 15m) with automatic transitions.
  - **Focused Mode**: Stopwatch-style timer for unconstrained deep work sessions. Tracks exact time spent.
- **Audio Notifications**
  - Subtle clock sounds, pre-end warnings, and completion chimes managed reliably via an offscreen document.
- **Rich History & Analytics**
  - Day, week, and month views. Visual timeline differentiating session types. Automatically categorizes by completed and paused states.
- **Offline First & Private**
  - All data is stored locally in `chrome.storage.local`. Supports JSON export/import for device migration without data loss.

## Installation

As this is a custom extension, install it directly via Developer Mode in your Chromium-based browser.

1. Clone or download this repository.
2. Open your browser and navigate to its extensions management page (e.g., `chrome://extensions`, `edge://extensions`, or `brave://extensions`).
3. Enable **Developer Mode** (usually a toggle in the top right corner or bottom left menu).
4. Click **Load unpacked**.
5. Select the root directory of this repository (`po-my-doro`).

## Usage

1. Click the extension icon in your browser toolbar to open the popup.
2. **Start Timer**: Click the Play button to begin tracking.
3. **Toggle Mode**: Use the switch below the timer to swap between Normal and Focused modes.
4. **Customize**: Access the Settings tab to adjust durations, pre-end warning times, and audio preferences.

> [!TIP]  
> The **Focused Mode** is perfect for tasks where you don't want to be interrupted by a strict break timer.

> [!NOTE]  
> Use the export/import functionality in the settings to back up your history before moving to a new machine. The smart import feature safely merges your current data.

## Tech Stack

- **Manifest V3**: Modern browser extension architecture (supported by Google Chrome and all Chromium-based browsers).
- **Vanilla JS**: Lightweight implementation without heavy frameworks.
- **Chrome APIs**: Uses `storage`, `alarms`, `offscreen`, and `runtime` APIs.
