(function () {
  'use strict';
  SMUI.bootPage('goals');
  const view = document.getElementById('view');

  function typeLabel(t) {
    if (t === 'stokvel') return 'Stokvel';
    if (t === 'group') return 'Group savings';
    return 'Personal';
  }
  function typeBadge(t) {
    if (t === 'stokvel' || t === 'group') return '<span class="badge neutral">' + typeLabel(t) + '</span>';
    return '';
  }

  function render() {
    const s = SMStore.getState();
    const t = SMStore.calcTotals();

    view.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Savings Goals</h1>
          <p class="subtitle">Small, flexible goals — personal, stokvel, or group savings. Contribute only when you can.</p>
        </div>
      </div>
      ${s.goals.length === 0 ? `<div class="card empty">${SMUI.ICONS.empty}<p>No goals yet. Create a small goal like emergency money, a stokvel share, or groceries.</p></div>` :
        `<div class="stack">${s.goals.map(goalCard).join('')}</div>`}
      <section class="card" style="margin-top:1rem" aria-label="Create a goal">
        <h2>Create a goal</h2>
        <form id="goalForm" class="form-grid" style="margin-top:.6rem">
          <div><label for="gName">Goal name</label><input id="gName" name="name" type="text" required maxlength="80" placeholder="e.g. Emergency money" /></div>
          <div><label for="gTarget">Target (R)</label><input id="gTarget" name="target" type="number" min="1" step="0.01" required /></div>
          <div><label for="gSaved">Already saved (R)</label><input id="gSaved" name="saved" type="number" min="0" step="0.01" value="0" /></div>
          <div><label for="gDate">Target date (optional)</label><input id="gDate" name="targetDate" type="date" /></div>
          <div><label for="gType">Type</label>
            <select id="gType" name="goalType">
              ${SMStore.GOAL_TYPES.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>
          <div><label for="gContribAmt">Regular contribution (R, optional)</label><input id="gContribAmt" name="contribAmount" type="number" min="0" step="0.01" value="0" /></div>
          <div><label for="gContribFreq">Contribution frequency</label>
            <select id="gContribFreq" name="contribFreq">
              ${SMStore.FREQ_OPTS.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:flex-end"><button class="primary" type="submit">${SMUI.ICONS.plus} Create</button></div>
        </form>
      </section>
      <section class="card" style="margin-top:1rem" aria-label="Saving suggestions">
        <h2>Gentle suggestions</h2>
        <p class="small-text">Based on estimated available money (after expenses, planned costs and existing savings). Always optional.</p>
        <div style="margin-top:.5rem">${suggestions(t)}</div>
      </section>`;

    document.querySelectorAll('[data-goal-add]').forEach(b => b.addEventListener('click', () => goalPanel(b.dataset.goalAdd, 'deposit')));
    document.querySelectorAll('[data-goal-withdraw]').forEach(b => b.addEventListener('click', () => goalPanel(b.dataset.goalWithdraw, 'withdraw')));
    document.querySelectorAll('[data-goal-edit]').forEach(b => b.addEventListener('click', () => editGoal(b.dataset.goalEdit)));
    document.querySelectorAll('[data-goal-del]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Delete this goal and its history?')) {
        const st = SMStore.getState();
        st.goals = st.goals.filter(g => g.id !== b.dataset.goalDel);
        SMStore.save(); SMUI.toast('Goal deleted'); render();
      }
    }));
    document.getElementById('goalForm').addEventListener('submit', onCreateGoal);
  }

  function goalCard(g) {
    const target = Math.max(0, SMStore.num(g.target));
    const saved = Math.max(0, SMStore.num(g.saved));
    const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
    const remaining = Math.max(0, target - saved);
    const done = target > 0 && saved >= target;
    const dLeft = g.targetDate ? SMStore.daysUntil(g.targetDate) : null;
    const isGroup = g.goalType === 'stokvel' || g.goalType === 'group';
    const contribNote = (g.contribAmount > 0 && g.contribFreq)
      ? 'Planned: ' + SMStore.ZAR(g.contribAmount) + ' ' + g.contribFreq + '. '
      : '';
    return `
      <section class="card ${isGroup ? 'goal-group' : ''}">
        <div class="row between" style="flex-wrap:wrap;gap:.4rem">
          <h2 style="margin:0">${SMStore.esc(g.name)} ${typeBadge(g.goalType)} ${done ? '<span class="badge low">Reached</span>' : ''}</h2>
          <div class="row">
            <button class="icon-btn ghost" data-goal-add="${g.id}" aria-label="Add to goal">${SMUI.ICONS.plus}</button>
            <button class="icon-btn ghost" data-goal-withdraw="${g.id}" aria-label="Withdraw from goal">${SMUI.ICONS.minus}</button>
            <button class="icon-btn ghost" data-goal-edit="${g.id}" aria-label="Edit goal">${SMUI.ICONS.edit}</button>
            <button class="icon-btn danger" data-goal-del="${g.id}" aria-label="Delete goal">${SMUI.ICONS.trash}</button>
          </div>
        </div>
        <div class="row between" style="margin-top:.6rem;font-size:.9rem">
          <span>${SMStore.ZAR(saved)} of ${SMStore.ZAR(target)}</span>
          <strong>${pct.toFixed(0)}%</strong>
        </div>
        <div class="progress ${pct >= 100 ? '' : 'amber'}" style="margin-top:.35rem"><span style="width:${pct}%"></span></div>
        <p class="small-text muted" style="margin-top:.5rem">
          ${done ? 'Goal reached. You can keep adding or start a new goal.'
            : SMStore.ZAR(remaining) + ' remaining. ' + (g.targetDate ? (dLeft >= 0 ? dLeft + ' days left. ' : 'Target date passed. ') : '') + contribNote +
               'Every little bit helps. Contributions reduce estimated available money.'}
        </p>
        <div id="goal-panel-${g.id}"></div>
        ${g.contributions && g.contributions.length ? `
          <details style="margin-top:.6rem">
            <summary class="small-text" style="cursor:pointer;font-weight:700">Contribution history (${g.contributions.length})</summary>
            <div class="table-wrap" style="margin-top:.4rem">
              <table><thead><tr><th>Date</th><th>Type</th><th>Amount</th></tr></thead>
              <tbody>
                ${[...g.contributions].reverse().map(c => `<tr>
                  <td>${SMStore.fmtDate(c.date)}</td>
                  <td>${c.type === 'withdraw' ? 'Withdrawal' : 'Deposit'}</td>
                  <td>${SMStore.ZAR(c.amount)}</td>
                </tr>`).join('')}
              </tbody></table>
            </div>
          </details>` : ''}
      </section>`;
  }

  function suggestions(t) {
    if (t.available <= 0) return '<p class="small-text">Right now there is little or nothing left after recorded expenses, planned costs and existing savings. That is normal. You can come back and add to a goal whenever you are ready.</p>';
    const small = Math.max(5, Math.round(t.available * 0.05));
    const medium = Math.max(10, Math.round(t.available * 0.1));
    return '<p class="small-text">Based on about ' + SMStore.ZAR(t.available) + ' estimated available (after expenses, plans and current savings), you could optionally set aside small amounts like ' + SMStore.ZAR(small) + ' or ' + SMStore.ZAR(medium) + ' when you are able. There is no pressure.</p>';
  }

  function goalPanel(goalId, mode) {
    const s = SMStore.getState();
    const g = s.goals.find(x => x.id === goalId);
    if (!g) return;
    const panel = document.getElementById('goal-panel-' + goalId);
    const amtId = 'ga-' + goalId;
    const dateId = 'gd-' + goalId;
    panel.innerHTML = `
      <div style="border:1px dashed var(--border-strong);border-radius:10px;padding:.75rem;margin-top:.5rem">
        <form data-goal-form="${SMStore.esc(goalId)}" data-mode="${mode}" class="form-grid">
          <div><label for="${amtId}">Amount (R)</label><input id="${amtId}" name="amount" type="number" min="0.01" step="0.01" required /></div>
          <div><label for="${dateId}">Date</label><input id="${dateId}" name="date" type="date" value="${SMStore.todayISO()}" /></div>
          <div style="display:flex;align-items:flex-end;gap:.4rem">
            <button class="primary" type="submit">${mode === 'withdraw' ? 'Withdraw' : 'Add'}</button>
            <button class="ghost" type="button" data-cancel-goal="${SMStore.esc(goalId)}">Cancel</button>
          </div>
        </form>
      </div>`;
    panel.querySelector('[data-cancel-goal]').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('[data-goal-form]').addEventListener('submit', onGoalContribution);
  }
  function onGoalContribution(e) {
    e.preventDefault();
    const form = e.target;
    const goalId = form.dataset.goalForm;
    const mode = form.dataset.mode;
    const amount = SMStore.num(form.amount.value);
    const date = form.date.value || SMStore.todayISO();
    const s = SMStore.getState();
    const g = s.goals.find(x => x.id === goalId);
    if (!g) return;
    if (!(amount > 0)) { SMUI.toast('Enter an amount greater than zero'); return; }
    if (mode === 'withdraw') {
      if (amount > SMStore.num(g.saved)) { SMUI.toast('You cannot withdraw more than you have saved'); return; }
      g.saved = SMStore.num(g.saved) - amount;
      g.contributions.push({ id: SMStore.uid(), amount, date, type: 'withdraw' });
      SMUI.toast('Withdrawal recorded — available money increases');
    } else {
      g.saved = SMStore.num(g.saved) + amount;
      g.contributions.push({ id: SMStore.uid(), amount, date, type: 'deposit' });
      const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      if (pct >= 100) SMUI.toast('Goal reached. Well done.');
      else SMUI.toast('Added to ' + g.name + ' — available money reduced');
    }
    SMStore.save(); render();
  }
  function editGoal(goalId) {
    const s = SMStore.getState();
    const g = s.goals.find(x => x.id === goalId);
    if (!g) return;
    const panel = document.getElementById('goal-panel-' + goalId);
    if (!panel) return;
    const nId = 'en-' + goalId, tId = 'et-' + goalId, dId = 'ed-' + goalId, tyId = 'ety-' + goalId, caId = 'eca-' + goalId, cfId = 'ecf-' + goalId;
    panel.innerHTML = `
      <div style="border:1px dashed var(--border-strong);border-radius:10px;padding:.75rem;margin-top:.5rem">
        <h3 style="margin:0 0 .6rem;font-size:1rem">Edit goal</h3>
        <form data-goal-edit-form="${SMStore.esc(goalId)}" class="form-grid">
          <div><label for="${nId}">Goal name</label><input id="${nId}" name="name" type="text" required maxlength="80" value="${SMStore.esc(g.name)}" /></div>
          <div><label for="${tId}">Target (R)</label><input id="${tId}" name="target" type="number" min="1" step="0.01" required value="${g.target}" /></div>
          <div><label for="${dId}">Target date (optional)</label><input id="${dId}" name="targetDate" type="date" value="${g.targetDate || ''}" /></div>
          <div><label for="${tyId}">Type</label>
            <select id="${tyId}" name="goalType">
              ${SMStore.GOAL_TYPES.map(o => `<option value="${o.value}" ${g.goalType===o.value?'selected':''}>${o.label}</option>`).join('')}
            </select>
          </div>
          <div><label for="${caId}">Regular contribution (R)</label><input id="${caId}" name="contribAmount" type="number" min="0" step="0.01" value="${g.contribAmount || 0}" /></div>
          <div><label for="${cfId}">Contribution frequency</label>
            <select id="${cfId}" name="contribFreq">
              ${SMStore.FREQ_OPTS.map(o => `<option value="${o.value}" ${g.contribFreq===o.value?'selected':''}>${o.label}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;align-items:flex-end;gap:.4rem">
            <button class="primary" type="submit">Save changes</button>
            <button class="ghost" type="button" data-cancel-edit="${SMStore.esc(goalId)}">Cancel</button>
          </div>
        </form>
      </div>`;
    panel.querySelector('[data-cancel-edit]').addEventListener('click', () => { panel.innerHTML = ''; });
    panel.querySelector('[data-goal-edit-form]').addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.target;
      const name = form.name.value.trim();
      const target = SMStore.num(form.target.value);
      const targetDate = form.targetDate.value || '';
      if (!name) { SMUI.toast('Enter a goal name'); return; }
      if (!(target > 0)) { SMUI.toast('Target must be greater than zero'); return; }
      g.name = name;
      g.target = target;
      g.targetDate = /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : '';
      g.goalType = form.goalType.value || 'personal';
      g.contribAmount = Math.max(0, SMStore.num(form.contribAmount.value));
      g.contribFreq = form.contribFreq.value || '';
      SMStore.save();
      SMUI.toast('Goal updated');
      render();
    });
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function onCreateGoal(e) {
    e.preventDefault();
    const f = e.target;
    const name = f.name.value.trim();
    const target = SMStore.num(f.target.value);
    const saved = Math.max(0, SMStore.num(f.saved.value));
    const targetDate = f.targetDate.value || '';
    const goalType = f.goalType.value || 'personal';
    const contribAmount = Math.max(0, SMStore.num(f.contribAmount.value));
    const contribFreq = f.contribFreq.value || '';
    if (!name) { SMUI.toast('Enter a goal name'); return; }
    if (!(target > 0)) { SMUI.toast('Enter a target greater than zero'); return; }
    const st = SMStore.getState();
    const contribs = saved > 0 ? [{ id: SMStore.uid(), amount: saved, date: SMStore.todayISO(), type: 'deposit' }] : [];
    st.goals.push({
      id: SMStore.uid(), name, target, saved, targetDate,
      goalType, contribAmount, contribFreq, contributions: contribs
    });
    SMStore.save();
    SMUI.toast('Goal created');
    f.reset();
    render();
  }

  render();
})();
