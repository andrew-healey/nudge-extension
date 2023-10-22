chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.closeWindow) {
        chrome.tabs.remove(sender.tab.id);
    }
});
