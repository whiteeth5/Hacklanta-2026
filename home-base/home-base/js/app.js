/*
  Home Base: app
  --------------
  Sections in this file:
    helpers        small date and money functions
    state          loads/saves through js/storage.js
    views          one function per tab (vOverview, vMonthly, vYearly, vGrocery, vSubs)
    refresh        updates totals while someone types, without redrawing the page
    editing        handles typing, checkboxes, add and remove
    demo           the example household
    install/offline  "Install app" button and the service worker

  To add a new tab: add a button in index.html with data-tab="name",
  write a vName() function, and add it to the list in render().
*/
(function(){
"use strict";
const LS_KEY = "homebase-budget-v1";
const $ = s => document.querySelector(s);
const uid = () => Math.random().toString(36).slice(2,10);
const pad = n => String(n).padStart(2,"0");
const iso = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const parse = s => { if(!s) return null; const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); };
const today = () => { const d=new Date(); d.setHours(0,0,0,0); return d; };
const monthKey = (d=today()) => `${d.getFullYear()}-${pad(d.getMonth()+1)}`;
const esc = s => String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const num = v => { const n=parseFloat(v); return isFinite(n)?n:0; };
const money = (n,cents) => { const neg=n<0; const a=Math.abs(n);
  const s=a.toLocaleString("en-US",{minimumFractionDigits:cents?2:0,maximumFractionDigits:cents?2:0});
  return (neg?"−$":"$")+s; };
const moneySmart = n => money(n, Math.abs(n)<100 && Math.round(n)!==n);
const shortDate = d => d.toLocaleDateString("en-US",{month:"short",day:"numeric"});
const daysBetween = (a,b) => Math.round((b-a)/86400000);
const whenText = d => { const n=daysBetween(today(),d); if(n===0) return "Today"; if(n===1) return "Tomorrow"; if(n<7) return `In ${n} days`; return shortDate(d); };

const CATS = {housing:"Rent or mortgage",electric:"Electric",gas:"Gas",water:"Water",phone:"Phone or internet",
  car:"Car or transportation",insurance:"Insurance",childcare:"Childcare",debt:"Loan or credit card",medical:"Medical",other:"Other"};
const CYCLES = {weekly:"Every week",monthly:"Every month",yearly:"Every year"};
const perMonth = s => s.cycle==="weekly" ? num(s.cost)*52/12 : s.cycle==="yearly" ? num(s.cost)/12 : num(s.cost);

/* ---------- state & storage (see js/storage.js) ---------- */
const S = window.HB.storage;
const blank = S.blank, hasData = S.hasData;
let state = S.load();
let saveTimer = null;
function setSaveState(t){ $("#saveState").textContent=t; }
function save(){
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{
    setSaveState(S.save(state) ? "Saved on this phone" : "Couldn't save. Is private browsing on?");
  },250);
}
S.requestPersistence();

/* ---------- date helpers ---------- */
function nextMonthlyDate(day){
  const t=today(); const make=(y,m)=>{ const last=new Date(y,m+1,0).getDate(); return new Date(y,m,Math.min(day,last)); };
  let d=make(t.getFullYear(),t.getMonth()); if(d<t) d=make(t.getFullYear(),t.getMonth()+1); return d;
}
function nextYearlyDate(isoStr){
  const d=parse(isoStr); if(!d) return null; const t=today();
  let n=new Date(t.getFullYear(),d.getMonth(),d.getDate()); if(n<t) n=new Date(t.getFullYear()+1,d.getMonth(),d.getDate()); return n;
}
function nextSubDate(s){
  let d=parse(s.renew); if(!d) return null; const t=today(); let guard=0;
  while(d<t && guard++<600){
    if(s.cycle==="weekly") d=new Date(d.getFullYear(),d.getMonth(),d.getDate()+7);
    else if(s.cycle==="yearly") d=new Date(d.getFullYear()+1,d.getMonth(),d.getDate());
    else d=new Date(d.getFullYear(),d.getMonth()+1,d.getDate());
  }
  return d;
}
function monthsUntil(d){ const t=today(); return Math.max(1,(d.getFullYear()-t.getFullYear())*12+(d.getMonth()-t.getMonth())); }

