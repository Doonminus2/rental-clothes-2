document.addEventListener('DOMContentLoaded', async function () {
  requireLogin();
  await loadUserInfo();
  loadProductFromURL();
});

// ── Load logged-in user into display fields ───────────────
async function loadUserInfo() {
  const data = await api.get('/auth/me');
  if (!data) return;
  const u = data.user;
  setText('displayUserName',    u.full_name);
  setText('displayUserPhone',   u.phone  || '-');
  setText('displayUserAddress', u.address || 'กรุณาอัปเดตที่อยู่ในโปรไฟล์');
}

// ── Load product info from URL params ────────────────────
function loadProductFromURL() {
  const params = new URLSearchParams(window.location.search);
  const name     = params.get('name')     || '-';
  const price    = parseInt(params.get('price') || '0');
  const img      = params.get('img')      || '';
  const size     = params.get('size')     || '-';
  const duration = params.get('duration') || '-';
  const qty      = parseInt(params.get('qty') || '1');

  const shipping = 100;
  const subtotal = price * qty;
  const total    = subtotal > 0 ? subtotal + shipping : 0;

  setText('summaryName',     decodeURIComponent(name));
  setText('summaryMeta',     `ขนาด: ${size} | เช่า: ${duration} | จำนวน: ${qty} ชุด`);
  setText('summaryPrice',    price.toLocaleString() + ' ฿ / ชุด');
  setText('summarySubtotal', subtotal.toLocaleString() + ' ฿');
  setText('summaryTotal',    total.toLocaleString() + ' ฿');
  if (img) {
    const imgEl = document.getElementById('summaryImg');
    if (imgEl) imgEl.src = decodeURIComponent(img);
  }

  // Override confirm button
  const btn = document.querySelector('.Btn-confirm');
  if (btn) {
    btn.onclick = null;
    btn.addEventListener('click', () => submitBooking({ name, price, size, duration, qty, total, shipping }));
  }
}

// ── Submit booking to API ─────────────────────────────────
async function submitBooking({ name, price, size, duration, qty }) {
  const startInput = document.querySelector('input[type="date"]:first-of-type');
  const endInput   = document.querySelector('input[type="date"]:last-of-type');
  const payMethod  = document.querySelector('input[name="payment"]:checked');

  if (!startInput?.value || !endInput?.value) {
    showToast('warning', 'กรุณาเลือกวันรับ-คืนชุด');
    return;
  }
  if (!payMethod) {
    showToast('warning', 'กรุณาเลือกวิธีชำระเงิน');
    return;
  }

  const params  = new URLSearchParams(window.location.search);
  const product_id = params.get('id');

  if (!product_id) {
    showToast('error', 'ไม่พบรหัสสินค้า กรุณาเลือกสินค้าใหม่อีกครั้ง');
    return;
  }

  const user = Auth.getUser();
  const btn = document.querySelector('.Btn-confirm');
  btn.disabled = true;
  btn.textContent = 'กำลังส่งคำสั่งจอง...';

  const data = await api.post('/bookings', {
    product_id:       parseInt(product_id),
    rental_start:     startInput.value,
    rental_end:       endInput.value,
    size:             size,
    quantity:         qty,
    payment_method:   payMethod.value,
    shipping_address: user?.address || '',
  });

  btn.disabled = false;
  btn.textContent = 'ยืนยันและชำระเงิน';

  if (data) {
    showToast('success', `จองสำเร็จ! เลขออเดอร์ #${String(data.booking_id).padStart(4, '0')}`);
    setTimeout(() => { window.location.href = `payment.html?booking_id=${data.booking_id}&total=${data.total_price}`; }, 1200);
  }
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }