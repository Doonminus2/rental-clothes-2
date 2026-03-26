/**
 * 📅 Booking & Calendar Management (Admin) - Fixed Version
 */

let curYear = new Date().getFullYear();
let curMonth = new Date().getMonth(); // 0-11

document.addEventListener('DOMContentLoaded', async function () {
    // โหลดข้อมูลทั้งหมดเมื่อเปิดหน้า
    await loadStats();
    await loadBookings();
    await renderCalendar(); 
    initSearch();
    
    // ตั้งค่าปุ่มเลื่อนปฏิทิน
    document.getElementById('calPrev')?.addEventListener('click', () => {
        curMonth--; 
        if (curMonth < 0) { curMonth = 11; curYear--; } 
        renderCalendar();
    });
    document.getElementById('calNext')?.addEventListener('click', () => {
        curMonth++; 
        if (curMonth > 11) { curMonth = 0; curYear++; } 
        renderCalendar();
    });
    document.getElementById('calTodayBtn')?.addEventListener('click', () => {
        const t = new Date(); 
        curYear = t.getFullYear(); 
        curMonth = t.getMonth(); 
        renderCalendar();
    });
});

// ── 📊 1. โหลดตัวเลขสถิติ (Stat Cards) ──────────────────────────
async function loadStats() {
    try {
        const response = await fetch('/api/bookings/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (result.success) {
            const s = result.data;
            document.getElementById('statTotal').textContent = s.total || 0;
            document.getElementById('statPending').textContent = s.pending || 0;
            document.getElementById('statPacking').textContent = s.packing || 0;
            document.getElementById('statShipped').textContent = s.shipped || 0;
            document.getElementById('statReceived').textContent = s.received || 0;
        }
    } catch (err) { console.error("Load Stats Error:", err); }
}

