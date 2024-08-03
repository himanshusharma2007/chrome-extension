// background.js

// Object to store the state for each tab
const tabStates = {};

// Function to initialize or reset the state for a tab
function initializeTabState(tabId) {
  tabStates[tabId] = {
    isEnabled: false,
    fromLang: "English",
    toLang: "Spanish",
    difficultyLevel: "",
    isAIEnabled: false,
  };
}

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  if (!tabStates[activeInfo.tabId]) {
    initializeTabState(activeInfo.tabId);
  }
  updateBadge(activeInfo.tabId);
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading") {
    // Reset the state when the tab starts loading (i.e., on reload)
    initializeTabState(tabId);
  }
  if (changeInfo.status === "complete") {
    updateBadge(tabId);
  }
});

// Listen for tab removal
chrome.tabs.onRemoved.addListener((tabId) => {
  delete tabStates[tabId];
});

// Function to update the extension badge
function updateBadge(tabId) {
  const state = tabStates[tabId];
  if (state && state.isEnabled) {
    chrome.action.setBadgeText({ text: "ON", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }
}

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getState") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    sendResponse({ state: tabStates[tabId] || {} });
  } else if (request.action === "setState") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    tabStates[tabId] = request.state;
    updateBadge(tabId);
    sendResponse({ success: true });
  } else if (request.action === "resetState") {
    const tabId = sender.tab ? sender.tab.id : request.tabId;
    initializeTabState(tabId);
    updateBadge(tabId);
    sendResponse({ success: true });
  }
  return true;
});
