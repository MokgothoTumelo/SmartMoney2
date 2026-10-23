(function () {
  'use strict';
  SMUI.bootPage('budget');
  const view = document.getElementById('view');
  let currentPeriod = 'all';
  let txSearch = '';

  function render() {
    const t = SMStore.calcTotals();
    const p = SMStore.calcPeriodTotals(currentPeriod);
    const s = SMStore.getState();
    const availCls = t.available < 0 ? 'neg' : '';
    const periodLabel = currentPeriod === 'week' ? 'This week' : currentPeriod === 'month' ? 'This month' : 'All time';

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1>My Budget</h1>
          <p class="subtitle">Built for irregular income. Add money as it arrives, plan essential expenses, and see what is left. No fixed salary required.</p>
        </div>
        <div class="row">
          <button class="primary" id="addTxBtn">${SMUI.ICONS.plus} Add income or expense</button>
          <button class="ghost" id="addPlannedBtn">${SMUI.ICONS.plus} Plan an expense</button>
        </div>
      </div>

      <section class="grid grid-4" aria-label="Budget summary">
        <div class="card stat income"><div class="label">Received</div><div class="value">${SMStore.ZAR(t.totalIncome)}</div><div class="hint">All recorded income</div></div>
        <div class="card stat expense"><div class="label">Essential paid</div><div class="value">${SMStore.ZAR(t.essentialPaid)}</div><div class="hint">Total paid: ${SMStore.ZAR(t.totalExpenses)}</div></div>
        <div class="card stat planned"><div class="label">Essential planned</div><div class="value">${SMStore.ZAR(t.plannedEssential)}</div><div class="hint">Savings goals: ${SMStore.ZAR(t.savingsTotal)}</div></div>
        <div class="card stat available"><div class="label">Estimated remaining</div><div class="value ${availCls}">${SMStore.ZAR(t.available)}</div><div class="hint">${t.available < 0 ? 'Negative — review plans' : 'After paid, planned & savings'}</div></div>
      </section>

      <section class="card" style="margin-top:1rem" aria-label="Period filter">
        <div class="row between" style="flex-wrap:wrap;gap:.5rem">
          <h2>Transaction period: ${periodLabel}</h2>
          <div class="segmented" role="tablist">
            <button type="button" data-period="week" class="${currentPeriod==='week'?'active':''}">Week</button>
            <button type="button" data-period="month" class="${currentPeriod==='month'?'active':''}">Month</button>
            <button type="button" data-period="all" class="${currentPeriod==='all'?'active':''}">All time</button>
          </div>
        </div>
        <div class="grid grid-3" style="margin-top:.6rem">
          <div class="stat"><div class="label">Income in period</div><div class="value pos">${SMStore.ZAR(p.income)}</div></div>
          <div class="stat"><div class="label">Expenses in period</div><div class="value neg">${SMStore.ZAR(p.expenses)}</div></div>
          <div class="stat"><div class="label">Transactions</div><div class="value">${p.txCount}</div></div>
        </div>
      </section>

      <div class="grid grid-2" style="margin-top:1rem">
        <section class="card">
          <h2>How this is calculated</h2>
          <p class="small-text">Estimated remaining = recorded income − paid expenses − planned essential − planned optional − money in savings goals. This is a planning estimate. It is not a bank balance.</p>
          <ul style="margin:.5rem 0 0 1.1rem;line-height:1.7" class="small-text">
            <li>Recorded income is money you say you actually received.</li>
            <li>Paid expenses are money you say you actually spent.</li>
            <li>Planned expenses are future costs you have entered.</li>
            <li>Savings goals reduce available money (money you have set aside).</li>
          </ul>
        </section>
        <section class="card">
          <h2>Quick add</h2>
          <div class="row">
            <button class="secondary" id="quickIncome">${SMUI.ICONS.plus} Income</button>
            <button class="secondary" id="quickExpense">${SMUI.ICONS.plus} Expense</button>
            <button class="ghost" id="quickPlanned">${SMUI.ICONS.plus} Planned</button>
          </div>
          <p class="small-text muted" style="margin-top:.6rem">Add income whenever it arrives. Your totals update immediately.</p>
        </section>
      </div>

      <section class="card" style="margin-top:1rem" aria-label="All transactions">
        <h2>All transactions</h2>
        <label for="txSearch">Search</label>
        <input id="txSearch" type="search" placeholder="Category, description, amount…" value="${SMStore.esc(txSearch)}" />
        <p class="small-text muted">Editable and deletable. Nothing is submitted anywhere.</p>
        ${(() => {
          const q = (txSearch||'').toLowerCase().trim();
          const list = [...s.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
          const shown = q ? list.filter(tx => (tx.category+' '+(tx.description||'')+' '+tx.amount+' '+tx.type).toLowerCase().indexOf(q)!==-1) : list;
          return shown.length === 0 ? `<div class="empty">${SMUI.ICONS.empty}<p>No matching transactions.</p></div>` :
            `<div style="margin-top:.6rem">${shown.map(SMUI.txItem).join('')}</div>`;
        })()}
      </section>

      <section class="card" style="margin-top:1rem" aria-label="Planned expenses">
        <h2>Planned expenses</h2>
        ${s.planned.length === 0 ? `<div class="empty">${SMUI.ICONS.empty}<p>No planned expenses. Add rent, school fees, or other upcoming costs.</p></div>` :
          `<div style="margin-top:.6rem">${[...s.planned].sort((a,b)=>(a.date||'').localeCompare(b.date||'')).map(SMUI.plannedItem).join('')}</div>`}
      </section>

      <section id="txFormHost"></section>
      <section id="plannedFormHost"></section>`;

    document.getElementById('addTxBtn').addEventListener('click', () => openTxForm());
    document.getElementById('addPlannedBtn').addEventListener('click', () => openPlannedForm());
    document.getElementById('quickIncome').addEventListener('click', () => openTxForm('income'));
    document.getElementById('quickExpense').addEventListener('click', () => openTxForm('expense'));
    document.getElementById('quickPlanned').addEventListener('click', () => openPlannedForm());

    view.querySelectorAll('[data-period]').forEach(b => b.addEventListener('click', () => {
      currentPeriod = b.dataset.period;
      render();
    }));

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
      SMStore.save(); SMUI.toast('Marked as paid'); render();
    }));
  }

  /* reuse form logic */
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
    const fd = new FormData(e.target);
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
      s.planned.push({ id: SMStore.uid(), amount, category, date, description, essential, paid: false, frequency});
      SMUI.toast('Expense planned');
    }
    SMStore.save(); render();
  }

  render();
})();