import React, { useEffect, useState } from "react";
import { Switch } from "@headlessui/react";
import { CiSettings } from "react-icons/ci";

const Popup = ({ setIsSttings }) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [fromLang, setFromLang] = useState("English");
  const [toLang, setToLang] = useState("Spanish");
  const [difficultyLevel, setDifficultyLevel] = useState("");
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
 useEffect(() => {
   loadSettings();
   loadState();

   // Add listener for storage changes
   const handleStorageChange = (changes, area) => {
     if (area === "sync") {
       loadSettings();
     }
   };

   chrome.storage.onChanged.addListener(handleStorageChange);

   // Cleanup listener on unmount
   return () => {
     chrome.storage.onChanged.removeListener(handleStorageChange);
   };
 }, []);

 useEffect(() => {
   console.log("isEnabled :>> ", isEnabled);
 }, [isEnabled]);
 useEffect(() => {
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
     if (tabs[0]) {
       chrome.tabs.sendMessage(
         tabs[0].id,
         { action: "getState" },
         (response) => {
           if (chrome.runtime.lastError) {
             // Content script might not be loaded yet, load from session storage
             loadState();
           } else if (response && response.state) {
             // Set state from content script
             setIsEnabled(response.state.isEnabled);
             setFromLang(response.state.fromLang);
             setToLang(response.state.toLang);
             setDifficultyLevel(response.state.difficultyLevel);
             setIsAIEnabled(response.state.isAIEnabled);
           } else {
             // No state found, load from session storage
             loadState();
           }
         }
       );
     }
   });
 }, []);


 const loadSettings = () => {
   chrome.storage.sync.get(
     [
       "defaultAIEnabled",
       "defaultFromLang",
       "defaultToLang",
       "defaultDifficulty",
     ],
     (result) => {
       setIsAIEnabled(result.defaultAIEnabled ?? false);
       setFromLang(result.defaultFromLang ?? "English");
       setToLang(result.defaultToLang ?? "Spanish");
       setDifficultyLevel(result.defaultDifficulty ?? "");

       // Update the current state immediately
       updateCurrentState({
         isAIEnabled: result.defaultAIEnabled ?? false,
         fromLang: result.defaultFromLang ?? "English",
         toLang: result.defaultToLang ?? "Spanish",
         difficultyLevel: result.defaultDifficulty ?? "",
       });
     }
   );
 };

 const updateCurrentState = (newState) => {
   chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
     if (tabs[0]) {
       chrome.storage.session.get(`tabState_${tabs[0].id}`, (result) => {
         const currentState = result[`tabState_${tabs[0].id}`] || {};
         const updatedState = { ...currentState, ...newState };
         chrome.storage.session.set(
           { [`tabState_${tabs[0].id}`]: updatedState },
           () => {
             loadState(); // Reload state to reflect changes
           }
         );
       });
     }
   });
 };

 

  const loadState = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.storage.session.get(`tabState_${tabs[0].id}`, (result) => {
          const state = result[`tabState_${tabs[0].id}`];
          if (state) {
            setIsEnabled(state.isEnabled);
            setFromLang(state.fromLang);
            setToLang(state.toLang);
            setDifficultyLevel(state.difficultyLevel);
            setIsAIEnabled(state.isAIEnabled);
            setStatus(state.isEnabled ? "Translation active" : "");
          }
        });
      }
    });
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
    await chrome.storage.session.set({ isEnabled: false });
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
    console.log("languege check ");
    if (fromLang === toLang) {
      setError("Source and target languages must be different");
      console.log("fromLang,toLang :>> ", fromLang);
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
    console.log("extension toggles", process.env.API_KEY);
    const newState = !isEnabled;
    if (newState && !validateState()) {
      return;
    }
    setIsLoading(true);
    setIsEnabled(newState);

    setStatus("Processing...");

    const state = {
      isEnabled: newState,
      fromLang,
      toLang,
      difficultyLevel,
      isAIEnabled,
    };

    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (tabs[0]) {
        await chrome.storage.session.set({ [`tabState_${tabs[0].id}`]: state });
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, {
            action: newState ? "startTranslation" : "revertTranslation",
            ...state,
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
      await chrome.storage.session.set({ isAIEnabled: newAIState });
      setStatus(
        `AI selection ${
          newAIState ? "enabled" : "disabled"
        }. Turn on translation to apply.`
      );
    }
  };

  return (
    <div className="relative w-full p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Learn While Browsing
      </h1>
      <div className="absolute top-3 right-4 ">
        <button onClick={() => setIsSttings(true)}>
          <CiSettings fontSize={30} />
        </button>
      </div>
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
          AI-powered word selection
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
