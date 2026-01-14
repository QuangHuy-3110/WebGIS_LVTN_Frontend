import React from 'react';
import { IoLocationSharp, IoSearch, IoSwapVertical } from "react-icons/io5";

const SearchBar = ({ startPoint, endPoint, onFocusStart, onFocusEnd, isSelecting }) => {
  
  // Format tọa độ: Nếu có thì hiện, không thì hiện chuỗi rỗng
  const formatCoord = (coord) => coord ? `${coord[1].toFixed(5)}, ${coord[0].toFixed(5)}` : '';

  return (
    <div className="search-card">
      <div className="icon-column">
         <div className="circle-blue"></div>
         <div className="dots-vertical"><span></span><span></span><span></span></div>
         <IoLocationSharp color="#EA4335" size={20} />
      </div>

      <div className="input-column">
        {/* Input Điểm đi */}
        <input 
          type="text" 
          placeholder="Chọn điểm đi (Click vào đây)" 
          value={formatCoord(startPoint)} // CHỈ DÙNG VALUE
          // BỎ defaultValue đi
          onClick={onFocusStart} 
          readOnly // Input này chỉ để hiển thị, user không gõ vào
          className={isSelecting === 'start' ? 'input-active' : ''}
          style={{ cursor: 'pointer' }}
        />
        
        <div className="divider"></div>
        
        {/* Input Điểm đến */}
        <input 
          type="text" 
          placeholder="Chọn điểm đến (Click vào đây)"
          value={formatCoord(endPoint)} // CHỈ DÙNG VALUE
          onClick={onFocusEnd} 
          readOnly
          className={isSelecting === 'end' ? 'input-active' : ''}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="action-column">
        <button className="btn-icon"><IoSwapVertical size={20} color="#5F6368"/></button>
        <button className="btn-search-blue"><IoSearch size={20} color="#fff"/></button>
      </div>
    </div>
  );
};

export default SearchBar;