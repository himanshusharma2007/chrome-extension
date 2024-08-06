// contentScript.js

const API_URL =
  "https://api-inference.huggingface.co/models/facebook/bart-large-mnli";
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
const dbName = "LanguageLearnerCache";
const storeName = "translations";

function saveState(state) {
  localStorage.setItem("extensionState", JSON.stringify(state));
}

function loadState() {
  const state = localStorage.getItem("extensionState");
  return state ? JSON.parse(state) : null;
}

// Add this message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getState") {
    const state = loadState();
    sendResponse({ state: state });
  }
  return true;
});

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: "key" });
    };
  });
}

async function getCachedTranslation(word, fromLang, toLang) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const key = `${word}_${fromLang}_${toLang}`;
  return new Promise((resolve) => {
    const request = store.get(key);
    request.onsuccess = () =>
      resolve(request.result ? request.result.translation : null);
  });
}

async function cacheTranslation(word, translation, fromLang, toLang) {
  const db = await openDB();
  const transaction = db.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  const key = `${word}_${fromLang}_${toLang}`;
  store.put({ key, translation, timestamp: Date.now() });
}
async function selectWordsAI(text, difficultyLevel, retries = 3) {
  console.log("Starting selectWordsAI function");
  console.log("Text length:", text.length);
  console.log("Difficulty level:", difficultyLevel);

  const cacheKey = `ai_words_${text.substring(0, 100)}_${difficultyLevel}`;
  const cachedResult = await getCachedResult(cacheKey);
  if (cachedResult) {
    console.log("Returning cached result");
    return cachedResult;
  }

  try {
    console.log("Sending request to Hugging Face API:");
    console.log("URL:", API_URL);

    // Split the text into chunks to process the entire page
    const chunks = splitTextIntoChunks(text, 500);
    console.log("Number of chunks:", chunks.length);

    // Determine wordsPerChunk dynamically based on difficulty level
    const wordsPerChunk = getWordsPerChunk(difficultyLevel);
    console.log("Words per chunk:", wordsPerChunk);

    const chunkPromises = chunks.map(async (chunk, index) => {
      console.log(`Processing chunk ${index + 1} of ${chunks.length}`);
      const result = await fetchAIResult(chunk);
      const chunkWords = chunk.split(/\s+/);
      return selectMeaningfulWords(
        chunkWords,
        result,
        difficultyLevel,
        wordsPerChunk
      );
    });

    const meaningfulWordsPerChunk = await Promise.all(chunkPromises);
    const allMeaningfulWords = meaningfulWordsPerChunk.flat();

    console.log("Total meaningful words selected:", allMeaningfulWords.length);

    // Determine MAX_AI_WORDS dynamically based on difficulty level and number of chunks
    const MAX_AI_WORDS = Math.min(chunks.length * wordsPerChunk, 100); // Cap at 100 words
    console.log("Dynamic MAX_AI_WORDS:", MAX_AI_WORDS);

    const selectedWords = [];
    const selectedWordsSet = new Set(); // To keep track of unique words

    // Randomly select MAX_AI_WORDS from allMeaningfulWords
    while (
      selectedWords.length < MAX_AI_WORDS &&
      allMeaningfulWords.length > 0
    ) {
      const randomIndex = Math.floor(Math.random() * allMeaningfulWords.length);
      const word = allMeaningfulWords[randomIndex].toLowerCase();
      if (!selectedWordsSet.has(word)) {
        selectedWordsSet.add(word);
        selectedWords.push(allMeaningfulWords[randomIndex]);
        allMeaningfulWords.splice(randomIndex, 1);
      }
    }

    console.log("AI selectedWords:", selectedWords);

    if (selectedWords.length === 0) {
      console.warn(
        "AI selection returned no words. Falling back to default algorithm."
      );
      return selectWords(getAllWords(getTextNodes()), difficultyLevel);
    }

    const selectedWordsWithNodes = selectedWords
      .map((word) => ({
        word: word,
        node: findNodeForWord(word, getTextNodes()),
      }))
      .filter((item) => item.node !== null);

    console.log("Selected words with nodes:", selectedWordsWithNodes);

    await cacheResult(cacheKey, selectedWordsWithNodes);
    return selectedWordsWithNodes;
  } catch (error) {
    console.error("Error in AI word selection:", error);
    if (retries > 0) {
      console.log(`Retrying... (${retries} attempts left)`);
      return selectWordsAI(text, difficultyLevel, retries - 1);
    }
    return selectWords(getAllWords(getTextNodes()), difficultyLevel);
  }
}

