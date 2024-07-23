// contentScript.js
let tf, use;

async function loadDependencies() {
  tf = await import("@tensorflow/tfjs");
  use = await import("@tensorflow-models/universal-sentence-encoder");
}

let model;
let isAIEnabled = false;

async function loadModel() {
  try {
    await loadDependencies();
    model = await use.load();
    console.log("AI model loaded successfully");
    isAIEnabled = true;
  } catch (error) {
    console.error("Failed to load AI model:", error);
    isAIEnabled = false;
  }
}
const languageCodeMap = {
  English: "en-US",
  Spanish: "es-ES",
  French: "fr-FR",
  Chinese: "zh-CN",
  Japanese: "ja-JP",
  Russian: "ru-RU",
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
const languageCommonWords = {
  "en-US": new Set([
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
  ]),
  "es-ES": new Set([
    "el",
    "la",
    "de",
    "que",
    "y",
    "a",
    "en",
    "un",
    "ser",
    "se",
  ]),
  "fr-FR": new Set([
    "le",
    "la",
    "de",
    "et",
    "un",
    "être",
    "avoir",
    "que",
    "pour",
    "dans",
  ]),
  "zh-CN": new Set([
    "的",
    "是",
    "不",
    "了",
    "在",
    "人",
    "有",
    "我",
    "他",
    "这",
  ]),
  "ja-JP": new Set([
    "の",
    "に",
    "は",
    "を",
    "た",
    "が",
    "で",
    "て",
    "と",
    "し",
  ]),
  "ru-RU": new Set(["и", "в", "не", "на", "я", "быть", "он", "с", "что", "а"]),
};

function detectLanguage(text) {
  const words = text.toLowerCase().split(/\s+/);
  const langScores = Object.keys(languageCommonWords).map((lang) => {
    const commonWords = languageCommonWords[lang];
    const score = words.filter((word) => commonWords.has(word)).length;
    return { lang, score };
  });
  const detectedLang = langScores.reduce((a, b) => (a.score > b.score ? a : b));
  return detectedLang.score > 0 ? detectedLang.lang : null;
}
async function getEmbeddings(sentences) {
  if (!model || !isAIEnabled) {
    return null;
  }
  try {
    return await model.embed(sentences);
  } catch (error) {
    console.error("Error getting embeddings:", error);
    return null;
  }
}
export async function initializeExtension() {
  await loadModel();

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startTranslation") {
      isAIEnabled = request.useAI;
      replaceWords(request.fromLang, request.toLang, request.difficultyLevel)
        .then((response) => sendResponse(response))
        .catch((error) =>
          sendResponse({
            message: "Error during translation: " + error.message,
          })
        );
      return true;
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
      return true;
    }
  });
}

