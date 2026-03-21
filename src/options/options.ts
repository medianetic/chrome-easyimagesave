const DEFAULT_PATTERN = '{hostname}_{title}_{alt}_{date}.{ext}';

const patternInput = document.getElementById('pattern') as HTMLInputElement;
const previewDiv = document.getElementById('preview') as HTMLDivElement;
const saveBtn = document.getElementById('save') as HTMLButtonElement;
const statusSpan = document.getElementById('status') as HTMLSpanElement;
const tags = document.querySelectorAll('.placeholder-tag');

const MOCK_DATA = {
    title: 'Cat_-_Wikipedia',
    alt: 'Tabby_cat_sitting',
    title_attr: 'A_beautiful_tabby_cat',
    filename: '250px-Cat',
    hostname: 'en.wikipedia.org',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].replace(/:/g, '-'),
    ext: 'jpg'
};

function updatePreview() {
    let pattern = patternInput.value || DEFAULT_PATTERN;
    let preview = pattern;

    Object.entries(MOCK_DATA).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        preview = preview.replace(regex, value);
    });

    // Clean up all slashes to make it flat
    preview = preview.replace(/\/+/g, '_');

    previewDiv.textContent = preview;
}

// Load settings
chrome.storage.sync.get({ filenamePattern: DEFAULT_PATTERN }, (items) => {
    patternInput.value = items.filenamePattern;
    updatePreview();
});

// Save settings
saveBtn.addEventListener('click', () => {
    const pattern = patternInput.value;
    chrome.storage.sync.set({ filenamePattern: pattern }, () => {
        statusSpan.style.opacity = '1';
        setTimeout(() => {
            statusSpan.style.opacity = '0';
        }, 2000);
    });
});

// Real-time preview
patternInput.addEventListener('input', updatePreview);

// Insert tags
tags.forEach(tag => {
    tag.addEventListener('click', () => {
        const tagText = (tag as HTMLElement).dataset.tag || '';
        const start = patternInput.selectionStart || 0;
        const end = patternInput.selectionEnd || 0;
        const text = patternInput.value;
        
        patternInput.value = text.substring(0, start) + tagText + text.substring(end);
        patternInput.focus();
        patternInput.setSelectionRange(start + tagText.length, start + tagText.length);
        updatePreview();
    });
});
