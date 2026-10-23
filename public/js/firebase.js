/**
 * SmartMoney — Firebase Auth + Firestore layer.
 * The Firebase SDK (~500 KB) is loaded only when someone logs in, signs up or syncs,
 * so guest users never download it.
 *
 * Data layout in Firestore:
 *   users/{uid}                      { profile, updatedAt }
 *   users/{uid}/transactions/{id}    one document per record
 *   users/{uid}/planned/{id}
 *   users/{uid}/goals/{id}
 */
(function (global) {
  'use strict';

  var SDK_VERSION = '10.12.2';
  var SDK_BASE = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/';
  var COLLECTIONS = ['transactions', 'planned', 'goals'];

  var CONFIG = global.SM_FIREBASE_CONFIG || {};
  function configured() {
    return !!(CONFIG.apiKey && CONFIG.projectId && CONFIG.appId &&
      String(CONFIG.apiKey).indexOf('PASTE') !== 0 &&
      String(CONFIG.projectId).indexOf('PASTE') !== 0 &&
      String(CONFIG.appId).indexOf('PASTE') !== 0);
  }

  function fail(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  // ---------- lazy SDK loading ----------
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      var timer = setTimeout(function () { s.remove(); reject(fail('sdk/timeout', 'timeout')); }, 20000);
      s.src = src;
      s.async = true;
      s.onload = function () { clearTimeout(timer); resolve(); };
      s.onerror = function () { clearTimeout(timer); s.remove(); reject(fail('sdk/load', 'load')); };
      document.head.appendChild(s);
    });
  }

  var sdkPromise = null;
  var auth = null;
  var db = null;

  function ready() {
    if (!configured()) {
      return Promise.reject(fail('app/not-configured',
        'Firebase is not set up yet. Paste your Firebase config into public/js/firebase-config.js.'));
    }
    if (sdkPromise) return sdkPromise;
    sdkPromise = loadScript(SDK_BASE + 'firebase-app-compat.js')
      .then(function () {
        return Promise.all([
          loadScript(SDK_BASE + 'firebase-auth-compat.js'),
          loadScript(SDK_BASE + 'firebase-firestore-compat.js')
        ]);
      })
      .then(function () {
        if (!global.firebase.apps.length) global.firebase.initializeApp(CONFIG);
        auth = global.firebase.auth();
        db = global.firebase.firestore();
      })
      .catch(function (err) {
        sdkPromise = null; // allow retry
        if (err && (err.code === 'sdk/load' || err.code === 'sdk/timeout')) {
          throw fail('auth/network-request-failed', 'Could not load the login service. Check your internet connection.');
        }
        throw err;
      });
    return sdkPromise;
  }

  function mapUser(u) {
    return u ? { uid: u.uid, email: u.email || '', name: u.displayName || '' } : null;
  }

  // ---------- auth ----------
  /** Resolves with the signed-in user (once Firebase has restored any saved session), or null. */
  function getCurrentUser() {
    return ready().then(function () {
      return new Promise(function (resolve) {
        var off = auth.onAuthStateChanged(function (u) { off(); resolve(mapUser(u)); });
      });
    });
  }

  function signIn(email, password) {
    return ready().then(function () {
      return auth.signInWithEmailAndPassword(email, password);
    }).then(function (cred) { return mapUser(cred.user); });
  }

  function signUp(email, password, displayName) {
    return ready().then(function () {
      return auth.createUserWithEmailAndPassword(email, password);
    }).then(function (cred) {
      if (!displayName) return cred;
      return cred.user.updateProfile({ displayName: displayName }).then(function () { return cred; }, function () { return cred; });
    }).then(function (cred) { return mapUser(cred.user); });
  }

  function signOut() {
    return ready().then(function () { return auth.signOut(); });
  }

  /** Sends Firebase's password-reset email. */
  function sendPasswordReset(email) {
    return ready().then(function () { return auth.sendPasswordResetEmail(email); });
  }

  /** Turns Firebase error codes into plain-English messages. */
  function friendlyError(err) {
    var code = (err && err.code) || '';
    var map = {
      'auth/invalid-credential': 'Incorrect email or password.',
      'auth/wrong-password': 'Incorrect email or password.',
      'auth/user-not-found': 'Incorrect email or password.',
      'auth/invalid-login-credentials': 'Incorrect email or password.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/email-already-in-use': 'An account with this email already exists. Try logging in instead.',
      'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
      'auth/missing-email': 'Please enter your email address.',
      'auth/missing-password': 'Please enter your password.',
      'auth/user-disabled': 'This account has been disabled.',
      'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
      'auth/network-request-failed': 'Cannot reach the login service. Check your internet connection.',
      'auth/operation-not-allowed': 'Email/Password sign-in is not switched on in Firebase yet (Authentication → Sign-in method).',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'The Firebase API key is wrong. Check public/js/firebase-config.js.',
      'auth/invalid-api-key': 'The Firebase API key is wrong. Check public/js/firebase-config.js.',
      'auth/unauthorized-domain': 'This website address is not authorised in Firebase (Authentication → Settings → Authorised domains).',
      'permission-denied': 'Not allowed. Please log in again, then retry.',
      'unauthenticated': 'Please log in again to sync.',
      'unavailable': 'Cloud service is unreachable right now. Your data is safe on this device.',
      'app/not-configured': err && err.message
    };
    return map[code] || (err && err.message) || 'Something went wrong. Please try again.';
  }

  // ---------- Firestore ----------
  function plain(obj) { return JSON.parse(JSON.stringify(obj)); } // strips undefined (Firestore rejects it)

  function userRef(uid) { return db.collection('users').doc(uid); }

  /**
   * Make the cloud copy match the local snapshot (adds/updates local records, removes cloud
   * records that no longer exist locally).
   */
  function pushAll(uid, payload) {
    return ready().then(function () {
      var ref = userRef(uid);
      return Promise.all(COLLECTIONS.map(function (c) { return ref.collection(c).get(); }))
        .then(function (snaps) {
          var ops = [];
          ops.push({ type: 'set', ref: ref, data: plain({ profile: payload.profile || {}, updatedAt: payload.updatedAt }) });
          COLLECTIONS.forEach(function (c, i) {
            var local = payload[c] || [];
            var keep = {};
            local.forEach(function (rec) {
              if (!rec || !rec.id) return;
              keep[rec.id] = true;
              ops.push({ type: 'set', ref: ref.collection(c).doc(String(rec.id)), data: plain(rec) });
            });
            snaps[i].forEach(function (d) {
              if (!keep[d.id]) ops.push({ type: 'delete', ref: d.ref });
            });
          });
          // commit in batches of 400 (Firestore limit is 500)
          var chain = Promise.resolve();
          for (var i = 0; i < ops.length; i += 400) {
            (function (slice) {
              chain = chain.then(function () {
                var batch = db.batch();
                slice.forEach(function (op) {
                  if (op.type === 'set') batch.set(op.ref, op.data);
                  else batch.delete(op.ref);
                });
                return batch.commit();
              });
            })(ops.slice(i, i + 400));
          }
          return chain;
        });
    });
  }

  /** @returns {Promise<object|null>} { profile, transactions, planned, goals } or null when the cloud is empty */
  function pullAll(uid) {
    return ready().then(function () {
      var ref = userRef(uid);
      return Promise.all([ref.get()].concat(COLLECTIONS.map(function (c) { return ref.collection(c).get(); })))
        .then(function (res) {
          var out = { profile: null, transactions: [], planned: [], goals: [] };
          var any = false;
          if (res[0].exists) {
            var d = res[0].data() || {};
            if (d.profile) { out.profile = d.profile; any = true; }
          }
          COLLECTIONS.forEach(function (c, i) {
            res[i + 1].forEach(function (doc) { out[c].push(doc.data()); any = true; });
          });
          return any ? out : null;
        });
    });
  }

  global.SMFirebase = {
    CONFIG: CONFIG,
    isEnabled: configured,
    getCurrentUser: getCurrentUser,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    sendPasswordReset: sendPasswordReset,
    pushAll: pushAll,
    pullAll: pullAll,
    friendlyError: friendlyError
  };
})(window);
