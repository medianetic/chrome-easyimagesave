let offscreenCloseTimer: ReturnType<typeof setTimeout> | null = null;
let activeOffscreenOperations: number = 0;

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'easy-image-save',
        title: 'Easy Image Save',
        contexts: ['image', 'all']
    });

    chrome.contextMenus.create({
        id: 'save-jpg',
        parentId: 'easy-image-save',
        title: 'Save as JPG',
        contexts: ['image', 'all']
    });

    chrome.contextMenus.create({
        id: 'save-png',
        parentId: 'easy-image-save',
        title: 'Save as PNG',
        contexts: ['image', 'all']
    });

    chrome.contextMenus.create({
        id: 'save-webp',
        parentId: 'easy-image-save',
        title: 'Save as WEBP',
        contexts: ['image', 'all']
    });

    chrome.contextMenus.create({
        id: 'copy-to-clipboard',
        parentId: 'easy-image-save',
        title: 'Copy to Clipboard',
        contexts: ['image', 'all']
    });
});

interface ImageMetadata {
    imageUrl: string | null;
    altText: string | null;
    titleAttr: string | null;
    pageTitle: string | null;
}

export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
    const menuItemId = info.menuItemId;
    if (typeof menuItemId === 'string') {
        let imageUrl = info.srcUrl;
        let altText: string | null = null;
        let titleAttr: string | null = null;
        let pageTitle: string | null = null;

        // Try to get metadata from content script
        if (tab) {
            if (tab.id) {
                try {
                    const response: ImageMetadata = await chrome.tabs.sendMessage(tab.id, { type: 'GET_IMAGE_URL' });
                    if (response) {
                        if (response.imageUrl) {
                            imageUrl = response.imageUrl;
                        }
                        altText = response.altText;
                        titleAttr = response.titleAttr;
                        pageTitle = response.pageTitle;
                    }
                } catch (e) {
                    console.error('Error getting image metadata from content script:', e);
                }
            }
        }

        if (!imageUrl) {
            console.error('No image found at click location');
            chrome.notifications.create({
                type: 'basic',
                iconUrl: 'easeimagesave-icon-48.png',
                title: 'Operation Failed',
                message: 'No image found at this location.'
            });
            return;
        }

        if (menuItemId.startsWith('save-')) {
            const menuItemParts = menuItemId.split('-');
            const format = menuItemParts[1];
            try {
                await processImageDownload(imageUrl, format, altText, titleAttr, pageTitle);
            } catch (error: any) {
                handleError(error);
            }
        } else if (menuItemId === 'copy-to-clipboard') {
            if (tab) {
                if (tab.id) {
                    try {
                        await processImageCopy(imageUrl, tab.id);
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'easeimagesave-icon-48.png',
                            title: 'Copied!',
                            message: 'Image copied to clipboard as PNG.'
                        });
                    } catch (error: any) {
                        handleError(error);
                    }
                }
            }
        }
    }
}

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Expose for Playwright testing
if (typeof self !== 'undefined') {
    (self as any).__test_handleContextMenuClick = handleContextMenuClick;
}

function handleError(error: any) {
    console.error('Error:', error);
    let errorMessage = 'An error occurred';
    if (error.message) {
        errorMessage = error.message;
    }

    // Provide a specific hint for "Could not establish connection"
    if (errorMessage.includes('Could not establish connection')) {
        errorMessage = 'Please refresh the webpage and try again.';
    }

    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'easeimagesave-icon-48.png',
        title: 'Operation Failed',
        message: errorMessage
    });
}

async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }

    const offscreenPath = 'src/background/offscreen.html';
    const reasons = ['CLIPBOARD', 'CANVAS', 'DOM_PARSER'];

    for (const reason of reasons) {
        try {
            await chrome.offscreen.createDocument({
                url: offscreenPath,
                reasons: [reason as chrome.offscreen.Reason],
                justification: 'Image format conversion and clipboard access'
            });
            console.log('Offscreen document created successfully with reason: ' + reason);
            return;
        } catch (e: any) {
            if (e.message) {
                if (e.message.includes('Only one offscreen document')) {
                    return;
                }
            }
            console.warn('Failed to create offscreen document with reason ' + reason + ': ' + e.message);
        }
    }
    throw new Error('Failed to create offscreen document with any supported reason.');
}

