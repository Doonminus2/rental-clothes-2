document.addEventListener('DOMContentLoaded', async function () {
  await loadProducts();
  initFilters();
});

let allProducts = [];
let currentPage = 1;
const perPage   = 8;

// ── Load products ─────────────────────────────────────────
async function loadProducts(params = {}) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888">กำลังโหลดสินค้า...</div>';

  const query = new URLSearchParams({
    page:  currentPage,
    limit: perPage,
    ...params,
  }).toString();

  const data = await api.get(`/products?${query}`);
  if (!data) return;

  allProducts = data.data;
  renderProducts(allProducts);
  renderPagination(data.total, data.page, data.limit);
}

// ── Render product cards ───────────────────────────────────
function renderProducts(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#888">ไม่พบสินค้าที่ตรงกับเงื่อนไข</div>';
    return;
  }

  grid.innerHTML = products.map(p => {
    const img = p.images?.[0]
      ? `http://localhost:3000/uploads/${p.images[0]}`
      : 'images/placeholder.jpg';
    const url = `product.html?id=${p.id}&name=${encodeURIComponent(p.name)}&price=${p.price_per_day}&img=${encodeURIComponent(img)}`;
    return `
      <a class="ProductCard" href="${url}"
         data-name="${p.name}" data-price="${p.price_per_day}">
        <img src="${img}" alt="${p.name}" onerror="this.src='images/placeholder.jpg'" />
        <p class="ProductCard-name">${p.name}</p>
        <p class="ProductCard-price">${Number(p.price_per_day).toLocaleString('th-TH')} ฿</p>
      </a>`;
  }).join('');
}

// ── Filters ───────────────────────────────────────────────
function initFilters() {
  // Search in toolbar
  const searchInput = document.querySelector('.Toolbar-input');
  if (searchInput) {
    let timer;
    searchInput.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(() => { currentPage = 1; loadProducts({ search: this.value }); }, 400);
    });
  }

  // Checkboxes (type / brand)
  document.querySelectorAll('.Filter-item input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', applyCheckboxFilters);
  });
}

function applyCheckboxFilters() {
  const types  = [...document.querySelectorAll('.Filter-list input:checked')].map(c => c.id.replace('type-', ''));
  const brands = [...document.querySelectorAll('[id^="brand-"]:checked')].map(c => c.id.replace('brand-', ''));
  const params = {};
  if (types.length)  params.category = types[0];
  if (brands.length) params.brand    = brands[0];
  currentPage = 1;
  loadProducts(params);
}

// ── Pagination ────────────────────────────────────────────
function renderPagination(total, page, limit) {
  const pag = document.querySelector('.Pagination');
  if (!pag) return;
  const totalPages = Math.ceil(total / limit);
  pag.querySelector('.PagInfo').textContent = `หน้า ${page} / ${totalPages}`;
}