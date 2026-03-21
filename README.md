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

-   **2024-03-21:** Implemented **Settings Page** with customizable filename patterns and a live preview.
-   **2024-03-21:** Added **Playwright E2E Tests** for automated verification of image conversion and saving logic.
-   **2024-03-21:** Improved filename sanitization and metadata extraction.

## 🛠️ Tech Stack

-   **TypeScript:** For robust, type-safe logic.
-   **Vite + CRXJS:** Modern build tooling for fast development and optimized extension builds.
-   **Chrome Offscreen API:** Leverages standard DOM APIs (like Canvas) within a service-worker-based architecture.

## 📦 Installation (For Users)

Since this extension is in development, you can load it manually in Chrome:

1.  **Download/Clone:** Download or clone this repository to your computer.
2.  **Build (optional):** If you are using a source version, run `npm run build` (requires Node.js).
3.  **Open Chrome Extensions:** Navigate to `chrome://extensions/` in your browser.
4.  **Enable Developer Mode:** Toggle the "Developer mode" switch in the top-right corner.
5.  **Load Unpacked:** Click the "Load unpacked" button and select the `dist` folder within the project directory.

## 👨‍💻 Development (For Contributors)

### Prerequisites
-   [Node.js](https://nodejs.org/) (v16+ recommended)
-   npm

### Setup
1.  Clone the repo:
    ```bash
    git clone https://github.com/your-username/EasyImageSave.git
    cd EasyImageSave
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```

### Available Scripts
-   `npm run dev`: Start Vite in development mode with HMR (Hot Module Replacement) for the extension.
-   `npm run build`: Create a production-ready build in the `dist/` directory.
-   `npm run preview`: Preview the production build locally.

## Autor
* **Nick Weschkalnies** - [@medianetic](https://github.com/medianetic) - <nick@weschkalnies.de>

## ⚖️ License

Distributed under the ISC License. See `LICENSE` for more information.
