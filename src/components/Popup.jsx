import React, { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";

const Popup = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Spanish");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

useEffect(() => {
  loadState();
  const listener = (message) => {
    if (message.action === "stateReset") {
      loadState();
    }
  };
  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
}, []);

  const loadState = () => {
    chrome.storage.local.get(
      ["isEnabled", "fromLang", "toLang", "difficultyLevel", "isAIEnabled"],
      (result) => {
        setIsEnabled(result.isEnabled || false);
        setFromLang(result.fromLang || "English");
        setToLang(result.toLang || "Spanish");
        setDifficultyLevel(result.difficultyLevel || "");
        setIsAIEnabled(result.isAIEnabled || false);
        setStatus(result.isEnabled ? "Translation active" : "");
      }
    );
  };

  const handleSettingChange = async (setter, value) => {
    setter(value);
    if (isEnabled) {
      setIsEnabled(false);
      await revertTranslation();
      setStatus(
        "Settings changed. Translation reverted. Turn on to apply new settings."
      );
    } else {
      setStatus("Settings changed. Turn on to apply.");
    }
    await chrome.storage.local.set({ isEnabled: false });
  };

  const revertTranslation = async () => {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        if (tabs[0]) {
          try {
            await chrome.tabs.sendMessage(tabs[0].id, {
              action: "revertTranslation",
            });
            resolve();
          } catch (error) {
            console.error("Error reverting translation:", error);
            setStatus("Error: Could not revert translation");
            resolve();
          }
        } else {
          resolve();
        }
      });
    });
  };

  const validateState = () => {
    if (fromLang === toLang) {
      setError("Source and target languages must be different");
      return false;
    }
    if (!difficultyLevel) {
      setError("Please select a difficulty level");
      return false;
    }
    setError("");
    return true;
  };

  const handleToggle = async () => {
    const newState = !isEnabled;
    if (newState && !validateState()) {
      return;
    }
    setIsLoading(true);
    setStatus("Processing...");
    setIsEnabled(newState);
    await chrome.storage.local.set({
      isEnabled: newState,
      fromLang,
      toLang,
      difficultyLevel,
      isAIEnabled,
    });

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, {
            action: newState ? "startTranslation" : "revertTranslation",
            fromLang,
            toLang,
            difficultyLevel,
            isAIEnabled,
          });
          setStatus(response.message);
        } catch (error) {
          setStatus("Error: Could not communicate with the page");
        }
      }
    });
    setIsLoading(false);
  };

  const handleLanguageChange = (setter) => (e) => {
    handleSettingChange(setter, e.target.value);
  };

  const handleDifficultyChange = (e) => {
    handleSettingChange(setDifficultyLevel, e.target.value);
  };

  const handleAIToggle = async () => {
    const newAIState = !isAIEnabled;
    setIsAIEnabled(newAIState);
    if (isEnabled) {
      await handleSettingChange(setIsAIEnabled, newAIState);
    } else {
      await chrome.storage.local.set({ isAIEnabled: newAIState });
      setStatus(
        `AI selection ${
          newAIState ? "enabled" : "disabled"
        }. Turn on translation to apply.`
      );
    }
  };

  return (
    <div className="w-full p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Language Learner
      </h1>

      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-lg shadow">
        <span className="text-sm font-medium text-gray-700">
          {isEnabled ? "Translation On" : "Translation Off"}
        </span>
        <Switch
          checked={isEnabled}
          onChange={handleToggle}
          className={`${
            isEnabled ? "bg-green-600" : "bg-gray-200"
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
          disabled={isLoading}
        >
          <span className="sr-only">Enable translations</span>
          <span
            className={`${
              isEnabled ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>

      <div className="flex items-center justify-between mb-6 bg-white p-3 rounded-lg shadow">
        <span className="text-sm font-medium text-gray-700">
          AI-powered selection
        </span>
        <Switch
          checked={isAIEnabled}
          onChange={handleAIToggle}
          className={`${
            isAIEnabled ? "bg-blue-600" : "bg-gray-200"
          } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          <span className="sr-only">Enable AI-powered selection</span>
          <span
            className={`${
              isAIEnabled ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
          />
        </Switch>
      </div>

      <div className="mb-4 bg-white p-3 rounded-lg shadow">
        <div className="flex justify-between items-center mb-2">
          <select
            value={fromLang}
            onChange={handleLanguageChange(setFromLang)}
            className="p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>Chinese</option>
            <option>Japanese</option>
            <option>Russian</option>
          </select>
          <span className="text-sm font-medium text-gray-700">to</span>
          <select
            value={toLang}
            onChange={handleLanguageChange(setToLang)}
            className="p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option>Spanish</option>
            <option>English</option>
            <option>French</option>
            <option>Chinese</option>
            <option>Japanese</option>
            <option>Russian</option>
          </select>
        </div>
      </div>

      <select
        value={difficultyLevel}
        onChange={handleDifficultyChange}
        className="w-full p-2 mb-4 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow"
      >
        <option value="">Select difficulty level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="advanced">Advanced</option>
      </select>

      {error && (
        <p className="text-red-500 text-sm mb-2 bg-red-100 p-2 rounded">
          {error}
        </p>
      )}
      {status && (
        <p className="text-blue-600 text-sm mb-2 bg-blue-100 p-2 rounded">
          {status}
        </p>
      )}
    </div>
  );
};

export default Popup;
