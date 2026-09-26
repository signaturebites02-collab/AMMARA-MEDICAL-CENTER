const K={
  doctors:"ammara_doctors_final",patients:"ammara_patients_final",procedures:"ammara_procedures_final",
  services:"ammara_services_final",labs:"ammara_labs_final",tests:"ammara_tests_final",expenses:"ammara_expenses_final",
  pass:"ammara_password_final",shifts:"ammara_shifts_final",closings:"ammara_shift_closings_final"
};
function load(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}}
function save(k,v){localStorage.setItem(k,JSON.stringify(v))}
function $(id){return document.getElementById(id)}
function today(){return new Date().toISOString().slice(0,10)}
function money(n){return "Rs. "+Number(n||0).toLocaleString("en-PK")}
function esc(v){return String(v??"").replace(/[&<>\"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]))}
function timeNow(){return new Date().toTimeString().slice(0,5)}
function inRange(t,s,e){if(s===e)return true;return s<e?t>=s&&t<e:t>=s||t<e}
let doctors=load(K.doctors,[{id:1,name:"Doctor 1",fee:500,active:true},{id:2,name:"Doctor 2",fee:500,active:true},{id:3,name:"Doctor 3",fee:500,active:true},{id:4,name:"Doctor 4",fee:500,active:true}]);
let patients=load(K.patients,[]),procedures=load(K.procedures,[]),services=load(K.services,[{id:1,name:"BP Check",fee:100},{id:2,name:"Sugar Check",fee:150},{id:3,name:"Injection",fee:200},{id:4,name:"Dressing",fee:300}]);
let labs=load(K.labs,[]),tests=load(K.tests,[{id:1,name:"CBC",fee:500},{id:2,name:"LFT",fee:800},{id:3,name:"RFT",fee:700},{id:4,name:"Blood Sugar",fee:200},{id:5,name:"Urine R/E",fee:300}]);
let expenses=load(K.expenses,[]),closings=load(K.closings,[]);
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
  ["dashboardDate","procDate","labDate","expenseDate","closingDate","recordFrom","recordTo"].forEach(id=>{if($(id)&&!$(id).value)$(id).value=d});
  renderAll();
  setInterval(()=>{renderShift();renderDashboard();renderClosingSummary()},30000);
}
function renderAll(){renderShift();renderDoctors();renderDoctorSelect();renderProcedures();renderProcedureSelect();renderTests();renderTestSelect();renderExpenses();renderDashboard();renderRecords();renderClosingShiftOptions();renderClosingSummary()}
function showTab(id,btn){document.querySelectorAll(".tab-page").forEach(x=>x.classList.add("hidden"));$(id).classList.remove("hidden");document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));btn.classList.add("active");if(id==="shiftClosing")renderClosingSummary()}

function renderShift(){
  const s=getShift();
  if($("shiftBadge"))$("shiftBadge").textContent="Current Shift: "+s.toUpperCase();
  if($("currentShiftText"))$("currentShiftText").textContent="Current shift: "+s.toUpperCase();
}

