/**
 * 📅 Booking & Calendar Management (Admin)
 */

let curYear = new Date().getFullYear();
let curMonth = new Date().getMonth();

document.addEventListener('DOMContentLoaded', async function () {
    // โหลดข้อมูลทั้งหมดเมื่อเปิดหน้า
    await loadStats();
    await loadBookings();
    await renderCalendar(); 
    initSearch();
    
    // ตั้งค่าปุ่มเลื่อนปฏิทิน
    document.getElementById('calPrev')?.addEventListener('click', () => {
        curMonth--; if (curMonth < 0) { curMonth = 11; curYear--; } renderCalendar();
    });
    document.getElementById('calNext')?.addEventListener('click', () => {
        curMonth++; if (curMonth > 11) { curMonth = 0; curYear++; } renderCalendar();
    });
    document.getElementById('calTodayBtn')?.addEventListener('click', () => {
        const t = new Date(); curYear = t.getFullYear(); curMonth = t.getMonth(); renderCalendar();
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
            document.getElementById('statTotal').textContent = result.data.total || 0;
            document.getElementById('statWaiting').textContent = result.data.waiting || 0;
            document.getElementById('statShipped').textContent = result.data.shipped || 0;
            document.getElementById('statReceived').textContent = result.data.received || 0;
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

        if (!result.success || result.data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">ไม่พบรายการออเดอร์</td></tr>';
            return;
        }

        const statusTH = { waiting:'รอแพ็ก', packing:'กำลังแพ็ก', shipped:'จัดส่งแล้ว', received:'รับแล้ว', cancelled:'ยกเลิก' };

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
                        <button class="BtnAction" onclick="cancelOrder(${b.id})" style="color:red">✕</button>
                    </div>
                </td>
            </tr>
        `).join('');
        document.getElementById('orderCount').textContent = `แสดง ${result.data.length} รายการ`;
    } catch (err) { console.error("Load Bookings Error:", err); }
}

// ── 📆 3. วาดปฏิทิน (Dynamic Calendar) ──────────────────────────
async function renderCalendar() {
    const label = document.getElementById('calMonthLabel');
    const thaiMonths = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    label.textContent = `${thaiMonths[curMonth]} ${curYear + 543}`;

    const body = document.getElementById('calBody');
    body.innerHTML = '';

    // ดึงข้อมูลจองจาก API
    const response = await fetch(`/api/bookings/calendar?month=${curMonth + 1}&year=${curYear}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    const bookings = result.success ? result.data : [];

    const firstDay = new Date(curYear, curMonth, 1).getDay();
    const daysInMonth = new Date(curYear, curMonth + 1, 0).getDate();

    // Padding เดือนก่อนหน้า
    for (let i = 0; i < firstDay; i++) {
        const cell = document.createElement('div');
        cell.className = 'CalCell other-month';
        body.appendChild(cell);
    }

    // สร้างวันในเดือน
    for (let d = 1; d <= daysInMonth; d++) {
        const cell = document.createElement('div');
        cell.className = 'CalCell';
        cell.innerHTML = `<div class="CalCell-num">${d}</div>`;

        // ตรวจสอบว่ามีออเดอร์ไหนจองในวันนี้บ้าง
        const todayStr = `${curYear}-${String(curMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const todaysEvents = bookings.filter(b => todayStr >= b.rental_start && todayStr <= b.rental_end);

        todaysEvents.forEach(ev => {
            const pill = document.createElement('div');
            pill.className = `CalEvent CalEvent--c1`; // สามารถปรับสีตาม Category ได้
            pill.textContent = todayStr === ev.rental_start ? ev.product_name : '';
            pill.onclick = () => openOrderModal(ev.id);
            cell.appendChild(pill);
        });

        body.appendChild(cell);
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
        
        // ใส่ข้อมูลลงใน Modal Body
        document.getElementById('modalBodyContent').innerHTML = `
            <div class="ModalProduct">
                <img src="${b.image_url}" class="ModalProduct-img">
                <div class="ModalProduct-info">
                    <strong>${b.product_name}</strong><br>
                    ลูกค้า: ${b.full_name}<br>
                    เริ่มเช่า: ${formatDate(b.rental_start)} | คืน: ${formatDate(b.rental_end)}
                </div>
            </div>
            <hr>
            <div class="ShipForm">
                <label>สถานะการจัดส่ง</label>
                <select id="shipStatusSelect" class="FormControl">
                    <option value="waiting" ${b.status==='waiting'?'selected':''}>รอแพ็ก</option>
                    <option value="packing" ${b.status==='packing'?'selected':''}>กำลังแพ็ก</option>
                    <option value="shipped" ${b.status==='shipped'?'selected':''}>จัดส่งแล้ว</option>
                    <option value="received" ${b.status==='received'?'selected':''}>รับแล้ว</option>
                </select>
                <label style="margin-top:10px">เลข Tracking</label>
                <input type="text" id="trackingInput" class="FormControl" value="${b.tracking_number || ''}" placeholder="ระบุเลขพัสดุ">
                <button class="BtnPrimary" style="margin-top:15px; width:100%" onclick="saveShipping(${b.id})">💾 บันทึกการจัดส่ง</button>
            </div>
        `;
        document.getElementById('orderModal').classList.add('open');
    }
}

// ── 💾 5. บันทึกข้อมูลการจัดส่ง ────────────────────────────────
window.saveShipping = async function(id) {
    const status = document.getElementById('shipStatusSelect').value;
    const tracking = document.getElementById('trackingInput').value;

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
        Swal.fire('สำเร็จ', 'อัปเดตข้อมูลเรียบร้อย', 'success');
        document.getElementById('orderModal').classList.remove('open');
        loadStats();
        loadBookings();
        renderCalendar();
    }
}

// ── 🔍 6. ระบบค้นหา ──────────────────────────────────────────
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