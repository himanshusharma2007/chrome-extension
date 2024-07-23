// background.js
chrome.action.onClicked.addListener((tab) => {
  chrome.scripting
    .executeScript({
      target: { tabId: tab.id },
      files: ["assets/contentScript.js"],
    })
    .then(() => {
      console.log("Content script injected successfully");
    })
    .catch((error) => {
      console.error("Failed to inject content script:", error);
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "injectContentScript") {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        files: ["assets/contentScript.js"],
      });
    });
  }
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
    },
    () => {
      chrome.runtime.sendMessage({ action: "stateReset" });
    }
  );
}
