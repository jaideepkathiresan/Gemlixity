# Gemlixity

Gemlixity is a lightweight browser extension designed to enhance the Google Gemini interface. It provides a minimalist, premium workspace inspired by modern AI chat interfaces, featuring a persistent prompt history sidebar and intelligent navigation tools.

## Key Features

- **Minimalist UI**: Reimagines the chat interface with a slim, centered input area and a sleek dark theme.
- **Prompt History Sidebar**: Automatically captures and organizes your conversation prompts in a persistent side panel for quick reference.
- **Intelligent Order Sync**: Detects lazy-loaded messages and ensures the history list matches the exact chronological order of the chat.
- **Advanced Smooth Scrolling**: Uses custom JavaScript easing (easeInOutCubic) to navigate smoothly between prompts without "jumping."
- **Scroll-to-Bottom Button**: A dynamic floating button that appears when you scroll up, allowing you to return to the latest message instantly.
- **Distraction-Free Experience**: Automatically cleans up repetitive UI labels (like "You said") and hides legal disclaimers.

## Installation

1. Clone or download this repository.
2. Open your browser's extensions page (`chrome://extensions` or `edge://extensions`).
3. Enable **Developer mode** in the top right corner.
4. Click **Load unpacked** and select the folder containing these files.

## Project Structure

- `manifest.json`: Extension configuration and permissions.
- `content.js`: Main logic for DOM manipulation, history tracking, and smooth scrolling.
- `styles.css`: Premium styling and UI enhancements.

## Usage

Once installed, simply navigate to [gemini.google.com](https://gemini.google.com). The extension will automatically activate, providing you with a clean interface and the prompt history sidebar on the right.

---

*Note: This extension is intended for personal productivity and UX enhancement.*
