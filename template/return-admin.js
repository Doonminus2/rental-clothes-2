/**
 * 🔄 Return & QC Management (Admin) - Final Version
 */

let currentReturnId = null;

document.addEventListener('DOMContentLoaded', async function () {
    // โหลดข้อมูลเมื่อเปิดหน้า
    await loadReturnStats();
    await loadReturnList();
    initSearch();

    // ตั้งค่าปุ่มกรองสถานะ QC
    document.getElementById('filterQC')?.addEventListener('change', (e) => {
        loadReturnList({ status: e.target.value });
    });
});

// ── 📊 1. โหลดสถิติตัวเลขด้านบน (Stat Cards) ────────────────
async function loadReturnStats() {
    try {
        const response = await fetch('/api/bookings/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const result = await response.json();
        if (result.success) {
            const s = result.data;
            // ✨ ปรับการดึงค่าสถิติให้ตรงกับที่ Python ส่งมา
            document.getElementById('statRetTotal').textContent = (s.shipped || 0) + (s.received || 0) + (s.rejected || 0);
            document.getElementById('statRetPending').textContent = s.shipped || 0; 
            document.getElementById('statRetPass').textContent = s.received || 0;
            document.getElementById('statRetDefect').textContent = s.rejected || 0;
        }
    } catch (err) { console.error("Load Stats Error:", err); }
}

// ── 📋 2. โหลดรายการที่ต้องคืนลงตาราง ──────────────────────
async function loadReturnList(params = {}) {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params).toString();
    try {
        const response = await fetch(`/api/bookings?${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        console.log('DEBUG Return List API:', result.data); // Added for troubleshooting deposit
        const tbody = document.getElementById('returnTableBody');
        if (!tbody) return;

        const returnData = result.data.filter(b => ['shipped', 'received', 'rejected'].includes(b.status));

        if (!result.success || returnData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px">ไม่มีรายการรอคืนสินค้า</td></tr>';
            return;
        }

        const statusQC = {
            shipped: '<span class="ReturnBadge ReturnBadge--pending"><span class="ReturnBadge-dot"></span>⏳ รอตรวจสอบ</span>',
            received: '<span class="ReturnBadge" style="background:#e8f5e9; color:#2e7d32; padding: 2px 8px; border-radius: 12px;">✅ ผ่านการตรวจ</span>',
            rejected: '<span class="ReturnBadge" style="background:#ffebee; color:#c62828; padding: 2px 8px; border-radius: 12px;">❌ พบตำหนิ</span>'
        };

        tbody.innerHTML = returnData.map(b => {
            const isLate = new Date() > new Date(b.rental_end) && b.status === 'shipped';
            // ✨ เปลี่ยนจาก 500 เป็นดึงค่า b.deposit_amount จาก DB
            const deposit = b.deposit_amount || 0; 

            return `
            <tr>
                <td><span class="OrderId">#ORD-${String(b.id).padStart(4, '0')}</span></td>
                <td><span class="CustName">${b.full_name}</span></td>
                <td><div class="ProdName">${b.product_name}</div></td>
                <td>
                    <div class="DateBadge" style="${isLate ? 'color:red; font-weight:bold;' : ''}">
                        ${isLate ? '⚠️ ' : ''}${formatDate(b.rental_end)}
                    </div>
                </td>
                <td>${statusQC[b.status] || b.status}</td>
                <td><strong>${Number(deposit).toLocaleString()} ฿</strong></td>
                <td>
                    <div class="ActionGroup">
                        <button class="BtnAction" onclick="openReturnModal(${b.id})" style="border:none; background:none; cursor:pointer;">🔍</button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    } catch (err) { console.error("Load List Error:", err); }
}

// ── 👁️ 3. เปิด Modal ตรวจสภาพ (QC) ──────────────────────
window.openReturnModal = async function(id) {
    const response = await fetch(`/api/bookings/${id}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const result = await response.json();
    console.log('DEBUG Booking Detail:', result.data); // Added for deposit check
    if (result.success) {
        const b = result.data;
        
        // ✨ ดึงยอดมัดจำจริงจาก DB มาใช้คำนวณ
        const deposit = Number(b.deposit_amount || 0);

        const today = new Date();
        const deadline = new Date(b.rental_end);
        const lateDays = Math.max(0, Math.floor((today - deadline) / (1000 * 60 * 60 * 24)));
        const lateFine = b.status === 'shipped' ? lateDays * 100 : 0;

        document.getElementById('modalTitle').textContent = `ตรวจรับคืนสินค้า – #ORD-${String(b.id).padStart(4, '0')}`;
        document.getElementById('modalReturnContent').innerHTML = `
            <div style="display:flex; gap:15px; background:#f4f7f9; padding:15px; border-radius:10px; margin-bottom:20px;">
                <img src="${b.image_url}" style="width:70px; height:90px; object-fit:cover; border-radius:5px;">
                <div style="flex:1;">
                    <strong style="color:#114E72">${b.product_name}</strong><br>
                    <small>ลูกค้า: ${b.full_name}</small><br>
                    <div style="margin-top:8px; font-weight:bold; color:#2ecc71; font-size:16px;">
                        ยอดคืนมัดจำสุทธิ: <span id="finalRefund">${(deposit - lateFine).toLocaleString()}</span> ฿
                    </div>
                    <div style="font-size:11px; color:#666; margin-top:4px;">
                        (มัดจำตั้งต้น: ${deposit.toLocaleString()} ฿ | หักส่งเลท: ${lateFine} ฿)
                    </div>
                </div>
            </div>
            <div class="QC-Form">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <label style="padding:8px; background:#eee; border-radius:5px; font-size:13px;"><input type="checkbox" checked disabled> สภาพผ้าปกติ</label>
                    <label style="padding:8px; background:#eee; border-radius:5px; font-size:13px;"><input type="checkbox" checked disabled> ซิป/กระดุมครบ</label>
                </div>
                <label style="font-weight:bold; font-size:13px; margin-top:10px; display:block;">ค่าปรับความเสียหายเพิ่มเติม (ถ้ามี)</label>
                <input type="number" id="defectFine" class="FormControl" value="0" style="width:100%; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:5px;" oninput="updateRefund(${deposit - lateFine})">
                <label style="font-weight:bold; font-size:13px; display:block;">หมายเหตุการรับคืน</label>
                <textarea id="returnNote" class="FormControl" style="width:100%; height:70px; padding:10px; border:1px solid #ddd; border-radius:5px;" placeholder="ระบุสภาพสินค้าเพิ่มเติม..."></textarea>
            </div>
        `;
        document.getElementById('btnConfirmAction').onclick = () => processReturn(id);
        document.getElementById('returnModal').classList.add('open');
    }
}

window.updateRefund = function(base) {
    const fineInput = document.getElementById('defectFine').value;
    const fine = parseInt(fineInput) || 0;
    const finalAmount = Math.max(0, base - fine);
    document.getElementById('finalRefund').textContent = finalAmount.toLocaleString();
}

async function processReturn(id) {
    const fine = parseInt(document.getElementById('defectFine').value) || 0;
    const note = document.getElementById('returnNote').value;
    const finalStatus = (fine > 0) ? 'rejected' : 'received';

    const result = await Swal.fire({
        title: 'ยืนยันการรับคืนสินค้า?',
        text: fine > 0 ? `พบตำหนิและหักค่าปรับเพิ่ม ${fine} ฿` : "สภาพปกติและทำการคืนสต็อกสินค้า",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#114E72',
        confirmButtonText: 'ยืนยันการรับคืน',
        cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        try {
            const response = await fetch(`/api/bookings/${id}/status`, {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ 
                    status: finalStatus, 
                    tracking_number: `Fine: ${fine} | Note: ${note}` 
                })
            });
            const res = await response.json();
            if (res.success) {
                await Swal.fire('สำเร็จ!', 'รับคืนเรียบร้อยและอัปเดตสต็อกแล้ว', 'success');
                document.getElementById('returnModal').classList.remove('open');
                await loadReturnStats();
                await loadReturnList();
            } else {
                Swal.fire('ผิดพลาด', res.message, 'error');
            }
        } catch (err) {
            Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    }
}

function initSearch() {
    document.getElementById('searchInput')?.addEventListener('input', (e) => loadReturnList({ search: e.target.value }));
}

function formatDate(d) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}