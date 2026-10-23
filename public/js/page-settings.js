(function () {
  'use strict';
  SMUI.bootPage('settings');
  const view = document.getElementById('view');
  const s = SMStore.getState().settings;


  function getProfile() {
    const s = SMStore.getState();
    if (!s.profile) s.profile = { name: '', phone: '', email: '' };
    return s.profile;
  }

  function renderProfile() {
    const view = document.getElementById('profileView');
    const edit = document.getElementById('profileEdit');
    if (!view || !edit) return;
    const p = getProfile();
    const hasAny = !!(p.name || p.phone || p.email);
    view.style.display = '';
    edit.style.display = 'none';
    view.innerHTML = `
      <div class="grid grid-2" style="gap:.6rem">
        <div><div class="label" style="font-size:.75rem;color:var(--muted);font-weight:700">Name</div>
          <div style="font-weight:650">${p.name ? SMStore.esc(p.name) : '<span class="muted">Not set</span>'}</div></div>
        <div><div class="label" style="font-size:.75rem;color:var(--muted);font-weight:700">Phone</div>
          <div style="font-weight:650">${p.phone ? SMStore.esc(p.phone) : '<span class="muted">Not set</span>'}</div></div>
        <div style="grid-column:1/-1"><div class="label" style="font-size:.75rem;color:var(--muted);font-weight:700">Email</div>
          <div style="font-weight:650">${p.email ? SMStore.esc(p.email) : '<span class="muted">Not set</span>'}</div></div>
      </div>
      <div class="row" style="margin-top:.85rem">
        <button type="button" class="ghost" id="editProfileBtn">Edit profile</button>
        ${!hasAny ? '<a class="ghost" href="auth.html?tab=signup" style="text-decoration:none">Sign up to add details</a>' : ''}
      </div>`;
    const editBtn = document.getElementById('editProfileBtn');
    if (editBtn) editBtn.addEventListener('click', showProfileEdit);
  }

  function showProfileEdit() {
    const view = document.getElementById('profileView');
    const edit = document.getElementById('profileEdit');
    if (!view || !edit) return;
    const p = getProfile();
    view.style.display = 'none';
    edit.style.display = '';
    edit.innerHTML = `
      <form id="profileForm" class="form-grid">
        <div><label for="profName">Full name</label>
          <input id="profName" name="name" type="text" maxlength="80" value="${SMStore.esc(p.name)}" placeholder="Your name" /></div>
        <div><label for="profPhone">Phone</label>
          <input id="profPhone" name="phone" type="tel" maxlength="20" value="${SMStore.esc(p.phone)}" placeholder="082 123 4567" /></div>
        <div><label for="profEmail">Email</label>
          <input id="profEmail" name="email" type="email" value="${SMStore.esc(p.email)}" placeholder="you@example.com" /></div>
        <div class="row" style="display:flex;align-items:flex-end;gap:.5rem">
          <button class="primary" type="submit">Save</button>
          <button class="ghost" type="button" id="cancelProfileBtn">Cancel</button>
        </div>
      </form>`;
    document.getElementById('cancelProfileBtn').addEventListener('click', renderProfile);
    document.getElementById('profileForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const name = e.target.name.value.trim();
      const phone = e.target.phone.value.trim();
      const email = e.target.email.value.trim();
      const s = SMStore.getState();
      if (!s.profile) s.profile = { name: '', phone: '', email: '' };
      s.profile.name = name;
      s.profile.phone = phone;
      s.profile.email = email;
      s.profile.updatedAt = new Date().toISOString();
      s.profile.syncStatus = 'pending';
      SMStore.save();
      if (window.SMSync) SMSync.ensureSyncMeta();
      SMUI.toast('Profile saved');
      renderProfile();
    });
  }


  function renderSyncStatus() {
    const box = document.getElementById('syncStatusBox');
    if (!box || !window.SMSync) {
      if (box) box.innerHTML = '<p class="small-text">Sync module not loaded.</p>';
      return;
    }
    const st = SMSync.getSyncStatus();
    const last = st.lastSyncedAt
      ? new Date(st.lastSyncedAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Never';
    const modeLabel = st.accountMode === 'account' ? 'Account (cloud backup on)' : 'Guest (device only)';
    const net = st.online ? 'Online' : 'Offline';
    const fb = st.firebaseReady ? 'Firebase connected' : 'Firebase not set up (add your config)';
    box.innerHTML = `
      <ul style="margin:0;padding-left:1.1rem;line-height:1.7" class="small-text">
        <li><strong>Mode:</strong> ${modeLabel}</li>
        <li><strong>Network:</strong> ${net}</li>
        <li><strong>Pending changes:</strong> ${st.pending}</li>
        <li><strong>Last synced:</strong> ${SMStore.esc(last)}</li>
        <li><strong>Backend:</strong> ${fb}</li>
        ${st.lastSyncError ? '<li style="color:var(--red)"><strong>Note:</strong> ' + SMStore.esc(st.lastSyncError) + '</li>' : ''}
      </ul>`;
  }

  function render() {
    const usage = SMStore.storageUsage();
    const hasPin = SMStore.hasPin();
    view.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Settings</h1>
        <p class="subtitle">Accessibility, privacy, device lock, and local data management.</p>
      </div>
    </div>

    <section class="card" id="profileCard">
      <h2>Profile</h2>
      <p class="small-text">Your name, phone and email from sign-up. Stored on this device, and backed up to your account when you sync.</p>
      <div id="profileView" style="margin-top:.75rem"></div>
      <div id="profileEdit" style="display:none;margin-top:.75rem"></div>
    </section>


    <section class="card" style="margin-top:1rem" id="syncCard">
      <h2>Cloud backup &amp; sync</h2>
      <p class="small-text">Everyday money management works offline on this device. Cloud backup is optional and only runs when you have an account and a connection.</p>
      <div id="syncStatusBox" style="margin-top:.75rem"></div>
      <div class="row" style="margin-top:.75rem;flex-wrap:wrap;gap:.5rem">
        <button type="button" class="primary" id="syncNowBtn">Sync now</button>
        <button type="button" class="ghost" id="markPendingBtn">Mark all as pending</button>
      </div>
      <p class="small-text muted" style="margin-top:.6rem">Guest mode never uploads data. Sign up / log in to enable account mode.</p>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Accessibility</h2>
      <div class="grid grid-2" style="margin-top:.6rem">
        <div><label for="themeSelect">Theme</label>
          <select id="themeSelect">
            <option value="light" ${s.theme==='light'?'selected':''}>Light</option>
            <option value="dark" ${s.theme==='dark'?'selected':''}>Dark</option>
          </select></div>
        <div><label for="contrastSelect">Contrast</label>
          <select id="contrastSelect">
            <option value="normal" ${s.contrast==='normal'?'selected':''}>Normal</option>
            <option value="high" ${s.contrast==='high'?'selected':''}>High contrast</option>
          </select></div>
        <div><label for="fontSelect">Text size</label>
          <select id="fontSelect">
            <option value="normal" ${s.fontsize==='normal'?'selected':''}>Normal</option>
            <option value="large" ${s.fontsize==='large'?'selected':''}>Large</option>
            <option value="xlarge" ${s.fontsize==='xlarge'?'selected':''}>Extra large</option>
          </select></div>
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Device lock (optional PIN)</h2>
      <p class="small-text">Protect records on a shared phone with a 4–6 digit PIN. This is a simple local lock, not bank-grade security.</p>
      <div id="pinSection" style="margin-top:.6rem">
        ${hasPin ? `
          <p class="small-text">PIN is <strong>enabled</strong>.</p>
          <div class="row" style="margin-top:.4rem">
            <button class="ghost" type="button" id="changePinBtn">Change PIN</button>
            <button class="danger" type="button" id="clearPinBtn">Remove PIN</button>
          </div>
        ` : `
          <div class="form-grid">
            <div><label for="newPin">New PIN (4–6 digits)</label><input id="newPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" /></div>
            <div><label for="confirmPin">Confirm PIN</label><input id="confirmPin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="new-password" /></div>
            <div style="display:flex;align-items:flex-end"><button class="primary" type="button" id="setPinBtn">Set PIN</button></div>
          </div>
        `}
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Loan cost checker</h2>
      <p class="small-text">Estimate total repaid and effective interest for a simple loan. Educational only — not financial advice.</p>
      <form id="loanForm" class="form-grid" style="margin-top:.6rem">
        <div><label for="loanAmount">Loan amount (R)</label><input id="loanAmount" name="amount" type="number" min="1" step="0.01" required placeholder="e.g. 1000" /></div>
        <div><label for="loanTerm">Repayment term (months)</label><input id="loanTerm" name="term" type="number" min="1" max="120" step="1" required placeholder="e.g. 3" /></div>
        <div><label for="loanFees">Total fees + interest (R)</label><input id="loanFees" name="fees" type="number" min="0" step="0.01" required placeholder="e.g. 300" /></div>
        <div style="display:flex;align-items:flex-end"><button class="primary" type="submit">Calculate</button></div>
      </form>
      <div id="loanResult" style="margin-top:.75rem"></div>
      <div class="msg warn" style="margin-top:.75rem">
        <strong>Warning about informal lenders (mashonisa):</strong> High fees and short terms can make the effective rate extremely expensive. Never hand over your ID, bank card, or grant card as security. Compare costs and only borrow what you can repay.
      </div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Your data</h2>
      <p class="small-text">Records are stored in this browser using localStorage. They are not sent to a server.</p>
      <div class="row" style="margin-top:.6rem;flex-wrap:wrap">
        <button class="ghost" id="exportBtn">${SMUI.ICONS.download} Export records (JSON)</button>
        <button class="ghost" id="importBtn">${SMUI.ICONS.upload} Import backup</button>
        <input type="file" id="importFile" accept="application/json,.json" hidden />
        <button class="ghost" id="sampleBtn">Load sample data</button>
        <button class="danger" id="clearBtn">Clear all data</button>
      </div>
      <p class="small-text muted" style="margin-top:.5rem">Export before clearing if you want a backup. Import overwrites current records after confirmation.</p>
      <div id="importMsg" style="margin-top:.5rem"></div>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Device diagnostics (low-data)</h2>
      <p class="small-text">Approximate sizes for low-end device checks.</p>
      <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
        <li>localStorage usage: ~${usage.kb} KB (${usage.bytes} bytes)</li>
        <li>App shell: multi-page HTML + CSS + JS, designed under ~150 KB total</li>
        <li>Service worker caches pages after first visit for full offline use</li>
        <li>Works without network after first load when installed / cached</li>
      </ul>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Log out / leave app session</h2>
      <p class="small-text">Logged-in accounts are backed up first, then removed from this device so the next person can't see them. Guests just return to the welcome screen (their records stay on this device).</p>
      <button class="ghost" type="button" id="leaveAppBtn">Log out</button>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Privacy and limits</h2>
      <ul style="margin:.4rem 0 0 1.1rem;line-height:1.7" class="small-text">
        <li>SmartMoney never asks for bank passwords, banking PINs, or OTPs.</li>
        <li>It is not connected to any bank and cannot move money.</li>
        <li>Loan and safety results are estimates and educational guidance, not professional financial advice.</li>
        <li>Consider speaking to a registered financial adviser for major decisions.</li>
      </ul>
    </section>

    <section class="card" style="margin-top:1rem">
      <h2>Offline and low-data behaviour</h2>
      <p class="small-text">Lightweight multi-file site. Service worker caches pages and assets. Offline pill appears when offline; records stay available.</p>
    </section>`;

    wireEvents();
    renderProfile();
    renderSyncStatus();
  }

  function wireEvents() {
    document.getElementById('exportBtn').addEventListener('click', SMStore.exportData);

    var syncNowBtn = document.getElementById('syncNowBtn');
    if (syncNowBtn) {
      syncNowBtn.addEventListener('click', function () {
        if (!window.SMSync) { SMUI.toast('Sync not available'); return; }
        syncNowBtn.disabled = true;
        SMSync.syncNow().then(function (r) {
          syncNowBtn.disabled = false;
          renderSyncStatus();
          if (r.ok) SMUI.toast(r.message || 'Sync finished');
          else SMUI.toast((r.status && r.status.lastSyncError) || r.reason || 'Sync skipped');
        });
      });
    }
    var markPendingBtn = document.getElementById('markPendingBtn');
    if (markPendingBtn) {
      markPendingBtn.addEventListener('click', function () {
        if (!window.SMSync) return;
        SMSync.markAllPending();
        renderSyncStatus();
        SMUI.toast('All records marked pending');
      });
    }

    var leaveBtn = document.getElementById('leaveAppBtn');
    if (leaveBtn) {
      leaveBtn.addEventListener('click', function () {
        var st = SMStore.getState();
        var isAccount = !!(st.sync && st.sync.accountMode === 'account');

        /* Guest: nothing to back up, records simply stay on this device */
        if (!isAccount) {
          if (!confirm('Return to the welcome screen? Your records stay on this device.')) return;
          st.welcomeSeen = false;
          SMStore.save();
          sessionStorage.removeItem('sm_unlocked');
          location.href = 'index.html';
          return;
        }

        /* Account: back up first, then remove this account's data from the device */
        if (!confirm('Log out? Your latest changes are backed up to your account first, then removed from this device. Log back in any time to get them back.')) return;
        var label = leaveBtn.textContent;
        leaveBtn.disabled = true;
        leaveBtn.textContent = 'Backing up…';

        function restore() { leaveBtn.disabled = false; leaveBtn.textContent = label; }
        function finish() {
          var go = function () { location.href = 'index.html'; };
          var out = (window.SMFirebase && SMFirebase.isEnabled()) ? SMFirebase.signOut() : Promise.resolve();
          SMStore.resetLocalData();
          out.then(go, go);
        }

        SMSync.syncNow().then(function (r) {
          if (r && r.ok) { finish(); return; }
          var why = (r && r.status && r.status.lastSyncError) || (r && r.reason) || 'unknown problem';
          var last = r && r.status && r.status.lastSyncedAt
            ? new Date(r.status.lastSyncedAt).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
            : 'never';
          var msg = 'Could not back up your latest changes (' + why + ').\nLast successful backup: ' + last + '.\n\n' +
            'If you log out now, anything added since then will be LOST from this device.\n\nLog out anyway?';
          if (confirm(msg)) finish(); else restore();
        }, function () { restore(); SMUI.toast('Something went wrong. You are still logged in.'); });
      });
    }
    document.getElementById('sampleBtn').addEventListener('click', SMStore.loadSample);
    document.getElementById('clearBtn').addEventListener('click', SMStore.clearAll);

    document.getElementById('importBtn').addEventListener('click', function () {
      document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      var msg = document.getElementById('importMsg');
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        if (!confirm('Import this backup? This will replace all current records on this device.')) {
          e.target.value = '';
          return;
        }
        var result = SMStore.importData(reader.result);
        if (result.ok) {
          msg.innerHTML = '<div class="msg info">Backup imported successfully. Reloading…</div>';
          SMUI.toast('Backup imported');
          setTimeout(function () { location.reload(); }, 600);
        } else {
          msg.innerHTML = '<div class="msg err">' + SMStore.esc(result.error) + '</div>';
        }
        e.target.value = '';
      };
      reader.onerror = function () {
        msg.innerHTML = '<div class="msg err">Could not read the file.</div>';
        e.target.value = '';
      };
      reader.readAsText(file);
    });

    document.getElementById('themeSelect').addEventListener('change', function (e) {
      SMStore.getState().settings.theme = e.target.value;
      SMStore.save();
    });
    document.getElementById('contrastSelect').addEventListener('change', function (e) {
      SMStore.getState().settings.contrast = e.target.value;
      SMStore.save();
    });
    document.getElementById('fontSelect').addEventListener('change', function (e) {
      SMStore.getState().settings.fontsize = e.target.value;
      SMStore.save();
    });

    var setPinBtn = document.getElementById('setPinBtn');
    if (setPinBtn) {
      setPinBtn.addEventListener('click', function () {
        var a = document.getElementById('newPin').value;
        var b = document.getElementById('confirmPin').value;
        if (!/^\d{4,6}$/.test(a)) { SMUI.toast('PIN must be 4–6 digits'); return; }
        if (a !== b) { SMUI.toast('PINs do not match'); return; }
        if (SMStore.setPin(a)) {
          sessionStorage.setItem('sm_unlocked', '1');
          SMUI.toast('PIN set');
          render();
        } else SMUI.toast('Could not set PIN');
      });
    }
    var clearPinBtn = document.getElementById('clearPinBtn');
    if (clearPinBtn) {
      clearPinBtn.addEventListener('click', function () {
        if (!confirm('Remove the PIN lock?')) return;
        SMStore.clearPin();
        SMUI.toast('PIN removed');
        render();
      });
    }
    var changePinBtn = document.getElementById('changePinBtn');
    if (changePinBtn) {
      changePinBtn.addEventListener('click', function () {
        var np = prompt('Enter new PIN (4–6 digits)');
        if (np == null) return;
        if (!/^\d{4,6}$/.test(np)) { SMUI.toast('PIN must be 4–6 digits'); return; }
        if (SMStore.setPin(np)) SMUI.toast('PIN updated');
        else SMUI.toast('Could not update PIN');
      });
    }

    document.getElementById('loanForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var amount = SMStore.num(e.target.amount.value);
      var term = Math.max(1, Math.round(SMStore.num(e.target.term.value)));
      var fees = SMStore.num(e.target.fees.value);
      var out = document.getElementById('loanResult');
      if (!(amount > 0)) { out.innerHTML = '<div class="msg err">Enter a loan amount greater than zero.</div>'; return; }
      var totalRepaid = SMStore.round2(amount + fees);
      var effective = amount > 0 ? (fees / amount) * 100 : 0;
      var monthly = SMStore.round2(totalRepaid / term);
      var annualApprox = term > 0 ? (effective * (12 / term)) : 0;
      out.innerHTML = '<div class="msg info"><strong>Results</strong><ul style="margin:.4rem 0 0 1.1rem;line-height:1.7">' +
        '<li>Amount borrowed: ' + SMStore.ZAR(amount) + '</li>' +
        '<li>Fees + interest: ' + SMStore.ZAR(fees) + '</li>' +
        '<li>Total repaid: <strong>' + SMStore.ZAR(totalRepaid) + '</strong></li>' +
        '<li>Approx. monthly repayment: ' + SMStore.ZAR(monthly) + ' over ' + term + ' month(s)</li>' +
        '<li>Cost as % of amount: <strong>' + effective.toFixed(1) + '%</strong></li>' +
        '<li>Rough annualised rate (simple): ~' + annualApprox.toFixed(0) + '% p.a.</li></ul>' +
        '<p class="small-text" style="margin-top:.5rem">If the cost percentage looks high, compare with other options or avoid borrowing if you cannot repay comfortably.</p></div>';
    });
  }

  render();
})();
