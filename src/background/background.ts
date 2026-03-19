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
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    const menuItemId = info.menuItemId;
    if (typeof menuItemId === 'string') {
        if (menuItemId.startsWith('save-')) {
            const menuItemParts = menuItemId.split('-');
            const format = menuItemParts[1];
            let imageUrl = info.srcUrl;

            console.log('Context menu clicked. Format: ' + format + ', info.srcUrl: ' + imageUrl);

            // If no srcUrl, try to get it from content script
            if (!imageUrl) {
                if (tab) {
                    if (tab.id) {
                        try {
                            const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_IMAGE_URL' });
                            if (response) {
                                if (response.imageUrl) {
                                    imageUrl = response.imageUrl;
                                }
                            }
                            console.log('Fetched imageUrl from content script: ' + imageUrl);
                        } catch (e) {
                            console.error('Error getting image URL from content script:', e);
                        }
                    }
                }
            }

            if (imageUrl) {
                try {
                    await processImageDownload(imageUrl, format);
                } catch (error: any) {
                    console.error('Error processing image:', error);
                    
                    let errorMessage = 'Error processing image';
                    if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icon-48.png',
                        title: 'Save Failed',
                        message: errorMessage
                    });
                }
            } else {
                console.error('No image found at click location');
                chrome.notifications.create({
                    type: 'basic',
                    iconUrl: 'icon-48.png',
                    title: 'Save Failed',
                    message: 'No image found at this location.'
                });
            }
        }
    }
});

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
                justification: 'Image format conversion'
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
            // Try next reason
        }
    }
    throw new Error('Failed to create offscreen document with any supported reason.');
}

async function processImageDownload(imageUrl: string, format: string) {
    console.log('Starting download process for ' + imageUrl + '.');

    // 1. Ensure offscreen document exists with fallback logic
    await ensureOffscreenDocument();

    // 2. Send message to offscreen document to convert image
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: format }
        });

        if (response) {
            if (response.success) {
                // 3. Trigger download
                const timestamp = new Date().getTime();
                const filename = 'image-' + timestamp + '.' + format;
                
                console.log('Conversion successful. Triggering download for ' + filename);
                
                await chrome.downloads.download({
                    url: response.data,
                    filename: filename,
                    saveAs: true
                });
            } else {
                let errorDetails = 'Unknown error in offscreen document';
                if (response.error) {
                    errorDetails = response.error;
                }
                throw new Error(errorDetails);
            }
        } else {
            throw new Error('No response from offscreen document');
        }
    } catch (e: any) {
        console.error('Error communicating with offscreen document:', e);
        throw new Error('Failed to convert image: ' + e.message);
    }
}