function addDoctor(){let n=$("doctorName").value.trim(),f=Number($("doctorFee").value);if(!n||!Number.isFinite(f)||f<0)return alert("Doctor name aur OPD fee enter karein");doctors.push({id:Date.now(),name:n,fee:f,active:true});save(K.doctors,doctors);$("doctorName").value="";$("doctorFee").value="";renderDoctors();renderDoctorSelect()}
function renderDoctors(){$("doctorList").innerHTML=doctors.length?doctors.map(d=>`<div class="doctor-row"><div><b>${esc(d.name)}</b> — ${money(d.fee)} <span class="badge ${d.active?"":"off"}">${d.active?"ON":"OFF"}</span></div><div class="doctor-actions"><button class="secondary" onclick="editDoctor(${d.id})">Edit</button><button onclick="toggleDoctor(${d.id})">${d.active?"Turn OFF":"Turn ON"}</button><button class="danger" onclick="deleteDoctor(${d.id})">Delete</button></div></div>`).join(""):"<p>No doctors.</p>"}
function editDoctor(id){let d=doctors.find(x=>x.id===id);if(!d)return;let n=prompt("Doctor name:",d.name);if(n===null)return;let f=prompt("OPD fee (Rs.):",d.fee);if(f===null)return;if(!n.trim()||isNaN(Number(f)))return alert("Invalid data");d.name=n.trim();d.fee=Number(f);patients.forEach(p=>{if(p.doctorId===id)p.doctor=d.name});save(K.doctors,doctors);save(K.patients,patients);renderAll()}
function toggleDoctor(id){let d=doctors.find(x=>x.id===id);if(d){d.active=!d.active;save(K.doctors,doctors);renderDoctors();renderDoctorSelect()}}
function deleteDoctor(id){if(confirm("Delete doctor?")){doctors=doctors.filter(x=>x.id!==id);save(K.doctors,doctors);renderAll()}}
function renderDoctorSelect(){let a=doctors.filter(d=>d.active);$("patientDoctor").innerHTML=a.length?'<option value="">Select doctor</option>'+a.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join(""):'<option value="">No active doctor</option>';updateSelectedFee()}
function updateSelectedFee(){let d=doctors.find(x=>String(x.id)===$("patientDoctor").value);$("patientFee").value=d?d.fee:"";if($("patientPaid")){if(d&&!$("patientPaid").value)$("patientPaid").value=d.fee;updateOPDCredit()}}
function updateOPDCredit(){let total=Number($("patientFee").value||0),paid=Number($("patientPaid").value||0);$("patientCredit").value=Math.max(0,total-paid)}

function savePatient(){
  let n=$("patientName").value.trim(),age=$("patientAge").value.trim(),g=$("patientGender").value,d=doctors.find(x=>String(x.id)===$("patientDoctor").value),paid=Number($("patientPaid").value);
  if(!n||!age||!g||!d)return alert("Name, Age, Gender aur Doctor fill karein");
  if(!Number.isFinite(paid)||paid<0||paid>d.fee)return alert("Paid amount sahi enter karein");
  let s=getShift(),bd=shiftBusinessDate(s),key=shiftKey(bd,s),count=patients.filter(p=>p.shiftKey===key&&p.doctorId===d.id).length+1,token=String(count).padStart(3,"0"),now=new Date(),date=today(),time=now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
  let p={id:Date.now(),name:n,age,gender:g,doctorId:d.id,doctor:d.name,fee:d.fee,amount:d.fee,paid,credit:d.fee-paid,shift:s,shiftKey:key,date,time,token};
  patients.push(p);save(K.patients,patients);fillReceipt(p);
  $("tokenNumber").textContent=token;$("tokenDoctor").textContent=d.name;$("tokenShift").textContent=s;$("tokenFee").textContent=d.fee;$("tokenPaid").textContent=paid;$("tokenCredit").textContent=p.credit;$("tokenResult").classList.remove("hidden");
  ["patientName","patientAge","patientGender","patientDoctor","patientFee","patientPaid","patientCredit"].forEach(x=>$(x).value="");
  renderDashboard();renderRecords();renderClosingSummary();setTimeout(()=>window.print(),250);
}
function fillReceipt(p){$("printToken").textContent=p.token;$("printPatient").textContent=p.name;$("printAge").textContent=p.age;$("printGender").textContent=p.gender;$("printDoctor").textContent=p.doctor;$("printShift").textContent=p.shift;$("printDate").textContent=p.date;$("printTime").textContent=p.time;$("printFee").textContent=Number(p.fee).toLocaleString("en-PK")}

