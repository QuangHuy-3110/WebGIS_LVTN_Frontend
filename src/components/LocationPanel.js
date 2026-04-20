import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import EditRequestModal from './EditRequestModal';
import {
  IoStar, IoStarHalf, IoNavigate, IoCallOutline,
  IoHeart, IoHeartOutline, IoShareSocialOutline,
  IoTimeOutline, IoLocationOutline, IoClose,
  IoChevronBack, IoChevronForward, IoPersonCircle, IoSend,
  IoInformationCircleOutline, IoCreateOutline, IoMailOutline,
  IoLogoFacebook, IoCopyOutline
} from "react-icons/io5";

const LocationPanel = ({ location, onClose, isFavorite, onToggleFavorite, onDirections, hasRoute, onAddWaypoint, onSetAsDestination, onRemoveFromRoute, routeInstructions, isStoreInRoute, onRouteStepClick, isMinimized, onToggleMinimize }) => {
  const { currentUser, authFetch } = useAuth();

  // --- STATES ---
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // State form bình luận
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // State Modal con
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [activeInstructionIdx, setActiveInstructionIdx] = useState(null);

  useEffect(() => {
    setActiveInstructionIdx(null);
  }, [routeInstructions]);

  const getGroupedInstructions = () => {
    if (!routeInstructions || routeInstructions.length === 0) return [];

    // Helper: Tính góc hướng đi (Bearing) giữa 2 tọa độ
    const getBearing = (p1, p2) => {
      const lat1 = p1[1] * Math.PI / 180;
      const lon1 = p1[0] * Math.PI / 180;
      const lat2 = p2[1] * Math.PI / 180;
      const lon2 = p2[0] * Math.PI / 180;
      const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
      const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
      const brng = Math.atan2(y, x) * 180 / Math.PI;
      return (brng + 360) % 360;
    };

    // Helper: Phân loại rẽ dựa trên chênh lệch góc
    const getTurnType = (angle1, angle2) => {
      let diff = (angle2 - angle1 + 360) % 360;
      if (diff > 180) diff -= 360;

      if (diff > -25 && diff < 25) return 'straight';
      if (diff >= 25 && diff <= 100) return 'right';
      if (diff > 100 && diff < 170) return 'hard-right';
      if (diff <= -25 && diff >= -100) return 'left';
      if (diff < -100 && diff > -170) return 'hard-left';

      return 'uturn';
    };

    const grouped = [];
    let currentGroup = null;

    for (let i = 0; i < routeInstructions.length; i++) {
      const item = routeInstructions[i];

      if (item.isWaypoint || item.isDestination) {
        if (currentGroup) {
          grouped.push(currentGroup);
          currentGroup = null;
        }
        grouped.push({
          isWaypoint: item.isWaypoint,
          isDestination: item.isDestination,
          name: item.name,
          length_m: 0,
          coord: item.coord,
          geom: [],
          turnType: item.isDestination ? 'destination' : 'waypoint'
        });
        continue;
      }

      if (!currentGroup) {
        currentGroup = {
          name: item.name,
          length_m: item.length_m,
          coord: item.coord,
          geom: item.geom || [],
          turnType: grouped.length === 0 ? 'start' : 'straight'
        };
      } else {
        if (item.name === currentGroup.name) {
          currentGroup.length_m += item.length_m;
          if (item.geom && item.geom.length > 0) {
            // Nối mảng tọa độ lại để có đoạn đường đầy đủ
            currentGroup.geom = currentGroup.geom.concat(item.geom);
          }
        } else {
          // Xác định góc độ rẽ giữa dòng cũ và dòng mới
          const pts1 = currentGroup.geom;
          const pts2 = item.geom;
          let turnType = 'straight';
          if (pts1 && pts2 && pts1.length >= 2 && pts2.length >= 2) {
            const pA = pts1[pts1.length - 2];
            const pB = pts1[pts1.length - 1]; // End of street 1
            const pC = pts2[0]; // Start of street 2
            const pD = pts2[1];

            const bearing1 = getBearing(pA, pB);
            const bearing2 = getBearing(pC, pD);
            turnType = getTurnType(bearing1, bearing2);
          }

          grouped.push(currentGroup);

          currentGroup = {
            name: item.name,
            length_m: item.length_m,
            coord: item.coord,
            geom: item.geom || [],
            turnType: turnType
          };
        }
      }
    }
    if (currentGroup) {
      grouped.push(currentGroup);
    }
    return grouped;
  };

  const getTurnText = (type) => {
    switch (type) {
      case 'waypoint': return 'Đến điểm dừng:';
      case 'destination': return 'Đến nơi an toàn tại';
      case 'start': return 'Bắt đầu đi thẳng vào';
      case 'right': return 'Rẽ phải vào';
      case 'hard-right': return 'Rẽ ngoặt phải vào';
      case 'left': return 'Rẽ trái vào';
      case 'hard-left': return 'Rẽ ngoặt trái vào';
      case 'uturn': return 'Quay đầu vào';
      default: return 'Đi tiếp vào';
    }
  };

  const groupedInstructions = getGroupedInstructions();
  const totalLength = groupedInstructions.reduce((acc, curr) => acc + curr.length_m, 0);

  // Tính tọa độ đích thực sự để ghim điểm khi click "Đến đích an toàn"
  const getDestinationCoord = () => {
    if (groupedInstructions.length === 0) return null;
    const lastInst = groupedInstructions[groupedInstructions.length - 1];
    if (lastInst && lastInst.coord) {
      return lastInst.coord;
    }
    return null;
  };
  const destinationCoord = getDestinationCoord();

  // --- EFFECT: Reset & Load Data ---
  useEffect(() => {
    setCurrentImageIndex(0);
    setReviews([]);
    setNewRating(5);
    setNewComment("");

    if (location?.id) {
      fetchReviews(location.id);
    }
  }, [location]);

  // --- EFFECT: Chuyển qua tab Chỉ đường nếu bắt đầu có Route ---
  useEffect(() => {
    if (hasRoute && location && isStoreInRoute) {
      setActiveTab('route');
    } else {
      setActiveTab('info');
    }
  }, [hasRoute, location, isStoreInRoute]);

  // --- API HELPER: Lấy bình luận ---
  const fetchReviews = async (storeId) => {
    setLoadingReviews(true);
    try {
      // API này cần backend hỗ trợ filter ?store=ID
      const res = await fetch(`http://127.0.0.1:8000/api/reviews/?store=${storeId}`);
      if (res.ok) {
        const data = await res.json();
        const results = Array.isArray(data) ? data : (data.results || []);
        setReviews(results);
      }
    } catch (err) {
      console.error("Lỗi tải bình luận:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // --- API HELPER: Gửi bình luận ---
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) { alert("Vui lòng nhập nội dung!"); return; }

    setSubmitting(true);
    try {
      const payload = {
        store: location.id,
        rating: newRating,
        content: newComment,
        describe: location.describe // Trường này có thể dư thừa tùy backend
      };

      const res = await authFetch('http://127.0.0.1:8000/api/reviews/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newReviewData = await res.json();
        // Thêm review mới lên đầu danh sách (giả lập UI update ngay)
        setReviews([newReviewData, ...reviews]);
        setNewComment("");
        setNewRating(5);
        alert("Đánh giá thành công!");
      } else {
        alert("Lỗi! Có thể bạn đã đánh giá địa điểm này rồi.");
      }
    } catch (error) {
      console.error(error);
      alert("Lỗi kết nối.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- TÍNH NĂNG CHIA SẺ GOOGLE MAPS STYLE ---
  const handleShare = () => {
    setShowShareModal(true);
  };

  // NẾU LÀ PANEL CHỈ ĐƯỜNG ĐỘC LẬP (KHÔNG CÓ QUÁN)
  if (!location) {
    if (!hasRoute) return null;
    return (
      <div className="location-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        transform: isMinimized ? 'translateX(-100%)' : 'translateX(0)',
        transition: 'transform 0.3s ease-in-out'
      }}>
        {/* Nút lật thò ra ngoài rìa phải */}
        <button
          onClick={onToggleMinimize}
          style={{
            position: 'absolute',
            top: '50%',
            right: '-28px',
            transform: 'translateY(-50%)',
            width: '28px',
            height: '60px',
            background: '#fff',
            border: '1px solid #ddd',
            borderLeft: 'none',
            borderRadius: '0 8px 8px 0',
            cursor: 'pointer',
            boxShadow: '3px 0 5px rgba(0,0,0,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10
          }}
          title={isMinimized ? "Mở rộng bảng lộ trình" : "Thu gọn bảng lộ trình"}
        >
          {isMinimized ? <IoChevronForward size={22} color="#666" /> : <IoChevronBack size={22} color="#666" />}
        </button>

        <div style={{ padding: '15px', background: '#fff', borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#1A73E8' }}>Lộ trình chi tiết</h2>
        </div>
        <div className="panel-content route-instructions" style={{ flex: 1, overflowY: 'auto', display: isMinimized ? 'none' : 'block' }}>
          <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1A73E8' }}>Tổng quãng đường:</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
              {totalLength > 1000 ? (totalLength / 1000).toFixed(2) + ' km' : Math.round(totalLength) + ' m'}
            </div>
          </div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {groupedInstructions.map((instruction, idx) => (
              <li
                key={idx}
                onClick={() => {
                  setActiveInstructionIdx(idx);
                  if (onRouteStepClick && instruction.coord) onRouteStepClick(instruction.coord);
                }}
                style={{
                  display: 'flex', gap: '15px', padding: '15px 10px',
                  borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'all 0.2s',
                  background: activeInstructionIdx === idx ? '#e8f0fe' : 'transparent',
                  borderLeft: activeInstructionIdx === idx ? '4px solid #1A73E8' : '4px solid transparent',
                  margin: '0 -10px',
                  paddingLeft: activeInstructionIdx === idx ? '16px' : '20px'
                }}
                onMouseEnter={e => { if (activeInstructionIdx !== idx) e.currentTarget.style.background = '#f8f9fa' }}
                onMouseLeave={e => { if (activeInstructionIdx !== idx) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? '#34A853' : (instruction.isDestination ? '#EA4335' : (instruction.isWaypoint ? '#FBBC05' : '#1A73E8')) }}></div>
                  {idx !== groupedInstructions.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e0e0e0', margin: '4px 0' }}></div>}
                </div>
                <div>
                  <div style={{ fontWeight: 'bold', fontSize: '15px', color: activeInstructionIdx === idx ? (instruction.isDestination ? '#d93025' : '#1A73E8') : (instruction.isDestination ? '#EA4335' : '#333') }}>
                    {getTurnText(instruction.turnType)} {instruction.name}{instruction.isDestination && '!'}
                  </div>
                  {!instruction.isWaypoint && !instruction.isDestination && (
                    <div style={{ fontSize: '13px', color: activeInstructionIdx === idx ? '#333' : '#777', marginTop: '4px', fontWeight: activeInstructionIdx === idx ? '500' : 'normal' }}>
                      Đi thẳng {instruction.length_m > 1000 ? (instruction.length_m / 1000).toFixed(2) + ' km' : Math.round(instruction.length_m) + ' m'}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // --- HELPERS: Render UI ---
  const images = (location.images && location.images.length > 0)
    ? location.images
    : [{ id: 'def', image: "https://via.placeholder.com/400x250?text=No+Image" }];

  const currentImageSrc = images[currentImageIndex].image;

  // Next/Prev ảnh trên slider chính
  const nextImage = (e) => { e?.stopPropagation(); setCurrentImageIndex((prev) => (prev + 1) % images.length); };
  const prevImage = (e) => { e?.stopPropagation(); setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length); };

  // Next/Prev ảnh trên Modal Lightbox
  const handleModalNext = (e) => {
    e.stopPropagation();
    if (!selectedImage) return;
    const currIdx = images.findIndex(img => img.id === selectedImage.id);
    const nextIdx = (currIdx + 1) % images.length;
    setSelectedImage(images[nextIdx]);
  };

  const handleModalPrev = (e) => {
    e.stopPropagation();
    if (!selectedImage) return;
    const currIdx = images.findIndex(img => img.id === selectedImage.id);
    const prevIdx = (currIdx - 1 + images.length) % images.length;
    setSelectedImage(images[prevIdx]);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push(<IoStar key={i} color="#F4B400" size={14} />);
      else if (rating >= i - 0.5) stars.push(<IoStarHalf key={i} color="#F4B400" size={14} />);
      else stars.push(<IoStar key={i} color="#E0E0E0" size={14} />);
    }
    return stars;
  };



  return (
    <div className="location-panel">
      {/* Nút đóng Panel chính */}
      <button className="close-btn" onClick={onClose}><IoClose size={24} /></button>

      {/* --- PHẦN 1: SLIDER ẢNH --- */}
      <div className="location-image-container">
        <img
          src={currentImageSrc}
          alt={location.name}
          className="main-img"
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedImage(images[currentImageIndex])} // Mở Modal khi click
        />
        {images.length > 1 && (
          <>
            <button className="img-nav-btn prev" onClick={prevImage}><IoChevronBack size={18} /></button>
            <button className="img-nav-btn next" onClick={nextImage}><IoChevronForward size={18} /></button>
            <div className="img-counter">{currentImageIndex + 1} / {images.length}</div>
          </>
        )}
      </div>

      <div className="panel-content">
        {/* --- PHẦN 2: THÔNG TIN CHÍNH --- */}
        <h1 className="location-title">{location.name}</h1>

        <div className="rating-row">
          <span className="rating-num">{location.rating_avg ? parseFloat(location.rating_avg).toFixed(1) : 0}</span>
          <div className="stars">{renderStars(location.rating_avg || 0)}</div>
          <span className="reviews">({location.rating_count || 0} đánh giá)</span>
        </div>

        <p className="category" style={{ color: '#666', fontSize: '13px' }}>
          {location.category_name || "Địa điểm"} • {location.state === 'public' ? "Công khai" : "Đang chờ duyệt"}
        </p>

        {/* --- PHẦN 3: NÚT HÀNH ĐỘNG --- */}

        {/* Nút routing đặt riêng một hàng ngang nổi bật */}
        {hasRoute && !isStoreInRoute && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={onAddWaypoint}
              style={{ flex: 1, padding: '10px', background: '#e8f0fe', color: '#1A73E8', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <IoNavigate size={18} /> Thêm điểm dừng
            </button>
            <button
              onClick={onSetAsDestination}
              style={{ flex: 1, padding: '10px', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <IoLocationOutline size={18} /> Điểm đến mới
            </button>
          </div>
        )}

        {hasRoute && isStoreInRoute && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={onRemoveFromRoute}
              style={{ flex: 1, padding: '10px', background: '#fce8e6', color: '#d93025', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
            >
              <IoClose size={18} /> Xóa khỏi Lộ trình
            </button>
          </div>
        )}

        <div className="actions-row">
          {!hasRoute && (
            <div className="action-item" onClick={onDirections}>
              <button className="circle-btn blue">
                <IoNavigate color="#fff" />
              </button>
              <span>Đường đi</span>
            </div>
          )}

          {/* <div className="action-item">
             <button className="circle-btn"><IoCallOutline color="#1A73E8" /></button>
             <span>Gọi điện</span>
          </div> */}

          <div className="action-item" onClick={onToggleFavorite} style={{ cursor: 'pointer' }}>
            <button className="circle-btn">
              {isFavorite ? <IoHeart color="#EA4335" size={24} /> : <IoHeartOutline color="#1A73E8" size={24} />}
            </button>
            <span style={{ color: isFavorite ? '#EA4335' : '#333' }}>{isFavorite ? 'Đã thích' : 'Lưu'}</span>
          </div>
          <div className="action-item" onClick={handleShare} style={{ cursor: 'pointer' }}>
            <button className="circle-btn"><IoShareSocialOutline color="#1A73E8" /></button>
            <span>Chia sẻ</span>
          </div>
          {/* <div className="action-item" onClick={() => setShowEditModal(true)}>
            <button className="circle-btn"><IoCreateOutline color="#1A73E8" /></button>
            <span>Chỉnh sửa</span>
          </div> */}
        </div>

        {/* --- TABS --- */}
        <div style={{ display: 'flex', borderBottom: '1px solid #ddd', marginBottom: '15px' }}>
          <div
            onClick={() => setActiveTab('info')}
            style={{ flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'info' ? '2px solid #1A73E8' : 'none', color: activeTab === 'info' ? '#1A73E8' : '#555', fontWeight: activeTab === 'info' ? 'bold' : 'normal' }}
          >Thông tin</div>
          {hasRoute && isStoreInRoute && (
            <div
              onClick={() => setActiveTab('route')}
              style={{ flex: 1, textAlign: 'center', padding: '10px', cursor: 'pointer', borderBottom: activeTab === 'route' ? '2px solid #1A73E8' : 'none', color: activeTab === 'route' ? '#1A73E8' : '#555', fontWeight: activeTab === 'route' ? 'bold' : 'normal' }}
            >Chỉ đường</div>
          )}
        </div>

        {activeTab === 'info' && (
          <>
            {/* --- PHẦN 4: CHI TIẾT --- */}
            <div className="details-list">

              <div className="detail-item" style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <IoTimeOutline size={20} color="#5F6368" />
                <span>{location.open_time ? `${location.open_time.slice(0, 5)} - ${location.close_time.slice(0, 5)}` : "Đang cập nhật giờ"}</span>
              </div>

              <div className="detail-item" style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                <IoLocationOutline size={20} color="#5F6368" />
                <span>{location.address}</span>
              </div>

              {/* Số điện thoại (Chỉ hiện nếu có) */}
              {location.phone && (
                <div className="detail-item" style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                  <IoCallOutline size={20} color="#5F6368" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {location.phone.split('|').map((num, i) => {
                      const clean = num.trim();
                      return (
                        <a
                          key={i}
                          href={`tel:${clean}`}
                          style={{
                            display: 'inline-block',
                            padding: '2px 10px',
                            background: '#e8f0fe',
                            color: '#1A73E8',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: '500',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {clean}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Email (Chỉ hiện nếu có) */}
              {location.email && (
                <div className="detail-item" style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <IoMailOutline size={20} color="#5F6368" />
                  <span>{location.email}</span>
                </div>
              )}

              {location.describe && (
                <div className="detail-item" style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                  <IoInformationCircleOutline size={20} color="#5F6368" style={{ minWidth: 20 }} />
                  <span style={{ fontStyle: 'italic', color: '#555', lineHeight: 1.4 }}>
                    {location.describe}
                  </span>
                </div>
              )}
            </div>

            <hr className="divider" style={{ border: 'none', borderTop: '1px solid #eee', margin: '20px 0' }} />

            {/* --- PHẦN 5: BÌNH LUẬN --- */}
            <div className="reviews-section">
              <h3 style={{ fontSize: 18, marginBottom: 15 }}>Đánh giá từ cộng đồng</h3>

              {/* Form viết đánh giá */}
              {currentUser ? (
                <div className="write-review-box">
                  <div className="user-curr-info">
                    <IoPersonCircle size={24} color="#1A73E8" />
                    <span>{currentUser.full_name || currentUser.username}</span>
                  </div>

                  <div className="rating-input">
                    {[1, 2, 3, 4, 5].map(star => (
                      <IoStar
                        key={star} size={22}
                        color={star <= newRating ? "#F4B400" : "#E0E0E0"}
                        style={{ cursor: 'pointer', marginRight: 4 }}
                        onClick={() => setNewRating(star)}
                      />
                    ))}
                    <span className="rating-text">{newRating}/5</span>
                  </div>

                  <form onSubmit={handleSubmitReview}>
                    <textarea
                      className="review-input"
                      placeholder="Chia sẻ trải nghiệm của bạn..."
                      rows="3"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                    ></textarea>
                    <button type="submit" className="btn-send-review" disabled={submitting}>
                      {submitting ? 'Đang gửi...' : <><IoSend /> Đăng bài</>}
                    </button>
                    <div style={{ clear: 'both' }}></div>
                  </form>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, background: '#f1f3f4', borderRadius: 8 }}>
                  <p>Vui lòng đăng nhập để viết đánh giá.</p>
                </div>
              )}

              {/* Danh sách bình luận */}
              {loadingReviews ? (
                <p style={{ textAlign: 'center', color: '#999' }}>Đang tải...</p>
              ) : reviews.length === 0 ? (
                <p className="no-reviews" style={{ textAlign: 'center', color: '#999' }}>Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
              ) : (
                <div className="review-list">
                  {reviews.map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <div className="user-info">
                          <IoPersonCircle size={28} color="#999" />
                          <span className="user-name">{review.user_name || "Ẩn danh"}</span>
                        </div>
                        <span className="review-date">{new Date(review.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="review-stars">{renderStars(review.rating)}</div>
                      <p className="review-content">{review.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* --- TAB CHỈ ĐƯỜNG --- */}
        {activeTab === 'route' && (
          <div className="route-instructions">
            <h3 style={{ fontSize: 18, marginBottom: 15 }}>Lộ trình chi tiết</h3>
            <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '8px', marginBottom: '15px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '16px', color: '#1A73E8' }}>Tổng quãng đường:</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
                {totalLength > 1000 ? (totalLength / 1000).toFixed(2) + ' km' : Math.round(totalLength) + ' m'}
              </div>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {groupedInstructions.map((instruction, idx) => (
                <li
                  key={idx}
                  onClick={() => {
                    setActiveInstructionIdx(idx);
                    if (onRouteStepClick && instruction.coord) onRouteStepClick(instruction.coord);
                  }}
                  style={{
                    display: 'flex', gap: '15px', padding: '15px 10px',
                    borderBottom: '1px solid #eee', cursor: 'pointer', transition: 'all 0.2s',
                    background: activeInstructionIdx === idx ? '#e8f0fe' : 'transparent',
                    borderLeft: activeInstructionIdx === idx ? '4px solid #1A73E8' : '4px solid transparent',
                    margin: '0 -10px',
                    paddingLeft: activeInstructionIdx === idx ? '16px' : '20px'
                  }}
                  onMouseEnter={e => { if (activeInstructionIdx !== idx) e.currentTarget.style.background = '#f8f9fa' }}
                  onMouseLeave={e => { if (activeInstructionIdx !== idx) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: idx === 0 ? '#34A853' : (instruction.isDestination ? '#EA4335' : (instruction.isWaypoint ? '#FBBC05' : '#1A73E8')) }}></div>
                    {idx !== groupedInstructions.length - 1 && <div style={{ width: '2px', flex: 1, background: '#e0e0e0', margin: '4px 0' }}></div>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '15px', color: activeInstructionIdx === idx ? (instruction.isDestination ? '#d93025' : '#1A73E8') : (instruction.isDestination ? '#EA4335' : '#333') }}>
                      {getTurnText(instruction.turnType)} {instruction.name}{instruction.isDestination && '!'}
                    </div>
                    {!instruction.isWaypoint && !instruction.isDestination && (
                      <div style={{ fontSize: '13px', color: activeInstructionIdx === idx ? '#333' : '#777', marginTop: '4px', fontWeight: activeInstructionIdx === idx ? '500' : 'normal' }}>
                        Đi thẳng {instruction.length_m > 1000 ? (instruction.length_m / 1000).toFixed(2) + ' km' : Math.round(instruction.length_m) + ' m'}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- MODAL XEM ẢNH CHI TIẾT (LIGHTBOX) --- */}
      {selectedImage && (
        <div className="image-detail-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-modal-btn" onClick={() => setSelectedImage(null)}>
              <IoClose size={24} />
            </button>

            {/* Cột Trái: Ảnh */}
            <div className="modal-image-col">
              {images.length > 1 && (
                <>
                  <button className="modal-nav-btn prev" onClick={handleModalPrev}><IoChevronBack size={36} /></button>
                  <button className="modal-nav-btn next" onClick={handleModalNext}><IoChevronForward size={36} /></button>
                </>
              )}
              <img src={selectedImage.image} alt="Chi tiết" />
            </div>

            {/* Cột Phải: Thông tin ảnh */}
            <div className="modal-info-col">
              <h3>Chi tiết hình ảnh</h3>

              <div className="info-item">
                <strong>Mô tả:</strong>
                <p>{selectedImage.describe || "Không có mô tả."}</p>
              </div>

              <div className="info-item">
                <strong>Người đăng:</strong>
                <div className="uploader-badge">
                  <IoPersonCircle size={18} />
                  <span>{selectedImage.uploaded_by_name || "Người dùng"}</span>
                </div>
              </div>

              <div className="info-item">
                <strong>Trạng thái:</strong>
                <span className={`status-tag ${selectedImage.state || 'public'}`}>
                  {selectedImage.state === 'private' ? 'Riêng tư' : 'Công khai'}
                </span>
              </div>

              <div className="info-item">
                <strong>Ngày đăng:</strong>
                <div className="time-badge">
                  <IoTimeOutline />
                  <span>{selectedImage.time_up || "N/A"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CHIA SẺ GOOGLE MAPS --- */}
      {showShareModal && (
        <div className="share-modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="share-modal-header">
              <h3>Chia sẻ</h3>
              <button className="close-share-btn" onClick={() => setShowShareModal(false)}>
                <IoClose size={24} />
              </button>
            </div>

            <div className="share-location-preview">
              <img src={currentImageSrc} alt={location.name} className="share-thumb" />
              <div className="share-info">
                <strong>{location.name}</strong>
                <p>{location.address}</p>
              </div>
            </div>

            <div className="share-icons-row">
              <button
                className="social-btn copy"
                onClick={() => {
                  const shareText = `📍 Tên: ${location.name}\n🏠 Địa chỉ: ${location.address}\n🗺️ GPS: ${location.lat}, ${location.lng}\n🔗 Link: ${window.location.href}`;
                  navigator.clipboard.writeText(shareText);
                  alert("Đã sao chép tất cả thông tin điểm đến!");
                }}
              >
                <IoCopyOutline size={22} color="#5F6368" />
                <span>Sao chép Text</span>
              </button>
            </div>

            <div className="share-link-box">
              <input type="text" readOnly value={window.location.href} />
              <button
                className="copy-link-btn"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Đã sao chép đường liên kết!");
                }}
              >
                Sao chép link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CHỈNH SỬA --- */}
      {showEditModal && (
        <EditRequestModal
          store={location}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </div>
  );
};

export default LocationPanel;