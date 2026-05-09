chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target === 'offscreen') {
        if (message.type === 'CONVERT_IMAGE') {
            convertImage(message.data.imageUrl, message.data.format)
                .then((result) => {
                    sendResponse({ success: true, data: result });
                })
                .catch((error) => {
                    console.error('Conversion error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }

        if (message.type === 'COPY_TO_CLIPBOARD') {
            copyImageToClipboard(message.data.imageUrl)
                .then(() => {
                    sendResponse({ success: true });
                })
                .catch((error) => {
                    console.error('Clipboard error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }
    }
});

function isValidUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString);
        if (url.protocol === 'http:') {
            return true;
        }
        if (url.protocol === 'https:') {
            return true;
        }
        if (url.protocol === 'data:') {
            return true;
        }
        if (url.protocol === 'file:') {
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

async function convertImage(url: string, format: string): Promise<string> {
    if (!isValidUrl(url)) {
        throw new Error('Invalid or unsupported image URL protocol.');
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch image: ' + response.statusText);
        }
        
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close(); // Clean up memory
            throw new Error('Could not get canvas context');
        }
        
        ctx.drawImage(bitmap, 0, 0);
        
        let mimeType = '';
        if (format === 'jpg') {
            mimeType = 'image/jpeg';
        } else {
            mimeType = 'image/' + format;
        }
        
        const dataUrl = canvas.toDataURL(mimeType);

        // Explicit Cleanup
        bitmap.close();
        canvas.width = 0;
        canvas.height = 0;

        return dataUrl;
    } catch (error: any) {
        if (url.startsWith('file:')) {
            throw new Error('Failed to access local file. Please ensure "Allow access to file URLs" is enabled in the extension settings.');
        }
        throw error;
    }
}

async function copyImageToClipboard(url: string): Promise<void> {
    if (!isValidUrl(url)) {
        throw new Error('Invalid or unsupported image URL protocol.');
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to fetch image: ' + response.statusText);
        }
        
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            bitmap.close(); // Clean up memory
            throw new Error('Could not get canvas context');
        }
        
        ctx.drawImage(bitmap, 0, 0);
        
        return new Promise((resolve, reject) => {
            canvas.toBlob(async (resultBlob) => {
                // Cleanup bitmap immediately after drawing
                bitmap.close();

                if (!resultBlob) {
                    reject(new Error('Failed to create blob from canvas'));
                    return;
                }
                
                try {
                    const data = [new ClipboardItem({ 'image/png': resultBlob })];
                    await navigator.clipboard.write(data);
                    
                    // Cleanup canvas
                    canvas.width = 0;
                    canvas.height = 0;
                    
                    resolve();
                } catch (err: any) {
                    reject(err);
                }
            }, 'image/png');
        });
    } catch (error: any) {
        if (url.startsWith('file:')) {
            throw new Error('Failed to access local file. Please ensure "Allow access to file URLs" is enabled in the extension settings.');
        }
        throw error;
    }
}
