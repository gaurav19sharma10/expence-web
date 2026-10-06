/* Expence web client.
 * Mirrors the Android app against the same Firestore backend, with live
 * listeners so both stay in sync with no refresh. */
const { app, auth, db, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut,
  collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, onSnapshot, query, orderBy, limit, writeBatch, Timestamp } = window.__FB;

const H = 'households';
const $ = sel => document.querySelector(sel);
const root = $('#root');

let user = null;          // {uid, email}
let profile = null;       // Firestore users/{uid}
let householdId = null;
let household = null;
let members = [];
let categories = [];
let expenses = [];
let settlements = [];
let topups = [];
let activity = [];
let unsubs = [];
let pendingTab = 'home';

// Currency display (store minor units everywhere).
function fmt(minor, cur) {
  const code = cur || household?.baseCurrency || 'INR';
  return (code === 'INR' ? '₹' : code + ' ') + (Math.abs(minor) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function today() { return Math.floor(Date.now() / 86400000); }
function toISODate(epochDay) { return new Date(epochDay * 86400000).toISOString().slice(0, 10); }
function monthName(epochDay) { return new Date(epochDay * 86400000).toLocaleString(undefined, { month: 'short', year: 'numeric' }); }
function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
function byUid(uid) { return members.find(m => m.uid === uid); }
function displayNameOf(uid) { const m = byUid(uid); return m?.displayName || m?.email || 'Member'; }

function monthISO() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
function inThisMonth(epochDay) {
  const d = new Date(epochDay * 86400000), n = new Date();
  return d.getUTCFullYear() === n.getUTCFullYear() && d.getUTCMonth() === n.getUTCMonth();
}

// ---------------------------- auth / session ------------------------------
onAuthStateChanged(auth, async u => {
  unsubs.forEach(f => f()); unsubs = [];
  if (!u) { user = null; householdId = null; profile = null; renderLogin(); return; }
  user = { uid: u.uid, email: u.email };
  renderSplash('Loading your account…');
  try {
    const snap = await getDoc(doc(db, 'users', u.uid));
    profile = snap.exists() ? snap.data() : null;
    if (profile) {
      profile.uid = u.uid;
      householdId = (profile.householdIds || [])[0] || null;
      watchHousehold();
      renderMain();
    } else {
      renderProfileGate();
    }
  } catch (e) {
    renderError(e.message);
  }
});

async function saveProfile() {
  const name = $('#pf-name').value.trim();
  const dob = $('#pf-dob').value;
  const mobile = $('#pf-mobile').value.trim();
  const country = $('#pf-country').value;
  if (!name) return alert('Please add your name.');
  const ref = doc(db, 'users', user.uid);
  const docData = { displayName: name, email: user.email, profileCompleted: true, householdIds: (profile?.householdIds || []) };
  if (dob) docData.dateOfBirth = dob;
  if (mobile) { docData.mobile = mobile; docData.mobileCountryIso = country; }
  else { docData.mobile = null; docData.mobileCountryIso = null; }
  await setDoc(ref, docData, { merge: true });
  profile = { ...(profile || {}), ...docData, uid: user.uid };
  renderFamilyGate();
}

// ---------------------------- family --------------------------------------
function renderFamilyGate() {
  root.innerHTML = '';
  const shell = el('div', 'center-card');
  shell.innerHTML = `
    <h2>Welcome${profile?.displayName ? ', ' + esc(profile.displayName) : ''}</h2>
    <p class="muted">Expence keeps one ledger per family.</p>
    <button class="btn primary big" id="createBtn">Create a family</button>
    <button class="btn" id="joinBtn">Join with a code</button>
    <button class="btn ghost" id="skipBtn">Skip for now</button>`;
  root.appendChild(shell);
  $('#createBtn').onclick = () => renderCreateFamily();
  $('#joinBtn').onclick = () => renderJoinFamily();
  $('#skipBtn').onclick = () => { householdId = null; renderMain(); };
}

function renderCreateFamily() {
  root.innerHTML = '';
  const shell = el('div', 'center-card');
  shell.innerHTML = `<h2>Create a family</h2>
    <label>Family name<input id="fam-name" placeholder="The Sharmars" /></label>
    <label>Base currency
      <select id="fam-cur">${CUR.map(c => `<option>${c}</option>`).join('')}</select>
    </label>
    <button class="btn primary big" id="makeFam">Create</button>
    <button class="btn ghost" id="back">Back</button>`;
  root.appendChild(shell);
  $('#back').onclick = renderFamilyGate;
  $('#makeFam').onclick = async () => {
    const name = $('#fam-name').value.trim() || 'My family';
    const baseCurrency = $('#fam-cur').value;
    const code = genCode();
    const hid = doc(collection(db, H)).id;
    const batch = writeBatch(db);
    batch.set(doc(db, H, hid), { name, baseCurrency, ownerUid: user.uid, inviteCode: code, monthlyBudgetMinor: 0 });
    batch.set(doc(db, `${H}/${hid}/members/${user.uid}`), {
      displayName: profile.displayName || user.email, email: user.email, photoURL: null,
      role: 'OWNER', joinedAt: Date.now(), defaultWeight: 1, monthlyBudgetMinor: 0, inviteCode: null });
    batch.set(doc(db, 'invites', code), { householdId: hid, householdName: name, active: true, createdBy: user.uid });
    batch.update(doc(db, 'users', user.uid), { displayName: profile.displayName, householdIds: [hid] });
    await batch.commit();
    householdId = hid;
    profile = { ...(profile || {}), householdIds: [hid] };
    watchHousehold();
    alert('Family created. Invite code: ' + code);
    renderMain();
  };
}

function renderJoinFamily() {
  root.innerHTML = '';
  const shell = el('div', 'center-card');
  shell.innerHTML = `<h2>Join with a code</h2>
    <label>Invite code<input id="join-code" placeholder="A1B2C3" /></label>
    <button class="btn primary big" id="join">Join</button>
    <button class="btn ghost" id="back">Back</button>`;
  root.appendChild(shell);
  $('#back').onclick = renderFamilyGate;
  $('#join').onclick = async () => {
    const code = $('#join-code').value.trim().toUpperCase();
    const inv = (await getDoc(doc(db, 'invites', code))).data();
    if (!inv || inv.active !== true) return alert('That code is not valid.');
    const hid = inv.householdId;
    await setDoc(doc(db, `${H}/${hid}/members/${user.uid}`), {
      displayName: profile.displayName || user.email, email: user.email, photoURL: null,
      role: 'MEMBER', joinedAt: Date.now(), defaultWeight: 1, monthlyBudgetMinor: 0, inviteCode: code });
    await updateDoc(doc(db, 'users', user.uid), { householdIds: [hid] });
    householdId = hid; profile = { ...(profile || {}), householdIds: [hid] };
    watchHousehold(); renderMain();
  };
}

function watchHousehold() {
  if (!householdId) return;
  unsubs.forEach(f => f()); unsubs = [];
  const href = doc(db, H, householdId);
  unsubs.push(onSnapshot(href, s => { household = s.data(); if (s.data()?.name) document.title = `Expence · ${s.data().name}`; renderMain(); }));
  unsubs.push(onSnapshot(collection(db, `${H}/${householdId}/members`), s => { if (s.data()?.find(r => r.inviteCode != null)) return; members = s.docs.map(d => ({ uid: d.id, ...d.data() })); renderMain(); }));
  unsubs.push(onSnapshot(collection(db, `${H}/${householdId}/categories`), s => { categories = s.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (a.order || 0) - (b.order || 0)); renderMain(); }));
  unsubs.push(onSnapshot(query(collection(db, `${H}/${householdId}/expenses`), orderBy('dateEpochDay', 'desc'), limit(500)), s => { expenses = s.docs.map(d => ({ id: d.id, ...d.data() })); renderMain(); }));
  unsubs.push(onSnapshot(query(collection(db, `${H}/${householdId}/settlements`), orderBy('dateEpochDay', 'desc'), limit(200)), s => { settlements = s.docs.map(d => ({ id: d.id, ...d.data() })); renderMain(); }));
  unsubs.push(onSnapshot(query(collection(db, `${H}/${householdId}/topups`), orderBy('dateEpochDay', 'desc'), limit(100)), s => { topups = s.docs.map(d => ({ id: d.id, ...d.data() })); renderMain(); }));
  unsubs.push(onSnapshot(query(collection(db, `${H}/${householdId}/activity`), orderBy('at', 'desc'), limit(60)), s => { activity = s.docs.map(d => ({ id: d.id, ...d.data() })); renderMain(); }));
}

// ---------------------------- render: top shell ------------------------------
function renderMain() {
  if (!householdId) return renderFamilyGate();
  root.innerHTML = '';
  const shell = el('div', 'app-shell');
  shell.appendChild(topbar());
  const content = el('main', 'content'); content.id = 'content'; shell.appendChild(content);
  shell.appendChild(tabbar());
  root.appendChild(shell);
  route();
}
function topbar() {
  const t = el('header', 'topbar');
  t.innerHTML = `<div class="brand">${esc(household?.name || 'Expence')}</div>
    <div class="actions">
      <button class="icon-btn" id="themeBtn" title="Toggle theme">${localStorage.getItem('theme') === 'dark' ? '☀️' : '🌙'}</button>
      <button class="icon-btn" id="signoutBtn" title="Sign out">⎋</button>
    </div>`;
  setTimeout(() => { $('#themeBtn').onclick = toggleTheme; $('#signoutBtn').onclick = () => signOut(auth); });
  return t;
}
function tabbar() {
  const bar = el('nav', 'tabbar');
  const tabs = [['home', '🏠', 'Home'], ['history', '🕘', 'History'], ['add', '＋', 'Add'], ['insights', '📈', 'Insights'], ['family', '👥', 'Family']];
  bar.innerHTML = tabs.map(([k, ic, l]) => `<button class="tab ${k === pendingTab ? 'active' : ''}" data-tab="${k}"><span class="ic">${ic}</span><span>${l}</span></button>`).join('');
  setTimeout(() => bar.querySelectorAll('.tab').forEach(b => b.onclick = () => { pendingTab = b.dataset.tab; route(); highlight(); }));
  function highlight() { bar.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === pendingTab)); }
  return bar;
}

