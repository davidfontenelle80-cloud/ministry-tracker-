/**
 * One-time organizer migration.
 * Runs before organizer.js normalizes flat Notes so notes that belonged to the
 * old built-in Bible Studies category keep their meaning as Bible Study cards.
 */
(function (global) {
  'use strict';

  var started = false;

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

    var keep = [];
    state.ministryNotes.forEach(function (note) {
      if (!note || note.categoryId !== 'mnc-2') {
        keep.push(note);
        return;
      }

      var migratedId = 'bs-migrated-' + String(note.id || Date.now());
      var exists = state.ministryBibleStudies.some(function (study) { return study && study.id === migratedId; });
      if (!exists) {
        state.ministryBibleStudies.push({
          id: migratedId,
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
        });
      }
      if (note.id) clearOldReminder(note.id);
    });

    state.ministryNotes = keep;
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
