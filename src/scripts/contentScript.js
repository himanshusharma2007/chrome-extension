import { dictionary } from "../utils/dictionary";
console.log("Content script loaded");

function replaceWords() {
  console.log("Content script loaded");
  const textNodes = [];
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );

  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Message received in content script:", request);
  if (request.action === "replaceWords") {
    replaceWords();
    sendResponse({ status: "Words replaced" });
  }
  return true; // Keep the message channel open for asynchronous response
});
  textNodes.forEach((node) => {
    let text = node.nodeValue;
    Object.keys(dictionary).forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      text = text.replace(regex, (match) => {
        return `<span class="translated" title="${match}">${
          dictionary[word.toLowerCase()]
        }</span>`;
      });
    });
    if (text !== node.nodeValue) {
      const span = document.createElement("span");
      span.innerHTML = text;
      node.parentNode.replaceChild(span, node);
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "replaceWords") {
    replaceWords();
    sendResponse({ status: "Words replaced" });
  }
});
