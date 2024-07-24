// contentScript.js

const API_URL =
  "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english";
const API_KEY = "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"; // Replace with your actual API key
const MAX_AI_WORDS = 20; // Maximum number of words to select using AI
const CACHE_EXPIRATION = 24 * 60 * 60 * 1000;
const languageCodeMap = {
  English: "en",
  Spanish: "es",
  French: "fr",
  Chinese: "zh", // Added Chinese
  Japanese: "ja", // Added Japanese
  Russian: "ru", // Added Russian
  // Add more languages as needed
};

const commonWords = new Set([
  "the",
  "be",
  "to",
  "of",
  "and",
  "a",
  "in",
  "that",
  "have",
  "I",
  "it",
  "for",
  "not",
  "on",
  "with",
  "he",
  "as",
  "you",
  "do",
  "at",
  "has",
]);

async function selectWordsAI(text, difficultyLevel) {
  const cacheKey = `ai_words_${text.substring(0, 100)}_${difficultyLevel}`;
  const cachedResult = await getCachedResult(cacheKey);
  if (cachedResult) {
    return cachedResult;
  }

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const words = text.split(/\s+/);
    let selectedWords = words.filter(
      (_, index) =>
        result[0][index].score > getThresholdForDifficulty(difficultyLevel)
    );
    selectedWords = selectedWords.slice(0, MAX_AI_WORDS); // Limit the number of words

    if (selectedWords.length === 0) {
      console.warn(
        "AI selection returned no words. Falling back to default algorithm."
      );
      return selectWords(getAllWords(getTextNodes()), difficultyLevel);
    }

    await cacheResult(cacheKey, selectedWords);
    return selectedWords;
  } catch (error) {
    console.error("Error in AI word selection:", error);
    return selectWords(getAllWords(getTextNodes()), difficultyLevel);
  }
}

function getThresholdForDifficulty(difficultyLevel) {
  switch (difficultyLevel) {
    case "beginner":
      return 0.8;
    case "intermediate":
      return 0.6;
    case "advanced":
      return 0.4;
    default:
      return 0.7;
  }
}

async function getCachedResult(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      if (
        result[key] &&
        Date.now() - result[key].timestamp < CACHE_EXPIRATION
      ) {
        resolve(result[key].data);
      } else {
        resolve(null);
      }
    });
  });
}

async function cacheResult(key, data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(
      { [key]: { data, timestamp: Date.now() } },
      resolve
    );
  });
}

async function replaceWords(fromLang, toLang, difficultyLevel, isAIEnabled) {
  try {
    const fromCode = languageCodeMap[fromLang] || "en";
    const toCode = languageCodeMap[toLang] || "es";

    const textNodes = getTextNodes();
    if (textNodes.length === 0) {
      throw new Error("No valid text nodes found on the page");
    }

    const allWords = getAllWords(textNodes);
    if (allWords.length === 0) {
      throw new Error("No valid words found for translation");
    }

    const { previouslyTranslated = [] } = await chrome.storage.local.get(
      "previouslyTranslated"
    );
    const previouslyTranslatedSet = new Set(previouslyTranslated);

    let wordsToTranslate;
    if (isAIEnabled) {
      const text = textNodes.map((node) => node.textContent).join(" ");
      wordsToTranslate = await selectWordsAI(text, difficultyLevel);
    } else {
      wordsToTranslate = selectWords(
        allWords,
        difficultyLevel,
        previouslyTranslatedSet
      );
    }

    if (wordsToTranslate.length === 0) {
      throw new Error("No words selected for translation");
    }

    console.log("Words to translate:", wordsToTranslate);

    const translatedWords = await translateWords(
      wordsToTranslate,
      fromCode,
      toCode
    );
    console.log("Translated words:", translatedWords);

    replaceSelectedWords(textNodes, translatedWords);
    addStyles();

    await chrome.storage.local.set({
      previouslyTranslated: [
        ...previouslyTranslatedSet,
        ...translatedWords.map((w) => w.word),
      ],
    });

    return { message: "Translation completed successfully" };
  } catch (error) {
    console.error("Error during translation:", error);
    return { message: "Error during translation: " + error.message };
  }
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("Content script received message:", request);
  if (request.action === "startTranslation") {
    replaceWords(
      request.fromLang,
      request.toLang,
      request.difficultyLevel,
      request.isAIEnabled
    )
      .then((response) => sendResponse(response))
      .catch((error) =>
        sendResponse({ message: "Error during translation: " + error.message })
      );
    return true; // Indicates that the response is sent asynchronously
  } else if (request.action === "revertTranslation") {
    revertTranslation()
      .then(() =>
        sendResponse({ message: "Translation reverted successfully" })
      )
      .catch((error) =>
        sendResponse({
          message: "Error reverting translation: " + error.message,
        })
      );
    return true; // Indicates that the response is sent asynchronously
  }
});
function getAllWords(textNodes) {
  const allWords = new Map();
  const wordRegex = /^[a-zA-Z]{3,}$/; // Only alphabetic words with 3 or more characters

  textNodes.forEach((node) => {
    if (node && node.textContent) {
      const words = node.textContent.trim().toLowerCase().split(/\s+/);
      words.forEach((word) => {
        if (wordRegex.test(word) && !commonWords.has(word)) {
          allWords.set(word, (allWords.get(word) || 0) + 1);
        }
      });
    }
  });

  return Array.from(allWords.entries())
    .map(([word, count]) => ({
      word,
      frequency: count,
      node: textNodes.find(
        (node) =>
          node &&
          node.textContent &&
          node.textContent.toLowerCase().includes(word)
      ),
    }))
    .filter((item) => item.node); // Only keep items where a valid node was found
}