function route() {
  const c = $('#content'); if (!c) return;
  c.innerHTML = '';
  if (pendingTab === 'home') return renderHome(c);
  if (pendingTab === 'history') return renderHistory(c);
  if (pendingTab === 'add') return renderAdd(c);
  if (pendingTab === 'insights') return renderInsights(c);
  if (pendingTab === 'family') return renderFamily(c);
}

// ---------------------------- home ------------------------------
function renderHome(c) {
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = profile?.displayName || 'You';
  const month = monthISO();
  const spent = expenses.filter(e => !e.deletedAt && inThisMonth(e.dateEpochDay)).reduce((s, e) => s + (e.baseAmountMinor || 0), 0);
  const pot = topups.reduce((s, t) => s + (t.baseAmountMinor || 0), 0);
  c.innerHTML = `
    <section class="hero">
      <h1>${greet},<br/>${esc(name)}</h1>
      <p class="muted">Let's talk about today's expense.</p>
    </section>
    <div class="stat-grid">
      <div class="card"><div class="muted small">This month</div><div class="big">${fmt(spent)}</div></div>
      <div class="card"><div class="muted small">Family pot</div><div class="big">${fmt(pot)}</div></div>
      <div class="card"><div class="muted small">Members</div><div class="big">${members.length}</div></div>
      <div class="card"><div class="muted small">Invite code</div><div class="big code">${esc(household?.inviteCode || '—')}</div></div>
    </div>
    <h3>Recent</h3>
    <div class="list">${expenses.slice(0, 5).map(rowExpense).join('') || '<p class="muted">No expenses yet.</p>'}</div>`;
}