async function fetchAIResult(chunk) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: chunk,
      parameters: {
        candidate_labels: ["common", "uncommon", "rare"],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("API Error Response:", errorBody);
    throw new Error(
      `HTTP error! status: ${response.status}, body: ${errorBody}`
    );
  }

  return await response.json();
}

function getWordsPerChunk(difficultyLevel) {
  switch (difficultyLevel) {
    case "beginner":
      return 10;
    case "intermediate":
      return 15;
    case "advanced":
      return 20;
    default:
      return 15;
  }
}

function splitTextIntoChunks(text, chunkSize) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(" "));
  }
  return chunks;
}

function randomlySelectWords(words, count) {
  const shuffled = words.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, words.length));
}

function selectMeaningfulWords(
  words,
  aiResult,
  difficultyLevel,
  wordsPerChunk
) {
  console.log("Selecting meaningful words");
  console.log("Difficulty level:", difficultyLevel);
  console.log("AI result:", aiResult);

  const commonThreshold = 0.4;
  const uncommonThreshold = 0.3;
  const rareThreshold = 0.3;

  const commonScore = aiResult.scores[aiResult.labels.indexOf("common")];
  const uncommonScore = aiResult.scores[aiResult.labels.indexOf("uncommon")];
  const rareScore = aiResult.scores[aiResult.labels.indexOf("rare")];

  console.log(
    `Overall scores - Common: ${commonScore}, Uncommon: ${uncommonScore}, Rare: ${rareScore}`
  );

  let scoreThreshold;
  switch (difficultyLevel) {
    case "beginner":
      scoreThreshold = commonScore;
      break;
    case "intermediate":
      scoreThreshold = uncommonScore;
      break;
    case "advanced":
      scoreThreshold = rareScore;
      break;
    default:
      scoreThreshold = Math.max(uncommonScore, rareScore);
  }

  const meaningfulWords = words.filter((word) => {
    console.log(`Analyzing word: ${word}`);

    // Check if the word contains only alphabetic characters
    if (!/^[a-zA-Z]+$/.test(word)) {
      console.log(`  Rejected: Contains non-alphabetic characters`);
      return false;
    }

    if (word.length < 4) {
      console.log(`  Rejected: Word length < 4`);
      return false;
    }

    if (commonWords.has(word.toLowerCase())) {
      console.log(`  Rejected: Common word`);
      return false;
    }

    // Use a simple frequency-based approach to determine if the word is meaningful
    const wordFrequency =
      words.filter((w) => w.toLowerCase() === word.toLowerCase()).length /
      words.length;
    const isSelected = wordFrequency < scoreThreshold;

    console.log(
      `  Word frequency: ${wordFrequency}, Score threshold: ${scoreThreshold}`
    );
    console.log(`  Selected: ${isSelected}`);
    return isSelected;
  });

  console.log("Meaningful words:", meaningfulWords);
  return randomlySelectWords(meaningfulWords, wordsPerChunk);
}

function findNodeForWord(word, textNodes) {
  const wordRegex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
  for (let node of textNodes) {
    if (wordRegex.test(node.textContent)) {
      return node;
    }
  }
  return null;
}

function getComplexityScore(result, difficultyLevel) {
  const scores = {
    simple: result.scores[result.labels.indexOf("simple")],
    intermediate: result.scores[result.labels.indexOf("intermediate")],
    complex: result.scores[result.labels.indexOf("complex")],
  };

  switch (difficultyLevel) {
    case "beginner":
      return (
        scores.simple * 0.7 + scores.intermediate * 0.2 + scores.complex * 0.1
      );
    case "intermediate":
      return (
        scores.simple * 0.3 + scores.intermediate * 0.5 + scores.complex * 0.2
      );
    case "advanced":
      return (
        scores.simple * 0.1 + scores.intermediate * 0.3 + scores.complex * 0.6
      );
    default:
      return scores.intermediate;
  }
}

