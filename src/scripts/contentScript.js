// contentScript.js
(async function () {
  try {
    const { initializeExtension } = await import(
      chrome.runtime.getURL("assets/contentLogic.js")
    );
    await initializeExtension();
  } catch (error) {
    console.error("Error initializing extension:", error);
  }
})();
