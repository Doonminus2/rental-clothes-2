document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
    // ทำให้ช่อง Search ทำงานทันทีที่พิมพ์ (Real-time Search)
    const searchInput = document.getElementById('searchCus');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadCustomers());
    }
});

async function loadCustomers() {
    try {
        const searchInput = document.getElementById('searchCus');
        const search = searchInput ? searchInput.value : '';
        
        const response = await fetch(`/api/customers?search=${search}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        
        if (result.success) {
            // กรองข้อมูลแยกส่วน: คนปกติ กับ คนที่โดน Blacklist
            const normalUsers = result.data.filter(u => u.is_blacklisted !== 1);
            const blacklistedUsers = result.data.filter(u => u.is_blacklisted === 1);
            
            renderCustomerTable(normalUsers);
            renderBlacklistTable(blacklistedUsers);
            updateStats(result.data);
        }
    } catch (err) { 
        console.error("Load Customers Error:", err); 
    }
}

// ── 1. วาดตารางลูกค้าแบบแถว (Table Row) ──────────────────────
function renderCustomerTable(customers) {
    const grid = document.getElementById('customerGrid'); 
    if (!grid) return;

    if (customers.length === 0) {
        grid.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:#666;">ไม่พบข้อมูลลูกค้า</td></tr>';
        return;
    }

    grid.innerHTML = customers.map(u => {
        // เลือกคลาส Badge ตาม Role จาก Database
        const roleClass = u.role === 'VIP' ? 'Badge--vip' : (u.role === 'Member' ? 'Badge--member' : 'Badge--user');
        
        return `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div class="CusAvatar" style="width:35px; height:35px; font-size:14px; background:#114E72; color:white; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold;">
                        ${u.username ? u.username[0].toUpperCase() : '?'}
                    </div>
                    <strong style="color:#333;">${u.username}</strong>
                </div>
            </td>
            <td style="padding: 12px;">${u.phone || '-'}</td>
            <td style="padding: 12px;">
                <select class="RoleSelect ${roleClass}" onchange="changeRole(${u.id}, this.value)" 
                        style="padding:5px 10px; border-radius:15px; border:1px solid #ddd; cursor:pointer; font-size:13px;">
                    <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                    <option value="Member" ${u.role === 'Member' ? 'selected' : ''}>Member</option>
                    <option value="VIP" ${u.role === 'VIP' ? 'selected' : ''}>VIP</option>
                </select>
            </td>
            <td style="padding: 12px; text-align:center;">${u.total_rentals || 0} ครั้ง</td>
            <td style="padding: 12px;">${(u.total_spent || 0).toLocaleString()} ฿</td>
            <td style="padding: 12px;">
                <button class="BtnAction" onclick="openCusDetail(${u.id})" 
                        style="background:none; border:1px solid #114E72; color:#114E72; padding:5px 12px; border-radius:6px; cursor:pointer; font-weight:bold; transition:0.2s;">
                    👁️
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ── 2. เปลี่ยนระดับลูกค้า (Role) ──────────────────────────────
async function changeRole(userId, newRole) {
    const confirm = await Swal.fire({
        title: 'ยืนยันการเปลี่ยนระดับ?',
        text: `ต้องการเปลี่ยนลูกค้าเป็นระดับ ${newRole} หรือไม่?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#114E72',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    });

    if (confirm.isConfirmed) {
        try {
            const response = await fetch(`/api/customers/${userId}/role`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` 
                },
                body: JSON.stringify({ role: newRole })
            });
            const result = await response.json();
            if (result.success) {
                Swal.fire({ title: 'สำเร็จ!', text: `เปลี่ยนเป็น ${newRole} เรียบร้อย`, icon: 'success', timer: 1500, showConfirmButton: false });
                loadCustomers();
            }
        } catch (err) { console.error("Change Role Error:", err); }
    } else {
        loadCustomers(); // รีโหลดเพื่อล้างค่าที่เลือกค้างไว้ถ้ากดยกเลิก
    }
}

