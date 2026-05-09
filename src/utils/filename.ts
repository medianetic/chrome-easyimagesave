export function sanitizeFilename(name: string): string {
    return name.replace(/[<>:"/\\|?*]/g, '_')
               .replace(/\s+/g, '_')
               .replace(/_{2,}/g, '_')
               .replace(/^_+|_+$/g, '');
}

export function cleanPageTitle(title: string): string {
    const separators = [' - ', ' | ', ' : ', ' – ', ' — '];
    let cleaned = title;
    
    for (const sep of separators) {
        if (cleaned.includes(sep)) {
            const parts = cleaned.split(sep);
            if (parts[0] && parts[0].trim().length > 3) {
                cleaned = parts[0].trim();
                break;
            }
        }
    }
    
    return cleaned;
}

export function cleanUrlBasename(url: string): string {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        let lastPart = pathParts[pathParts.length - 1];
        
        if (!lastPart) return '';

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
