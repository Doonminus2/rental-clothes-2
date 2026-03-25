document.addEventListener('DOMContentLoaded', async function () {
  requireAdmin();
  await loadDashboard();
});

async function loadDashboard() {
  const data = await api.get('/dashboard');
  if (!data) return;
  const d = data.data;

  // ── Stat cards ──
  const statVals = document.querySelectorAll('.StatCard-value');
  if (statVals[0]) statVals[0].textContent = d.total_products.toLocaleString();
  if (statVals[1]) statVals[1].textContent = d.monthly_orders.toLocaleString();
  if (statVals[2]) statVals[2].textContent = d.pending_orders.toLocaleString();
  if (statVals[3]) statVals[3].textContent = d.total_customers.toLocaleString();

  // ── Recent bookings table ──
  const tbody = document.querySelector('.DataTable tbody');
  if (tbody && d.recent_bookings?.length) {
    const statusMap = { waiting:'Pending', packing:'Packing', shipped:'Active', received:'Returned', cancelled:'Overdue' };
    const badgeMap  = { waiting:'pending', packing:'pending', shipped:'active', received:'returned', cancelled:'overdue' };
    tbody.innerHTML = d.recent_bookings.map(b => `
      <tr>
        <td>#BK-${String(b.id).padStart(4,'0')}</td>
        <td>${b.full_name}</td>
        <td>${b.product_name}</td>
        <td>${formatDate(b.rental_start)}</td>
        <td>${formatDate(b.rental_end)}</td>
        <td><span class="Badge Badge--${badgeMap[b.status]}">${statusMap[b.status]}</span></td>
      </tr>`).join('');
  }

  // ── Popular products ──
  const prodList = document.querySelector('.ProductList');
  if (prodList && d.popular_products?.length) {
    prodList.innerHTML = d.popular_products.map(p => `
      <div class="ProductItem">
        <div class="ProductItem-info">
          <div class="ProductItem-name">${p.name}</div>
          <div class="ProductItem-meta">Rented ${p.rental_count} times</div>
        </div>
        <div class="ProductItem-price">${Number(p.price_per_day).toLocaleString()} ฿</div>
      </div>`).join('');
  }
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
}