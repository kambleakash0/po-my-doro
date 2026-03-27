# Contributing to Po-My-Doro

Thanks for your interest in contributing! Here's how you can help.

## Reporting Issues

Use the [GitHub issue tracker](../../issues) to report bugs or request features. Please include:

- **Type**: Bug report or feature request
- **Description**: Clear summary of the issue or idea
- **Steps to reproduce** (for bugs): What you did, what you expected, what happened
- **Browser & version** (for bugs): e.g., Chrome 124, Edge 123

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/akash/po-my-doro.git
   ```
2. Open your Chromium-based browser and navigate to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked** and select the repo directory
5. Make your changes — the popup reloads automatically when you reopen it. For `background.js` changes, click the reload button on the extension card.

## Pull Request Process

1. Fork the repository and create a branch from `main`:
   - `feat/short-description` — for new features
   - `fix/short-description` — for bug fixes
   - `docs/short-description` — for documentation
   - `refactor/short-description` — for refactoring
2. Make your changes
3. Test the extension locally to ensure everything works
4. Submit a pull request against `main`

## Commit Messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add weekly summary view
fix: correct timer reset on mode switch
docs: update installation instructions
refactor: simplify alarm handling logic
chore: update .gitignore
```

## Code Style

- Vanilla JavaScript (no frameworks or build tools)
- Use clear, descriptive variable and function names
- Keep functions focused and concise
