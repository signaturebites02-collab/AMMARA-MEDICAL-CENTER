const K={
  doctors:"ammara_doctors_final",patients:"ammara_patients_final",procedures:"ammara_procedures_final",
  services:"ammara_services_final",labs:"ammara_labs_final",tests:"ammara_tests_final",expenses:"ammara_expenses_final",
  pass:"ammara_password_final",shifts:"ammara_shifts_final",closings:"ammara_shift_closings_final",manualShift:"ammara_manual_shift_mode_final"
};
function load(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function $(id){return document.getElementById(id)}
function today(){return new Date().toISOString().slice(0,10)}
function money(n){return "Rs. "+Number(n||0).toLocaleString("en-PK")}
function esc(v){return String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function timeNow(){return new Date().toTimeString().slice(0,5)}
function inRange(t,s,e){if(s===e)return true;return s<e?t>=s&&t<e:t>=s||t<e}
let doctors=load(K.doctors,[{id:1,name:"Doctor 1",active:true},{id:2,name:"Doctor 2",active:true},{id:3,name:"Doctor 3",active:true},{id:4,name:"Doctor 4",active:true}]);
doctors.forEach(d=>{delete d.fee});
let patients=load(K.patients,[]),procedures=load(K.procedures,[]),services=load(K.services,[{id:1,name:"BP Check",fee:100},{id:2,name:"Sugar Check",fee:150},{id:3,name:"Injection",fee:200},{id:4,name:"Dressing",fee:300}]);
let labs=load(K.labs,[]),tests=load(K.tests,[{id:1,name:"CBC",fee:500},{id:2,name:"LFT",fee:800},{id:3,name:"RFT",fee:700},{id:4,name:"Blood Sugar",fee:200},{id:5,name:"Urine R/E",fee:300}]);
let expenses=load(K.expenses,[]),closings=load(K.closings,[]);
let manualShiftMode=localStorage.getItem(K.manualShift)==="1";
let shifts=load(K.shifts,{morningStart:"08:00",morningEnd:"14:00",eveningStart:"14:00",eveningEnd:"20:00",nightStart:"20:00",nightEnd:"08:00"});
// Upgrade older 2-shift settings to 3 shifts without losing saved times.
if(!shifts.nightStart){shifts={morningStart:shifts.morningStart||"08:00",morningEnd:shifts.morningEnd||"14:00",eveningStart:shifts.eveningStart||"14:00",eveningEnd:shifts.eveningEnd||"20:00",nightStart:"20:00",nightEnd:"08:00"};save(K.shifts,shifts)}
if(localStorage.getItem(K.pass)===null)localStorage.setItem(K.pass,"1234");
migrateOldShiftData();

function shiftForTime(t=timeNow()){
  if(inRange(t,shifts.morningStart,shifts.morningEnd))return "Morning";
  if(inRange(t,shifts.eveningStart,shifts.eveningEnd))return "Evening";
  return "Night";
}
function getShift(){return shiftForTime()}
function normalizeTime(t){
  const m=String(t||"").match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if(!m)return timeNow();
  let h=Number(m[1]); const ap=(m[3]||"").toUpperCase();
  if(ap){if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0}
  return String(h).padStart(2,"0")+":"+m[2];
}
function shiftBusinessDate(s,date=today(),t=timeNow()){
  const d=new Date(date+"T12:00:00"); const nt=normalizeTime(t);
  if(s==="Night"&&shifts.nightStart>shifts.nightEnd&&nt<shifts.nightEnd)d.setDate(d.getDate()-1);
  return d.toISOString().slice(0,10);
}
function shiftKey(d,s){return d+"|"+s}
function inferShiftFromStoredTime(v){
  if(!v)return getShift();
  const m=String(v).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if(!m)return getShift();
  let h=Number(m[1]); const ap=(m[3]||"").toUpperCase();
  if(ap){if(ap==="PM"&&h<12)h+=12;if(ap==="AM"&&h===12)h=0}
  const t=String(h).padStart(2,"0")+":"+m[2]; return shiftForTime(t);
}
function migrateOldShiftData(){
  let changed=false;
  [procedures,labs,expenses].forEach(arr=>arr.forEach(r=>{if(!r.shift){r.shift=inferShiftFromStoredTime(r.time);r.shiftKey=shiftKey(shiftBusinessDate(r.shift,r.date,r.time),r.shift);changed=true}}));
  if(changed){save(K.procedures,procedures);save(K.labs,labs);save(K.expenses,expenses)}
}
function getRecordShift(r){return r.shift||"Unknown"}
function totalOf(r){return Number(r.amount??r.fee??0)}
function paidOf(r){return Number(r.paid??totalOf(r))}
function creditOf(r){return Math.max(0,Number(r.credit??(totalOf(r)-paidOf(r))))}

function login(){if($("loginPassword").value===localStorage.getItem(K.pass)){$("loginScreen").classList.add("hidden");$("app").classList.remove("hidden");init()}else $("loginError").textContent="Wrong password"}
function logout(){$("app").classList.add("hidden");$("loginScreen").classList.remove("hidden");$("loginPassword").value=""}
function init(){
  const d=today();
  ["dashboardDate","procDate","labDate","expenseDate","recordFrom","recordTo","closingFrom","closingTo"].forEach(id=>{if($(id)&&!$(id).value)$(id).value=d});
  renderAll();
  syncShiftSelectors();
  setInterval(()=>{renderShift();renderDashboard();renderClosingSummary()},30000);
}
function renderAll(){syncShiftSelectors();renderShift();renderDoctors();renderDoctorSelect();renderProcedures();renderProcedureSelect();renderTests();renderTestSelect();renderExpenses();renderDashboard();renderRecords();renderClosingShiftOptions();renderClosingSummary()}
function showTab(id,btn){document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");if(id==="shiftClosing")renderClosingSummary()}

function renderShift(){
  const s=getShift();
  if($("shiftBadge"))$("shiftBadge").textContent="Current Shift: "+s.toUpperCase();
  if($("currentShiftText"))$("currentShiftText").textContent="Current shift: "+s.toUpperCase();
}

function addDoctor(){let n=$("doctorName").value.trim();if(!n)return alert("Doctor name enter karein");doctors.push({id:Date.now(),name:n,active:true});save(K.doctors,doctors);$("doctorName").value="";renderDoctors();renderDoctorSelect()}
function renderDoctors(){$("doctorList").innerHTML=doctors.length?doctors.map(d=>`<div class="doctor-row"><div><b>${esc(d.name)}</b> <span class="badge ${d.active?"":"off"}">${d.active?"ON":"OFF"}</span></div><div class="doctor-actions"><button class="secondary" onclick="editDoctor(${d.id})">Edit</button><button onclick="toggleDoctor(${d.id})">${d.active?"Turn OFF":"Turn ON"}</button><button class="danger" onclick="deleteDoctor(${d.id})">Delete</button></div></div>`).join(""):"<p>No doctors.</p>"}
function editDoctor(id){let d=doctors.find(x=>x.id===id);if(!d)return;let n=prompt("Doctor name:",d.name);if(n===null)return;if(!n.trim())return alert("Doctor name required");d.name=n.trim();patients.forEach(p=>{if(p.doctorId===id)p.doctor=d.name});save(K.doctors,doctors);save(K.patients,patients);renderAll()}
function toggleDoctor(id){let d=doctors.find(x=>x.id===id);if(d){d.active=!d.active;save(K.doctors,doctors);renderDoctors();renderDoctorSelect()}}
function deleteDoctor(id){if(confirm("Delete doctor?")){doctors=doctors.filter(x=>x.id!==id);save(K.doctors,doctors);renderAll()}}
function renderDoctorSelect(){let a=doctors.filter(d=>d.active);$("patientDoctor").innerHTML=a.length?'<option value="">Select doctor</option>'+a.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join(""):'<option value="">No active doctor</option>'}

function selectedShift(id){const el=$(id); if(manualShiftMode && el && el.value && el.value!=="AUTO") return el.value; return getShift()}
function syncShiftSelectors(){["patientShift","procShift","labShift","expenseShift"].forEach(id=>{const el=$(id);if(!el)return;el.disabled=!manualShiftMode;if(!manualShiftMode)el.value="AUTO"});const m=$("manualShiftMode");if(m)m.checked=manualShiftMode}
function updateShiftMode(){syncShiftSelectors();}
function toggleManualShiftMode(){
  const box=$("manualShiftMode"); manualShiftMode=!!(box&&box.checked);
  localStorage.setItem(K.manualShift,manualShiftMode?"1":"0");
  syncShiftSelectors(); renderShift(); renderClosingSummary();
  const msg=$("settingsMessage"); if(msg)msg.textContent=manualShiftMode?"Manual Shift Selection ON — OPD / Procedure / Lab / Expense mein shift select kar sakte hain.":"Manual Shift Selection OFF — current time se shift automatic hogi.";
}
function savePatient(){
  let n=$("patientName").value.trim(),age=$("patientAge").value.trim(),g=$("patientGender").value,d=doctors.find(x=>String(x.id)===$("patientDoctor").value);
  if(!n||!age||!g||!d)return alert("Name, Age, Gender aur Doctor fill karein");
  let sh=selectedShift("patientShift"),bd=shiftBusinessDate(sh),key=shiftKey(bd,sh),count=patients.filter(p=>p.shiftKey===key&&p.doctorId===d.id).length+1,token=String(count).padStart(3,"0"),now=new Date(),date=today(),time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  let p={id:Date.now(),name:n,age,gender:g,doctorId:d.id,doctor:d.name,fee:0,amount:0,paid:0,credit:0,shift:sh,shiftKey:key,date,time,token};
  patients.push(p);save(K.patients,patients);fillReceipt(p);window.lastTokenRecord=p;
  $("tokenNumber").textContent=token;$("tokenDoctor").textContent=d.name;$("tokenShift").textContent=sh;$("tokenResult").classList.remove("hidden");
  ["patientName","patientAge","patientGender","patientDoctor"].forEach(x=>$(x).value="");
  if($("patientShift"))$("patientShift").value=manualShiftMode?sh:"AUTO";
  renderDashboard();renderRecords();renderClosingSummary();setTimeout(()=>window.print(),120);
}
function fillReceipt(p){$("printToken").textContent=p.token;$("printPatient").textContent=p.name;$("printAge").textContent=p.age;$("printGender").textContent=p.gender;$("printDoctor").textContent=p.doctor;$("printShift").textContent=p.shift;$("printDate").textContent=p.date;$("printTime").textContent=p.time}
function printTokenReceipt(){
  const p=window.lastTokenRecord || patients[patients.length-1];
  if(!p)return alert("Pehle token generate karein.");
  fillReceipt(p);
  document.body.classList.remove("printing-lab");
  window.print();
}

function addProcedure(){let n=$("newProcedureName").value.trim(),f=Number($("newProcedureFee").value);if(!n||!Number.isFinite(f)||f<0)return alert("Service name aur fee enter karein");services.push({id:Date.now(),name:n,fee:f});save(K.services,services);$("newProcedureName").value="";$("newProcedureFee").value="";renderProcedures();renderProcedureSelect()}
function renderProcedures(){$("procedureList").innerHTML=services.map(s=>`<div class="procedure-row"><div><b>${esc(s.name)}</b> — ${money(s.fee)}</div><div class="procedure-actions"><button class="secondary" onclick="editProcedure(${s.id})">Edit</button><button class="danger" onclick="deleteService(${s.id})">Delete</button></div></div>`).join("")}
function editProcedure(id){let s=services.find(x=>x.id===id);if(!s)return;let n=prompt("Service name:",s.name);if(n===null)return;let f=prompt("Fee:",s.fee);if(f===null)return;if(n.trim()&&Number.isFinite(Number(f))){s.name=n.trim();s.fee=Number(f);save(K.services,services);renderProcedures();renderProcedureSelect()}}
function deleteService(id){if(confirm("Delete service?")){services=services.filter(x=>x.id!==id);save(K.services,services);renderProcedures();renderProcedureSelect()}}
function renderProcedureSelect(){$("procedureSelect").innerHTML='<option value="">Select procedure</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");updateProcedureFee()}
function updateProcedureFee(){let s=services.find(x=>String(x.id)===$("procedureSelect").value);$("procAmount").value=s?s.fee:"";$("procPaid").value="";updateProcedureCredit()}
function updateProcedureCredit(){let total=Number($("procAmount").value||0),paid=Number($("procPaid").value||0);$("procCredit").value=Math.max(0,total-paid)}
function saveProcedure(){let n=$("procPatient").value.trim(),s=services.find(x=>String(x.id)===$("procedureSelect").value),a=Number($("procAmount").value),paid=Number($("procPaid").value),d=$("procDate").value||today();if(!n||!s||!Number.isFinite(a)||a<0)return alert("Patient, procedure aur amount fill karein");if(!Number.isFinite(paid)||paid<0||paid>a)return alert("Paid amount sahi enter karein");let now=new Date(),shift=selectedShift("procShift");procedures.push({id:Date.now(),patient:n,procedure:s.name,amount:a,paid,credit:a-paid,shift,shiftKey:shiftKey(shiftBusinessDate(shift,d),shift),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});save(K.procedures,procedures);$("procPatient").value="";$("procedureSelect").value="";$("procAmount").value="";$("procPaid").value="";$("procCredit").value="";renderDashboard();renderRecords();renderClosingSummary()}

function addTest(){
  const nameEl=$("newTestName"),feeEl=$("newTestFee"); if(!nameEl||!feeEl)return;
  const n=nameEl.value.trim(),f=Number(feeEl.value);
  if(!n||!Number.isFinite(f)||f<0){alert("Test name aur fee enter karein");return false;}
  if(tests.some(t=>t.name.trim().toLowerCase()===n.toLowerCase())){alert("Ye test pehle se maujood hai");return false;}
  tests.push({id:Date.now()+Math.floor(Math.random()*1000),name:n,fee:f}); save(K.tests,tests);
  nameEl.value="";feeEl.value="";renderTests();renderTestSelect();return false;
}
function renderTests(){$("testList").innerHTML=tests.map(t=>`<div class="procedure-row"><div><b>${esc(t.name)}</b> — ${money(t.fee)}</div><div class="procedure-actions"><button class="secondary" onclick="editTest(${t.id})">Edit</button><button class="danger" onclick="deleteTest(${t.id})">Delete</button></div></div>`).join("")}
function editTest(id){let t=tests.find(x=>x.id===id);if(!t)return;let n=prompt("Test name:",t.name);if(n===null)return;let f=prompt("Test fee:",t.fee);if(f===null)return;if(n.trim()&&Number.isFinite(Number(f))){t.name=n.trim();t.fee=Number(f);save(K.tests,tests);renderTests();renderTestSelect()}}
function deleteTest(id){if(confirm("Delete test?")){tests=tests.filter(x=>x.id!==id);save(K.tests,tests);renderTests();renderTestSelect()}}
function renderTestSelect(){const box=$("testSelect");if(!box)return;box.innerHTML=tests.length?tests.map(t=>`<label class="test-check"><input type="checkbox" name="labTest" value="${t.id}" onchange="updateTestFee()"><span>${esc(t.name)}</span><b>${money(t.fee)}</b></label>`).join(""):"<span class=\"muted\">No tests added.</span>";updateTestFee()}
function getSelectedTests(){return [...document.querySelectorAll('input[name="labTest"]:checked')].map(el=>tests.find(t=>String(t.id)===el.value)).filter(Boolean)}
function updateTestFee(){let selected=getSelectedTests(),total=selected.reduce((sum,t)=>sum+Number(t.fee||0),0);$("labAmount").value=total||"";updateLabCredit()}
function updateLabCredit(){let total=Number($("labAmount").value||0),paid=Number($("labPaid").value||0);$("labCredit").value=Math.max(0,total-paid)}
function saveLab(){
  let n=$("labPatient").value.trim(),selected=getSelectedTests(),a=Number($("labAmount").value),paid=Number($("labPaid").value),d=$("labDate").value||today();
  if(!n||!selected.length||!Number.isFinite(a)||a<0)return alert("Patient aur kam az kam 1 test select karein");
  if(!Number.isFinite(paid)||paid<0||paid>a)return alert("Paid amount total se zyada nahi ho sakta");
  let now=new Date(),sh=selectedShift("labShift"),testNames=selected.map(t=>t.name).join(" + ");
  const rec={id:Date.now(),patient:n,test:testNames,tests:selected.map(t=>({name:t.name,fee:t.fee})),amount:a,paid,credit:a-paid,shift:sh,shiftKey:shiftKey(shiftBusinessDate(sh,d),sh),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})};
  labs.push(rec);window.lastLabRecord=rec;save(K.labs,labs);
  $("labResultPatient").textContent=rec.patient;$("labResultTests").textContent=rec.test;$("labResultTotal").textContent=rec.amount;$("labResultPaid").textContent=rec.paid;$("labResultCredit").textContent=rec.credit;$("labResult").classList.remove("hidden");
  fillLabReceipt(rec);
  $("labPatient").value="";document.querySelectorAll('input[name="labTest"]').forEach(x=>x.checked=false);$("labAmount").value="";$("labPaid").value="";$("labCredit").value="";
  renderDashboard();renderRecords();renderClosingSummary();
}
function fillLabReceipt(p){$("labPrintPatient").textContent=p.patient;$("labPrintTests").textContent=p.test;$("labPrintShift").textContent=p.shift;$("labPrintDate").textContent=p.date;$("labPrintTime").textContent=p.time;$("labPrintTotal").textContent=p.amount;$("labPrintPaid").textContent=p.paid;$("labPrintCredit").textContent=p.credit}
function printLabSlip(id){const p=labs.find(x=>x.id===id);if(!p)return;window.lastLabRecord=p;fillLabReceipt(p);document.body.classList.add("printing-lab");window.print()}
function printLastLabSlip(){const p=window.lastLabRecord;if(!p)return alert("Pehle lab/test sale save karein.");printLabSlip(p.id)}
window.addEventListener("afterprint",()=>document.body.classList.remove("printing-lab"));

function saveExpense(){let n=$("expenseName").value.trim(),a=Number($("expenseAmount").value),d=$("expenseDate").value||today();if(!n||!Number.isFinite(a)||a<0)return alert("Expense name aur amount fill karein");let now=new Date(),shift=selectedShift("expenseShift");expenses.push({id:Date.now(),name:n,amount:a,paid:a,credit:0,shift,shiftKey:shiftKey(shiftBusinessDate(shift,d),shift),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});save(K.expenses,expenses);$("expenseName").value="";$("expenseAmount").value="";renderExpenses();renderDashboard();renderRecords();renderClosingSummary()}
function renderExpenses(){$("expensesBody").innerHTML=expenses.length?expenses.slice().reverse().map(e=>`<tr><td>${e.date}</td><td>${esc(e.name)}</td><td>${money(e.amount)}</td><td>${esc(e.shift||"—")}</td><td><button class="danger" onclick="deleteExpense(${e.id})">Delete</button></td></tr>`).join(""):'<tr><td colspan="5">No expenses.</td></tr>'}
function deleteExpense(id){if(confirm("Delete expense?")){expenses=expenses.filter(x=>x.id!==id);save(K.expenses,expenses);renderExpenses();renderDashboard();renderClosingSummary()}}

function dateData(date){let op=patients.filter(p=>p.date===date),pr=procedures.filter(p=>p.date===date),la=labs.filter(p=>p.date===date),ex=expenses.filter(e=>e.date===date);return {op,pr,la,ex}}
function renderDashboard(){let d=$("dashboardDate").value||today(),x=dateData(d),ps=x.pr.reduce((a,p)=>a+totalOf(p),0),pps=x.pr.reduce((a,p)=>a+paidOf(p),0),pc=x.pr.reduce((a,p)=>a+creditOf(p),0),ls=x.la.reduce((a,p)=>a+totalOf(p),0),lps=x.la.reduce((a,p)=>a+paidOf(p),0),lc=x.la.reduce((a,p)=>a+creditOf(p),0),es=x.ex.reduce((a,p)=>a+Number(p.amount||0),0),total=ps+ls,paid=pps+lps;$("dashOpdPatients").textContent=x.op.length;$("dashProcedures").textContent=x.pr.length;$("dashLabs").textContent=x.la.length;$("dashProcedureSale").textContent=money(ps);$("dashLabSale").textContent=money(ls);$("dashTotalSale").textContent=money(total);$("dashPaid").textContent=money(paid);$("dashCredit").textContent=money(pc+lc);$("dashExpenses").textContent=money(es);$("dashNet").textContent=money(paid-es);renderShift()}

function showRecordType(type,btn){
  document.querySelectorAll('.record-tab').forEach(x=>x.classList.remove('active')); if(btn)btn.classList.add('active');
  ['tokens','procedures','labs','expenses'].forEach(x=>{const el=$('record'+x.charAt(0).toUpperCase()+x.slice(1));if(el)el.classList.toggle('hidden',x!==type)});
}
function recordFiltered(){
  const from=$('recordFrom').value||'0000-01-01',to=$('recordTo').value||today();
  const q=($('searchInput').value||'').toLowerCase(); const ok=d=>d>=from&&d<=to;
  return {from,to,q,ok};
}
function renderRecords(){
  const {from,to,q,ok}=recordFiltered();
  if(from>to){
    ['tokenRecordsBody','procedureRecordsBody','labRecordsBody','expenseRecordsBody'].forEach(id=>{if($(id))$(id).innerHTML='<tr><td colspan="8">From date cannot be after To date.</td></tr>'});return;
  }
  const op=patients.filter(p=>ok(p.date)&&[p.name,p.doctor,p.token,p.shift].join(' ').toLowerCase().includes(q));
  const pr=procedures.filter(p=>ok(p.date)&&[p.patient,p.procedure,p.shift].join(' ').toLowerCase().includes(q));
  const la=labs.filter(p=>ok(p.date)&&[p.patient,p.test,p.shift].join(' ').toLowerCase().includes(q));
  const ex=expenses.filter(p=>ok(p.date)&&[p.name,p.shift].join(' ').toLowerCase().includes(q));
  const sorter=(a,b)=>String(b.date).localeCompare(String(a.date))||String(b.time).localeCompare(String(a.time));
  op.sort(sorter);pr.sort(sorter);la.sort(sorter);ex.sort(sorter);
  $('tokenRecordsBody').innerHTML=op.length?op.map(p=>`<tr><td><b>${esc(p.token)}</b></td><td>${esc(p.name)}</td><td>${esc(p.doctor)}</td><td>${esc(p.shift||'—')}</td><td>${p.date}</td><td>${esc(p.time)} <button class="danger" onclick="deletePatient(${p.id})">Delete</button></td></tr>`).join(''):'<tr><td colspan="6">No token records found.</td></tr>';
  $('procedureRecordsBody').innerHTML=pr.length?pr.map(p=>`<tr><td>${esc(p.patient)}</td><td>${esc(p.procedure)}</td><td>${esc(p.shift||'—')}</td><td>${money(totalOf(p))}</td><td>${money(paidOf(p))}</td><td>${money(creditOf(p))}</td><td>${p.date}</td><td>${esc(p.time)} <button class="danger" onclick="deleteProcedure(${p.id})">Delete</button></td></tr>`).join(''):'<tr><td colspan="8">No procedure/service records found.</td></tr>';
  $('labRecordsBody').innerHTML=la.length?la.map(p=>`<tr><td>${esc(p.patient)}</td><td>${esc(p.test)}</td><td>${esc(p.shift||'—')}</td><td>${money(totalOf(p))}</td><td>${money(paidOf(p))}</td><td>${money(creditOf(p))}</td><td>${p.date}</td><td>${esc(p.time)} <button class="secondary" onclick="printLabSlip(${p.id})">🧾 Payment Slip</button> <button class="danger" onclick="deleteLab(${p.id})">Delete</button></td></tr>`).join(''):'<tr><td colspan="8">No lab records found.</td></tr>';
  $('expenseRecordsBody').innerHTML=ex.length?ex.map(p=>`<tr><td>${esc(p.name)}</td><td>${esc(p.shift||'—')}</td><td>${money(p.amount)}</td><td>${p.date}</td><td>${esc(p.time)} <button class="danger" onclick="deleteExpense(${p.id})">Delete</button></td></tr>`).join(''):'<tr><td colspan="5">No expense records found.</td></tr>';
}
function csvDownload(filename,header,rows){let csv=[header,...rows].map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');let a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function exportRecordType(type){
  const {from,to,ok}=recordFiltered();if(from>to)return alert('From date cannot be after To date.');
  if(type==='tokens'){let rows=patients.filter(p=>ok(p.date)).map(p=>[p.token,p.name,p.doctor,p.shift,p.date,p.time]);return csvDownload(`ammara-token-records-${from}-to-${to}.csv`,['Token','Patient','Doctor','Shift','Date','Time'],rows)}
  if(type==='procedures'){let rows=procedures.filter(p=>ok(p.date)).map(p=>[p.patient,p.procedure,p.shift,totalOf(p),paidOf(p),creditOf(p),p.date,p.time]);return csvDownload(`ammara-procedure-records-${from}-to-${to}.csv`,['Patient','Procedure','Shift','Total','Paid','Credit','Date','Time'],rows)}
  if(type==='labs'){let rows=labs.filter(p=>ok(p.date)).map(p=>[p.patient,p.test,p.shift,totalOf(p),paidOf(p),creditOf(p),p.date,p.time]);return csvDownload(`ammara-lab-records-${from}-to-${to}.csv`,['Patient','Test','Shift','Total','Paid','Credit','Date','Time'],rows)}
  let rows=expenses.filter(p=>ok(p.date)).map(p=>[p.name,p.shift,p.amount,p.date,p.time]);csvDownload(`ammara-expense-records-${from}-to-${to}.csv`,['Expense','Shift','Amount','Date','Time'],rows);
}
function exportCSV(){exportRecordType('tokens');}

function deletePatient(id){if(confirm("Delete OPD record?")){patients=patients.filter(x=>x.id!==id);save(K.patients,patients);renderAll()}}
function deleteProcedure(id){if(confirm("Delete procedure record?")){procedures=procedures.filter(x=>x.id!==id);save(K.procedures,procedures);renderAll()}}
function deleteLab(id){if(confirm("Delete lab record?")){labs=labs.filter(x=>x.id!==id);save(K.labs,labs);renderAll()}}
function exportCSV(){exportRecordType("tokens")}

function renderClosingShiftOptions(){let s=$("closingShift");if(!s)return;s.innerHTML=["Morning","Evening","Night"].map(x=>`<option>${x}</option>`).join("");s.value=getShift();}
function closingData(date,shift){const op=patients.filter(p=>p.date===date&&p.shift===shift),pr=procedures.filter(p=>p.date===date&&p.shift===shift),la=labs.filter(p=>p.date===date&&p.shift===shift),ex=expenses.filter(e=>e.date===date&&e.shift===shift);const total=op.reduce((a,p)=>a+totalOf(p),0)+pr.reduce((a,p)=>a+totalOf(p),0)+la.reduce((a,p)=>a+totalOf(p),0),paid=op.reduce((a,p)=>a+paidOf(p),0)+pr.reduce((a,p)=>a+paidOf(p),0)+la.reduce((a,p)=>a+paidOf(p),0),credit=op.reduce((a,p)=>a+creditOf(p),0)+pr.reduce((a,p)=>a+creditOf(p),0)+la.reduce((a,p)=>a+creditOf(p),0),expense=ex.reduce((a,p)=>a+Number(p.amount||0),0);return{op,pr,la,ex,total,paid,credit,expense,cash:paid-expense}}
function closingRangeData(from,to,shift){
  const inRangeDate=r=>r.date>=from&&r.date<=to&&r.shift===shift;
  const op=patients.filter(inRangeDate),pr=procedures.filter(inRangeDate),la=labs.filter(inRangeDate),ex=expenses.filter(inRangeDate);
  const total=op.reduce((a,p)=>a+totalOf(p),0)+pr.reduce((a,p)=>a+totalOf(p),0)+la.reduce((a,p)=>a+totalOf(p),0);
  const paid=op.reduce((a,p)=>a+paidOf(p),0)+pr.reduce((a,p)=>a+paidOf(p),0)+la.reduce((a,p)=>a+paidOf(p),0);
  const credit=op.reduce((a,p)=>a+creditOf(p),0)+pr.reduce((a,p)=>a+creditOf(p),0)+la.reduce((a,p)=>a+creditOf(p),0);
  const expense=ex.reduce((a,p)=>a+Number(p.amount||0),0);
  return {op,pr,la,ex,total,paid,credit,expense,cash:paid-expense};
}
function renderClosingSummary(){
  if(!$('closingFrom'))return;
  let from=$("closingFrom").value||today(),to=$("closingTo").value||from,s=$("closingShift").value||getShift();
  if(from>to){$("closeStatus").textContent="INVALID DATE RANGE";$("closeBtn").disabled=true;["closeOpd","closeServices","closeLabs"].forEach(id=>$(id).textContent="0");["closeTotal","closePaid","closeCredit","closeExpense","closeCash"].forEach(id=>$(id).textContent=money(0));return;}
  let x=closingRangeData(from,to,s),singleDay=from===to,key=shiftKey(from,s),closed=singleDay?closings.find(c=>c.key===key):null;
  $("closeOpd").textContent=x.op.length;$("closeServices").textContent=x.pr.length;$("closeLabs").textContent=x.la.length;$("closeTotal").textContent=money(x.total);$("closePaid").textContent=money(x.paid);$("closeCredit").textContent=money(x.credit);$("closeExpense").textContent=money(x.expense);$("closeCash").textContent=money(x.cash);
  $("closeStatus").textContent=singleDay?(closed?`CLOSED — ${closed.closedAt}`:"OPEN"):"RANGE VIEW";$("closeStatus").className=singleDay&&closed?"badge off":"badge";$("closeBtn").disabled=!singleDay||!!closed;renderClosingHistory();
}

function closeShift(){let d=$("closingFrom").value||today(),to=$("closingTo").value||d,s=$("closingShift").value||getShift();if(d!==to)return alert("Close This Shift ke liye From Date aur To Date same honi chahiye. Range sirf data dekhne ke liye hai.");let x=closingData(d,s),key=shiftKey(d,s);if(closings.some(c=>c.key===key))return alert("This shift is already closed.");if(!confirm(`${s} shift close karein?\nDate: ${d}\nCash received: ${money(x.paid)}\nExpenses: ${money(x.expense)}\nNet cash: ${money(x.cash)}`))return;closings.push({id:Date.now(),key,date:d,shift:s,opd:x.op.length,services:x.pr.length,labs:x.la.length,total:x.total,paid:x.paid,credit:x.credit,expense:x.expense,cash:x.cash,closedAt:new Date().toLocaleString()});save(K.closings,closings);renderClosingSummary();alert(`${s} shift closed successfully.`)}
function renderClosingHistory(){if(!$('closingHistoryBody'))return;$("closingHistoryBody").innerHTML=closings.slice().reverse().map(c=>`<tr><td>${c.date}</td><td>${c.shift}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td>${money(c.credit)}</td><td>${money(c.expense)}</td><td><b>${money(c.cash)}</b></td><td>${esc(c.closedAt)}</td></tr>`).join("")||'<tr><td colspan="8">No closed shifts yet.</td></tr>'}

function openSettings(){
  $("manualShiftMode").checked=manualShiftMode;
  ["morningStart","morningEnd","eveningStart","eveningEnd","nightStart","nightEnd"].forEach(id=>$(id).value=shifts[id]);$("settingsMessage").textContent="";$("settingsModal").classList.remove("hidden")
}
function closeSettings(){$("settingsModal").classList.add("hidden")}
function saveShiftSettings(){
  let vals={morningStart:$("morningStart").value,morningEnd:$("morningEnd").value,eveningStart:$("eveningStart").value,eveningEnd:$("eveningEnd").value,nightStart:$("nightStart").value,nightEnd:$("nightEnd").value};
  if(Object.values(vals).some(v=>!v))return alert("All shift times select karein");
  shifts=vals; save(K.shifts,shifts);
  manualShiftMode=!!$("manualShiftMode").checked; localStorage.setItem(K.manualShift,manualShiftMode?"1":"0");
  syncShiftSelectors(); renderShift(); renderClosingShiftOptions(); renderClosingSummary();
  $("settingsMessage").textContent=manualShiftMode?"Settings saved. Manual Shift Selection is ON.":"Settings saved. Manual Shift Selection is OFF.";
}
function changePassword(){let oldp=$("oldPassword").value,newp=$("newPassword").value,confirmP=$("confirmPassword").value;if(oldp!==localStorage.getItem(K.pass))return $("settingsMessage").textContent="Current password is incorrect.";if(!newp||newp.length<4)return $("settingsMessage").textContent="New password must be at least 4 characters.";if(newp!==confirmP)return $("settingsMessage").textContent="New passwords do not match.";localStorage.setItem(K.pass,newp);$("oldPassword").value="";$("newPassword").value="";$("confirmPassword").value="";$("settingsMessage").textContent="Password changed successfully."}
