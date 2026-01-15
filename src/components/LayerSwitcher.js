import React, { useState } from 'react';
import { IoLayers, IoMap, IoImage, IoClose } from "react-icons/io5";

const LayerSwitcher = ({ currentType, onSwitch }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelectLayer = (type) => {
    onSwitch(type);
    // setIsOpen(false); // Có thể comment dòng này nếu muốn giữ menu mở sau khi chọn
  };

  return (
    // Thêm class 'open' vào container cha nếu state isOpen = true
    <div className={`layer-switcher-container ${isOpen ? 'open' : ''}`}>
      
      {/* Nút chính (Toggle) */}
      <div 
        className={`layer-btn main ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)} 
        title="Đổi lớp bản đồ"
      >
        {isOpen ? <IoClose size={24} color="#5F6368"/> : <IoLayers size={24} color="#5F6368" />}
      </div>

      {/* Menu trượt (Luôn render, ẩn hiện bằng CSS) */}
      <div className="layer-options">
        
        {/* Option 1: Mặc định */}
        <div 
          className={`layer-option ${currentType === 'standard' ? 'active' : ''}`}
          onClick={() => handleSelectLayer('standard')}
        >
          <div className="thumb standard"><IoMap size={18} /></div>
          <span style={{fontSize: 10}}>Mặc định</span>
        </div>
        
        {/* Option 2: Vệ tinh */}
        <div 
          className={`layer-option ${currentType === 'satellite' ? 'active' : ''}`}
          onClick={() => handleSelectLayer('satellite')}
        >
          <div className="thumb satellite"><IoImage size={18} /></div>
          <span style={{fontSize: 10}}>Vệ tinh</span>
        </div>

      </div>
    </div>
  );
};

export default LayerSwitcher;