function getThresholdForComplexity(complexityScore) {
  // Adjust these thresholds based on testing
  return 0.3 + complexityScore * 0.4;
}

function getThresholdForDifficulty(difficultyLevel, readabilityScore) {
  // Adjust these thresholds based on testing
  switch (difficultyLevel) {
    case "beginner":
      return 0.6 + readabilityScore * 0.1;
    case "intermediate":
      return 0.4 + readabilityScore * 0.1;
    case "advanced":
      return 0.2 + readabilityScore * 0.1;
    default:
      return 0.5 + readabilityScore * 0.1;
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
        getAllWords(textNodes),
        difficultyLevel,
        previouslyTranslatedSet
      );
    }

    if (wordsToTranslate.length === 0) {
      throw new Error("No words selected for translation");
    }

    console.log("Words to translate:", wordsToTranslate);

    const translatedWords = await translateWords(
      wordsToTranslate
        .map((item) => item.word)
        .filter((word) => word && typeof word === "string"),
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
    saveState({
      isEnabled: true,
      fromLang: request.fromLang,
      toLang: request.toLang,
      difficultyLevel: request.difficultyLevel,
      isAIEnabled: request.isAIEnabled,
    });
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
    return true;
  } else if (request.action === "revertTranslation") {
    saveState({
      isEnabled: false,
      fromLang: request.fromLang,
      toLang: request.toLang,
      difficultyLevel: request.difficultyLevel,
      isAIEnabled: request.isAIEnabled,
    });
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
function getAllWords(textNodes) {
  const allWords = new Map();
  const wordRegex = /^[a-zA-Z]{3,}$/; // Only alphabetic words with 3 or more characters

  textNodes.forEach((node) => {
    if (node && node.textContent) {
      const words = node.textContent.trim().split(/\s+/);
      words.forEach((word) => {
        if (wordRegex.test(word) && !commonWords.has(word.toLowerCase())) {
          allWords.set(word, (allWords.get(word) || 0) + 1);
        }
      });
    }
  });

  return Array.from(allWords.entries())
    .map(([word, frequency]) => ({
      word,
      frequency,
      node: textNodes.find(
        (node) =>
          node &&
          node.textContent &&
          node.textContent.toLowerCase().includes(word.toLowerCase())
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
console.log('totalWords :>> ',totalWords);
  // Filter and sort words
  let eligibleWords = allWords
    .filter((word) => !previouslyTranslated.has(word.word))
    .filter((word) => word.frequency / totalWords <= frequencyThreshold)
    .sort((a, b) => b.frequency - a.frequency);
console.log("eligibleWords :>> ", eligibleWords);

  // If we don't have enough eligible words, relax the frequency threshold
  if (eligibleWords.length < wordCount) {
    eligibleWords = allWords
      .filter((word) => !previouslyTranslated.has(word.word))
      .sort((a, b) => b.frequency - a.frequency);
  }
console.log('eligibleWords :>> ', eligibleWords);
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
  const translations = await Promise.all(
    wordsToTranslate.map(async (word) => {
      if (typeof word === "string" && word.trim() !== "") {
        const cachedTranslation = await getCachedTranslation(
          word,
          fromLang,
          toLang
        );
        if (cachedTranslation) {
          return { word, translation: cachedTranslation };
        }
        const translation = await translateSingleWord(word, fromLang, toLang);
        if (translation && translation !== word) {
          await cacheTranslation(word, translation, fromLang, toLang);
          return { word, translation };
        }
      }
      return null; // Return null for invalid translations
    })
  );

  return translations.filter((item) => item !== null);
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
function replaceSelectedWords(textNodes, translatedWords) {
  // Create a map of original words to their translations
  const translationMap = new Map(
    translatedWords.map((item) => [item.word.toLowerCase(), item.translation])
  );

  textNodes.forEach((node) => {
    if (node && node.textContent) {
      let newContent = node.textContent;
      translatedWords.forEach(({ word, translation }) => {
        if (translation && translation !== word) {
          const regex = new RegExp(`\\b${escapeRegExp(word)}\\b`, "gi");
          newContent = newContent.replace(regex, (match) => {
            return `<span class="translated-word" data-original="${match}">${translation}</span>`;
          });
        }
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

// Helper function to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      content: attr(data-original)" 🔊";
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
