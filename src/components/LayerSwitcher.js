import React, { useState } from 'react';
import { IoLayers, IoMap, IoImage } from "react-icons/io5";

const LayerSwitcher = ({ currentType, onSwitch }) => {
  // Đổi state để quản lý việc mở/đóng
  const [isOpen, setIsOpen] = useState(false);

  // Hàm xử lý khi chọn layer: gọi onSwitch rồi đóng menu lại
  const handleSelectLayer = (type) => {
    onSwitch(type);
    setIsOpen(false);
  };

  return (
    <div className="layer-switcher-container">
      
      {/* Nút chính: Click để Toggle (Bật/Tắt) */}
      <div 
        className={`layer-btn main ${isOpen ? 'expanded' : ''}`}
        onClick={() => setIsOpen(!isOpen)} 
      >
        <IoLayers size={24} color="#5F6368" />
        <span className="label">Lớp bản đồ</span>
      </div>

      {/* Menu mở rộng: Chỉ hiện khi isOpen = true */}
      {isOpen && (
        <div className="layer-options">
          <div 
            className={`layer-option ${currentType === 'standard' ? 'active' : ''}`}
            onClick={() => handleSelectLayer('standard')}
          >
            <div className="thumb standard"><IoMap size={20} /></div>
            <span>Mặc định</span>
          </div>
          
          <div 
            className={`layer-option ${currentType === 'satellite' ? 'active' : ''}`}
            onClick={() => handleSelectLayer('satellite')}
          >
            <div className="thumb satellite"><IoImage size={20} /></div>
            <span>Vệ tinh</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LayerSwitcher;