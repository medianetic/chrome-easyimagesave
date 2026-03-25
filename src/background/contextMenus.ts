import { processImageDownload, processImageCopy, handleError } from './downloadManager';

export interface ImageMetadata {
    imageUrl: string | null;
    altText: string | null;
    titleAttr: string | null;
    pageTitle: string | null;
}

export function setupContextMenus() {
    chrome.contextMenus.removeAll(() => {
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
}

export async function handleContextMenuClick(info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) {
    const menuItemId = info.menuItemId;
    if (typeof menuItemId !== 'string') return;

    let imageUrl = info.srcUrl;
    let altText: string | null = null;
    let titleAttr: string | null = null;
    let pageTitle: string | null = null;

    if (tab?.id) {
        try {
            const response: ImageMetadata = await chrome.tabs.sendMessage(tab.id, { type: 'GET_IMAGE_URL' });
            if (response) {
                if (response.imageUrl) imageUrl = response.imageUrl;
                altText = response.altText;
                titleAttr = response.titleAttr;
                pageTitle = response.pageTitle;
            }
        } catch (e) {
            console.error('Error getting image metadata from content script:', e);
        }
    }

    if (!imageUrl) {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'easeimagesave-icon-48.png',
            title: 'Operation Failed',
            message: 'No image found at this location.'
        });
        return;
    }

    if (menuItemId.startsWith('save-')) {
        const format = menuItemId.split('-')[1];
        try {
            await processImageDownload(imageUrl, format, altText, titleAttr, pageTitle);
        } catch (error: any) {
            handleError(error);
        }
    } else if (menuItemId === 'copy-to-clipboard') {
        if (tab?.id) {
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
