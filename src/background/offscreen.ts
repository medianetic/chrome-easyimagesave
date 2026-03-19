chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.target === 'offscreen') {
        if (message.type === 'CONVERT_IMAGE') {
            convertImage(message.data.imageUrl, message.data.format)
                .then(result => {
                    sendResponse({ success: true, data: result });
                })
                .catch(error => {
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
                .catch(error => {
                    console.error('Clipboard error:', error);
                    sendResponse({ success: false, error: error.message });
                });
            return true;
        }
    }
});

async function convertImage(url: string, format: string): Promise<string> {
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
        throw new Error('Could not get canvas context');
    }
    
    ctx.drawImage(bitmap, 0, 0);
    
    let mimeType = '';
    if (format === 'jpg') {
        mimeType = 'image/jpeg';
    } else {
        mimeType = 'image/' + format;
    }
    
    return canvas.toDataURL(mimeType);
}

async function copyImageToClipboard(url: string): Promise<void> {
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
        throw new Error('Could not get canvas context');
    }
    
    ctx.drawImage(bitmap, 0, 0);
    
    return new Promise((resolve, reject) => {
        canvas.toBlob(async (blob) => {
            if (!blob) {
                reject(new Error('Failed to create blob from canvas'));
                return;
            }
            
            try {
                const data = [new ClipboardItem({ 'image/png': blob })];
                await navigator.clipboard.write(data);
                resolve();
            } catch (err: any) {
                reject(err);
            }
        }, 'image/png');
    });
}
