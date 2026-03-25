document.addEventListener('DOMContentLoaded', async function () {
  requireLogin();

  // โหลดข้อมูลจาก API
  const data = await api.get('/auth/me');
  if (!data) return;

  const u = data.user;
  setVal('username', u.username);
  setVal('email',    u.email);
  setVal('fullName', u.full_name);
  setVal('phone',    u.phone || '');
  setVal('address',  u.address || '');

  // บันทึก
  const form = document.getElementById('profileForm');
  if (form) {
    form.onsubmit = null; // ลบ handler เดิมออก
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const btn = form.querySelector('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'กำลังบันทึก...';

      const body = {
        email:     getVal('email'),
        full_name: getVal('fullName'),
        phone:     getVal('phone'),
        address:   getVal('address'),
      };

      const pass = getVal('password');
      if (pass) {
        if (pass.length < 6) {
          showToast('warning', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
          btn.disabled = false;
          btn.textContent = 'บันทึกการเปลี่ยนแปลง';
          return;
        }
        body.password = pass;
      }

      const result = await api.put('/auth/me', body);
      if (result) {
        showToast('success', 'บันทึกข้อมูลสำเร็จ ✅');
        Auth.setUser({ ...Auth.getUser(), ...body });
        setVal('password', '');
      }

      btn.disabled = false;
      btn.textContent = 'บันทึกการเปลี่ยนแปลง';
    });
  }
});

function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id)       { const el = document.getElementById(id); return el ? el.value : ''; }