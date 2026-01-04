import React from 'react';
import { IoLocationSharp, IoSearch, IoSwapVertical } from "react-icons/io5"; // Dùng react-icons

const SearchBar = () => {
  return (
    <div className="search-card">
      {/* Cột trái: Icon trang trí */}
      <div className="icon-column">
         <div className="circle-blue"></div>
         <div className="dots-vertical">
            <span></span><span></span><span></span>
         </div>
         <IoLocationSharp color="#EA4335" size={20} />
      </div>

      {/* Cột giữa: Input */}
      <div className="input-column">
        <input type="text" placeholder="Vị trí của bạn" defaultValue="Vị trí hiện tại" />
        <div className="divider"></div>
        <input type="text" placeholder="Chọn điểm đến" />
      </div>

      {/* Cột phải: Nút swap */}
      <div className="action-column">
        <button className="btn-icon">
          <IoSwapVertical size={20} color="#5F6368"/>
        </button>
        <button className="btn-search-blue">
          <IoSearch size={20} color="#fff"/>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;