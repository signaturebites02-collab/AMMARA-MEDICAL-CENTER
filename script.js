const STORAGE = {
  doctors: "ammara_doctors_v1",
  patients: "ammara_patients_v1"
};

let doctors = JSON.parse(localStorage.getItem(STORAGE.doctors) || "[]");
let patients = JSON.parse(localStorage.getItem(STORAGE.patients) || "[]");

const $ = id => document.getElementById(id);

function save() {
  localStorage.setItem(STORAGE.doctors, JSON.stringify(doctors));
  localStorage.setItem(STORAGE.patients, JSON.stringify(patients));
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getTokenNumber(doctorId) {
  const today = todayKey();
  const count = patients.filter(p => p.doctorId === doctorId && p.date === today).length;
  return String(count + 1).padStart(3, "0");
}

function renderDoctors() {
  const list = $("doctorList");
  const select = $("patientDoctor");
  list.innerHTML = "";
  select.innerHTML = '<option value="">Select active doctor</option>';

  doctors.forEach(d => {
    const row = document.createElement("div");
    row.className = "doctor";
    row.innerHTML = `
      <div>
        <div class="doctor-name">${escapeHtml(d.name)}</div>
        <small>${d.active ? "Available for new patients" : "Currently off"}</small>
      </div>
      <div>
        <span class="status ${d.active ? "on" : "off"}">${d.active ? "ON" : "OFF"}</span>
        <button onclick="toggleDoctor('${d.id}')">${d.active ? "Turn OFF" : "Turn ON"}</button>
        <button class="delete-btn" onclick="deleteDoctor('${d.id}')">Delete</button>
      </div>`;
    list.appendChild(row);

    if (d.active) {
      const option = document.createElement("option");
      option.value = d.id;
      option.textContent = d.name;
      select.appendChild(option);
    }
  });

  $("doctorCount").textContent = doctors.filter(d => d.active).length;
}

function renderPatients() {
  const body = $("recordsBody");
  const q = $("search").value.trim().toLowerCase();
  body.innerHTML = "";

  const filtered = patients.filter(p =>
    [p.name, p.gender, p.doctor, p.date, p.token].join(" ").toLowerCase().includes(q)
  ).sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

  if (!filtered.length) {
    body.innerHTML = '<tr><td colspan="8" class="empty">No patient records found.</td></tr>';
  } else {
    filtered.forEach(p => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(p.name)}</td>
        <td>${p.age}</td>
        <td>${escapeHtml(p.gender)}</td>
        <td>${escapeHtml(p.doctor)}</td>
        <td>${p.date}</td>
        <td>${p.time}</td>
        <td><strong>${p.token}</strong></td>
        <td><button class="delete-btn" onclick="deletePatient('${p.id}')">Delete</button></td>`;
      body.appendChild(tr);
    });
  }

  const todayPatients = patients.filter(p => p.date === todayKey());
  $("patientCount").textContent = todayPatients.length;

  const active = doctors.filter(d => d.active);
  $("nextToken").textContent = active.length ? getTokenNumber(active[0].id) : "---";
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}

window.toggleDoctor = function(id) {
  const d = doctors.find(x => x.id === id);
  if (!d) return;
  d.active = !d.active;
  save();
  renderDoctors();
  renderPatients();
};

window.deleteDoctor = function(id) {
  const hasPatients = patients.some(p => p.doctorId === id);
  if (hasPatients && !confirm("This doctor has patient records. Delete doctor anyway? Records will remain.")) return;
  doctors = doctors.filter(d => d.id !== id);
  save();
  renderDoctors();
  renderPatients();
};

window.deletePatient = function(id) {
  if (!confirm("Delete this patient record?")) return;
  patients = patients.filter(p => p.id !== id);
  save();
  renderPatients();
};

$("addDoctorBtn").addEventListener("click", () => {
  const name = $("doctorName").value.trim();
  if (!name) return alert("Please enter doctor name.");

  doctors.push({
    id: crypto.randomUUID(),
    name,
    active: true
  });

  $("doctorName").value = "";
  save();
  renderDoctors();
  renderPatients();
});

$("patientForm").addEventListener("submit", e => {
  e.preventDefault();

  const doctor = doctors.find(d => d.id === $("patientDoctor").value);
  if (!doctor || !doctor.active) {
    return alert("Please select an active doctor.");
  }

  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = now.toLocaleTimeString([], {hour: "2-digit", minute: "2-digit"});
  const token = getTokenNumber(doctor.id);

  const patient = {
    id: crypto.randomUUID(),
    name: $("patientName").value.trim(),
    age: Number($("patientAge").value),
    gender: $("patientGender").value,
    doctorId: doctor.id,
    doctor: doctor.name,
    date,
    time,
    token,
    createdAt: now.toISOString()
  };

  patients.push(patient);
  save();

  $("newToken").textContent = token;
  $("tokenDoctor").textContent = doctor.name;
  $("tokenResult").classList.remove("hidden");

  $("patientForm").reset();
  renderPatients();
});

$("search").addEventListener("input", renderPatients);

$("clearAllBtn").addEventListener("click", () => {
  if (!confirm("This will permanently delete all patient records from this browser. Continue?")) return;
  patients = [];
  save();
  renderPatients();
});

if (doctors.length === 0) {
  doctors = [
    {id: crypto.randomUUID(), name: "Doctor 1", active: true},
    {id: crypto.randomUUID(), name: "Doctor 2", active: true},
    {id: crypto.randomUUID(), name: "Doctor 3", active: true},
    {id: crypto.randomUUID(), name: "Doctor 4", active: true}
  ];
  save();
}

renderDoctors();
renderPatients();