async function replaceWords(fromLang, toLang, difficultyLevel) {
  try {
    console.log("Starting replaceWords function");
    const fromCode = languageCodeMap[fromLang] || "en-US";
    const toCode = languageCodeMap[toLang] || "es-ES";

    const textNodes = getTextNodes();
    console.log("Found text nodes:", textNodes.length);

    if (textNodes.length === 0) {
      return { message: "No text found on the page" };
    }

    const allWords = getAllWords(textNodes, fromLang);
    console.log("All words found:", allWords.length);

    if (allWords.length === 0) {
      return { message: `No words found in ${fromLang} for translation` };
    }

    const { previouslyTranslated = [] } = await chrome.storage.local.get(
      "previouslyTranslated"
    );
    const previouslyTranslatedSet = new Set(previouslyTranslated);
    console.log("Previously translated words:", previouslyTranslatedSet.size);

    const wordsToTranslate = await selectWords(
      allWords,
      difficultyLevel,
      previouslyTranslatedSet
    );
    console.log("Words selected for translation:", wordsToTranslate.length);

    if (wordsToTranslate.length === 0) {
      return { message: "No new words available for translation" };
    }

    console.log("Words to translate:", wordsToTranslate);

    const translatedWords = await translateWords(
      wordsToTranslate.map((w) => w.word),
      fromCode,
      toCode
    );

    console.log("Translated words:", translatedWords);

    replaceSelectedWords(textNodes, translatedWords, toLang);
    addStyles();

    await chrome.storage.local.set({
      previouslyTranslated: [
        ...previouslyTranslatedSet,
        ...translatedWords.map((w) => w.word),
      ],
    });

    return {
      message: `Translation completed successfully. Translated ${
        translatedWords.length
      } word${
        translatedWords.length !== 1 ? "s" : ""
      } from ${fromLang} to ${toLang}.`,
      translatedCount: translatedWords.length,
    };
  } catch (error) {
    console.error("Error during translation:", error);
    return { message: "Error during translation: " + error.message };
  }
}
function getAllWords(textNodes, fromLang) {
  const allWords = [];
  const wordRegex =
    /^[a-zA-Z\u00C0-\u00FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0400-\u04FF]{3,}$/;

  textNodes.forEach((node) => {
    if (node && node.textContent) {
      const nodeLanguage = detectLanguage(node.textContent);
      if (nodeLanguage === languageCodeMap[fromLang]) {
        const words = node.textContent.trim().split(/\s+/);
        words.forEach((word) => {
          if (wordRegex.test(word) && !commonWords.has(word.toLowerCase())) {
            allWords.push({
              word,
              sentence: node.textContent.trim(),
            });
          }
        });
      }
    }
  });

  return allWords;
}

async function selectWords(
  allWords,
  difficultyLevel,
  previouslyTranslated = new Set()
) {
  let wordCount;
  switch (difficultyLevel) {
    case "beginner":
      wordCount = 5;
      break;
    case "intermediate":
      wordCount = 10;
      break;
    case "advanced":
      wordCount = 20;
      break;
    default:
      wordCount = 5;
  }

  // Filter out previously translated words first
  const newWords = allWords.filter(
    ({ word }) => !previouslyTranslated.has(word)
  );

  if (newWords.length === 0) {
    console.log("No new words found for translation");
    return []; // No new words to translate
  }

  let scoredWords;
  if (isAIEnabled && model) {
    try {
      const sentences = newWords.map((word) => word.sentence);
      const embeddings = await getEmbeddings(sentences);

      if (embeddings) {
        scoredWords = newWords.map((word, i) => {
          const embedding = embeddings.slice([i, 0], [1, -1]);
          const score = embedding.norm().dataSync()[0];
          return { ...word, score };
        });
      }
    } catch (error) {
      console.error("Error in AI-based word scoring:", error);
      // Fallback to frequency-based selection
      scoredWords = null;
    }
  }

  if (!scoredWords) {
    // Fallback to frequency-based selection
    const wordFrequency = new Map();
    newWords.forEach(({ word }) => {
      wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
    });
    scoredWords = newWords.map((word) => ({
      ...word,
      score: wordFrequency.get(word.word),
    }));
  }

  // Sort words by score (descending)
  const sortedWords = scoredWords.sort((a, b) => b.score - a.score);

  console.log("Selected words:", sortedWords.slice(0, wordCount));
  return sortedWords.slice(0, wordCount);
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

// Add this function to contentScript.js
function speakWord(word, lang) {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = lang;
  speechSynthesis.speak(utterance);
}

// Modify the replaceSelectedWords function
function replaceSelectedWords(textNodes, translatedWords, toLang) {
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
          return `<span class="translated-word" data-original="${match}" data-translation="${translation}" data-lang="${toLang}">${translation}</span>`;
        });
      });

      if (newContent !== node.textContent) {
        replaceNodeContent(node, newContent);
      }
    }
  });

  // Add click event listeners to translated words
  document.querySelectorAll(".translated-word").forEach((word) => {
    word.addEventListener("click", function () {
      const text = this.textContent;
      const lang = this.dataset.lang;
      speakWord(text, languageCodeMap[lang]);
    });
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
      content: attr(data-original) " 🔊";
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
