// Background service worker
// Handles storage and any future alarm-based features

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ aiUsage: {} });
});
