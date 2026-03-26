/**
 * 👗 Rental Products Management (User Side)
 * Features: Fetch API, Search, Category Filter, and Sorting
 */

let allProducts = []; // ตัวแปรหลักเก็บข้อมูลสินค้าทั้งหมดที่ดึงมาได้

document.addEventListener('DOMContentLoaded', () => {
    // 1. โหลดสินค้าครั้งแรก
    loadProducts();

    // 2. ตัวดักจับการพิมพ์ในช่อง Search
    const searchInput = document.querySelector('.Toolbar-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAndRender(e.target.value);
        });
    }

    // 3. ตัวดักจับการติ๊ก Checkbox ใน Sidebar
    const checkboxes = document.querySelectorAll('.Filter-item input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', () => filterAndRender());
    });

    // 4. ตัวดักจับระบบ Sort (เรียงลำดับ)
    const sortDropdown = document.getElementById('sortDropdown');
    const sortLabel = document.getElementById('sortLabel');
    if (sortDropdown) {
        sortDropdown.querySelectorAll('.Sort-option').forEach(opt => {
            opt.addEventListener('click', function() {
                sortLabel.textContent = this.textContent;
                const sortType = this.dataset.sort;
                filterAndRender(null, sortType); // ส่งประเภทการ Sort ไปประมวลผล
            });
        });
    }
});

// ─── 🔄 ดึงข้อมูลจาก API ───
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    if (!grid) return;
    
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">กำลังโหลดชุดสวยๆ ให้คุณ...</p>';

    try {
        const response = await fetch('/api/products');
        const result = await response.json();

        if (result.success) {
            // เก็บเฉพาะตัวที่ 'available' (พร้อมเช่า) เท่านั้น
            allProducts = result.data.filter(p => p.status === 'available');
            renderGrid(allProducts);
        }
    } catch (err) {
        console.error("Load Products Error:", err);
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: red;">ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้</p>';
    }
}

// ─── 🔍 ระบบกรองข้อมูล (Filter) และเรียงลำดับ (Sort) ───
function filterAndRender(searchTerm = null, sortType = null) {
    // 1. ดึงค่าค้นหาปัจจุบัน (ถ้าไม่ได้ส่งมาให้ดึงจากช่อง Input)
    const searchVal = (searchTerm !== null) ? searchTerm : document.querySelector('.Toolbar-input')?.value || '';
    
    // 2. ดึงค่าหมวดหมู่ที่ติ๊กเลือก
    const selectedCats = getSelectedCategories();

    // 3. เริ่มการกรอง (Filter)
    let filtered = allProducts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchVal.toLowerCase()) || 
                              p.category.toLowerCase().includes(searchVal.toLowerCase());
        
        const matchesCategory = selectedCats.length === 0 || 
                                selectedCats.includes(p.category.toLowerCase());
        
        return matchesSearch && matchesCategory;
    });

    // 4. การเรียงลำดับ (Sort)
    if (sortType) {
        filtered.sort((a, b) => {
            const priceA = Number(a.price_per_day || a.price || 0);
            const priceB = Number(b.price_per_day || b.price || 0);

            if (sortType === 'az') return a.name.localeCompare(b.name);
            if (sortType === 'za') return b.name.localeCompare(a.name);
            if (sortType === 'price-asc') return priceA - priceB;
            if (sortType === 'price-desc') return priceB - priceA;
            return 0;
        });
    }

    renderGrid(filtered);
}

// ─── 🖼️ วาด Card ลงหน้าจอ ───
function renderGrid(products) {
    const grid = document.getElementById('productGrid');
    if (!grid) return;

    if (products.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 50px;">ขออภัย ไม่พบชุดที่คุณกำลังค้นหา</p>';
        return;
    }

    grid.innerHTML = products.map(p => {
        const rawPrice = p.price_per_day || p.price;
        const safePrice = (rawPrice && !isNaN(rawPrice)) 
            ? Number(rawPrice).toLocaleString('th-TH') 
            : '0';

        return `
            <div class="ProductCard" 
                 style="cursor: pointer;"
                 onclick="goToProductDetail(${p.id})">
                <div class="ProductCard-img">
                    <img src="${p.image_url}" alt="${p.name}" onerror="this.src='images/default.png'">
                </div>
                <div class="ProductCard-info">
                    <div class="Category-Tag">${p.category}</div>
                    <h4 class="ProductCard-title">${p.name}</h4>
                    <div class="ProductCard-footer">
                        <span class="ProductCard-price">฿${safePrice} <small>/ วัน</small></span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ดึงรายการหมวดหมู่ที่ User ติ๊กเลือก
function getSelectedCategories() {
    const checked = [];
    const mapping = {
        'type-shirt': 'shirt',
        'type-wedding': 'wedding dress',
        'type-cosplay': 'cosplay costume',
        'type-sweater': 'sweater',
        'type-academic': 'academic gown',
        'type-thai': 'thai costume'
    };

    for (const [id, value] of Object.entries(mapping)) {
        if (document.getElementById(id)?.checked) {
            checked.push(value.toLowerCase());
        }
    }
    return checked;
}

// คลิกแล้วไปหน้ารายละเอียด
function goToProductDetail(productId) {
    window.location.href = `product.html?id=${productId}`;
}