// ── 3. ดูรายละเอียดและประวัติการเช่า (Modal) ──────────────────
async function openCusDetail(id) {
    const response = await fetch(`/api/customers/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    
    if (result.success) {
        const u = result.data;
        const history = u.history || [];
        
        document.getElementById('modalTitle').textContent = `ข้อมูลลูกค้า: ${u.username}`;
        document.getElementById('modalCusBody').innerHTML = `
            <div class="ProfileHero" style="padding: 15px; background: #f8fafd; border-radius: 10px; margin-bottom: 20px;">
                <p><strong>📞 เบอร์โทร:</strong> ${u.phone || '-'}</p>
                <p><strong>📍 ที่อยู่:</strong> ${u.address || 'ไม่ระบุที่อยู่'}</p>
                <p><strong>📅 สมัครเมื่อ:</strong> ${new Date(u.created_at).toLocaleDateString('th-TH')}</p>
                <hr style="margin: 10px 0; border:0; border-top:1px solid #eee;">
                <p style="font-size: 1.1rem;">ยอดใช้จ่ายสะสม: <strong style="color:#114E72">${(u.total_spent || 0).toLocaleString()} ฿</strong></p>
            </div>
            
            <h3 style="font-size: 16px; margin-bottom: 10px; display:flex; align-items:center; gap:8px;">🕒 ประวัติการเช่าล่าสุด</h3>
            <div class="HistoryList">
                ${history.length > 0 ? history.map(h => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px; background:white; border:1px solid #eee; border-radius:8px; margin-bottom:8px;">
                        <img src="${h.image_url}" style="width:45px; height:45px; border-radius:5px; object-fit:cover;" onerror="this.src='images/default.png'">
                        <div style="flex:1;">
                            <div style="font-size:14px; font-weight:bold;">${h.product_name}</div>
                            <div style="font-size:12px; color:#666;">${new Date(h.rental_start).toLocaleDateString('th-TH')} - ${new Date(h.rental_end).toLocaleDateString('th-TH')}</div>
                        </div>
                        <span style="font-size:11px; padding:3px 8px; border-radius:10px; background:#f0f0f0; color:#555;">${h.status}</span>
                    </div>
                `).join('') : '<p style="text-align:center; color:#999; padding:20px;">ยังไม่มีประวัติการเช่า</p>'}
            </div>
        `;
        
        // อัปเดตปุ่ม Blacklist ให้ทำงานตามสถานะปัจจุบัน
        const btnBlack = document.getElementById('btnBlacklistAction');
        if (btnBlack) {
            btnBlack.textContent = u.is_blacklisted ? '✅ ปลด Blacklist' : '🚫 ขึ้น Blacklist';
            btnBlack.onclick = () => toggleBlacklist(id, u.is_blacklisted ? 0 : 1);
        }
        
        document.getElementById('customerModal').classList.add('open');
    }
}

// ── 4. ระบบ Blacklist ──────────────────────────────────────
async function toggleBlacklist(id, status) {
    const actionText = status === 1 ? 'ระงับการใช้งาน (Blacklist)?' : 'คืนสถานะการใช้งาน?';
    const confirm = await Swal.fire({ 
        title: 'ยืนยันการดำเนินการ?', 
        text: actionText, 
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: status === 1 ? '#d33' : '#114E72'
    });
    
    if (confirm.isConfirmed) {
        const response = await fetch(`/api/customers/${id}/blacklist`, {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ is_blacklisted: status })
        });
        const result = await response.json();
        if (result.success) {
            Swal.fire('สำเร็จ', 'อัปเดตสถานะลูกค้าเรียบร้อยแล้ว', 'success');
            const modal = document.getElementById('customerModal');
            if (modal) modal.classList.remove('open');
            loadCustomers();
        }
    }
}

function renderBlacklistTable(blList) {
    const tbody = document.getElementById('blacklistBody');
    if (!tbody) return;
    
    if (blList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:#999;">ไม่มีรายชื่อ Blacklist</td></tr>';
        return;
    }

    tbody.innerHTML = blList.map(u => `
        <tr>
            <td style="padding:15px;">
                <strong>${u.username}</strong><br>
                <small style="color:#666;">📞 ${u.phone || '-'}</small>
            </td>
            <td style="padding:15px;"><span style="color:#d33; font-weight:bold;">🚫 ถูกระงับการใช้งาน</span></td>
            <td style="padding:15px; text-align:center;">
                <button onclick="toggleBlacklist(${u.id}, 0)" 
                        style="background:#dcfce7; color:#15803d; border:1px solid #15803d; padding:6px 12px; border-radius:5px; cursor:pointer; font-weight:bold;">
                    ✅ ปลดล็อค
                </button>
            </td>
        </tr>
    `).join('');
}

function updateStats(data) {
    const total = document.getElementById('statCusTotal');
    const vip = document.getElementById('statCusVip');
    const black = document.getElementById('statCusBlack');

    if (total) total.textContent = data.length;
    if (vip) vip.textContent = data.filter(u => u.role === 'VIP').length;
    if (black) black.textContent = data.filter(u => u.is_blacklisted === 1).length;
}