function rowExpense(e) {
  return `<div class="row exp">
    <div class="avatar">${esc((displayNameOf(e.paidBy) || 'E').slice(0,1).toUpperCase())}</div>
    <div class="row-main"><strong>${esc(e.description || e.merchant || 'Expense')}</strong>
      <div class="muted small">${fmt(e.amountMinor, e.currency)} · ${esc(displayNameOf(e.paidBy))}</div></div>
    <div class="amt">${fmt(e.baseAmountMinor)}</div></div>`;
}

// ---------------------------- history ------------------------------
function renderHistory(c) {
  c.innerHTML = `
    <h2>History</h2>
    <input id="search" placeholder="Search" class="field" />
    <div class="chips" id="histChips"></div>
    <div id="histList" class="list"></div>`;
  const chips = [['all', 'All'], ['paid', 'I paid'], ['shared', 'Shared with me'], ['settlements', 'Settlements']];
  let filter = 'all';
  const chipsEl = $('#histChips');
  chipsEl.innerHTML = chips.map(([k, l]) => `<button class="chip ${k === filter ? 'on' : ''}" data-f="${k}">${l}</button>`).join('');
  const paint = () => {
    const q = ($('#search').value || '').toLowerCase();
    let items = [];
    if (filter !== 'settlements') items = items.concat(expenses.map(e => ({ t: 'exp', d: e })));
    if (filter !== 'paid' && filter !== 'shared') items = items.concat(settlements.map(s => ({ t: 'settle', d: s })));
    if (filter === 'paid') items = items.filter(i => i.t === 'exp' && i.d.paidBy === user.uid);
    if (filter === 'shared') items = items.filter(i => i.t === 'exp' && (i.d.participantIds || []).includes(user.uid) && i.d.paidBy !== user.uid);
    if (q) items = items.filter(i => (i.d.description || '').toLowerCase().includes(q) || (i.d.merchant || '').toLowerCase().includes(q) || displayNameOf(i.d.paidBy).toLowerCase().includes(q));
    items.sort((a, b) => (b.d.dateEpochDay || 0) - (a.d.dateEpochDay || 0));
    $('#histList').innerHTML = items.map(i => i.t === 'exp'
      ? `<div class="row exp"><div class="avatar">${esc((displayNameOf(i.d.paidBy)||'E')[0].toUpperCase())}</div><div class="row-main"><strong>${esc(i.d.description || i.d.merchant || 'Expense')}</strong><div class="muted small">Split ${(i.d.participantIds||[]).length} ways · ${toISODate(i.d.dateEpochDay)}</div></div><div class="amt">${fmt(i.d.baseAmountMinor)}</div></div>`
      : `<div class="row settle"><div class="avatar">✓</div><div class="row-main"><strong>${esc(displayNameOf(i.d.fromUid))} → ${esc(displayNameOf(i.d.toUid))}</strong><div class="muted small">${i.d.method || 'Cash'} · ${toISODate(i.d.dateEpochDay)}</div></div><div class="amt">${fmt(i.d.baseAmountMinor)}</div></div>`).join('') || '<p class="muted">No rows.</p>';
  };
  chipsEl.querySelectorAll('.chip').forEach(b => b.onclick = () => { filter = b.dataset.f; paint(); chipsEl.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x.dataset.f === filter)); });
  $('#search').oninput = paint;
  paint();
}

