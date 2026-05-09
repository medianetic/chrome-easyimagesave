# EasyImageSave

**EasyImageSave** is a Chrome extension (Manifest V3) that makes saving and converting images from any website effortless. It is specifically designed to handle complex web elements like image sliders, galleries, and CSS background images that often block standard browser "Save Image As" options.

## 🚀 Key Features

-   **Multi-Format Saving:** Save any image directly as **JPG**, **PNG**, or **WEBP** via a right-click context menu.
-   **Customizable Filename Patterns:** Define your own naming convention using placeholders like `{title}`, `{hostname}`, `{date}`, `{alt}`, and `{title_attr}` in the extension settings.
-   **Automatic Iteration:** Intelligent collision handling. If you save multiple images with the same metadata, they are automatically numbered (e.g., `-01`, `-02`).
-   **Copy to Clipboard:** Convert and copy images directly to your clipboard for instant pasting into apps like Slack, Discord, or Word.
-   **Slider & Gallery Support:** Deep-search logic extracts images from deep within slider structures, even when they are not directly targetable.
-   **CSS Background Support:** Easily save images used as CSS background-images.
-   **Native Conversion:** Performs all conversions locally using the native Canvas API—no external libraries or cloud processing required.
-   **Privacy-Focused:** No data ever leaves your browser.

## 🕒 Recent Updates

-   **2024-05-09:** Added **GitHub Actions** for automated releases.
-   **2024-03-21:** Implemented **Settings Page** with customizable filename patterns and a live preview.
-   **2024-03-21:** Added **Playwright E2E Tests** for automated verification of image conversion and saving logic.
-   **2024-03-21:** Improved filename sanitization and metadata extraction.

## 🛠️ Tech Stack

-   **TypeScript:** For robust, type-safe logic.
-   **Vite + CRXJS:** Modern build tooling for fast development and optimized extension builds.
-   **Chrome Offscreen API:** Leverages standard DOM APIs (like Canvas) within a service-worker-based architecture.

## 📦 Installation

Download the latest `easyimagesave.zip` from [Releases](https://github.com/medianetic/chrome-easyimagesave/releases).

1. **Extract:** Unzip the ZIP file into a folder on your computer.
2. **Chrome Extensions:** Open `chrome://extensions/` in Chrome.
3. **Developer Mode:** Enable **Developer mode** in the top-right corner.
4. **Load:** Click **Load unpacked** in the top-left corner and select the folder you just extracted.

## 👨‍💻 Development (For Contributors)

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16+ recommended)
-   npm

### Setup
1.  Clone the repo:
    ```bash
    git clone https://github.com/medianetic/chrome-easyimagesave.git
    cd chrome-easyimagesave
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Available Scripts
-   `npm run dev`: Start Vite in development mode with HMR (Hot Module Replacement) for the extension.
-   `npm run build`: Create a production-ready build in the `dist/` directory.
-   `npm run preview`: Preview the production build locally.

## Contributing
This was released early to get outside contributors involved.

## How to Contribute
- Fork the repo and create a branch
- Pick something — check Issues or grab something from the Known Gaps list above
- Submit a PR — contributors get credited

## Autor
* **Nick Weschkalnies** - [@medianetic](https://github.com/medianetic) - <nick@weschkalnies.de>

## ⚖️ License

Distributed under the ISC License. See `LICENSE` for more information.
