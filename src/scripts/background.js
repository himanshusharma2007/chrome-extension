// background.js

let activeTabId = null;

chrome.tabs.onActivated.addListener((activeInfo) => {
  if (activeTabId !== activeInfo.tabId) {
    activeTabId = activeInfo.tabId;
    resetExtensionState();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tabId === activeTabId) {
    resetExtensionState();
  }
});

function resetExtensionState() {
  chrome.storage.local.set(
    {
      isEnabled: false,
      fromLang: "English",
      toLang: "Spanish",
      difficultyLevel: "",
      isAIEnabled: false,
    },
    () => {
      chrome.runtime.sendMessage({ action: "stateReset" });
    }
  );
}
