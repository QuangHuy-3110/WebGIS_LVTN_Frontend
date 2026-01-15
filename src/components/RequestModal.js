// import React, { useState, useEffect } from 'react';
// import { useAuth } from '../context/AuthContext';

// const RequestModal = ({ coords, onClose }) => {
//   const { authFetch, currentUser } = useAuth();
//   const [name, setName] = useState('');
//   const [address, setAddress] = useState('');
//   const [category, setCategory] = useState(1); // Mặc định ID = 1
//   const [categories, setCategories] = useState([]);

//   // Load danh mục để User chọn
//   useEffect(() => {
//     fetch('http://127.0.0.1:8000/api/categories/').then(r=>r.json()).then(setCategories);
//   }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     // Chuẩn bị dữ liệu chuẩn GeoJSON cho Backend
//     const payload = {
//       name: name,
//       address: address || "Đang cập nhật",
//       category: category,
//       location: {
//         type: "Point",
//         coordinates: [coords[0], coords[1]] // [lng, lat]
//       },
//       // Nếu là Admin thì active luôn, User thì chờ duyệt (False)
//       is_active: currentUser.role === 'admin' 
//     };

//     const res = await authFetch('http://127.0.0.1:8000/api/stores/', {
//       method: 'POST',
//       body: JSON.stringify(payload)
//     });

//     if (res && res.ok) {
//       alert(currentUser.role === 'admin' ? 'Đã thêm cửa hàng!' : 'Đã gửi yêu cầu duyệt!');
//       window.location.reload(); // Reload để hiện marker mới (hoặc gọi callback reload)
//       onClose();
//     } else {
//       alert("Lỗi khi thêm cửa hàng!");
//     }
//   };

//   return (
//     <div className="auth-overlay">
//       <div className="auth-box">
//         <h3>{currentUser?.role === 'admin' ? 'Thêm cửa hàng mới' : 'Gửi yêu cầu'}</h3>
//         <form onSubmit={handleSubmit}>
//           {/* ... Input Name ... */}
//           <div className="input-group">
//             <label>Tên cửa hàng</label>
//             <input type="text" value={name} onChange={e => setName(e.target.value)} required />
//           </div>
          
//           <div className="input-group">
//             <label>Địa chỉ</label>
//             <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
//           </div>

//           <div className="input-group">
//              <label>Danh mục</label>
//              <select value={category} onChange={e => setCategory(e.target.value)}>
//                 {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//              </select>
//           </div>

//           <div className="btn-row">
//             <button type="button" onClick={onClose} className="btn-cancel">Hủy</button>
//             <button type="submit" className="submit-btn">Gửi</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default RequestModal;