/* ---------- totals ---------- */
function totals(){
  const monthly=state.monthly.reduce((s,b)=>s+num(b.amount),0);
  const yearly=state.yearly.reduce((s,b)=>s+num(b.amount)/12,0);
  const subs=state.subs.reduce((s,x)=>s+perMonth(x),0);
  const grocery=num(state.grocery.budget);
  const spent=monthly+yearly+subs+grocery;
  return {monthly,yearly,subs,grocery,spent,left:num(state.income)-spent};
}
function groceryMonth(){
  const mk=monthKey();
  const trips=state.grocery.trips.filter(t=>(t.date||"").slice(0,7)===mk);
  const cash=trips.filter(t=>!t.snap).reduce((s,t)=>s+num(t.amount),0);
  const snap=trips.filter(t=>t.snap).reduce((s,t)=>s+num(t.amount),0);
  return {trips,cash,snap,total:cash+snap};
}

/* ---------- tabs ---------- */
let tab="overview";
document.querySelectorAll(".tabs button").forEach(b=>b.addEventListener("click",()=>go(b.dataset.tab)));
function go(t){
  tab=t;
  document.querySelectorAll(".tabs button").forEach(b=>b.setAttribute("aria-selected",String(b.dataset.tab===t)));
  render(); window.scrollTo({top:0});
}
function render(){
  const m=$("#main");
  m.innerHTML = ({overview:vOverview,monthly:vMonthly,yearly:vYearly,grocery:vGrocery,subs:vSubs})[tab]();
  refresh();
}

/* ---------- views ---------- */
function moneyInput(attrs,val){ return `<div class="money"><input type="number" inputmode="decimal" min="0" step="0.01" ${attrs} value="${val===0||val?esc(val):""}" placeholder="0"></div>`; }

function vOverview(){
  const empty=!hasData(state);
  return `<section class="panel">
    <div class="income-row">
      <label for="income">Money coming in each month</label>
      ${moneyInput('id="income" data-field="income" style="max-width:170px"',state.income||"")}
      <div class="hint">Include pay and cash benefits. If it changes month to month, use what you get in a slow month. Food benefits (SNAP) go in Groceries.</div>
    </div>
    <div class="hero">
      <div class="label">Left each month after the basics</div>
      <div class="big" id="ovLeft">$0</div>
      <div class="note" id="ovNote"></div>
    </div>
    <div class="bar" id="ovBar" aria-hidden="true"></div>
    <dl class="legend" id="ovLegend"></dl>
    <div class="soon"><h3>Due in the next 2 weeks</h3><ul id="ovSoon"></ul></div>
    ${empty?`<div class="actions"><button class="btn ghost" data-action="demo">Fill in an example household</button></div>`:""}
    <div class="data">
      <h3>Your data</h3>
      <p>Your budget is saved only on this phone or computer. Nobody else can see it, including us. Save a backup now and then so you don't lose it if your phone breaks or you get a new one.</p>
      <div class="actions">
        <button class="btn ghost" data-action="backup"${empty?" disabled":""}>Save a backup file</button>
        <button class="btn ghost" data-action="restore">Restore from backup</button>
        ${empty?"":`<button class="btn quiet" data-action="clear">Clear everything</button>`}
      </div>
      <p id="installHint"></p>
    </div>
  </section>`;
}

