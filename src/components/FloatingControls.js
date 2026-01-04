import React from 'react';
import { IoLocate, IoAdd, IoRemove, IoRestaurant, IoCafe, IoBed, IoCar } from "react-icons/io5";

const FloatingControls = () => {
  return (
    <div className="floating-controls">
      {/* Các nút Filter nhanh (Giống FloatingMenu) */}
      <div className="quick-filters">
        <button className="pill-btn">Nhà hàng <IoRestaurant /></button>
        <button className="pill-btn">Cà phê <IoCafe /></button>
        <button className="pill-btn">Khách sạn <IoBed /></button>
        <button className="pill-btn">Trạm xăng <IoCar /></button>
      </div>

      {/* Các nút điều khiển Map (Góc dưới phải) */}
      <div className="map-actions-group">
        <button className="square-btn" title="Vị trí của tôi">
          <IoLocate size={22} color="#666"/>
        </button>
        <div className="zoom-group">
          <button className="square-btn"><IoAdd size={22} color="#666"/></button>
          <hr />
          <button className="square-btn"><IoRemove size={22} color="#666"/></button>
        </div>
      </div>
    </div>
  );
};

export default FloatingControls;