(function () {
  'use strict';
  SMUI.bootPage('money');
  const view = document.getElementById('view');
  let currentPeriod = 'week';
  let txSearch = '';

  function render() {
    const t = SMStore.calcTotals();
    const p = SMStore.calcPeriodTotals(currentPeriod);
    const s = SMStore.getState();
    const q = (txSearch || '').toLowerCase().trim();
    const sorted = [...s.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const filtered = (q ? sorted.filter(tx => {
      const hay = (tx.category + ' ' + (tx.description||'') + ' ' + tx.amount + ' ' + tx.type).toLowerCase();
      return hay.indexOf(q) !== -1;
    }) : sorted).slice(0, 12);
    const upcoming = [...s.planned].filter(p=>!p.paid).sort((a,b)=>(a.date||'').localeCompare(b.date||'')).slice(0,5);
    const availCls = t.available < 0 ? 'neg' : '';
    const availHint = t.available < 0
      ? 'Negative — planned costs or savings exceed recorded income'
      : 'Income − paid − planned − savings';
    const periodLabel = currentPeriod === 'week' ? 'This week' : currentPeriod === 'month' ? 'This month' : 'All time';
    const periodSince = p.from ? `Since ${SMStore.fmtDate(p.from)}` : 'All recorded transactions';

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1>My Money</h1>
          <p class="subtitle">A clear view of the money you have recorded. Actual records are shown separately from planned expenses.</p>
        </div>
        <div class="row">
          <button class="primary" id="addTxBtn">${SMUI.ICONS.plus} Add transaction</button>
        </div>
      </div>

      ${s.isSample ? `<div class="msg info" style="margin-bottom:1rem">Sample data is loaded for demonstration. Use Settings to clear it and start fresh.</div>` : ''}

      <section class="grid grid-4" aria-label="Money overview">
        <div class="card stat income"><div class="label">Recorded income</div><div class="value">${SMStore.ZAR(t.totalIncome)}</div><div class="hint">Actual money received</div></div>
        <div class="card stat expense"><div class="label">Recorded expenses</div><div class="value">${SMStore.ZAR(t.totalExpenses)}</div><div class="hint">Essential paid: ${SMStore.ZAR(t.essentialPaid)}</div></div>
        <div class="card stat planned"><div class="label">Planned essentials</div><div class="value">${SMStore.ZAR(t.plannedEssential)}</div><div class="hint">Not yet paid · Savings: ${SMStore.ZAR(t.savingsTotal)}</div></div>
        <div class="card stat available"><div class="label">Estimated available</div><div class="value ${availCls}">${SMStore.ZAR(t.available)}</div><div class="hint">${availHint}</div></div>
      </section>

      <section class="card" style="margin-top:1rem" aria-label="Period summary">
        <div class="row between" style="flex-wrap:wrap;gap:.5rem">
          <h2>${periodLabel}</h2>
          <div class="segmented" role="tablist">
            <button type="button" data-period="week" class="${currentPeriod==='week'?'active':''}">Week</button>
            <button type="button" data-period="month" class="${currentPeriod==='month'?'active':''}">Month</button>
            <button type="button" data-period="all" class="${currentPeriod==='all'?'active':''}">All time</button>
          </div>
        </div>
        <p class="muted small-text" style="margin-top:.25rem">${periodSince}</p>
        <div class="grid grid-3" style="margin-top:.6rem">
          <div class="stat"><div class="label">Income</div><div class="value pos">${SMStore.ZAR(p.income)}</div></div>
          <div class="stat"><div class="label">Expenses</div><div class="value neg">${SMStore.ZAR(p.expenses)}</div></div>
          <div class="stat"><div class="label">Transactions</div><div class="value">${p.txCount}</div></div>
        </div>
      </section>

      <section class="card" style="margin-top:1rem" aria-label="Money breakdown">
        <h2>Where your money is</h2>
        ${SMUI.breakdownBar(t)}
        <p class="small-text muted" style="margin-top:.6rem">This is based on what you have recorded (including money in savings goals). It is not a bank balance.</p>
      </section>

      <section class="card" style="margin-top:1rem" aria-label="Search transactions">
        <label for="txSearch">Search transactions</label>
        <input id="txSearch" type="search" placeholder="Category, description, amount…" value="${SMStore.esc(txSearch)}" />
      </section>

      <div class="grid grid-2" style="margin-top:1rem">
        <section class="card" aria-label="Recent transactions">
          <div class="row between"><h2>Recent transactions</h2><a class="ghost icon-btn" href="budget.html" aria-label="View budget">Budget</a></div>
          ${filtered.length === 0 ? `<div class="empty">${SMUI.ICONS.empty}<p>No matching transactions.</p></div>` :
            `<div style="margin-top:.6rem">${filtered.map(SMUI.txItem).join('')}</div>`}
        </section>
        <section class="card" aria-label="Upcoming expenses">
          <div class="row between"><h2>Upcoming expenses</h2><button class="ghost small" id="addPlannedBtn">${SMUI.ICONS.plus} Plan</button></div>
          ${upcoming.length === 0 ? `<div class="empty">${SMUI.ICONS.empty}<p>No planned expenses. Plan a bill like rent or school fees.</p></div>` :
            `<div style="margin-top:.6rem">${upcoming.map(SMUI.plannedItem).join('')}</div>`}
        </section>
      </div>

      <section id="txFormHost" style="margin-top:1rem"></section>
      <section id="plannedFormHost" style="margin-top:1rem"></section>`;

    document.getElementById('addTxBtn').addEventListener('click', () => openTxForm());
    document.getElementById('addPlannedBtn').addEventListener('click', () => openPlannedForm());

    const seg = view.querySelector('.segmented[role="tablist"]');
    if (seg) SMUI.wireSegmented(seg, (btn) => { currentPeriod = btn.dataset.period; render(); });
    const searchEl = document.getElementById('txSearch');
    if (searchEl) {
      searchEl.addEventListener('input', () => { txSearch = searchEl.value; });
      searchEl.addEventListener('change', () => { txSearch = searchEl.value; render(); });
      searchEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); txSearch = searchEl.value; render(); } });
    }

    view.querySelectorAll('[data-del-tx]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Delete this transaction?')) {
        const s = SMStore.getState();
        s.transactions = s.transactions.filter(t => t.id !== b.dataset.delTx);
        SMStore.save(); SMUI.toast('Transaction deleted'); render();
      }
    }));
    view.querySelectorAll('[data-edit-tx]').forEach(b => b.addEventListener('click', () => openTxForm(null, b.dataset.editTx)));
    view.querySelectorAll('[data-del-planned]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Delete this planned expense?')) {
        const s = SMStore.getState();
        s.planned = s.planned.filter(p => p.id !== b.dataset.delPlanned);
        SMStore.save(); SMUI.toast('Planned expense deleted'); render();
      }
    }));
    view.querySelectorAll('[data-edit-planned]').forEach(b => b.addEventListener('click', () => openPlannedForm(b.dataset.editPlanned)));
    view.querySelectorAll('[data-mark-paid]').forEach(b => b.addEventListener('click', () => {
      const s = SMStore.getState();
      const p = s.planned.find(x => x.id === b.dataset.markPaid);
      if (!p) return;
      s.transactions.push({ id: SMStore.uid(), type: 'expense', amount: p.amount, category: p.category, date: SMStore.todayISO(), description: p.description, note: '', essential: p.essential, paid: true });
      s.planned = s.planned.filter(x => x.id !== p.id);
      SMStore.save(); SMUI.toast('Marked as paid — moved to transactions'); render();
    }));
  }

  function openTxForm(forceType, editId) {
    const host = document.getElementById('txFormHost');
    const s = SMStore.getState();
    const existing = editId ? s.transactions.find(t => t.id === editId) : null;
    const type = existing ? existing.type : (forceType || 'income');
    const essentialField = type === 'expense' ? `
          <div><label for="txEssential">Essential expense?</label>
            <select id="txEssential" name="essential">
              <option value="true" ${!existing || existing.essential ? 'selected' : ''}>Yes — needs to be paid</option>
              <option value="false" ${existing && !existing.essential ? 'selected' : ''}>No — optional</option>
            </select></div>` : '';
    host.innerHTML = `
      <div class="card">
        <h2>${existing ? 'Edit' : 'Add'} transaction</h2>
        <div class="segmented" role="tablist" style="margin-bottom:.6rem">
          <button type="button" data-tt="income" class="${type==='income'?'active':''}">Income</button>
          <button type="button" data-tt="expense" class="${type==='expense'?'active':''}">Expense</button>
        </div>
        <form id="txForm" class="form-grid">
          <div><label for="txAmount">Amount (R)</label><input id="txAmount" name="amount" type="number" min="0.01" step="0.01" required value="${existing?existing.amount:''}" /></div>
          <div><label for="txCategory">Category</label>
            <select id="txCategory" name="category">
              ${(type === 'income' ? SMStore.INCOME_CATS : SMStore.EXPENSE_CATS).map(c => `<option ${existing && existing.category===c?'selected':''}>${c}</option>`).join('')}
            </select></div>
          <div><label for="txDate">Date</label><input id="txDate" name="date" type="date" required value="${existing?existing.date:SMStore.todayISO()}" /></div>
          <div><label for="txDesc">Description (optional)</label><input id="txDesc" name="description" type="text" maxlength="80" value="${existing?SMStore.esc(existing.description):''}" /></div>
          ${essentialField}
          <div style="display:flex;align-items:flex-end;gap:.4rem">
            <button class="primary" type="submit">${existing ? 'Save' : 'Add'}</button>
            <button class="ghost" type="button" id="cancelTx">Cancel</button>
          </div>
          <input type="hidden" name="type" value="${type}" />
          <input type="hidden" name="editId" value="${editId || ''}" />
        </form>
      </div>`;
    const ttSeg = host.querySelector('.segmented');
    if (ttSeg) SMUI.wireSegmented(ttSeg, (btn) => openTxForm(btn.dataset.tt, editId));
    host.querySelector('#cancelTx').addEventListener('click', () => host.innerHTML = '');
    host.querySelector('#txForm').addEventListener('submit', onSubmitTxForm);
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function onSubmitTxForm(e) {
    e.preventDefault();
    const f = e.target;
    const fd = new FormData(f);
    const amount = SMStore.num(fd.get('amount'));
    const category = String(fd.get('category') || 'Other');
    const date = String(fd.get('date') || SMStore.todayISO());
    const description = String(fd.get('description') || '').trim();
    const type = fd.get('type') === 'expense' ? 'expense' : 'income';
    const essential = type === 'expense' && fd.get('essential') === 'true';
    const editId = String(fd.get('editId') || '');
    if (!(amount > 0)) { SMUI.toast('Enter an amount greater than zero'); return; }
    const s = SMStore.getState();
    if (editId) {
      const tx = s.transactions.find(t => t.id === editId);
      if (tx) Object.assign(tx, { amount, category, date, description, essential, type, paid: true });
      SMUI.toast('Transaction updated');
    } else {
      s.transactions.push({ id: SMStore.uid(), type, amount, category, date, description, note: '', essential, paid: true });
      SMUI.toast(type === 'income' ? 'Income recorded' : 'Expense recorded');
    }
    SMStore.save(); render();
  }

  function openPlannedForm(editId) {
    const host = document.getElementById('plannedFormHost');
    const s = SMStore.getState();
    const existing = editId ? s.planned.find(p => p.id === editId) : null;
    host.innerHTML = `
      <div class="card">
        <h2>${existing ? 'Edit' : 'Plan'} an expense</h2>
        <form id="plannedForm" class="form-grid">
          <div><label for="plAmount">Amount (R)</label><input id="plAmount" name="amount" type="number" min="0.01" step="0.01" required value="${existing?existing.amount:''}" /></div>
          <div><label for="plCategory">Category</label>
            <select id="plCategory" name="category">
              ${SMStore.EXPENSE_CATS.map(c => `<option ${existing && existing.category===c?'selected':''}>${c}</option>`).join('')}
            </select></div>
          <div><label for="plDate">Due date</label><input id="plDate" name="date" type="date" required value="${existing?existing.date:SMStore.todayISO(7)}" /></div>
          <div><label for="plDesc">Description (optional)</label><input id="plDesc" name="description" type="text" maxlength="80" value="${existing?SMStore.esc(existing.description):''}" /></div>
          <div><label for="plFrequency">Frequency</label>
            <select id="plFrequency" name="frequency">
              ${SMStore.FREQ_OPTS.map(o => `<option value="${o.value}" ${existing && existing.frequency===o.value?'selected':''}>${o.label}</option>`).join('')}
            </select></div>
          <div><label for="plEssential">Essential?</label>
            <select id="plEssential" name="essential">
              <option value="true" ${!existing || existing.essential ? 'selected' : ''}>Yes</option>
              <option value="false" ${existing && !existing.essential ? 'selected' : ''}>No</option>
            </select></div>
          <div style="display:flex;align-items:flex-end;gap:.4rem">
            <button class="primary" type="submit">${existing ? 'Save' : 'Plan'}</button>
            <button class="ghost" type="button" id="cancelPlanned">Cancel</button>
          </div>
          <input type="hidden" name="editId" value="${editId || ''}" />
        </form>
      </div>`;
    host.querySelector('#cancelPlanned').addEventListener('click', () => host.innerHTML = '');
    host.querySelector('#plannedForm').addEventListener('submit', onSubmitPlannedForm);
    host.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function onSubmitPlannedForm(e) {
    e.preventDefault();
    const fd = new FormData(e.target);
    const amount = SMStore.num(fd.get('amount'));
    const category = String(fd.get('category') || 'Other');
    const date = String(fd.get('date') || SMStore.todayISO(7));
    const description = String(fd.get('description') || '').trim();
    const essential = fd.get('essential') === 'true';
    const frequency = String(fd.get('frequency') || '');
    const editId = String(fd.get('editId') || '');
    if (!(amount > 0)) { SMUI.toast('Enter an amount greater than zero'); return; }
    const s = SMStore.getState();
    if (editId) {
      const p = s.planned.find(x => x.id === editId);
      if (p) Object.assign(p, { amount, category, date, description, essential, frequency });
      SMUI.toast('Planned expense updated');
    } else {
      s.planned.push({ id: SMStore.uid(), amount, category, date, description, essential, paid: false, frequency });
      SMUI.toast('Expense planned');
    }
    SMStore.save(); render();
  }

  render();
})();