// background.js
chrome.runtime.onInstalled.addListener(() => {
  console.log("Extension installed");
});

chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggleTranslation" });
});

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
      useAI: true,
    },
    () => {
      chrome.runtime.sendMessage({ action: "stateReset" });
    }
  );
}