// ── 📋 2. โหลดรายการออเดอร์ในตาราง (Order List) ──────────────────
async function loadBookings(params = {}) {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    
    try {
        const response = await fetch(`/api/bookings?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        const tbody = document.getElementById('orderTableBody');
        if (!tbody) return;

        if (!result.success || !result.data || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">ไม่พบรายการออเดอร์</td></tr>';
            return;
        }

        const statusTH = { 
            pending: 'รอตรวจสอบ', 
            packing: 'กำลังแพ็ก', 
            shipped: 'จัดส่งแล้ว', 
            received: 'รับแล้ว', 
            rejected: 'ยกเลิก' 
        };

        tbody.innerHTML = result.data.map(b => `
            <tr>
                <td><span class="OrderId">#ORD-${String(b.id).padStart(4,'0')}</span></td>
                <td><div class="CustCell"><span class="CustName">${b.full_name}</span></div></td>
                <td><div class="ProdName">${b.product_name}</div></td>
                <td>
                    <div class="DateRange">
                        <div><small>เริ่ม:</small> ${formatDate(b.rental_start)}</div>
                        <div><small>คืน:</small> ${formatDate(b.rental_end)}</div>
                    </div>
                </td>
                <td><span class="PayStatus">✅ ตรวจสอบแล้ว</span></td>
                <td><span class="ShipBadge ShipBadge--${b.status}">${statusTH[b.status] || b.status}</span></td>
                <td>${b.tracking_number || '—'}</td>
                <td>
                    <div class="ActionGroup">
                        <button class="BtnAction" onclick="openOrderModal(${b.id})">👁️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) { console.error("Load Bookings Error:", err); }
}

// ── 📆 3. วาดปฏิทิน (Dynamic Calendar) ──────────────────────────
async function renderCalendar() {
    const label = document.getElementById('calMonthLabel');
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    if(label) label.textContent = `${thaiMonths[curMonth]} ${curYear + 543}`;

    const body = document.getElementById('calBody');
    if(!body) return;
    body.innerHTML = '';

    try {
        // ✨ ส่ง curMonth + 1 เพื่อให้ตรงกับเลขเดือน 1-12 ใน Python
        const response = await fetch(`/api/bookings/calendar?month=${curMonth + 1}&year=${curYear}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        const result = await response.json();
        const bookings = result.success ? result.data : [];

        const firstDay = new Date(curYear, curMonth, 1).getDay();
        const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();

        // ช่องว่างของเดือนก่อนหน้า
        for (let i = 0; i < firstDay; i++) {
            const cell = document.createElement('div');
            cell.className = 'CalCell other-month';
            body.appendChild(cell);
        }

        // วาดวันในเดือน
        for (let d = 1; d <= daysInMonth; d++) {
            const cell = document.createElement('div');
            cell.className = 'CalCell';
            cell.innerHTML = `<div class="CalCell-num">${d}</div>`;

            // รูปแบบวันที่เพื่อเปรียบเทียบ YYYY-MM-DD
            const todayStr = `${curYear}-${String(curMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            
            // กรองหา Event ที่ตรงกับวันนี้
            const todaysEvents = bookings.filter(b => {
                const start = b.rental_start.split(' ')[0];
                const end = b.rental_end.split(' ')[0];
                return todayStr >= start && todayStr <= end;
            });

            todaysEvents.forEach(ev => {
                const pill = document.createElement('div');
                pill.className = `CalEvent CalEvent--c1`; 
                // โชว์ชื่อสินค้าเฉพาะวันแรกที่เริ่มเช่าเพื่อให้ดูสะอาด
                pill.textContent = todayStr === ev.rental_start.split(' ')[0] ? ev.product_name : '• เช่าต่อเนื่อง';
                pill.onclick = () => openOrderModal(ev.id);
                cell.appendChild(pill);
            });

            body.appendChild(cell);
        }
    } catch (err) {
        console.error("Render Calendar Error:", err);
    }
}

// ── 👁️ 4. เปิด Modal รายละเอียดออเดอร์ ──────────────────────────
window.openOrderModal = async function(id) {
    const response = await fetch(`/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    if (result.success) {
        const b = result.data;
        document.getElementById('modalOrderId').textContent = `รายละเอียดออเดอร์ #ORD-${String(b.id).padStart(4,'0')}`;
        
        document.getElementById('modalBodyContent').innerHTML = `
            <div style="display:flex; gap:15px; background:#f4f7f9; padding:15px; border-radius:10px; margin-bottom:20px;">
                <img src="${b.image_url}" style="width:80px; height:100px; object-fit:cover; border-radius:5px;">
                <div style="flex:1;">
                    <strong style="font-size:16px; color:#114E72">${b.product_name}</strong><br>
                    <small>ลูกค้า: ${b.full_name}</small><br>
                    <div style="margin-top:8px; font-weight:bold; color:#e67e22; font-size:13px;">
                        เช่า: ${formatDate(b.rental_start)} - ${formatDate(b.rental_end)}
                    </div>
                </div>
            </div>
            <div class="ShipForm">
                <label style="font-weight:bold; font-size:13px; display:block; margin-bottom:5px;">สถานะออเดอร์</label>
                <select id="shipStatusSelect" class="FormControl" style="width:100%; padding:10px; border-radius:5px; border:1px solid #ddd; margin-bottom:15px;">
                    <option value="pending" ${b.status==='pending'?'selected':''}>รอตรวจสอบ</option>
                    <option value="packing" ${b.status==='packing'?'selected':''}>กำลังแพ็ก</option>
                    <option value="shipped" ${b.status==='shipped'?'selected':''}>จัดส่งแล้ว</option>
                    <option value="received" ${b.status==='received'?'selected':''}>รับสินค้าแล้ว (สำเร็จ)</option>
                    <option value="rejected" ${b.status==='rejected'?'selected':''}>ยกเลิก</option>
                </select>
                <label style="font-weight:bold; font-size:13px; display:block; margin-bottom:5px;">เลขพัสดุ (Tracking)</label>
                <input type="text" id="trackingInput" class="FormControl" value="${b.tracking_number || ''}" placeholder="ระบุเลขพัสดุ..." style="width:100%; padding:10px; border-radius:5px; border:1px solid #ddd;">
                <button class="BtnPrimary" style="margin-top:20px; width:100%; padding:12px; background:#114E72; color:white; border:none; border-radius:5px; font-weight:bold; cursor:pointer;" onclick="saveShipping(${b.id})">💾 บันทึกการเปลี่ยนแปลง</button>
            </div>
        `;
        document.getElementById('orderModal').classList.add('open');
    }
}

// ── 💾 5. บันทึกข้อมูลการจัดส่ง ────────────────────────────────
window.saveShipping = async function(id) {
    const status = document.getElementById('shipStatusSelect').value;
    const tracking = document.getElementById('trackingInput').value;

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
        const response = await fetch(`/api/bookings/${id}/status`, {
            method: 'PATCH',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: status, tracking_number: tracking })
        });

        const result = await response.json();
        if (result.success) {
            Swal.fire('สำเร็จ', 'อัปเดตข้อมูลออเดอร์เรียบร้อย', 'success');
            document.getElementById('orderModal').classList.remove('open');
            await loadStats();
            await loadBookings();
            await renderCalendar();
        } else {
            Swal.fire('ผิดพลาด', result.message, 'error');
        }
    } catch (err) {
        Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    }
}

// ── 🔍 6. ระบบค้นหาและตัวกรอง ──────────────────────────────────
function initSearch() {
    document.getElementById('searchInput')?.addEventListener('input', (e) => {
        loadBookings({ search: e.target.value });
    });
    document.getElementById('filterStatus')?.addEventListener('change', (e) => {
        loadBookings({ status: e.target.value });
    });
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day:'numeric', month:'short', year:'2-digit' });
}