(function () {
  'use strict';

  /* Welcome always shows on index.html — never auto-redirect away */
  SMUI.bootPage('welcome');
  const view = document.getElementById('view');
  if (!view) return;

  const I = SMUI.ICONS;

  view.innerHTML = `
    <div class="wl">
      <header class="wl-top">
        <div class="wl-brand" aria-label="SmartMoney">
          <span class="wl-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/></svg>
          </span>
          <span class="wl-name">SmartMoney</span>
        </div>
        
      </header>

      <section class="wl-hero" aria-label="Welcome to SmartMoney">
        <p class="wl-eyebrow">Built for irregular income</p>
        <h1 class="wl-title">Your money.<br>Your plan.<br><span class="wl-title-accent">Your confidence.</span></h1>
        <p class="wl-lead">A simple, private companion for recording income as it arrives, planning essential costs, saving small amounts when you can, and spotting scams — all on this device.</p>

        <div class="wl-actions">
          <a href="auth.html" class="wl-btn wl-btn-primary">Log in</a>
          <a href="auth.html?tab=signup" class="wl-btn wl-btn-secondary">Sign up</a>
          <button type="button" class="wl-btn wl-btn-ghost" id="continueBtn">Continue without account</button>
        </div>
        <p class="wl-note">No bank connection. No passwords requested. Guest mode keeps everything on this phone only.</p>
      </section>

      <section class="wl-features" aria-label="What SmartMoney does">
        <h2 class="wl-section-title">What you can do</h2>
        <div class="wl-feature-grid">
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.wallet}</div>
            <h3>My Money</h3>
            <p>See income, expenses, plans and what is left — clearly separated from a bank balance.</p>
          </article>
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.budget}</div>
            <h3>Flexible budget</h3>
            <p>No fixed salary needed. Add money when it arrives and adjust plans any time.</p>
          </article>
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.target}</div>
            <h3>Small savings</h3>
            <p>Personal goals, stokvels or group savings. Contribute only when you can.</p>
          </article>
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.shield}</div>
            <h3>Safety centre</h3>
            <p>Check suspicious messages and learn common scam patterns before you act.</p>
          </article>
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.check}</div>
            <h3>Private by design</h3>
            <p>Records stay in this browser. We never ask for bank PINs, OTPs or passwords.</p>
          </article>
          <article class="wl-feature">
            <div class="wl-feature-icon" aria-hidden="true">${I.settings}</div>
            <h3>Works offline</h3>
            <p>Lightweight pages, large text options, and offline use after the first visit.</p>
          </article>
        </div>
      </section>


      <footer class="wl-foot">
        <p>SmartMoney · Educational tool · Your data stays on this device</p>
      </footer>
    </div>`;

  const btn = document.getElementById('continueBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      const s = SMStore.getState();
      s.welcomeSeen = true;
      SMStore.save();
      if (window.SMSync) SMSync.setAccountMode('guest', null);
      location.href = 'money.html';
    });
  }
})();
