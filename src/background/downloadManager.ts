import { ensureOffscreenDocument, incrementOffscreenOperations, decrementOffscreenOperations } from './offscreenManager';
import { generateFilename } from './filenameGenerator';

interface OffscreenResponse {
    success: boolean;
    data?: string;
    error?: string;
}

export async function processImageDownload(imageUrl: string, format: string, altText: string | null, titleAttr: string | null, pageTitle: string | null) {
    console.log(`processImageDownload started: ${imageUrl} (${format})`);
    incrementOffscreenOperations();
    try {
        await ensureOffscreenDocument();
        const response: OffscreenResponse = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: format }
        });

        if (response && response.success && response.data) {
            const filename = await generateFilename(imageUrl, format, altText, titleAttr, pageTitle);
            await chrome.downloads.download({
                url: response.data,
                filename: filename,
                saveAs: true
            });
        } else {
            throw new Error(response?.error || 'Conversion failed');
        }
    } finally {
        decrementOffscreenOperations();
    }
}

export async function processImageCopy(imageUrl: string, tabId: number) {
    incrementOffscreenOperations();
    try {
        await ensureOffscreenDocument();
        const response: OffscreenResponse = await chrome.runtime.sendMessage({
            type: 'CONVERT_IMAGE',
            target: 'offscreen',
            data: { imageUrl: imageUrl, format: 'png' }
        });

        if (response && response.success && response.data) {
            const copyResponse = await chrome.tabs.sendMessage(tabId, { 
                type: 'WRITE_TO_CLIPBOARD', 
                dataUrl: response.data 
            });
            
            if (copyResponse && !copyResponse.success) {
                throw new Error(copyResponse.error || 'Content script failed to write to clipboard');
            } else if (!copyResponse) {
                throw new Error('No response from content script for clipboard write');
            }
        } else {
            throw new Error(response?.error || 'Image conversion for clipboard failed');
        }
    } finally {
        decrementOffscreenOperations();
    }
}

export function handleError(error: any) {
    console.error('Error:', error);
    let errorMessage = error.message || 'An error occurred';
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
