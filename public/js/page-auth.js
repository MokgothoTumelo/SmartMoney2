(function () {
  'use strict';

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'signup') {
    setTimeout(() => {
      document.querySelector('[data-tab="signup"]')?.click();
    }, 10);
  }

  const tabs = document.querySelectorAll('.auth-tabs button');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const resetForm = document.getElementById('resetForm');

  function switchTab(tab) {
    tabs.forEach(t => {
      const on = t.dataset.tab === tab;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    loginForm.classList.toggle('active', tab === 'login');
    signupForm.classList.toggle('active', tab === 'signup');
    resetForm.classList.remove('active');
    clearMessages();
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-switch]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(link.dataset.switch);
    });
  });

  document.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = 'Hide';
      } else {
        input.type = 'password';
        btn.textContent = 'Show';
      }
    });
  });

  function showError(form, message) {
    const errorEl = document.getElementById(form + 'Error');
    const successEl = document.getElementById(form + 'Success');
    if (successEl) successEl.classList.remove('show');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  function showSuccess(form, message) {
    const errorEl = document.getElementById(form + 'Error');
    const successEl = document.getElementById(form + 'Success');
    if (errorEl) errorEl.classList.remove('show');
    if (successEl) {
      successEl.textContent = message;
      successEl.classList.add('show');
    }
  }

  function clearMessages() {
    document.querySelectorAll('.auth-error, .auth-success').forEach(el => {
      el.classList.remove('show');
      el.textContent = '';
    });
  }

  function setLoading(btn, loading) {
    if (!btn) return;
    btn.disabled = !!loading;
    btn.textContent = loading ? 'Please wait…' : (btn.id === 'loginBtn' ? 'Log in' : btn.id === 'resetBtn' ? 'Send reset link' : 'Create account');
  }

  function requireFirebase() {
    if (!window.SMFirebase || !SMFirebase.isEnabled()) {
      throw new Error('Login is not set up yet. Paste your Firebase config into public/js/firebase-config.js, then refresh.');
    }
  }

  /* Only called AFTER Firebase has confirmed the credentials.
     isNew = brand-new account (push this device's data up); otherwise merge cloud data down first. */
  function grantAccess(user, isNew) {
    /* Different person on this device? Remove the previous account's records first. */
    const owner = (SMStore.getState().sync || {}).dataOwnerUid;
    if (owner && owner !== user.uid) SMStore.resetLocalData();
    SMStore.getState().welcomeSeen = true;
    SMStore.save();
    SMSync.setAccountMode('account', user.uid);
    if (isNew) SMSync.markAllPending();
  }

  /* Back up / restore right after login, but never block the user for long */
  function syncAfterLogin() {
    if (!window.SMSync) return Promise.resolve();
    const timeout = new Promise(function (resolve) { setTimeout(resolve, 8000); });
    return Promise.race([SMSync.syncNow().catch(function () {}), timeout]);
  }

  function saveProfile(partial) {
    try {
      if (!window.SMStore) return;
      const s = SMStore.getState();
      if (!s.profile) s.profile = { name: '', phone: '', email: '' };
      Object.assign(s.profile, partial);
      SMStore.save();
    } catch (e) {}
  }

  function friendly(err) {
    return (window.SMFirebase && SMFirebase.friendlyError)
      ? SMFirebase.friendlyError(err)
      : ((err && err.message) || 'Something went wrong. Please try again.');
  }

  /* ---------- Forgot password ---------- */
  document.getElementById('forgotLink').addEventListener('click', function (e) {
    e.preventDefault();
    clearMessages();
    tabs.forEach(function (t) { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
    loginForm.classList.remove('active');
    signupForm.classList.remove('active');
    resetForm.classList.add('active');
    const typed = document.getElementById('loginEmail').value.trim();
    const box = document.getElementById('resetEmail');
    if (typed && !box.value) box.value = typed;
    box.focus();
  });

  resetForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearMessages();
    const email = document.getElementById('resetEmail').value.trim();
    const btn = document.getElementById('resetBtn');
    if (!email) { showError('reset', 'Please enter your email address.'); return; }

    setLoading(btn, true);
    try {
      requireFirebase();
      await SMFirebase.sendPasswordReset(email);
      showSuccess('reset', 'If an account exists for ' + email + ', a reset link is on its way. Check your inbox and spam folder.');
    } catch (err) {
      /* "no such user" is reported as success so nobody can test which emails are registered */
      const code = (err && err.code) || '';
      if (code === 'auth/user-not-found') {
        showSuccess('reset', 'If an account exists for ' + email + ', a reset link is on its way. Check your inbox and spam folder.');
      } else {
        showError('reset', friendly(err));
      }
    } finally {
      setLoading(btn, false);
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!email || !password) {
      showError('login', 'Please fill in all fields.');
      return;
    }

    setLoading(btn, true);
    try {
      requireFirebase();
      const user = await SMFirebase.signIn(email, password);

      grantAccess(user, false);
      showSuccess('login', 'Logged in. Opening the app…');
      await syncAfterLogin();

      /* fill in the email if the profile is still blank (e.g. new device) */
      const prof = SMStore.getState().profile || {};
      if (!prof.email) saveProfile({ email: user.email });
      if (!prof.name && user.name) saveProfile({ name: user.name });

      location.href = 'money.html';
    } catch (err) {
      showError('login', friendly(err));
    } finally {
      setLoading(btn, false);
    }
  });

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearMessages();

    const name = document.getElementById('signupName').value.trim();
    const phone = document.getElementById('signupPhone').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const confirm = document.getElementById('signupConfirm').value;
    const btn = document.getElementById('signupBtn');

    if (!name || !phone || !email || !password || !confirm) {
      showError('signup', 'Please fill in all fields.');
      return;
    }
    if (name.length < 2) {
      showError('signup', 'Please enter your full name.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 9) {
      showError('signup', 'Please enter a valid phone number.');
      return;
    }
    if (password.length < 8) {
      showError('signup', 'Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      showError('signup', 'Passwords do not match.');
      return;
    }

    setLoading(btn, true);
    try {
      requireFirebase();
      const user = await SMFirebase.signUp(email, password, name);

      saveProfile({ name: name, phone: phone, email: email });
      grantAccess(user, true);

      showSuccess('signup', 'Account created. Opening the app…');
      await syncAfterLogin();
      location.href = 'money.html';
    } catch (err) {
      showError('signup', friendly(err));
    } finally {
      setLoading(btn, false);
    }
  });
})();
