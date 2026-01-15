import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    IoClose, IoCloudUploadOutline, IoTrashOutline, 
    IoReloadOutline, IoSaveOutline, IoMapOutline, IoImageOutline, IoInformationCircleOutline 
} from "react-icons/io5";

// Import Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix icon Leaflet
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component bắt sự kiện click bản đồ
const LocationPicker = ({ setPos }) => {
    useMapEvents({
        click(e) { setPos(e.latlng); },
    });
    return null;
};

const EditRequestModal = ({ store, onClose }) => {
    const { authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('info');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name: store.name || '',
        address: store.address || '',
        phone: store.phone || '',
        email: store.email || '',
        describe: store.describe || '',
        open_time: store.open_time || '',
        close_time: store.close_time || '',
    });

    // Vị trí
    const [position, setPosition] = useState({
        lat: store.lat || 10.045, 
        lng: store.lng || 105.746
    });

    // Quản lý ảnh
    const [existingImages] = useState(store.images || []); 
    const [deletedImageIds, setDeletedImageIds] = useState([]);
    const [newImagesData, setNewImagesData] = useState([]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    // Xử lý file ảnh mới
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
    
    // Toggle trạng thái xóa ảnh cũ
    const toggleDeleteImage = (id) => {
        if (deletedImageIds.includes(id)) setDeletedImageIds(deletedImageIds.filter(x => x !== id));
        else setDeletedImageIds([...deletedImageIds, id]);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim()) { alert("Tên cửa hàng không được để trống"); return; }
        
        setIsSubmitting(true);
        try {
            // 1. Upload ảnh mới (nếu có)
            let newImageIds = [];
            if (newImagesData.length > 0) {
                for (const item of newImagesData) {
                    const payload = new FormData();
                    payload.append('image', item.file);
                    payload.append('store', store.id);
                    payload.append('state', 'private'); // Ảnh mới mặc định private chờ duyệt
                    payload.append('describe', item.describe || 'Ảnh cập nhật'); 
                    
                    const res = await authFetch('http://127.0.0.1:8000/api/store-images/', { method: 'POST', body: payload });
                    if (res.ok) {
                        const data = await res.json();
                        newImageIds.push(data.id);
                    }
                }
            }

            // 2. Đóng gói dữ liệu thay đổi vào JSON
            const notePayload = {
                ...formData,
                latitude: position.lat,
                longitude: position.lng,
                new_images: newImageIds,
                deleted_images: deletedImageIds
            };

            // 3. Gửi Request Approval
            const approvalRes = await authFetch('http://127.0.0.1:8000/api/approvals/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store: store.id,
                    status: 'pending',
                    note: JSON.stringify(notePayload)
                })
            });

            if (approvalRes.ok) {
                alert("✅ Đã gửi yêu cầu chỉnh sửa! Admin sẽ xem xét sớm.");
                onClose();
            } else {
                alert("❌ Lỗi khi gửi yêu cầu.");
            }
        } catch (error) {
            console.error(error);
            alert("Lỗi kết nối server.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="edit-modal-content">
                {/* HEADER */}
                <div className="modal-header">
                    <h2>✏️ Chỉnh sửa: {store.name}</h2>
                    <button className="icon-btn" onClick={onClose}><IoClose size={24}/></button>
                </div>

                {/* TABS */}
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                        <IoInformationCircleOutline /> Thông tin
                    </button>
                    <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>
                        <IoMapOutline /> Vị trí
                    </button>
                    <button className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>
                        <IoImageOutline /> Hình ảnh
                    </button>
                </div>

                <div className="modal-body-scroll">
                    
                    {/* --- TAB 1: THÔNG TIN --- */}
                    {activeTab === 'info' && (
                        <div className="form-grid">
                             <div className="form-group full-width">
                                <label>Tên cửa hàng (*)</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nhập tên quán..." />
                            </div>
                            
                            <div className="form-group">
                                <label>Giờ mở cửa</label>
                                <input type="time" name="open_time" value={formData.open_time} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Giờ đóng cửa</label>
                                <input type="time" name="close_time" value={formData.close_time} onChange={handleChange} />
                            </div>

                            <div className="form-group">
                                <label>Số điện thoại</label>
                                <input name="phone" value={formData.phone} onChange={handleChange} placeholder="090xxxx..." />
                            </div>
                            <div className="form-group">
                                <label>Email</label>
                                <input name="email" value={formData.email} onChange={handleChange} placeholder="contact@..." />
                            </div>

                            <div className="form-group full-width">
                                <label>Địa chỉ cụ thể</label>
                                <input name="address" value={formData.address} onChange={handleChange} placeholder="Số nhà, đường, phường..." />
                            </div>
                            <div className="form-group full-width">
                                <label>Mô tả / Giới thiệu</label>
                                <textarea rows="4" name="describe" value={formData.describe} onChange={handleChange} placeholder="Giới thiệu về quán, các món đặc biệt..." />
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: VỊ TRÍ --- */}
                    {activeTab === 'location' && (
                        <div className="location-edit-tab">
                            <div className="coord-display">
                                <span className="coord-item">Vĩ độ: <strong>{position.lat.toFixed(6)}</strong></span>
                                <span className="coord-item">Kinh độ: <strong>{position.lng.toFixed(6)}</strong></span>
                            </div>
                            <p style={{fontSize: '0.85rem', color: '#666', marginBottom: '10px', fontStyle: 'italic'}}>
                                * Chạm vào bản đồ để cập nhật vị trí chính xác của quán.
                            </p>
                            
                            <div className="mini-map-container" style={{height: '350px', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid #ddd'}}>
                                <MapContainer center={[position.lat, position.lng]} zoom={16} style={{ height: '100%', width: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <Marker position={position} />
                                    <LocationPicker setPos={setPosition} />
                                </MapContainer>
                            </div>
                        </div>
                    )}

                    {/* --- TAB 3: HÌNH ẢNH --- */}
                    {activeTab === 'images' && (
                         <div className="image-manager">
                            
                            {/* Danh sách ảnh cũ */}
                            {existingImages.length > 0 && (
                                <>
                                    <h4 style={{marginBottom: 10, fontSize: 14, color: '#555'}}>Ảnh hiện tại (Click để đánh dấu xóa)</h4>
                                    <div className="image-grid-list">
                                        {existingImages.map(img => {
                                            const isDeleted = deletedImageIds.includes(img.id);
                                            return (
                                                <div key={img.id} className={`img-item ${isDeleted ? 'deleted' : ''}`} onClick={() => toggleDeleteImage(img.id)}>
                                                    <img src={img.image} alt="Store" />
                                                    <div className="overlay">
                                                        {isDeleted ? <IoReloadOutline size={28} /> : <IoTrashOutline size={28} />}
                                                        <span style={{fontSize: 12, marginTop: 5}}>{isDeleted ? "Hoàn tác" : "Xóa"}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <hr style={{margin: '20px 0', border: 'none', borderTop: '1px solid #eee'}} />
                                </>
                            )}

                            {/* Upload ảnh mới */}
                            <h4 style={{marginBottom: 10, fontSize: 14, color: '#555'}}>Thêm ảnh mới</h4>
                            <div className="upload-zone">
                                <label className="upload-btn-label">
                                    <IoCloudUploadOutline size={20} />
                                    <span>Chọn hình từ máy</span>
                                    <input type="file" multiple accept="image/*" onChange={handleFileSelect} style={{display:'none'}} />
                                </label>

                                <div className="new-images-list">
                                    {newImagesData.map((item, index) => (
                                        <div key={index} className="new-img-row">
                                            <div className="img-info" style={{flex: '0 0 30%'}}>
                                                <span className="file-name">{item.file.name}</span>
                                            </div>
                                            <input 
                                                className="img-describe-input" 
                                                placeholder="Mô tả ảnh (VD: Menu, Không gian...)" 
                                                value={item.describe} 
                                                onChange={(e) => handleImageDescribeChange(index, e.target.value)} 
                                            />
                                            <button className="icon-btn" style={{width: 30, height: 30}} onClick={() => removeNewImage(index)}>
                                                <IoClose color="#d93025"/>
                                            </button>
                                        </div>
                                    ))}
                                    {newImagesData.length === 0 && (
                                        <p style={{fontSize: 13, color: '#999', marginTop: 10, fontStyle: 'italic'}}>Chưa có ảnh mới nào được chọn.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose} disabled={isSubmitting}>Hủy bỏ</button>
                    <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting} style={{display: 'flex', alignItems: 'center', gap: 6}}>
                        <IoSaveOutline size={18} />
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu duyệt'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditRequestModal;