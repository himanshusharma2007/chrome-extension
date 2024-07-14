// contentScript.js
const languageCodeMap = {
  English: "en",
  Spanish: "es",
  French: "fr",
  // Add more languages as needed
};
let fromLang = "en";
let toLang = "es";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  if (request.action === "replaceWords") {
    replaceWords(request.fromLang, request.toLang, request.difficultyLevel);
    sendResponse({ status: "Words replacement initiated" });
  }
});

async function replaceWords(fromLang, toLang, difficultyLevel) {
  const fromCode = languageCodeMap[fromLang] || "en";
  const toCode = languageCodeMap[toLang] || "es";

  const textNodes = getTextNodes();
  const allWords = getAllWords(textNodes);
  const wordsToTranslate = selectRandomWords(allWords, difficultyLevel);

  const translatedWords = await translateWords(
    wordsToTranslate,
    fromCode,
    toCode
  );

  replaceSelectedWords(textNodes, translatedWords);
  addStyles();
}

function getAllWords(textNodes) {
  const allWords = [];
  textNodes.forEach((node) => {
    const words = node.textContent.trim().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 2) {
        // Ignore very short words
        allWords.push({
          word: word,
          node: node,
        });
      }
    });
  });
  return allWords;
}

function selectRandomWords(allWords, difficultyLevel) {
  let wordCount;
  switch (difficultyLevel) {
    case "beginner":
      wordCount = 5;
      break;
    case "intermediate":
      wordCount = 5;
      break;
    case "advanced":
      wordCount = 5;
      break;
    default:
      wordCount = 5;
  }

  const shuffled = allWords.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(wordCount, allWords.length));
}
async function translateWords(wordsToTranslate, fromLang, toLang) {
  const uniqueWords = [...new Set(wordsToTranslate.map((item) => item.word))];
  const translations = {};

  for (let word of uniqueWords) {
    translations[word] = await translateSingleWord(word, fromLang, toLang);
  }

  return wordsToTranslate.map((item) => ({
    ...item,
    translation: translations[item.word],
  }));
}

async function translateSingleWord(word, fromLang, toLang) {
  const apiUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    word
  )}&langpair=${fromLang}|${toLang}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      console.error(
        "Translation error:",
        data.responseStatus,
        data.responseDetails
      );
      return word; // Return original word if translation fails
    }
  } catch (error) {
    console.error("Translation error:", error);
    return word; // Return original word if translation fails
  }
}
function replaceSelectedWords(textNodes, translatedWords) {
  translatedWords.forEach(({ word, translation, node }) => {
    const regex = new RegExp(`\\b${word}\\b`, "g");
    node.textContent = node.textContent.replace(regex, (match) => {
      return `<span class="translated-word" data-original="${match}">${translation}</span>`;
    });
  });

  textNodes.forEach((node) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = node.textContent;
    while (tempDiv.firstChild) {
      node.parentNode.insertBefore(tempDiv.firstChild, node);
    }
    node.parentNode.removeChild(node);
  });
}

function getTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null,
    false
  );
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
      textNodes.push(node);
    }
  }
  return textNodes;
}

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .translated-word {
      background-color: #e6f3ff;
      color: green;
      font-weight: 700;
      font-size: 50px;
      cursor: pointer;
      position: relative;
    }

    .translated-word::after {
      content: attr(data-original);
      display: none;
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background-color: #333;
      color: #fff;
      padding: 5px;
      border-radius: 3px;
      font-size: 14px;
      white-space: nowrap;
    }

    .translated-word:hover::after {
      display: block;
    }
  `;
  document.head.appendChild(style);
}
