// ===================== STATE =====================
let selectedRole = 'patient';

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  // Set today as min date for appointment booking
  const d = document.getElementById('apptDate');
  if (d) {
    const today = new Date().toISOString().split('T')[0];
    d.min = today;
    d.value = today;
  }

  // Close booking modal on overlay click
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === this) closeModal();
    });
  }
});

// ===================== LOGIN =====================

/**
 * Called when user clicks a role card on login page.
 * @param {string} role - 'patient' | 'psychiatrist' | 'admin'
 * @param {HTMLElement} el - The clicked role card element
 */
function selectRole(role, el) {
  selectedRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

/**
 * Handles login button click — routes user to the correct dashboard.
 */
function handleLogin() {
  const email = document.getElementById('loginEmail').value;
  if (!email) {
    showToast('Please enter your email address');
    return;
  }

  // Hide login page
  document.getElementById('loginPage').classList.remove('active');

  // Show the correct dashboard
  if (selectedRole === 'patient') {
    document.getElementById('patientDashboard').classList.add('active');
  } else if (selectedRole === 'psychiatrist') {
    document.getElementById('psychiatristDashboard').classList.add('active');
  } else {
    document.getElementById('adminDashboard').classList.add('active');
  }

  showToast('Welcome! You are now logged in.');
}

// ===================== LOGOUT =====================

/**
 * Logs user out and returns to login page.
 */
function logout() {
  document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
  document.getElementById('loginPage').classList.add('active');
  showToast('Logged out successfully.');
}

// ===================== TAB NAVIGATION =====================

/**
 * Switches the active tab inside a dashboard.
 * @param {string} prefix - 'patient' | 'psy' | 'admin'
 * @param {string} tab    - Tab ID (e.g. 'home', 'book', 'appointments')
 * @param {HTMLElement} el - The clicked nav item element
 */
function switchTab(prefix, tab, el) {
  const dashId = getDashId(prefix);

  // Deactivate all tab panels in this dashboard
  document.querySelectorAll(`#${dashId} .tab-panel`).forEach(p => p.classList.remove('active'));

  // Deactivate all nav items in this dashboard
  document.querySelectorAll(`#${dashId} .nav-item`).forEach(n => n.classList.remove('active'));

  // Activate clicked nav item
  el.classList.add('active');

  // Show the target tab panel
  const panel = document.getElementById(`${prefix}-${tab}`);
  if (panel) panel.classList.add('active');

  // Update topbar title
  const titleEl = document.getElementById(`${getTitleId(prefix)}PageTitle`);
  if (titleEl) titleEl.textContent = el.querySelector('.nav-label').textContent;

  // Close mobile sidebar
  closeSidebar(prefix);
}

/**
 * Switches tab by tab name — used programmatically (e.g. hero buttons).
 * @param {string} prefix - 'patient' | 'psy' | 'admin'
 * @param {string} tab    - Tab ID string
 */
function switchTabByName(prefix, tab) {
  const dashId = getDashId(prefix);
  const tabMap = {
    home: 'Home & Awareness',
    book: 'Book Appointment',
    appointments: 'My Appointments',
    doctors: 'Psychiatrist Profiles',
    profile: 'My Profile'
  };

  document.querySelectorAll(`#${dashId} .nav-item`).forEach(item => {
    const label = item.querySelector('.nav-label');
    if (!label) return;
    if (label.textContent.trim() === tabMap[tab]) {
      switchTab(prefix, tab, item);
    }
  });
}

// ===================== BOOKING MODAL =====================

/**
 * Shows the booking success modal.
 */
function bookAppointment() {
  document.getElementById('bookingModal').classList.remove('hidden');
}

/**
 * Closes the booking modal and navigates to appointments tab.
 */
function closeModal() {
  document.getElementById('bookingModal').classList.add('hidden');
  switchTabByName('patient', 'appointments');
}

// ===================== TOAST NOTIFICATION =====================

/**
 * Shows a toast notification at the bottom of the screen.
 * @param {string} msg - Message to display
 */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===================== MOBILE SIDEBAR =====================

/**
 * Toggles the mobile sidebar open/close.
 * @param {string} prefix - 'patient' | 'psy' | 'admin'
 */
function toggleSidebar(prefix) {
  const sidebar = document.getElementById(getSidebarId(prefix));
  const overlay = document.getElementById(getOverlayId(prefix));
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

/**
 * Closes the mobile sidebar.
 * @param {string} prefix - 'patient' | 'psy' | 'admin'
 */
function closeSidebar(prefix) {
  const sidebar = document.getElementById(getSidebarId(prefix));
  const overlay = document.getElementById(getOverlayId(prefix));
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ===================== HELPERS =====================

function getDashId(prefix) {
  if (prefix === 'patient') return 'patientDashboard';
  if (prefix === 'psy')     return 'psychiatristDashboard';
  return 'adminDashboard';
}

function getTitleId(prefix) {
  if (prefix === 'patient') return 'patient';
  if (prefix === 'psy')     return 'psy';
  return 'admin';
}

function getSidebarId(prefix) {
  if (prefix === 'patient') return 'patientSidebar';
  if (prefix === 'psy')     return 'psySidebar';
  return 'adminSidebar';
}

function getOverlayId(prefix) {
  if (prefix === 'patient') return 'patientOverlay';
  if (prefix === 'psy')     return 'psyOverlay';
  return 'adminOverlay';
}
