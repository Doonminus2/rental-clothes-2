document.addEventListener('DOMContentLoaded', async function () {
  requireAdmin();
  await loadCustomers();
  initSearch();
});

// ── Load & render customer cards ──────────────────────────
async function loadCustomers(params = {}) {
  const grid = document.getElementById('customerGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#888">กำลังโหลด...</div>';

  const query = new URLSearchParams({ page: 1, limit: 12, ...params }).toString();
  const data  = await api.get(`/customers?${query}`);
  if (!data) return;

  if (!data.data.length) {
    grid.innerHTML = '<div style="grid-column:1/-1;padding:40px;text-align:center;color:#888">ไม่พบลูกค้า</div>';
    return;
  }

  grid.innerHTML = data.data.map(c => {
    const tier     = c.tier;
    const tierMap  = { vip: { cls:'vip', label:'⭐ VIP' }, regular: { cls:'regular', label:'🎯 ประจำ' }, new: { cls:'new', label:'🆕 ใหม่' } };
    const t        = tierMap[tier] || tierMap.new;
    const initial  = (c.full_name || 'U').charAt(0).toUpperCase();
    return `
      <div class="CustomerCard CustomerCard--${t.cls}" data-tier="${tier}"
           data-name="${c.full_name}" onclick="openCustomerModal('${c.id}')">
        <div class="CustomerCard-top">
          <div class="CustomerCard-avatar ${tier === 'vip' ? 'CustomerCard-avatar--vip' : tier === 'new' ? 'CustomerCard-avatar--new' : ''}">${initial}</div>
          <div class="CustomerCard-info">
            <div class="CustomerCard-name">${c.full_name}</div>
            <div class="CustomerCard-phone">📞 ${c.phone || '-'}</div>
          </div>
          <span class="TierBadge TierBadge--${t.cls}">${t.label}</span>
        </div>
        <div class="CustomerCard-stats">
          <div class="CustomerCard-stat">
            <div class="CustomerCard-stat-val">${c.rental_count || 0}</div>
            <div class="CustomerCard-stat-label">ครั้งที่เช่า</div>
          </div>
          <div class="CustomerCard-stat">
            <div class="CustomerCard-stat-val">${formatMoney(c.total_spent || 0)}</div>
            <div class="CustomerCard-stat-label">ยอดรวม (฿)</div>
          </div>
          <div class="CustomerCard-stat">
            <div class="CustomerCard-stat-val" style="color:${(c.late_count||0)>0?'#c0392b':'#1D9E75'}">${c.late_count || 0}</div>
            <div class="CustomerCard-stat-label">ครั้งที่สาย</div>
          </div>
        </div>
        <div class="CustomerCard-actions">
          <button class="BtnCardAction BtnCardAction--primary"
                  onclick="event.stopPropagation();openCustomerModal('${c.id}')">📋 ดูประวัติ</button>
          <button class="BtnCardAction BtnCardAction--danger"
                  onclick="event.stopPropagation();toggleBlacklist('${c.id}', ${!c.is_blacklisted})">
            ${c.is_blacklisted ? '✅ ถอด Blacklist' : '🚫 Blacklist'}
          </button>
        </div>
      </div>`;
  }).join('');
}

// ── Open customer detail modal ────────────────────────────
async function openCustomerModal(id) {
  const data = await api.get(`/customers/${id}`);
  if (!data) return;
  const c = data.data;

  const titleEl = document.getElementById('modalTitle');
  if (titleEl) titleEl.textContent = `ข้อมูลลูกค้า – ${c.full_name}`;

  const modal = document.getElementById('customerModal');
  if (modal) modal.classList.add('open');
}
window.openCustomerModal = openCustomerModal;

// ── Blacklist toggle ──────────────────────────────────────
async function toggleBlacklist(id, blacklisted) {
  const reason = blacklisted ? prompt('ระบุเหตุผลการขึ้น Blacklist:') : null;
  if (blacklisted && !reason) return;
  const result = await api.patch(`/customers/${id}/blacklist`, { blacklisted, reason });
  if (result) {
    showToast('success', blacklisted ? '⚠️ ขึ้น Blacklist แล้ว' : '✅ ถอด Blacklist แล้ว');
    await loadCustomers();
  }
}
window.toggleBlacklist = toggleBlacklist;

// ── Search / filter ───────────────────────────────────────
function initSearch() {
  const searchEl = document.getElementById('searchAll');
  const tierEl   = document.getElementById('filterTier');

  async function doFilter() {
    const params = {};
    if (searchEl?.value) params.search = searchEl.value;
    if (tierEl?.value)   params.tier   = tierEl.value;
    await loadCustomers(params);
  }

  searchEl?.addEventListener('input',  doFilter);
  tierEl?.addEventListener('change', doFilter);
}

// ── Utils ─────────────────────────────────────────────────
function formatMoney(n) {
  if (n >= 1000) return Math.round(n / 1000) + 'K';
  return n.toLocaleString();
}