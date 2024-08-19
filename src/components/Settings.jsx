import React, { useState, useEffect } from "react";
import { BsArrowLeft } from "react-icons/bs";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const colorOptions = [
  { bg: "rgba(255, 249, 219, 0.5)", border: "#f2c94c", text: "text-gray-800" },
  { bg: "rgba(230, 243, 255, 0.5)", border: "#4a90e2", text: "text-gray-800" },
  { bg: "rgba(243, 230, 255, 0.5)", border: "#9b51e0", text: "text-gray-800" },
  { bg: "rgba(230, 255, 237, 0.5)", border: "#27ae60", text: "text-gray-800" },
];

const Settings = ({ setIsSttings }) => {
  const [defaultAIEnabled, setDefaultAIEnabled] = useState(false);
  const [defaultFromLang, setDefaultFromLang] = useState("English");
  const [defaultToLang, setDefaultToLang] = useState("Spanish");
  const [defaultDifficulty, setDefaultDifficulty] = useState("");
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    chrome.storage.sync.get(
      [
        "defaultAIEnabled",
        "defaultFromLang",
        "defaultToLang",
        "defaultDifficulty",
        "textToSpeechEnabled",
        "selectedStyle",
      ],
      (result) => {
        setDefaultAIEnabled(result.defaultAIEnabled ?? false);
        setDefaultFromLang(result.defaultFromLang ?? "English");
        setDefaultToLang(result.defaultToLang ?? "Spanish");
        setDefaultDifficulty(result.defaultDifficulty ?? "");
        setTextToSpeechEnabled(result.textToSpeechEnabled ?? true);
        setSelectedStyle(result.selectedStyle ?? 0);
        setHasUnsavedChanges(false);
      }
    );
  };

  const handleChange = (setter) => (value) => {
    setter(value);
    setHasUnsavedChanges(true);
  };

  const handleSave = () => {
    if (defaultFromLang === defaultToLang) {
      toast.error("'From' and 'To' languages must be different", {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: false,
        draggable: true,
        className: "custom-toast",
        bodyClassName: "custom-toast-body",
      });
      return;
    }

    chrome.storage.sync.set(
      {
        defaultAIEnabled,
        defaultFromLang,
        defaultToLang,
        defaultDifficulty,
        textToSpeechEnabled,
        selectedStyle,
      },
      () => {
        if (chrome.runtime.lastError) {
          toast.error("Error saving settings. Please try again.", {
            position: "top-left",
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            className: "custom-toast",
            bodyClassName: "custom-toast-body",
          });
        } else {
          setHasUnsavedChanges(false);
        }
      }
    );
  };

  const RadioButton = ({ selected }) => (
    <div
      className={`w-4 h-4 rounded-full border-2 mr-2 flex justify-center items-center${
        selected ? "bg-blue-500 border-blue-500" : "border-gray-400"
      }`}
    >
      {selected && <div className="w-2 h-2 bg-white rounded-full m-auto"></div>}
    </div>
  );

  return (
    <div className="w-full p-4 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg relative">
      <ToastContainer />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <button onClick={() => setIsSttings(false)} className="mr-2">
            <BsArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">Settings</h1>
        </div>
        <div
          className={`px-2 py-1 rounded-full text-sm font-medium ${
            hasUnsavedChanges
              ? "bg-yellow-200 text-yellow-800"
              : "bg-green-200 text-green-800"
          }`}
        >
          {hasUnsavedChanges ? "Unsaved Changes" : "Saved"}
        </div>
      </div>

      {/* Word Highlight Style section */}
      <div className="mb-4 bg-white p-3 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-1">Word Highlight Style</h2>
        <div className="space-y-2 grid grid-cols-2 gap-2">
          {colorOptions.map((option, index) => (
            <button
              key={index}
              className="w-full p-1 rounded-lg flex items-center justify-between"
              onClick={() => handleChange(setSelectedStyle)(index)}
            >
              <div className="flex items-center">
                <RadioButton selected={selectedStyle === index} />
                <span
                  style={{
                    backgroundColor: option.bg,
                    borderBottom: `2px solid ${option.border}`,
                  }}
                  className={`${option.text} px-2 py-1 rounded`}
                >
                  Example
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Default Settings section */}
      <div className="mb-4 bg-white p-3 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-1">Default Settings</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              AI-powered selection
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={defaultAIEnabled}
                onChange={(e) =>
                  handleChange(setDefaultAIEnabled)(e.target.checked)
                }
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="flex justify-between items-center space-x-2">
            <select
              value={defaultFromLang}
              onChange={(e) => handleChange(setDefaultFromLang)(e.target.value)}
              className="p-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              value={defaultToLang}
              onChange={(e) => handleChange(setDefaultToLang)(e.target.value)}
              className="p-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Spanish</option>
              <option>English</option>
              <option>French</option>
              <option>Chinese</option>
              <option>Japanese</option>
              <option>Russian</option>
            </select>
          </div>
          <select
            value={defaultDifficulty}
            onChange={(e) => handleChange(setDefaultDifficulty)(e.target.value)}
            className="w-full p-1 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select default difficulty level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      {/* Text-to-Speech section */}
      <div className="mb-4 bg-white p-3 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-1">Text-to-Speech</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Enable word pronunciation
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={textToSpeechEnabled}
              onChange={(e) =>
                handleChange(setTextToSpeechEnabled)(e.target.checked)
              }
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      <button
        onClick={handleSave}
        className={`w-full py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          hasUnsavedChanges
            ? "bg-blue-600 text-white hover:bg-blue-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
        disabled={!hasUnsavedChanges}
      >
        Save Settings
      </button>
    </div>
  );
};

export default Settings;
