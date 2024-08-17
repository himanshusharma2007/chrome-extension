import React, { useState } from 'react'
import Popup from './components/Popup';
import './App.css'
import Settings from './components/Settings';
const App = () => {
  const [isSttings,setIsSttings]=useState(false);
  return (
    <div className="w-[400px] text-red-500">
      {isSttings ? (
        <Settings setIsSttings={setIsSttings} />
      ) : (
        <Popup setIsSttings={setIsSttings} />
      )}
    </div>
  );
}

export default App
