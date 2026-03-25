document.addEventListener('DOMContentLoaded', function () {

  // ถ้า login อยู่แล้ว ไม่ต้องมาหน้านี้
  if (Auth.isLoggedIn()) {
    window.location.href = Auth.isAdmin() ? 'dashboard.html' : 'main.html';
    return;
  }

  const form = document.querySelector('.LoginForm');
  if (!form) return;

  const isRegister = document.querySelector('.LoginForm-title')?.textContent?.trim() === 'Register';

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    const btn = form.querySelector('[type="submit"]');
    btn.disabled = true;
    btn.textContent = isRegister ? 'กำลังสมัคร...' : 'กำลังเข้าสู่ระบบ...';

    try {
      if (isRegister) {
        await handleRegister(form);
      } else {
        await handleLogin(form);
      }
    } finally {
      btn.disabled = false;
      btn.textContent = isRegister ? 'REGISTER' : 'LOGIN';
    }
  });
});

// ── Login ─────────────────────────────────────────────────
async function handleLogin(form) {
  const username = form.querySelector('#username').value.trim();
  const password = form.querySelector('#password').value;

  if (!username || !password) {
    showToast('warning', 'กรุณากรอก Username และ Password');
    return;
  }

  const data = await api.post('/auth/login', { username, password });
  if (!data) return;

  Auth.setToken(data.token);
  Auth.setUser(data.user);
  showToast('success', `ยินดีต้อนรับ ${data.user.full_name} 👋`);

  setTimeout(() => {
    window.location.href = data.user.role === 'admin' ? 'dashboard.html' : 'main.html';
  }, 800);
}

// ── Register ──────────────────────────────────────────────
async function handleRegister(form) {
  const username = form.querySelector('#username').value.trim();
  const password = form.querySelector('#password').value;
  const confirm  = form.querySelector('#confirm-password').value;

  if (!username || !password) {
    showToast('warning', 'กรุณากรอกข้อมูลให้ครบ');
    return;
  }
  if (password !== confirm) {
    showToast('error', 'รหัสผ่านไม่ตรงกัน');
    return;
  }
  if (password.length < 6) {
    showToast('warning', 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    return;
  }

  const data = await api.post('/auth/register', {
    username,
    email:     username.includes('@') ? username : `${username}@rentalclothes.com`,
    password,
    full_name: username,
    phone:     '',
  });
  if (!data) return;

  Auth.setToken(data.token);
  showToast('success', 'สมัครสมาชิกสำเร็จ! 🎉');
  setTimeout(() => { window.location.href = 'profile.html'; }, 800);
}