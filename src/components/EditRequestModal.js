import React, { useState } from 'react'; // Bỏ useEffect vì không dùng
import { useAuth } from '../context/AuthContext';
import { IoClose, IoCloudUploadOutline, IoTrashOutline, IoReloadOutline } from "react-icons/io5"; // Bỏ IoLocationSharp

// Import Leaflet Components
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// --- FIX LỖI ICON LEAFLET (Cách chuẩn hơn cho Webpack/React) ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41] // Chỉnh tâm icon cho chuẩn
});

L.Marker.prototype.options.icon = DefaultIcon;
// ---------------------------------------------------------------

// Component con để xử lý sự kiện Click trên bản đồ
const LocationPicker = ({ setPos }) => {
    useMapEvents({
        click(e) {
            setPos(e.latlng); // Cập nhật vị trí khi click
        },
    });
    return null;
};

const EditRequestModal = ({ store, onClose }) => {
    const { authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('info');

    // State form
    const [formData, setFormData] = useState({
        name: store.name || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        describe: store.describe || '',
        open_time: store.open_time || '',
        close_time: store.close_time || '',
    });

    // State Vị trí
    const [position, setPosition] = useState({
        lat: store.lat || 10.045, 
        lng: store.lng || 105.746
    });

    // State hình ảnh
    // Bỏ setExistingImages vì ta không update list này, chỉ đánh dấu xóa
    const [existingImages] = useState(store.images || []); 
    
    const [deletedImageIds, setDeletedImageIds] = useState([]);
    const [newImagesData, setNewImagesData] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleFileSelect = (e) => {
         if (e.target.files) {
            const newFiles = Array.from(e.target.files).map(file => ({ file, describe: "" }));
            setNewImagesData([...newImagesData, ...newFiles]);
        }
    };
    
    const handleImageDescribeChange = (index, text) => {
        const updated = [...newImagesData]; updated[index].describe = text; setNewImagesData(updated);
    };
    
    const removeNewImage = (index) => setNewImagesData(newImagesData.filter((_, i) => i !== index));
    
    const toggleDeleteImage = (id) => {
        if (deletedImageIds.includes(id)) setDeletedImageIds(deletedImageIds.filter(x => x !== id));
        else setDeletedImageIds([...deletedImageIds, id]);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            // 1. Upload ảnh mới
            let newImageIds = [];
            if (newImagesData.length > 0) {
                for (const item of newImagesData) {
                    const payload = new FormData();
                    payload.append('image', item.file);
                    payload.append('store', store.id);
                    payload.append('state', 'private');
                    payload.append('describe', item.describe || ''); 
                    
                    const res = await authFetch('http://127.0.0.1:8000/api/store-images/', { method: 'POST', body: payload });
                    if (res.ok) {
                        const data = await res.json();
                        newImageIds.push(data.id);
                    }
                }
            }

            // 2. Tạo gói dữ liệu
            const notePayload = {
                ...formData,
                latitude: position.lat,
                longitude: position.lng,
                new_images: newImageIds,
                deleted_images: deletedImageIds
            };

            // 3. Gửi Request
            const approvalRes = await authFetch('http://127.0.0.1:8000/api/approvals/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store: store.id,
                    note: JSON.stringify(notePayload)
                })
            });

            if (approvalRes.ok) {
                alert("Đã gửi yêu cầu thành công!");
                onClose();
            } else {
                alert("Lỗi khi gửi yêu cầu.");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="edit-modal-content">
                <div className="modal-header">
                    <h2>Sửa đổi: {store.name}</h2>
                    <button onClick={onClose}><IoClose size={24}/></button>
                </div>

                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Thông tin</button>
                    <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Vị trí bản đồ</button>
                    <button className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>Hình ảnh</button>
                </div>

                <div className="modal-body-scroll">
                    {/* TAB THÔNG TIN CƠ BẢN */}
                    {activeTab === 'info' && (
                        <div className="form-grid">
                             <div className="form-group">
                                <label>Tên cửa hàng</label>
                                <input name="name" value={formData.name} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Số điện thoại</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Email liên hệ</label>
                                <input name="email" value={formData.email} onChange={handleChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Địa chỉ</label>
                                <input name="address" value={formData.address} onChange={handleChange} />
                            </div>
                             <div className="form-group">
                                <label>Giờ mở cửa</label>
                                <input type="time" name="open_time" value={formData.open_time} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Giờ đóng cửa</label>
                                <input type="time" name="close_time" value={formData.close_time} onChange={handleChange} />
                            </div>
                            <div className="form-group full-width">
                                <label>Mô tả chi tiết</label>
                                <textarea rows="3" name="describe" value={formData.describe} onChange={handleChange} />
                            </div>
                        </div>
                    )}

                    {/* TAB VỊ TRÍ (MỚI) */}
                    {activeTab === 'location' && (
                        <div className="location-edit-tab">
                            <div className="coord-inputs">
                                <div className="form-group">
                                    <label>Vĩ độ (Latitude)</label>
                                    <input type="number" step="any" value={position.lat} readOnly />
                                </div>
                                <div className="form-group">
                                    <label>Kinh độ (Longitude)</label>
                                    <input type="number" step="any" value={position.lng} readOnly />
                                </div>
                            </div>
                            <p style={{fontSize: '0.9rem', color: '#666', marginBottom: '10px'}}>
                                * Click chuột vào bản đồ để thay đổi vị trí cửa hàng.
                            </p>
                            
                            <div className="mini-map-container" style={{height: '300px', width: '100%'}}>
                                <MapContainer 
                                    center={[position.lat, position.lng]} 
                                    zoom={15} 
                                    style={{ height: '100%', width: '100%', borderRadius: '8px' }}
                                >
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={position} />
                                    <LocationPicker setPos={setPosition} />
                                </MapContainer>
                            </div>
                        </div>
                    )}

                    {/* TAB HÌNH ẢNH */}
                    {activeTab === 'images' && (
                         <div className="image-manager">
                            <h4>Ảnh hiện tại</h4>
                            <div className="image-grid-list">
                                {existingImages.map(img => {
                                    const isDeleted = deletedImageIds.includes(img.id);
                                    return (
                                        <div key={img.id} className={`img-item ${isDeleted ? 'deleted' : ''}`} onClick={() => toggleDeleteImage(img.id)}>
                                            <img src={img.image} alt="Store" />
                                            <div className="overlay">
                                                {isDeleted ? <IoReloadOutline size={24} /> : <IoTrashOutline size={24} />}
                                                <span>{isDeleted ? "Phục hồi" : "Xóa"}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <hr />
                            <h4>Thêm ảnh mới</h4>
                            <div className="upload-zone">
                                <label className="upload-btn-label">
                                    <IoCloudUploadOutline size={24} />
                                    <span>Chọn hình ảnh</span>
                                    <input type="file" multiple onChange={handleFileSelect} style={{display:'none'}} />
                                </label>
                                <div className="new-images-list">
                                    {newImagesData.map((item, index) => (
                                        <div key={index} className="new-img-row">
                                            <div className="img-info"><span className="file-name">{item.file.name}</span></div>
                                            <input className="img-describe-input" placeholder="Nhập mô tả..." value={item.describe} onChange={(e) => handleImageDescribeChange(index, e.target.value)} />
                                            <button className="btn-remove-img" onClick={() => removeNewImage(index)}><IoClose /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Hủy bỏ</button>
                    <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRequestModal;