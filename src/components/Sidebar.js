// import React, { useState } from 'react';
// import { useAuth } from '../context/AuthContext';
// import CreateStoreModal from './CreateStoreModal'; // Import Modal mới
// import { IoAddCircle } from "react-icons/io5";

// const Sidebar = ({ ...props }) => {
//     const { currentUser } = useAuth();
//     const [showCreateModal, setShowCreateModal] = useState(false);

//     return (
//         <div className="sidebar">
//             {/* ... code cũ của sidebar ... */}

//             {/* Chỉ hiện nút Thêm nếu người dùng đã đăng nhập */}
//             {currentUser && (
//                 <div style={{ padding: '10px 20px' }}>
//                     <button 
//                         className="btn-create-store"
//                         onClick={() => setShowCreateModal(true)}
//                         style={{
//                             width: '100%',
//                             padding: '12px',
//                             backgroundColor: '#1A73E8',
//                             color: 'white',
//                             border: 'none',
//                             borderRadius: '8px',
//                             cursor: 'pointer',
//                             display: 'flex',
//                             alignItems: 'center',
//                             justifyContent: 'center',
//                             gap: '8px',
//                             fontWeight: 'bold'
//                         }}
//                     >
//                         <IoAddCircle size={24} />
//                         Thêm địa điểm mới
//                     </button>
//                 </div>
//             )}

//             {/* Hiển thị Modal khi state = true */}
//             {showCreateModal && (
//                 <CreateStoreModal onClose={() => setShowCreateModal(false)} />
//             )}
//         </div>
//     );
// };

// export default Sidebar;