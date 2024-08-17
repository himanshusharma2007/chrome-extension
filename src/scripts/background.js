// background.js

console.log("Background script loaded");

// Object to store the state for each tab
const tabStates = {};

// Function to initialize or reset the state for a tab
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const timeouts = {};
function loadSettings(callback) {
  chrome.storage.sync.get(
    [
      "defaultAIEnabled",
      "defaultFromLang",
      "defaultToLang",
      "defaultDifficulty",
    ],
    (result) => {
      callback({
        isAIEnabled: result.defaultAIEnabled ?? false,
        fromLang: result.defaultFromLang ?? "English",
        toLang: result.defaultToLang ?? "Spanish",
        difficultyLevel: result.defaultDifficulty ?? "intermediate",
      });
    }
  );
}
// Modify the initializeTabState function
function initializeTabState(tabId) {
  console.log(`Initializing state for tab ${tabId}`);
  loadSettings((settings) => {
    tabStates[tabId] = {
      isEnabled: false,
      ...settings,
    };

    // Clear any existing timeout
    if (timeouts[tabId]) {
      clearTimeout(timeouts[tabId]);
    }

    // Set a new timeout
    timeouts[tabId] = setTimeout(() => {
      resetState(tabId);
    }, SESSION_TIMEOUT);

    // Save the state to session storage
    chrome.storage.session.set(
      { [`tabState_${tabId}`]: tabStates[tabId] },
      () => {
        console.log(`State saved to session storage for tab ${tabId}`);
      }
    );
  });
}

// Add this function
function resetState(tabId) {
  console.log(`Resetting state for tab ${tabId}`);
  if (tabStates[tabId]) {
    delete tabStates[tabId];
    chrome.tabs.sendMessage(tabId, { action: "resetState" });
  }
  if (timeouts[tabId]) {
    clearTimeout(timeouts[tabId]);
    delete timeouts[tabId];
  }

  // Clear the state from session storage
  chrome.storage.session.remove(`tabState_${tabId}`, () => {
    console.log(`State removed from session storage for tab ${tabId}`);
  });
}

// Add this listener
chrome.tabs.onRemoved.addListener((tabId) => {
  console.log(`Tab ${tabId} removed`);
  resetState(tabId);
  delete tabStates[tabId];
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log(`Tab ${activeInfo.tabId} activated`);

  // Reset the state to the initial state
  initializeTabState(activeInfo.tabId);

  // Load the state from session storage (if any)
  chrome.storage.session.get(`tabState_${activeInfo.tabId}`, (result) => {
    if (result[`tabState_${activeInfo.tabId}`]) {
      tabStates[activeInfo.tabId] = result[`tabState_${activeInfo.tabId}`];
      console.log(
        `Loaded state from storage for tab ${activeInfo.tabId}`,
        tabStates[activeInfo.tabId]
      );
    }
    updateBadge(activeInfo.tabId);
  });
});

// chrome.tabs.onUpdated.addListener
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  console.log(`Tab ${tabId} updated, status: ${changeInfo.status}`);
  if (changeInfo.status === "loading") {
    // Reset the state to the initial state
    initializeTabState(tabId);
  }
  if (changeInfo.status === "complete") {
    updateBadge(tabId);
  }
});

// Function to update the extension badge
function updateBadge(tabId) {
  const state = tabStates[tabId];
  console.log(`Updating badge for tab ${tabId}`, state);
  if (state && state.isEnabled) {
    chrome.action.setBadgeText({ text: "ON", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#4CAF50", tabId: tabId });
  } else {
    chrome.action.setBadgeText({ text: "", tabId: tabId });
  }
}

// Listen for messages from the popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "saveState") {
    const tabId = sender.tab.id;
    chrome.storage.session.set({ [`tabState_${tabId}`]: request.state }, () => {
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === "loadState") {
    const tabId = sender.tab.id;
    chrome.storage.session.get(`tabState_${tabId}`, (result) => {
      sendResponse({ state: result[`tabState_${tabId}`] || null });
    });
    return true;
  } else if (request.action === "getPreviouslyTranslated") {
    chrome.storage.session.get("previouslyTranslated", (result) => {
      sendResponse({ previouslyTranslated: result.previouslyTranslated || [] });
    });
    return true;
  } else if (request.action === "updatePreviouslyTranslated") {
    chrome.storage.session.get("previouslyTranslated", (result) => {
      const previouslyTranslated = new Set(result.previouslyTranslated || []);
      request.words.forEach((word) => previouslyTranslated.add(word));
      chrome.storage.session.set(
        { previouslyTranslated: Array.from(previouslyTranslated) },
        () => {
          sendResponse({ success: true });
        }
      );
    });
    return true;
  }
  // ... handle other message types ...
});


console.log("Background script setup complete");
