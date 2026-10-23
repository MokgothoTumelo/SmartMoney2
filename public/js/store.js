/* SmartMoney — shared store, persistence, calculations */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'smartmoney_v1';
  const PIN_KEY = 'smartmoney_pin_hash';

  let _idc = 0;
  function uid() {
    _idc++;
    return 'id_' + Date.now().toString(36) + '_' + _idc + Math.random().toString(36).slice(2, 6);
  }

  /* Local-date helpers — avoid UTC shift from toISOString() between 00:00–02:00 SAST */
  function pad2(n) { return n < 10 ? '0' + n : String(n); }
  function localYMD(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function todayISO(offset) {
    const d = new Date();
    d.setHours(12, 0, 0, 0); /* noon avoids DST edge cases */
    d.setDate(d.getDate() + (offset || 0));
    return localYMD(d);
  }
  function weekStartISO() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
    return localYMD(d);
  }
  function monthStartISO() {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(1);
    return localYMD(d);
  }

  function num(v, fallback) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : (fallback === undefined ? 0 : fallback);
  }
  function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
  function ZAR(n) {
    const v = Number.isFinite(n) ? n : 0;
    return 'R' + v.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function ZAR0(n) {
    const v = Number.isFinite(n) ? n : 0;
    return 'R' + Math.round(v).toLocaleString('en-ZA');
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso + 'T12:00:00');
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function daysUntil(iso) {
    const a = new Date(todayISO() + 'T12:00:00');
    const b = new Date(iso + 'T12:00:00');
    return Math.round((b - a) / 86400000);
  }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  const INCOME_CATS = ['Casual work', 'Informal business', 'Grant or support payment', 'Other income'];
  const EXPENSE_CATS = ['Food', 'Transport', 'Electricity', 'Rent', 'Airtime and data', 'School expenses', 'Healthcare', 'Family support', 'Other expenses'];
  const FREQ_OPTS = [
    { value: '', label: 'One-off' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'fortnightly', label: 'Fortnightly' },
    { value: 'monthly', label: 'Monthly' },
  ];
  const GOAL_TYPES = [
    { value: 'personal', label: 'Personal' },
    { value: 'stokvel', label: 'Stokvel' },
    { value: 'group', label: 'Group savings' },
  ];

  function defaultState() {
    return {
      version: 2,
      settings: { theme: 'light', contrast: 'normal', fontsize: 'normal', pinEnabled: false },
      profile: { name: '', phone: '', email: '', updatedAt: null, syncStatus: 'pending' },
      transactions: [],
      planned: [],
      goals: [],
      sync: { lastSyncedAt: null, lastSyncError: null, accountMode: 'guest', uid: null },
      isSample: false,
      welcomeSeen: false,
    };
  }
  function sampleState() {
    const s = defaultState();
    s.isSample = true;
    s.welcomeSeen = true;
    s.transactions = [
      { id: uid(), type: 'income', amount: 750, category: 'Casual work', date: todayISO(-2), description: 'Piece job', note: '', essential: false, paid: true },
      { id: uid(), type: 'income', amount: 450, category: 'Informal business', date: todayISO(-1), description: 'Sold goods', note: '', essential: false, paid: true },
      { id: uid(), type: 'expense', amount: 180, category: 'Food', date: todayISO(-2), description: 'Groceries', note: '', essential: true, paid: true },
      { id: uid(), type: 'expense', amount: 90, category: 'Transport', date: todayISO(-1), description: 'Taxi', note: '', essential: true, paid: true },
      { id: uid(), type: 'expense', amount: 120, category: 'Electricity', date: todayISO(0), description: 'Prepaid', note: '', essential: true, paid: true },
    ];
    s.planned = [
      { id: uid(), amount: 1500, category: 'Rent', date: todayISO(6), description: 'Monthly rent', essential: true, paid: false, frequency: 'monthly' },
      { id: uid(), amount: 400, category: 'School expenses', date: todayISO(12), description: 'School fees', essential: true, paid: false, frequency: '' },
    ];
    s.goals = [
      { id: uid(), name: 'Emergency money', target: 3000, saved: 400, targetDate: todayISO(120), goalType: 'personal', contribAmount: 0, contribFreq: '', contributions: [{ id: uid(), amount: 400, date: todayISO(-5), type: 'deposit' }] },
    ];
    return s;
  }

  function migrate(s) {
    const base = defaultState();
    const m = Object.assign({}, base, s);
    m.settings = Object.assign({}, base.settings, s.settings || {});
    delete m.settings.lang; /* language UI removed */
    m.profile = Object.assign({ name: '', phone: '', email: '', updatedAt: null, syncStatus: 'pending' }, s.profile || {});
    m.profile.name = String(m.profile.name || '').trim();
    m.profile.phone = String(m.profile.phone || '').trim();
    m.profile.email = String(m.profile.email || '').trim();
    m.sync = Object.assign(
      { lastSyncedAt: null, lastSyncError: null, accountMode: 'guest', uid: null },
      s.sync || {}
    );
    m.transactions = Array.isArray(s.transactions) ? s.transactions.filter(t => t && typeof t === 'object') : [];
    m.planned = Array.isArray(s.planned) ? s.planned.filter(t => t && typeof t === 'object') : [];
    m.goals = Array.isArray(s.goals) ? s.goals.filter(g => g && typeof g === 'object') : [];
    m.transactions = m.transactions.map(t => ({
      id: t.id || uid(),
      type: t.type === 'expense' ? 'expense' : 'income',
      amount: Math.max(0, num(t.amount)),
      category: String(t.category || 'Other'),
      date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : todayISO(),
      description: String(t.description || ''),
      note: String(t.note || ''),
      essential: !!t.essential,
      paid: t.paid !== false,
      updatedAt: t.updatedAt || null,
      syncStatus: t.syncStatus === 'synced' ? 'synced' : 'pending',
    }));
    m.planned = m.planned.map(t => ({
      id: t.id || uid(),
      amount: Math.max(0, num(t.amount)),
      category: String(t.category || 'Other'),
      date: /^\d{4}-\d{2}-\d{2}$/.test(t.date) ? t.date : todayISO(7),
      description: String(t.description || ''),
      essential: t.essential !== false,
      paid: !!t.paid,
      frequency: ['weekly', 'fortnightly', 'monthly'].indexOf(t.frequency) >= 0 ? t.frequency : '',
      updatedAt: t.updatedAt || null,
      syncStatus: t.syncStatus === 'synced' ? 'synced' : 'pending',
    }));
    m.goals = m.goals.map(g => ({
      id: g.id || uid(),
      name: String(g.name || 'Goal'),
      target: Math.max(0, num(g.target)),
      saved: Math.max(0, num(g.saved)),
      targetDate: /^\d{4}-\d{2}-\d{2}$/.test(g.targetDate) ? g.targetDate : '',
      goalType: ['stokvel', 'group'].indexOf(g.goalType) >= 0 ? g.goalType : 'personal',
      contribAmount: Math.max(0, num(g.contribAmount)),
      contribFreq: ['weekly', 'fortnightly', 'monthly'].indexOf(g.contribFreq) >= 0 ? g.contribFreq : '',
      contributions: Array.isArray(g.contributions) ? g.contributions : [],
      updatedAt: g.updatedAt || null,
      syncStatus: g.syncStatus === 'synced' ? 'synced' : 'pending',
    }));
    m.version = 2;
    return m;
  }

  let state = (function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.warn('Load failed', e);
      return defaultState();
    }
  })();

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (e) { if (global.SMUI && SMUI.toast) SMUI.toast('Could not save — storage may be full.'); }
    if (global.SMUI && SMUI.applyA11y) SMUI.applyA11y();
    if (global.SMSync && SMSync.onSaved) SMSync.onSaved(); /* auto-backup when signed in */
  }

  /* Keep the "who is signed in" info when a whole-state replace happens (clear / sample / import) */
  function keepSession(next) {
    const cur = state || {};
    if (cur.sync) next.sync = Object.assign({}, cur.sync);
    next.welcomeSeen = true;
    return next;
  }

  /* Remove everything personal from this device (used on logout / when a different account logs in).
     Keeps only look-and-feel settings (theme, contrast, text size). */
  function resetLocalData() {
    const keep = state && state.settings ? state.settings : {};
    state = defaultState();
    state.settings = Object.assign({}, state.settings, {
      theme: keep.theme || 'light', contrast: keep.contrast || 'normal', fontsize: keep.fontsize || 'normal',
      pinEnabled: false
    });
    try { localStorage.removeItem(PIN_KEY); } catch (e) {}
    try { localStorage.removeItem('smartmoney_chat_history_v1'); } catch (e) {}
    try { sessionStorage.removeItem('sm_unlocked'); } catch (e) {}
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function isAccountMode() {
    return !!(state && state.sync && state.sync.accountMode === 'account');
  }

  function calcTotals() {
    const income = state.transactions.filter(t => t.type === 'income');
    const expenses = state.transactions.filter(t => t.type === 'expense' && t.paid);
    const totalIncome = round2(income.reduce((a, t) => a + num(t.amount), 0));
    const totalExpenses = round2(expenses.reduce((a, t) => a + num(t.amount), 0));
    const essentialPaid = round2(expenses.filter(t => t.essential).reduce((a, t) => a + num(t.amount), 0));
    const plannedEssential = round2(state.planned.filter(p => p.essential && !p.paid).reduce((a, p) => a + num(p.amount), 0));
    const plannedOptional = round2(state.planned.filter(p => !p.essential && !p.paid).reduce((a, p) => a + num(p.amount), 0));
    const savingsTotal = round2(state.goals.reduce((a, g) => a + num(g.saved), 0));
    /* Available after paid expenses, planned costs, AND money already put into savings goals */
    const available = round2(totalIncome - totalExpenses - plannedEssential - plannedOptional - savingsTotal);
    return { totalIncome, totalExpenses, essentialPaid, plannedEssential, plannedOptional, savingsTotal, available };
  }
  function calcPeriodTotals(period) {
    let from = null;
    if (period === 'week') from = weekStartISO();
    else if (period === 'month') from = monthStartISO();
    const inc = state.transactions.filter(t => t.type === 'income' && (!from || t.date >= from));
    const exp = state.transactions.filter(t => t.type === 'expense' && t.paid && (!from || t.date >= from));
    return {
      income: round2(inc.reduce((a, t) => a + num(t.amount), 0)),
      expenses: round2(exp.reduce((a, t) => a + num(t.amount), 0)),
      txCount: inc.length + exp.length,
      from: from
    };
  }
  function calcWeekTotals() {
    return calcPeriodTotals('week');
  }

  function loadSample() {
    if (!confirm('Load sample data? This will replace your current records.' + (isAccountMode() ? ' Because you are logged in, your cloud backup will be replaced too.' : ''))) return;
    state = keepSession(sampleState());
    save();
    if (global.SMUI && SMUI.toast) SMUI.toast('Sample data loaded');
    if (state.welcomeSeen) location.href = 'money.html';
  }
  function clearAll() {
    if (!confirm('Clear all records? This cannot be undone. Export first if you need a backup.' + (isAccountMode() ? '\n\nBecause you are logged in, this will also delete your cloud backup.' : ''))) return;
    state = keepSession(defaultState());
    save();
    if (global.SMUI && SMUI.toast) SMUI.toast('All data cleared');
    location.href = 'money.html';
  }
  function exportData() {
    try {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'smartmoney-backup-' + todayISO() + '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      if (global.SMUI && SMUI.toast) SMUI.toast('Backup downloaded');
    } catch (e) {
      if (global.SMUI && SMUI.toast) SMUI.toast('Export failed — your browser may block downloads');
    }
  }

  function importData(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      return { ok: false, error: 'File is not valid JSON. Please choose a SmartMoney backup file.' };
    }
    if (!parsed || typeof parsed !== 'object') {
      return { ok: false, error: 'Invalid backup structure.' };
    }
    if (!Array.isArray(parsed.transactions) && !Array.isArray(parsed.planned) && !Array.isArray(parsed.goals)) {
      return { ok: false, error: 'This does not look like a SmartMoney backup (missing records arrays).' };
    }
    try {
      state = keepSession(migrate(parsed)); /* never let a backup file change who is logged in */
      save();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: 'Could not restore records: ' + (e.message || 'unknown error') };
    }
  }

  /* Simple non-cryptographic PIN hash for shared-phone lock (not bank-grade) */
  function hashPin(pin) {
    let h = 2166136261;
    const s = 'sm_' + String(pin);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function setPin(pin) {
    if (!/^\d{4,6}$/.test(pin)) return false;
    try {
      localStorage.setItem(PIN_KEY, hashPin(pin));
      state.settings.pinEnabled = true;
      save();
      return true;
    } catch (e) { return false; }
  }
  function clearPin() {
    try { localStorage.removeItem(PIN_KEY); } catch (e) {}
    state.settings.pinEnabled = false;
    save();
  }
  function verifyPin(pin) {
    try {
      const stored = localStorage.getItem(PIN_KEY);
      if (!stored) return true;
      return stored === hashPin(pin);
    } catch (e) { return true; }
  }
  function hasPin() {
    try { return !!localStorage.getItem(PIN_KEY); } catch (e) { return false; }
  }

  function storageUsage() {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        const v = localStorage.getItem(k) || '';
        bytes += (k.length + v.length) * 2;
      }
    } catch (e) {}
    return { bytes: bytes, kb: Math.round(bytes / 102.4) / 10 };
  }

  global.SMStore = {
    STORAGE_KEY, uid, todayISO, weekStartISO, monthStartISO, num, round2, ZAR, ZAR0, fmtDate, daysUntil, esc,
    INCOME_CATS, EXPENSE_CATS, FREQ_OPTS, GOAL_TYPES,
    getState: () => state,
    setState: (s) => { state = s; },
    save, resetLocalData, isAccountMode, calcTotals, calcPeriodTotals, calcWeekTotals, loadSample, clearAll, exportData, importData,
    setPin, clearPin, verifyPin, hasPin, storageUsage,
  };
})(window);
