// auth.js

function updateAppStatus() {
    const authBtn = document.querySelector('.BtnLogin');
    const authText = document.querySelector('.BtnLogin-text');

    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userName = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    
    // ดึงชื่อไฟล์ปัจจุบันแบบแม่นยำ (ตัด query string ออก)
    const path = window.location.pathname;
    const currentPage = path.substring(path.lastIndexOf('/') + 1);

    // --- 1. ระบบ Guard (ปรับใหม่ให้ไม่เด้งมั่ว) ---
    // จะเด้งกลับ Main เฉพาะตอนที่มีครบทั้ง "สถานะ=true" และ "มี Token จริงๆ" เท่านั้น
    if (isLoggedIn && token && token !== "undefined" && token !== "") {
        if (currentPage === 'login.html' || currentPage === 'register.html') {
            window.location.replace('main.html');
            return; // หยุดการทำงานอื่นทันที
        }
    } else {
        // ถ้าไม่มีข้อมูลการ Login ห้ามเข้าหน้า Data
        if (currentPage === 'data.html') {
            window.location.replace('login.html');
            return;
        }
    }

    // --- 2. จัดการ UI ปุ่ม (คงรูปทรงเดิม เพิ่มไอคอน) ---
    if (authBtn && authText) {
        if (isLoggedIn && userName) {
            authText.textContent = userName;
            authBtn.href = "data.html";
            
            // เปลี่ยนแค่สี พื้นหลัง และตัวอักษร (ไม่ยุ่งกับความโค้ง/ขนาดปุ่ม)
            authBtn.style.backgroundColor = '#ffffff';
            authBtn.style.color = '#fff';
            authBtn.style.display = 'inline-flex';
            authBtn.style.alignItems = 'center';
            authBtn.style.justifyContent = 'center';

            // เพิ่มไอคอนหน้าชื่อ (ถ้ายังไม่มี)
            if (!authBtn.querySelector('.UserIcon')) {
                const img = document.createElement('img');
                img.src = 'images/user.png'; 
                img.className = 'UserIcon';
                img.style.width = '30px';      // ปรับขนาดให้เล็กลงหน่อยเพื่อความชัวร์
                img.style.height = '30px';
                img.style.marginRight = '8px'; 
                img.style.flexShrink = '0';    // กันรูปโดนบีบ
                authBtn.insertBefore(img, authText);
            }
        } else {
            // สถานะ Logout หรือยังไม่ได้ Login
            authText.textContent = "LOGIN";
            authBtn.href = "login.html";
            authBtn.style.backgroundColor = ""; // คืนค่าตาม CSS
            authBtn.style.color = "";
            
            const icon = authBtn.querySelector('.UserIcon');
            if (icon) icon.remove();
        }
    }
}

// ฟังก์ชัน Logout
function handleLogout() {
    if (confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) {
        localStorage.clear();
        window.location.replace('main.html');
    }
}

document.addEventListener("DOMContentLoaded", updateAppStatus);
window.onpageshow = function(event) { updateAppStatus(); };