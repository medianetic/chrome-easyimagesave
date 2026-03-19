let lastRightClickedElement: HTMLElement | null = null;

document.addEventListener('contextmenu', (event) => {
    lastRightClickedElement = event.target as HTMLElement;
}, true);

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_IMAGE_URL') {
        const imageUrl = getImageUrl(lastRightClickedElement);
        sendResponse({ imageUrl: imageUrl });
    }
    return true;
});

function getImageUrl(element: HTMLElement | null): string | null {
    if (!element) {
        return null;
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

    // 1. Check if it's an <img> tag
    if (element instanceof HTMLImageElement) {
        const attrUrl = findInAttributes(element);
        if (attrUrl) {
            return attrUrl;
        }
        return element.src;
    }

    // 2. Check if it's a <picture> tag or has a source
    const imgInside = element.querySelector('img');
    if (imgInside) {
        if (imgInside instanceof HTMLElement) {
            const attrUrl = findInAttributes(imgInside);
            if (attrUrl) {
                return attrUrl;
            }
            if (imgInside instanceof HTMLImageElement) {
                return imgInside.src;
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
                    return match[1];
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
                    return attrUrl;
                }
                if (parentImg instanceof HTMLImageElement) {
                    return parentImg.src;
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
                        return match[1];
                    }
                }
            }
        }
        parent = parent.parentElement;
        depth = depth + 1;
    }

    return null;
}
