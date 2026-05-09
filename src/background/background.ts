import { setupContextMenus, handleContextMenuClick } from './contextMenus';

chrome.runtime.onInstalled.addListener(() => {
    setupContextMenus();
});

chrome.contextMenus.onClicked.addListener(handleContextMenuClick);

// Expose for Playwright testing
if (typeof self !== 'undefined') {
    (self as any).__test_handleContextMenuClick = handleContextMenuClick;
}
