// background.js

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    resetExtensionState();
  }
});

chrome.tabs.onCreated.addListener((tab) => {
  resetExtensionState();
});

function resetExtensionState() {
  chrome.storage.local.set(
    {
      isEnabled: false,
      fromLang: "English",
      toLang: "Spanish",
      difficultyLevel: "",
    },
    () => {
      chrome.runtime.sendMessage({ action: "stateReset" });
    }
  );
}