function scheduleOffscreenClosing() {
    // Clear any existing timer
    if (offscreenCloseTimer) {
        clearTimeout(offscreenCloseTimer);
        offscreenCloseTimer = null;
    }

    // Only schedule closing if no operations are active
    if (activeOffscreenOperations === 0) {
        offscreenCloseTimer = setTimeout(async () => {
            try {
                const hasDocument = await chrome.offscreen.hasDocument();
                if (hasDocument) {
                    if (activeOffscreenOperations === 0) {
                        await chrome.offscreen.closeDocument();
                        console.log('Offscreen document closed due to inactivity.');
                    }
                }
            } catch (error) {
                console.error('Error during offscreen document closing:', error);
            } finally {
                offscreenCloseTimer = null;
            }
        }, 30000); // 30 seconds of inactivity
    }
}

function sanitizeFilename(name: string): string {
    // Remove common illegal characters and trim multiple underscores
    return name.replace(/[<>:"/\\|?*]/g, '_')
               .replace(/\s+/g, '_')
               .replace(/_{2,}/g, '_')
               .replace(/^_+|_+$/g, '');
}

function cleanPageTitle(title: string): string {
    const separators = [' - ', ' | ', ' : ', ' – ', ' — '];
    let cleaned = title;
    
    for (const sep of separators) {
        if (cleaned.includes(sep)) {
            const parts = cleaned.split(sep);
            if (parts[0]) {
                if (parts[0].trim().length > 3) {
                    cleaned = parts[0].trim();
                    break;
                }
            }
        }
    }
    
    return cleaned;
}

function cleanUrlBasename(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        let lastPart = pathParts[pathParts.length - 1];
        
        if (!lastPart) {
            return '';
        }

        const dotIndex = lastPart.lastIndexOf('.');
        if (dotIndex > 0) {
            lastPart = lastPart.substring(0, dotIndex);
        }

        lastPart = lastPart.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '');
        lastPart = lastPart.replace(/(_[wrfpx]{1,3}[0-9.]+)/gi, '');
        lastPart = lastPart.replace(/^[_\-]+|[_\-]+$/g, '');

        return lastPart;
    } catch (e) {
        return '';
    }
}

// Track filenames used in the current session to handle simultaneous downloads
const sessionFilenameCounter: Record<string, number> = {};

