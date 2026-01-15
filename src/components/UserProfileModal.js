import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    IoClose, IoPersonCircle, IoSaveOutline, 
    IoKeyOutline, IoCloudUploadOutline, IoEye, IoEyeOff, 
    IoPerson, IoMail, IoCall 
} from "react-icons/io5";

const UserProfileModal = ({ onClose }) => {
    const { currentUser, authFetch } = useAuth(); 
    const [activeTab, setActiveTab] = useState('info');
    const [isLoading, setIsLoading] = useState(false);

    // --- STATE DỮ LIỆU ---
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
    });
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(null);

    const [passData, setPassData] = useState({
        old_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPass, setShowPass] = useState(false);

    // --- LOAD DỮ LIỆU ---
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const res = await authFetch('http://127.0.0.1:8000/api/users/current-user/');
                if (res.ok) {
                    const data = await res.json();
                    setProfileData({
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        email: data.email || '',
                        phone: data.phone || ''
                    });
                    if (data.avatar) {
                        const avatarUrl = data.avatar.startsWith('http') ? data.avatar : `http://127.0.0.1:8000${data.avatar}`;
                        setAvatarPreview(avatarUrl);
                    }
                }
            } catch (error) {
                console.error("Lỗi tải thông tin user:", error);
                if (currentUser) { // Fallback
                    setProfileData({
                        first_name: currentUser.first_name || '',
                        last_name: currentUser.last_name || '',
                        email: currentUser.email || '',
                        phone: currentUser.phone || ''
                    });
                    setAvatarPreview(currentUser.avatar);
                }
            }
        };
        fetchUserData();
    }, [authFetch, currentUser]);

    // --- HANDLERS ---
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfile = async () => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('first_name', profileData.first_name);
            formData.append('last_name', profileData.last_name);
            formData.append('phone', profileData.phone);
            if (avatarFile) formData.append('avatar', avatarFile);

            const res = await authFetch('http://127.0.0.1:8000/api/profile/update/', {
                method: 'PATCH', body: formData 
            });

            if (res.ok) {
                alert("Cập nhật thành công! Vui lòng tải lại trang.");
                window.location.reload(); 
            } else {
                alert("Lỗi cập nhật thông tin.");
            }
        } catch (error) { console.error(error); alert("Lỗi kết nối server."); } 
        finally { setIsLoading(false); }
    };

    const handleChangePassword = async () => {
        if (passData.new_password !== passData.confirm_password) {
            alert("Mật khẩu xác nhận không khớp!"); return;
        }
        setIsLoading(true);
        try {
            const res = await authFetch('http://127.0.0.1:8000/api/profile/change-password/', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    old_password: passData.old_password,
                    new_password: passData.new_password
                })
            });

            if (res.ok) {
                alert("Đổi mật khẩu thành công!");
                setPassData({ old_password: '', new_password: '', confirm_password: '' });
                setActiveTab('info');
            } else {
                const data = await res.json();
                if (data.old_password) alert(data.old_password[0]);
                else if (data.new_password) alert(data.new_password[0]);
                else alert("Lỗi đổi mật khẩu.");
            }
        } catch (error) { console.error(error); alert("Lỗi kết nối."); } 
        finally { setIsLoading(false); }
    };

    return (
        <div className="modal-overlay">
            {/* Override width để modal nhỏ gọn hơn (Profile không cần quá rộng) */}
            <div className="edit-modal-content" style={{ width: '480px', height: 'auto', maxHeight: '90vh' }}>
                
                {/* HEADER */}
                <div className="modal-header">
                    <h2 style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <IoPerson /> Hồ sơ cá nhân
                    </h2>
                    <button className="icon-btn" onClick={onClose}><IoClose size={24}/></button>
                </div>

                {/* TABS */}
                <div className="tabs">
                    <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
                        Thông tin chung
                    </button>
                    <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
                        Bảo mật
                    </button>
                </div>

                <div className="modal-body-scroll">
                    
                    {/* --- TAB 1: THÔNG TIN --- */}
                    {activeTab === 'info' && (
                        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            
                            {/* Avatar Section (Tái sử dụng class từ AuthForm) */}
                            <div className="avatar-upload-section">
                                <div className="avatar-preview-box">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar" />
                                    ) : (
                                        <IoPersonCircle size={80} color="#ccc" />
                                    )}
                                </div>
                                <label className="upload-label-btn">
                                    <IoCloudUploadOutline size={18} /> Đổi ảnh đại diện
                                    <input type="file" accept="image/*" onChange={handleFileChange} style={{display:'none'}} />
                                </label>
                            </div>

                            <div style={{display: 'flex', gap: '10px'}}>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>Họ</label>
                                    <input value={profileData.last_name} onChange={(e) => setProfileData({...profileData, last_name: e.target.value})} />
                                </div>
                                <div className="form-group" style={{flex: 1}}>
                                    <label>Tên</label>
                                    <input value={profileData.first_name} onChange={(e) => setProfileData({...profileData, first_name: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="form-group">
                                <label><IoCall size={14}/> Số điện thoại</label>
                                <input value={profileData.phone} onChange={(e) => setProfileData({...profileData, phone: e.target.value})} placeholder="Thêm số điện thoại..." />
                            </div>

                            <div className="form-group">
                                <label><IoMail size={14}/> Email (Không thể sửa)</label>
                                <input value={profileData.email} disabled style={{backgroundColor: '#f1f3f4', color: '#666', cursor: 'not-allowed'}} />
                            </div>
                        </div>
                    )}

                    {/* --- TAB 2: BẢO MẬT --- */}
                    {activeTab === 'security' && (
                        <div className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                             <div className="form-group">
                                <label>Mật khẩu hiện tại</label>
                                <div style={{position: 'relative'}}>
                                    <input 
                                        type={showPass ? "text" : "password"}
                                        value={passData.old_password}
                                        onChange={(e) => setPassData({...passData, old_password: e.target.value})}
                                    />
                                </div>
                            </div>
                            
                            <hr style={{border: 'none', borderTop: '1px solid #eee', margin: '5px 0'}} />

                            <div className="form-group">
                                <label>Mật khẩu mới</label>
                                <input 
                                    type={showPass ? "text" : "password"}
                                    value={passData.new_password}
                                    onChange={(e) => setPassData({...passData, new_password: e.target.value})}
                                />
                            </div>

                            <div className="form-group">
                                <label>Nhập lại mật khẩu mới</label>
                                <input 
                                    type={showPass ? "text" : "password"}
                                    value={passData.confirm_password}
                                    onChange={(e) => setPassData({...passData, confirm_password: e.target.value})}
                                />
                            </div>

                            <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', cursor: 'pointer', userSelect: 'none', color: '#555'}} onClick={() => setShowPass(!showPass)}>
                                {showPass ? <IoEyeOff /> : <IoEye />} 
                                {showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="modal-footer">
                    {activeTab === 'info' ? (
                        <button className="btn-submit" onClick={handleUpdateProfile} disabled={isLoading}>
                            <IoSaveOutline /> {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </button>
                    ) : (
                        <button className="btn-submit" onClick={handleChangePassword} disabled={isLoading} style={{backgroundColor: '#d93025'}}>
                            <IoKeyOutline /> {isLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;