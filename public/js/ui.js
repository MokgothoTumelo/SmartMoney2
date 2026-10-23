/* SmartMoney — shared UI helpers */
(function (global) {
  'use strict';

  const ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>',
    budget: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5M16 4v5"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5-5 5 5"/><path d="M12 5v12"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  };

  const PAGES = [
    { key: 'welcome', label: 'Welcome', icon: 'home', href: 'index.html', show: false },
    { key: 'money', label: 'My Money', icon: 'wallet', href: 'money.html', show: true },
    { key: 'budget', label: 'My Budget', icon: 'budget', href: 'budget.html', show: true },
    { key: 'goals', label: 'Savings Goals', icon: 'target', href: 'goals.html', show: true },
    { key: 'safety', label: 'Safety Centre', icon: 'shield', href: 'safety.html', show: true },
    { key: 'settings', label: 'Settings', icon: 'settings', href: 'settings.html', show: true },
  ];

  function renderNav(activeKey) {
    const side = document.getElementById('sideNav');
    if (side) {
      side.innerHTML = PAGES.filter(p => p.show || p.key === 'welcome').map(p => `
        <a class="nav-btn ${activeKey === p.key ? 'active' : ''}" href="${p.href}"
          ${activeKey === p.key ? 'aria-current="page"' : ''}>
          <span aria-hidden="true">${ICONS[p.icon]}</span><span>${SMStore.esc(p.label)}</span>
        </a>`).join('');
    }
    const bottom = document.getElementById('bottomNav');
    if (bottom) {
      bottom.innerHTML = PAGES.filter(p => p.show).map(p => `
        <a class="bn-btn ${activeKey === p.key ? 'active' : ''}" href="${p.href}">
          <span aria-hidden="true">${ICONS[p.icon]}</span><span>${SMStore.esc(p.label.split(' ')[0])}</span>
        </a>`).join('');
    }
  }

  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function applyA11y() {
    const s = SMStore.getState().settings;
    document.documentElement.setAttribute('data-theme', s.theme === 'dark' ? 'dark' : 'light');
    document.documentElement.setAttribute('data-contrast', s.contrast === 'high' ? 'high' : 'normal');
    document.documentElement.setAttribute('data-fontsize', s.fontsize || 'normal');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', s.theme === 'dark' ? '#0b1220' : '#0f172a');
  }

  function updateOnline() {
    const pill = document.getElementById('offlinePill');
    if (!pill) return;
    pill.classList.toggle('show', !navigator.onLine);
  }

  /* Proper segmented control as button group with ARIA tab behaviour */
  function wireSegmented(root, onChange) {
    if (!root) return;
    const buttons = Array.from(root.querySelectorAll('[role="tab"], button[data-period], button[data-tt]'));
    buttons.forEach((btn, i) => {
      btn.setAttribute('role', 'tab');
      const selected = btn.classList.contains('active');
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.setAttribute('tabindex', selected ? '0' : '-1');
      btn.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
          b.setAttribute('tabindex', '-1');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        btn.setAttribute('tabindex', '0');
        if (onChange) onChange(btn);
      });
      btn.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = buttons[(i + 1) % buttons.length];
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = buttons[(i - 1 + buttons.length) % buttons.length];
        if (e.key === 'Home') next = buttons[0];
        if (e.key === 'End') next = buttons[buttons.length - 1];
        if (next) {
          e.preventDefault();
          next.focus();
          next.click();
        }
      });
    });
  }

  function registerSW() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('./service-worker.js').catch(function () {});
  }

  function pinGate(then) {
    if (!SMStore.hasPin()) { then(); return; }
    const existing = document.getElementById('pinOverlay');
    if (existing) return;
    const overlay = document.createElement('div');
    overlay.id = 'pinOverlay';
    overlay.className = 'pin-overlay';
    overlay.innerHTML = `
      <div class="pin-card" role="dialog" aria-modal="true" aria-labelledby="pinTitle">
        <h2 id="pinTitle">${ICONS.lock} Unlock SmartMoney</h2>
        <p class="small-text">Enter your PIN to open the app on this shared device.</p>
        <label for="pinInput">PIN</label>
        <input id="pinInput" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" />
        <p class="small-text muted" id="pinErr" style="color:var(--red);min-height:1.2em"></p>
        <button class="primary" id="pinSubmit" type="button">Unlock</button>
      </div>`;
    document.body.appendChild(overlay);
    const input = document.getElementById('pinInput');
    const err = document.getElementById('pinErr');
    function tryUnlock() {
      if (SMStore.verifyPin(input.value)) {
        overlay.remove();
        sessionStorage.setItem('sm_unlocked', '1');
        then();
      } else {
        err.textContent = 'Incorrect PIN. Try again.';
        input.value = '';
        input.focus();
      }
    }
    document.getElementById('pinSubmit').addEventListener('click', tryUnlock);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') tryUnlock(); });
    input.focus();
  }

  /* Guest or signed-in access: welcomeSeen is set by Continue without account or login/signup */
  function hasAppAccess() {
    try {
      const st = SMStore.getState();
      if (!st.welcomeSeen) return false;
      const sync = st.sync || {};
      /* Account mode is only valid if the server gave us a user id at login.
         (Old fake logins had no id, so they are sent back to log in properly.) */
      if (sync.accountMode === 'account' && !sync.uid) return false;
      return true;
    } catch (e) { return false; }
  }

  function requireAppAccess(activeKey) {
    if (activeKey === 'welcome') return true;
    if (hasAppAccess()) return true;
    /* Not logged in / no guest session — send to welcome */
    location.replace('index.html');
    return false;
  }

  function bootPage(activeKey) {
    applyA11y();
    updateOnline();
    registerSW();
    window.addEventListener('online', () => { updateOnline(); toast('Back online'); });
    window.addEventListener('offline', () => { updateOnline(); toast('You are offline — saved records still work'); });

    /* Welcome page: no side nav / bottom nav */
    if (activeKey === 'welcome') {
      return;
    }

    /* Protect app pages until user continues as guest or signs in */
    if (!requireAppAccess(activeKey)) return;

    renderNav(activeKey);

    /* PIN lock: require unlock once per browser session */
    if (SMStore.hasPin() && sessionStorage.getItem('sm_unlocked') !== '1') {
      pinGate(function () {});
    }
  }

  function txItem(tx) {
    const isInc = tx.type === 'income';
    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-cat">${SMStore.esc(tx.category)}${tx.essential ? ' <span class="badge neutral">essential</span>' : ''}</div>
          <div class="tx-meta">${SMStore.fmtDate(tx.date)}${tx.description ? ' · ' + SMStore.esc(tx.description) : ''}${!tx.paid ? ' · planned' : ''}</div>
        </div>
        <div class="tx-amt ${isInc ? 'pos' : 'neg'}">${isInc ? '+' : '−'}${SMStore.ZAR(SMStore.num(tx.amount))}</div>
        <div class="tx-actions">
          <button class="icon-btn ghost" data-edit-tx="${tx.id}" aria-label="Edit transaction">${ICONS.edit}</button>
          <button class="icon-btn danger" data-del-tx="${tx.id}" aria-label="Delete transaction">${ICONS.trash}</button>
        </div>
      </div>`;
  }
  function plannedItem(p) {
    const d = SMStore.daysUntil(p.date);
    const cls = d < 0 ? 'high' : d <= 3 ? 'medium' : 'neutral';
    const status = d < 0 ? 'Overdue' : d === 0 ? 'Today' : `In ${d}d`;
    const freq = p.frequency ? ' · ' + p.frequency : '';
    return `
      <div class="tx-item">
        <div class="tx-left">
          <div class="tx-cat">${SMStore.esc(p.category)} <span class="badge ${cls}">${status}</span></div>
          <div class="tx-meta">${SMStore.fmtDate(p.date)}${p.description ? ' · ' + SMStore.esc(p.description) : ''}${p.essential ? ' · essential' : ''}${freq}</div>
        </div>
        <div class="tx-amt warn">${SMStore.ZAR(SMStore.num(p.amount))}</div>
        <div class="tx-actions">
          <button class="icon-btn ghost" data-mark-paid="${p.id}" aria-label="Mark paid">${ICONS.check}</button>
          <button class="icon-btn ghost" data-edit-planned="${p.id}" aria-label="Edit planned">${ICONS.edit}</button>
          <button class="icon-btn danger" data-del-planned="${p.id}" aria-label="Delete planned">${ICONS.trash}</button>
        </div>
      </div>`;
  }
  function breakdownBar(t) {
    const income = Math.max(t.totalIncome, 0);
    const total = Math.max(income, t.totalExpenses + t.plannedEssential + t.plannedOptional + t.savingsTotal, 1);
    const seg = [
      { label: 'Paid expenses', value: t.totalExpenses, color: '#0d9488' },
      { label: 'Planned essentials', value: t.plannedEssential, color: '#b45309' },
      { label: 'Planned optional', value: t.plannedOptional, color: '#b45309' },
      { label: 'In savings goals', value: t.savingsTotal, color: '#6366f1' },
    ];
    const avail = Math.max(0, t.available);
    if (avail > 0) seg.push({ label: 'Estimated available', value: avail, color: '#15803d' });
    return `
      <div class="chart-bar" role="img" aria-label="Bar showing how recorded income is split">
        ${seg.filter(x => x.value > 0).map(x => `<div style="width:${(x.value/total)*100}%;background:${x.color}" title="${x.label}: ${SMStore.ZAR(x.value)}"></div>`).join('')}
      </div>
      <div class="legend">
        ${seg.filter(x => x.value > 0).map(x => `<span><span class="dot" style="background:${x.color}"></span>${x.label}: ${SMStore.ZAR(x.value)}</span>`).join('')}
      </div>`;
  }

  global.SMUI = { ICONS, PAGES, renderNav, toast, applyA11y, updateOnline, bootPage, wireSegmented, txItem, plannedItem, breakdownBar, registerSW, hasAppAccess, requireAppAccess };
})(window);
