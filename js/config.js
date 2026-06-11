/**
 * config.js — KHub Boilerplate
 * Environment detection, feature flags, and v5 credit-hour migration shim.
 */
(function () {
  'use strict';

  const hostname = location.hostname;
  const isDev    = hostname === 'localhost'
                || hostname === '127.0.0.1'
                || location.protocol === 'file:';

  window.KHub = window.KHub || {};
  window.KHub.Config = {
    // ── Identity ──────────────────────────────────────────
    appName:   'Ministry Tracker',
    version:   '5.0.0-credit-hours',
    repoOwner: 'davidfontenelle80-cloud',
    repoName:  'ministry-tracker-',

    // ── Environment ───────────────────────────────────────
    env:    isDev ? 'development' : 'production',
    isDev,
    isProd: !isDev,

    // ── Feature flags ─────────────────────────────────────
    features: {
      auth:     false,
      firebase: true,
    },

    // ── Logging ───────────────────────────────────────────
    log(...args) {
      if (isDev) console.log('[KHub]', ...args);
    },
    warn(...args) {
      if (isDev) console.warn('[KHub]', ...args);
    },
  };

  if (isDev) {
    console.log(`[KHub] Dev mode — v${window.KHub.Config.version}`);
  }

  /**
   * Ministry Tracker v5 credit-hour layer
   *
   * The existing app is intentionally kept intact for beta stability. This layer
   * runs after app.js has declared its globals but before window.onload renders.
   * It upgrades the schema, moves old credit-like service categories into
   * `creditEntries`, and patches dashboard/calendar/reports/entry UI so Field
   * Service Hours and Credit Hours stay separate.
   */
  document.addEventListener('DOMContentLoaded', function installCreditHourSystem() {
    if (!window.KHub) window.KHub = {};

    function ready() {
      return typeof APP_CONFIG !== 'undefined'
        && typeof state !== 'undefined'
        && typeof saveState === 'function'
        && typeof renderAll === 'function';
    }

    if (!ready()) {
      setTimeout(installCreditHourSystem, 50);
      return;
    }

    const CREDIT_SCHEMA_VERSION = 5;
    const PRE_MIGRATION_BACKUP_KEY = 'ministry-tracker-pre-v5-credit-migration';

    const FIELD_ACTIVITY_TAGS = [
      { id: 'regular', label_en: 'Door-to-door', label_es: 'Casa en casa' },
      { id: 'publicWit', label_en: 'Public Witnessing', label_es: 'Predicación pública' },
      { id: 'cartWit', label_en: 'Cart Witnessing', label_es: 'Carrito' },
      { id: 'informalWit', label_en: 'Informal Witnessing', label_es: 'Predicación informal' },
      { id: 'specialCampaign', label_en: 'Special Campaign', label_es: 'Campaña especial' },
      { id: 'other', label_en: 'Other Field Service', label_es: 'Otra predicación' },
    ];

    const CREDIT_TYPES = [
      { id: 'ldc', label_en: 'LDC', label_es: 'LDC' },
      { id: 'construction', label_en: 'Construction', label_es: 'Construcción' },
      { id: 'disasterRelief', label_en: 'Disaster Relief', label_es: 'Socorro por desastres' },
      { id: 'bethel', label_en: 'Bethel', label_es: 'Betel' },
      { id: 'remoteBethel', label_en: 'Remote Bethel Worker', label_es: 'Trabajador remoto de Betel' },
      { id: 'translation', label_en: 'Translation', label_es: 'Traducción' },
      { id: 'remoteVolunteer', label_en: 'Remote Volunteer', label_es: 'Voluntario remoto' },
      { id: 'pioneerSchool', label_en: 'Pioneer School', label_es: 'Escuela de Precursores' },
      { id: 'otherCredit', label_en: 'Other Approved Credit', label_es: 'Otro crédito aprobado' },
    ];

    const CREDIT_CATEGORY_ALIASES = {
      ldc: 'ldc',
      construction: 'construction',
      disasterRelief: 'disasterRelief',
      disaster_relief: 'disasterRelief',
      bethel: 'bethel',
      remoteBethel: 'remoteBethel',
      remote_bethel: 'remoteBethel',
      translation: 'translation',
      remoteVolunteer: 'remoteVolunteer',
      remote_volunteer: 'remoteVolunteer',
      pioneerSchool: 'pioneerSchool',
      pioneer_school: 'pioneerSchool',
      otherCredit: 'otherCredit',
      approvedCredit: 'otherCredit',
    };

    const FIELD_IDS = new Set(FIELD_ACTIVITY_TAGS.map(x => x.id));
    const CREDIT_IDS = new Set(CREDIT_TYPES.map(x => x.id));

    function langIsEs() { return (state.lang || 'en') === 'es'; }
    function creditLabel(type) {
      const row = CREDIT_TYPES.find(x => x.id === type) || CREDIT_TYPES[CREDIT_TYPES.length - 1];
      return langIsEs() ? (row.label_es || row.label_en) : (row.label_en || row.label_es);
    }
    function fieldLabel(id) {
      const row = FIELD_ACTIVITY_TAGS.find(x => x.id === id) || FIELD_ACTIVITY_TAGS[0];
      return langIsEs() ? (row.label_es || row.label_en) : (row.label_en || row.label_es);
    }
    function normalizeCreditType(type) {
      return CREDIT_CATEGORY_ALIASES[type] || (CREDIT_IDS.has(type) ? type : null);
    }
    function ensureArray(value) { return Array.isArray(value) ? value : []; }

    function backupBeforeMigration() {
      try {
        if (localStorage.getItem(PRE_MIGRATION_BACKUP_KEY)) return;
        const raw = localStorage.getItem(APP_CONFIG.storageKey);
        if (!raw) return;
        localStorage.setItem(PRE_MIGRATION_BACKUP_KEY, JSON.stringify({
          createdAt: new Date().toISOString(),
          storageKey: APP_CONFIG.storageKey,
          data: JSON.parse(raw),
        }));
      } catch (e) {
        console.warn('[Credit v5] pre-migration backup skipped', e);
      }
    }

    function migrateCreditState() {
      if (!state || state.creditSystemVersion === 1) return;

      backupBeforeMigration();

      state.creditEntries = ensureArray(state.creditEntries);
      const moved = [];
      const kept = [];
      const seenCreditIds = new Set(state.creditEntries.map(e => e && e.id).filter(Boolean));

      ensureArray(state.sessions).forEach(function (session) {
        const creditType = normalizeCreditType(session.category);
        if (creditType && (session.durationMin || 0) > 0) {
          const id = 'c_from_' + (session.id || (session.date + '_' + Math.random().toString(36).slice(2, 7)));
          if (!seenCreditIds.has(id)) {
            state.creditEntries.push({
              id,
              date: session.date,
              minutes: session.durationMin || 0,
              type: creditType,
              note: session.note || '',
              migratedFromSessionId: session.id || null,
              migratedAt: new Date().toISOString(),
            });
            seenCreditIds.add(id);
            moved.push({ type: creditType, minutes: session.durationMin || 0 });
          }
        } else {
          kept.push(session);
        }
      });
      state.sessions = kept;

      const legacyCreditByMonth = state.creditByMonth || {};
      Object.entries(legacyCreditByMonth).forEach(function ([mk, minutes]) {
        minutes = parseInt(minutes, 10) || 0;
        if (minutes <= 0 || !/^\d{4}-\d{2}$/.test(mk)) return;
        const id = 'c_legacy_month_' + mk;
        if (seenCreditIds.has(id)) return;
        state.creditEntries.push({
          id,
          date: mk + '-01',
          minutes,
          type: 'otherCredit',
          note: 'Legacy monthly credit total migrated from v4',
          migratedFromCreditByMonth: mk,
          migratedAt: new Date().toISOString(),
        });
        seenCreditIds.add(id);
        moved.push({ type: 'otherCredit', minutes });
      });
      state.creditByMonth = {};

      state.categories = FIELD_ACTIVITY_TAGS.map(x => ({ ...x }));
      if (!FIELD_IDS.has(state.lastUsedCategory)) state.lastUsedCategory = 'regular';
      if (state.activeTimer && normalizeCreditType(state.activeTimer.category)) {
        state.activeTimer.category = 'regular';
      }

      APP_CONFIG.schemaVersion = CREDIT_SCHEMA_VERSION;
      APP_CONFIG.defaults.schemaVersion = CREDIT_SCHEMA_VERSION;
      APP_CONFIG.defaults.creditEntries = [];
      APP_CONFIG.defaults.creditByMonth = {};
      APP_CONFIG.defaults.categories = FIELD_ACTIVITY_TAGS.map(x => ({ ...x }));

      state.schemaVersion = CREDIT_SCHEMA_VERSION;
      state.creditSystemVersion = 1;
      state.creditMigration = {
        completedAt: new Date().toISOString(),
        movedEntries: moved.length,
        movedMinutes: moved.reduce((a, x) => a + x.minutes, 0),
      };
      saveState();
    }

    function getCreditEntriesForDate(date) {
      return ensureArray(state.creditEntries).filter(e => e && e.date === date && (e.minutes || 0) > 0);
    }
    function getCreditEntriesForMonth(mk) {
      return ensureArray(state.creditEntries).filter(e => e && e.date && e.date.startsWith(mk) && (e.minutes || 0) > 0);
    }
    function getCreditMinutesForDate(date) {
      return getCreditEntriesForDate(date).reduce((a, e) => a + (parseInt(e.minutes, 10) || 0), 0);
    }
    function getCreditBreakdown(mk) {
      const out = {};
      getCreditEntriesForMonth(mk).forEach(e => {
        const type = normalizeCreditType(e.type) || 'otherCredit';
        out[type] = (out[type] || 0) + (parseInt(e.minutes, 10) || 0);
      });
      return out;
    }
    function getServiceYearCreditMinutes() {
      const { start, end } = getServiceYearRange();
      const s = ymd(start), e = ymd(end);
      return ensureArray(state.creditEntries)
        .filter(x => x.date >= s && x.date <= e)
        .reduce((a, x) => a + (parseInt(x.minutes, 10) || 0), 0);
    }

    // Patch credit total helper used by existing reports/dashboard shell.
    getMonthCredit = function (mk) {
      return getCreditEntriesForMonth(mk).reduce((a, e) => a + (parseInt(e.minutes, 10) || 0), 0);
    };

    const oldCategoryLabel = categoryLabel;
    categoryLabel = function (catId) {
      if (FIELD_IDS.has(catId)) return fieldLabel(catId);
      return oldCategoryLabel(catId);
    };

    function addCreditEntry(date, minutes, type, note) {
      minutes = parseInt(minutes, 10) || 0;
      if (!date || minutes <= 0) return false;
      state.creditEntries = ensureArray(state.creditEntries);
      state.creditEntries.push({
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        date,
        minutes,
        type: normalizeCreditType(type) || 'otherCredit',
        note: note || '',
      });
      state.sessionsSinceLastBackup = (state.sessionsSinceLastBackup || 0) + 1;
      saveState();
      return true;
    }

    function deleteCreditEntry(id) {
      state.creditEntries = ensureArray(state.creditEntries).filter(e => e.id !== id);
      saveState();
      renderAll();
    }

    function injectStyles() {
      if (document.getElementById('creditV5Styles')) return;
      const style = document.createElement('style');
      style.id = 'creditV5Styles';
      style.textContent = `
        .credit-v5-line { color: var(--purple); font-size: 10px; font-weight: 800; line-height: 1.15; margin-top: 1px; }
        .credit-v5-card { border-color: rgba(168, 85, 247, .35) !important; }
        .credit-v5-type { color: var(--purple); }
        .credit-v5-entry-row { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; padding:10px 0; border-bottom:1px solid var(--border); }
        .credit-v5-entry-row:last-child { border-bottom:0; }
        .credit-v5-btn { border-color: rgba(168, 85, 247, .45) !important; }
      `;
      document.head.appendChild(style);
    }

    function patchTranslations() {
      if (typeof I18N === 'undefined') return;
      Object.assign(I18N.en, {
        credit: 'Credit',
        creditHours: 'Credit hours',
        fieldServiceHours: 'Field Service Hours',
        addCredit: 'Add credit',
        creditType: 'Credit type',
        creditTotal: 'Credit Total',
        creditBreakdown: 'Credit breakdown',
        activityTag: 'Activity tag',
        btnAdjust: 'Set Total',
        btnAdd: 'Add Time',
        btnDeduct: 'Remove Time',
        btnSetPlan: 'Set Plan',
        btnAddDetailed: 'Add Session',
      });
      Object.assign(I18N.es, {
        credit: 'Crédito',
        creditHours: 'Horas de crédito',
        fieldServiceHours: 'Horas de predicación',
        addCredit: 'Añadir crédito',
        creditType: 'Tipo de crédito',
        creditTotal: 'Total de crédito',
        creditBreakdown: 'Desglose de crédito',
        activityTag: 'Etiqueta de actividad',
        btnAdjust: 'Fijar Total',
        btnAdd: 'Añadir Tiempo',
        btnDeduct: 'Quitar Tiempo',
        btnSetPlan: 'Fijar Plan',
        btnAddDetailed: 'Añadir Sesión',
      });
    }

    function ensureHomeCreditUI() {
      const streakLabel = document.getElementById('lbl_streak');
      const streakValue = document.getElementById('homeStreak');
      if (streakLabel) streakLabel.textContent = t('credit');
      if (streakValue) {
        streakValue.textContent = formatHM(getMonthCredit(monthKey(new Date())));
        streakValue.classList.add('credit-v5-type');
      }
      const streakIcon = streakLabel?.parentElement?.querySelector('i');
      if (streakIcon) streakIcon.className = 'fa-solid fa-hand-holding-heart text-purple text-sm';

      if (!document.getElementById('ringCreditRow')) {
        const yearRow = document.getElementById('ringYearVal')?.closest('.row');
        if (yearRow) {
          const row = document.createElement('div');
          row.id = 'ringCreditRow';
          row.className = 'row gap-3';
          row.innerHTML = `
            <span style="width:10px;height:10px;border-radius:50%;background:var(--purple);flex-shrink:0;"></span>
            <div class="flex-1 min-w-0">
              <div class="text-tiny uppercase tracking-wider text-faint font-semibold">${t('credit')}</div>
              <div class="text-sm font-bold font-mono leading-tight"><span id="ringCreditVal">0:00</span></div>
            </div>`;
          yearRow.insertAdjacentElement('afterend', row);
        }
      }
      const ringCredit = document.getElementById('ringCreditVal');
      if (ringCredit) ringCredit.textContent = formatHM(getMonthCredit(monthKey(new Date())));

      if (!document.getElementById('homeAddCreditBtn')) {
        const quickCustom = document.getElementById('quickAddCustom');
        if (quickCustom && quickCustom.parentElement) {
          const btn = document.createElement('button');
          btn.id = 'homeAddCreditBtn';
          btn.className = 'quick-add-btn credit-v5-btn';
          btn.innerHTML = '<i class="fa-solid fa-hand-holding-heart" style="font-size:12px;color:var(--purple)"></i>';
          btn.title = t('addCredit');
          btn.onclick = () => openCreditEntryModal(todayStr());
          quickCustom.insertAdjacentElement('afterend', btn);
        }
      }
    }

    const originalRenderHome = renderHome;
    renderHome = function () {
      originalRenderHome();
      const today = new Date();
      const mk = monthKey(today);
      const todayMins = getDayMinutes(todayStr());
      const monthMins = getMonthMinutes(mk);
      const syMins = getServiceYearMinutes();
      const dailyGoalMins = Math.round(state.dailyGoalHrs * 60);
      const monthGoalMins = Math.round(state.monthlyGoalHrs * 60);
      const syGoalMins = Math.round(state.annualGoalHrs * 60);

      updateRing('ringDay', 34, dailyGoalMins ? todayMins / dailyGoalMins : 0);
      updateRing('ringMonth', 48, monthGoalMins ? monthMins / monthGoalMins : 0);
      updateRing('ringYear', 62, syGoalMins ? syMins / syGoalMins : 0);
      const rd = document.getElementById('ringDay'); if (rd) rd.setAttribute('stroke', 'var(--accent)');
      const rm = document.getElementById('ringMonth'); if (rm) rm.setAttribute('stroke', 'var(--accent)');
      const ry = document.getElementById('ringYear'); if (ry) ry.setAttribute('stroke', 'var(--accent)');

      document.getElementById('homeTodayHours').textContent = formatHM(todayMins);
      document.getElementById('ringDayVal').textContent = formatHM(todayMins);
      document.getElementById('ringMonthVal').textContent = formatHM(monthMins);
      document.getElementById('ringYearVal').textContent = formatHM(syMins);
      document.getElementById('homeSYHours').textContent = formatHM(syMins);
      const syGoal = Math.round(state.annualGoalHrs * 60);
      const syBar = document.getElementById('homeSYBar');
      if (syBar) syBar.style.width = (syGoal ? Math.min(100, (syMins / syGoal) * 100) : 0) + '%';
      ensureHomeCreditUI();
    };

    const originalRenderCalendar = renderCalendar;
    renderCalendar = function () {
      originalRenderCalendar();
      document.querySelectorAll('[data-cal-day]').forEach(function (cell) {
        const date = cell.dataset.calDay;
        const credit = getCreditMinutesForDate(date);
        cell.querySelectorAll('.credit-v5-line').forEach(x => x.remove());
        if (credit > 0) {
          const div = document.createElement('div');
          div.className = 'credit-v5-line';
          div.textContent = 'C ' + formatHM(credit);
          const target = cell.querySelector('.cal-actual')?.parentElement || cell;
          target.appendChild(div);
        }
      });
      const summary = document.getElementById('calMonthSummary');
      if (summary) {
        const credit = getMonthCredit(currentCalMonth);
        if (credit > 0) summary.textContent += ' · C ' + formatHM(credit);
      }
      if (!document.getElementById('adjBtnCredit')) {
        const detailed = document.getElementById('adjBtnAddDetailed');
        if (detailed && detailed.parentElement) {
          const btn = document.createElement('button');
          btn.id = 'adjBtnCredit';
          btn.className = 'btn btn-secondary text-xs flex-1 credit-v5-btn';
          btn.style.padding = '10px 4px';
          btn.innerHTML = '<i class="fa-solid fa-hand-holding-heart text-purple"></i><span>' + t('addCredit') + '</span>';
          btn.onclick = () => openCreditEntryModal(adjustSelectedDate || todayStr());
          detailed.insertAdjacentElement('afterend', btn);
        }
      }
    };

    const originalRenderReports = renderReports;
    renderReports = function () {
      originalRenderReports();
      const sel = document.getElementById('reportMonth');
      if (sel) {
        const existing = new Set(Array.from(sel.options).map(o => o.value));
        const creditMonths = [...new Set(ensureArray(state.creditEntries).map(e => (e.date || '').slice(0, 7)).filter(Boolean))].sort().reverse();
        creditMonths.forEach(mk => {
          if (existing.has(mk)) return;
          const [y, m] = mk.split('-').map(Number);
          const opt = document.createElement('option');
          opt.value = mk;
          opt.textContent = `${t('months')[m - 1]} ${y}`;
          sel.appendChild(opt);
        });
        sel.value = currentReportMonth;
      }
      const credit = getMonthCredit(currentReportMonth);
      const reportCredit = document.getElementById('reportCredit');
      if (reportCredit) reportCredit.textContent = formatHM(credit);
      renderCreditBreakdownCard();
    };

    function renderCreditBreakdownCard() {
      let card = document.getElementById('creditBreakdownCard');
      if (!card) {
        const catCard = document.getElementById('reportCategories')?.closest('.card');
        if (!catCard) return;
        card = document.createElement('div');
        card.id = 'creditBreakdownCard';
        card.className = 'card credit-v5-card';
        card.style.marginTop = '16px';
        card.innerHTML = `
          <div class="row-between mb-3">
            <div class="text-xs uppercase tracking-wider text-dim font-semibold" id="creditBreakdownTitle">${t('creditBreakdown')}</div>
            <button class="btn btn-secondary text-xs" id="creditBreakdownAdd" style="padding:6px 12px;"><i class="fa-solid fa-plus text-purple"></i><span>${t('addCredit')}</span></button>
          </div>
          <div id="creditBreakdownList" class="stack-3"></div>`;
        catCard.insertAdjacentElement('afterend', card);
      }
      const addBtn = document.getElementById('creditBreakdownAdd');
      if (addBtn) addBtn.onclick = () => openCreditEntryModal((currentReportMonth || monthKey(new Date())) + '-01');
      const list = document.getElementById('creditBreakdownList');
      if (!list) return;
      const breakdown = getCreditBreakdown(currentReportMonth);
      const total = Object.values(breakdown).reduce((a, b) => a + b, 0);
      if (!total) {
        list.innerHTML = `<div class="text-faint text-sm text-center py-4">${t('empty')}</div>`;
        return;
      }
      list.innerHTML = `
        <div class="row-between text-sm mb-1">
          <span class="font-semibold">${t('creditTotal')}</span>
          <span class="font-mono font-bold credit-v5-type">${formatHM(total)}</span>
        </div>` + Object.entries(breakdown).sort((a, b) => b[1] - a[1]).map(([type, mins]) => `
        <div>
          <div class="row-between text-sm mb-1">
            <span class="font-semibold">${escapeHtml(creditLabel(type))}</span>
            <span class="font-mono font-bold">${formatHM(mins)}</span>
          </div>
          <div class="progress-track" style="height:8px;"><div style="width:${total ? (mins / total) * 100 : 0}%;height:100%;background:var(--purple);border-radius:999px;"></div></div>
        </div>`).join('');
    }

    openCreditEditModal = function () {
      openCreditEntryModal((currentReportMonth || monthKey(new Date())) + '-01');
    };

    function openCreditEntryModal(dateStr, editId) {
      const existing = editId ? ensureArray(state.creditEntries).find(e => e.id === editId) : null;
      const date = existing?.date || dateStr || todayStr();
      const minutes = existing?.minutes || 0;
      const type = existing?.type || 'ldc';
      const note = existing?.note || '';
      openModal(`
        <div class="row-between items-center mb-4">
          <div>
            <div class="font-bold text-xl">${existing ? t('edit') : t('addCredit')}</div>
            <div class="text-xs text-faint mt-1">${t('creditHours')}</div>
          </div>
          <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px;height:36px;"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="stack-4">
          <div>
            <div class="text-xs font-bold uppercase text-dim mb-2">${t('dateLabel')}</div>
            <input type="date" id="creditDate" value="${escapeHtml(date)}" />
          </div>
          <div>
            <div class="text-xs font-bold uppercase text-dim mb-2">${t('creditType')}</div>
            <select id="creditType">${CREDIT_TYPES.map(c => `<option value="${c.id}"${c.id === type ? ' selected' : ''}>${escapeHtml(creditLabel(c.id))}</option>`).join('')}</select>
          </div>
          <div class="card-flat duration-tile text-center" id="creditDurationTile">
            <div class="text-tiny uppercase tracking-wider text-dim font-bold">${t('durationLabel')}</div>
            <div id="creditDuration" class="display-num text-3xl font-mono text-purple mt-1">${minutes ? formatHM(minutes) : '0:00'}</div>
            <div class="text-tiny text-faint mt-1">${t('tapToEdit')}</div>
          </div>
          <div>
            <div class="text-xs font-bold uppercase text-dim mb-2">${t('addNote')}</div>
            <textarea id="creditNote" rows="2" maxlength="500">${escapeHtml(note)}</textarea>
          </div>
          <div id="creditMonthList" class="card-flat"></div>
          <div class="row gap-2">
            ${existing ? `<button class="btn btn-coral" id="creditDelete"><i class="fa-solid fa-trash"></i></button>` : ''}
            <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
            <button class="btn btn-primary flex-1" id="creditSave">${t('save')}</button>
          </div>
        </div>`);

      let creditMinutes = minutes;
      function refreshCreditDuration() {
        const el = document.getElementById('creditDuration');
        if (el) el.textContent = formatHM(creditMinutes || 0);
      }
      function refreshMonthList() {
        const wrap = document.getElementById('creditMonthList');
        if (!wrap) return;
        const mk = (document.getElementById('creditDate')?.value || date).slice(0, 7);
        const entries = getCreditEntriesForMonth(mk).sort((a, b) => b.date.localeCompare(a.date));
        if (!entries.length) {
          wrap.innerHTML = `<div class="text-xs text-faint text-center">${t('empty')}</div>`;
          return;
        }
        wrap.innerHTML = entries.map(e => `
          <div class="credit-v5-entry-row">
            <div class="min-w-0">
              <div class="text-sm font-semibold">${escapeHtml(creditLabel(e.type))}</div>
              <div class="text-tiny text-faint">${escapeHtml(e.date)}${e.note ? ' · ' + escapeHtml(e.note) : ''}</div>
            </div>
            <div class="row gap-2 items-center">
              <span class="font-mono font-bold credit-v5-type">${formatHM(e.minutes)}</span>
              <button class="btn btn-secondary btn-icon" style="width:32px;height:32px;" data-credit-edit="${e.id}"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>
            </div>
          </div>`).join('');
        wrap.querySelectorAll('[data-credit-edit]').forEach(btn => btn.onclick = () => openCreditEntryModal(null, btn.dataset.creditEdit));
      }

      document.getElementById('creditDurationTile').onclick = () => {
        openDurationWheel(creditMinutes || 0, (newMin) => {
          creditMinutes = newMin;
          refreshCreditDuration();
        });
      };
      document.getElementById('creditDate').onchange = refreshMonthList;
      document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
      const del = document.getElementById('creditDelete');
      if (del) del.onclick = () => openConfirmModal(t('confirmDelete'), () => {
        deleteCreditEntry(existing.id);
        closeModal();
      }, { confirmLabel: t('delete'), danger: true });
      document.getElementById('creditSave').onclick = () => {
        const saveDate = document.getElementById('creditDate').value;
        const saveType = document.getElementById('creditType').value;
        const saveNote = document.getElementById('creditNote').value.trim();
        if (!saveDate || creditMinutes <= 0) { toast(t('enterTimeRequired')); return; }
        if (existing) {
          existing.date = saveDate;
          existing.minutes = creditMinutes;
          existing.type = saveType;
          existing.note = saveNote;
          saveState();
        } else {
          addCreditEntry(saveDate, creditMinutes, saveType, saveNote);
        }
        vibrate(15); closeModal(); renderAll(); toast(t('save'));
      };
      refreshCreditDuration();
      refreshMonthList();
    }

    const originalBuildReportText = buildReportText;
    buildReportText = function (mk) {
      const [y, m] = mk.split('-').map(Number);
      const monthName = t('months')[m - 1];
      const mins = getMonthMinutes(mk);
      const studies = getMonthStudies(mk);
      const credit = getMonthCredit(mk);
      const serviceDays = getMonthServiceDays(mk);
      const breakdown = getCreditBreakdown(mk);
      const lines = [
        `${t('reportText')} — ${monthName} ${y}`,
        '',
        `${t('fieldServiceHours')}: ${formatHM(mins)}`,
        `${t('creditHours')}: ${formatHM(credit)}`,
      ];
      Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([type, minutes]) => {
        lines.push(`  ${creditLabel(type)}: ${formatHM(minutes)}`);
      });
      lines.push(`${t('studies')}: ${studies}`);
      lines.push(`${t('serviceDays')}: ${serviceDays}`);
      lines.push('');
      lines.push('— ' + new Date().toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
      return lines.join('\n');
    };

    const originalImportJSONFromText = importJSONFromText;
    importJSONFromText = function (text) {
      const ok = originalImportJSONFromText(text);
      if (ok) {
        state.creditSystemVersion = null;
        migrateCreditState();
        renderAll();
      }
      return ok;
    };

    const originalRenderSettings = renderSettings;
    renderSettings = function () {
      originalRenderSettings();
      const info = document.getElementById('setSchemaInfo');
      if (info) info.textContent = `schema v${state.schemaVersion || CREDIT_SCHEMA_VERSION} · credit v5 · SY ${getServiceYearLabel()}`;
    };

    const originalRenderAll = renderAll;
    renderAll = function () {
      originalRenderAll();
      ensureHomeCreditUI();
      const creditAdd = document.getElementById('homeAddCreditBtn');
      if (creditAdd) creditAdd.onclick = () => openCreditEntryModal(todayStr());
    };

    window.KHub.MinistryCredit = {
      creditTypes: CREDIT_TYPES,
      fieldActivityTags: FIELD_ACTIVITY_TAGS,
      getMonthCredit,
      getCreditBreakdown,
      addCreditEntry,
      openCreditEntryModal,
    };

    injectStyles();
    patchTranslations();
    migrateCreditState();
  });
})();