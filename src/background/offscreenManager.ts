let offscreenCloseTimer: ReturnType<typeof setTimeout> | null = null;
let activeOffscreenOperations: number = 0;

export async function ensureOffscreenDocument() {
    if (await chrome.offscreen.hasDocument()) {
        return;
    }

    const offscreenPath = 'src/background/offscreen.html';
    const reasons = ['CLIPBOARD', 'BLOBS', 'DOM_PARSER'];

    for (const reason of reasons) {
        try {
            await chrome.offscreen.createDocument({
                url: offscreenPath,
                reasons: [reason as chrome.offscreen.Reason],
                justification: 'Image format conversion and clipboard access'
            });
            console.log('Offscreen document created successfully with reason: ' + reason);
            return;
        } catch (e: any) {
            if (e.message) {
                if (e.message.includes('Only one offscreen document')) {
                    return;
                }
            }
            console.warn('Failed to create offscreen document with reason ' + reason + ': ' + e.message);
        }
    }
    throw new Error('Failed to create offscreen document with any supported reason.');
}

export function incrementOffscreenOperations() {
    activeOffscreenOperations++;
}

export function decrementOffscreenOperations() {
    activeOffscreenOperations--;
    scheduleOffscreenClosing();
}

function scheduleOffscreenClosing() {
    if (offscreenCloseTimer) {
        clearTimeout(offscreenCloseTimer);
        offscreenCloseTimer = null;
    }

    if (activeOffscreenOperations === 0) {
        offscreenCloseTimer = setTimeout(async () => {
            try {
                const hasDocument = await chrome.offscreen.hasDocument();
                if (hasDocument) {
                    if (activeOffscreenOperations === 0) {
                        await chrome.offscreen.closeDocument();
                        console.log('Offscreen document closed due to inactivity.');
                    }
                }
            } catch (error) {
                console.error('Error during offscreen document closing:', error);
            } finally {
                offscreenCloseTimer = null;
            }
        }, 30000);
    }
}
