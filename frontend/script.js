// ===================== CONFIG =====================
const API_BASE = 'http://127.0.0.1:8000/api';

// ===================== STATE =====================
let selectedRole       = 'patient';
let selectedSignupRole = 'patient';
let authToken          = null;
let currentUser        = null;
let allDoctorsCache    = [];
let allPatientsCache   = [];
let allApptsCache      = [];
let psyApptsCache      = [];

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('apptDate');
  if (d) {
    const today = new Date().toISOString().split('T')[0];
    d.min   = today;
    d.value = today;
  }
  const modal = document.getElementById('bookingModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
  }
});

// ===================== HELPERS =====================
function getInitials(name) {
  if (!name) return '--';
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

function getBadgeClass(status) {
  const map = {
    pending:   'badge-yellow',
    confirmed: 'badge-green',
    completed: 'badge-teal',
    cancelled: 'badge-red'
  };
  return map[status] || 'badge-gray';
}

function formatDate(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '--';
  const [h, m] = timeStr.split(':');
  const hour = parseInt(h);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h12  = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
}

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

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

// ===================== API HELPER =====================
async function apiCall(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${authToken}`
  };
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(`${API_BASE}${endpoint}`, options);
  const data     = await response.json();
  return { ok: response.ok, data, status: response.status };
}

// ===================== SIGNUP =====================
function showSignup() {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('signupPage').classList.add('active');
}

function showLogin() {
  document.getElementById('signupPage').classList.remove('active');
  document.getElementById('loginPage').classList.add('active');
}

function selectSignupRole(role, el) {
  selectedSignupRole = role;
  document.querySelectorAll('#signupPage .role-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
  if (role === 'patient') {
    document.getElementById('patientFields').classList.remove('hidden');
    document.getElementById('psychiatristFields').classList.add('hidden');
  } else {
    document.getElementById('patientFields').classList.add('hidden');
    document.getElementById('psychiatristFields').classList.remove('hidden');
  }
}

async function handleSignup() {
  try {
    let response;
    if (selectedSignupRole === 'patient') {
      const name     = document.getElementById('signupName').value;
      const email    = document.getElementById('signupEmail').value;
      const password = document.getElementById('signupPassword').value;
      if (!name || !email || !password) { showToast('Please fill in all required fields'); return; }
      response = await fetch(`${API_BASE}/users/register/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password })
      });
    } else {
      const name     = document.getElementById('signupDoctorName').value;
      const email    = document.getElementById('signupDoctorEmail').value;
      const password = document.getElementById('signupDoctorPassword').value;
      const spec     = document.getElementById('signupSpecialization').value;
      const exp      = document.getElementById('signupExperience').value;
      const fee      = document.getElementById('signupFee').value;
      const regNum   = document.getElementById('signupRegNumber').value;
      if (!name || !email || !password || !spec || !exp || !fee) { showToast('Please fill in all required fields'); return; }
      response = await fetch(`${API_BASE}/users/register/psychiatrist/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email, password,
          full_name:        name,
          specialization:   spec,
          experience_years: parseInt(exp),
          consultation_fee: parseFloat(fee),
          reg_number:       regNum
        })
      });
    }
    const data = await response.json();
    if (response.ok) {
      authToken   = data.tokens.access;
      currentUser = { role: data.role };
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userRole',  data.role);
      showToast('Account created successfully!');
      document.getElementById('signupPage').classList.remove('active');
      routeToDashboard(data.role);
    } else {
      const errorMsg = Object.values(data)[0];
      showToast(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
    }
  } catch(e) {
    showToast('Cannot connect to server. Make sure backend is running.');
  }
}

// ===================== LOGIN =====================
function selectRole(role, el) {
  selectedRole = role;
  document.querySelectorAll('.role-card').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

async function handleLogin() {
  const email    = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  if (!email || !password) { showToast('Please enter email and password'); return; }
  try {
    const response = await fetch(`${API_BASE}/users/login/`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      authToken   = data.tokens.access;
      currentUser = { email, role: data.role };
      localStorage.setItem('authToken', authToken);
      localStorage.setItem('userRole',  data.role);
      showToast('Welcome! Logged in successfully.');
      routeToDashboard(data.role);
    } else {
      showToast(data.error || 'Invalid email or password');
    }
  } catch(e) {
    showToast('Cannot connect to server. Make sure backend is running.');
  }
}

// ===================== ROUTE TO DASHBOARD =====================
function routeToDashboard(role) {
  document.getElementById('loginPage').classList.remove('active');
  document.getElementById('signupPage').classList.remove('active');
  if (role === 'patient') {
    document.getElementById('patientDashboard').classList.add('active');
    loadPatientDashboard();
  } else if (role === 'psychiatrist') {
    document.getElementById('psychiatristDashboard').classList.add('active');
    loadPsychiatristDashboard();
  } else if (role === 'admin') {
    document.getElementById('adminDashboard').classList.add('active');
    loadAdminDashboard();
  }
}

// ===================== LOGOUT =====================
function logout() {
  authToken   = null;
  currentUser = null;
  allDoctorsCache  = [];
  allPatientsCache = [];
  allApptsCache    = [];
  psyApptsCache    = [];
  localStorage.removeItem('authToken');
  localStorage.removeItem('userRole');
  document.querySelectorAll('.dashboard').forEach(d => d.classList.remove('active'));
  document.getElementById('loginPage').classList.add('active');
  showToast('Logged out successfully.');
}

// ===================== PATIENT DASHBOARD =====================
async function loadPatientDashboard() {
  try {
    const { ok, data } = await apiCall('/users/patient/profile/');
    if (ok) {
      const name     = data.full_name || currentUser?.email || 'Patient';
      const initials = getInitials(name);
      setText('patientSidebarName', name);
      setText('patientWelcome', `Welcome back, ${name.split(' ')[0]} 👋`);
      setText('patientAvatarInitials', initials);
      setText('patientTopAvatar', initials);
      setText('patientProfileAvatar', initials);
      setText('patientProfileName', name);
      setText('patientProfileEmail', currentUser?.email || '');
      // Populate profile form
      setVal('profileFullName', data.full_name || '');
      setVal('profileDOB', data.date_of_birth || '');
      setVal('profileEmail', currentUser?.email || '');
      setVal('profilePhone', data.phone || '');
      setVal('profileAddress', data.address || '');
      setVal('profileEmergencyContact', data.emergency_contact || '');
      setVal('profileEmergencyPhone', data.emergency_phone || '');
      setVal('bookPatientName', data.full_name || '');
      setVal('bookPhone', data.phone || '');
    } else {
      const email    = currentUser?.email || 'Patient';
      const initials = getInitials(email);
      setText('patientSidebarName', email);
      setText('patientWelcome', `Welcome 👋`);
      setText('patientAvatarInitials', initials);
      setText('patientTopAvatar', initials);
      setText('patientProfileAvatar', initials);
    }
  } catch(e) {}

  // Load doctors for booking dropdown
  loadDoctorsForBooking();
  showToast('Welcome to Neurowell!');
}

async function loadDoctorsForBooking() {
  try {
    const { ok, data } = await apiCall('/users/doctors/');
    if (ok && data.length > 0) {
      allDoctorsCache = data;
      const select = document.getElementById('bookDoctorSelect');
      if (select) {
        select.innerHTML = data.map(doc =>
          `<option value="${doc.id}">${doc.full_name} — ${doc.specialization}</option>`
        ).join('');
      }
    } else {
      const select = document.getElementById('bookDoctorSelect');
      if (select) select.innerHTML = '<option value="">No doctors available</option>';
    }
  } catch(e) {}
}

async function loadPatientAppointments() {
  try {
    const { ok, data } = await apiCall('/appointments/patient/');
    if (ok) {
      const upcoming  = data.filter(a => isUpcoming(a.appt_date) && a.status !== 'completed' && a.status !== 'cancelled');
      const past      = data.filter(a => !isUpcoming(a.appt_date) || a.status === 'completed' || a.status === 'cancelled');
      const total     = data.length;

      setText('patientUpcomingCount', upcoming.length);
      setText('patientCompletedCount', data.filter(a => a.status === 'completed').length);
      setText('patientTotalCount', total);
      setText('patientApptBadge', upcoming.length);

      const upcomingBody = document.getElementById('upcomingAppointmentsBody');
      if (upcomingBody) {
        upcomingBody.innerHTML = upcoming.length === 0
          ? '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:24px;">No upcoming appointments</td></tr>'
          : upcoming.map(a => `
            <tr>
              <td><strong>${formatDate(a.appt_date)}</strong><br><span style="font-size:12px;color:var(--gray-400);">${formatTime(a.appt_time)}</span></td>
              <td>Doctor #${a.psychiatrist}</td>
              <td>${a.type.replace('_', ' ')}</td>
              <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
              <td><button class="btn-sm btn-outline" onclick="showToast('Feature coming soon')">View</button></td>
            </tr>`).join('');
      }

      const pastBody = document.getElementById('pastAppointmentsBody');
      if (pastBody) {
        pastBody.innerHTML = past.length === 0
          ? '<tr><td colspan="5" style="text-align:center;color:var(--gray-400);padding:24px;">No past appointments</td></tr>'
          : past.map(a => `
            <tr>
              <td>${formatDate(a.appt_date)}</td>
              <td>Doctor #${a.psychiatrist}</td>
              <td>${a.type.replace('_', ' ')}</td>
              <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
              <td><button class="btn-sm btn-outline" onclick="showToast('Feature coming soon')">View</button></td>
            </tr>`).join('');
      }
    }
  } catch(e) {}
}

async function loadDoctorProfiles() {
  try {
    const { ok, data } = await apiCall('/admin-panel/doctors/');
    const grid = document.getElementById('doctorsGrid');
    if (!grid) return;
    if (ok && data.length > 0) {
      const colors = [
        'linear-gradient(135deg,#6366f1,#3b9ede)',
        'linear-gradient(135deg,#0891b2,#1a3c6e)',
        'linear-gradient(135deg,#059669,#0891b2)',
        'linear-gradient(135deg,#7c3aed,#6366f1)',
        'linear-gradient(135deg,#dc2626,#f59e0b)',
      ];
      grid.innerHTML = data.map((doc, i) => `
        <div class="doctor-card">
          <div class="doctor-avatar" style="background:${colors[i % colors.length]};">${getInitials(doc.full_name)}</div>
          <h3>${doc.full_name}</h3>
          <div class="specialty">${doc.specialization}</div>
          <div class="rating">⭐ ${doc.experience_years} yrs experience</div>
          <div class="availability" style="color:${doc.is_active ? 'var(--success)' : 'var(--warning)'};">
            ● ${doc.is_active ? 'Available' : 'Unavailable'}
          </div>
          <div style="font-size:12px;color:var(--gray-500);margin-bottom:14px;">Fee: ₹${doc.consultation_fee}</div>
          <button class="btn-sm btn-blue" style="width:100%"
            onclick="selectDoctorAndBook(${doc.id})">Book Now</button>
        </div>`).join('');
    } else {
      grid.innerHTML = '<div style="text-align:center;color:var(--gray-400);padding:40px;grid-column:1/-1;">No psychiatrists available yet.</div>';
    }
  } catch(e) {}
}

function selectDoctorAndBook(doctorId) {
  const select = document.getElementById('bookDoctorSelect');
  if (select) select.value = doctorId;
  switchTabByName('patient', 'book');
}

// ===================== BOOK APPOINTMENT =====================
async function bookAppointment() {
  const doctorId  = document.getElementById('bookDoctorSelect')?.value;
  const apptDate  = document.getElementById('apptDate')?.value;
  const apptTime  = document.getElementById('bookTime')?.value;
  const type      = document.getElementById('bookType')?.value;
  const complaint = document.getElementById('bookComplaint')?.value;
  const existing  = document.getElementById('bookExisting')?.value;

  if (!doctorId || !apptDate) {
    showToast('Please select a doctor and date');
    return;
  }

  try {
    const { ok, data } = await apiCall('/appointments/book/', 'POST', {
      psychiatrist:        parseInt(doctorId),
      appt_date:           apptDate,
      appt_time:           apptTime || '10:00:00',
      type:                type || 'video',
      complaint:           complaint || '',
      existing_conditions: existing || ''
    });
    if (ok) {
      document.getElementById('bookingModal').classList.remove('hidden');
    } else {
      const msg = Object.values(data)[0];
      showToast(Array.isArray(msg) ? msg[0] : msg);
    }
  } catch(e) {
    showToast('Cannot connect to server.');
  }
}

function closeModal() {
  document.getElementById('bookingModal').classList.add('hidden');
  switchTabByName('patient', 'appointments');
}

function clearBookingForm() {
  setVal('bookComplaint', '');
  setVal('bookExisting', '');
  const d = document.getElementById('apptDate');
  if (d) d.value = new Date().toISOString().split('T')[0];
}

async function savePatientProfile() {
  try {
    const { ok } = await apiCall('/users/patient/profile/', 'PUT', {
      full_name:         document.getElementById('profileFullName')?.value || '',
      date_of_birth:     document.getElementById('profileDOB')?.value || null,
      phone:             document.getElementById('profilePhone')?.value || '',
      address:           document.getElementById('profileAddress')?.value || '',
      emergency_contact: document.getElementById('profileEmergencyContact')?.value || '',
      emergency_phone:   document.getElementById('profileEmergencyPhone')?.value || ''
    });
    showToast(ok ? 'Profile saved successfully!' : 'Failed to save profile.');
    if (ok) loadPatientDashboard();
  } catch(e) {
    showToast('Cannot connect to server.');
  }
}

// ===================== PSYCHIATRIST DASHBOARD =====================
async function loadPsychiatristDashboard() {
  try {
    const { ok, data } = await apiCall('/users/psychiatrist/profile/');
    if (ok) {
      const name     = data.full_name || currentUser?.email || 'Doctor';
      const initials = getInitials(name);
      setText('psySidebarName', name);
      setText('psyAvatarInitials', initials);
      setText('psyTopAvatar', initials);
      setText('psyProfileAvatar', initials);
      setText('psyProfileName', name);
      setText('psyProfileSpec', data.specialization || '');
      setVal('psyProfileFullName', data.full_name || '');
      setVal('psyProfileSpecInput', data.specialization || '');
      setVal('psyProfileEmail', currentUser?.email || '');
      setVal('psyProfileRegNum', data.reg_number || '');
      setVal('psyProfileExp', data.experience_years || '');
      setVal('psyProfileFee', data.consultation_fee || '');
      setVal('psyProfileBio', data.bio || '');
    }
  } catch(e) {}

  // Load appointments
  await loadPsychiatristAppointments();
  showToast('Welcome back, Doctor!');
}

async function loadPsychiatristAppointments() {
  try {
    const { ok, data } = await apiCall('/appointments/psychiatrist/');
    if (!ok) return;

    psyApptsCache = data;
    const today   = new Date().toDateString();

    const todayAppts    = data.filter(a => new Date(a.appt_date).toDateString() === today);
    const pendingAppts  = data.filter(a => a.status === 'pending');
    const completedAppts = data.filter(a => a.status === 'completed');
    const uniquePatients = [...new Set(data.map(a => a.patient))];

    setText('psyTodayCount', todayAppts.length);
    setText('psyTotalPatients', uniquePatients.length);
    setText('psyCompletedCount', completedAppts.length);
    setText('psyPendingCount', pendingAppts.length);
    setText('psyApptBadge', pendingAppts.length);
    setText('psyTodayDate', new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));

    // Today's schedule
    const todayEl = document.getElementById('psyTodaySchedule');
    if (todayEl) {
      todayEl.innerHTML = todayAppts.length === 0
        ? '<div style="text-align:center;color:var(--gray-400);padding:24px;">No appointments today</div>'
        : todayAppts.map(a => `
          <div class="patient-item">
            <div class="patient-avatar" style="background:linear-gradient(135deg,#6366f1,#3b9ede);">${String(a.patient).slice(0,2).toUpperCase()}</div>
            <div class="patient-info">
              <div class="p-name">Patient #${a.patient}</div>
              <div class="p-meta">${formatTime(a.appt_time)} &nbsp;·&nbsp; ${a.type.replace('_',' ')}</div>
            </div>
            <span class="badge ${getBadgeClass(a.status)}">${a.status}</span>
          </div>`).join('');
    }

    // Upcoming list
    const upcomingEl = document.getElementById('psyUpcomingList');
    const upcoming   = data.filter(a => isUpcoming(a.appt_date) && a.status !== 'completed' && a.status !== 'cancelled');
    if (upcomingEl) {
      upcomingEl.innerHTML = upcoming.length === 0
        ? '<div style="text-align:center;color:var(--gray-400);padding:24px;">No upcoming appointments</div>'
        : upcoming.slice(0, 5).map(a => `
          <div class="patient-item">
            <div class="patient-info">
              <div class="p-name">Patient #${a.patient}</div>
              <div class="p-meta">${formatDate(a.appt_date)} &nbsp;·&nbsp; ${formatTime(a.appt_time)}</div>
            </div>
            <span class="badge ${getBadgeClass(a.status)}">${a.status}</span>
          </div>`).join('');
    }

    // Schedule table
    const scheduleBody = document.getElementById('psyScheduleBody');
    if (scheduleBody) {
      scheduleBody.innerHTML = data.length === 0
        ? '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px;">No appointments found</td></tr>'
        : data.map(a => `
          <tr>
            <td>${formatDate(a.appt_date)}</td>
            <td>${formatTime(a.appt_time)}</td>
            <td>Patient #${a.patient}</td>
            <td>${a.type.replace('_',' ')}</td>
            <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
            <td>
              <button class="btn-sm btn-success" onclick="updateApptStatus(${a.id}, 'confirmed')" style="font-size:11px;padding:5px 10px;">Confirm</button>
              &nbsp;
              <button class="btn-sm btn-outline" onclick="updateApptStatus(${a.id}, 'completed')" style="font-size:11px;padding:5px 10px;">Complete</button>
            </td>
          </tr>`).join('');
    }

    // All appointments table
    const apptBody = document.getElementById('psyAppointmentsBody');
    if (apptBody) {
      apptBody.innerHTML = data.length === 0
        ? '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px;">No appointments found</td></tr>'
        : data.map(a => `
          <tr>
            <td>Patient #${a.patient}</td>
            <td>${formatDate(a.appt_date)}</td>
            <td>${formatTime(a.appt_time)}</td>
            <td>${a.type.replace('_',' ')}</td>
            <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
            <td>
              <select onchange="updateApptStatus(${a.id}, this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid var(--gray-200);font-size:12px;">
                <option value="">Change status</option>
                <option value="confirmed">Confirm</option>
                <option value="completed">Complete</option>
                <option value="cancelled">Cancel</option>
              </select>
            </td>
          </tr>`).join('');
    }

    // Patient list — unique patients from appointments
    const patientsBody = document.getElementById('psyPatientsBody');
    if (patientsBody) {
      const seen    = new Set();
      const unique  = data.filter(a => { if (seen.has(a.patient)) return false; seen.add(a.patient); return true; });
      patientsBody.innerHTML = unique.length === 0
        ? '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:24px;">No patients yet</td></tr>'
        : unique.map(a => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px;">
                <div class="patient-avatar" style="width:32px;height:32px;font-size:11px;background:linear-gradient(135deg,#6366f1,#3b9ede);">${String(a.patient).slice(0,2).toUpperCase()}</div>
                Patient #${a.patient}
              </div>
            </td>
            <td>${a.complaint || '--'}</td>
            <td>${formatDate(a.appt_date)}</td>
            <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
          </tr>`).join('');
    }

  } catch(e) {}
}

