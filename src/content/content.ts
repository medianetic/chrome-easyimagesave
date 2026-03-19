let lastRightClickedElement: HTMLElement | null = null;

document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target as HTMLElement;
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_IMAGE_URL') {
        const imageInfo = getImageUrlInfo(lastRightClickedElement);
        sendResponse(imageInfo);
    }
    return true;
});

interface ImageInfo {
    imageUrl: string | null;
    altText: string | null;
    pageTitle: string | null;
}

function getImageUrlInfo(element: HTMLElement | null): ImageInfo {
    const info: ImageInfo = {
        imageUrl: null,
        altText: null,
        pageTitle: document.title
    };

    if (!element) {
        return info;
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

    // 1. Check if it's an <img> tag
    if (element instanceof HTMLImageElement) {
        info.imageUrl = findInAttributes(element);
        if (!info.imageUrl) {
            info.imageUrl = element.src;
        }
        info.altText = element.alt;
        return info;
    }

    // 2. Check if it's a <picture> tag or has a source
    const imgInside = element.querySelector('img');
    if (imgInside) {
        if (imgInside instanceof HTMLElement) {
            info.imageUrl = findInAttributes(imgInside);
            if (!info.imageUrl) {
                if (imgInside instanceof HTMLImageElement) {
                    info.imageUrl = imgInside.src;
                }
            }
            if (imgInside instanceof HTMLImageElement) {
                info.altText = imgInside.alt;
            }
        }
        if (info.imageUrl) {
            return info;
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
                    info.imageUrl = match[1];
                    info.altText = getAlt(element);
                    return info;
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
                info.imageUrl = findInAttributes(parentImg);
                if (!info.imageUrl) {
                    if (parentImg instanceof HTMLImageElement) {
                        info.imageUrl = parentImg.src;
                    }
                }
                if (parentImg instanceof HTMLImageElement) {
                    info.altText = parentImg.alt;
                }
            }
            if (info.imageUrl) {
                return info;
            }
        }

        const parentStyle = window.getComputedStyle(parent);
        const parentBg = parentStyle.backgroundImage;
        if (parentBg) {
            if (parentBg !== 'none') {
                const match = parentBg.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) {
                    if (match[1]) {
                        info.imageUrl = match[1];
                        info.altText = getAlt(parent);
                        return info;
                    }
                }
            }
        }
        parent = parent.parentElement;
        depth = depth + 1;
    }

    return info;
}
