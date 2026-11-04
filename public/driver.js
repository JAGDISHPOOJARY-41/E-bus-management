const $ = (id) => document.getElementById(id);
let assignedBus = null; let timer = null; let tracking = false;
async function api(url, options = {}) { const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers || {}) } }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error(data.message || 'Something went wrong.'); return data; }
function showMessage(message, error = false) { $('message').textContent = message; $('message').className = `message ${error ? 'error' : 'success'}`; }
function showLogin(message = '') { $('appView').hidden = true; $('loginView').hidden = false; $('loginMessage').textContent = message; }
function formatDate(value) { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'; }
function renderBus(bus) { assignedBus = bus; ['busNumber','busType','registrationNumber','source','destination','contactNumber'].forEach((field) => { $(field).textContent = bus[field] || '—'; }); $('status').value = bus.status; }
async function loadDashboard() { const [profile, bus] = await Promise.all([api('/api/driver/profile'), api('/api/driver/bus')]); $('driverName').textContent = profile.driver.firstName || profile.driver.fullName; renderBus(bus.bus); showMessage('Bus information loaded successfully.'); }
function setTrackingUi(active) { tracking = active; $('trackingState').textContent = `Location Tracking: ${active ? 'Active' : 'Stopped'}`; $('trackingState').className = `tracking ${active ? 'active' : 'stopped'}`; $('startButton').disabled = active; $('stopButton').disabled = !active; }
async function sendLocation(position) { if (!assignedBus) return; const coords = position.coords; const speed = Number.isFinite(coords.speed) && coords.speed >= 0 ? coords.speed * 3.6 : 0; try { const data = await api('/api/locations', { method: 'POST', body: JSON.stringify({ busId: assignedBus.id, latitude: coords.latitude, longitude: coords.longitude, speed }) }); $('latitude').textContent = Number(coords.latitude).toFixed(5); $('longitude').textContent = Number(coords.longitude).toFixed(5); $('speed').textContent = speed.toFixed(1); $('updatedAt').textContent = formatDate(data.location.createdAt); $('locationMessage').textContent = 'Location updated successfully.'; $('locationMessage').className = 'message success'; } catch (error) { $('locationMessage').textContent = error.message; $('locationMessage').className = 'message error'; } }
function locationError(error) { const msg = error.code === 1 ? 'Location permission denied. Please allow location permission in your browser.' : 'Unable to access location.'; $('locationMessage').textContent = msg; $('locationMessage').className = 'message error'; stopTracking(false); }
function requestLocation() { if (!navigator.geolocation) { $('locationMessage').textContent = 'Location is not supported by this browser.'; $('locationMessage').className = 'message error'; return; } navigator.geolocation.getCurrentPosition(sendLocation, locationError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }); }
async function startTracking() { try { await api('/api/driver/tracking', { method: 'POST', body: JSON.stringify({ active: true }) }); setTrackingUi(true); $('locationMessage').textContent = 'Requesting your location…'; requestLocation(); timer = setInterval(requestLocation, 15000); } catch (error) { $('locationMessage').textContent = error.message; $('locationMessage').className = 'message error'; } }
async function stopTracking(log = true) { if (timer) clearInterval(timer); timer = null; setTrackingUi(false); if (log) { try { await api('/api/driver/tracking', { method: 'POST', body: JSON.stringify({ active: false }) }); } catch { /* logout/navigation can interrupt this small audit request */ } } }
$('loginForm').onsubmit = async (event) => {
  event.preventDefault();
  $('loginMessage').textContent = '';
  try {
    const data = await api('/api/login', { method: 'POST', body: JSON.stringify({ email: $('email').value.trim(), password: $('password').value }) });
    if (data.user.role !== 'driver') {
      await api('/api/logout', { method: 'POST' });
      throw new Error('Driver access required.');
    }

    // Load both the driver profile and assigned bus before revealing the app.
    // This prevents a failed authorization/assignment lookup from leaving a
    // blank dashboard visible.
    await loadDashboard();
    $('loginView').hidden = true;
    $('appView').hidden = false;
  } catch (error) {
    await fetch('/api/logout', { method: 'POST' }).catch(() => { });
    showLogin(error.message.includes('Driver') ? error.message : 'Unable to load your driver account.');
  }
};
$('statusButton').onclick = async () => { try { const data = await api('/api/driver/bus/status', { method: 'PUT', body: JSON.stringify({ status: $('status').value }) }); renderBus(data.bus); showMessage(data.message); } catch (error) { showMessage(error.message, true); } };
$('startButton').onclick = startTracking; $('stopButton').onclick = () => stopTracking(true); $('logoutButton').onclick = async () => { await stopTracking(false); await api('/api/logout', { method: 'POST' }); showLogin(); }; loadDashboard().then(() => { $('loginView').hidden = true; $('appView').hidden = false; }).catch((error) => showLogin(error.message.includes('Driver') ? error.message : 'Please log in as a driver.'));
