/**
 * One-time organizer migration.
 * Snapshot old Bible Study-category notes immediately, before organizer.js can
 * normalize flat Notes and remove their legacy categoryId.
 */
(function (global) {
  'use strict';

  var started = false;
  var legacyBibleNotes = [];

  // This file is loaded early from push-config.js. Capture the persisted source
  // immediately so the migration remains safe even if organizer.js initializes
  // before state becomes available to this helper.
  try {
    var raw = localStorage.getItem('ministry-tracker-v4');
    var stored = raw ? JSON.parse(raw) : null;
    if (stored && Array.isArray(stored.ministryNotes)) {
      legacyBibleNotes = stored.ministryNotes.filter(function (note) {
        return note && note.categoryId === 'mnc-2';
      });
    }
  } catch (e) {
    legacyBibleNotes = [];
  }

  function reminderLeadMinutes(note) {
    if (!note || !note.dueDate || !note.dueTime || !note.reminderAt) return 15;
    var due = new Date(note.dueDate + 'T' + note.dueTime + ':00').getTime();
    var reminder = new Date(note.reminderAt).getTime();
    if (!Number.isFinite(due) || !Number.isFinite(reminder)) return 15;
    var diff = Math.round((due - reminder) / 60000);
    return diff >= 5 && diff <= 10080 ? diff : 15;
  }

  function clearOldReminder(id) {
    function attempt(tries) {
      if (global.MinistryPush && typeof global.MinistryPush.clearReminder === 'function') {
        global.MinistryPush.clearReminder('ministry-note', id).catch(function () {});
        return;
      }
      if (tries > 0) setTimeout(function () { attempt(tries - 1); }, 500);
    }
    attempt(4);
  }

  function studyFromNote(note) {
    return {
      id: 'bs-migrated-' + String(note.id || Date.now()),
      name: String(note.personName || note.title || (state.lang === 'es' ? 'Estudio bíblico' : 'Bible Study')),
      phone: String(note.phone || ''),
      email: String(note.email || ''),
      address: String(note.address || note.locationName || ''),
      notes: String(note.body || ''),
      publication: String(note.publication || ''),
      lesson: String(note.nextTopic || ''),
      dueDate: String(note.dueDate || ''),
      dueTime: /^\d{2}:\d{2}$/.test(note.dueTime || '') ? note.dueTime : '',
      notify: Boolean(note.reminder),
      reminderMinutes: reminderLeadMinutes(note),
      repeatWeekly: false,
      status: note.completed || note.status === 'done' ? 'completed' : 'active',
      history: [],
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: note.updatedAt || new Date().toISOString()
    };
  }

  function run() {
    if (started) return;
    if (typeof state === 'undefined' || typeof saveState !== 'function') {
      setTimeout(run, 50);
      return;
    }
    started = true;
    if (state.organizerBibleNotesMigrationV1) return;

    if (!Array.isArray(state.ministryNotes)) state.ministryNotes = [];
    if (!Array.isArray(state.ministryBibleStudies)) state.ministryBibleStudies = [];

    var legacyById = {};
    legacyBibleNotes.forEach(function (note) {
      if (note && note.id) legacyById[String(note.id)] = note;
    });
    state.ministryNotes.forEach(function (note) {
      if (note && note.categoryId === 'mnc-2' && note.id) legacyById[String(note.id)] = note;
    });

    Object.keys(legacyById).forEach(function (id) {
      var source = legacyById[id];
      var migrated = studyFromNote(source);
      var exists = state.ministryBibleStudies.some(function (study) {
        return study && study.id === migrated.id;
      });
      if (!exists) state.ministryBibleStudies.push(migrated);
      clearOldReminder(id);
    });

    // Remove the original Note copy even if organizer.js already normalized its
    // categoryId in memory; the early snapshot gives us the original IDs.
    state.ministryNotes = state.ministryNotes.filter(function (note) {
      if (!note) return false;
      if (note.categoryId === 'mnc-2') return false;
      return !note.id || !legacyById[String(note.id)];
    });

    if (Array.isArray(state.ministryNoteCategories)) {
      state.ministryNoteCategories = state.ministryNoteCategories.filter(function (category) {
        return !category || category.id !== 'mnc-2';
      });
    }
    state.organizerBibleNotesMigrationV1 = true;
    saveState();
  }

  run();
})(window);