function vMonthly(){
  const mk=monthKey();
  const rows=state.monthly.map(b=>`
    <div class="row m" data-row="${b.id}">
      <label class="f wide"><span>Bill</span><input type="text" data-list="monthly" data-id="${b.id}" data-field="name" value="${esc(b.name)}" placeholder="Rent, electric…"></label>
      <label class="f"><span>Amount</span>${moneyInput(`data-list="monthly" data-id="${b.id}" data-field="amount"`,b.amount)}</label>
      <label class="f"><span>Due day</span><input type="number" inputmode="numeric" min="1" max="31" data-list="monthly" data-id="${b.id}" data-field="day" value="${esc(b.day||"")}" placeholder="1–31"></label>
      <label class="f"><span>Type</span><select data-list="monthly" data-id="${b.id}" data-field="cat">${Object.entries(CATS).map(([k,v])=>`<option value="${k}"${b.cat===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <div class="rowfoot">
        <label class="check"><input type="checkbox" data-list="monthly" data-id="${b.id}" data-field="paid" ${b.paid&&b.paid[mk]?"checked":""}> Paid this month</label>
        <span data-out="due" data-id="${b.id}"></span>
        <button class="del" data-action="del" data-list="monthly" data-id="${b.id}">Remove</button>
      </div>
    </div>`).join("");
  return `<section class="panel">
    <h2>Monthly bills</h2>
    <p class="lede">Bills that come every month. Check them off as you pay so you know what's still coming.</p>
    <div class="list">${rows||`<div class="empty-card">No monthly bills yet. Start with rent or your mortgage, then utilities and your phone.</div>`}</div>
    <div class="actions"><button class="btn primary" data-action="add" data-list="monthly">Add a monthly bill</button></div>
    <div class="sumline"><span>Total each month</span><span class="n" id="sumMonthly"></span></div>
    <div class="sumline sub"><span>Still to pay this month</span><span id="sumUnpaid"></span></div>
  </section>`;
}

function vYearly(){
  const rows=state.yearly.map(b=>`
    <div class="row y" data-row="${b.id}">
      <label class="f wide"><span>Bill</span><input type="text" data-list="yearly" data-id="${b.id}" data-field="name" value="${esc(b.name)}" placeholder="Car tag, property tax…"></label>
      <label class="f"><span>Amount</span>${moneyInput(`data-list="yearly" data-id="${b.id}" data-field="amount"`,b.amount)}</label>
      <label class="f"><span>Next due</span><input type="date" data-list="yearly" data-id="${b.id}" data-field="due" value="${esc(b.due||"")}"></label>
      <div class="rowfoot"><span data-out="setaside" data-id="${b.id}"></span>
        <button class="del" data-action="del" data-list="yearly" data-id="${b.id}">Remove</button></div>
    </div>`).join("");
  return `<section class="panel">
    <h2>Yearly bills</h2>
    <p class="lede">Bills that come once or twice a year are the ones that catch people off guard. Saving a little each month gets you ready.</p>
    <div class="list">${rows||`<div class="empty-card">No yearly bills yet. Common ones: car registration, renter's or home insurance, property tax, school fees, holiday costs.</div>`}</div>
    <div class="actions"><button class="btn primary" data-action="add" data-list="yearly">Add a yearly bill</button></div>
    <div class="sumline"><span>Set aside each month</span><span class="n" id="sumYearly"></span></div>
    <div class="sumline sub"><span>Total for the year</span><span id="sumYearlyFull"></span></div>
  </section>`;
}

function vGrocery(){
  const g=groceryMonth();
  const monthName=today().toLocaleDateString("en-US",{month:"long"});
  const trips=[...g.trips].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(t=>`
    <div class="row t" data-row="${t.id}">
      <label class="f"><span>Date</span><input type="date" data-list="trips" data-id="${t.id}" data-field="date" value="${esc(t.date||"")}"></label>
      <label class="f"><span>Store</span><input type="text" data-list="trips" data-id="${t.id}" data-field="store" value="${esc(t.store)}" placeholder="Where you shopped"></label>
      <label class="f"><span>Spent</span>${moneyInput(`data-list="trips" data-id="${t.id}" data-field="amount"`,t.amount)}</label>
      <div class="f"><label class="check"><input type="checkbox" data-list="trips" data-id="${t.id}" data-field="snap" ${t.snap?"checked":""}> Paid with SNAP</label></div>
      <div class="rowfoot" style="justify-content:flex-end"><button class="del" data-action="del" data-list="trips" data-id="${t.id}">Remove</button></div>
    </div>`).join("");
  return `<section class="panel">
    <h2>Groceries</h2>
    <p class="lede">Set a monthly amount from your own money, then log each shopping trip. SNAP purchases are tracked separately so they don't eat into your cash budget.</p>
    <div class="meter">
      <div class="top"><div><div class="left" id="gLeft"></div><div id="gLeftLabel" style="color:var(--muted)"></div></div>
        <div id="gWeek" style="text-align:right"></div></div>
      <div class="track"><i id="gTrack"></i></div>
      <div id="gSpent" style="font-size:.92rem;color:var(--muted)"></div>
      <div class="budget"><label for="gBudget">Cash grocery budget for the month</label>${moneyInput('id="gBudget" data-field="budget"',state.grocery.budget||"")}</div>
    </div>
    <h3 style="font-size:1.1rem;margin:4px 0 10px">${esc(monthName)} shopping trips</h3>
    <div class="list">${trips||`<div class="empty-card">No trips logged this month yet.</div>`}</div>
    <div class="actions"><button class="btn primary" data-action="add" data-list="trips">Log a shopping trip</button></div>
  </section>`;
}

function vSubs(){
  const rows=state.subs.map(s=>`
    <div class="row s${s.using===false?" flag":""}" data-row="${s.id}">
      <label class="f wide"><span>Service</span><input type="text" data-list="subs" data-id="${s.id}" data-field="name" value="${esc(s.name)}" placeholder="Streaming, music, app…"></label>
      <label class="f"><span>Cost</span>${moneyInput(`data-list="subs" data-id="${s.id}" data-field="cost"`,s.cost)}</label>
      <label class="f"><span>Charged</span><select data-list="subs" data-id="${s.id}" data-field="cycle">${Object.entries(CYCLES).map(([k,v])=>`<option value="${k}"${s.cycle===k?" selected":""}>${v}</option>`).join("")}</select></label>
      <label class="f"><span>Next charge</span><input type="date" data-list="subs" data-id="${s.id}" data-field="renew" value="${esc(s.renew||"")}"></label>
      <div class="rowfoot">
        <label class="check"><input type="checkbox" data-list="subs" data-id="${s.id}" data-field="using" ${s.using!==false?"checked":""}> I still use this</label>
        <span data-out="sub" data-id="${s.id}"></span>
        <button class="del" data-action="del" data-list="subs" data-id="${s.id}">Remove</button>
      </div>
    </div>`).join("");
  return `<section class="panel">
    <h2>Subscriptions</h2>
    <p class="lede">Small charges add up. Uncheck anything you don't really use, and we'll show what canceling would save.</p>
    <div id="subCallout"></div>
    <div class="list">${rows||`<div class="empty-card">No subscriptions yet. Check your bank statement for repeat charges: streaming, music, cloud storage, apps, gym, delivery memberships.</div>`}</div>
    <div class="actions"><button class="btn primary" data-action="add" data-list="subs">Add a subscription</button></div>
    <div class="sumline"><span>Total each month</span><span class="n" id="sumSubs"></span></div>
    <div class="sumline sub"><span>Over a full year</span><span id="sumSubsYear"></span></div>
  </section>`;
}

/* ---------- live refresh of computed values (keeps focus while typing) ---------- */
function setText(id,t){ const el=document.getElementById(id); if(el) el.textContent=t; }
function refresh(){
  const T=totals();
  if(tab==="overview"){
    const big=$("#ovLeft"); big.textContent=money(T.left); big.classList.toggle("neg",T.left<0);
    let note="";
    if(!num(state.income)) note="Add the money you bring in each month to see what's left.";
    else if(T.left<0) note=`You're about ${money(-T.left)} short each month. Check Subscriptions for things you could cancel, and look at which bills could be lowered.`;
    else if(T.left<100) note="That's a thin cushion. Even a small surprise bill could cause trouble, so look for one thing to trim.";
    else note=`That's money for gas, household items, and anything unexpected. Saving even part of it builds a cushion.`;
    $("#ovNote").textContent=note;
    const parts=[["monthly","Monthly bills",T.monthly,"var(--pine)"],["yearly","Saving for yearly bills",T.yearly,"var(--sun)"],
      ["grocery","Groceries",T.grocery,"var(--leaf)"],["subs","Subscriptions",T.subs,"var(--slate)"]];
    const base=Math.max(num(state.income),T.spent)||1;
    $("#ovBar").innerHTML=parts.map(p=>`<i style="width:${(p[2]/base*100).toFixed(2)}%;background:${p[3]}"></i>`).join("");
    $("#ovLegend").innerHTML=parts.map(p=>`<dt><span class="sw" style="background:${p[3]}"></span><button data-goto="${p[0]}">${p[1]}</button></dt><dd>${money(p[2])}</dd>`).join("")
      +`<dt class="total">Basics total</dt><dd class="total">${money(T.spent)}</dd>`;
    // upcoming
    const t=today(), lim=new Date(t.getFullYear(),t.getMonth(),t.getDate()+14), mk=monthKey(), items=[];
    state.monthly.forEach(b=>{ if(!b.day) return; const d=nextMonthlyDate(num(b.day));
      if(d<=lim && !(b.paid && b.paid[monthKey(d)])) items.push({d,name:b.name||"Bill",amt:num(b.amount)}); });
    state.yearly.forEach(b=>{ const d=nextYearlyDate(b.due); if(d&&d<=lim) items.push({d,name:b.name||"Yearly bill",amt:num(b.amount)}); });
    state.subs.forEach(s=>{ const d=nextSubDate(s); if(d&&d<=lim) items.push({d,name:s.name||"Subscription",amt:num(s.cost),sub:s.using===false}); });
    items.sort((a,b)=>a.d-b.d);
    $("#ovSoon").innerHTML=items.length?items.map(i=>`<li><div><div>${esc(i.name)}${i.sub?` <span style="color:var(--sun)">(not using)</span>`:""}</div><div class="when">${whenText(i.d)}</div></div><b>${moneySmart(i.amt)}</b></li>`).join("")
      :`<li class="empty">Nothing due in the next two weeks${state.monthly.some(b=>!b.day)?" (add due days to your monthly bills to see them here)":""}.</li>`;
    showInstallHint();
  }
  if(tab==="monthly"){
    const mk=monthKey();
    setText("sumMonthly",money(T.monthly,true));
    setText("sumUnpaid",money(state.monthly.filter(b=>!(b.paid&&b.paid[mk])).reduce((s,b)=>s+num(b.amount),0),true));
    state.monthly.forEach(b=>{ const el=document.querySelector(`[data-out="due"][data-id="${b.id}"]`); if(!el) return;
      el.textContent = b.day ? `Next due ${whenText(nextMonthlyDate(num(b.day)))}` : ""; });
  }
  if(tab==="yearly"){
    setText("sumYearly",money(T.yearly,true));
    setText("sumYearlyFull",money(state.yearly.reduce((s,b)=>s+num(b.amount),0),true));
    state.yearly.forEach(b=>{ const el=document.querySelector(`[data-out="setaside"][data-id="${b.id}"]`); if(!el) return;
      const d=nextYearlyDate(b.due);
      if(!d||!num(b.amount)){ el.textContent="Add an amount and due date to see how much to save."; return; }
      const m=monthsUntil(d), per=num(b.amount)/m;
      el.innerHTML=`Save <b>${money(per,true)}</b> a month to be ready by ${esc(shortDate(d))}${m>1?` (${m} months)`:""}`; });
  }
  if(tab==="grocery"){
    const g=groceryMonth(), budget=num(state.grocery.budget), left=budget-g.cash;
    const t=today(), lastDay=new Date(t.getFullYear(),t.getMonth()+1,0).getDate(), daysLeft=lastDay-t.getDate()+1, weeks=Math.max(1,Math.ceil(daysLeft/7));
    const l=$("#gLeft"); l.textContent=money(left,true); l.classList.toggle("neg",left<0);
    setText("gLeftLabel", left<0?"over budget this month":"left this month");
    $("#gWeek").innerHTML = budget ? (left>0?`<b>${money(left/weeks,true)}</b><div style="color:var(--muted);font-size:.9rem">per week for ${weeks} more week${weeks>1?"s":""}</div>`:"") : "";
    const pct=budget?Math.min(100,g.cash/budget*100):0, tr=$("#gTrack");
    tr.style.width=pct+"%"; tr.className = g.cash>budget?"over":pct>80?"warn":"";
    setText("gSpent", budget ? `${money(g.cash,true)} of ${money(budget,true)} cash spent${g.snap?` · plus ${money(g.snap,true)} paid with SNAP`:""}` : "Set a budget below to start tracking.");
  }
  if(tab==="subs"){
    setText("sumSubs",money(T.subs,true));
    setText("sumSubsYear",money(T.subs*12,true));
    const unused=state.subs.filter(s=>s.using===false), save=unused.reduce((s,x)=>s+perMonth(x),0);
    $("#subCallout").innerHTML = unused.length
      ? `<div class="callout">Canceling ${unused.length===1?esc(unused[0].name||"that one"):`the ${unused.length} you don't use`} would save about <b>${money(save,true)}</b> a month, or <b>${money(save*12)}</b> a year.</div>` : "";
    state.subs.forEach(s=>{ const el=document.querySelector(`[data-out="sub"][data-id="${s.id}"]`); if(!el) return;
      const d=nextSubDate(s); const pm=perMonth(s);
      el.textContent = [s.cycle!=="monthly"&&num(s.cost)?`About ${money(pm,true)}/month`:"", d?`Next charge ${whenText(d)}`:""].filter(Boolean).join(" · ");
      document.querySelector(`[data-row="${s.id}"]`)?.classList.toggle("flag",s.using===false); });
  }
}

/* ---------- editing ---------- */
const LISTS = { monthly:()=>state.monthly, yearly:()=>state.yearly, subs:()=>state.subs, trips:()=>state.grocery.trips };
function onEdit(e){
  const el=e.target; const field=el.dataset.field; if(!field) return;
  if(field==="income"){ state.income=num(el.value); save(); refresh(); return; }
  if(field==="budget"){ state.grocery.budget=num(el.value); save(); refresh(); return; }
  const list=LISTS[el.dataset.list]; if(!list) return;
  const item=list().find(x=>x.id===el.dataset.id); if(!item) return;
  if(field==="paid"){ item.paid=item.paid||{}; item.paid[monthKey()]=el.checked; }
  else if(el.type==="checkbox") item[field]=el.checked;
  else if(el.type==="number") item[field]= field==="day" ? Math.min(31,Math.max(0,parseInt(el.value)||0)) || "" : num(el.value);
  else item[field]=el.value;
  save(); refresh();
}
document.addEventListener("input",onEdit);
document.addEventListener("change",e=>{ if(e.target.type==="checkbox"||e.target.tagName==="SELECT"||e.target.type==="date") onEdit(e); });

let lastDeleted=null, toastTimer=null, toastAction=null;
function toast(msg,btnLabel,onBtn,stay){
  $("#toastMsg").textContent=msg;
  const b=$("#toastBtn"); b.textContent=btnLabel||""; b.classList.toggle("on",!!btnLabel); toastAction=onBtn||null;
  $("#toast").classList.add("show"); clearTimeout(toastTimer);
  if(!stay) toastTimer=setTimeout(()=>$("#toast").classList.remove("show"),5000);
}
$("#toastBtn").addEventListener("click",()=>{ $("#toast").classList.remove("show"); if(toastAction) toastAction(); });
function undoDelete(){
  if(!lastDeleted) return; LISTS[lastDeleted.list]().splice(lastDeleted.index,0,lastDeleted.item);
  lastDeleted=null; save(); render();
}

document.addEventListener("click",e=>{
  const g=e.target.closest("[data-goto]"); if(g){ go(g.dataset.goto); return; }
  const a=e.target.closest("[data-action]"); if(!a) return;
  const act=a.dataset.action;
  if(act==="add"){
    const id=uid(), L=a.dataset.list;
    const item = L==="monthly"?{id,name:"",amount:"",day:"",cat:"other",paid:{}}
      : L==="yearly"?{id,name:"",amount:"",due:""}
      : L==="subs"?{id,name:"",cost:"",cycle:"monthly",renew:"",using:true}
      : {id,date:iso(today()),store:"",amount:"",snap:false};
    LISTS[L]().push(item); save(); render();
    const first=document.querySelector(`[data-row="${id}"] input[type=text], [data-row="${id}"] input`);
    first&&first.focus(); first&&first.scrollIntoView({block:"center"});
  }
  if(act==="del"){
    const arr=LISTS[a.dataset.list](), i=arr.findIndex(x=>x.id===a.dataset.id); if(i<0) return;
    const [item]=arr.splice(i,1); lastDeleted={list:a.dataset.list,index:i,item};
    save(); render(); toast(`Removed ${item.name||item.store||"item"}`,"Undo",undoDelete);
  }
  if(act==="demo"){ state=demo(); save(); render(); toast("Example household added. Edit anything to make it yours."); }
  if(act==="backup"){ S.exportBackup(state); toast("Backup saved to your downloads. Keep it somewhere safe, like your email or cloud storage."); }
  if(act==="restore"){ $("#restoreFile").value=""; $("#restoreFile").click(); }
  if(act==="clear"){
    if(confirm("Clear your whole budget? This can't be undone.")){ state=blank(); save(); render(); }
  }
});

/* ---------- example data ---------- */
function demo(){
  const t=today(), d=(n)=>iso(new Date(t.getFullYear(),t.getMonth(),t.getDate()+n)), mk=monthKey();
  const day=n=>((t.getDate()+n-1)%28)+1;
  return {v:1,income:2350,
    monthly:[
      {id:uid(),name:"Rent",amount:1150,day:1,cat:"housing",paid:{[mk]:true}},
      {id:uid(),name:"Electric",amount:165,day:day(5),cat:"electric",paid:{}},
      {id:uid(),name:"Water",amount:62,day:day(12),cat:"water",paid:{}},
      {id:uid(),name:"Phone",amount:45,day:day(3),cat:"phone",paid:{}},
      {id:uid(),name:"Car insurance",amount:118,day:day(9),cat:"insurance",paid:{}}],
    yearly:[
      {id:uid(),name:"Car registration",amount:45,due:d(150)},
      {id:uid(),name:"Renter's insurance",amount:180,due:d(70)},
      {id:uid(),name:"School supplies and fees",amount:120,due:d(290)}],
    grocery:{budget:320,trips:[
      {id:uid(),date:d(-6),store:"Grocery store",amount:64.18,snap:false},
      {id:uid(),date:d(-3),store:"Grocery store",amount:92.40,snap:true},
      {id:uid(),date:d(-1),store:"Corner market",amount:18.75,snap:false}].filter(x=>x.date.slice(0,7)===mk)},
    subs:[
      {id:uid(),name:"Streaming service",cost:15.49,cycle:"monthly",renew:d(4),using:true},
      {id:uid(),name:"Second streaming service",cost:9.99,cycle:"monthly",renew:d(18),using:false},
      {id:uid(),name:"Cloud photo storage",cost:2.99,cycle:"monthly",renew:d(11),using:true},
      {id:uid(),name:"Warehouse club membership",cost:65,cycle:"yearly",renew:d(95),using:true}]};
}

/* ---------- restore from a backup file ---------- */
$("#restoreFile").addEventListener("change",e=>{
  const file=e.target.files&&e.target.files[0]; if(!file) return;
  S.readBackup(file).then(data=>{
    if(hasData(state) && !confirm("Replace the budget on this phone with the one in the backup?")) return;
    state=data; S.save(state); render(); toast("Backup restored.");
  }).catch(msg=>toast(String(msg)));
});

/* ---------- install as an app ---------- */
let installEvent=null;
const isStandalone=()=>window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone===true;
const isIOS=()=>/iphone|ipad|ipod/i.test(navigator.userAgent);
window.addEventListener("beforeinstallprompt",e=>{ e.preventDefault(); installEvent=e; $("#installBtn").hidden=false; showInstallHint(); });
$("#installBtn").addEventListener("click",async()=>{
  if(!installEvent) return; installEvent.prompt();
  try{ await installEvent.userChoice; }catch(e){}
  installEvent=null; $("#installBtn").hidden=true;
});
window.addEventListener("appinstalled",()=>{ $("#installBtn").hidden=true; toast("Home Base is on your home screen."); });
function showInstallHint(){
  const el=document.getElementById("installHint"); if(!el) return;
  if(isStandalone()) el.textContent="";
  else if(isIOS()) el.textContent="Tip: On iPhone, tap the Share button in Safari, then \u201cAdd to Home Screen\u201d to use Home Base like an app, even without internet.";
  else if(installEvent) el.textContent="Tip: Tap \u201cInstall app\u201d at the top to put Home Base on your home screen. It works without internet.";
  else el.textContent="";
}

/* ---------- offline support + updates (see service-worker.js) ---------- */
if("serviceWorker" in navigator && location.protocol!=="file:"){
  window.addEventListener("load",()=>{
    navigator.serviceWorker.register("service-worker.js").then(reg=>{
      const offerUpdate=w=>toast("A new version of Home Base is ready.","Refresh",()=>w.postMessage("SKIP_WAITING"),true);
      if(reg.waiting && navigator.serviceWorker.controller) offerUpdate(reg.waiting);
      reg.addEventListener("updatefound",()=>{
        const w=reg.installing; if(!w) return;
        w.addEventListener("statechange",()=>{ if(w.state==="installed" && navigator.serviceWorker.controller) offerUpdate(w); });
      });
    }).catch(err=>console.warn("Offline support unavailable:",err));
    let reloaded=false;
    navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(reloaded) return; reloaded=true; location.reload(); });
  });
}

render();
})();
