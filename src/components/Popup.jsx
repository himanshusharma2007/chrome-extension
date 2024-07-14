import React, { useEffect, useState } from "react";

const Popup = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Spanish");
  const [difficultyLevel, setDifficultyLevel] = useState("");

const [tabId, setTabId] = useState(null);
const [message, setMessage] = useState("");

  useEffect(() => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      setTabId(tabs[0].id);
    });
  }, []);


    
  const handleLearnClick = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Check if we can inject scripts into this tab
        const url = new URL(tabs[0].url);
        if (url.protocol === "http:" || url.protocol === "https:") {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: "replaceWords" },
            (response) => {
              if (chrome.runtime.lastError) {
                setMessage(`Error: ${chrome.runtime.lastError.message}`);
                console.error(chrome.runtime.lastError);
              } else if (response && response.status) {
                setMessage(response.status);
              } else {
                setMessage("No response from content script");
              }
            }
          );
        } else {
          setMessage("Cannot run on this page");
        }
      } else {
        setMessage("No active tab found");
      }
    });
  };

  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Language Learner</h1>

      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-700">
          Translating words
        </span>
        <label className="switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={() => setIsEnabled(!isEnabled)}
          />
          <span className="slider round"></span>
        </label>
      </div>

      <div className="mb-4">
        <div className="flex justify-between mb-2">
          <select
            value={fromLang}
            onChange={(e) => setFromLang(e.target.value)}
            className="p-1 text-sm border rounded"
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
          </select>
          <span className="text-sm font-medium text-gray-700">to</span>
          <select
            value={toLang}
            onChange={(e) => setToLang(e.target.value)}
            className="p-1 text-sm border rounded"
          >
            <option>Spanish</option>
            <option>English</option>
            <option>French</option>
          </select>
        </div>
      </div>

      <select
        value={difficultyLevel}
        onChange={(e) => setDifficultyLevel(e.target.value)}
        className="w-full p-2 mb-4 text-sm border rounded"
      >
        <option value="">Select difficulty level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>
      <button
        className="w-full py-2 text-sm font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition duration-300"
        onClick={handleLearnClick}
      >
        Learn language while browsing this page
      </button>
      {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
    </div>
  );
};

export default Popup;
