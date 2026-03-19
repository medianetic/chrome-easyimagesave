# GEMINI.md - EasyImageSave

## Project Overview
**EasyImageSave** is a Google Chrome extension designed to simplify saving images from web pages in specific formats: **JPG, PNG, and WEBP**. It specifically addresses the challenge of saving images contained within sliders or galleries where the standard context menu might fail.

### Core Technologies
- **Language:** TypeScript
- **Build Tool:** Vite with `@crxjs/vite-plugin` (Manifest V3)
- **APIs:** Chrome Extension APIs (`contextMenus`, `downloads`, `offscreen`, `tabs`, `runtime`)
- **Image Processing:** HTML5 Canvas via the Chrome Offscreen API for format conversion.

## Building and Running
The following commands are defined in `package.json`:

- **Development:** `npm run dev` (Starts Vite in development mode with HMR for the extension)
- **Production Build:** `npm run build` (Compiles the project into the `dist/` directory)
- **Preview:** `npm run preview`

To load the extension in Chrome:
1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `dist` directory after running `npm run build`.

## Project Structure
- `src/background/background.ts`: The extension service worker. Manages context menu creation and coordinates the download/conversion workflow.
- `src/content/content.ts`: Injected into web pages. Detects right-clicks and extracts image URLs from `<img>` tags, `srcset`, or CSS `background-image` properties, even within complex slider structures.
- `src/background/offscreen.html/ts`: An offscreen document used to perform canvas-based image conversion (since service workers cannot access the DOM/Canvas).
- `src/popup/`: Contains the extension's popup UI.
- `public/`: Static assets like extension icons.
- `specs/`: Project documentation and architectural guidelines.

## Development Conventions
- **Manifest V3:** Strictly adheres to MV3 specifications.
- **Type Safety:** Use TypeScript for all logic; maintain proper interfaces for message passing between components.
- **Explicit and Verbose Coding Style:** Avoid "shortcode" patterns, ternary operators, and complex short-circuiting logic. Prefer explicit `if/else` blocks and clear, descriptive variable assignments to enhance readability and maintainability.
- **Modular Design:** Keep extraction logic (content), coordination logic (background), and processing logic (offscreen) separate.
- **Error Handling:** Implement robust error handling for fetch failures (CORS) and conversion errors.
- **UI/UX:** Follow Material Design principles for the popup and provide clear feedback if an image cannot be found.
