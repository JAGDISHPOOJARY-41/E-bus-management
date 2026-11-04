const toast = document.querySelector('#toast');
let toastTimer;

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function showError(element, message) {
  element.textContent = message;
  element.classList.add('visible');
}

function clearError(element) {
  element.textContent = '';
  element.classList.remove('visible');
}

function setBusy(button, busy) {
  button.disabled = busy;
  button.style.opacity = busy ? '.6' : '1';
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

document.querySelector('#routeForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const destination = document.querySelector('#toInput').value.trim();
  if (!destination) return showToast('Add a destination to find buses ✦');
  const source = document.querySelector('#fromInput').value.trim();
  if (!currentUser) { showToast('Please log in to search buses.'); return openAuth('login'); }
  if (!source || !destination) return showToast('Enter both source and destination.');
  searchBuses(source, destination);
});

document.querySelector('#swapButton').addEventListener('click', () => {
  const from = document.querySelector('#fromInput');
  const to = document.querySelector('#toInput');
  [from.value, to.value] = [to.value, from.value];
});

document.querySelectorAll('.quick-chip').forEach((chip) => chip.addEventListener('click', () => {
  document.querySelector('#toInput').value = chip.textContent.replace('↗', '').trim();
  showToast(`${document.querySelector('#toInput').value} selected as destination`);
}));

document.querySelector('#allArrivals').addEventListener('click', () => document.querySelector('#routeForm').scrollIntoView({ behavior: 'smooth' }));
document.querySelectorAll('.bus-marker').forEach((marker) => marker.addEventListener('click', () => showToast(marker.getAttribute('aria-label'))));
document.querySelector('.mobile-menu').addEventListener('click', () => document.querySelector('.sidebar').classList.toggle('open'));
document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => document.querySelector('.sidebar').classList.remove('open')));

// MongoDB-backed authentication. Credentials are never stored in localStorage.
const authOverlay = document.querySelector('#authOverlay');
const authTitle = document.querySelector('#authTitle');
const authSub = document.querySelector('#authSub');
const authTabs = document.querySelectorAll('.auth-tab');
const authForms = document.querySelectorAll('.auth-form');
const loginForm = document.querySelector('#loginForm');
const registerForm = document.querySelector('#registerForm');
const loginError = document.querySelector('#loginError');
const regError = document.querySelector('#regError');
const accountButton = document.querySelector('#accountButton');
let currentUser = null;

function openAuth(tab = 'login') {
  switchTab(tab);
  authOverlay.classList.add('show');
  authOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => authOverlay.querySelector('.auth-form.active input')?.focus(), 120);
}

function closeAuth() {
  authOverlay.classList.remove('show');
  authOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  clearError(loginError);
  clearError(regError);
}

function switchTab(tab) {
  authTabs.forEach((tabButton) => tabButton.classList.toggle('active', tabButton.dataset.tab === tab));
  authForms.forEach((form) => form.classList.toggle('active', form.id === `${tab}Form`));
  clearError(loginError);
  clearError(regError);
  if (tab === 'register') {
    authTitle.textContent = 'Create your account';
    authSub.textContent = 'Your details will be securely saved in MongoDB.';
  } else {
    authTitle.textContent = 'Welcome back';
    authSub.textContent = 'Sign in to track your routes in real time.';
  }
}

function updateProfileUI() {
  const avatar = document.querySelector('.profile-row .avatar');
  const nameElement = document.querySelector('.profile-row strong');
  const roleElement = document.querySelector('.profile-row small');
  const heading = document.querySelector('.page-intro h1');
  const firstName = currentUser?.fullName?.split(' ')[0] || 'there';
  const initials = currentUser?.fullName
    ? currentUser.fullName.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  avatar.textContent = initials;
  nameElement.textContent = currentUser?.fullName || 'Guest user';
  roleElement.textContent = currentUser ? 'Passenger account' : 'Sign in to continue';
  accountButton.setAttribute('aria-label', currentUser ? 'Sign out' : 'Open login form');
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }).format(new Date()));
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  if (heading) heading.innerHTML = `${greeting}, ${firstName} <span>✦</span>`;
}

authTabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
document.querySelectorAll('[data-switch]').forEach((button) => button.addEventListener('click', () => switchTab(button.dataset.switch)));
document.querySelector('#authClose').addEventListener('click', closeAuth);
authOverlay.addEventListener('click', (event) => { if (event.target === authOverlay) closeAuth(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeAuth(); });

accountButton.addEventListener('click', async () => {
  if (!currentUser) {
    openAuth('login');
    return;
  }
  try {
    await apiRequest('/api/logout', { method: 'POST', body: '{}' });
    currentUser = null;
    updateProfileUI();
    showToast('Signed out successfully.');
  } catch (error) {
    showToast(error.message);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError(loginError);
  const email = document.querySelector('#loginEmail').value.trim();
  const password = document.querySelector('#loginPassword').value;
  if (!email || !password) return showError(loginError, 'Please enter your email and password.');

  const button = loginForm.querySelector('.auth-submit');
  setBusy(button, true);
  try {
    const data = await apiRequest('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    currentUser = data.user;
    loginForm.reset();
    closeAuth();
    updateProfileUI();
    showToast(data.message);
  } catch (error) {
    showError(loginError, error.message);
  } finally {
    setBusy(button, false);
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError(regError);
  const fullName = document.querySelector('#regName').value.trim();
  const email = document.querySelector('#regEmail').value.trim();
  const phone = document.querySelector('#regPhone').value.trim();
  const city = document.querySelector('#regCity').value.trim();
  const password = document.querySelector('#regPassword').value;
  const confirmPassword = document.querySelector('#regConfirm').value;
  if (!fullName || !email || !password || !confirmPassword) return showError(regError, 'Please fill in all required fields.');
  if (password.length < 6) return showError(regError, 'Password must be at least 6 characters.');
  if (password !== confirmPassword) return showError(regError, 'Passwords do not match.');

  const button = registerForm.querySelector('.auth-submit');
  setBusy(button, true);
  try {
    const data = await apiRequest('/api/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, phone, city, password, confirmPassword }),
    });
    currentUser = data.user;
    registerForm.reset();
    closeAuth();
    updateProfileUI();
    showToast(data.message);
  } catch (error) {
    showError(regError, error.message);
  } finally {
    setBusy(button, false);
  }
});

document.querySelector('#regPassword').addEventListener('input', (event) => {
  document.querySelector('#pwHint').classList.toggle('ok', event.target.value.length >= 6);
});

async function loadCurrentUser() {
  try {
    const data = await apiRequest('/api/user');
    currentUser = data.user;
  } catch {
    currentUser = null;
  }
  updateProfileUI();
}

loadCurrentUser();

// Interactive Bengaluru map and nearby bus-stop lookup.
let busMap;
let mapTargetMarker;
let userLocationMarker;
let stopLayer;

function initializeBusMap() {
  const mapArea = document.querySelector('.map-area');
  if (!mapArea || typeof L === 'undefined') return;
  mapArea.innerHTML = '<div id="busMap" class="bus-map"></div><div class="map-actions"><button id="locateMe" type="button">◎ Use my location</button></div>';

  busMap = L.map('busMap').setView([12.9716, 77.5946], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(busMap);
  stopLayer = L.layerGroup().addTo(busMap);

  document.querySelector('#locateMe').addEventListener('click', locateUser);
  loadBusStops(12.9716, 77.5946);
}

async function searchLocation(query) {
  showToast(`Finding ${query} in Bengaluru…`);
  try {
    const data = await apiRequest(`/api/location/search?q=${encodeURIComponent(query)}`);
    const { lat, lon, name } = data.location;
    const point = [lat, lon];
    busMap.setView(point, 15);
    if (mapTargetMarker) mapTargetMarker.remove();
    mapTargetMarker = L.marker(point).addTo(busMap).bindPopup(`<strong>${query}</strong><br>${name}`).openPopup();
    await loadBusStops(lat, lon);
    showToast(`Showing bus stops near ${query}`);
  } catch (error) {
    showToast(error.message);
  }
}

function locateUser() {
  if (!navigator.geolocation) return showToast('Location is not supported by this browser.');
  showToast('Requesting your location…');
  navigator.geolocation.getCurrentPosition(async ({ coords }) => {
    const { latitude, longitude } = coords;
    const point = [latitude, longitude];
    busMap.setView(point, 15);
    if (userLocationMarker) userLocationMarker.remove();
    userLocationMarker = L.circleMarker(point, { radius: 9, color: '#163a35', fillColor: '#cbed72', fillOpacity: 1 }).addTo(busMap).bindPopup('Your location').openPopup();
    await loadBusStops(latitude, longitude);
    showToast('Showing bus stops near your location');
  }, () => showToast('Location permission was not granted.'));
}

async function loadBusStops(lat, lon) {
  if (!stopLayer) return;
  stopLayer.clearLayers();
  try {
    const data = await apiRequest(`/api/bus-stops?lat=${lat}&lon=${lon}`);
    data.stops.forEach((stop) => L.circleMarker([stop.lat, stop.lon], {
      radius: 6, color: '#e98367', fillColor: '#fff', fillOpacity: 1,
    }).bindPopup(`<strong>${stop.name}</strong><br>Nearby Bengaluru bus stop`).addTo(stopLayer));
    if (!data.stops.length) showToast('No mapped bus stops found nearby.');
  } catch (error) {
    showToast(error.message);
  }
}

function updateCurrentDateTime() { const element = document.querySelector('#currentDateTime'); if (!element) return; element.textContent = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }).format(new Date()) + ' IST'; }
updateCurrentDateTime();
setInterval(updateCurrentDateTime, 1000);
document.querySelector('.quick-searches')?.remove();
document.querySelector('.stop-selector')?.remove();
document.querySelector('.map-card')?.remove();
document.querySelector('.content-grid')?.classList.add('single-column');
initializeBusMap();

let trackingTimer = null;
function escapeHtml(value) { return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
function renderBusResults(buses, source, destination) {
  const results = document.querySelector('#busResults');
  if (!buses.length) { results.innerHTML = `<p class="empty-results">No buses available for ${escapeHtml(source)} → ${escapeHtml(destination)}.</p>`; return; }
  results.innerHTML = buses.map((bus, index) => `<article class="arrival-item"><div class="route-badge ${['route-green', 'route-yellow', 'route-coral'][index % 3]}">${escapeHtml(bus.busNumber)}</div><div class="arrival-main"><strong>${escapeHtml(bus.source)} → ${escapeHtml(bus.destination)}</strong><small>${escapeHtml(bus.busType)} · Driver: ${escapeHtml(bus.driver?.fullName || 'Not assigned')}</small></div><div class="arrival-time"><strong>${escapeHtml(bus.status)}</strong><button class="track-bus" data-bus-id="${escapeHtml(bus.id)}">Track Bus</button></div></article>`).join('');
  results.querySelectorAll('.track-bus').forEach((button) => button.addEventListener('click', () => trackBus(button.dataset.busId)));
}
async function searchBuses(source, destination) { const results = document.querySelector('#busResults'); results.innerHTML = '<p class="empty-results">Finding buses…</p>'; try { const data = await apiRequest(`/api/buses/search?source=${encodeURIComponent(source)}&destination=${encodeURIComponent(destination)}`); renderBusResults(data.buses, source, destination); } catch (error) { results.innerHTML = `<p class="empty-results">${escapeHtml(error.message)}</p>`; } }
function renderTracking(bus, location, prediction) { document.querySelector('#trackingBusNumber').textContent=bus.busNumber; document.querySelector('#trackingBusType').textContent=bus.busType; document.querySelector('#trackingRoute').textContent=`${bus.source} → ${bus.destination}`; document.querySelector('#trackingDriver').textContent=`Driver: ${bus.driver?.fullName || 'Not assigned'} · ${bus.driver?.travelAgency || 'Agency unavailable'}`; document.querySelector('#trackingStatus').textContent=bus.status; document.querySelector('#trackingContact').textContent=`Contact: ${bus.contactNumber}`; document.querySelector('#trackingCoordinates').textContent=location?`${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`:'Location currently unavailable.'; document.querySelector('#trackingSpeed').textContent=location?`${Number(location.speed).toFixed(1)} km/h`:'—'; document.querySelector('#trackingUpdated').textContent=location?new Date(location.createdAt).toLocaleString():'Driver has not started location tracking.'; document.querySelector('#trackingEta').textContent=prediction.etaAvailable?new Date(prediction.estimatedArrival).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'ETA currently unavailable.'; document.querySelector('#trackingMessage').textContent=location?'':'Location tracking inactive. Driver has not started location tracking.'; }
async function refreshTracking(busId) { try { const [busData, locationData, predictionData] = await Promise.all([apiRequest(`/api/buses/${busId}`), apiRequest(`/api/locations/${busId}`), apiRequest(`/api/predictions/${busId}`)]); renderTracking(busData.bus, locationData.location, predictionData); } catch (error) { document.querySelector('#trackingMessage').textContent=error.message; } }
async function trackBus(busId) { document.querySelector('#busTracking').hidden=false; document.querySelector('#busTracking').scrollIntoView({behavior:'smooth',block:'start'}); await refreshTracking(busId); if (trackingTimer) clearInterval(trackingTimer); trackingTimer=setInterval(() => refreshTracking(busId),15000); }
document.querySelector('#closeTracking').addEventListener('click', () => { document.querySelector('#busTracking').hidden=true; if (trackingTimer) clearInterval(trackingTimer); trackingTimer=null; });
document.querySelector('#busResults').innerHTML='<p class="empty-results">Log in and search a source and destination to find buses.</p>';
document.querySelectorAll('.bus-marker').forEach((marker) => marker.remove());
const mapActivity = document.querySelector('.map-footer span:first-child');
if (mapActivity) mapActivity.textContent = 'Search a route for live buses';

// Add the scheduled departure and arrival times to each search result.
const baseRenderBusResults = renderBusResults;
renderBusResults = (buses, source, destination) => {
  baseRenderBusResults(buses, source, destination);
  document.querySelectorAll('#busResults .arrival-main').forEach((element, index) => {
    const bus = buses[index];
    if (!bus) return;
    const times = document.createElement('small');
    times.textContent = `Departure: ${bus.sourceTime || 'Not set'} · Arrival: ${bus.destinationTime || 'Not set'}`;
    element.appendChild(times);
  });
};