function addProcedure(){let n=$("newProcedureName").value.trim(),f=Number($("newProcedureFee").value);if(!n||!Number.isFinite(f)||f<0)return alert("Service name aur fee enter karein");services.push({id:Date.now(),name:n,fee:f});save(K.services,services);$("newProcedureName").value="";$("newProcedureFee").value="";renderProcedures();renderProcedureSelect()}
function renderProcedures(){$("procedureList").innerHTML=services.map(s=>`<div class="procedure-row"><div><b>${esc(s.name)}</b> — ${money(s.fee)}</div><div class="procedure-actions"><button class="secondary" onclick="editProcedure(${s.id})">Edit</button><button class="danger" onclick="deleteService(${s.id})">Delete</button></div></div>`).join("")}
function editProcedure(id){let s=services.find(x=>x.id===id);if(!s)return;let n=prompt("Service name:",s.name);if(n===null)return;let f=prompt("Fee:",s.fee);if(f===null)return;if(n.trim()&&Number.isFinite(Number(f))){s.name=n.trim();s.fee=Number(f);save(K.services,services);renderProcedures();renderProcedureSelect()}}
function deleteService(id){if(confirm("Delete service?")){services=services.filter(x=>x.id!==id);save(K.services,services);renderProcedures();renderProcedureSelect()}}
function renderProcedureSelect(){$("procedureSelect").innerHTML='<option value="">Select procedure</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");updateProcedureFee()}
function updateProcedureFee(){let s=services.find(x=>String(x.id)===$("procedureSelect").value);$("procAmount").value=s?s.fee:"";if($("procPaid")){if(s&&!$("procPaid").value)$("procPaid").value=s.fee;updateProcedureCredit()}}
function updateProcedureCredit(){let total=Number($("procAmount").value||0),paid=Number($("procPaid").value||0);$("procCredit").value=Math.max(0,total-paid)}
function saveProcedure(){let n=$("procPatient").value.trim(),s=services.find(x=>String(x.id)===$("procedureSelect").value),a=Number($("procAmount").value),paid=Number($("procPaid").value),d=$("procDate").value||today();if(!n||!s||!Number.isFinite(a)||a<0)return alert("Patient, procedure aur amount fill karein");if(!Number.isFinite(paid)||paid<0||paid>a)return alert("Paid amount sahi enter karein");let now=new Date(),shift=shiftForTime();procedures.push({id:Date.now(),patient:n,procedure:s.name,amount:a,paid,credit:a-paid,shift,shiftKey:shiftKey(shiftBusinessDate(shift,d),shift),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});save(K.procedures,procedures);$("procPatient").value="";$("procedureSelect").value="";$("procAmount").value="";$("procPaid").value="";$("procCredit").value="";renderDashboard();renderRecords();renderClosingSummary()}

function addTest(){let n=$("newTestName").value.trim(),f=Number($("newTestFee").value);if(!n||!Number.isFinite(f)||f<0)return alert("Test name aur fee enter karein");tests.push({id:Date.now(),name:n,fee:f});save(K.tests,tests);$("newTestName").value="";$("newTestFee").value="";renderTests();renderTestSelect()}
function renderTests(){$("testList").innerHTML=tests.map(t=>`<div class="procedure-row"><div><b>${esc(t.name)}</b> — ${money(t.fee)}</div><div class="procedure-actions"><button class="secondary" onclick="editTest(${t.id})">Edit</button><button class="danger" onclick="deleteTest(${t.id})">Delete</button></div></div>`).join("")}
function editTest(id){let t=tests.find(x=>x.id===id);if(!t)return;let n=prompt("Test name:",t.name);if(n===null)return;let f=prompt("Test fee:",t.fee);if(f===null)return;if(n.trim()&&Number.isFinite(Number(f))){t.name=n.trim();t.fee=Number(f);save(K.tests,tests);renderTests();renderTestSelect()}}
function deleteTest(id){if(confirm("Delete test?")){tests=tests.filter(x=>x.id!==id);save(K.tests,tests);renderTests();renderTestSelect()}}
function renderTestSelect(){$("testSelect").innerHTML='<option value="">Select test</option>'+tests.map(t=>`<option value="${t.id}">${esc(t.name)}</option>`).join("");updateTestFee()}
function updateTestFee(){let t=tests.find(x=>String(x.id)===$("testSelect").value);$("labAmount").value=t?t.fee:"";if($("labPaid")){if(t&&!$("labPaid").value)$("labPaid").value=t.fee;updateLabCredit()}}
function updateLabCredit(){let total=Number($("labAmount").value||0),paid=Number($("labPaid").value||0);$("labCredit").value=Math.max(0,total-paid)}
function saveLab(){let n=$("labPatient").value.trim(),t=tests.find(x=>String(x.id)===$("testSelect").value),a=Number($("labAmount").value),paid=Number($("labPaid").value),d=$("labDate").value||today();if(!n||!t||!Number.isFinite(a)||a<0)return alert("Patient, test aur amount fill karein");if(!Number.isFinite(paid)||paid<0||paid>a)return alert("Paid amount sahi enter karein");let now=new Date(),shift=shiftForTime();labs.push({id:Date.now(),patient:n,test:t.name,amount:a,paid,credit:a-paid,shift,shiftKey:shiftKey(shiftBusinessDate(shift,d),shift),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});save(K.labs,labs);$("labPatient").value="";$("testSelect").value="";$("labAmount").value="";$("labPaid").value="";$("labCredit").value="";renderDashboard();renderRecords();renderClosingSummary()}

function saveExpense(){let n=$("expenseName").value.trim(),a=Number($("expenseAmount").value),d=$("expenseDate").value||today();if(!n||!Number.isFinite(a)||a<0)return alert("Expense name aur amount fill karein");let now=new Date(),shift=shiftForTime();expenses.push({id:Date.now(),name:n,amount:a,paid:a,credit:0,shift,shiftKey:shiftKey(shiftBusinessDate(shift,d),shift),date:d,time:now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})});save(K.expenses,expenses);$("expenseName").value="";$("expenseAmount").value="";renderExpenses();renderDashboard();renderRecords();renderClosingSummary()}
function renderExpenses(){$("expensesBody").innerHTML=expenses.length?expenses.slice().reverse().map(e=>`<tr><td>${e.date}</td><td>${esc(e.name)}</td><td>${money(e.amount)}</td><td>${esc(e.shift||"—")}</td><td><button class="danger" onclick="deleteExpense(${e.id})">Delete</button></td></tr>`).join(""):'<tr><td colspan="5">No expenses.</td></tr>'}
function deleteExpense(id){if(confirm("Delete expense?")){expenses=expenses.filter(x=>x.id!==id);save(K.expenses,expenses);renderExpenses();renderDashboard();renderClosingSummary()}}