// ---------------------------- add expense ------------------------------
function renderAdd(c) {
  c.innerHTML = `
    <h2>New expense</h2>
    <label>What was it<input id="add-desc" placeholder="Dinner, rent, petrol…" class="field" /></label>
    <div class="row">
      <label style="flex:1">Amount<input id="add-amt" inputmode="decimal" placeholder="0.00" class="field" /></label>
      <label>Category<select id="add-cat" class="field">${categories.map(k => `<option value="${k.id}">${esc(k.name)}</option>`).join('')}</select></label>
    </div>
    <label>Who paid
      <select id="add-payer" class="field">${members.map(m => `<option value="${m.uid}" ${m.uid === user.uid ? 'selected' : ''}>${esc(displayNameOf(m.uid))}</option>`).join('')}</select>
    </label>
    <h4>Split between</h4>
    <div id="add-participants">${members.map(m => `<label class="check"><input type="checkbox" value="${m.uid}" checked /> ${esc(displayNameOf(m.uid))}</label>`).join('')}</div>
    <label>Merchant (optional)<input id="add-merchant" class="field" /></label>
    <button class="btn primary big" id="add-save">Save</button>`;
  $('#add-save').onclick = async () => {
    const desc = $('#add-desc').value.trim();
    const amt = parseFloat($('#add-amt').value || '0');
    const payer = $('#add-payer').value;
    const cat = $('#add-cat').value;
    const participants = [...$('#add-participants').querySelectorAll('input:checked')].map(i => i.value);
    if (!amt || amt <= 0) return alert('Enter an amount.');
    if (!participants.length) return alert('Pick at least one person.');
    const base = household.baseCurrency || 'INR';
    const amountMinor = Math.round(amt * 100);
    // Equal split: distribute remainder cent by cent so keys match participants exactly.
    const n = participants.length; const baseShare = Math.floor(amountMinor / n); let rem = amountMinor - baseShare * n;
    const splits = {}; participants.forEach((u, i) => splits[u] = baseShare + (i < rem ? 1 : 0));
    const spentByCategoryThisMonth = expenses.filter(e => !e.deletedAt && inThisMonth(e.dateEpochDay) && e.categoryId === cat).reduce((s, e) => s + (e.baseAmountMinor || 0), 0) + amountMinor;
    const cap = categories.find(k => k.id === cat)?.monthlyBudgetMinor || 0;
    if (cap > 0 && spentByCategoryThisMonth > cap) { if (!confirm(`This pushes ${categories.find(k => k.id === cat)?.name} to ${fmt(spentByCategoryThisMonth)}, over the ${fmt(cap)} budget. Save anyway?`)) return; }
    const id = doc(collection(db, `${H}/${householdId}/expenses`)).id;
    await setDoc(doc(db, `${H}/${householdId}/expenses/${id}`), {
      description: desc, notes: null, amountMinor, currency: base, fxRate: 1, baseAmountMinor: amountMinor,
      paidBy: payer, createdBy: user.uid, splitMode: 'EQUAL', splits, participantIds: participants,
      splitTotalMinor: amountMinor, categoryId: cat, dateEpochDay: today(), createdAt: Date.now(), updatedAt: Date.now(),
      version: 1, receiptPath: null, merchant: $('#add-merchant').value.trim() || null, recurringId: null, sequence: null, deletedAt: null,
    });
    await logActivity('EXPENSE_ADDED', payer === user.uid ? 'You added an expense' : `${displayNameOf(payer)} added an expense`, amountMinor);
    pendingTab = 'history'; route();
  };
}

