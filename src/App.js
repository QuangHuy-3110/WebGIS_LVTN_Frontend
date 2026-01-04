import React, { useState } from 'react';
import './App.css';
import MapComponent from './components/MapComponent';
import SearchBar from './components/SearchBar';
import LocationPanel from './components/LocationPanel';
import FloatingControls from './components/FloatingControls';
import LayerSwitcher from './components/LayerSwitcher'; // Import mới

function App() {
  const [selectedLocation, setSelectedLocation] = useState(null); // Để null cho gọn demo
  const [mapType, setMapType] = useState('standard'); // 'standard' | 'satellite'

  return (
    <div className="app-container">
      {/* Truyền mapType xuống MapComponent */}
      <MapComponent mapType={mapType} />

      <div className="ui-overlay">
        <div className="top-left-area">
          <SearchBar />
        </div>

        <LocationPanel 
          location={selectedLocation} 
          onClose={() => setSelectedLocation(null)} 
        />

        {/* Nút chuyển đổi Layer (Góc trái dưới) */}
        <div className="bottom-left-area">
           <LayerSwitcher currentType={mapType} onSwitch={setMapType} />
        </div>

        <FloatingControls />
      </div>
    </div>
  );
}

export default App;