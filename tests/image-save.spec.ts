import { expect } from '@playwright/test';
import { test } from './extension-fixture';

test('should save an image in different formats', async ({ page, context }) => {
  // Wait for the background script
  let [background] = context.serviceWorkers();
  if (!background) {
    background = await context.waitForEvent('serviceworker');
  }

  // Go to a test page with an image
  await page.goto('https://en.wikipedia.org/wiki/Cat');

  // Find all images
  const images = await page.locator('img').all();
  expect(images.length).toBeGreaterThan(0);

  // Pick a random image with a valid src
  let srcUrl = null;
  for (let i = 0; i < 10; i++) {
    const randomImage = images[Math.floor(Math.random() * images.length)];
    const src = await randomImage.getAttribute('src');
    if (src && !src.startsWith('data:')) {
        srcUrl = new URL(src, page.url()).href;
        break;
    }
  }
  
  expect(srcUrl).not.toBeNull();

  const formats = ['jpg', 'png', 'webp'];

  for (const format of formats) {
    const menuItemId = `save-${format}`;

    // Intercept the chrome.downloads.download call to verify parameters
    const downloadParams = await background.evaluate(async (params) => {
      return new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
            reject(new Error(`Download timeout for ${params.format}`));
        }, 15000);

        // Mock chrome.downloads.download
        const originalDownload = chrome.downloads.download;
        (chrome.downloads as any).download = (options: any) => {
          chrome.downloads.download = originalDownload; // Restore original
          clearTimeout(timeout);
          resolve(options);
          return Promise.resolve(1); // Return dummy download ID
        };

        try {
          // Call the exposed function
          (self as any).__test_handleContextMenuClick({
            menuItemId: params.menuItemId,
            srcUrl: params.srcUrl,
            pageUrl: params.pageUrl
          });
        } catch (e: any) {
          chrome.downloads.download = originalDownload;
          clearTimeout(timeout);
          reject(e);
        }
      });
    }, { menuItemId, srcUrl: srcUrl!, pageUrl: page.url(), format });

    // Validate that the correct extension and folder were used
    expect(downloadParams.filename).toMatch(new RegExp(`^saved_images/.*\\.${format}$`, 'i'));
    console.log(`Verified save as ${format}: ${downloadParams.filename}`);
  }
});