async function logActivity(kind, summary, amountMinor) {
  try {
    await addDoc(collection(db, `${H}/${householdId}/activity`), {
      householdId, kind, actorUid: user.uid, actorName: profile?.displayName || user.email,
      summary, amountMinor: amountMinor || null, targetId: null, at: Date.now(),
    });
  } catch (_) {}
}

// ---------------------------- insights ------------------------------
function renderInsights(c) {
  const thisMonth = expenses.filter(e => !e.deletedAt && inThisMonth(e.dateEpochDay)).reduce((s, e) => s + (e.baseAmountMinor || 0), 0);
  const byCat = {};
  expenses.filter(e => !e.deletedAt && inThisMonth(e.dateEpochDay)).forEach(e => { const k = e.categoryId || 'Uncategorised'; byCat[k] = (byCat[k] || 0) + (e.baseAmountMinor || 0); });
  const prev = expenses.filter(e => !e.deletedAt && !inThisMonth(e.dateEpochDay) && new Date(e.dateEpochDay * 86400000).getUTCMonth() === (new Date().getUTCMonth() + 11) % 12).reduce((s, e) => s + (e.baseAmountMinor || 0), 0);
  c.innerHTML = `
    <h2>Insights</h2>
    <div class="card"><div class="muted small">This month</div><div class="big">${fmt(thisMonth)}</div>
      <div class="muted small">Previous month ${fmt(prev)}</div></div>
    <h3>By category</h3>
    ${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="row"><div class="row-main">${esc(categories.find(x => x.id === k)?.name || 'Uncategorised')}<div class="bar"><i style="width:${Math.min(100, thisMonth ? v / thisMonth * 100 : 0)}%"></i></div></div><div class="amt">${fmt(v)}</div></div>`).join('') || '<p class="muted">No categories yet.</p>'}`;
}

// ---------------------------- family / members / pot ------------------------------
function renderFamily(c) {
  const pot = topups.reduce((s, t) => s + (t.baseAmountMinor || 0), 0);
  c.innerHTML = `
    <h2>Family</h2>
    <div class="card"><div class="muted small">Invite code</div><div class="big code">${esc(household?.inviteCode || '—')}</div>
      <div class="row gap"><button class="btn" id="copyCode">Copy</button><button class="btn" id="shareCode">Share</button></div></div>
    <h3>Members (${members.length})</h3>
    <div class="list">${members.map(m => `<div class="row"><div class="avatar">${esc((m.displayName || m.email || 'M')[0].toUpperCase())}</div><div class="row-main"><strong>${esc(m.displayName || m.email)}</strong> <span class="tag">${m.role === 'OWNER' ? 'Owner' : 'Member'}</span><div class="muted small">${esc(m.email || '')}</div></div><div class="muted small">₹0.00</div></div>`).join('')}</div>
    <h3>Family pot</h3>
    <div class="card"><div class="big">${fmt(pot)}</div>
      <button class="btn" id="addTopup">Add money</button></div>
    <div class="list">${topups.map(t => `<div class="row"><div class="avatar">💰</div><div class="row-main"><strong>${esc(t.note || 'Contribution')}</strong><div class="muted small">${Object.keys(t.contributions || {}).map(displayNameOf).join(', ')}</div></div><div class="amt">${fmt(t.baseAmountMinor)}</div></div>`).join('') || '<p class="muted">No contributions yet.</p>'}</div>
    <h3>Settlements</h3>
    <button class="btn" id="addSettle">Record settlement</button>
    <div class="list">${settlements.map(s => `<div class="row"><div class="avatar">⇄</div><div class="row-main"><strong>${esc(displayNameOf(s.fromUid))} → ${esc(displayNameOf(s.toUid))}</strong><div class="muted small">${esc(s.method || '')}</div></div><div class="amt">${fmt(s.baseAmountMinor)}</div></div>`).join('') || '<p class="muted">None.</p>'}</div>
    <h3>Activity</h3>
    <div class="list">${activity.slice(0, 20).map(a => `<div class="row"><div class="avatar">•</div><div class="row-main"><strong>${esc(a.summary || a.kind || 'Update')}</strong><div class="muted small">${esc(a.actorName || '')} · ${a.at ? new Date(a.at).toLocaleString() : ''}</div></div>${a.amountMinor != null ? `<div class="amt">${fmt(a.amountMinor)}</div>` : ''}</div>`).join('') || '<p class="muted">Nothing yet.</p>'}</div>
    <h3>Settings</h3>
    <div class="card">
      <label>Household name<input id="set-name" value="${esc(household?.name || '')}" class="field" /></label>
      <label>Base currency<select id="set-cur" class="field">${CUR.map(x => `<option ${x === household?.baseCurrency ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
      <button class="btn" id="set-save">Save</button>
      <button class="btn" id="exportCsv">Export CSV</button>
    </div>`;

  $('#copyCode').onclick = () => navigator.clipboard.writeText(household?.inviteCode || '').then(() => alert('Copied'));
  $('#shareCode').onclick = () => navigator.share?.({ title: 'Expence invite', text: `Join my family on Expence with code ${household?.inviteCode}` }) || navigator.clipboard.writeText(household?.inviteCode || '');
  $('#addTopup').onclick = () => promptTopup();
  $('#addSettle').onclick = () => promptSettle();
  $('#set-save').onclick = async () => {
    const name = $('#set-name').value.trim(); if (!name) return;
    await updateDoc(doc(db, H, householdId), { name, baseCurrency: $('#set-cur').value });
    alert('Saved');
  };
  $('#exportCsv').onclick = () => {
    const rows = [['date', 'description', 'amount_minor', 'currency', 'paid_by', 'category', 'splits'].join(',')]
      .concat(expenses.map(e => [e.dateEpochDay, `"${(e.description || '').replace(/"/g, '""')}"`, e.amountMinor, e.currency, displayNameOf(e.paidBy), (categories.find(k => k.id === e.categoryId) || {}).name || '', Object.keys(e.splits || {}).map(u => displayNameOf(u) + ':' + (e.splits[u] / 100)).join('|')].join(',')));
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'expence-expenses.csv'; a.click();
  };
}

function promptTopup() {
  const amt = parseFloat(prompt('Amount to add to the family pot:'));
  if (!amt || amt <= 0) return;
  setDoc(doc(collection(db, `${H}/${householdId}/topups`)), {
    contributions: { [user.uid]: Math.round(amt * 100) }, baseAmountMinor: Math.round(amt * 100),
    currencyCode: household.baseCurrency || 'INR', note: prompt('Note (optional)') || null,
    dateEpochDay: today(), createdAt: Date.now(), createdBy: user.uid,
  });
}
function promptSettle() {
  const to = prompt('Settle with which member? Use their name/email:  ' + members.map(m => displayNameOf(m.uid)).join(', '));
  const match = members.find(m => displayNameOf(m.uid).toLowerCase() === (to || '').toLowerCase());
  if (!match) return alert('No match');
  const amt = parseFloat(prompt('Amount ₨ :'));
  if (!amt || amt <= 0) return;
  setDoc(doc(collection(db, `${H}/${householdId}/settlements`)), {
    fromUid: user.uid, toUid: match.uid, baseAmountMinor: Math.round(amt * 100), currency: household.baseCurrency || 'INR',
    method: 'Cash', note: null, dateEpochDay: today(), createdAt: Date.now(), createdBy: user.uid, deletedAt: null,
  });
}

// ---------------------------- auth screens ------------------------------
function renderSplash(msg) { root.innerHTML = `<div class="center"><div class="logo">E</div><p>${msg}</p></div>`; }
function renderError(msg) { root.innerHTML = `<div class="center card"><h3>Could not load</h3><p>${esc(msg)}</p></div>`; }
function renderLogin() {
  root.innerHTML = '';
  const shell = el('div', 'center-card');
  shell.innerHTML = `<h1 class="logo-text">Expence</h1>
    <h3>Welcome back</h3>
    <label>Email<input id="li-email" type="email" class="field" /></label>
    <label>Password<input id="li-pass" type="password" class="field" /></label>
    <button class="btn primary big" id="li-signin">Sign in</button>
    <button class="btn ghost" id="li-toggle">Create an account</button>
    <p id="li-err" class="err"></p>`;
  root.appendChild(shell);
  let signup = false;
  $('#li-toggle').onclick = () => { signup = !signup; $('#li-toggle').textContent = signup ? 'Have an account? Sign in' : 'Create an account'; $('#li-signin').textContent = signup ? 'Create account' : 'Sign in'; };
  $('#li-signin').onclick = async () => {
    const e = $('#li-email').value.trim(), p = $('#li-pass').value;
    try { if (signup) await createUserWithEmailAndPassword(auth, e, p); else await signInWithEmailAndPassword(auth, e, p); }
    catch (err) { $('#li-err').textContent = err.message; }
  };
}
function renderProfileGate() {
  root.innerHTML = '';
  const shell = el('div', 'center-card');
  shell.innerHTML = `<h2>Set up your profile</h2>
    <label>Name<input id="pf-name" class="field" /></label>
    <label>Date of birth<input id="pf-dob" type="date" class="field" /></label>
    <label>Mobile (optional)<input id="pf-mobile" inputmode="tel" class="field" /></label>
    <label>Country<select id="pf-country" class="field">${isoCodes.map(c => `<option>${c}</option>`).join('')}</select></label>
    <button class="btn primary big" id="pf-save">Save</button>`;
  root.appendChild(shell);
  $('#pf-save').onclick = saveProfile;
}

// ---------------------------- helpers ------------------------------
const CUR = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const isoCodes = ['IN', 'US', 'GB', 'AE', 'SG', 'DE', 'FR', 'JP', 'AU', 'CA'];
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function genCode() { const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)]; return s; }
function toggleTheme() { const t = localStorage.getItem('theme') === 'dark' ? 'light' : 'dark'; localStorage.setItem('theme', t); document.documentElement.classList.toggle('dark', t === 'dark'); const b = $('#themeBtn'); if (b) b.textContent = t === 'dark' ? '☀️' : '🌙'; }
document.documentElement.classList.toggle('dark', localStorage.getItem('theme') === 'dark');
