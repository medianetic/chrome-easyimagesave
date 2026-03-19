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
    pageTitle: string | null;
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const menuItemId = info.menuItemId;
    if (typeof menuItemId === 'string') {
        let imageUrl = info.srcUrl;
        let altText: string | null = null;
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
                iconUrl: 'icon-48.png',
                title: 'Operation Failed',
                message: 'No image found at this location.'
            });
            return;
        }

        if (menuItemId.startsWith('save-')) {
            const menuItemParts = menuItemId.split('-');
            const format = menuItemParts[1];
            try {
                await processImageDownload(imageUrl, format, altText, pageTitle);
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
                            iconUrl: 'icon-48.png',
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
});

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
        iconUrl: 'icon-48.png',
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

function generateFilename(url: string, format: string, altText: string | null, pageTitle: string | null): string {
    const cleanTitle = pageTitle ? cleanPageTitle(pageTitle) : '';
    const cleanBasename = cleanUrlBasename(url);
    
    let descriptivePart = '';

    if (altText) {
        const trimmedAlt = altText.trim();
        if (trimmedAlt.length > 3 && trimmedAlt.length < 60) {
            descriptivePart = trimmedAlt;
        }
    }

    if (!descriptivePart) {
        if (cleanBasename.length > 2) {
            descriptivePart = cleanBasename;
        }
    }

    let finalName = '';
    if (cleanTitle) {
        finalName = sanitizeFilename(cleanTitle);
    }

    if (descriptivePart) {
        if (finalName) {
            finalName = finalName + '_';
        }
        finalName = finalName + sanitizeFilename(descriptivePart);
    }

    if (!finalName) {
        finalName = 'image_' + new Date().getTime();
    }

    if (finalName.length > 80) {
        finalName = finalName.substring(0, 80);
        finalName = finalName.replace(/_+$/, '');
    }

    return finalName + '.' + format;
}

async function processImageDownload(imageUrl: string, format: string, altText: string | null, pageTitle: string | null) {
    activeOffscreenOperations = activeOffscreenOperations + 1;
    try {
        await ensureOffscreenDocument();
        const response = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: format }
        });

        if (response) {
            if (response.success) {
                const filename = generateFilename(imageUrl, format, altText, pageTitle);
                await chrome.downloads.download({
                    url: response.data,
                    filename: filename,
                    saveAs: true
                });
            } else {
                throw new Error(response.error || 'Conversion failed');
            }
        } else {
            throw new Error('No response from offscreen document');
        }
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
