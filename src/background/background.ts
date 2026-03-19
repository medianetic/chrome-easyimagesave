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
            try {
                await processImageCopy(imageUrl);
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
});

function handleError(error: any) {
    console.error('Error:', error);
    let errorMessage = 'An error occurred';
    if (error.message) {
        errorMessage = error.message;
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
    const reasons = ['CANVAS', 'DOM_PARSER'];

    for (const reason of reasons) {
        try {
            await chrome.offscreen.createDocument({
                url: offscreenPath,
                reasons: [reason as chrome.offscreen.Reason],
                justification: 'Image format conversion and clipboard access'
            });
            return;
        } catch (e: any) {
            if (e.message) {
                if (e.message.includes('Only one offscreen document')) {
                    return;
                }
            }
        }
    }
    throw new Error('Failed to create offscreen document.');
}

function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

function generateFilename(url: string, format: string, altText: string | null, pageTitle: string | null): string {
    let baseName = '';

    // 1. Try to get filename from URL
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart) {
            const dotIndex = lastPart.lastIndexOf('.');
            if (dotIndex > 0) {
                baseName = lastPart.substring(0, dotIndex);
            } else {
                baseName = lastPart;
            }
        }
    } catch (e) {
        // Ignore URL parsing errors
    }

    // 2. Fallback to alt text if URL basename is empty or too short
    if (baseName.length < 3) {
        if (altText) {
            if (altText.trim().length > 0) {
                baseName = altText.trim();
            }
        }
    }

    // 3. Add page title as prefix if available
    let finalName = '';
    if (pageTitle) {
        finalName = sanitizeFilename(pageTitle.trim()) + '_';
    }

    if (baseName) {
        finalName = finalName + sanitizeFilename(baseName);
    } else {
        finalName = finalName + 'image_' + new Date().getTime();
    }

    // Limit length
    if (finalName.length > 150) {
        finalName = finalName.substring(0, 150);
    }

    return finalName + '.' + format;
}

async function processImageDownload(imageUrl: string, format: string, altText: string | null, pageTitle: string | null) {
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
}

async function processImageCopy(imageUrl: string) {
    await ensureOffscreenDocument();
    const response = await chrome.runtime.sendMessage({
        type: 'COPY_TO_CLIPBOARD',
        target: 'offscreen',
        data: { imageUrl: imageUrl }
    });

    if (response) {
        if (!response.success) {
            throw new Error(response.error || 'Clipboard copy failed');
        }
    } else {
        throw new Error('No response from offscreen document');
    }
}
