import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    IoClose, IoPerson, IoMail, IoCall, IoLockClosed, 
    IoCloudUploadOutline, IoPersonCircle, IoLogInOutline, IoPersonAddOutline 
} from 'react-icons/io5';

const AuthForm = ({ onClose }) => {
  const { login, register } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // State Form
  const [formData, setFormData] = useState({
    username: '', password: '', confirmPassword: '',
    email: '', firstName: '', lastName: '', phone: ''
  });

  // State Avatar
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isLoginMode && formData.password !== formData.confirmPassword) {
        setError("Mật khẩu xác nhận không khớp!"); return;
    }

    setIsLoading(true);

    if (isLoginMode) {
      // --- LOGIN ---
      const result = await login(formData.username, formData.password);
      setIsLoading(false);
      if (result.success) {
        if (result.isStaff) window.location.href = "http://127.0.0.1:8000/admin/";
        else onClose();
      } else {
        setError(result.message || 'Sai tài khoản hoặc mật khẩu!');
      }
    } else {
      // --- REGISTER ---
      const payload = new FormData();
      payload.append('username', formData.username);
      payload.append('password', formData.password);
      payload.append('email', formData.email);
      payload.append('first_name', formData.firstName);
      payload.append('last_name', formData.lastName);
      payload.append('phone', formData.phone);
      if (avatarFile) payload.append('avatar', avatarFile);

      const result = await register(payload);
      setIsLoading(false);

      if (result.success) {
          alert("Đăng ký thành công! Vui lòng đăng nhập.");
          setIsLoginMode(true);
          setFormData({ ...formData, password: '', confirmPassword: '' });
          setAvatarFile(null); setAvatarPreview(null);
      } else {
          setError(result.message || "Lỗi đăng ký.");
      }
    }
  };

  return (
    <div className="auth-overlay">
      {/* Class register-mode để CSS mở rộng chiều ngang */}
      <div className={`auth-box ${!isLoginMode ? 'register-mode' : ''}`}> 
        <button className="close-btn" onClick={onClose}><IoClose size={24}/></button>
        
        <div className="auth-header">
            <h2>{isLoginMode ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}</h2>
            <p>{isLoginMode ? 'Đăng nhập để tiếp tục khám phá' : 'Điền thông tin để tham gia cùng chúng tôi'}</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          
          {/* --- AVATAR UPLOAD (Chỉ hiện khi Đăng ký) --- */}
          {!isLoginMode && (
            <div className="avatar-upload-section">
               <div className="avatar-preview-box">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" />
                  ) : (
                    <IoPersonCircle size={90} color="#e0e0e0" />
                  )}
               </div>
               <label className="upload-label-btn">
                  <IoCloudUploadOutline size={18} /> Chọn ảnh đại diện
                  <input type="file" accept="image/*" onChange={handleFileChange} style={{display: 'none'}} />
               </label>
            </div>
          )}

          {/* --- CÁC TRƯỜNG NHẬP LIỆU --- */}
          <div className="input-group">
            <label><IoPerson /> Tên đăng nhập (*)</label>
            <input 
                className="input-field" 
                name="username" 
                placeholder="VD: nguyenvan_a"
                value={formData.username} 
                onChange={handleChange} 
                required 
            />
          </div>

          {!isLoginMode && (
             <div className="form-row">
                <div className="input-group">
                    <label>Họ</label>
                    <input className="input-field" name="lastName" placeholder="Nguyễn" value={formData.lastName} onChange={handleChange} required />
                </div>
                <div className="input-group">
                    <label>Tên</label>
                    <input className="input-field" name="firstName" placeholder="Văn A" value={formData.firstName} onChange={handleChange} required />
                </div>
             </div>
          )}

          {!isLoginMode && (
             <div className="form-row">
                 <div className="input-group">
                    <label><IoMail /> Email (*)</label>
                    <input className="input-field" type="email" name="email" placeholder="example@gmail.com" value={formData.email} onChange={handleChange} required />
                 </div>
                 <div className="input-group">
                    <label><IoCall /> Số điện thoại</label>
                    <input className="input-field" name="phone" placeholder="0909xxxxxx" value={formData.phone} onChange={handleChange} />
                 </div>
             </div>
          )}

          <div className="form-row">
            <div className="input-group">
                <label><IoLockClosed /> Mật khẩu (*)</label>
                <input className="input-field" type="password" name="password" placeholder="••••••" value={formData.password} onChange={handleChange} required />
            </div>

            {!isLoginMode && (
                <div className="input-group">
                    <label><IoLockClosed /> Xác nhận (*)</label>
                    <input className="input-field" type="password" name="confirmPassword" placeholder="••••••" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
            )}
          </div>

          {error && <div className="error-msg">{error}</div>}
          
          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : (
                isLoginMode 
                ? <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}><IoLogInOutline size={20}/> Đăng nhập</span> 
                : <span style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}}><IoPersonAddOutline size={20}/> Đăng ký ngay</span>
            )}
          </button>
        </form>
        
        <div className="switch-mode">
          {isLoginMode ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
          <span 
            className="switch-link"
            onClick={() => { 
                setIsLoginMode(!isLoginMode); 
                setError(''); 
                setAvatarFile(null); setAvatarPreview(null);
                setFormData({ username: '', password: '', confirmPassword: '', email: '', firstName: '', lastName: '', phone: ''});
            }}
          >
            {isLoginMode ? 'Đăng ký ngay' : 'Đăng nhập'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;