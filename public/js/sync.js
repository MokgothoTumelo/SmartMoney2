/**
 * SmartMoney — offline-first sync layer
 * Local SMStore is always authoritative for UI.
 * Cloud (Firebase placeholder) is optional backup when online + signed in.
 */
(function (global) {
  'use strict';

  function nowIso() {
    return new Date().toISOString();
  }

  function ensureSyncMeta() {
    const s = SMStore.getState();
    if (!s.sync) {
      s.sync = {
        lastSyncedAt: null,
        lastSyncError: null,
        accountMode: 'guest', // 'guest' | 'account'
        uid: null,
      };
    }
    return s.sync;
  }

  function touchRecord(rec) {
    if (!rec || typeof rec !== 'object') return rec;
    rec.updatedAt = nowIso();
    rec.syncStatus = 'pending'; // pending | synced
    return rec;
  }

  function markAllPending() {
    const s = SMStore.getState();
    (s.transactions || []).forEach(touchRecord);
    (s.planned || []).forEach(touchRecord);
    (s.goals || []).forEach(touchRecord);
    if (s.profile) {
      s.profile.updatedAt = nowIso();
      s.profile.syncStatus = 'pending';
    }
    SMStore.save();
  }

  function countPending() {
    const s = SMStore.getState();
    let n = 0;
    function add(arr) {
      (arr || []).forEach(function (r) {
        if (!r.syncStatus || r.syncStatus === 'pending') n++;
      });
    }
    add(s.transactions);
    add(s.planned);
    add(s.goals);
    if (s.profile && s.profile.syncStatus === 'pending') n++;
    return n;
  }

  function markAllSynced() {
    const s = SMStore.getState();
    function ok(arr) {
      (arr || []).forEach(function (r) { r.syncStatus = 'synced'; });
    }
    ok(s.transactions);
    ok(s.planned);
    ok(s.goals);
    if (s.profile) s.profile.syncStatus = 'synced';
    const meta = ensureSyncMeta();
    meta.lastSyncedAt = nowIso();
    meta.lastSyncError = null;
    SMStore.save();
  }

  function getSyncStatus() {
    const meta = ensureSyncMeta();
    return {
      pending: countPending(),
      lastSyncedAt: meta.lastSyncedAt,
      lastSyncError: meta.lastSyncError,
      accountMode: meta.accountMode || 'guest',
      uid: meta.uid || null,
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      firebaseReady: !!(global.SMFirebase && SMFirebase.isEnabled && SMFirebase.isEnabled()),
    };
  }

  /**
   * Build payload for cloud. Local remains source of truth.
   */
  function buildPayload() {
    const s = SMStore.getState();
    return {
      profile: s.profile || {},
      transactions: s.transactions || [],
      planned: s.planned || [],
      goals: s.goals || [],
      updatedAt: nowIso(),
    };
  }

  /**
   * Merge remote into local (simple: prefer newer updatedAt per id).
   * Used when Firebase pull is implemented.
   */
  function mergeRemote(remote) {
    if (!remote || typeof remote !== 'object') return;
    const s = SMStore.getState();
    if (remote.profile) {
      const lp = s.profile || {};
      const rp = remote.profile;
      if (!lp.updatedAt || (rp.updatedAt && rp.updatedAt > lp.updatedAt)) {
        s.profile = Object.assign({}, lp, rp);
      }
    }
    function mergeList(localKey, remoteList) {
      if (!Array.isArray(remoteList)) return;
      const map = {};
      (s[localKey] || []).forEach(function (r) { map[r.id] = r; });
      remoteList.forEach(function (r) {
        if (!r || !r.id) return;
        const cur = map[r.id];
        if (!cur || (r.updatedAt && (!cur.updatedAt || r.updatedAt > cur.updatedAt))) {
          map[r.id] = r;
        }
      });
      s[localKey] = Object.keys(map).map(function (k) { return map[k]; });
    }
    mergeList('transactions', remote.transactions);
    mergeList('planned', remote.planned);
    mergeList('goals', remote.goals);
    SMStore.save();
  }

  /**
   * syncNow — back up local data to Firebase when signed in and online.
   */
  function doSync() {
    const meta = ensureSyncMeta();
    const status = getSyncStatus();

    if (!status.online) {
      meta.lastSyncError = 'Offline — changes stay on this device until you reconnect.';
      SMStore.save();
      return Promise.resolve({ ok: false, reason: 'offline', status: getSyncStatus() });
    }

    if (meta.accountMode !== 'account') {
      meta.lastSyncError = 'Guest mode — data stays on this device only. Sign up to enable cloud backup.';
      SMStore.save();
      return Promise.resolve({ ok: false, reason: 'guest', status: getSyncStatus() });
    }

    if (!global.SMFirebase || !SMFirebase.isEnabled()) {
      meta.lastSyncError = 'Cloud backup is not set up yet (Firebase config missing).';
      SMStore.save();
      return Promise.resolve({ ok: false, reason: 'not-configured', status: getSyncStatus() });
    }

    let sigAtPush = null;
    const uid = meta.uid;
    if (!uid) {
      meta.lastSyncError = 'Not signed in.';
      SMStore.save();
      return Promise.resolve({ ok: false, reason: 'no-uid', status: getSyncStatus() });
    }

    /* Make sure Firebase's signed-in user is the same account this device thinks it is */
    return SMFirebase.getCurrentUser()
      .then(function (user) {
        if (!user || user.uid !== uid) {
          const e = new Error('Please log in again to back up your data.');
          e.code = 'unauthenticated';
          throw e;
        }
        /* First sync after login: merge cloud data into this device once (never loses either side).
           Later syncs: this device is the master copy and the cloud is updated to match. */
        if (meta.needsInitialMerge) {
          return SMFirebase.pullAll(uid).then(function (remote) {
            if (remote) mergeRemote(remote);
            meta.needsInitialMerge = false;
          });
        }
      })
      .then(function () {
        sigAtPush = dataSignature();
        return SMFirebase.pushAll(uid, buildPayload());
      })
      .then(function () {
        meta.lastSyncedSig = sigAtPush;
        markAllSynced();
        return { ok: true, reason: 'firebase', message: 'Backed up to the cloud.', status: getSyncStatus() };
      })
      .catch(function (err) {
        meta.lastSyncError = SMFirebase.friendlyError ? SMFirebase.friendlyError(err) : ((err && err.message) || 'Sync failed');
        SMStore.save();
        return { ok: false, reason: 'error', error: meta.lastSyncError, status: getSyncStatus() };
      });
  }

  /* ---------- automatic backup ---------- */
  var syncing = false;
  var inFlight = null;
  var timer = null;

  function djb2(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return String(h >>> 0);
  }
  /* A fingerprint of the user's records (ignores sync bookkeeping and settings) */
  function dataSignature() {
    const s = SMStore.getState();
    function strip(r) {
      if (!r || typeof r !== 'object') return r;
      const c = Object.assign({}, r);
      delete c.syncStatus; delete c.updatedAt;
      return c;
    }
    return djb2(JSON.stringify([
      strip(s.profile), (s.transactions || []).map(strip), (s.planned || []).map(strip), (s.goals || []).map(strip)
    ]));
  }
  function isDirty() {
    const meta = ensureSyncMeta();
    return meta.lastSyncedSig !== dataSignature();
  }
  function canAutoSync() {
    const meta = ensureSyncMeta();
    return meta.accountMode === 'account' && !!meta.uid &&
      !!(global.SMFirebase && SMFirebase.isEnabled && SMFirebase.isEnabled()) &&
      typeof navigator !== 'undefined' && navigator.onLine;
  }
  function scheduleAutoSync(delay) {
    if (!canAutoSync() || !isDirty()) return;
    clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      if (canAutoSync() && isDirty()) syncNow();
    }, delay == null ? 3000 : delay);
  }
  /* Called by SMStore.save() after every change */
  function onSaved() {
    if (syncing) return; /* our own bookkeeping writes */
    scheduleAutoSync();
  }

  /** One sync at a time; callers during a running sync share its result. */
  function syncNow() {
    if (inFlight) return inFlight;
    clearTimeout(timer); timer = null;
    syncing = true;
    inFlight = Promise.resolve().then(doSync).then(function (r) {
      syncing = false; inFlight = null; return r;
    }, function (e) {
      syncing = false; inFlight = null; throw e;
    });
    return inFlight;
  }

  function setAccountMode(mode, uid) {
    const meta = ensureSyncMeta();
    meta.accountMode = mode === 'account' ? 'account' : 'guest';
    meta.uid = uid || null;
    meta.needsInitialMerge = meta.accountMode === 'account';
    if (meta.accountMode === 'account') meta.dataOwnerUid = uid || null; /* whose data is on this device */
    SMStore.save();
  }

  function onLocalDataChanged() {
    /* Call after user edits money data if you want explicit pending flags */
    markAllPending();
  }

  /* Back online → push anything not yet backed up */
  if (typeof window !== 'undefined') {
    window.addEventListener('online', function () {
      if (canAutoSync() && isDirty()) {
        syncNow().then(function (r) {
          if (r.ok && global.SMUI && SMUI.toast) SMUI.toast('Back online — data backed up');
        });
      }
    });
    /* Leaving/hiding the page → flush right away (the timer would be lost on navigation) */
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden' && canAutoSync() && isDirty()) syncNow();
    });
    /* Page opened → catch up on anything that wasn't backed up last time */
    window.addEventListener('load', function () { scheduleAutoSync(1500); });
  }

  global.SMSync = {
    ensureSyncMeta,
    touchRecord,
    markAllPending,
    markAllSynced,
    countPending,
    getSyncStatus,
    buildPayload,
    mergeRemote,
    syncNow,
    setAccountMode,
    onLocalDataChanged,
    onSaved,
    isDirty,
    scheduleAutoSync,
  };
})(window);