function selectWords(
  allWords,
  difficultyLevel,
  previouslyTranslated = new Set()
) {
  let wordCount;
  let frequencyThreshold;

  switch (difficultyLevel) {
    case "beginner":
      wordCount = 5;
      frequencyThreshold = 0.7;
      break;
    case "intermediate":
      wordCount = 10;
      frequencyThreshold = 0.5;
      break;
    case "advanced":
      wordCount = 20;
      frequencyThreshold = 0.3;
      break;
    default:
      wordCount = 5;
      frequencyThreshold = 0.7;
  }

  const totalWords = allWords.reduce((sum, word) => sum + word.frequency, 0);

  // Filter and sort words
  let eligibleWords = allWords
    .filter((word) => !previouslyTranslated.has(word.word))
    .filter((word) => word.frequency / totalWords <= frequencyThreshold)
    .sort((a, b) => b.frequency - a.frequency);

  // If we don't have enough eligible words, relax the frequency threshold
  if (eligibleWords.length < wordCount) {
    eligibleWords = allWords
      .filter((word) => !previouslyTranslated.has(word.word))
      .sort((a, b) => b.frequency - a.frequency);
  }

  const selectedWords = [];
  const usedIndices = new Set();

  while (
    selectedWords.length < wordCount &&
    usedIndices.size < eligibleWords.length
  ) {
    const randomIndex = Math.floor(Math.random() * eligibleWords.length);
    if (!usedIndices.has(randomIndex)) {
      selectedWords.push(eligibleWords[randomIndex]);
      usedIndices.add(randomIndex);
    }
  }

  // If we still don't have enough words, fill with random words from allWords
  while (selectedWords.length < wordCount) {
    const randomIndex = Math.floor(Math.random() * allWords.length);
    const word = allWords[randomIndex];
    if (
      !selectedWords.some((w) => w.word === word.word) &&
      !previouslyTranslated.has(word.word)
    ) {
      selectedWords.push(word);
    }
  }

  console.log("Selected words:", selectedWords);
  return selectedWords;
}

async function translateWords(wordsToTranslate, fromLang, toLang) {
  const translations = {};

  for (let item of wordsToTranslate) {
    translations[item.word] = await translateSingleWord(
      item.word,
      fromLang,
      toLang
    );
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
  // Create a map of original words to their translations
  const translationMap = new Map(
    translatedWords.map((item) => [item.word.toLowerCase(), item.translation])
  );

  textNodes.forEach((node) => {
    if (node && node.textContent) {
      let newContent = node.textContent;
      translatedWords.forEach(({ word }) => {
        const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
        newContent = newContent.replace(regex, (match) => {
          const translation = translationMap.get(match.toLowerCase());
          return `<span class="translated-word" data-original="${match}">${translation}</span>`;
        });
      });

      if (newContent !== node.textContent) {
        replaceNodeContent(node, newContent);
      }
    }
  });
}

function replaceNodeContent(node, newContent) {
  const range = document.createRange();
  range.selectNode(node);
  const fragment = range.createContextualFragment(newContent);
  const parent = node.parentNode;
  if (parent) {
    parent.replaceChild(fragment, node);
  }
}

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTextNodes() {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        if (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent.trim() !== "" &&
          isNodeVisible(node)
        ) {
          return NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_REJECT;
      },
    },
    false
  );
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }
  return textNodes;
}

function isNodeVisible(node) {
  const element = node.parentElement;
  return !!(
    element &&
    element.offsetWidth &&
    element.offsetHeight &&
    element.getClientRects().length
  );
}

function addStyles() {
  const style = document.createElement("style");
  style.textContent = `
    .translated-word {
      background-color: rgba(230, 243, 255, 0.5);
      border-bottom: 2px solid #4a90e2;
      padding: 0 2px;
      margin: 0 1px;
      border-radius: 3px;
      cursor: pointer;
      position: relative;
      display: inline-block;
      transition: background-color 0.3s ease;
    }

    .translated-word:hover {
      background-color: rgba(230, 243, 255, 0.8);
    }

    .translated-word::after {
      content: attr(data-original);
      display: none;
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      bottom: calc(100% + 5px);
      background-color: #333;
      color: #fff;
      padding: 6px 10px;
      border-radius: 4px;
      font-size: 14px;
      white-space: nowrap;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 10000;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    .translated-word:hover::after {
      display: block;
      opacity: 1;
    }

    .translated-word::before {
      content: '';
      position: absolute;
      left: 50%;
      bottom: calc(100% + 5px);
      transform: translateX(-50%);
      border-width: 5px;
      border-style: solid;
      border-color: #333 transparent transparent transparent;
      display: none;
      z-index: 10001;
    }

    .translated-word:hover::before {
      display: block;
    }
`;
  document.head.appendChild(style);
}

function revertTranslation() {
  const translatedWords = document.querySelectorAll(".translated-word");
  translatedWords.forEach((word) => {
    const originalWord = word.getAttribute("data-original");
    word.outerHTML = originalWord;
  });
}
