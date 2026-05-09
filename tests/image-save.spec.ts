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
      console.log(`Starting download interception for ${params.format}...`);
      return new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
            console.error(`Download timeout triggered for ${params.format}`);
            reject(new Error(`Download timeout for ${params.format}`));
        }, 30000);

        // Mock chrome.downloads.download
        const originalDownload = chrome.downloads.download;
        (chrome.downloads as any).download = (options: any) => {
          console.log(`Intercepted download call: ${JSON.stringify(options)}`);
          chrome.downloads.download = originalDownload; // Restore original
          clearTimeout(timeout);
          resolve(options);
          return Promise.resolve(1); // Return dummy download ID
        };

        // Mock chrome.storage.sync.get for consistent naming in tests
        const originalStorageGet = chrome.storage.sync.get;
        (chrome.storage.sync as any).get = (defaults: any, callback: any) => {
            const result = { filenamePattern: '{hostname}_{title}_{date}.{ext}' };
            if (typeof defaults === 'function') {
                defaults(result);
            } else if (callback) {
                callback(result);
            }
            return Promise.resolve(result);
        };

        // Mock chrome.downloads.search for iteration
        const originalSearch = chrome.downloads.search;
        (chrome.downloads as any).search = () => Promise.resolve([]);

        try {
          console.log(`Triggering handleContextMenuClick for ${params.menuItemId}...`);
          // Call the exposed function
          (self as any).__test_handleContextMenuClick({
            menuItemId: params.menuItemId,
            srcUrl: params.srcUrl,
            pageUrl: params.pageUrl,
            titleAttr: 'Mock Title Attribute'
          });
        } catch (e: any) {
          console.error(`Error in handleContextMenuClick: ${e.message}`);
          chrome.downloads.download = originalDownload;
          clearTimeout(timeout);
          reject(e);
        }
      });
    }, { menuItemId, srcUrl: srcUrl!, pageUrl: page.url(), format });

    // Validate that the correct extension and format were used (now flat without folder)
    expect(downloadParams.filename).toMatch(new RegExp(`^[^/]*\\.${format}$`, 'i'));
    console.log(`Verified save as ${format}: ${downloadParams.filename}`);
  }
});