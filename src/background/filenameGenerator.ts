import { sanitizeFilename, cleanPageTitle, cleanUrlBasename } from '../utils/filename';

// Track filenames used in the current session to handle simultaneous downloads
const sessionFilenameCounter: Record<string, number> = {};

export async function generateFilename(imageUrl: string, format: string, altText: string | null, titleAttr: string | null, pageTitle: string | null): Promise<string> {
    const items = await chrome.storage.sync.get({ 
        filenamePattern: '{hostname}_{title}_{alt}_{date}.{ext}' 
    }) as { filenamePattern: string };
    const pattern: string = items.filenamePattern;

    const url = new URL(imageUrl);
    const hostname = url.hostname;
    const cleanBasename = cleanUrlBasename(imageUrl);
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');

    const replacements: Record<string, string> = {
        'title': pageTitle ? sanitizeFilename(cleanPageTitle(pageTitle)) : '',
        'alt': altText ? sanitizeFilename(altText.trim()) : '',
        'title_attr': titleAttr ? sanitizeFilename(titleAttr.trim()) : '',
        'filename': sanitizeFilename(cleanBasename),
        'hostname': hostname,
        'date': dateStr,
        'time': timeStr,
        'ext': format
    };

    let filename: string = pattern;
    Object.entries(replacements).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        filename = filename.replace(regex, value);
    });

    filename = filename.replace(/\/+/g, '_');

    let nameWithoutExt: string = filename;
    if (nameWithoutExt.toLowerCase().endsWith('.' + format.toLowerCase())) {
        nameWithoutExt = nameWithoutExt.substring(0, nameWithoutExt.length - (format.length + 1));
    }

    nameWithoutExt = nameWithoutExt
        .replace(/^[-_]+|[-_]+$/g, '')
        .replace(/[-_]{2,}/g, '_');
    
    if (!nameWithoutExt) {
        nameWithoutExt = 'image_' + now.getTime();
    }

    if (nameWithoutExt.length > 120) {
        nameWithoutExt = nameWithoutExt.substring(0, 120).replace(/_+$/, '');
    }

    const baseKey = `${hostname}_${nameWithoutExt}`;
    if (!sessionFilenameCounter[baseKey]) {
        sessionFilenameCounter[baseKey] = 0;
    }
    
    let iteration = sessionFilenameCounter[baseKey];
    
    try {
        const existing = await chrome.downloads.search({
            filenameRegex: `${nameWithoutExt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}.*\\.${format}`
        });
        if (existing.length > iteration) {
            iteration = existing.length;
        }
    } catch (e) {}

    let finalFilename = iteration > 0 
        ? `${nameWithoutExt}-${(iteration + 1).toString().padStart(2, '0')}.${format}`
        : `${nameWithoutExt}.${format}`;

    sessionFilenameCounter[baseKey] = iteration + 1;

    return finalFilename;
}
