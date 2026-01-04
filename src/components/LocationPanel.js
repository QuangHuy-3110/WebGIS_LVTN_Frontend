import React from 'react';
import { IoStar, IoStarHalf, IoNavigate, IoCallOutline, IoBookmarkOutline, IoShareSocialOutline, IoTimeOutline, IoLocationOutline, IoClose } from "react-icons/io5";

const LocationPanel = ({ location, onClose }) => {
  if (!location) return null; // Ẩn nếu chưa chọn địa điểm

  return (
    <div className="location-panel">
      <button className="close-btn" onClick={onClose}><IoClose size={24}/></button>
      
      {/* Header Image Placeholder */}
      <div className="location-image">
        <img src="https://via.placeholder.com/400x200" alt="Location" />
      </div>

      <div className="panel-content">
        <h1 className="location-title">{location.name}</h1>
        <div className="rating-row">
          <span className="rating-num">{location.rating}</span>
          <div className="stars">
            <IoStar color="#F4B400" /><IoStar color="#F4B400" /><IoStar color="#F4B400" /><IoStar color="#F4B400" /><IoStarHalf color="#F4B400" />
          </div>
          <span className="reviews">({location.reviews} đánh giá)</span>
        </div>
        <p className="category">{location.category} • {location.distance}</p>

        {/* Action Buttons */}
        <div className="actions-row">
          <div className="action-item primary">
            <button className="circle-btn blue"><IoNavigate color="#fff" /></button>
            <span>Đường đi</span>
          </div>
          <div className="action-item">
            <button className="circle-btn"><IoCallOutline color="#1A73E8" /></button>
            <span>Gọi điện</span>
          </div>
          <div className="action-item">
            <button className="circle-btn"><IoBookmarkOutline color="#1A73E8" /></button>
            <span>Lưu</span>
          </div>
          <div className="action-item">
            <button className="circle-btn"><IoShareSocialOutline color="#1A73E8" /></button>
            <span>Chia sẻ</span>
          </div>
        </div>

        <div className="details-list">
           <div className="detail-item">
              <IoTimeOutline size={20} color="#5F6368" />
              <span>Đang mở cửa • Đóng cửa lúc 22:00</span>
           </div>
           <div className="detail-item">
              <IoLocationOutline size={20} color="#5F6368" />
              <span>{location.address}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LocationPanel;