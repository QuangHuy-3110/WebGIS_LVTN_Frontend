import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { IoClose, IoCamera, IoPerson, IoLockClosed, IoSave } from "react-icons/io5";

// --- 1. ĐỊNH NGHĨA HÀM HELPER Ở ĐÂY ---
const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    // Nếu ảnh đã có link tuyệt đối (http...) thì giữ nguyên
    if (imagePath.startsWith('http')) return imagePath;
    // Nếu là link tương đối từ Django (/media/...), nối thêm domain
    return `http://127.0.0.1:8000${imagePath}`;
};
// --------------------------------------

const UserProfileModal = ({ onClose }) => {
    const { currentUser, authFetch, setUser } = useAuth(); 
    
    const [activeTab, setActiveTab] = useState('info');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', content: '' });

    const [profileData, setProfileData] = useState({
        first_name: '', last_name: '', phone: '', email: '', avatar: null
    });
    const [previewAvatar, setPreviewAvatar] = useState(null);

    const [passData, setPassData] = useState({
        old_password: '', new_password: '', confirm_password: ''
    });

    // TỰ ĐỘNG ĐIỀN THÔNG TIN
    useEffect(() => {
        if (currentUser) {
            setProfileData({
                first_name: currentUser.first_name || '',
                last_name: currentUser.last_name || '',
                phone: currentUser.phone || '',
                email: currentUser.email || '',
                avatar: null
            });

            // Xử lý hiển thị avatar
            if (currentUser.avatar) {
                setPreviewAvatar(getFullImageUrl(currentUser.avatar));
            } else {
                setPreviewAvatar(null);
            }
        }
    }, [currentUser]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfileData({ ...profileData, avatar: file });
            setPreviewAvatar(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfile = async () => {
        setIsLoading(true);
        setMessage({ type: '', content: '' });
        
        try {
            const formData = new FormData();
            formData.append('first_name', profileData.first_name);
            formData.append('last_name', profileData.last_name);
            formData.append('phone', profileData.phone);
            if (profileData.avatar) {
                formData.append('avatar', profileData.avatar);
            }

            const res = await authFetch('http://127.0.0.1:8000/api/profile/', {
                method: 'PATCH',
                body: formData
            });

            if (res.ok) {
                const updatedUser = await res.json();
                
                // Cập nhật context ngay lập tức
                setUser(prev => ({ ...prev, ...updatedUser }));

                setMessage({ type: 'success', content: 'Cập nhật thông tin thành công!' });
            } else {
                setMessage({ type: 'error', content: 'Lỗi khi cập nhật thông tin.' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', content: 'Lỗi kết nối Server.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleChangePassword = async () => {
        if (passData.new_password !== passData.confirm_password) {
            setMessage({ type: 'error', content: 'Mật khẩu xác nhận không khớp!' });
            return;
        }
        
        setIsLoading(true);
        setMessage({ type: '', content: '' });

        try {
            const res = await authFetch('http://127.0.0.1:8000/api/change-password/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_password: passData.old_password,
                    new_password: passData.new_password
                })
            });

            const data = await res.json();
            if (res.ok) {
                setMessage({ type: 'success', content: 'Đổi mật khẩu thành công!' });
                setPassData({ old_password: '', new_password: '', confirm_password: '' });
            } else {
                const errorMsg = data.old_password ? data.old_password[0] : 'Đổi mật khẩu thất bại.';
                setMessage({ type: 'error', content: errorMsg });
            }
        } catch (error) {
            setMessage({ type: 'error', content: 'Lỗi kết nối Server.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="profile-modal-content">
                <button className="btn-close-modal" onClick={onClose}><IoClose size={24}/></button>
                
                <div className="profile-sidebar">
                    <div className="avatar-section">
                        <div className="avatar-wrapper">
                            {/* Fallback hình ảnh nếu lỗi */}
                            <img 
                                src={previewAvatar || "https://via.placeholder.com/150"} 
                                alt="Avatar" 
                                onError={(e) => { e.target.src = "https://via.placeholder.com/150"; }}
                            />
                            <label className="camera-icon">
                                <IoCamera size={18} />
                                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                            </label>
                        </div>
                        <h3>{profileData.last_name} {profileData.first_name}</h3>
                        <p>{profileData.email}</p>
                    </div>

                    <div className="menu-tabs">
                        <button 
                            className={activeTab === 'info' ? 'active' : ''} 
                            onClick={() => { setActiveTab('info'); setMessage({type:'', content:''}); }}
                        >
                            <IoPerson /> Thông tin cá nhân
                        </button>
                        <button 
                            className={activeTab === 'password' ? 'active' : ''} 
                            onClick={() => { setActiveTab('password'); setMessage({type:'', content:''}); }}
                        >
                            <IoLockClosed /> Đổi mật khẩu
                        </button>
                    </div>
                </div>

                <div className="profile-main">
                    <h2>{activeTab === 'info' ? 'Chỉnh sửa thông tin' : 'Đổi mật khẩu'}</h2>
                    
                    {message.content && (
                        <div className={`alert-msg ${message.type}`}>{message.content}</div>
                    )}

                    {activeTab === 'info' ? (
                        <div className="form-grid">
                            <div className="form-group">
                                <label>Họ (Last Name)</label>
                                <input 
                                    value={profileData.last_name} 
                                    onChange={e => setProfileData({...profileData, last_name: e.target.value})} 
                                />
                            </div>
                            <div className="form-group">
                                <label>Tên (First Name)</label>
                                <input 
                                    value={profileData.first_name} 
                                    onChange={e => setProfileData({...profileData, first_name: e.target.value})} 
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Số điện thoại</label>
                                <input 
                                    value={profileData.phone} 
                                    onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                                />
                            </div>
                            <div className="form-group full-width">
                                <label>Email (Không thể sửa)</label>
                                <input 
                                    value={profileData.email} 
                                    disabled 
                                    className="input-disabled" 
                                />
                            </div>
                            <button className="btn-save" onClick={handleUpdateProfile} disabled={isLoading}>
                                <IoSave /> {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    ) : (
                        <div className="form-stack">
                            <div className="form-group">
                                <label>Mật khẩu hiện tại</label>
                                <input type="password" value={passData.old_password} onChange={e => setPassData({...passData, old_password: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Mật khẩu mới</label>
                                <input type="password" value={passData.new_password} onChange={e => setPassData({...passData, new_password: e.target.value})} />
                            </div>
                            <div className="form-group">
                                <label>Xác nhận mật khẩu mới</label>
                                <input type="password" value={passData.confirm_password} onChange={e => setPassData({...passData, confirm_password: e.target.value})} />
                            </div>
                            <button className="btn-save" onClick={handleChangePassword} disabled={isLoading}>
                                <IoSave /> {isLoading ? 'Đang xử lý...' : 'Xác nhận đổi'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;