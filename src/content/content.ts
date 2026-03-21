let lastRightClickedElement: HTMLElement | null = null;

document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target as HTMLElement;
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_IMAGE_URL') {
        const result = getImageUrlInfoAndElement(lastRightClickedElement);
        
        if (result.element) {
            highlightElement(result.element);
        }
        
        sendResponse(result.info);
        return true;
    }

    if (message.type === 'WRITE_TO_CLIPBOARD') {
        if (typeof message.dataUrl === 'string') {
            if (message.dataUrl.startsWith('data:image/png')) {
                writeToClipboard(message.dataUrl)
                    .then(() => {
                        sendResponse({ success: true });
                    })
                    .catch((error) => {
                        console.error('Clipboard write failed in content script:', error);
                        sendResponse({ success: false, error: error.message });
                    });
                return true;
            }
        }
        sendResponse({ success: false, error: 'Invalid image data received.' });
        return true;
    }
    
    return true;
});

function highlightElement(element: HTMLElement) {
    const originalOutline = element.style.outline;
    const originalOutlineOffset = element.style.outlineOffset;
    const originalTransition = element.style.transition;

    // Apply highlight
    element.style.transition = 'outline 0.2s ease-in-out';
    element.style.outline = '5px solid #4285f4';
    element.style.outlineOffset = '-5px';
    element.style.zIndex = '10000';

    // Remove highlight after a short delay
    setTimeout(() => {
        element.style.outline = originalOutline;
        element.style.outlineOffset = originalOutlineOffset;
        
        // Wait for transition to finish before restoring transition property
        setTimeout(() => {
            element.style.transition = originalTransition;
        }, 200);
    }, 800);
}

async function writeToClipboard(dataUrl: string): Promise<void> {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const data = [new ClipboardItem({ 'image/png': blob })];
    await navigator.clipboard.write(data);
}

interface ImageInfo {
    imageUrl: string | null;
    altText: string | null;
    titleAttr: string | null;
    pageTitle: string | null;
}

interface ExtractionResult {
    info: ImageInfo;
    element: HTMLElement | null;
}

function getImageUrlInfoAndElement(element: HTMLElement | null): ExtractionResult {
    const info: ImageInfo = {
        imageUrl: null,
        altText: null,
        titleAttr: null,
        pageTitle: document.title
    };

    const result: ExtractionResult = {
        info: info,
        element: null
    };

    if (!element) {
        return result;
    }

    const findInAttributes = (el: HTMLElement): string | null => {
        const src = el.getAttribute('src');
        if (src) {
            return src;
        }

        const dataSrc = el.getAttribute('data-src');
        if (dataSrc) {
            return dataSrc;
        }

        const dataOriginal = el.getAttribute('data-original');
        if (dataOriginal) {
            return dataOriginal;
        }

        const srcset = el.getAttribute('srcset');
        if (srcset) {
            const parts = srcset.split(' ');
            if (parts.length > 0) {
                return parts[0];
            }
        }

        return null;
    };

    const getAlt = (el: HTMLElement): string | null => {
        if (el instanceof HTMLImageElement) {
            return el.alt;
        }
        const imgInside = el.querySelector('img');
        if (imgInside) {
            return imgInside.alt;
        }
        return null;
    };

    const getTitleAttr = (el: HTMLElement): string | null => {
        const title = el.getAttribute('title');
        if (title) return title;
        const imgInside = el.querySelector('img');
        if (imgInside) {
            return imgInside.getAttribute('title');
        }
        return null;
    };

    const makeAbsolute = (url: string | null): string | null => {
        if (!url) return null;
        try {
            return new URL(url, document.baseURI).href;
        } catch (e) {
            return url;
        }
    };

    // 1. Check if it's an <img> tag
    if (element instanceof HTMLImageElement) {
        const attrUrl = findInAttributes(element);
        if (attrUrl) {
            info.imageUrl = makeAbsolute(attrUrl);
        } else {
            info.imageUrl = element.src;
        }
        info.altText = element.alt;
        info.titleAttr = element.getAttribute('title');
        result.element = element;
        return result;
    }

    // 2. Check if it's a <picture> tag or has a source
    const imgInside = element.querySelector('img');
    if (imgInside) {
        if (imgInside instanceof HTMLElement) {
            const attrUrl = findInAttributes(imgInside);
            if (attrUrl) {
                info.imageUrl = makeAbsolute(attrUrl);
            } else {
                if (imgInside instanceof HTMLImageElement) {
                    info.imageUrl = imgInside.src;
                }
            }
            if (imgInside instanceof HTMLImageElement) {
                info.altText = imgInside.alt;
                info.titleAttr = imgInside.getAttribute('title');
            }
            result.element = imgInside;
            if (info.imageUrl) {
                return result;
            }
        }
    }

    // 3. Check for background-image
    const style = window.getComputedStyle(element);
    const backgroundImage = style.backgroundImage;
    if (backgroundImage) {
        if (backgroundImage !== 'none') {
            const match = backgroundImage.match(/url\(['"]?(.*?)['"]?\)/);
            if (match) {
                if (match[1]) {
                    info.imageUrl = makeAbsolute(match[1]);
                    info.altText = getAlt(element);
                    info.titleAttr = getTitleAttr(element);
                    result.element = element;
                    return result;
                }
            }
        }
    }

    // 4. Recursively check parents (up to a certain depth for sliders)
    let parent = element.parentElement;
    let depth = 0;
    while (parent) {
        if (depth >= 5) {
            break;
        }

        const parentImg = parent.querySelector('img');
        if (parentImg) {
            if (parentImg instanceof HTMLElement) {
                const attrUrl = findInAttributes(parentImg);
                if (attrUrl) {
                    info.imageUrl = makeAbsolute(attrUrl);
                } else {
                    if (parentImg instanceof HTMLImageElement) {
                        info.imageUrl = parentImg.src;
                    }
                }
                if (parentImg instanceof HTMLImageElement) {
                    info.altText = parentImg.alt;
                    info.titleAttr = parentImg.getAttribute('title');
                }
                result.element = parentImg;
                if (info.imageUrl) {
                    return result;
                }
            }
        }

        const parentStyle = window.getComputedStyle(parent);
        const parentBg = parentStyle.backgroundImage;
        if (parentBg) {
            if (parentBg !== 'none') {
                const match = parentBg.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) {
                    if (match[1]) {
                        info.imageUrl = makeAbsolute(match[1]);
                        info.altText = getAlt(parent);
                        info.titleAttr = getTitleAttr(parent);
                        result.element = parent;
                        return result;
                    }
                }
            }
        }
        parent = parent.parentElement;
        depth = depth + 1;
    }

    return result;
}
