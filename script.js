const DOCTORS_KEY="ammara_doctors_v2", PATIENTS_KEY="ammara_patients_v2", PASS_KEY="ammara_password_v2";
let doctors=JSON.parse(localStorage.getItem(DOCTORS_KEY)||"null")||[
  {id:1,name:"Doctor 1",active:true},{id:2,name:"Doctor 2",active:true},
  {id:3,name:"Doctor 3",active:true},{id:4,name:"Doctor 4",active:true}
];
let patients=JSON.parse(localStorage.getItem(PATIENTS_KEY)||"[]");
if(localStorage.getItem(DOCTORS_KEY)===null) saveDoctors();
if(localStorage.getItem(PASS_KEY)===null) localStorage.setItem(PASS_KEY,"1234");

function $(id){return document.getElementById(id)}
function saveDoctors(){localStorage.setItem(DOCTORS_KEY,JSON.stringify(doctors))}
function savePatients(){localStorage.setItem(PATIENTS_KEY,JSON.stringify(patients))}
function today(){return new Date().toISOString().slice(0,10)}
function login(){
  if($("loginPassword").value===localStorage.getItem(PASS_KEY)){
    $("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");init();
  }else $("loginError").textContent="Wrong password";
}
function logout(){$("app").classList.add("hidden");$("loginScreen").classList.remove("hidden");$("loginPassword").value=""}
function init(){
  $("recordDate").value=today(); renderDoctors(); renderDoctorSelect(); renderStats(); renderRecords();
}
function addDoctor(){
  const name=$("doctorName").value.trim(); if(!name)return alert("Doctor name enter karein");
  doctors.push({id:Date.now(),name,active:true});saveDoctors();$("doctorName").value="";
  renderDoctors();renderDoctorSelect();renderStats();
}
function renderDoctors(){
  $("doctorList").innerHTML=doctors.length?doctors.map(d=>`
    <div class="doctor-row">
      <div class="doctor-info"><b>${esc(d.name)}</b><span class="badge ${d.active?"":"off"}">${d.active?"ON":"OFF"}</span></div>
      <div class="doctor-actions">
        <button class="secondary" onclick="editDoctor(${d.id})">Edit Name</button>
        <button onclick="toggleDoctor(${d.id})">${d.active?"Turn OFF":"Turn ON"}</button>
        <button class="danger" onclick="deleteDoctor(${d.id})">Delete</button>
      </div>
    </div>`).join(""):"<p>No doctors added.</p>";
}
function editDoctor(id){
  const d=doctors.find(x=>x.id===id); if(!d)return;
  const n=prompt("New doctor name:",d.name); if(n&&n.trim()){const old=d.name;d.name=n.trim();patients.forEach(p=>{if(p.doctor===old)p.doctor=d.name});saveDoctors();savePatients();renderDoctors();renderDoctorSelect();renderRecords();renderStats()}
}
function toggleDoctor(id){const d=doctors.find(x=>x.id===id);if(d){d.active=!d.active;saveDoctors();renderDoctors();renderDoctorSelect();renderStats()}}
function deleteDoctor(id){
  const d=doctors.find(x=>x.id===id);if(!d)return;
  if(patients.some(p=>p.doctor===d.name))return alert("Is doctor ke patient records hain, delete nahi kar sakte. Pehle OFF karein.");
  if(confirm("Delete "+d.name+"?")){doctors=doctors.filter(x=>x.id!==id);saveDoctors();renderDoctors();renderDoctorSelect();renderStats()}
}
function renderDoctorSelect(){
  const active=doctors.filter(d=>d.active);
  $("patientDoctor").innerHTML=active.length?'<option value="">Select doctor</option>'+active.map(d=>`<option>${esc(d.name)}</option>`).join(""):'<option value="">No active doctor</option>';
}
function savePatient(){
  const name=$("patientName").value.trim(), age=$("patientAge").value.trim(), gender=$("patientGender").value, doctor=$("patientDoctor").value;
  if(!name||!age||!gender||!doctor)return alert("Name, Age, Gender aur Doctor fill karein");
  const now=new Date(), date=today(), time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  const count=patients.filter(p=>p.date===date&&p.doctor===doctor).length+1;
  const token=String(count).padStart(3,"0");
  const p={id:Date.now(),name,age,gender,doctor,date,time,token};
  patients.push(p);savePatients();
  $("tokenNumber").textContent=token;$("tokenDoctor").textContent=doctor;$("tokenResult").classList.remove("hidden");
  $("patientName").value="";$("patientAge").value="";$("patientGender").value="";$("patientDoctor").value="";
  fillReceipt(p);renderStats();renderRecords();
}
function fillReceipt(p){
  $("printToken").textContent=p.token;$("printPatient").textContent=p.name;$("printAge").textContent=p.age;
  $("printGender").textContent=p.gender;$("printDoctor").textContent=p.doctor;$("printDate").textContent=p.date;$("printTime").textContent=p.time;
}
function printToken(){window.print()}
function renderStats(){
  const t=today(), tp=patients.filter(p=>p.date===t);
  $("activeDoctors").textContent=doctors.filter(d=>d.active).length;$("todayPatients").textContent=tp.length;
  const selected=$("patientDoctor").value, doc=selected||doctors.find(d=>d.active)?.name;
  $("nextToken").textContent=doc?String(tp.filter(p=>p.doctor===doc).length+1).padStart(3,"0"):"001";
}
function renderRecords(){
  const date=$("recordDate").value||today(), q=($("searchInput").value||"").toLowerCase();
  const rows=patients.filter(p=>p.date===date&&[p.name,p.doctor,p.gender,p.token].join(" ").toLowerCase().includes(q));
  $("recordsBody").innerHTML=rows.length?rows.map(p=>`<tr><td><b>${esc(p.token)}</b></td><td>${esc(p.name)}</td><td>${esc(p.age)}</td><td>${esc(p.gender)}</td><td>${esc(p.doctor)}</td><td>${p.date}</td><td>${esc(p.time)}</td><td><button class="danger" onclick="deletePatient(${p.id})">Delete</button></td></tr>`).join(""):'<tr><td colspan="8">No records found.</td></tr>';
}
function deletePatient(id){if(confirm("Delete this patient record?")){patients=patients.filter(p=>p.id!==id);savePatients();renderRecords();renderStats()}}
function exportCSV(){
  const date=$("recordDate").value||today(), rows=patients.filter(p=>p.date===date);
  const head=["Token","Name","Age","Gender","Doctor","Date","Time"];
  const csv=[head,...rows.map(p=>[p.token,p.name,p.age,p.gender,p.doctor,p.date,p.time])].map(r=>r.map(csvCell).join(",")).join("\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`ammara-patients-${date}.csv`;a.click();
}
function csvCell(v){return '"'+String(v??"").replaceAll('"','""')+'"'}
function openSettings(){$("settingsModal").classList.remove("hidden");$("settingsMessage").textContent=""}
function closeSettings(){$("settingsModal").classList.add("hidden")}
function changePassword(){
  if($("oldPassword").value!==localStorage.getItem(PASS_KEY))return $("settingsMessage").textContent="Current password wrong";
  const n=$("newPassword").value.trim();if(n.length<4)return $("settingsMessage").textContent="New password at least 4 characters";
  localStorage.setItem(PASS_KEY,n);$("oldPassword").value="";$("newPassword").value="";$("settingsMessage").textContent="Password changed successfully";
}
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
