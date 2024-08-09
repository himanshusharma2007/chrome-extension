import React, { useState } from "react";
import { BsArrowLeft } from "react-icons/bs";
// import { ArrowLeftIcon } from "@heroicons/react/solid";
const colorOptions = [
  { bg: "rgba(255, 249, 219, 0.5)", border: "#f2c94c", text: "text-gray-800" },
  { bg: "rgba(230, 243, 255, 0.5)", border: "#4a90e2", text: "text-gray-800" },
  { bg: "rgba(243, 230, 255, 0.5)", border: "#9b51e0", text: "text-gray-800" },
  { bg: "rgba(230, 255, 237, 0.5)", border: "#27ae60", text: "text-gray-800" },
];

const Settings = ({ onBack }) => {
  // const [bgColor, setBgColor] = useState("bg-yellow-200");
  // const [borderColor, setBorderColor] = useState("border-yellow-400");
  const [defaultAIEnabled, setDefaultAIEnabled] = useState(false);
  const [defaultFromLang, setDefaultFromLang] = useState("English");
  const [defaultToLang, setDefaultToLang] = useState("Spanish");
  const [defaultDifficulty, setDefaultDifficulty] = useState("");
  const [textToSpeechEnabled, setTextToSpeechEnabled] = useState(true);
  const [selectedStyle, setSelectedStyle] = useState(0); // Replace the existing Word Highlight Style section with

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Settings saved");
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
    <div className="w-full p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg shadow-lg">
      <div className="flex items-center mb-6">
        <button onClick={onBack} className="mr-4">
          <BsArrowLeft className="h-6 w-6 text-gray-600" />
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Word Highlight Style</h2>
        <div className="space-y-3 grid grid-cols-2">
          {colorOptions.map((option, index) => (
            <button
              key={index}
              className="w-full p-2 rounded-lg flex items-center justify-between"
              onClick={() => setSelectedStyle(index)}
            >
              <div className="flex items-center">
                <RadioButton selected={selectedStyle === index} />
                <span
                  style={{
                    backgroundColor: option.bg,
                    borderBottom: `2px solid ${option.border}`,
                  }}
                  className={`${option.text} px-3 py-1 rounded`}
                >
                  Example
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Default Settings</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              AI-powered selection
            </span>
            <label className="switch">
              <input
                type="checkbox"
                checked={defaultAIEnabled}
                onChange={(e) => setDefaultAIEnabled(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
          </div>
          <div className="flex justify-between items-center">
            <select
              value={defaultFromLang}
              onChange={(e) => setDefaultFromLang(e.target.value)}
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
              value={defaultToLang}
              onChange={(e) => setDefaultToLang(e.target.value)}
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
          <select
            value={defaultDifficulty}
            onChange={(e) => setDefaultDifficulty(e.target.value)}
            className="w-full p-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select default difficulty level</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Text-to-Speech</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            Enable word pronunciation
          </span>
          <label className="switch">
            <input
              type="checkbox"
              checked={textToSpeechEnabled}
              onChange={(e) => setTextToSpeechEnabled(e.target.checked)}
            />
            <span className="slider round"></span>
          </label>
        </div>
      </div>
      <button
        onClick={handleSave}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        Save Settings
      </button>
    </div>
  );
};

export default Settings;
