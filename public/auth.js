// Wayfinder — login / register page logic (talks to Express + MongoDB)
const toast = document.querySelector('#toast');
let toastTimer;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 4000);
}
function setBusy(btn, busy) {
  if (!btn) return;
  btn.disabled = busy;
  btn.style.opacity = busy ? '.6' : '1';
  btn.style.pointerEvents = busy ? 'none' : 'auto';
}

// Already signed in? go straight to dashboard
fetch('/api/user').then((r) => { if (r.ok) location.href = '/'; }).catch(() => { });

// ── Register ──
const registerForm = document.querySelector('#registerForm');
if (registerForm) {
  const regError = document.querySelector('#regError');
  const pwInput = document.querySelector('#regPassword');
  pwInput.addEventListener('input', (e) => {
    document.querySelector('#pwHint').classList.toggle('ok', e.target.value.length >= 6);
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fullName = document.querySelector('#regName').value.trim();
    const email = document.querySelector('#regEmail').value.trim();
    const phone = document.querySelector('#regPhone').value.trim();
    const city = document.querySelector('#regCity').value.trim();
    const password = pwInput.value;
    const confirmPassword = document.querySelector('#regConfirm').value;

    if (!fullName || !email || !password) return showError(regError, 'Please fill in all required fields.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showError(regError, 'Please enter a valid email address.');
    if (password.length < 6) return showError(regError, 'Password must be at least 6 characters.');
    if (password !== confirmPassword) return showError(regError, 'Passwords do not match.');

    setBusy(document.querySelector('#regBtn'), true);
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, phone, city, password, confirmPassword })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message + ' ✦');
        setTimeout(() => (location.href = '/'), 900);
      } else {
        showError(regError, data.message);
      }
    } catch {
      showError(regError, 'Server unreachable. Is the server running?');
    }
    setBusy(document.querySelector('#regBtn'), false);
  });
}

// ── Login ──
const loginForm = document.querySelector('#loginForm');
if (loginForm) {
  const loginError = document.querySelector('#loginError');
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.querySelector('#loginEmail').value.trim();
    const password = document.querySelector('#loginPassword').value;
    if (!email || !password) return showError(loginError, 'Please fill in all fields.');

    setBusy(document.querySelector('#loginBtn'), true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message + ' ✦');
        setTimeout(() => (location.href = '/'), 900);
      } else {
        showError(loginError, data.message);
      }
    } catch {
      showError(loginError, 'Server unreachable. Is the server running?');
    }
    setBusy(document.querySelector('#loginBtn'), false);
  });
}
