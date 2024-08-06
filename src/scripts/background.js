// background.js

chrome.tabs.onActivated.addListener((activeInfo) => {
  checkAndUpdateExtensionState(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    checkAndUpdateExtensionState(tabId);
  }
});

function checkAndUpdateExtensionState(tabId) {
  chrome.tabs.sendMessage(tabId, { action: "getState" }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script might not be loaded yet, set default state
      setDefaultState();
    } else if (response && response.state) {
      // Update popup with the state from content script
      chrome.storage.local.set(response.state);
    } else {
      // No state found, set default state
      setDefaultState();
    }
  });
}

function setDefaultState() {
  chrome.storage.local.set({
    isEnabled: false,
    fromLang: "English",
    toLang: "Spanish",
    difficultyLevel: "",
    isAIEnabled: false,
  });
}
