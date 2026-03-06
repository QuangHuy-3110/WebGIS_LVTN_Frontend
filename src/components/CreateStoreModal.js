import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { IoClose, IoCloudUploadOutline, IoPaperPlane, IoExpand } from "react-icons/io5";

// Import Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const LocationPicker = ({ setPos }) => {
    useMapEvents({
        click(e) { if (e && e.latlng) setPos({ lat: e.latlng.lat, lng: e.latlng.lng }); },
    });
    return null;
};

const RecenterAutomatically = ({ lat, lng }) => {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => { map.invalidateSize(); }, 200);
        if (lat && lng) {
            map.flyTo([lat, lng], 16);
        }
    }, [lat, lng, map]);
    return null;
};

const CreateStoreModal = ({ onClose }) => {
    const { authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState('info');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [categories, setCategories] = useState([]);

    const [formData, setFormData] = useState({
        name: '', phone: '', email: '', address: '',
        open_time: '', close_time: '', describe: '',
        category: '',
        state: 'active'
    });

    const [position, setPosition] = useState({ lat: 10.045, lng: 105.746 });

    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) {
                const { lat, lng } = marker.getLatLng();
                setPosition({ lat, lng });
            }
        },
    }), []);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/categories/')
            .then(res => res.json())
            .then(data => {
                const result = data.results || data;
                setCategories(result);
                if (result.length > 0) {
                    setFormData(prev => ({ ...prev, category: result[0].id }));
                }
            })
            .catch(err => console.error("Lỗi tải danh mục:", err));
    }, []);

    // newImagesData: { file, describe, previewUrl }
    const [newImagesData, setNewImagesData] = useState([]);
    // lightbox state
    const [zoomedImage, setZoomedImage] = useState(null);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleFileSelect = async (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);

            // Build preview URLs
            const newFiles = files.map(file => ({
                file,
                describe: "",
                previewUrl: URL.createObjectURL(file)
            }));
            setNewImagesData(prev => [...prev, ...newFiles]);

            // GPS extraction from first file
            const firstFile = files[0];
            const data = new FormData();
            data.append('image', firstFile);

            try {
                console.log("⏳ Đang phân tích GPS từ ảnh...");
                const response = await fetch('http://127.0.0.1:8000/api/utils/analyze-image/', {
                    method: 'POST',
                    body: data,
                });
                const result = await response.json();
                if (result.latitude && result.longitude) {
                    setPosition({ lat: result.latitude, lng: result.longitude });
                    setFormData(prev => ({
                        ...prev,
                        address: result.address || prev.address
                    }));
                    alert(`📍 Đã tìm thấy vị trí từ ảnh!\nĐịa chỉ: ${result.address}`);
                }
            } catch (error) {
                console.error("Lỗi khi lấy GPS từ ảnh:", error);
            }
        }
    };

    const handleImageDescribeChange = (index, text) => {
        const updated = [...newImagesData]; updated[index].describe = text; setNewImagesData(updated);
    };

    const removeNewImage = (index) => {
        // Revoke object URL to avoid memory leaks
        URL.revokeObjectURL(newImagesData[index].previewUrl);
        setNewImagesData(newImagesData.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.address) {
            alert("Vui lòng nhập Tên quán và Địa chỉ!"); return;
        }

        setIsSubmitting(true);
        try {
            const storePayload = {
                ...formData,
                category: parseInt(formData.category),
                location: { type: "Point", coordinates: [position.lng, position.lat] }
            };

            const storeRes = await authFetch('http://127.0.0.1:8000/api/stores/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(storePayload)
            });

            if (!storeRes.ok) throw new Error("Lỗi khi tạo dữ liệu cửa hàng");
            const newStore = await storeRes.json();
            const newStoreId = newStore.id;

            if (newImagesData.length > 0) {
                for (const item of newImagesData) {
                    const imgFormData = new FormData();
                    imgFormData.append('image', item.file);
                    imgFormData.append('store', newStoreId);
                    imgFormData.append('describe', item.describe || 'Hình ảnh đề xuất');

                    await authFetch('http://127.0.0.1:8000/api/store-images/', {
                        method: 'POST', body: imgFormData
                    });
                }
            }

            const noteData = {
                action: "CREATE_NEW",
                store_name: formData.name,
                category_name: categories.find(c => c.id === formData.category)?.name || "N/A",
                created_at: new Date().toISOString()
            };

            const approvalRes = await authFetch('http://127.0.0.1:8000/api/approvals/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    store: newStoreId,
                    status: 'pending',
                    note: JSON.stringify(noteData)
                })
            });

            if (approvalRes.ok) {
                alert("✅ Đã gửi hồ sơ thành công! Vui lòng chờ Admin duyệt.");
                onClose();
            }

        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="edit-modal-content" style={{ maxWidth: '700px' }}>
                <div className="modal-header">
                    <h2>Đề xuất mở địa điểm mới</h2>
                    <button onClick={onClose}><IoClose size={24} /></button>
                </div>

                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'images' ? 'active' : ''}`} onClick={() => setActiveTab('images')}>Hình ảnh</button>
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Thông tin</button>
                    <button className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`} onClick={() => setActiveTab('location')}>Vị trí</button>
                </div>

                <div className="modal-body-scroll">
                    {/* ===== PERSISTENT IMAGE PREVIEW PANEL ===== */}
                    {newImagesData.length > 0 && (
                        <div style={{
                            background: '#f8f9fa',
                            border: '1px solid #e0e0e0',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            marginBottom: '12px'
                        }}>
                            <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '8px', fontWeight: 600 }}>
                                📷 Ảnh đã chọn ({newImagesData.length})
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {newImagesData.map((item, index) => (
                                    <div key={index} style={{ position: 'relative', width: '72px', height: '72px' }}>
                                        <img
                                            src={item.previewUrl}
                                            alt={item.file.name}
                                            onClick={() => setZoomedImage(item.previewUrl)}
                                            style={{
                                                width: '72px', height: '72px',
                                                objectFit: 'cover',
                                                borderRadius: '6px',
                                                cursor: 'zoom-in',
                                                border: '2px solid #ddd',
                                                transition: 'border-color 0.2s'
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.borderColor = '#4a90e2'}
                                            onMouseLeave={e => e.currentTarget.style.borderColor = '#ddd'}
                                        />
                                        <button
                                            onClick={() => removeNewImage(index)}
                                            style={{
                                                position: 'absolute', top: '-6px', right: '-6px',
                                                background: '#e53e3e', color: 'white',
                                                border: 'none', borderRadius: '50%',
                                                width: '18px', height: '18px',
                                                cursor: 'pointer', fontSize: '10px',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                lineHeight: 1
                                            }}
                                            title="Xóa ảnh"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB INFO */}
                    {activeTab === 'info' && (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Tên địa điểm (*)</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="VD: Cà phê View Sông..." />
                            </div>

                            <div className="form-group">
                                <label>Loại hình (*)</label>
                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '8px',
                                        borderRadius: '4px', border: '1px solid #ccc',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Trạng thái</label>
                                <select
                                    name="state"
                                    value={formData.state}
                                    onChange={handleChange}
                                    style={{
                                        width: '100%', padding: '8px',
                                        borderRadius: '4px', border: '1px solid #ccc',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="active">Active (Hoạt động)</option>
                                    <option value="inactive">Inactive (Không hoạt động)</option>
                                </select>
                            </div>

                            <div className="form-group"><label>Số điện thoại</label><input name="phone" value={formData.phone} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Email</label><input name="email" value={formData.email} onChange={handleChange} /></div>

                            <div className="form-group full-width">
                                <label>Địa chỉ (*)</label>
                                <input
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="Chọn ảnh có GPS ở tab Hình ảnh để tự động điền..."
                                />
                            </div>

                            <div className="form-group"><label>Giờ mở cửa</label><input type="time" name="open_time" value={formData.open_time} onChange={handleChange} /></div>
                            <div className="form-group"><label>Giờ đóng cửa</label><input type="time" name="close_time" value={formData.close_time} onChange={handleChange} /></div>
                            <div className="form-group full-width"><label>Mô tả / Giới thiệu</label><textarea rows="3" name="describe" value={formData.describe} onChange={handleChange} /></div>
                        </div>
                    )}

                    {activeTab === 'location' && (
                        <div className="location-edit-tab">
                            <p style={{ marginBottom: 10, color: '#d93025' }}>* Kéo thả ghim đỏ đến vị trí chính xác (Hoặc upload ảnh để tự định vị).</p>
                            <div className="mini-map-container" style={{ height: '350px' }}>
                                <MapContainer center={[position.lat, position.lng]} zoom={15} style={{ height: '100%' }}>
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <RecenterAutomatically lat={position.lat} lng={position.lng} />
                                    <Marker position={position} draggable={true} eventHandlers={eventHandlers} ref={markerRef} />
                                    <LocationPicker setPos={setPosition} />
                                </MapContainer>
                            </div>
                            <div style={{ marginTop: 10, textAlign: 'center' }}>
                                Toạ độ: {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
                            </div>
                        </div>
                    )}

                    {activeTab === 'images' && (
                        <div className="image-manager">
                            <div className="upload-zone">
                                <label className="upload-btn-label">
                                    <IoCloudUploadOutline size={24} /> <span>Tải ảnh lên (Minh chứng)</span>
                                    <input type="file" multiple onChange={handleFileSelect} style={{ display: 'none' }} />
                                </label>
                                <p style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                                    * Mẹo: Chọn ảnh chụp tại quán (có bật GPS) để tự động điền vị trí và địa chỉ.
                                </p>
                                <div className="new-images-list">
                                    {newImagesData.length === 0 && (
                                        <p style={{ fontSize: 13, color: '#999', fontStyle: 'italic', marginTop: 8 }}>Chưa có ảnh nào được chọn.</p>
                                    )}
                                    {newImagesData.map((item, index) => (
                                        <div key={index} className="new-img-row" style={{ alignItems: 'center' }}>
                                            <img
                                                src={item.previewUrl}
                                                alt={item.file.name}
                                                onClick={() => setZoomedImage(item.previewUrl)}
                                                style={{
                                                    width: '48px', height: '48px',
                                                    objectFit: 'cover', borderRadius: '4px',
                                                    cursor: 'zoom-in', flexShrink: 0,
                                                    border: '1px solid #ddd'
                                                }}
                                                title="Click để phóng to"
                                            />
                                            <span className="file-name" style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {item.file.name}
                                            </span>
                                            <input className="img-describe-input" placeholder="Chú thích ảnh..." value={item.describe} onChange={(e) => handleImageDescribeChange(index, e.target.value)} />
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
                    <button className="btn-submit" onClick={handleSubmit} disabled={isSubmitting} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IoPaperPlane />
                        {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu duyệt'}
                    </button>
                </div>
            </div>

            {/* ===== LIGHTBOX ZOOM OVERLAY ===== */}
            {zoomedImage && (
                <div
                    onClick={() => setZoomedImage(null)}
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.85)',
                        zIndex: 10000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'zoom-out',
                        animation: 'fadeIn 0.2s ease'
                    }}
                >
                    <img
                        src={zoomedImage}
                        alt="Preview"
                        style={{
                            maxWidth: '90vw', maxHeight: '90vh',
                            objectFit: 'contain',
                            borderRadius: '8px',
                            boxShadow: '0 10px 50px rgba(0,0,0,0.5)'
                        }}
                        onClick={e => e.stopPropagation()}
                    />
                    <button
                        onClick={() => setZoomedImage(null)}
                        style={{
                            position: 'absolute', top: '20px', right: '20px',
                            background: 'rgba(255,255,255,0.15)',
                            border: 'none', borderRadius: '50%',
                            width: '40px', height: '40px',
                            color: 'white', fontSize: '20px',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                        }}
                    >
                        <IoClose />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CreateStoreModal;