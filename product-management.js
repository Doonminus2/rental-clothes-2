document.addEventListener('DOMContentLoaded', async function () {
  requireAdmin();
  await loadProducts();
  initSearch();
  initModal();
});

let editingId = null;

// ── Load product table ────────────────────────────────────
async function loadProducts(params = {}) {
  const query = new URLSearchParams({ page: 1, limit: 20, ...params }).toString();
  const data  = await api.get(`/products?${query}`);
  if (!data) return;

  const tbody = document.getElementById('productTableBody');
  if (!tbody) return;

  const statusTH   = { available:'พร้อมเช่า', booked:'ถูกจองอยู่', washing:'ส่งซัก', damaged:'ชำรุด' };
  const categoryTH = { thai:'ชุดไทย', evening:'ราตรี', suit:'สูท', cosplay:'Cosplay', academic:'ชุดครุย', shirt:'เสื้อ', sweater:'เสื้อกันหนาว' };

  tbody.innerHTML = data.data.map((p, i) => {
    const sizes  = p.sizes ? p.sizes.split(',').map(s => `<span class="SizePill">${s.trim()}</span>`).join('') : '—';
    const img = p.images?.[0] ? `http://localhost:3000/uploads/${p.images[0]}` : 'images/placeholder.jpg';
    const status = p.stock > 0 ? 'available' : 'booked';
    return `
      <tr data-category="${p.category}" data-status="${status}" data-name="${p.name}">
        <td>${String(i + 1).padStart(3, '0')}</td>
        <td>
          <div class="Prod-cell">
            <img class="Prod-thumb" src="${img}" onerror="this.src='images/placeholder.jpg'" alt="${p.name}" />
            <div>
              <div class="Prod-name">${p.name}</div>
              <div class="Prod-brand">${p.brand || '—'}</div>
            </div>
          </div>
        </td>
        <td>${categoryTH[p.category] || p.category}</td>
        <td>${p.brand || '—'}</td>
        <td><div class="SizePills">${sizes}</div></td>
        <td>
          <span class="StatusBadge StatusBadge--${status}">
            <span class="StatusBadge-dot"></span>${statusTH[status]}
          </span>
        </td>
        <td>
          <div class="PriceGroup">
            <div class="PriceRow"><span class="PriceTag">วัน</span><span class="PriceVal">${Number(p.price_per_day).toLocaleString()} ฿</span></div>
            <div class="PriceDeposit">มัดจำ <span>${Number(p.deposit).toLocaleString()} ฿</span></div>
          </div>
        </td>
        <td>
          <div class="ActionGroup">
            <button class="BtnAction BtnAction--edit" onclick="openEditProduct(${p.id})">✏️</button>
            <button class="BtnAction BtnAction--delete" onclick="deleteProduct(${p.id})">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  const countEl = document.getElementById('countLabel');
  if (countEl) countEl.textContent = `แสดง ${data.data.length} รายการ`;
}

// ── Modal: save product ───────────────────────────────────
function initModal() {
  const saveBtn = document.getElementById('btnSaveModal');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', async function () {
    const form   = new FormData();
    const name   = document.getElementById('inputName')?.value?.trim();
    if (!name) { showToast('warning', 'กรุณากรอกชื่อชุด'); return; }

    form.append('name',        name);
    form.append('description', document.getElementById('inputNotes')?.value || '');
    form.append('category',    document.getElementById('inputCategory')?.value || '');
    form.append('price_per_day', document.getElementById('price3d')?.value || 0);
    form.append('deposit',     document.getElementById('priceDeposit')?.value || 0);
    form.append('sizes',       [...document.querySelectorAll('.SizeCheck:checked')].map(c => c.value).join(','));

    const files = document.getElementById('fileInput')?.files;
    if (files) [...files].forEach(f => form.append('images', f));

    const result = editingId
      ? await api.upload(`/products/${editingId}`, form)
      : await api.upload('/products', form);

    if (result) {
      showToast('success', editingId ? 'อัปเดตสินค้าสำเร็จ' : 'เพิ่มสินค้าสำเร็จ ✅');
      document.getElementById('productModal')?.classList.remove('open');
      editingId = null;
      await loadProducts();
    }
  });
}

// ── Edit product ──────────────────────────────────────────
async function openEditProduct(id) {
  editingId = id;
  const data = await api.get(`/products/${id}`);
  if (!data) return;
  const p = data.data;

  document.getElementById('inputName').value     = p.name;
  document.getElementById('inputNotes').value    = p.description || '';
  document.getElementById('inputCategory').value = p.category;
  document.getElementById('price3d').value       = p.price_per_day;
  document.getElementById('priceDeposit').value  = p.deposit;

  const modal = document.getElementById('productModal');
  if (modal) {
    document.getElementById('modalTitle').textContent = 'แก้ไขสินค้า';
    modal.classList.add('open');
  }
}
window.openEdit = openEditProduct;

// ── Delete product ────────────────────────────────────────
async function deleteProduct(id) {
  if (!confirm('ต้องการลบสินค้านี้ออกจากระบบ?')) return;
  const result = await api.delete(`/products/${id}`);
  if (result) {
    showToast('success', 'ลบสินค้าสำเร็จ');
    await loadProducts();
  }
}
window.deleteRow = (btn) => { const id = btn.closest('tr')?.dataset?.id; if (id) deleteProduct(id); };

// ── Search / filter ───────────────────────────────────────
function initSearch() {
  const inputs = ['searchInput', 'filterCategory', 'filterStatus'];
  inputs.forEach(id => {
    document.getElementById(id)?.addEventListener('input',  doFilter);
    document.getElementById(id)?.addEventListener('change', doFilter);
  });
}

async function doFilter() {
  const q   = document.getElementById('searchInput')?.value;
  const cat = document.getElementById('filterCategory')?.value;
  const params = {};
  if (q)   params.search   = q;
  if (cat) params.category = cat;
  await loadProducts(params);
}