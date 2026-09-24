// Clicking the toolbar button opens the academy in a new tab.
chrome.action.onClicked.addListener(function () {
  chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
});
