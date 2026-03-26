/**
 * 🔐 Auth & UI Management - My Orders Integration
 */

function updateAppStatus() {
    const authBtn = document.querySelector('.BtnLogin');
    const authText = document.querySelector('.BtnLogin-text');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole'); 
    
    // ดึงชื่อไฟล์ปัจจุบัน
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);

    // --- 1. ระบบ Guard (ป้องกันการเข้าหน้า Admin/User โดยไม่ได้รับอนุญาต) ---
    if (isLoggedIn && token && token !== "undefined" && token !== "") {
        if (currentPage === 'login.html' || currentPage === 'register.html') {
            window.location.replace('main.html');
            return;
        }
    } else {
        // ถ้าไม่ได้ Login ห้ามเข้าหน้าเหล่านี้
        const protectedPages = ['data.html', 'dashboard.html', 'return.html', 'report.html', 'productmanagement.html', 'myorders.html', 'booking.html'];
        if (protectedPages.includes(currentPage)) {
            window.location.replace('login.html');
            return;
        }
    }

    // --- 2. จัดการ UI ปุ่ม และเพิ่มปุ่ม MY ORDERS ---
    if (authBtn && authText) {
        if (isLoggedIn && userName) {
            authText.textContent = userName;

            // ✨ ส่วนที่เพิ่ม: สร้างปุ่ม MY ORDERS สำหรับลูกค้า
            if (userRole !== 'admin') {
                // เช็คก่อนว่ามีปุ่มหรือยัง เพื่อไม่ให้สร้างซ้ำ
                if (!document.getElementById('navMyOrders')) {
                    const myOrderBtn = document.createElement('a');
                    myOrderBtn.href = 'myorders.html';
                    myOrderBtn.id = 'navMyOrders';
                    myOrderBtn.className = 'NavBtn'; // ใช้ Class เดียวกับปุ่มอื่นๆ บน Navbar
                    myOrderBtn.textContent = 'MY ORDERS';
                    myOrderBtn.style.color = '#ffffff'; // สีส้มเด่นๆ ให้ลูกค้าหาเจอง่าย
                    myOrderBtn.style.fontWeight = '900';
                    myOrderBtn.style.marginRight = '15px';
                    myOrderBtn.style.textDecoration = 'none';
                    
                    // แทรกปุ่มไว้ข้างหน้าปุ่ม Profile/Login
                    authBtn.parentNode.insertBefore(myOrderBtn, authBtn);
                }
            }

            // แยกหน้าการวาร์ปตาม Role
            if (userRole === 'admin') {
                authBtn.href = "dashboard.html"; 
            } else {
                authBtn.href = "data.html";
            }
            
            // สไตล์ปุ่มเมื่อ Login แล้ว
            authBtn.style.backgroundColor = '#ffffff';
            authBtn.style.color = '#333'; 
            authBtn.style.display = 'inline-flex';
            authBtn.style.alignItems = 'center';
            authBtn.style.padding = '5px 15px';
            authBtn.style.borderRadius = '20px';

            // เพิ่มไอคอนหน้าชื่อ (ถ้ายังไม่มี)
            if (!authBtn.querySelector('.UserIcon')) {
                const img = document.createElement('img');
                img.src = 'images/user.png'; 
                img.className = 'UserIcon';
                img.style.width = '24px';
                img.style.height = '24px';
                img.style.marginRight = '8px'; 
                authBtn.insertBefore(img, authText);
            }
        } else {
            // สถานะ Logout
            authText.textContent = "LOGIN";
            authBtn.href = "login.html";
            authBtn.style.backgroundColor = ""; 
            authBtn.style.color = "";
            
            const icon = authBtn.querySelector('.UserIcon');
            if (icon) icon.remove();

            // ลบปุ่ม My Orders ออกถ้า Logout
            const myOrderBtn = document.getElementById('navMyOrders');
            if (myOrderBtn) myOrderBtn.remove();
        }
    }
}

// ฟังก์ชัน Logout
function handleLogout() {
    Swal.fire({
        title: 'ออกจากระบบ?',
        text: "คุณต้องการออกจากระบบใช่หรือไม่",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#114e72',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.replace('main.html');
        }
    });
}

document.addEventListener("DOMContentLoaded", updateAppStatus);
window.onpageshow = function(event) { updateAppStatus(); };