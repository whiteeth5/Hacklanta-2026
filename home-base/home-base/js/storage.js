/*
  Home Base: storage
  ------------------
  Everything is saved in the browser on the person's own device (localStorage).
  Nothing is sent to a server, so no account is needed and there is nothing to hack.

  Because a lost or reset phone would lose the data, people can save a backup file
  and restore it later (or on a new phone).

  If you add a server later (accounts + sync), this is the only file that needs
  to change: keep the same load()/save() functions and have them talk to your API.
*/
(function () {
  "use strict";

  var KEY = "homebase-budget-v1";
  var BACKUP_APP_NAME = "home-base";

  function num(v) { var n = parseFloat(v); return isFinite(n) ? n : 0; }

  function blank() {
    return { v: 1, income: 0, monthly: [], yearly: [], grocery: { budget: 0, trips: [] }, subs: [] };
  }

  // Makes sure data from storage or a backup file has the right shape.
  function normalize(s) {
    if (!s || typeof s !== "object") return blank();
    var g = s.grocery && typeof s.grocery === "object" ? s.grocery : {};
    return {
      v: 1,
      income: num(s.income),
      monthly: Array.isArray(s.monthly) ? s.monthly : [],
      yearly: Array.isArray(s.yearly) ? s.yearly : [],
      grocery: { budget: num(g.budget), trips: Array.isArray(g.trips) ? g.trips : [] },
      subs: Array.isArray(s.subs) ? s.subs : []
    };
  }

  function hasData(s) {
    return !!(s.income || s.monthly.length || s.yearly.length || s.subs.length ||
      s.grocery.budget || s.grocery.trips.length);
  }

  function load() {
    try {
      var t = localStorage.getItem(KEY);
      return t ? normalize(JSON.parse(t)) : blank();
    } catch (e) {
      return blank();
    }
  }

  // Returns true if it saved, false if the browser refused (private mode, storage full).
  function save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  // Ask the browser not to clear our data when the phone is low on space.
  function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(function () {});
    }
  }

  function exportBackup(state) {
    var d = new Date();
    var stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    var payload = { app: BACKUP_APP_NAME, version: 1, exported: d.toISOString(), data: state };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "home-base-backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // Reads a backup file. Resolves with clean data, or rejects with a plain-language message.
  function readBackup(file) {
    return new Promise(function (resolve, reject) {
      if (!file) { reject("No file was chosen."); return; }
      if (file.size > 5 * 1024 * 1024) { reject("That file is too big to be a Home Base backup."); return; }
      var r = new FileReader();
      r.onload = function () {
        try {
          var parsed = JSON.parse(r.result);
          if (!parsed || parsed.app !== BACKUP_APP_NAME || !parsed.data) {
            reject("That file isn't a Home Base backup.");
            return;
          }
          resolve(normalize(parsed.data));
        } catch (e) {
          reject("That file couldn't be read. Make sure it's the backup file Home Base saved.");
        }
      };
      r.onerror = function () { reject("That file couldn't be opened."); };
      r.readAsText(file);
    });
  }

  window.HB = window.HB || {};
  window.HB.storage = {
    blank: blank,
    normalize: normalize,
    hasData: hasData,
    load: load,
    save: save,
    requestPersistence: requestPersistence,
    exportBackup: exportBackup,
    readBackup: readBackup
  };
})();
