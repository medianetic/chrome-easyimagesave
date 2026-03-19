chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'CONVERT_IMAGE' && message.target === 'offscreen') {
        convertImage(message.data.imageUrl, message.data.format)
            .then(result => {
                sendResponse({ success: true, data: result });
            })
            .catch(error => {
                console.error('Conversion error:', error);
                sendResponse({ success: false, error: error.message });
            });
        return true; // Essential to keep the message channel open for sendResponse
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