function dateData(date){let op=patients.filter(p=>p.date===date),pr=procedures.filter(p=>p.date===date),la=labs.filter(p=>p.date===date),ex=expenses.filter(e=>e.date===date);return {op,pr,la,ex}}
function renderDashboard(){let d=$("dashboardDate").value||today(),x=dateData(d),os=x.op.reduce((a,p)=>a+totalOf(p),0),ops=x.op.reduce((a,p)=>a+paidOf(p),0),oc=x.op.reduce((a,p)=>a+creditOf(p),0),ps=x.pr.reduce((a,p)=>a+totalOf(p),0),pps=x.pr.reduce((a,p)=>a+paidOf(p),0),pc=x.pr.reduce((a,p)=>a+creditOf(p),0),ls=x.la.reduce((a,p)=>a+totalOf(p),0),lps=x.la.reduce((a,p)=>a+paidOf(p),0),lc=x.la.reduce((a,p)=>a+creditOf(p),0),es=x.ex.reduce((a,p)=>a+Number(p.amount||0),0),total=os+ps+ls,paid=ops+pps+lps;$("dashOpdPatients").textContent=x.op.length;$("dashProcedures").textContent=x.pr.length;$("dashLabs").textContent=x.la.length;$("dashOpdSale").textContent=money(os);$("dashProcedureSale").textContent=money(ps);$("dashLabSale").textContent=money(ls);$("dashTotalSale").textContent=money(total);$("dashPaid").textContent=money(paid);$("dashCredit").textContent=money(oc+pc+lc);$("dashExpenses").textContent=money(es);$("dashNet").textContent=money(paid-es);renderShift()}