async function generateFilename(imageUrl: string, format: string, altText: string | null, titleAttr: string | null, pageTitle: string | null): Promise<string> {
    const items = await chrome.storage.sync.get({ 
        filenamePattern: '{hostname}_{title}_{alt}_{date}.{ext}' 
    });
    let pattern = items.filenamePattern;

    // Prepare metadata
    const url = new URL(imageUrl);
    const hostname = url.hostname;
    
    // Extract original filename
    const cleanBasename = cleanUrlBasename(imageUrl);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const cleanTitle = pageTitle ? sanitizeFilename(cleanPageTitle(pageTitle)) : '';
    const cleanAlt = altText ? sanitizeFilename(altText.trim()) : '';
    const cleanTitleAttr = titleAttr ? sanitizeFilename(titleAttr.trim()) : '';
    const cleanOrig = sanitizeFilename(cleanBasename);

    const replacements: Record<string, string> = {
        'title': cleanTitle,
        'alt': cleanAlt,
        'title_attr': cleanTitleAttr,
        'filename': cleanOrig,
        'hostname': hostname,
        'date': dateStr,
        'time': timeStr,
        'ext': format
    };

    let filename = pattern;
    Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        filename = filename.replace(regex, value);
    });

    // Post-processing
    // 1. Flatten all slashes to underscores
    filename = filename.replace(/\/+/g, '_');

    // Separate name and extension if they are at the end
    let nameWithoutExt = filename;
    if (nameWithoutExt.toLowerCase().endsWith('.' + format.toLowerCase())) {
        nameWithoutExt = nameWithoutExt.substring(0, nameWithoutExt.length - (format.length + 1));
    }

    // 2. Replace multiple underscores/hyphens with single ones
    // 3. Remove leading/trailing underscores/hyphens
    nameWithoutExt = nameWithoutExt
        .replace(/^[-_]+|[-_]+$/g, '')
        .replace(/[-_]{2,}/g, '_');
    
    if (!nameWithoutExt || nameWithoutExt === '') {
        nameWithoutExt = 'image_' + now.getTime();
    }

    // Limit length of filename component (keeping some room for the suffix)
    if (nameWithoutExt.length > 120) {
        nameWithoutExt = nameWithoutExt.substring(0, 120).replace(/_+$/, '');
    }

    // Handle iteration for multiple images from the same page
    const baseKey = `${hostname}_${nameWithoutExt}`;
    if (!sessionFilenameCounter[baseKey]) {
        sessionFilenameCounter[baseKey] = 0;
    }
    
    let finalFilename = '';
    let iteration = sessionFilenameCounter[baseKey];
    
    // Check download history to see if we should start higher than our session counter
    try {
        const existing = await chrome.downloads.search({
            filenameRegex: `${nameWithoutExt}.*\\.${format}`
        });
        if (existing.length > iteration) {
            iteration = existing.length;
        }
    } catch (e) {
        // Fallback to session counter if search fails
    }

    if (iteration > 0) {
        const suffix = '-' + (iteration + 1).toString().padStart(2, '0');
        finalFilename = `${nameWithoutExt}${suffix}.${format}`;
    } else {
        finalFilename = `${nameWithoutExt}.${format}`;
    }

    // Increment for next call in this session
    sessionFilenameCounter[baseKey] = iteration + 1;

    return finalFilename;
}

async function processImageDownload(imageUrl: string, format: string, altText: string | null, titleAttr: string | null, pageTitle: string | null) {
    console.log(`processImageDownload started: ${imageUrl} (${format})`);
    activeOffscreenOperations = activeOffscreenOperations + 1;
    try {
        console.log('Ensuring offscreen document...');
        await ensureOffscreenDocument();
        console.log('Offscreen document ensured. Sending CONVERT_IMAGE message...');
        const response = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: format }
        });
        console.log('Received response from offscreen:', response ? 'yes' : 'no');

        if (response) {
            if (response.success) {
                const filename = await generateFilename(imageUrl, format, altText, titleAttr, pageTitle);
                console.log(`Triggering download with filename: ${filename}`);
                await chrome.downloads.download({
                    url: response.data,
                    filename: filename,
                    saveAs: true
                });
            } else {
                console.error('Conversion failed in offscreen document:', response.error);
                throw new Error(response.error || 'Conversion failed');
            }
        } else {
            console.error('No response from offscreen document');
            throw new Error('No response from offscreen document');
        }
    } catch (e) {
        console.error('Error in processImageDownload:', e);
        throw e;
    } finally {
        activeOffscreenOperations = activeOffscreenOperations - 1;
        scheduleOffscreenClosing();
    }
}

async function processImageCopy(imageUrl: string, tabId: number) {
    activeOffscreenOperations = activeOffscreenOperations + 1;
    try {
        await ensureOffscreenDocument();
        const response = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: 'png' }
        });

        if (response) {
            if (response.success) {
                const copyResponse = await chrome.tabs.sendMessage(tabId, { 
                    type: 'WRITE_TO_CLIPBOARD', 
                    dataUrl: response.data 
                });
                
                if (copyResponse) {
                    if (!copyResponse.success) {
                        throw new Error(copyResponse.error || 'Content script failed to write to clipboard');
                    }
                } else {
                    throw new Error('No response from content script for clipboard write');
                }
            } else {
                throw new Error(response.error || 'Image conversion for clipboard failed');
            }
        } else {
            throw new Error('No response from offscreen document');
        }
    } finally {
        activeOffscreenOperations = activeOffscreenOperations - 1;
        scheduleOffscreenClosing();
    }
}