async function updateApptStatus(apptId, newStatus) {
  if (!newStatus) return;
  try {
    const { ok } = await apiCall(`/appointments/${apptId}/status/`, 'PUT', { status: newStatus });
    if (ok) {
      showToast(`Appointment ${newStatus}!`);
      loadPsychiatristAppointments();
    } else {
      showToast('Failed to update status');
    }
  } catch(e) {
    showToast('Cannot connect to server.');
  }
}

function filterPsyPatients() {
  const q    = document.getElementById('psyPatientSearch')?.value.toLowerCase();
  const rows = document.querySelectorAll('#psyPatientsBody tr');
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

async function savePsyProfile() {
  try {
    const { ok } = await apiCall('/users/psychiatrist/profile/', 'PUT', {
      full_name:        document.getElementById('psyProfileFullName')?.value || '',
      specialization:   document.getElementById('psyProfileSpecInput')?.value || '',
      reg_number:       document.getElementById('psyProfileRegNum')?.value || '',
      experience_years: parseInt(document.getElementById('psyProfileExp')?.value) || 0,
      consultation_fee: parseFloat(document.getElementById('psyProfileFee')?.value) || 0,
      bio:              document.getElementById('psyProfileBio')?.value || ''
    });
    showToast(ok ? 'Profile updated successfully!' : 'Failed to update profile.');
    if (ok) loadPsychiatristDashboard();
  } catch(e) {
    showToast('Cannot connect to server.');
  }
}

// ===================== ADMIN DASHBOARD =====================
async function loadAdminDashboard() {
  const email    = currentUser?.email || 'Admin';
  const initials = getInitials(email);
  setText('adminSidebarName', email);
  setText('adminAvatarInitials', initials);

  await loadAdminAnalytics();
  showToast('Welcome, Administrator!');
}

async function loadAdminAnalytics() {
  try {
    const { ok, data } = await apiCall('/admin-panel/analytics/');
    if (ok) {
      setText('adminTotalPatients', data.total_patients);
      setText('adminTotalDoctors',  data.total_psychiatrists);
      setText('adminTotalAppts',    data.total_appointments);
      setText('adminPendingAppts',  data.pending_appointments);
      setText('adminPendingBadge',  data.pending_appointments);

      const breakdown = document.getElementById('adminStatusBreakdown');
      if (breakdown) {
        const items = [
          { label: 'Pending',   value: data.pending_appointments,   color: '#f59e0b' },
          { label: 'Confirmed', value: data.confirmed_appointments,  color: '#10b981' },
          { label: 'Completed', value: data.completed_appointments,  color: '#06b6d4' },
          { label: 'Cancelled', value: data.cancelled_appointments,  color: '#ef4444' },
        ];
        const total = data.total_appointments || 1;
        breakdown.innerHTML = items.map(item => `
          <div class="analytics-bar-wrap">
            <div class="analytics-bar-label">
              <span style="display:flex;align-items:center;gap:6px;">
                <span style="width:8px;height:8px;border-radius:50%;background:${item.color};display:inline-block;"></span>
                ${item.label}
              </span>
              <span>${item.value}</span>
            </div>
            <div class="analytics-bar-bg">
              <div class="analytics-bar-fill" style="width:${Math.round((item.value/total)*100)}%;background:${item.color};"></div>
            </div>
          </div>`).join('');
      }
    }
  } catch(e) {}
}

async function loadAdminDoctors() {
  try {
    const { ok, data } = await apiCall('/admin-panel/doctors/');
    if (!ok) return;
    allDoctorsCache = data;
    renderAdminDoctors(data);
  } catch(e) {}
}

function renderAdminDoctors(data) {
  const body = document.getElementById('adminDoctorsBody');
  if (!body) return;
  body.innerHTML = data.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px;">No doctors found</td></tr>'
    : data.map(doc => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="patient-avatar" style="width:32px;height:32px;font-size:11px;background:linear-gradient(135deg,#6366f1,#3b9ede);">${getInitials(doc.full_name)}</div>
            ${doc.full_name}
          </div>
        </td>
        <td>${doc.specialization}</td>
        <td>${doc.experience_years} yrs</td>
        <td>₹${doc.consultation_fee}</td>
        <td><span class="badge ${doc.is_active ? 'badge-green' : 'badge-red'}">${doc.is_active ? 'Active' : 'Inactive'}</span></td>
        <td>
          <button class="btn-sm btn-outline" onclick="toggleDoctorStatus(${doc.id})" style="font-size:12px;">
            ${doc.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </td>
      </tr>`).join('');
}

async function toggleDoctorStatus(doctorId) {
  try {
    const { ok, data } = await apiCall(`/admin-panel/doctors/${doctorId}/toggle/`, 'PUT');
    if (ok) {
      showToast(`Doctor ${data.is_active ? 'activated' : 'deactivated'}`);
      loadAdminDoctors();
    }
  } catch(e) {}
}

function filterAdminDoctors() {
  const q = document.getElementById('adminDoctorSearch')?.value.toLowerCase();
  const filtered = allDoctorsCache.filter(d =>
    d.full_name.toLowerCase().includes(q) || d.specialization.toLowerCase().includes(q)
  );
  renderAdminDoctors(filtered);
}

async function loadAdminPatients() {
  try {
    const { ok, data } = await apiCall('/admin-panel/patients/');
    if (!ok) return;
    allPatientsCache = data;
    renderAdminPatients(data);
  } catch(e) {}
}

function renderAdminPatients(data) {
  const body = document.getElementById('adminPatientsBody');
  if (!body) return;
  body.innerHTML = data.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:var(--gray-400);padding:24px;">No patients found</td></tr>'
    : data.map(p => `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="patient-avatar" style="width:32px;height:32px;font-size:11px;background:linear-gradient(135deg,#059669,#0891b2);">${getInitials(p.full_name || p.email)}</div>
            ${p.full_name || 'No name set'}
          </div>
        </td>
        <td>${p.email}</td>
        <td>${p.phone || '--'}</td>
        <td><span class="badge ${p.is_active ? 'badge-green' : 'badge-gray'}">${p.is_active ? 'Active' : 'Inactive'}</span></td>
      </tr>`).join('');
}

function filterAdminPatients() {
  const q = document.getElementById('adminPatientSearch')?.value.toLowerCase();
  const filtered = allPatientsCache.filter(p =>
    (p.full_name || '').toLowerCase().includes(q) || p.email.toLowerCase().includes(q)
  );
  renderAdminPatients(filtered);
}

async function loadAdminAppointments() {
  try {
    const { ok, data } = await apiCall('/admin-panel/appointments/');
    if (!ok) return;
    allApptsCache = data;
    renderAdminAppointments(data);
  } catch(e) {}
}

function renderAdminAppointments(data) {
  const body = document.getElementById('adminAppointmentsBody');
  if (!body) return;
  body.innerHTML = data.length === 0
    ? '<tr><td colspan="6" style="text-align:center;color:var(--gray-400);padding:24px;">No appointments found</td></tr>'
    : data.map(a => `
      <tr>
        <td>${a.patient}</td>
        <td>${a.psychiatrist}</td>
        <td>${formatDate(a.appt_date)}</td>
        <td>${a.type.replace('_', ' ')}</td>
        <td><span class="badge ${getBadgeClass(a.status)}">${a.status}</span></td>
        <td>
          <select onchange="adminUpdateApptStatus(${a.id}, this.value)" style="padding:5px 8px;border-radius:6px;border:1px solid var(--gray-200);font-size:12px;">
            <option value="">Change</option>
            <option value="confirmed">Confirm</option>
            <option value="completed">Complete</option>
            <option value="cancelled">Cancel</option>
          </select>
        </td>
      </tr>`).join('');
}

async function adminUpdateApptStatus(apptId, newStatus) {
  if (!newStatus) return;
  try {
    const { ok } = await apiCall(`/admin-panel/appointments/${apptId}/status/`, 'PUT', { status: newStatus });
    if (ok) {
      showToast(`Appointment ${newStatus}!`);
      loadAdminAppointments();
      loadAdminAnalytics();
    }
  } catch(e) {}
}

function exportPatients() {
  if (!allPatientsCache.length) { showToast('No data to export'); return; }
  const csv = ['Name,Email,Phone,Status',
    ...allPatientsCache.map(p => `${p.full_name || ''},${p.email},${p.phone || ''},${p.is_active ? 'Active' : 'Inactive'}`)
  ].join('\n');
  downloadCSV(csv, 'patients.csv');
}

function exportAppointments() {
  if (!allApptsCache.length) { showToast('No data to export'); return; }
  const csv = ['Patient,Doctor,Date,Type,Status',
    ...allApptsCache.map(a => `${a.patient},${a.psychiatrist},${a.appt_date},${a.type},${a.status}`)
  ].join('\n');
  downloadCSV(csv, 'appointments.csv');
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ===================== TAB NAVIGATION =====================
function switchTab(prefix, tab, el) {
  const dashId = getDashId(prefix);
  document.querySelectorAll(`#${dashId} .tab-panel`).forEach(p => p.classList.remove('active'));
  document.querySelectorAll(`#${dashId} .nav-item`).forEach(n => n.classList.remove('active'));
  el.classList.add('active');
  const panel = document.getElementById(`${prefix}-${tab}`);
  if (panel) panel.classList.add('active');
  const titleEl = document.getElementById(`${getTitleId(prefix)}PageTitle`);
  if (titleEl) titleEl.textContent = el.querySelector('.nav-label').textContent;
  closeSidebar(prefix);

  // Load data on tab switch
  if (prefix === 'patient') {
    if (tab === 'appointments') loadPatientAppointments();
    if (tab === 'doctors')     loadDoctorProfiles();
    if (tab === 'profile')     {} // already loaded on dashboard load
  }
  if (prefix === 'psy') {
    if (tab === 'schedule' || tab === 'appointments' || tab === 'patients') loadPsychiatristAppointments();
  }
  if (prefix === 'admin') {
    if (tab === 'analytics')    loadAdminAnalytics();
    if (tab === 'doctors')      loadAdminDoctors();
    if (tab === 'patients')     loadAdminPatients();
    if (tab === 'appointments') loadAdminAppointments();
  }
}

function switchTabByName(prefix, tab) {
  const dashId = getDashId(prefix);
  const tabMap = {
    home:         'Home & Awareness',
    book:         'Book Appointment',
    appointments: 'My Appointments',
    doctors:      'Psychiatrist Profiles',
    profile:      'My Profile',
    analytics:    'Analytics Overview',
    patients:     'Manage Patients',
  };
  document.querySelectorAll(`#${dashId} .nav-item`).forEach(item => {
    const label = item.querySelector('.nav-label');
    if (!label) return;
    if (label.textContent.trim() === tabMap[tab]) {
      switchTab(prefix, tab, item);
    }
  });
}

// ===================== SIDEBAR =====================
function toggleSidebar(prefix) {
  const sidebar = document.getElementById(getSidebarId(prefix));
  const overlay = document.getElementById(getOverlayId(prefix));
  sidebar.classList.toggle('open');
  overlay.classList.toggle('show');
}

function closeSidebar(prefix) {
  const sidebar = document.getElementById(getSidebarId(prefix));
  const overlay = document.getElementById(getOverlayId(prefix));
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
}

// ===================== TOAST =====================
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ===================== DOM SHORTCUTS =====================
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value || '';
}