function renderRecords(){let from=$("recordFrom").value||"0000-01-01",to=$("recordTo").value||today();if(from>to){$("recordsBody").innerHTML='<tr><td colspan="10">From date cannot be after To date.</td></tr>';return}let q=($("searchInput").value||"").toLowerCase(),ok=d=>d>=from&&d<=to;let rows=[];
patients.filter(p=>ok(p.date)&&[p.name,p.doctor,p.token,p.shift].join(" ").toLowerCase().includes(q)).forEach(p=>rows.push({type:"OPD",token:p.token,name:p.name,who:p.doctor,shift:p.shift||"—",total:totalOf(p),paid:paidOf(p),credit:creditOf(p),date:p.date,time:p.time,id:p.id,kind:"patient"}));
procedures.filter(p=>ok(p.date)&&[p.patient,p.procedure,p.shift].join(" ").toLowerCase().includes(q)).forEach(p=>rows.push({type:"SERVICE",token:"—",name:p.patient,who:p.procedure,shift:p.shift||"—",total:totalOf(p),paid:paidOf(p),credit:creditOf(p),date:p.date,time:p.time,id:p.id,kind:"procedure"}));
labs.filter(p=>ok(p.date)&&[p.patient,p.test,p.shift].join(" ").toLowerCase().includes(q)).forEach(p=>rows.push({type:"LAB",token:"—",name:p.patient,who:p.test,shift:p.shift||"—",total:totalOf(p),paid:paidOf(p),credit:creditOf(p),date:p.date,time:p.time,id:p.id,kind:"lab"}));
rows.sort((x,y)=>String(y.date).localeCompare(String(x.date))||String(y.time).localeCompare(String(x.time)));$("recordsBody").innerHTML=rows.length?rows.map(r=>`<tr><td>${r.type}</td><td><b>${esc(r.token)}</b></td><td>${esc(r.name)}</td><td>${esc(r.who)}</td><td>${esc(r.shift)}</td><td>${money(r.total)}</td><td>${money(r.paid)}</td><td>${money(r.credit)}</td><td>${r.date}</td><td>${esc(r.time)} <button class="danger" onclick="${r.kind==="patient"?"deletePatient":r.kind==="procedure"?"deleteProcedure":"deleteLab"}(${r.id})">Delete</button></td></tr>`).join(""):'<tr><td colspan="10">No records found.</td></tr>'}
function deletePatient(id){if(confirm("Delete OPD record?")){patients=patients.filter(x=>x.id!==id);save(K.patients,patients);renderAll()}}
function deleteProcedure(id){if(confirm("Delete procedure record?")){procedures=procedures.filter(x=>x.id!==id);save(K.procedures,procedures);renderAll()}}
function deleteLab(id){if(confirm("Delete lab record?")){labs=labs.filter(x=>x.id!==id);save(K.labs,labs);renderAll()}}
function exportCSV(){let from=$("recordFrom").value||"0000-01-01",to=$("recordTo").value||today();if(from>to)return alert("From date cannot be after To date.");let ok=d=>d>=from&&d<=to,rows=[];patients.filter(p=>ok(p.date)).forEach(p=>rows.push(["OPD",p.token,p.name,p.doctor,p.shift,totalOf(p),paidOf(p),creditOf(p),p.date,p.time]));procedures.filter(p=>ok(p.date)).forEach(p=>rows.push(["SERVICE","—",p.patient,p.procedure,p.shift||"—",totalOf(p),paidOf(p),creditOf(p),p.date,p.time]));labs.filter(p=>ok(p.date)).forEach(p=>rows.push(["LAB","—",p.patient,p.test,p.shift||"—",totalOf(p),paidOf(p),creditOf(p),p.date,p.time]));let csv=[["Type","Token","Patient","Doctor/Test/Procedure","Shift","Total","Paid","Credit","Date","Time"],...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=`ammara-records-${from}-to-${to}.csv`;a.click()}

function renderClosingShiftOptions(){let s=$("closingShift");if(!s)return;s.innerHTML=["Morning","Evening","Night"].map(x=>`<option>${x}</option>`).join("");s.value=getShift();}
function closingData(date,shift){const op=patients.filter(p=>p.date===date&&p.shift===shift),pr=procedures.filter(p=>p.date===date&&p.shift===shift),la=labs.filter(p=>p.date===date&&p.shift===shift),ex=expenses.filter(e=>e.date===date&&e.shift===shift);const total=op.reduce((a,p)=>a+totalOf(p),0)+pr.reduce((a,p)=>a+totalOf(p),0)+la.reduce((a,p)=>a+totalOf(p),0),paid=op.reduce((a,p)=>a+paidOf(p),0)+pr.reduce((a,p)=>a+paidOf(p),0)+la.reduce((a,p)=>a+paidOf(p),0),credit=op.reduce((a,p)=>a+creditOf(p),0)+pr.reduce((a,p)=>a+creditOf(p),0)+la.reduce((a,p)=>a+creditOf(p),0),expense=ex.reduce((a,p)=>a+Number(p.amount||0),0);return{op,pr,la,ex,total,paid,credit,expense,cash:paid-expense}}
function renderClosingSummary(){if(!$('closingDate'))return;let d=$("closingDate").value||today(),s=$("closingShift").value||getShift(),x=closingData(d,s),key=shiftKey(d,s),closed=closings.find(c=>c.key===key);$("closeOpd").textContent=x.op.length;$("closeServices").textContent=x.pr.length;$("closeLabs").textContent=x.la.length;$("closeTotal").textContent=money(x.total);$("closePaid").textContent=money(x.paid);$("closeCredit").textContent=money(x.credit);$("closeExpense").textContent=money(x.expense);$("closeCash").textContent=money(x.cash);$("closeStatus").textContent=closed?`CLOSED — ${closed.closedAt}`:"OPEN";$("closeStatus").className=closed?"badge off":"badge";$("closeBtn").disabled=!!closed;renderClosingHistory()}
function closeShift(){let d=$("closingDate").value||today(),s=$("closingShift").value||getShift(),x=closingData(d,s),key=shiftKey(d,s);if(closings.some(c=>c.key===key))return alert("This shift is already closed.");if(!confirm(`${s} shift close karein?\nCash received: ${money(x.paid)}\nExpenses: ${money(x.expense)}\nNet cash: ${money(x.cash)}`))return;closings.push({id:Date.now(),key,date:d,shift:s,opd:x.op.length,services:x.pr.length,labs:x.la.length,total:x.total,paid:x.paid,credit:x.credit,expense:x.expense,cash:x.cash,closedAt:new Date().toLocaleString()});save(K.closings,closings);renderClosingSummary();alert(`${s} shift closed successfully.`)}
function renderClosingHistory(){if(!$('closingHistoryBody'))return;$("closingHistoryBody").innerHTML=closings.slice().reverse().map(c=>`<tr><td>${c.date}</td><td>${c.shift}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td>${money(c.credit)}</td><td>${money(c.expense)}</td><td><b>${money(c.cash)}</b></td><td>${esc(c.closedAt)}</td></tr>`).join("")||'<tr><td colspan="8">No closed shifts yet.</td></tr>'}

function openSettings(){
  ["morningStart","morningEnd","eveningStart","eveningEnd","nightStart","nightEnd"].forEach(id=>$(id).value=shifts[id]);$("settingsMessage").textContent="";$("settingsModal").classList.remove("hidden")
}
function closeSettings(){$("settingsModal").classList.add("hidden")}
function saveShiftSettings(){let vals={morningStart:$("morningStart").value,morningEnd:$("morningEnd").value,eveningStart:$("eveningStart").value,eveningEnd:$("eveningEnd").value,nightStart:$("nightStart").value,nightEnd:$("nightEnd").value};if(Object.values(vals).some(v=>!v))return alert("All shift times select karein");shifts=vals;save(K.shifts,shifts);renderShift();renderClosingShiftOptions();renderClosingSummary();$("settingsMessage").textContent="Shift times saved successfully."}
function changePassword(){let oldp=$("oldPassword").value,newp=$("newPassword").value,confirmP=$("confirmPassword").value;if(oldp!==localStorage.getItem(K.pass))return $("settingsMessage").textContent="Current password is incorrect.";if(!newp||newp.length<4)return $("settingsMessage").textContent="New password must be at least 4 characters.";if(newp!==confirmP)return $("settingsMessage").textContent="New passwords do not match.";localStorage.setItem(K.pass,newp);$("oldPassword").value="";$("newPassword").value="";$("confirmPassword").value="";$("settingsMessage").textContent="Password changed successfully."}
