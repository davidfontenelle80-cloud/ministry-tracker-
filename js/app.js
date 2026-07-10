Warning: truncated output (original token count: 79076)
Total output lines: 6135

/**
 * app.js — Ministry Tracker
 * Field service hour tracker for JW congregation. EN/ES bilingual.
 */

/* ===== STATE / CONFIG ===== */
/* Push reminders are delivered by a Cloudflare Worker cron that runs every
   REMINDER_CHECK_MINUTES minutes. A reminder fires at the first cron tick AT
   OR AFTER its scheduled time. If the cron schedule ever changes, this
   constant is the only line to edit. */
const REMINDER_CHECK_MINUTES = 5;

/* Minimum lead time for a reminder: anything closer than one cron interval
   can be missed by the next worker check. Referenced everywhere — a future
   change is this one line. */
const MIN_REMINDER_LEAD_MINUTES = 5;

// Round a chosen reminder time up to the next cron grid mark, with a safety
// buffer: if that mark is less than one full interval away, use the next one
// (the worker may already be mid-run). Past/"now" times are treated as now.
function computeDeliveryTime(reminderTime) {
  const interval = REMINDER_CHECK_MINUTES * 60 * 1000;
  const now = Date.now();
  let t = (reminderTime instanceof Date) ? reminderTime.getTime() : new Date(reminderTime).getTime();
  if (Number.isNaN(t)) return null;
  if (t < now) t = now;
  let fireTime = Math.ceil(t / interval) * interval;
  if (fireTime - now < interval) {
    fireTime += interval;
  }
  return new Date(fireTime);
}

// Display stamp for the delivery hint: time only when it lands on the same
// calendar day as the picked time, date + time otherwise.
function formatDeliveryStamp(d, includeDate) {
  const loc = (state && state.lang === 'es') ? 'es-ES' : 'en-US';
  const timeStr = d.toLocaleTimeString(loc, { hour: 'numeric', minute: '2-digit' });
  if (!includeDate) return timeStr;
  return d.toLocaleDateString(loc, { month: 'short', day: 'numeric' }) + ' ' + timeStr;
}

const APP_CONFIG = {
  storageKey: 'ministry-tracker-v4',
  archivePrefix: 'ministry-tracker-archive-sy-',
  schemaVersion: 5,
  defaults: {
    schemaVersion: 5,
    creditSystemVersion: 1,
    publisherType: 'regular',
    userName: '',
    userNameHintSeen: false,
    annualGoalHrs: 600,
    monthlyGoalHrs: 50,
    dailyGoalHrs: 1.67,
    roundMinutes: 0,
    autoPauseMin: 0,
    confirmClose: true,
    showStreak: true,
    weekStartsMon: true,
    carryOver: true,
    haptics: true,
    backupReminder: true,
    theme: 'auto',
    lang: 'en',
    lastClearedServiceYear: null,
    lastBackupISO: null,
    sessionsSinceLastBackup: 0,
    backupBannerDismissed: false,
    carryOverMin: 0, // deprecated (v64) — kept for backup compatibility, no longer written
    lastMonthProcessed: null,
    rolloverBackfillJun2026Done: false,
    lastUsedCategory: null,
    activeTimer: null,
    sessions: [],
    studiesByDate: {},
    plannedByDate: {},
    creditEntries: [],
    creditByMonth: {},
    categories: [
      { id: 'regular', label_en: 'Door-to-door', label_es: 'Casa en casa' },
      { id: 'publicWit', label_en: 'Public Witnessing', label_es: 'Predicación pública' },
      { id: 'cartWit', label_en: 'Cart Witnessing', label_es: 'Carrito' },
      { id: 'informalWit', label_en: 'Informal Witnessing', label_es: 'Predicación informal' },
      { id: 'specialCampaign', label_en: 'Special Campaign', label_es: 'Campaña especial' },
      { id: 'other', label_en: 'Other Field Service', label_es: 'Otra predicación' },
    ],
        // Stage C — Ministry Notes & Reminders data model
        // Separate from service `categories`. Migration-safe: existing users get [] on first load.
    ministryNoteCategories: [],
    ministryNotes: [],
  },
};

let state = loadState();
let currentScreen = 'home';
let previousScreen = 'home';
let currentTimerDate = todayStr();
let currentCalMonth = monthKey(new Date());
let adjustSelectedDate = todayStr(); // The day shown in the Adjust Time card
let currentReportMonth = monthKey(new Date());
let logFilter = 'month';
let logSearch = ''; // search query for Log notes
let logHistoryMonth = monthKey(new Date()); // month shown in Log History (Reports)
let logHistorySearch = '';
let currentNotesView = 'categories'; // 'categories' | 'notes' | 'all'
let currentNotesCategoryId = null;
let currentNotesSearch = '';
let currentNotesFilter = 'active';
let currentNotesSort = 'updated';
let liveTickInterval = null;
let lastInteraction = Date.now();
let longPressTimer = null;
let pendingStudiesByDate = {};
let pendingCategory = (function() {
  const last = state.lastUsedCategory;
  if (last && state.categories && state.categories.some(c => c.id === last)) return last;
  return (state.categories && state.categories[0]) ? state.categories[0].id : 'regular';
})();

/* ===== LANGUAGE ===== */
const I18N = {
  en: {
    goodMorning: 'Good morning', goodAfternoon: 'Good afternoon', goodEvening: 'Good evening',
    todayProgress: "Today's progress", todayMini: 'today',
    day: 'Day', month: 'Month', year: 'Year',
    quickAdd: 'Quick add minutes', quickAddHint: 'Adds time to today. Use the pen for date, category, studies, or Set total.', thisWeek: 'This week', logged: 'logged',
    serviceYear: 'Service year', projection: 'Projection',
    studies: 'Studies', streak: 'Streak', sessions: 'Sessions', serviceDays: 'Service days',
    readyToStart: 'Ready to start', inService: 'In service',
    start: 'Start', stop: 'Stop', note: 'Note',
    tapChange: 'tap to change', sessionsOnDay: 'Sessions on this day',
    monthlyPlan: 'Monthly plan', tapDayToPlan: 'Tap any day to plan or log',
    plannedTotal: 'Planned', goalTotal: 'Goal', actualHours: 'Actual', plannedHours: 'Planned',
    metGoal: 'Met', missed: 'Missed', hasPlan: 'Has plan', todaysPlan: "Today's plan",
    planPatterns: 'Plan patterns',
    planPatternMissed: 'You\'ve missed plans on {day} {count} of the last 8 weeks.',
    planPatternMissedShort: '{day}: {count} missed',
    todayPlanTitle: "Today's plan",
    todayPlanInProgress: 'In progress', todayPlanComplete: 'Complete', todayPlanOver: 'Over plan',
    todayPlanRemaining: 'remaining', todayPlanDone: 'done',
    calTapHint: 'Tap a day to plan or log',
    all: 'All', thisMonth: 'This month', today: 'Today', empty: 'No sessions yet',
    searchEmpty: 'No sessions with notes matching "{q}"',
    searchPlaceholder: 'Search notes...',
    monthlyReport: 'Monthly report', hours: 'Field Service Hours', credit: 'Credit',
    share: 'Share', avgMonth: 'Avg / month', byCategory: 'By category', tapEdit: 'tap to edit',
    profile: 'Profile', publisherType: 'Publisher type',
    userNameLabel: 'Your name', userNamePlaceholder: 'Optional', userNameNew: 'New',
    pub: 'Publisher', aux: 'Auxiliary Pioneer', regular: 'Regular Pioneer', special: 'Special Pioneer',
    annual: 'Annual', monthly: 'Monthly', daily: 'Daily',
    categories: 'Categories', addCat: 'Add', catHint: 'Customize tags for sessions (e.g. "Conducting", "Cart")',
    appearance: 'Appearance', theme: 'Theme', dark: 'Dark', light: 'Light', auto: 'Auto', language: 'Language',
    preferences: 'Preferences',
    confirmClose: 'Confirm before closing timer',
    showStreak: 'Show streak counter',
    weekStartsMon: 'Week starts Monday',
    carryOver: 'Carry over partial minutes',
    rolloverLabel: 'Rollover',
    haptics: 'Haptic feedback',
    backupReminder: 'Monthly backup reminder',
    roundMins: 'Round minutes', roundOff: 'Off (exact)',
    autoPause: 'Auto-pause (min idle, 0 = off)',
    data: 'Data', exportBtn: 'Export Backup', backupBtn: 'Backup',
    cloudSaveBtn: 'Cloud Save', cloudRestoreBtn: 'Cloud Restore', cloudHeader: 'Cloud',
    pastSY: 'Past service years', pastSYNone: 'No past years archived yet.',
    pastSYHours: 'hours', pastSYStudies: 'studies', pastSYDays: 'days', pastSYArchived: 'archived',
    importBtn: 'Import from File', pasteImportBtn: 'Paste backup text',
    clearMonth: 'Clear current month', clearAll: 'Clear all data',
    nav_home: 'Home', nav_timer: 'Timer', nav_cal: 'Calendar', nav_log: 'Log', nav_notes: 'Notes & Reminders', nav_reports: 'Reports', nav_settings: 'Settings',
    logHistory: 'Log History',
    weekdaysSun: ['S','M','T','W','T','F','S'],
    weekdaysMon: ['M','T','W','T','F','S','S'],
    weekdaysShortSun: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    weekdaysShortMon: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    monthsShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    cancel: 'Cancel', save: 'Save', delete: 'Delete', edit: 'Edit', set: 'Set',
    importLabel: 'Import', copyAll: 'Copy all', done: 'Done',
    confirmDelete: 'Delete this session?',
    confirmClearMonth: 'Clear all data for this month?',
    confirmClearAll: 'Erase ALL data including archived years? Cannot be undone.',
    timerRunning: 'Timer is running',
    keepRunning: 'Keep running', saveStop: 'Save & stop', discard: 'Discard',
    pickStart: 'Start time', pickStop: 'Stop time',
    quickAddSession: 'Quick add session', addStudies: 'Studies conducted',
    saveStudyOnly: 'Save study only',
    studiesHintReady: 'Tap + before Start, or save a study only',
    studiesHintActive: 'Tap + during the session',
    studiesOptional: 'Optional, leave 0 if none',
    noteOptionalPlaceholder: 'Optional note (Bible study, return visit, etc.)',
    addNote: 'Note (optional)', selectCategory: 'Category',
    durationLabel: 'Duration',
    reportText: 'Field Service Report',
    onPace: 'On pace', behind: 'Behind pace',
    importSuccess: 'Backup imported', invalidJson: 'Not a valid backup',
    exported: 'Backup ready', cleared: 'Cleared',
    serviceYearReset: 'New service year started',
    addedMin: 'min added', studyAdded: 'Study added', copied: 'Copied',
    forgotYesterday: 'Log yesterday →', needToHitWeek: 'to hit week',
    needToHitMonth: 'to hit month', backupOverdue: 'Backup recommended',
    setPlanned: 'Plan hours', clearPlan: 'Clear plan', planForDay: 'Plan for this day',
    remaining: 'left', over: 'over', noPlan: 'No plan',
    dayOptions: 'Day options', logTime: 'Log time',
    startTimerHere: 'Start timer for this day',
    pasteImportTitle: 'Paste backup',
    pasteImportHint: 'Paste the JSON below and tap Import.',
    importHint: 'Choose how to bring in your backup.',
    backupTitle: 'Backup & Restore',
    backupNever: 'Never backed up. Export now to be safe.',
    backupRecent: 'Last backup',
    backupOld: 'Backup is over 30 days old',
    backupReminderTitle: 'Time to back up your data',
    backupLastLabel: 'Last backup',
    daysAgoLabel: 'days ago',
    newSessionsSinceBackup: 'new sessions logged since then',
    backupWhyText: 'Your data is saved on this phone, but if Safari clears site data or your phone needs replacing, you could lose everything. A backup file gives you a safety net.',
    backupNowBtn: 'Back up now',
    backupSkipBtn: 'Skip for now',
    backupSkipHint: 'You\'ll see a banner at the top until you back up',
    urgentLabel: 'OVERDUE',
    backupOverdueShort: 'Backup overdue',
    daysShort: 'd',
    newShort: 'new',
    backupBtnShort: 'Back up',
    durTargetHint: 'Which time should change to match the new duration?',
    durTargetStart: 'Move start time (keep stop time)',
    durTargetStop: 'Move stop time (keep start time)',
    wheelHint: 'Scroll to choose hours and minutes',
    keypadHint: 'Tap a chip, or type as H:MM (e.g. 230 = 2:30)',
    keypadClear: 'Clear',
    hoursLabel: 'Hours',
    minutesLabel: 'Minutes',
    tapToEdit: 'tap to enter time',
    totalHoursFor: 'Total hours for',
    btnAdjust: 'Adjust',
    btnAdd: 'Add',
    btnDeduct: 'Deduct',
    btnSetPlan: 'Set plan',
    btnAddDetailed: 'Add session',
    sessionsThisDay: 'Sessions this day',
    dateLabel: 'Date',
    alreadyLogged: 'Already logged this day',
    viewEditSessions: 'View / edit sessions →',
    actionLabel: 'Action',
    addToTotal: 'Add to total',
    setTotal: 'Set total',
    addAmount: 'Time to add',
    addAmountHelp: 'Adds this much time on top of the day total.',
    newTotal: 'Set day total to',
    setTotalHelp: 'Sets the final total for this day. The app adds only the difference.',
    newTotalAfter: 'New total after save',
    nothingToAdd: 'Nothing to add',
    enterTimeRequired: 'Enter an amount of time before using this feature.',
    setLowerTitle: 'Total is already higher',
    setLowerMsg: 'This day already has {cur} logged. You can\'t set the total to {target} without editing existing sessions.',
    openSessionsBtn: 'Open sessions for this day',
    adjustAdd: 'Add to timer',
    adjustSub: 'Subtract from timer',
    timerAdjustHint: 'Tap +/− to adjust, or tap the time to set directly',
    monthlyTargetTitle: 'Monthly target',
    perMonthLabel: 'per month to hit goal',
    aheadByLabel: 'Ahead by',
    behindByLabel: 'Behind by',
    rightOnPace: 'Right on pace',
    monthsRemainingLabel: 'months remaining',
    needThisMonth: 'Need this month',
    addTimeWarn: 'The stopwatch is already running for today. Add this time on top of the running session?',
    addAnyway: 'Yes, add it',
    exportTitle: 'Export your backup',
    exportHint: 'On iPhone Safari, file downloads can be unreliable. Use whichever option works:',
    backupShareTitle: 'Backup & Share',
    backupShareHint: 'Save your data as a file, restore from a backup, or share a quick note.',
    saveToFile: 'Save to file',
    importFile: 'Import file',
    shareNote: 'Share note',
    importConfirmMsg: 'Importing will replace your current data. Continue?',
    rawJsonLabel: 'Raw JSON',
    shareReportTitle: 'Share monthly report',
    shareReportHint: 'Copy puts the text on your clipboard. Send opens the share sheet (Messages, Mail, etc.).',
    shareReportSend: 'Send to app',
    exportShareSheet: 'Share file (Notes, Files, Mail…)',
    exportDownload: 'Download file',
    exportCopy: 'Copy text to clipboard',
    exportClose: 'Close',
    lastBackup: 'Last backup',
    never: 'never',
    editCredit: 'Edit credit hours',
    creditDesc: 'Approved theocratic activities (LDC, Bethel, Pioneer School). Tracked separately from field service totals.',
    creditHours: 'Credit hours',
    catNameLabel: 'Name (English)',
    catNameLabelEs: 'Name (Spanish)',
    catDeleteWarn: 'Delete category? Existing sessions keep their tag but won\'t be selectable.',
    cantDeleteLast: 'Need at least one category',
    invalidName: 'Name required',
    confirm: 'Confirm',
    // Stage D — Ministry Note Categories
    notesTitle: 'Notes & Reminders',
    notesCategoriesHint: 'Organize your ministry notes by category.',
    notesComingSoon: 'Notes are coming in a future update.',
    addCategory: 'Add Category',
    editCategory: 'Edit Category',
    deleteCategory: 'Delete Category',
    categoryName: 'Category name',
    categoryIcon: 'Icon (emoji)',
    categoryColor: 'Color',
    categoryCount: '{n} categories',
    noCategories: 'No categories yet. Add your first one.',
    confirmDeleteCat: 'Delete this category?',
    catModalNameEsHint: '(same as above — bilingual editing coming in Stage G)',
    notesBackBtn: '← Back',
    mnAddNote: '+ Add Note',
    editNote: 'Edit Note',
    deleteNote: 'Delete Note',
    noteTitle: 'Title',
    noteBody: 'Note content',
    noteTitlePlaceholder: 'Note title',
    noteBodyPlaceholder: 'Note content...',
    noNotesInCategory: 'No notes yet. Tap + Add Note to get started.',
    allNotes: 'All Notes',
    notesSearchPlaceholder: 'Search notes...',
    notesFilterActive: 'Active',
    notesFilterAll: 'All',
    notesFilterCompleted: 'Completed',
    notesFilterArchived: 'Archived',
    notesFilterOpen: 'Open',
    notesFilterInProgress: 'In progress',
    notesFilterDone: 'Done',
    notesSortUpdated: 'Newest',
    notesSortDue: 'Due date',
    notesSortPriority: 'Priority',
    notesSortTitle: 'Title',
    noNotesFound: 'No notes match your search or filter.',
    noNotesSearch: 'No matching notes. Try another search or filter.',
    notesEmptyTitle: 'No notes here yet',
    notesEmptyHint: 'Add a note for a return visit, appointment, territory detail, or personal reminder.',
    noteUntitled: 'Untitled note',
    noteNoBody: 'No note details yet.',
    noteNoCategory: 'No category',
    noteReminderOn: 'Reminder on',
    noteDueBadge: 'Due',
    keepNotesNoCategory: 'Keep notes in All Notes',
    deleteCategoryAndNotes: 'Delete category and notes',
    confirmDeleteCatWithNotes: 'This category has {n} notes. What should happen to them?',
    categoryIconSelected: 'Selected icon',
    categoryIconCustom: 'Custom emoji',
    testPush: 'Test Push',
    pushNotReady: 'Push is not ready yet.',
    pushTestSent: 'Test push sent.',
    pushTestFailed: 'Test push failed.',
    reminderSyncStarted: 'Reminder sync started.',
    reminderScheduled: 'Recordatorio programado',
    reminderSyncSaved: 'Recordatorio guardado',
    reminderSyncFailed: 'Error al sincronizar recordatorio',
    reminderSyncSkipped: 'Sincronización omitida',
    notifDenied: 'Notifications disabled. Enable in device Settings.',
    notifUnsupported: 'Notifications not supported on this device',
    noNotifLabel: 'Due date only — no notification',
    confirmDeleteNote: 'Delete this note?',
        noteDueDate: 'Due date',
    noteDueTime: 'Due time',
    noteReminder: 'Reminder',
    deliversAround: 'Delivers around {time}',
    reminderLeadError: 'Pick a time at least {min} minutes from now so the reminder can be delivered.',
    setForDelivers: 'Set for {picked} \u2014 delivers around {time}',
    notePriority: 'Priority',
    noteStatus: 'Status',
    noteCompleted: 'Completed',
    noteArchived: 'Archived',
    noteCategory: 'Category',
    priorityHigh: 'High',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    statusOpen: 'Open',
    statusInProgress: 'In Progress',
    statusDone: 'Done',
    calNotesForDay: 'Notes for this day',
    calNoNotesForDay: 'No notes for this day.',
    calAddNote: '+ Add Note',
  },
  es: {
    goodMorning: 'Buenos días', goodAfternoon: 'Buenas tardes', goodEvening: 'Buenas noches',
    todayProgress: 'Progreso de hoy', todayMini: 'hoy',
    day: 'Día', month: 'Mes', year: 'Año',
    quickAdd: 'Añadir minutos', quickAddHint: 'Añade tiempo a hoy. Usa el lápiz para fecha, categoría, cursos o fijar total.', thisWeek: 'Esta semana', logged: 'registrado',
    serviceYear: 'Año de servicio', projection: 'Proyección',
    studies: 'Cursos', streak: 'Racha', sessions: 'Sesiones', serviceDays: 'Días de servicio',
    readyToStart: 'Listo para empezar', inService: 'En servicio',
    start: 'Inicio', stop: 'Parar', note: 'Nota',
    tapChange: 'toca para cambiar', sessionsOnDay: 'Sesiones de este día',
    monthlyPlan: 'Plan mensual', tapDayToPlan: 'Toca un día para planear o registrar',
    plannedTotal: 'Planeado', goalTotal: 'Meta', actualHours: 'Real', plannedHours: 'Planeado',
    metGoal: 'Cumplido', missed: 'No cumplido', hasPlan: 'Con plan', todaysPlan: 'Plan de hoy',
    planPatterns: 'Patrones del plan',
    planPatternMissed: 'No cumpliste tu plan los {day} en {count} de las últimas 8 semanas.',
    planPatternMissedShort: '{day}: {count} fallidos',
    todayPlanTitle: 'Plan de hoy',
    todayPlanInProgress: 'En progreso', todayPlanComplete: 'Completo', todayPlanOver: 'Sobre plan',
    todayPlanRemaining: 'restante', todayPlanDone: 'hecho',
    calTapHint: 'Toca un día para planear o registrar',
    all: 'Todo', thisMonth: 'Este mes', today: 'Hoy', empty: 'Sin sesiones aún',
    searchEmpty: 'No hay sesiones con notas que coincidan con "{q}"',
    searchPlaceholder: 'Buscar notas...',
    monthlyReport: 'Informe mensual', hours: 'Horas de predicación', credit: 'Crédito',
    share: 'Compartir', avgMonth: 'Promedio / mes', byCategory: 'Por categoría', tapEdit: 'toca para editar',
    profile: 'Perfil', publisherType: 'Tipo de publicador',
    userNameLabel: 'Tu nombre', userNamePlaceholder: 'Opcional', userNameNew: 'Nuevo',
    pub: 'Publicador', aux: 'Precursor Auxiliar', regular: 'Precursor Regular', special: 'Precursor Especial',
    annual: 'Anual', monthly: 'Mensual', daily: 'Diario',
    categories: 'Categorías', addCat: 'Añadir', catHint: 'Personaliza etiquetas para sesiones (ej. "Conducir", "Carrito")',
    appearance: 'Apariencia', theme: 'Tema', dark: 'Oscuro', light: 'Claro', auto: 'Auto', language: 'Idioma',
    preferences: 'Preferencias',
    confirmClose: 'Confirmar al detener el cronómetro',
    showStreak: 'Mostrar contador de racha',
    weekStartsMon: 'Semana empieza lunes',
    carryOver: 'Trasladar minutos parciales',
    rolloverLabel: 'Traslado',
    haptics: 'Vibración táctil',
    backupReminder: 'Recordatorio mensual de respaldo',
    roundMins: 'Redondear minutos', roundOff: 'Exacto',
    autoPause: 'Pausa automática (min inactivo, 0 = apagado)',
    data: 'Datos', exportBtn: 'Exportar respaldo', backupBtn: 'Respaldo',
    cloudSaveBtn: 'Guardar en la nube', cloudRestoreBtn: 'Restaurar desde la nube', cloudHeader: 'Nube',
    pastSY: 'Años de servicio anteriores', pastSYNone: 'Aún no hay años archivados.',
    pastSYHours: 'horas', pastSYStudies: 'cursos', pastSYDays: 'días', pastSYArchived: 'archivado',
    importBtn: 'Importar desde archivo', pasteImportBtn: 'Pegar texto de respaldo',
    clearMonth: 'Borrar mes actual', clearAll: 'Borrar todos los datos',
    nav_home: 'Inicio', nav_timer: 'Cronómetro', nav_cal: 'Calendario', nav_log: 'Registro', nav_notes: 'Notas y Recordatorios', nav_reports: 'Informes', nav_settings: 'Ajustes',
    logHistory: 'Historial de Registro',
    weekdaysSun: ['D','L','M','M','J','V','S'],
    weekdaysMon: ['L','M','M','J','V','S','D'],
    weekdaysShortSun: ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'],
    weekdaysShortMon: ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'],
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    monthsShort: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'],
    cancel: 'Cancelar', save: 'Guardar', delete: 'Eliminar', edit: 'Editar', set: 'Establecer',
    importLabel: 'Importar', copyAll: 'Copiar todo', done: 'Listo',
    confirmDelete: '¿Eliminar esta sesión?',
    confirmClearMonth: '¿Borrar todos los datos de este mes?',
    confirmClearAll: '¿Borrar TODOS los datos incluyendo años archivados? No se puede deshacer.',
    timerRunning: 'El cronómetro está activo',
    keepRunning: 'Seguir', saveStop: 'Guardar y detener', discard: 'Descartar',
    pickStart: 'Hora de inicio', pickStop: 'Hora de fin',
    quickAddSession: 'Añadir sesión rápida', addStudies: 'Cursos realizados',
    saveStudyOnly: 'Guardar solo curso',
    studiesHintReady: 'Toca + antes de iniciar, o guarda solo un curso',
    studiesHintActive: 'Toca + durante la sesión',
    studiesOptional: 'Opcional, deja 0 si no hay',
    noteOptionalPlaceholder: 'Nota opcional (curso bíblico, revisita, etc.)',
    addNote: 'Nota (opcional)', selectCategory: 'Categoría',
    durationLabel: 'Duración',
    reportText: 'Informe de Servicio del Campo',
    onPace: 'En ritmo', behind: 'Retrasado',
    importSuccess: 'Respaldo importado', invalidJson: 'Respaldo no válido',
    exported: 'Respaldo listo', cleared: 'Borrado',
    serviceYearReset: 'Nuevo año de servicio',
    addedMin: 'min añadidos', studyAdded: 'Curso añadido', copied: 'Copiado',
    forgotYesterday: 'Registrar ayer →', needToHitWeek: 'para meta semanal',
    needToHitMonth: 'para meta mensual', backupOverdue: 'Se recomienda respaldo',
    setPlanned: 'Planear horas', clearPlan: 'Quitar plan', planForDay: 'Plan para este día',
    remaining: 'restante', over: 'extra', noPlan: 'Sin plan',
    dayOptions: 'Opciones del día', logTime: 'Registrar tiempo',
    startTimerHere: 'Iniciar cronómetro este día',
    pasteImportTitle: 'Pegar respaldo',
    pasteImportHint: 'Pega el JSON abajo y toca Importar.',
    importHint: 'Elige cómo importar tu respaldo.',
    backupTitle: 'Respaldo y restauración',
    backupNever: 'Sin respaldo aún. Exporta ahora para estar seguro.',
    backupRecent: 'Último respaldo',
    backupOld: 'El respaldo tiene más de 30 días',
    backupReminderTitle: 'Hora de respaldar tus datos',
    backupLastLabel: 'Último respaldo',
    daysAgoLabel: 'días',
    newSessionsSinceBackup: 'sesiones nuevas desde entonces',
    backupWhyText: 'Tus datos se guardan en este teléfono, pero si Safari borra los datos del sitio o necesitas cambiar de teléfono, podrías perder todo. Un archivo de respaldo es tu red de seguridad.',
    backupNowBtn: 'Respaldar ahora',
    backupSkipBtn: 'Omitir por ahora',
    backupSkipHint: 'Verás una alerta arriba hasta que respaldes',
    urgentLabel: 'URGENTE',
    backupOverdueShort: 'Respaldo pendiente',
    daysShort: 'd',
    newShort: 'nuevas',
    backupBtnShort: 'Respaldar',
    durTargetHint: '¿Qué hora se debe ajustar para igualar la nueva duración?',
    durTargetStart: 'Mover hora de inicio (mantener fin)',
    durTargetStop: 'Mover hora de fin (mantener inicio)',
    wheelHint: 'Desliza para elegir horas y minutos',
    keypadHint: 'Toca un chip o escribe H:MM (ej. 230 = 2:30)',
    keypadClear: 'Borrar',
    hoursLabel: 'Horas',
    minutesLabel: 'Minutos',
    tapToEdit: 'toca para ingresar tiempo',
    totalHoursFor: 'Horas totales del',
    btnAdjust: 'Ajustar',
    btnAdd: 'Añadir',
    btnDeduct: 'Restar',
    btnSetPlan: 'Plan',
    btnAddDetailed: 'Añadir sesión',
    sessionsThisDay: 'Sesiones de este día',
    dateLabel: 'Fecha',
    alreadyLogged: 'Ya registrado ese día',
    viewEditSessions: 'Ver / editar sesiones →',
    actionLabel: 'Acción',
    addToTotal: 'Añadir al total',
    setTotal: 'Establecer total',
    addAmount: 'Tiempo a añadir',
    addAmountHelp: 'Añade este tiempo encima del total del día.',
    newTotal: 'Fijar total del día en',
    setTotalHelp: 'Fija el total final de este día. La app añade solo la diferencia.',
    newTotalAfter: 'Nuevo total tras guardar',
    nothingToAdd: 'Nada para añadir',
    enterTimeRequired: 'Ingresa una cantidad de tiempo antes de usar esta funcion.',
    setLowerTitle: 'El total ya es más alto',
    setLowerMsg: 'Este día ya tiene {cur} registrado. No puedes establecer el total en {target} sin editar las sesiones existentes.',
    openSessionsBtn: 'Abrir sesiones de este día',
    adjustAdd: 'Añadir al cronómetro',
    adjustSub: 'Restar del cronómetro',
    timerAdjustHint: 'Toca +/− para ajustar, o toca el tiempo para fijarlo',
    monthlyTargetTitle: 'Meta mensual',
    perMonthLabel: 'al mes para cumplir',
    aheadByLabel: 'Adelantado',
    behindByLabel: 'Atrasado',
    rightOnPace: 'Justo a ritmo',
    monthsRemainingLabel: 'meses restantes',
    needThisMonth: 'Necesitas este mes',
    addTimeWarn: 'El cronómetro ya está corriendo para hoy. ¿Añadir este tiempo encima de la sesión activa?',
    addAnyway: 'Sí, añadir',
    exportTitle: 'Exportar respaldo',
    exportHint: 'En iPhone Safari, las descargas pueden fallar. Usa la opción que funcione:',
    backupShareTitle: 'Respaldo y compartir',
    backupShareHint: 'Guarda tus datos como archivo, restaura desde un respaldo, o comparte una nota rápida.',
    saveToFile: 'Guardar archivo',
    importFile: 'Importar archivo',
    shareNote: 'Compartir nota',
    importConfirmMsg: 'Importar reemplazará tus datos actuales. ¿Continuar?',
    rawJsonLabel: 'JSON crudo',
    shareReportTitle: 'Compartir reporte mensual',
    shareReportHint: 'Copiar lo guarda al portapapeles. Enviar abre el menú de compartir (Mensajes, Correo, etc.).',
    shareReportSend: 'Enviar a app',
    exportShareSheet: 'Compartir archivo (Notas, Archivos, Correo…)',
    exportDownload: 'Descargar archivo',
    exportCopy: 'Copiar texto al portapapeles',
    exportClose: 'Cerrar',
    lastBackup: 'Último respaldo',
    never: 'nunca',
    editCredit: 'Editar horas de crédito',
    creditDesc: 'Actividades teocráticas aprobadas (LDC, Betel, Escuela). Se registran aparte de la predicación.',
    creditHours: 'Horas de crédito',
    catNameLabel: 'Nombre (Inglés)',
    catNameLabelEs: 'Nombre (Español)',
    catDeleteWarn: '¿Eliminar categoría? Las sesiones existentes mantienen su etiqueta.',
    cantDeleteLast: 'Necesitas al menos una categoría',
    invalidName: 'Nombre requerido',
    confirm: 'Confirmar',
    // Stage D — Ministry Note Categories
    notesTitle: 'Notas y Recordatorios',
    notesCategoriesHint: 'Organiza tus notas del ministerio por categoría.',
    notesComingSoon: 'Las notas llegarán en una próxima actualización.',
    addCategory: 'Agregar categoría',
    editCategory: 'Editar categoría',
    deleteCategory: 'Eliminar categoría',
    categoryName: 'Nombre de la categoría',
    categoryIcon: 'Ícono (emoji)',
    categoryColor: 'Color',
    categoryCount: '{n} categorías',
    noCategories: 'Sin categorías. Agrega la primera.',
    confirmDeleteCat: '¿Eliminar esta categoría?',
    catModalNameEsHint: '(mismo que arriba — edición bilingüe llega en la Etapa G)',
    notesBackBtn: '← Atrás',
    mnAddNote: '+ Agregar nota',
    editNote: 'Editar nota',
    deleteNote: 'Eliminar nota',
    noteTitle: 'Título',
    noteBody: 'Contenido',
    noteTitlePlaceholder: 'Título de la nota',
    noteBodyPlaceholder: 'Contenido de la nota...',
    noNotesInCategory: 'Sin notas aún. Toca + Agregar nota para comenzar.',
    confirmDeleteNote: '¿Eliminar esta nota?',
        noteDueDate: 'Fecha límite',
    noteDueTime: 'Hora límite',
    noteReminder: 'Recordatorio',
    deliversAround: 'Se entrega alrededor de las {time}',
    reminderLeadError: 'Elige una hora al menos {min} minutos despu\u00e9s de ahora para que el recordatorio pueda entregarse.',
    setForDelivers: 'Programado para las {picked} \u2014 se entrega alrededor de las {time}',
    notePriority: 'Prioridad',
    noteStatus: 'Estado',
    noteCompleted: 'Completado',
    noteArchived: 'Archivado',
    noteCategory: 'Categoría',
    priorityHigh: 'Alto',
    priorityMedium: 'Medio',
    priorityLow: 'Bajo',
    statusOpen: 'Abierto',
    statusInProgress: 'En progreso',
    statusDone: 'Hecho',
    calNotesForDay: 'Notas de este día',
    calNoNotesForDay: 'Sin notas para este día.',
    calAddNote: '+ Agregar nota',
  },
};

const DEFAULT_MINISTRY_NOTE_CATEGORIES = [
  { id: 'mnc-1', name: { en: 'Return Visits',     es: 'Revisitas' },             icon: '🔄', color: '#6366f1' },
  { id: 'mnc-2', name: { en: 'Bible Studies',      es: 'Estudios bíblicos' },    icon: '📖', color: '#10b981' },
  { id: 'mnc-3', name: { en: 'Interested Persons', es: 'Personas interesadas' }, icon: '👤', color: '#f59e0b' },
  { id: 'mnc-4', name: { en: 'Calls',              es: 'Llamadas' },             icon: '📞', color: '#3b82f6' },
  { id: 'mnc-5', name: { en: 'Messages',           es: 'Mensajes' },             icon: '💬', color: '#8b5cf6' },
  { id: 'mnc-6', name: { en: 'Territory',          es: 'Territorio' },           icon: '🗺️', color: '#ec4899' },
  { id: 'mnc-7', name: { en: 'Appointments',       es: 'Citas' },                icon: '📅', color: '#14b8a6' },
  { id: 'mnc-8', name: { en: 'Personal',           es: 'Personal' },             icon: '🙏', color: '#f97316' },
];

const CAT_PRESET_COLORS = [
  '#6366f1', '#10b981', '#f59e0b', '#3b82f6',
  '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#ef4444', '#64748b',
];

const CAT_PRESET_ICONS = [
  '\uD83D\uDD04', '\uD83D\uDCD6', '\uD83D\uDC64', '\u260E\uFE0F',
  '\uD83D\uDCAC', '\uD83D\uDDFA\uFE0F', '\uD83D\uDCC5', '\uD83D\uDE4F',
  '\uD83D\uDCDD', '\uD83C\uDFE0', '\uD83D\uDCCD', '\u2B50'
];

const I18N_FALLBACKS = {
  en: {},
  es: {
    allNotes: 'Todas las notas',
    notesSearchPlaceholder: 'Buscar notas...',
    notesFilterActive: 'Activas',
    notesFilterAll: 'Todas',
    notesFilterCompleted: 'Completadas',
    notesFilterArchived: 'Archivadas',
    notesFilterOpen: 'Abiertas',
    notesFilterInProgress: 'En progreso',
    notesFilterDone: 'Hechas',
    notesSortUpdated: 'Mas recientes',
    notesSortDue: 'Fecha limite',
    notesSortPriority: 'Prioridad',
    notesSortTitle: 'Titulo',
    noNotesFound: 'No hay notas que coincidan con la busqueda o el filtro.',
    noNotesSearch: 'No hay notas que coincidan. Prueba otra busqueda o filtro.',
    notesEmptyTitle: 'Aun no hay notas aqui',
    notesEmptyHint: 'Agrega una nota para una revisita, cita, territorio o recordatorio personal.',
    noteUntitled: 'Nota sin titulo',
    noteNoBody: 'Sin detalles todavia.',
    noteNoCategory: 'Sin categoria',
    noteReminderOn: 'Recordatorio activo',
    noteDueBadge: 'Fecha',
    keepNotesNoCategory: 'Conservar notas en Todas',
    deleteCategoryAndNotes: 'Eliminar categoria y notas',
    confirmDeleteCatWithNotes: 'Esta categoria tiene {n} notas. Que debe pasar con ellas?',
    categoryIconSelected: 'Icono seleccionado',
    categoryIconCustom: 'Emoji personalizado',
    testPush: 'Probar push',
    pushNotReady: 'Push aun no esta listo.',
    pushTestSent: 'Prueba push enviada.',
    pushTestFailed: 'Fallo la prueba push.',
    reminderSyncStarted: 'Sincronizando recordatorio.',
    reminderScheduled: 'Recordatorio programado',
    reminderSyncSaved: 'Recordatorio guardado',
    reminderSyncFailed: 'Error al sincronizar recordatorio',
    reminderSyncSkipped: 'Sincronización omitida',
    notifDenied: 'Notificaciones desactivadas. Actiévalas en Configuración.',
    notifUnsupported: 'Notificaciones no disponibles en este dispositivo',
    noNotifLabel: 'Solo fecha de vencimiento — sin notificación',
  },
};

function t(k) {
  const lang = state.lang || 'en';
  return (I18N[lang] || I18N.en)[k] ?? (I18N_FALLBACKS[lang] || {})[k] ?? I18N.en[k] ?? k;
}

function ministryCategoryName(cat) {
  if (!cat) return '';
  const lang = state.lang || 'en';
  if (cat.name && typeof cat.name === 'object') return cat.name[lang] || cat.name.en || cat.name.es || '';
  return cat.name || '';
}

function ministryNoteDefaultCategoryId() {
  return currentNotesCategoryId || ((state.ministryNoteCategories || [])[0] || {}).id || '';
}

function ministryNoteMatchesSearch(note) {
  const q = (currentNotesSearch || '').trim().toLowerCase();
  if (!q) return true;
  return String(note.title || '').toLowerCase().includes(q) ||
    String(note.body || '').toLowerCase().includes(q) ||
    String(ministryCategoryName(ministryNoteCategory(note.categoryId)) || '').toLowerCase().includes(q);
}

function ministryNoteMatchesFilter(note) {
  if (currentNotesFilter === 'all') return true;
  if (currentNotesFilter === 'completed') return !!note.completed || note.status === 'done';
  if (currentNotesFilter === 'archived') return !!note.archived;
  if (currentNotesFilter === 'open') return !note.archived && !note.completed && (!note.status || note.status === 'open');
  if (currentNotesFilter === 'in-progress') return !note.archived && !note.completed && note.status === 'in-progress';
  if (currentNotesFilter === 'done') return !!note.completed || note.status === 'done';
  return !note.completed && !note.archived && note.status !== 'done';
}

function ministryNoteCategory(catId) {
  return (state.ministryNoteCategories || []).find(function(c) { return c.id === catId; }) || null;
}

function ministryNotePrimaryDate(note) {
  if (!note) return '';
  if (note.dueDate) return note.dueDate;
  if (!note.createdAt) return '';
  const d = new Date(note.createdAt);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function ministryNoteOccursOnDate(note, dateStr) {
  if (!note || !dateStr) return false;
  return note.dueDate === dateStr || ministryNotePrimaryDate(note) === dateStr;
}

function ministryNoteDateLabel(dateStr) {
  if (!dateStr) return '';
  const parts = String(dateStr).split('-').map(Number);
  if (parts.length !== 3) return dateStr;
  return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric' });
}

function ministryNoteTimeLabel(timeStr) {
  if (!timeStr) return '';
  const parts = String(timeStr).split(':').map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return timeStr;
  return new Date(2000, 0, 1, parts[0], parts[1]).toLocaleTimeString(state.lang === 'es' ? 'es-ES' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function ministryNoteDueLabel(note) {
  if (!note || !note.dueDate) return '';
  const parts = [ministryNoteDateLabel(note.dueDate)];
  if (note.dueTime) parts.push(ministryNoteTimeLabel(note.dueTime));
  return parts.filter(Boolean).join(' • ');
}

function ministryNoteStatusLabel(note) {
  if (!note) return '';
  if (note.archived) return t('notesFilterArchived');
  if (note.completed || note.status === 'done') return t('notesFilterDone');
  if (note.status === 'in-progress') return t('statusInProgress');
  if (note.status === 'open') return t('statusOpen');
  return '';
}

function ministryNotePriorityRank(note) {
  const rank = { high: 0, medium: 1, low: 2 };
  return Object.prototype.hasOwnProperty.call(rank, note && note.priority) ? rank[note.priority] : 3;
}

function sortMinistryNotes(notes) {
  const arr = (notes || []).slice();
  if (currentNotesSort === 'due') {
    arr.sort(function(a, b) {
      const ad = a.dueDate || '9999-12-31';
      const bd = b.dueDate || '9999-12-31';
      if (ad !== bd) return ad.localeCompare(bd);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return arr;
  }
  if (currentNotesSort === 'priority') {
    arr.sort(function(a, b) {
      const pr = ministryNotePriorityRank(a) - ministryNotePriorityRank(b);
      return pr || ((b.updatedAt || 0) - (a.updatedAt || 0));
    });
    return arr;
  }
  if (currentNotesSort === 'title') {
    arr.sort(function(a, b) {
      return String(a.title || '').localeCompare(String(b.title || ''), state.lang === 'es' ? 'es' : 'en') || ((b.updatedAt || 0) - (a.updatedAt || 0));
    });
    return arr;
  }
  arr.sort(function(a, b) { return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0); });
  return arr;
}

function injectMinistryNotesPolishCss() {
  if (document.getElementById('ministryNotesPolishCss')) return;
  const style = document.createElement('style');
  style.id = 'ministryNotesPolishCss';
  style.textContent = [
    '.mn-toolbar{display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:12px}',
    '.mn-toolbar-actions{display:flex;gap:8px;align-items:center;justify-content:flex-end;flex-wrap:wrap}',
    '.mn-category-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
    '.mn-category-card{position:relative;min-height:132px;padding:14px;border-radius:16px;border:1px solid var(--border);background:var(--card-bg,var(--surface));box-shadow:0 1px 3px rgba(0,0,0,.10),0 6px 18px rgba(0,0,0,.07);cursor:pointer;overflow:hidden;transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}',
    '.mn-category-card:hover{transform:translateY(-3px) scale(1.01);box-shadow:0 4px 10px rgba(0,0,0,.12),0 14px 30px rgba(0,0,0,.10)}',
    '.mn-category-card:active{transform:scale(.98)}',
    '.mn-note-card:active{transform:scale(.99)}',
    '.mn-category-card::before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--mn-color,var(--accent))}',
    '.mn-category-icon{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--mn-color,var(--accent)) 18%,transparent);font-size:24px}',
    '.mn-card-actions{display:flex;gap:6px}',
    '.mn-empty{padding:40px 20px;text-align:center;border:1px dashed var(--border);border-radius:14px;background:var(--surface);color:var(--text-dim)}',
    '.mn-empty-icon{width:56px;height:56px;border-radius:14px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:var(--surface-2,var(--surface));font-size:26px}',
    '.mn-empty-cta{display:inline-flex;align-items:center;gap:6px;margin-top:18px;padding:10px 20px;border-radius:999px;background:var(--accent,#10b981);color:var(--on-accent,#06120e);font-size:14px;font-weight:700;border:none;cursor:pointer;transition:opacity .15s ease}',
    '.mn-empty-cta:hover{opacity:.85}',
    '.mn-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:12px}',
    '.mn-list-title{display:flex;align-items:center;gap:9px;min-width:0}',
    '.mn-list-title-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--border);font-size:20px}',
    '.mn-notes-controls{display:grid;grid-template-columns:minmax(0,1fr) 150px 130px;gap:8px;margin-bottom:12px}',
    '.mn-note-grid{display:grid;grid-template-columns:1fr;gap:10px}',
    '.mn-note-card{padding:14px 16px;border-radius:14px;border:1px solid var(--border);background:var(--card-bg,var(--surface));box-shadow:0 1px 3px rgba(0,0,0,.08),0 4px 14px rgba(0,0,0,.05);cursor:pointer;transition:box-shadow .18s ease,transform .18s ease}',
    '.mn-note-card:hover{box-shadow:0 3px 8px rgba(0,0,0,.11),0 8px 22px rgba(0,0,0,.08);transform:translateY(-1px)}',
    '.mn-note-card.done{opacity:.70}',
    '.mn-note-card.archived{opacity:.58}',
    '.mn-note-card.done .mn-note-title{text-decoration:line-through}',
    '.mn-note-title{font-weight:700;font-size:.96rem;line-height:1.28;color:var(--text)}',
    '.mn-note-body{font-size:.86rem;line-height:1.5;color:var(--text-dim);margin-top:5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}',
    '.mn-badges{display:flex;gap:5px;flex-wrap:wrap;margin-top:10px}',
    '.mn-badge{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border);border-radius:999px;padding:2px 8px;font-size:.67rem;font-weight:700;color:var(--text-dim);background:var(--surface)}',
    '.mn-badge.priority-high{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.35);color:var(--coral,#ef4444)}',
    '.mn-badge.priority-medium{background:rgba(245,158,11,.14);border-color:rgba(245,158,11,.35);color:#d97706}',
    '.mn-badge.priority-low{background:rgba(16,185,129,.14);border-color:rgba(16,185,129,.35);color:var(--accent,#10b981)}',
    '.mn-badge.due-soon{background:rgba(245,158,11,.13);border-color:rgba(245,158,11,.4);color:#d97706;font-weight:700}',
    '.mn-badge.overdue{background:rgba(239,68,68,.14);border-color:rgba(239,68,68,.4);color:var(--coral,#ef4444);font-weight:700}',
    '.mn-note-meta{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px;color:var(--text-faint,var(--text-dim));font-size:.72rem}',
    '.mn-modal-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.mn-toggle-row{display:flex;align-items:center;gap:10px;min-height:44px;border:1px solid var(--border);border-radius:8px;padding:8px 10px;background:var(--surface)}',
    '@media (max-width:560px){.mn-category-grid{grid-template-columns:1fr}.mn-notes-controls{grid-template-columns:1fr}.mn-list-head{align-items:flex-start}.mn-toolbar-actions{width:100%;justify-content:stretch}.mn-toolbar-actions .btn{flex:1}.mn-modal-grid{grid-template-columns:1fr}.mn-note-meta{align-items:flex-start;flex-direction:column}}'  ].join('\n');

  document.head.appendChild(style);
}

function categoryLabel(catId) {
  const cat = (state.categories || []).find(c => c.id === catId);
  if (!cat) return catId;
  return state.lang === 'es' ? (cat.label_es || cat.label_en) : (cat.label_en || cat.label_es);
}

/* ===== STATE PERSISTENCE ===== */
function loadState() {
  try {
    const raw = localStorage.getItem(APP_CONFIG.storageKey);
    if (!raw) {
      // Migrate from older versions if present
      const old = localStorage.getItem('ministry-tracker-v2') || localStorage.getItem('ministry-tracker-v1');
      if (old) {
        try {
          const parsed = JSON.parse(old);
          return migrateCategories({ ...APP_CONFIG.defaults, ...parsed, schemaVersion: APP_CONFIG.schemaVersion });
        } catch(e){ /* ignore */ }
      }
      return JSON.parse(JSON.stringify(APP_CONFIG.defaults));
    }
    const parsed = JSON.parse(raw);
    return migrateCategories({ ...APP_CONFIG.defaults, ...parsed });
  } catch(e) {
    console.error('loadState', e);
    return JSON.parse(JSON.stringify(APP_CONFIG.defaults));
  }
}
// One-time label/category cleanup for existing devices
function migrateCategories(s) {
  if (!s.categories) { s.categories = APP_CONFIG.defaults.categories; return s; }
  // Fix Spanish label for Public Witnessing if it's the old string
  s.categories.forEach(c => {
    if (c.id === 'publicWit' && (c.label_es === 'Testificación Pública' || c.label_es === 'Testificación pública')) {
      c.label_es = 'Predicación pública';
    }
  });
  // Rename old "cart" category into the v5 Cart Witnessing activity tag.
  const hasCart = s.categories.some(c => c.id === 'cart');
  if (hasCart) {
    // Re-tag any existing sessions
    if (Array.isArray(s.sessions)) {
      s.sessions.forEach(sess => { if (sess.category === 'cart') sess.category = 'cartWit'; });
    }
    s.categories = s.categories.filter(c => c.id !== 'cart');
    if (!s.categories.some(c => c.id === 'cartWit')) {
      s.categories.push({ id: 'cartWit', label_en: 'Cart Witnessing', label_es: 'Carrito' });
    }
  }
  return s;
}
function saveState() {
  try { localStorage.setItem(APP_CONFIG.storageKey, JSON.stringify(state)); }
  catch(e) { console.error('saveState', e); }
}

/* ===== DATE HELPERS ===== */
function todayStr() { return ymd(new Date()); }
function ymd(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function fromYmd(s) { const [y,m,d] = s.split('-').map(Number); return new Date(y, m-1, d); }
function getServiceYearStart(d = new Date()) {
  const sept1 = new Date(d.getFullYear(), 8, 1);
  return d >= sept1 ? sept1 : new Date(d.getFullYear()-1, 8, 1);
}
function getServiceYearLabel(d = new Date()) { return getServiceYearStart(d).getFullYear() + 1; }
function getServiceYearRange(d = new Date()) {
  const start = getServiceYearStart(d);
  return { start, end: new Date(start.getFullYear()+1, 7, 31) };
}
function daysInMonth(y, m) { return new Date(y, m+1, 0).getDate(); }

function formatHM(mins) {
  if (mins == null || isNaN(mins)) return '0:00';
  const sign = mins < 0 ? '−' : '';
  mins = Math.abs(Math.round(mins));
  return `${sign}${Math.floor(mins/60)}:${String(mins%60).padStart(2,'0')}`;
}
function formatHMS(sec) {
  const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60), s = sec%60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
function roundMins(m) {
  const r = parseInt(state.roundMinutes) || 0;
  return r ? Math.round(m/r)*r : m;
}
function minutesBetween(startISO, stopISO) {
  return Math.max(0, Math.round((new Date(stopISO) - new Date(startISO))/60000));
}
function vibrate(p) {
  if (state.haptics && navigator.vibrate) {
    try { navigator.vibrate(p); } catch(e){ /* ignore */ }
  }
}

/* ===== SERVICE YEAR RESET ===== */
function checkServiceYearReset() {
  const currentSY = getServiceYearLabel();
  if (state.lastClearedServiceYear === null) {
    state.lastClearedServiceYear = currentSY;
    saveState();
    return;
  }
  if (state.lastClearedServiceYear !== currentSY) {
    // Archive previous SY
    const archKey = APP_CONFIG.archivePrefix + state.lastClearedServiceYear;
    const archive = {
      sessions: state.sessions,
      studiesByDate: state.studiesByDate,
      creditEntries: state.creditEntries,
      creditByMonth: state.creditByMonth,
      plannedByDate: state.plannedByDate,
      archivedAt: new Date().toISOString(),
      serviceYear: state.lastClearedServiceYear,
    };
    try { localStorage.setItem(archKey, JSON.stringify(archive)); } catch(e){ /* ignore */ }
    state.sessions = [];
    state.studiesByDate = {};
    state.creditEntries = [];
    state.creditByMonth = {};
    state.plannedByDate = {};
    state.lastClearedServiceYear = currentSY;
    saveState();
    toast(t('serviceYearReset'));
  }
}


/* ===== MONTH-END ROLLOVER ===== */
function processMonthEndRollover() {
  const now = new Date();
  const currentMK = monthKey(now);

  // Already processed this month — nothing to do
  if (state.lastMonthProcessed === currentMK) return;

  // Determine previous month
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMK = monthKey(prev);

  // September = service-year start → no carry-over; checkServiceYearReset() handles the wipe
  const isSeptFirst = (now.getMonth() === 8);

  if (!isSeptFirst && state.carryOver) {
    const remainderMins = getMonthMinutes(prevMK) % 60;
    if (remainderMins > 0) {
      // MOVE the remainder: trim it off the prior month, re-log it on the 1st.
      // Prior month closes at whole hours; service-year total is unchanged.
      trimMinutesFromMonth(prevMK, remainderMins);
      createRolloverSession(currentMK, remainderMins);
    }
  }
  // state.carryOverMin is deprecated (v64) — kept for backup compatibility, no longer written.

  state.lastMonthProcessed = currentMK;
  saveState();
}

// Remove `mins` minutes from the end of a month by shrinking its latest sessions.
// Cascades backwards through earlier sessions; never creates negative durations.
function trimMinutesFromMonth(mk, mins) {
  if (mins <= 0) return;
  const monthSessions = state.sessions
    .filter(s => s.date && s.date.startsWith(mk) && s.stopISO && (s.durationMin || 0) > 0)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.startISO).localeCompare(String(a.startISO)));
  let remaining = mins;
  for (const s of monthSessions) {
    if (remaining <= 0) break;
    if (s.durationMin <= remaining) {
      remaining -= s.durationMin;
      if ((s.studies || 0) > 0 || (s.note || '').trim()) {
        // Keep the entry — it still carries a study or a note
        s.durationMin = 0;
        s.stopISO = s.startISO;
      } else {
        const idx = state.sessions.findIndex(x => x.id === s.id);
        if (idx !== -1) state.sessions.splice(idx, 1);
      }
    } else {
      const newDur = s.durationMin - remaining;
      s.stopISO = new Date(new Date(s.startISO).getTime() + newDur * 60000).toISOString();
      s.durationMin = newDur;
      remaining = 0;
    }
  }
}

// Log the moved remainder as a flagged session on the 1st of `mk`.
// type:'rollover' counts toward month/service-year totals but is excluded from
// service days, day ring, weekly totals, and streaks.
function createRolloverSession(mk, mins) {
  if (mins <= 0) return;
  const [y, m] = mk.split('-').map(Number);
  const start = new Date(y, m - 1, 1, 0, 5);
  state.sessions.push({
    id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    date: mk + '-01',
    startISO: start.toISOString(),
    stopISO: new Date(start.getTime() + mins * 60000).toISOString(),
    durationMin: mins,
    category: (state.categories[0] || { id: 'regular' }).id,
    note: state.lang === 'es' ? 'Minutos del mes anterior' : 'Previous month rollover',
    studies: 0,
    type: 'rollover',
  });
}

/* ===== ONE-TIME BACKFILL: June 2026 rollover (v64) =====
   The write-only carryOverMin bug left June 2026 at 21:13 with no July entry,
   and lastMonthProcessed was already '2026-07', so the normal guard skips it.
   Runs once, then never again. */
function runJune2026RolloverBackfill() {
  if (state.rolloverBackfillJun2026Done) return;
  if (state.carryOver) {
    const remainderMins = getMonthMinutes('2026-06') % 60;
    const alreadyDone = state.sessions.some(s => s.type === 'rollover' && s.date === '2026-07-01');
    if (remainderMins > 0 && !alreadyDone) {
      trimMinutesFromMonth('2026-06', remainderMins);
      createRolloverSession('2026-07', remainderMins);
    }
  }
  state.rolloverBackfillJun2026Done = true;
  saveState();
}

function checkMonthEndRollover() {
  processMonthEndRollover();
  scheduleMidnightRollover();
}

function scheduleMidnightRollover() {
  const now = new Date();
  // Fire at 00:00:05 of the next calendar day (5-second buffer against drift)
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
  const msUntil = nextMidnight - now;
  setTimeout(() => {
    processMonthEndRollover();
    if (typeof renderAll === 'function') renderAll();
    scheduleMidnightRollover(); // reschedule for the following night
  }, msUntil);
}

function getAllArchives() {
  const archives = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(APP_CONFIG.archivePrefix)) {
        try { archives[key] = JSON.parse(localStorage.getItem(key)); } catch(e){ /* ignore */ }
      }
    }
  } catch(e){ /* ignore */ }
  return archives;
}

/* ===== AGGREGATIONS ===== */
function isRolloverSession(s) { return !!s && s.type === 'rollover'; }
function getSessionsForDate(d) { return state.sessions.filter(s => s.date === d && s.stopISO); }
function getDayMinutes(d) { return getSessionsForDate(d).filter(s => !isRolloverSession(s)).reduce((a,s) => a + (s.durationMin||0), 0); }
function getMonthMinutes(mk) {
  return state.sessions.filter(s => s.date.startsWith(mk) && s.stopISO).reduce((a,s) => a + (s.durationMin||0), 0);
}
function getMonthSessions(mk) { return state.sessions.filter(s => s.date.startsWith(mk) && s.stopISO); }
function getMonthStudies(mk) { return getMonthSessions(mk).reduce((a,s) => a + (s.studies||0), 0); }
// Unique dates with any logged minutes this month: the "Service days" stat.
function getMonthServiceDays(mk) {
  const days = new Set();
  for (const s of state.sessions) {
    if (s.date && s.date.startsWith(mk) && s.stopISO && (s.durationMin || 0) > 0 && !isRolloverSession(s)) {
      days.add(s.date);
    }
  }
  return days.size;
}
function creditEntryMinutes(entry) {
  if (!entry || typeof entry !== 'object') return 0;
  if (Number.isFinite(Number(entry.minutes))) return Math.max(0, Math.round(Number(entry.minutes)));
  if (Number.isFinite(Number(entry.hours))) return Math.max(0, Math.round(Number(entry.hours) * 60));
  return 0;
}
function legacyCreditMinutes(value) {
  if (value && typeof value === 'object') {
    if (Number.isFinite(Number(value.minutes))) return Math.max(0, Math.round(Number(value.minutes)));
    if (Number.isFinite(Number(value.hours))) return Math.max(0, Math.round(Number(value.hours) * 60));
    return 0;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === 'string') {
    const text = value.trim();
    const hm = text.match(/^(\d+)\s*:\s*(\d{1,2})$/);
    if (hm) return Math.max(0, (parseInt(hm[1], 10) * 60) + Math.min(59, parseInt(hm[2], 10)));
    const hours = parseFloat(text.replace(/\s*(hours?|hrs?|h)\s*$/i, ''));
    if (Number.isFinite(hours)) return Math.max(0, Math.round(hours * 60));
  }
  return 0;
}
function getCreditEntriesForMonth(mk) {
  return (Array.isArray(state.creditEntries) ? state.creditEntries : [])
    .filter(e => e && e.date && e.date.startsWith(mk) && creditEntryMinutes(e) > 0);
}
function getMonthCredit(mk) {
  const entries = getCreditEntriesForMonth(mk);
  const manual = entries.find(e => e.id === 'c_manual_month_' + mk || e.type === 'manualMonthlyCredit');
  if (manual) return creditEntryMinutes(manual);
  const entryTotal = entries.reduce((a, e) => a + creditEntryMinutes(e), 0);
  if (entryTotal > 0) return entryTotal;
  return legacyCreditMinutes((state.creditByMonth || {})[mk]);
}
function getServiceYearMinutes() {
  const { start, end } = getServiceYearRange();
  const s = ymd(start), e = ymd(end);
  return state.sessions.filter(x => x.date >= s && x.date <= e && x.stopISO).reduce((a,x) => a + (x.durationMin||0), 0);
}
function getStreak() {
  let n = 0; const d = new Date();
  while (n < 366) {
    if (getDayMinutes(ymd(d)) > 0) { n++; d.setDate(d.getDate()-1); }
    else break;
  }
  return n;
}
function getWeekRange() {
  const now = new Date(); const dow = now.getDay();
  const offset = state.weekStartsMon ? (dow === 0 ? 6 : dow - 1) : dow;
  const start = new Date(now); start.setDate(now.getDate()-offset); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(start.getDate()+6);
  return { start, end };
}
function getWeekMinutes() {
  const { start, end } = getWeekRange();
  const s = ymd(start), e = ymd(end);
  return state.sessions.filter(x => x.date >= s && x.date <= e && x.stopISO && !isRolloverSession(x)).reduce((a,x) => a + (x.durationMin||0), 0);
}
function getPlannedForDate(d) { return (state.plannedByDate || {})[d] || 0; }
function getMonthPlannedTotal(mk) {
  let total = 0;
  Object.entries(state.plannedByDate || {}).forEach(([d, m]) => { if (d.startsWith(mk)) total += m; });
  return total;
}
function getPendingStudiesForDate(date) {
  return Math.max(0, parseInt(pendingStudiesByDate[date] || 0, 10) || 0);
}
function setPendingStudiesForDate(date, count) {
  count = Math.max(0, parseInt(count, 10) || 0);
  if (count > 0) pendingStudiesByDate[date] = count;
  else delete pendingStudiesByDate[date];
}

/* ===== TIMER ===== */
function startTimer(dateStr) {
  if (state.activeTimer) return;
  const timerDate = dateStr || todayStr();
  // Make sure pendingCategory is still valid
  if (!state.categories.find(c => c.id === pendingCategory)) {
    pendingCategory = (state.categories[0] || { id: 'regular' }).id;
  }
  const pendingStudies = getPendingStudiesForDate(timerDate);
  setPendingStudiesForDate(timerDate, 0);
  state.activeTimer = {
    startISO: new Date().toISOString(),
    date: timerDate,
    category: pendingCategory,
    studyCount: pendingStudies, note: '',
  };
  saveState(); vibrate(20); startLiveTick(); renderAll();
}
function stopTimer(opts = { save: true }) {
  if (!state.activeTimer) return;
  if (opts.save) {
    const stopISO = new Date().toISOString();
    let mins = roundMins(minutesBetween(state.activeTimer.startISO, stopISO));
    if (mins > 0) {
      state.sessions.push({
        id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        date: state.activeTimer.date,
        startISO: state.activeTimer.startISO,
        stopISO,
        durationMin: mins,
        category: state.activeTimer.category,
        note: state.activeTimer.note || '',
        studies: state.activeTimer.studyCount || 0,
      });
      state.sessionsSinceLastBackup = (state.sessionsSinceLastBackup || 0) + 1;
      if (state.activeTimer.category) state.lastUsedCategory = state.activeTimer.category;
      const dayMins = getDayMinutes(state.activeTimer.date);
      const target = getPlannedForDate(state.activeTimer.date) || Math.round(state.dailyGoalHrs * 60);
      if (target > 0 && dayMins >= target && (dayMins - mins) < target) {
        vibrate([30,50,30,50,80]);
      } else vibrate(20);
    }
  }
  state.activeTimer = null;
  saveState(); stopLiveTick(); renderAll();
}
function startLiveTick() {
  stopLiveTick();
  document.getElementById('liveBanner').classList.remove('hidden');
  document.body.classList.add('has-live-banner');
  // Reposition backup banner if also visible
  renderBackupBanner();
  liveTickInterval = setInterval(() => {
    if (!state.activeTimer) { stopLiveTick(); return; }
    const elapsedSec = Math.floor((Date.now() - new Date(state.activeTimer.startISO))/1000);
    const display = formatHMS(elapsedSec);
    const liveEl = document.getElementById('liveBannerTime');
    const timerEl = document.getElementById('timerDisplay');
    if (liveEl) liveEl.textContent = display;
    if (timerEl && currentScreen === 'timer') timerEl.textContent = display;

    const date = state.activeTimer.date;
    const already = getDayMinutes(date);
    const planned = getPlannedForDate(date);
    const dailyGoal = Math.round(state.dailyGoalHrs * 60);
    const target = planned > 0 ? planned : dailyGoal;
    const remainEl = document.getElementById('liveBannerRemaining');
    const banner = document.getElementById('liveBanner');
    const timerRem = document.getElementById('timerRemaining');

    if (target > 0) {
      const totalSoFar = already + elapsedSec/60;
      const remaining = target - totalSoFar;
      if (remaining > 0) {
        const txt = `· ${formatHM(Math.ceil(remaining))} ${t('remaining')}`;
        if (remainEl) { remainEl.textContent = txt; remainEl.classList.remove('hidden'); }
        if (timerRem) timerRem.textContent = txt.replace('· ', '');
        banner.classList.remove('over');
      } else {
        const txt = `· +${formatHM(Math.floor(-remaining))} ${t('over')}`;
        if (remainEl) { remainEl.textContent = txt; remainEl.classList.remove('hidden'); }
        if (timerRem) timerRem.textContent = txt.replace('· ', '');
        banner.classList.add('over');
      }
    } else {
      if (remainEl) remainEl.classList.add('hidden');
      if (timerRem) timerRem.textContent = '';
      banner.classList.remove('over');
    }

    const ap = parseInt(state.autoPauseMin) || 0;
    if (ap > 0 && (Date.now() - lastInteraction) > ap*60000) {
      stopTimer({ save: true });
      toast(t('stop'));
    }
  }, 1000);
}
function stopLiveTick() {
  clearInterval(liveTickInterval); liveTickInterval = null;
  document.getElementById('liveBanner').classList.add('hidden');
  document.body.classList.remove('has-live-banner');
  renderBackupBanner();
}

/* ===== QUICK ADD ===== */
// Returns the category ID to use as a default for Quick Add:
// lastUsedCategory if it still exists in state.categories, else the first category.
function resolveDefaultCategory() {
  const last = state.lastUsedCategory;
  if (last && state.categories.some(c => c.id === last)) return last;
  return (state.categories[0] || { id: 'regular' }).id;
}

function quickAddMinutes(mins, dateStr = todayStr()) {
  mins = parseInt(mins, 10) || 0;
  if (mins <= 0) return;
  const now = new Date();
  const start = new Date(now.getTime() - mins*60000);
  const cat = resolveDefaultCategory();
  const session = {
    id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    date: dateStr,
    startISO: start.toISOString(),
    stopISO: now.toISOString(),
    durationMin: mins,
    category: cat,
    note: '', studies: 0,
  };
  state.sessions.push(session);
  state.lastUsedCategory = cat;
  state.sessionsSinceLastBackup = (state.sessionsSinceLastBackup || 0) + 1;
  saveState(); vibrate(15); renderAll();
  toast(`+${mins} ${t('addedMin')}`, {
    actionLabel: state.lang === 'es' ? 'Deshacer' : 'Undo',
    onAction: () => {
      const idx = state.sessions.findIndex(s => s.id === session.id);
      if (idx === -1) return;
      state.sessions.splice(idx, 1);
      state.sessionsSinceLastBackup = Math.max(0, (state.sessionsSinceLastBackup || 0) - 1);
      saveState(); vibrate(10); renderAll();
      toast(state.lang === 'es' ? 'Deshecho' : 'Undone');
    }
  });
}
/* Note: All add-time confirmation prompts removed.
   Adding/editing time is always silent regardless of timer state. */

/* ===== RENDER ===== */
function renderAll() {
  renderHome(); renderTimer(); renderCalendar(); renderNotes(); renderReports(); renderLogHistory(); renderSettings();
  applyI18n();
  renderBackupBanner();
}

function applyI18n() {
  const map = {
    lbl_todayProgress: 'todayProgress', lbl_todayMini: 'todayMini',
    lbl_day: 'day', lbl_month: 'month', lbl_year: 'year',
    lbl_quickAdd: 'quickAdd', lbl_quickAddHint: 'quickAddHint', lbl_thisWeek: 'thisWeek', lbl_logged: 'logged',
    lbl_serviceYear: 'serviceYear', lbl_serviceYear2: 'serviceYear', lbl_projection: 'projection', lbl_projection2: 'projection',
    lbl_studies: 'studies', lbl_studies2: 'studies', lbl_studies3: 'studies', lbl_saveStudyOnly: 'saveStudyOnly', lbl_streak: 'streak', lbl_serviceDays: 'serviceDays', lbl_serviceDays2: 'serviceDays',
    lbl_note: 'note', lbl_categoryHeader: 'selectCategory', lbl_backupTitle: 'backupTitle', lbl_homeExport: 'exportBtn', lbl_homeImport: 'importBtn', lbl_timerAdjustHint: 'timerAdjustHint', lbl_monthlyTargetTitle: 'monthlyTargetTitle', lbl_perMonthLabel: 'perMonthLabel', lbl_needThisMonth: 'needThisMonth', lbl_totalHoursFor: 'totalHoursFor', lbl_btnAdjust: 'btnAdjust', lbl_btnAdd: 'btnAdd', lbl_btnDeduct: 'btnDeduct', lbl_btnSetPlan: 'btnSetPlan', lbl_btnAddDetailed: 'btnAddDetailed', lbl_sessionsThisDay: 'sessionsThisDay', lbl_navTimer: 'nav_timer', lbl_navCal: 'nav_cal', lbl_navNotes: 'nav_notes', lbl_navReports: 'nav_reports', lbl_navSettings: 'nav_settings',
    lbl_tapChange: 'tapChange', lbl_sessionsOnDay: 'sessionsOnDay',
    lbl_monthlyPlan: 'monthlyPlan', lbl_tapDayToPlan: 'tapDayToPlan',
    lbl_plannedTotal: 'plannedTotal', lbl_goalTotal: 'goalTotal', lbl_actualHours: 'actualHours',
    lbl_metGoal: 'metGoal', lbl_missed: 'missed', lbl_hasPlan: 'hasPlan', lbl_calTapHint: 'calTapHint',
    lbl_todaysPlan: 'todaysPlan',
    lbl_planPatterns: 'planPatterns',
    lbl_todayPlanTitle: 'todayPlanTitle', lbl_todayPlanRemainingLabel: 'todayPlanRemaining',
    lbl_monthlyReport: 'monthlyReport', lbl_hours: 'hours', lbl_credit: 'credit', lbl_share: 'share',
    lbl_tapEdit: 'tapEdit', lbl_avgMonth: 'avgMonth', lbl_byCategory: 'byCategory',
    lbl_profile: 'profile', lbl_publisherType: 'publisherType',
    lbl_userName: 'userNameLabel', lbl_userNameNew: 'userNameNew',
    opt_pub: 'pub', opt_aux: 'aux', opt_reg: 'regular', opt_spec: 'special',
    lbl_annual: 'annual', lbl_monthly: 'monthly', lbl_daily: 'daily',
    lbl_categories: 'categories', lbl_addCat: 'addCat', lbl_catHint: 'catHint',
    lbl_appearance: 'appearance', lbl_theme: 'theme', lbl_auto: 'auto', lbl_light: 'light', lbl_dark: 'dark', lbl_language: 'language',
    lbl_preferences: 'preferences', lbl_confirmClose: 'confirmClose',
    lbl_showStreak: 'showStreak', lbl_weekStartsMon: 'weekStartsMon',
    lbl_carryOver: 'carryOver', lbl_haptics: 'haptics', lbl_backupReminder: 'backupReminder',
    lbl_roundMins: 'roundMins', opt_roundOff: 'roundOff', lbl_autoPause: 'autoPause',
    lbl_data: 'backupTitle', lbl_exportBtn: 'exportBtn',
    lbl_cloudSaveBtn: 'cloudSaveBtn', lbl_cloudRestoreBtn: 'cloudRestoreBtn', lbl_cloudHeader: 'cloudHeader',
    lbl_homeCloudSave: 'cloudSaveBtn', lbl_homeCloudRestore: 'cloudRestoreBtn',
    lbl_pastSY: 'pastSY',
    lbl_backupBtn: 'backupBtn',
    lbl_importBtn: 'importBtn', lbl_pasteImportBtn: 'pasteImportBtn',
    lbl_clearMonth: 'clearMonth', lbl_clearAll: 'clearAll',
    nav_home: 'nav_home', nav_timer: 'nav_timer', nav_cal: 'nav_cal', nav_notes: 'nav_notes', nav_reports: 'nav_reports',
    lbl_logHistory: 'logHistory',
    liveBannerLabel: 'inService', liveBannerStopLabel: 'stop',
  };
  Object.entries(map).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  });
  document.getElementById('langToggle').textContent = (state.lang || 'en').toUpperCase();
  const userNameInput = document.getElementById('setUserName');
  if (userNameInput) userNameInput.placeholder = t('userNamePlaceholder');
  const logHistorySearchEl2 = document.getElementById('logHistorySearch');
  if (logHistorySearchEl2) logHistorySearchEl2.placeholder = t('searchPlaceholder');
  // Log filter chips
  document.querySelectorAll('[data-log-filter]').forEach(b => {
    const f = b.dataset.logFilter;
    b.textContent = ({ month: t('thisMonth'), week: t('thisWeek'), today: t('today') })[f];
  });
}

/* ---------- HOME ---------- */
// Ring pulse tracking (J): remember the last hit state per ring so we can pulse on transitions
const _ringHitState = { ringDay: false, ringMonth: false, ringYear: false };
function maybePulseRing(id, isHit) {
  if (isHit && !_ringHitState[id]) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('ring-pulse');
      void el.getBoundingClientRect(); // restart animation
      el.classList.add('ring-pulse');
      setTimeout(() => el.classList.remove('ring-pulse'), 1000);
    }
  }
  _ringHitState[id] = isHit;
}

// Smooth count-up animation for minute values (K)
// Tracks last displayed value per element, animates from old to new on increase.
const _countUpState = {}; // { [id]: { value, raf, lastTo } }
function animateMinutesTo(id, newMins, duration = 520) {
  return animateValueTo(id, newMins, duration, formatHM);
}

// Generic count-up animator for any number; formatter optional.
// Used for studies, service days, percentages, etc.
function animateNumberTo(id, newVal, duration = 520, formatter = null) {
  return animateValueTo(id, newVal, duration, formatter || (v => String(v)));
}

// Internal: shared implementation for both helpers.
function animateValueTo(id, target, duration, formatter) {
  const el = document.getElementById(id);
  if (!el) return;
  const prev = _countUpState[id]?.value;
  // First paint or decrease: snap, don't animate
  if (prev === undefined || target <= prev) {
    if (_countUpState[id]?.raf) cancelAnimationFrame(_countUpState[id].raf);
    el.textContent = formatter(target);
    _countUpState[id] = { value: target, raf: null, lastTo: target };
    return;
  }
  if (_countUpState[id].lastTo === target && _countUpState[id].raf) return;
  if (_countUpState[id].raf) cancelAnimationFrame(_countUpState[id].raf);
  const start = prev;
  const t0 = performance.now();
  const ease = (x) => 1 - Math.pow(1 - x, 3);
  const tick = (now) => {
    const t = Math.min(1, (now - t0) / duration);
    const v = Math.round(start + (target - start) * ease(t));
    el.textContent = formatter(v);
    _countUpState[id].value = v;
    if (t < 1) {
      _countUpState[id].raf = requestAnimationFrame(tick);
    } else {
      el.textContent = formatter(target);
      _countUpState[id].value = target;
      _countUpState[id].raf = null;
    }
  };
  _countUpState[id] = { value: prev, raf: requestAnimationFrame(tick), lastTo: target };
}

function renderHome() {
  const hr = new Date().getHours();
  let g = t('goodMorning');
  if (hr >= 12 && hr < 18) g = t('goodAfternoon');
  else if (hr >= 18) g = t('goodEvening');
  const name = (state.userName || '').trim();
  if (name) g = `${g}, ${name}`;
  document.getElementById('homeGreeting').textContent = g;

  const today = new Date();
  document.getElementById('homeDateLabel').textContent = today.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const todayMins = getDayMinutes(todayStr());
  const dailyGoalMins = Math.round(state.dailyGoalHrs * 60);
  const mk = monthKey(today);
  const monthMins = getMonthMinutes(mk);
  const monthGoalMins = Math.round(state.monthlyGoalHrs * 60);
  const syMins = getServiceYearMinutes();
  const syGoalMins = Math.round(state.annualGoalHrs * 60);

  updateRing('ringDay', 34, dailyGoalMins ? todayMins/dailyGoalMins : 0);
  updateRing('ringMonth', 48, monthGoalMins ? monthMins/monthGoalMins : 0);
  updateRing('ringYear', 62, syGoalMins ? syMins/syGoalMins : 0);
  // Ring pulse on goal-hit transition (J)
  maybePulseRing('ringDay',   !!(dailyGoalMins && todayMins >= dailyGoalMins));
  maybePulseRing('ringMonth', !!(monthGoalMins && monthMins >= monthGoalMins));
  maybePulseRing('ringYear',  !!(syGoalMins    && syMins    >= syGoalMins));

  animateMinutesTo('homeTodayHours', todayMins);
  animateMinutesTo('ringDayVal', todayMins);
  document.getElementById('ringDayGoal').textContent = formatHM(dailyGoalMins);
  animateMinutesTo('ringMonthVal', monthMins);
  document.getElementById('ringMonthGoal').textContent = formatHM(monthGoalMins);
  animateMinutesTo('ringYearVal', syMins);
  document.getElementById('ringYearGoal').textContent = formatHM(syGoalMins);

  // Today's plan row in rings legend (H)
  const planMinsToday = getPlannedForDate(todayStr());
  const planRow = document.getElementById('ringPlanRow');
  if (planRow) {
    if (planMinsToday > 0) {
      planRow.classList.remove('hidden');
      animateMinutesTo('ringPlanVal', todayMins);
      document.getElementById('ringPlanGoal').textContent = formatHM(planMinsToday);
      const remaining = planMinsToday - todayMins;
      const status = document.getElementById('ringPlanStatus');
      if (remaining <= 0) {
        status.textContent = '✓ ' + t('metGoal');
        status.style.color = 'var(--accent)';
      } else {
        status.textContent = formatHM(remaining) + ' ' + (t('remaining') || '');
        status.style.color = '';
      }
    } else {
      planRow.classList.add('hidden');
    }
  }

  const { start } = getServiceYearRange();
  document.getElementById('homeSYLabel').textContent = `${start.getFullYear()}–${getServiceYearLabel()}`;
  document.getElementById('homeSYHours').textContent = formatHM(syMins);
  document.getElementById('homeSYGoal').textContent = state.annualGoalHrs;
  document.getElementById('homeSYBar').style.width = (syGoalMins ? Math.min(100, (syMins/syGoalMins)*100) : 0) + '%';

  const { start: syStart, end: syEnd } = getServiceYearRange();
  const totalDays = Math.round((syEnd - syStart)/86400000) + 1;
  const elapsedDays = Math.max(1, Math.round((new Date() - syStart)/86400000) + 1);
  const projection = Math.round((syMins/elapsedDays) * totalDays);
  document.getElementById('homeProjection').textContent = formatHM(projection);

  const expected = Math.round((syGoalMins/totalDays) * elapsedDays);
  const ahead = syMins - expected;
  const paceChip = document.getElementById('homePaceChip');
  if (ahead >= 0) {
    paceChip.textContent = `+${formatHM(ahead)} ${t('onPace')}`;
    paceChip.className = 'chip chip-accent';
  } else {
    paceChip.textContent = `${formatHM(ahead)} ${t('behind')}`;
    paceChip.className = 'chip chip-coral';
  }

  animateNumberTo('homeStudies', getMonthStudies(mk));
  // Streak can be a number OR an em-dash, so snap rather than animate
  document.getElementById('homeStreak').textContent = state.showStreak ? getStreak() : '—';
  animateNumberTo('homeServiceDays', getMonthServiceDays(mk));

  renderWeekBars();
  renderPlanPatterns();

  const startBtn = document.getElementById('homeQuickStart');
  const startIcon = document.getElementById('homeQuickStartIcon');
  if (state.activeTimer) {
    startBtn.className = 'btn btn-coral btn-round-sm text-xl';
    startIcon.className = 'fa-solid fa-stop';
  } else {
    startBtn.className = 'btn btn-primary btn-round-sm text-xl';
    startIcon.className = 'fa-solid fa-play';
  }

  renderSuggestions();

  // === MONTHLY TARGET CALCULATION ===
  // How many hours per remaining month do you need to hit the annual goal?
  // Account for what's already been logged in the service year so far.
  const goalMins = Math.round(state.annualGoalHrs * 60);
  const syMinsSoFar = syMins; // already computed above
  const remainingNeeded = Math.max(0, goalMins - syMinsSoFar);

  // Calculate months remaining in the current service year (including current)
  const { start: syStart2, end: syEnd2 } = getServiceYearRange();
  const nowD = new Date();
  let monthsRemaining = 0;
  let cursor = new Date(nowD.getFullYear(), nowD.getMonth(), 1);
  while (cursor <= syEnd2) {
    monthsRemaining++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  }
  monthsRemaining = Math.max(1, monthsRemaining); // never zero

  const perMonthNeeded = remainingNeeded / monthsRemaining;

  // Need this month = perMonthNeeded - already logged this month
  const monthMinsForCalc = getMonthMinutes(mk);
  const needThisMonth = Math.max(0, perMonthNeeded - monthMinsForCalc);

  // Ahead/behind: compare service-year-so-far to where you "should be"
  // by this point in the year (expected portion of goal).
  const totalDays2 = Math.round((syEnd2 - syStart2)/86400000) + 1;
  const elapsedDays2 = Math.max(1, Math.round((nowD - syStart2)/86400000) + 1);
  const expectedByNow = Math.round((goalMins / totalDays2) * elapsedDays2);
  const aheadMins = syMinsSoFar - expectedByNow;

  const targetVal = document.getElementById('homeMonthlyTargetVal');
  const needEl = document.getElementById('homeNeedThisMonth');
  const monthsEl = document.getElementById('homeMonthsRemaining');
  const statusLine = document.getElementById('homePaceStatus');
  if (targetVal) {
    targetVal.textContent = formatHM(Math.round(perMonthNeeded));
    needEl.textContent = formatHM(Math.round(needThisMonth));
    monthsEl.textContent = `${monthsRemaining} ${t('monthsRemainingLabel')}`;
    if (Math.abs(aheadMins) < 30) {
      statusLine.textContent = t('rightOnPace');
      statusLine.style.color = 'var(--accent)';
    } else if (aheadMins > 0) {
      statusLine.textContent = `${t('aheadByLabel')} ${formatHM(Math.round(aheadMins))}`;
      statusLine.style.color = 'var(--accent)';
    } else {
      statusLine.textContent = `${t('behindByLabel')} ${formatHM(Math.round(-aheadMins))}`;
      statusLine.style.color = 'var(--coral)';
    }
  }

  // Backup banner status
  const statusEl = document.getElementById('homeBackupStatus');
  if (statusEl) {
    const newCount = state.sessionsSinceLastBackup || 0;
    const countSuffix = newCount > 0 ? ` · ${newCount} ${t('newShort')}` : '';
    if (!state.lastBackupISO) {
      statusEl.textContent = t('backupNever') + countSuffix;
      statusEl.className = 'text-tiny text-amber mt-1 font-semibold';
    } else {
      const last = new Date(state.lastBackupISO);
      const daysSince = Math.floor((Date.now() - last.getTime())/86400000);
      const dateStr = last.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      if (daysSince >= 30) {
        statusEl.textContent = `${t('backupOld')} (${dateStr})${countSuffix}`;
        statusEl.className = 'text-tiny text-coral mt-1 font-semibold';
      } else {
        statusEl.textContent = `${t('backupRecent')}: ${dateStr}${countSuffix}`;
        statusEl.className = 'text-tiny text-faint mt-1';
      }
    }
  }

  // Stage J: Weather — refresh card on every home render
  if (typeof App !== 'undefined' && App.Weather && App.Weather._tryInit) App.Weather._tryInit();

}
function updateRing(id, r, ratio) {
  const circ = 2 * Math.PI * r;
  const el = document.getElementById(id);
  if (!el) return;
  el.setAttribute('stroke-dasharray', circ);
  el.setAttribute('stroke-dashoffset', circ * (1 - Math.min(1, Math.max(0, ratio))));
}
function renderWeekBars() {
  const { start } = getWeekRange();
  const dailyGoal = Math.round(state.dailyGoalHrs * 60);
  const today = todayStr();
  const wd = state.weekStartsMon ? t('weekdaysShortMon') : t('weekdaysShortSun');
  const bars = document.getElementById('weekBars');
  const labels = document.getElementById('weekLabels');
  let total = 0, max = Math.max(dailyGoal, 60);
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate()+i);
    const key = ymd(d); const mins = getDayMinutes(key);
    total += mins; max = Math.max(max, mins);
    days.push({ key, mins });
  }
  bars.innerHTML = days.map(({key, mins}) => {
    const h = max ? (mins/max)*100 : 0;
    const isToday = key === today;
    const over = dailyGoal && mins >= dailyGoal;
    return `<div class="bar-track" style="height: 100%"><div class="bar-fill ${over?'over':''}" style="height:${h}%; opacity:${isToday?1:0.8}"></div></div>`;
  }).join('');
  labels.innerHTML = days.map(({key}, i) => {
    const isToday = key === today;
    return `<div style="${isToday?'color:var(--accent);font-weight:700':''}">${wd[i]}</div>`;
  }).join('');
  const wkEnd = new Date(start); wkEnd.setDate(start.getDate()+6);
  const ms = t('monthsShort');
  document.getElementById('weekRange').textContent = `${ms[start.getMonth()]} ${start.getDate()} – ${ms[wkEnd.getMonth()]} ${wkEnd.getDate()}`;
  document.getElementById('weekTotal').textContent = formatHM(total);
}

// Plan Patterns: scan last 8 weeks of plannedByDate vs actuals (I)
// Counts misses per weekday (Sun..Sat = 0..6). A weekday with >= 3 misses is surfaced.
function renderPlanPatterns() {
  const card = document.getElementById('planPatternsCard');
  const list = document.getElementById('planPatternsList');
  if (!card || !list) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const startWindow = new Date(today); startWindow.setDate(today.getDate() - 56); // 8 weeks back

  const missedByWeekday = [0,0,0,0,0,0,0]; // Sun..Sat
  const planned = state.plannedByDate || {};
  for (const dateKey in planned) {
    const planMin = planned[dateKey] || 0;
    if (planMin <= 0) continue;
    const d = fromYmd(dateKey);
    if (isNaN(d)) continue;
    d.setHours(0,0,0,0);
    if (d < startWindow || d >= today) continue; // exclude today and beyond
    const actual = getDayMinutes(dateKey);
    if (actual < planMin) {
      missedByWeekday[d.getDay()]++;
    }
  }

  // Pick weekdays with 3+ misses
  const flagged = [];
  for (let i = 0; i < 7; i++) {
    if (missedByWeekday[i] >= 3) flagged.push({ dow: i, count: missedByWeekday[i] });
  }
  // Sort by most misses first
  flagged.sort((a, b) => b.count - a.count);

  if (!flagged.length) {
    card.classList.add('hidden');
    list.innerHTML = '';
    return;
  }
  card.classList.remove('hidden');
  // Use locale for the weekday name
  const locale = state.lang === 'es' ? 'es-ES' : 'en-US';
  // A reference Sunday to derive weekday names (Jan 4 1970 was a Sunday)
  list.innerHTML = flagged.map(f => {
    const ref = new Date(Date.UTC(1970, 0, 4 + f.dow));
    const dayName = ref.toLocaleDateString(locale, { weekday: 'long', timeZone: 'UTC' });
    const msg = t('planPatternMissed').replace('{day}', dayName).replace('{count}', f.count);
    return `
    <div class="row gap-3 items-center">
      <span style="width:8px; height:8px; border-radius:50%; background: var(--coral); flex-shrink:0;"></span>
      <div class="text-sm flex-1">${escapeHtml(msg)}</div>
    </div>`;
  }).join('');
}
function renderSuggestions() {
  const strip = document.getElementById('suggestionStrip');
  const chips = [];
  const yKey = (() => { const d = new Date(); d.setDate(d.getDate()-1); return ymd(d); })();
  if (getDayMinutes(yKey) === 0 && getDayMinutes(todayStr()) === 0) {
    chips.push({ icon: 'fa-clock-rotate-left', color: 'amber', text: t('forgotYesterday'), action: () => {
      adjustSelectedDate = yKey;
      const d = fromYmd(yKey);
      currentCalMonth = monthKey(d);
      switchScreen('calendar');
    } });
  }
  const weekMins = getWeekMinutes();
  const weekGoal = Math.round(state.dailyGoalHrs * 60 * 7);
  const weekNeed = weekGoal - weekMins;
  const dow = new Date().getDay();
  if (weekNeed > 0 && dow >= 4) {
    chips.push({ icon: 'fa-bullseye', color: 'accent', text: `${formatHM(weekNeed)} ${t('needToHitWeek')}`, action: () => switchScreen('timer') });
  }
  const mk = monthKey(new Date());
  const monthMins = getMonthMinutes(mk);
  const monthGoal = Math.round(state.monthlyGoalHrs * 60);
  const monthNeed = monthGoal - monthMins;
  const dim = daysInMonth(new Date().getFullYear(), new Date().getMonth());
  const daysLeft = dim - new Date().getDate() + 1;
  if (monthNeed > 0 && daysLeft <= 7) {
    chips.push({ icon: 'fa-calendar-check', color: 'blue', text: `${formatHM(monthNeed)} ${t('needToHitMonth')}`, action: () => switchScreen('timer') });
  }
  if (state.backupReminder) {
    const last = state.lastBackupISO ? new Date(state.lastBackupISO) : null;
    const daysSince = last ? Math.floor((Date.now() - last.getTime())/86400000) : 999;
    if (daysSince >= 30) chips.push({ icon: 'fa-cloud-arrow-up', color: 'purple', text: t('backupOverdue'), action: () => switchScreen('settings') });
  }
  if (!chips.length) { strip.classList.add('hidden'); return; }
  strip.classList.remove('hidden');
  strip.innerHTML = chips.map((c, i) => `
    <button class="suggestion-chip" data-sug="${i}">
      <i class="fa-solid ${c.icon} text-${c.color}"></i> <span>${escapeHtml(c.text)}</span>
    </button>`).join('');
  strip.querySelectorAll('[data-sug]').forEach(el => el.onclick = () => chips[+el.dataset.sug].action());
}

/* ---------- TIMER ---------- */
function renderTimer() {
  const d = fromYmd(currentTimerDate);
  document.getElementById('timerDateLabel').textContent = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  document.getElementById('timerDateInput').value = currentTimerDate;

  const isActiveHere = state.activeTimer && state.activeTimer.date === currentTimerDate;
  const isAnyActive = !!state.activeTimer;
  const display = document.getElementById('timerDisplay');
  const mainBtn = document.getElementById('timerMainBtn');
  const mainIcon = document.getElementById('timerMainIcon');
  const mainLabel = document.getElementById('timerMainLabel');
  const status = document.getElementById('timerStatusLabel');
  const sub = document.getElementById('timerSubtitle');
  const studiesPanel = document.getElementById('timerStudiesPanel');
  const studiesHint = document.getElementById('lbl_studiesHint');
  const studyOnlySave = document.getElementById('timerStudyOnlySave');

  const adjusters = document.getElementById('timerAdjusters');
  if (isActiveHere) {
    status.textContent = t('inService');
    status.style.color = 'var(--accent)';
    const sec = Math.floor((Date.now() - new Date(state.activeTimer.startISO))/1000);
    display.textContent = formatHMS(sec);
    mainBtn.className = 'btn btn-coral btn-round mt-5';
    mainIcon.className = 'fa-solid fa-stop text-3xl mb-1';
    mainLabel.textContent = t('stop');
    const t1 = new Date(state.activeTimer.startISO);
    sub.textContent = `${t('start')}: ${t1.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
    document.getElementById('timerStudyCount').textContent = state.activeTimer.studyCount || 0;
    if (studiesHint) studiesHint.textContent = t('studiesHintActive');
    if (studyOnlySave) studyOnlySave.classList.add('hidden');
    // Sync inline note from state (only when textarea isn't focused, to avoid clobbering active typing)
    const noteInlineEl = document.getElementById('timerNoteInline');
    if (noteInlineEl && noteInlineEl !== document.activeElement) {
      noteInlineEl.value = state.activeTimer.note || '';
    }
    studiesPanel.classList.remove('hidden');
    document.getElementById('timerNotePanel').classList.remove('hidden');
    if (adjusters) adjusters.classList.remove('hidden');
  } else {
    status.textContent = isAnyActive ? `${t('inService')} (${state.activeTimer.date})` : t('readyToStart');
    status.style.color = '';
    display.textContent = '00:00:00';
    mainBtn.className = 'btn btn-primary btn-round mt-5';
    mainIcon.className = 'fa-solid fa-play text-3xl mb-1';
    mainLabel.textContent = t('start');
    sub.textContent = '—';
    const pendingStudies = getPendingStudiesForDate(currentTimerDate);
    document.getElementById('timerStudyCount').textContent = pendingStudies;
    if (studiesHint) studiesHint.textContent = t('studiesHintReady');
    if (studyOnlySave) studyOnlySave.classList.toggle('hidden', pendingStudies <= 0);
    const noteInlineElInactive = document.getElementById('timerNoteInline');
    if (noteInlineElInactive) noteInlineElInactive.value = '';
    studiesPanel.classList.toggle('hidden', isAnyActive);
    document.getElementById('timerNotePanel').classList.add('hidden');
    if (adjusters) adjusters.classList.add('hidden');
  }
  renderCategoryChipRow();

  const dayMins = getDayMinutes(currentTimerDate);
  document.getElementById('timerDaySummary').textContent = formatHM(dayMins);

  // Plan chip
  const planChip = document.getElementById('timerPlanChip');
  const planMins = getPlannedForDate(currentTimerDate);
  const dailyGoal = Math.round(state.dailyGoalHrs * 60);
  const target = planMins > 0 ? planMins : dailyGoal;
  if (planMins > 0) {
    planChip.innerHTML = `<i class="fa-solid fa-bullseye"></i> ${t('plannedHours')}: ${formatHM(planMins)}`;
    planChip.className = 'chip chip-blue mt-4';
  } else {
    planChip.innerHTML = `<i class="fa-solid fa-bullseye"></i> ${t('setPlanned')}`;
    planChip.className = 'chip mt-4';
  }
  planChip.onclick = () => openPlanModal(currentTimerDate);

  // Remaining display when idle
  const rem = document.getElementById('timerRemaining');
  if (!isActiveHere && target > 0) {
    const remaining = target - dayMins;
    if (remaining > 0) {
      rem.textContent = `${formatHM(remaining)} ${t('remaining')}`;
      rem.className = 'text-sm font-mono font-bold text-blue mt-1';
    } else if (dayMins > 0) {
      rem.textContent = `+${formatHM(-remaining)} ${t('over')}`;
      rem.className = 'text-sm font-mono font-bold text-accent mt-1';
    } else rem.textContent = '';
  } else if (!isActiveHere) rem.textContent = '';

  // Sessions list
  const list = document.getElementById('timerSessionsList');
  const sessions = getSessionsForDate(currentTimerDate).sort((a,b) => a.startISO.localeCompare(b.startISO));
  if (!sessions.length) {
    list.innerHTML = `<div class="card-flat text-center text-faint text-sm">${t('empty')}</div>`;
  } else {
    list.innerHTML = sessions.map(sessionCardHTML).join('');
    list.querySelectorAll('[data-edit-session]').forEach(el => {
      el.onclick = () => openEditSessionModal(el.dataset.editSession);
    });
  }
}
function renderCategoryChipRow() {
  const wrap = document.getElementById('timerCategoryChips');
  if (!wrap) return;
  const isActive = !!state.activeTimer && state.activeTimer.date === currentTimerDate;
  const selectedId = isActive ? state.activeTimer.category : pendingCategory;
  wrap.innerHTML = (state.categories || []).map(c => {
    const sel = c.id === selectedId;
    return `<button class="cat-chip ${sel ? 'selected' : ''}" data-cat-pick="${c.id}">${sel ? '<i class="fa-solid fa-check"></i>' : ''}${escapeHtml(categoryLabel(c.id))}</button>`;
  }).join('');
  wrap.querySelectorAll('[data-cat-pick]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.catPick;
      if (state.activeTimer && state.activeTimer.date === currentTimerDate) {
        state.activeTimer.category = id;
        saveState();
      } else {
        pendingCategory = id;
      }
      vibrate(10);
      renderCategoryChipRow();
    };
  });
}

function sessionCardHTML(s) {
  const startT = new Date(s.startISO).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const stopT = new Date(s.stopISO).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  const cat = isRolloverSession(s) ? t('rolloverLabel') : categoryLabel(s.category);
  const studies = s.studies ? `<span class="chip chip-amber" style="padding:2px 8px; font-size:10px;"><i class="fa-solid fa-book"></i>${s.studies}</span>` : '';
  const note = s.note ? `<div class="text-xs text-faint mt-2" style="font-style:italic;">"${escapeHtml(s.note)}"</div>` : '';
  return `
    <button class="session-row" data-edit-session="${s.id}">
      <div class="row-between items-start gap-3">
        <div class="flex-1 min-w-0">
          <div class="row gap-2 flex-wrap">
            <span class="font-mono text-sm font-semibold">${startT} – ${stopT}</span>
            <span class="chip chip-accent" style="padding:2px 8px; font-size:10px;">${escapeHtml(cat)}</span>
            ${studies}
          </div>
          ${note}
        </div>
        <div class="text-right">
          <div class="font-mono font-bold text-accent text-base">${formatHM(s.durationMin)}</div>
        </div>
      </div>
    </button>`;
}
function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

/* ---------- CALENDAR ---------- */
function calGoMonth(delta) {
  const [y,m] = currentCalMonth.split('-').map(Number);
  currentCalMonth = monthKey(new Date(y, m - 1 + delta, 1));
  const grid = document.getElementById('calGrid');
  if (grid) {
    grid.classList.remove('cal-slide-in-left', 'cal-slide-in-right');
    // Force reflow so the animation restarts cleanly
    void grid.offsetWidth;
    grid.classList.add(delta > 0 ? 'cal-slide-in-right' : 'cal-slide-in-left');
  }
  renderCalendar();
  vibrate(8);
}

function renderCalendar() {
  // Today's Plan countdown card (G) — show only if today has a plan
  const todayKey = todayStr();
  const planToday = getPlannedForDate(todayKey);
  const tpCard = document.getElementById('todayPlanCard');
  if (tpCard) {
    if (planToday > 0) {
      const actualToday = getDayMinutes(todayKey);
      const remaining = Math.max(0, planToday - actualToday);
      const pct = planToday > 0 ? Math.min(100, Math.round((actualToday / planToday) * 100)) : 0;
      tpCard.classList.remove('hidden');
      document.getElementById('todayPlanDate').textContent = new Date().toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      const remEl = document.getElementById('todayPlanRemaining');
      const labelEl = document.getElementById('lbl_todayPlanRemainingLabel');
      const pill = document.getElementById('todayPlanStatusPill');
      if (actualToday >= planToday) {
        remEl.textContent = '✓';
        remEl.style.color = 'var(--accent)';
        labelEl.textContent = t('todayPlanDone');
        pill.className = 'chip chip-accent text-tiny';
        if (actualToday > planToday * 1.05) {
          pill.textContent = t('todayPlanOver');
        } else {
          pill.textContent = t('todayPlanComplete');
        }
      } else {
        remEl.textContent = formatHM(remaining);
        remEl.style.color = 'var(--blue)';
        labelEl.textContent = t('todayPlanRemaining');
        pill.className = 'chip chip-blue text-tiny';
        pill.textContent = t('todayPlanInProgress');
      }
      animateMinutesTo('todayPlanActual', actualToday);
      document.getElementById('todayPlanGoal').textContent = formatHM(planToday); // goal rarely changes; snap
      animateNumberTo('todayPlanPct', pct, 520, v => v + '%');
      const bar = document.getElementById('todayPlanBar');
      bar.style.width = pct + '%';
      bar.style.background = actualToday >= planToday ? 'var(--accent)' : 'var(--blue)';
    } else {
      tpCard.classList.add('hidden');
    }
  }

  const [yr, mo] = currentCalMonth.split('-').map(Number);
  const monthDate = new Date(yr, mo-1, 1);
  document.getElementById('calMonthLabel').textContent = `${t('months')[mo-1]} ${yr}`;

  const wd = state.weekStartsMon ? t('weekdaysMon') : t('weekdaysSun');
  document.getElementById('calWeekdays').innerHTML = wd.map(d => `<div style="padding:4px 0;">${d}</div>`).join('');

  const grid = document.getElementById('calGrid');
  const firstDow = monthDate.getDay();
  const offset = state.weekStartsMon ? (firstDow === 0 ? 6 : firstDow - 1) : firstDow;
  const totalDays = daysInMonth(yr, mo-1);
  const cells = [];
  // Stage F — dates that have notes (dot indicators)
  const noteDates = new Set();
  (state.ministryNotes || []).forEach(n => {
    if (n.dueDate) noteDates.add(n.dueDate);
    const created = ministryNotePrimaryDate(n);
    if (created) noteDates.add(created);
  });
  for (let i = 0; i < offset; i++) cells.push('<div class="cal-cell empty"></div>');
  const today = todayStr();
  const dailyGoal = Math.round(state.dailyGoalHrs * 60);

  for (let day = 1; day <= totalDays; day++) {
    const ds = `${yr}-${String(mo).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const actual = getDayMinutes(ds);
    const planned = getPlannedForDate(ds);
    const isToday = ds === today;
    const isPast = ds < today;
    const isSelected = ds === adjustSelectedDate;
    const target = planned > 0 ? planned : dailyGoal;
    let cls = 'cal-cell';
    if (isToday) cls += ' today';
    if (isPast) cls += ' past'; // subtle shading for past days (only affects neutral cells via CSS)
    if (isSelected) cls += ' selected';
    // Simplified palette (G):
    //   green (met) = met plan OR met daily goal (per spec)
    //   red   (missed) = past day with plan and actual < plan
    //   blue  (planned) = future day with a plan
    //   neutral = otherwise
    if (target > 0 && actual >= target) {
      cls += ' met';
    } else if (planned > 0 && isPast && actual < planned) {
      cls += ' missed';
    } else if (planned > 0 && !isPast && !isToday) {
      cls += ' planned';
    }

    const actualLine = actual > 0 ? `<div class="cal-actual">${formatHM(actual)}</div>` : '';
    const plannedLine = planned > 0 ? `<div class="cal-planned">/ ${formatHM(planned)}</div>` : '';
    cells.push(`<button class="${cls}" data-cal-day="${ds}"><div class="cal-num">${day}</div><div>${actualLine}${plannedLine}</div>${noteDates.has(ds)?'<span class="cal-note-dot"></span>':''}</button>`);
  }
  grid.innerHTML = cells.join('');
  grid.querySelectorAll('[data-cal-day]').forEach(el => {
    el.onclick = () => {
      adjustSelectedDate = el.dataset.calDay;
      renderCalendar();
      renderAdjustCard();
      // Scroll the Adjust card into view smoothly
      setTimeout(() => {
        const card = document.getElementById('adjustTimeCard');
        if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
      vibrate(8);
    };
  });

  const actualMonth = getMonthMinutes(currentCalMonth);
  const plannedMonth = getMonthPlannedTotal(currentCalMonth);
  const goal = Math.round(state.monthlyGoalHrs * 60);
  document.getElementById('calMonthSummary').textContent = `${formatHM(actualMonth)} / ${formatHM(goal)}`;
  document.getElementById('calPlannedVal').textContent = formatHM(plannedMonth);
  document.getElementById('calActualVal').textContent = formatHM(actualMonth);
  document.getElementById('calGoalVal').textContent = formatHM(goal);
  document.getElementById('calPlannedBar').style.width = (goal ? Math.min(100, (plannedMonth/goal)*100) : 0) + '%';
  document.getElementById('calActualBar').style.width = (goal ? Math.min(100, (actualMonth/goal)*100) : 0) + '%';
  const delta = plannedMonth - goal;
  const dEl = document.getElementById('calPlannedDelta');
  if (delta >= 0) { dEl.textContent = `+${formatHM(delta)}`; dEl.className = 'font-mono font-bold text-sm text-accent'; }
  else { dEl.textContent = formatHM(delta); dEl.className = 'font-mono font-bold text-sm text-coral'; }

  // Render the Adjust Time card with the selected day
  renderCalendarNotesPanel();
  renderAdjustCard();
}

/* ---------- ADJUST TIME CARD ---------- */
function renderAdjustCard() {
  const date = adjustSelectedDate || todayStr();
  const d = fromYmd(date);
  const dateLabel = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
  const labelEl = document.getElementById('adjDateLabel');
  if (labelEl) labelEl.textContent = dateLabel;
  const dateInput = document.getElementById('adjDateInput');
  if (dateInput) dateInput.value = date;

  const total = getDayMinutes(date);
  const planned = getPlannedForDate(date);
  document.getElementById('adjTotalDisplay').textContent = formatHM(total);

  // Planned note
  const planEl = document.getElementById('adjPlannedNote');
  if (planEl) {
    if (planned > 0) {
      const diff = total - planned;
      if (diff >= 0) {
        planEl.innerHTML = `<i class="fa-solid fa-bullseye text-blue"></i> ${t('plannedHours')}: ${formatHM(planned)} <span style="color:var(--accent);"> (+${formatHM(diff)})</span>`;
      } else {
        planEl.innerHTML = `<i cl…29076 tokens truncated…ng-wider text-dim font-bold">${t('newTotalAfter')}</div>
          <div id="qaPreviewTotal" class="display-num text-lg font-mono text-blue">0:00</div>
        </div>
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('addStudies')}</div>
        <input type="number" id="qaStudies" min="0" value="${Math.max(0, parseInt(draft.studies) || 0)}" />
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('addNote')}</div>
        <textarea id="qaNote" rows="2" maxlength="500">${escapeHtml(draft.note || '')}</textarea>
      </div>

      <div class="row gap-2">
        <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
        <button class="btn btn-primary flex-1" id="qaSave">${t('save')}</button>
      </div>
    </div>`);

  // Working state
  let qaMode = draft.mode === 'set' ? 'set' : 'add';       // 'add' or 'set'
  let qaDurMin = Math.max(0, parseInt(draft.durationMin) || 0);         // blank until the user enters time

  function getCurrentLogged() {
    const date = document.getElementById('qaDate').value;
    return getDayMinutes(date);
  }
  function refreshCurrent() {
    const cur = getCurrentLogged();
    document.getElementById('qaCurrentTotal').textContent = formatHM(cur);
    refreshPreview();
  }
  function refreshPreview() {
    const cur = getCurrentLogged();
    const preview = document.getElementById('qaPreviewBox');
    const previewTotal = document.getElementById('qaPreviewTotal');
    if (qaMode === 'add') {
      preview.style.display = '';
      previewTotal.textContent = formatHM(cur + qaDurMin);
      previewTotal.style.color = 'var(--blue)';
    } else {
      // set mode
      preview.style.display = '';
      previewTotal.textContent = formatHM(qaDurMin);
      if (qaDurMin < cur) {
        previewTotal.style.color = 'var(--coral)';
      } else {
        previewTotal.style.color = 'var(--blue)';
      }
    }
  }
  function applyMode() {
    document.querySelectorAll('[data-qa-mode]').forEach(b => {
      b.classList.toggle('active', b.dataset.qaMode === qaMode);
    });
    const label = document.getElementById('qaDurationLabel');
    const help = document.getElementById('qaDurationHelp');
    label.textContent = qaMode === 'add' ? t('addAmount') : t('newTotal');
    if (help) help.textContent = qaMode === 'add' ? t('addAmountHelp') : t('setTotalHelp');
    // Switching to "set" pre-fills with current logged so the wheel starts somewhere sensible
    if (qaMode === 'set') {
      if (!draft || draft.durationMin === undefined) qaDurMin = getCurrentLogged();
      document.getElementById('qaDuration').textContent = qaDurMin > 0 ? formatHM(qaDurMin) : '';
    } else {
      if (!draft || draft.durationMin === undefined) qaDurMin = 0;
      document.getElementById('qaDuration').textContent = qaDurMin > 0 ? formatHM(qaDurMin) : '';
    }
    refreshPreview();
  }

  document.querySelectorAll('[data-qa-mode]').forEach(b => {
    b.onclick = () => { qaMode = b.dataset.qaMode; applyMode(); vibrate(8); };
  });
  function readQuickAddDraft() {
    return {
      date: document.getElementById('qaDate').value || dateStr,
      mode: qaMode,
      durationMin: qaDurMin,
      category: document.getElementById('qaCat').value,
      studies: parseInt(document.getElementById('qaStudies').value) || 0,
      note: document.getElementById('qaNote').value || ''
    };
  }
  document.getElementById('qaDate').onchange = refreshCurrent;
  document.getElementById('qaDurationTile').onclick = () => {
    const nextDraft = readQuickAddDraft();
    openDurationWheel(qaDurMin, (newMin) => {
      nextDraft.durationMin = newMin;
      setTimeout(() => openQuickAddModal(nextDraft.date, nextDraft), 80);
    });
  };
  document.getElementById('qaViewSessions').onclick = () => {
    const date = document.getElementById('qaDate').value;
    closeModal();
    setTimeout(() => openCalendarDayModal(date), 100);
  };

  // Initial render
  if (draft.category) document.getElementById('qaCat').value = draft.category;
  document.getElementById('qaDuration').textContent = qaDurMin > 0 ? formatHM(qaDurMin) : '';
  applyMode();
  refreshCurrent();
  refreshPreview();

  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('qaSave').onclick = () => {
    const date = document.getElementById('qaDate').value;
    if (!date) { toast(t('invalidJson')); return; }
    const qaStudiesVal = parseInt(document.getElementById('qaStudies').value) || 0;
    if (qaDurMin <= 0 && qaMode === 'add' && qaStudiesVal <= 0) { toast(t('enterTimeRequired')); return; }
    if (qaDurMin <= 0 && qaMode === 'set' && getDayMinutes(date) <= 0 && qaStudiesVal <= 0) { toast(t('enterTimeRequired')); return; }

    const cur = getDayMinutes(date);

    if (qaMode === 'set') {
      // Set total = pick a value; if lower than current, block with escape hatch
      if (qaDurMin < cur) {
        openModal(`
          <div class="text-center">
            <div class="font-bold text-lg mb-2">${t('setLowerTitle')}</div>
            <div class="text-sm text-dim mb-4">${t('setLowerMsg').replace('{cur}', formatHM(cur)).replace('{target}', formatHM(qaDurMin))}</div>
            <div class="stack-2">
              <button class="btn btn-primary w-full" id="setLowerOpen">${t('openSessionsBtn')}</button>
              <button class="btn btn-secondary w-full" data-close-modal>${t('cancel')}</button>
            </div>
          </div>`);
        document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
        document.getElementById('setLowerOpen').onclick = () => { closeModal(); setTimeout(() => openCalendarDayModal(date), 100); };
        return;
      }
      // Set total: add a session for the difference
      const diff = qaDurMin - cur;
      if (diff === 0) { toast(t('nothingToAdd')); closeModal(); return; }
      addSessionForDate(date, diff,
        document.getElementById('qaCat').value,
        document.getElementById('qaNote').value.trim(),
        parseInt(document.getElementById('qaStudies').value) || 0);
    } else {
      // Add mode: just add the chosen amount
      addSessionForDate(date, qaDurMin,
        document.getElementById('qaCat').value,
        document.getElementById('qaNote').value.trim(),
        parseInt(document.getElementById('qaStudies').value) || 0);
    }
    const chosenCat = document.getElementById('qaCat').value;
    if (chosenCat) state.lastUsedCategory = chosenCat;
    saveState(); vibrate(15); closeModal(); renderAll(); toast(t('save'));
  };
}

// Helper: add a session of `mins` minutes for a given date, with default times
function addSessionForDate(date, mins, category, note, studies) {
  // Allow zero-minute sessions only if studies > 0 (lets you log a study without adding time)
  if (mins <= 0 && (!studies || studies <= 0)) return;
  mins = Math.max(0, mins);
  const d = fromYmd(date);
  // Anchor the session at noon on that date — picks an arbitrary but valid time
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0);
  const stop = new Date(start.getTime() + mins * 60000);
  state.sessions.push({
    id: 's_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
    date,
    startISO: start.toISOString(),
    stopISO: stop.toISOString(),
    durationMin: mins,
    category: category || (state.categories[0] || { id: 'regular' }).id,
    note: note || '',
    studies: studies || 0,
  });
  state.sessionsSinceLastBackup = (state.sessionsSinceLastBackup || 0) + 1;
}

// Deduct `mins` minutes from a day by shrinking/removing the most recent sessions
function deductFromDay(date, mins) {
  if (mins <= 0) return;
  const sessions = state.sessions
    .filter(s => s.date === date && s.stopISO)
    .sort((a, b) => b.startISO.localeCompare(a.startISO)); // newest first
  let remaining = mins;
  for (const s of sessions) {
    if (remaining <= 0) break;
    if (s.durationMin <= remaining) {
      // Remove the entire session
      remaining -= s.durationMin;
      const idx = state.sessions.findIndex(x => x.id === s.id);
      if (idx !== -1) state.sessions.splice(idx, 1);
    } else {
      // Shrink: shorten by `remaining` minutes (move stopISO earlier)
      const newDur = s.durationMin - remaining;
      const newStop = new Date(new Date(s.startISO).getTime() + newDur * 60000);
      s.stopISO = newStop.toISOString();
      s.durationMin = newDur;
      remaining = 0;
    }
  }
}

function openCategoryPicker(currentCat, onPick) {
  openModal(`
    <div class="row-between items-center mb-4">
      <div class="font-bold text-xl">${t('selectCategory')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="cat-chip-grid">
      ${state.categories.map(c => {
        const sel = c.id === currentCat;
        return `<button class="cat-chip ${sel ? 'selected' : ''}" data-cat="${c.id}">${sel ? '<i class="fa-solid fa-check"></i>' : ''}${escapeHtml(categoryLabel(c.id))}</button>`;
      }).join('')}
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => { vibrate(10); onPick(b.dataset.cat); closeModal(); });
}

function openCategoryEditModal(catId) {
  const cat = catId === '__new__' ? { id: '', label_en: '', label_es: '' } : state.categories.find(c => c.id === catId);
  if (!cat && catId !== '__new__') return;
  const isNew = catId === '__new__';
  openModal(`
    <div class="row-between items-center mb-4">
      <div class="font-bold text-xl">${isNew ? t('addCat') : t('edit')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="stack-4">
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('catNameLabel')}</div>
        <input type="text" id="catEditEn" value="${escapeHtml(cat.label_en || '')}" placeholder="e.g. Conducting" maxlength="40" />
      </div>
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('catNameLabelEs')}</div>
        <input type="text" id="catEditEs" value="${escapeHtml(cat.label_es || '')}" placeholder="ej. Conducir" maxlength="40" />
      </div>
      <div class="row gap-2">
        <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
        <button class="btn btn-primary flex-1" id="catEditSave">${t('save')}</button>
      </div>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('catEditSave').onclick = () => {
    const en = document.getElementById('catEditEn').value.trim();
    const es = document.getElementById('catEditEs').value.trim() || en;
    if (!en) { toast(t('invalidName')); return; }
    if (isNew) {
      const newId = 'cat_' + Date.now();
      state.categories.push({ id: newId, label_en: en, label_es: es });
    } else {
      cat.label_en = en; cat.label_es = es;
    }
    saveState(); closeModal(); renderAll(); toast(t('save'));
  };
}

function deleteCategory(catId) {
  if (state.categories.length <= 1) { toast(t('cantDeleteLast')); return; }
  openConfirmModal(t('catDeleteWarn'), () => {
    state.categories = state.categories.filter(c => c.id !== catId);
    if (state.lastUsedCategory === catId) state.lastUsedCategory = null;
    saveState(); renderAll(); toast(t('delete'));
  }, { confirmLabel: t('delete'), danger: true });
}

function openConfirmCloseTimer() {
  openModal(`
    <div class="text-center">
      <div class="font-bold text-xl mb-1">${t('timerRunning')}</div>
      <div class="text-sm text-faint mb-5 font-mono">${state.activeTimer.date}</div>
      <div class="stack-2">
        <button class="btn btn-primary w-full" data-act="save">${t('saveStop')}</button>
        <button class="btn btn-secondary w-full" data-act="keep">${t('keepRunning')}</button>
        <button class="btn btn-coral w-full" data-act="discard">${t('discard')}</button>
      </div>
    </div>`);
  document.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    const a = b.dataset.act;
    if (a === 'save') stopTimer({ save: true });
    else if (a === 'discard') stopTimer({ save: false });
    closeModal();
  });
}

function openNoteModal() {
  if (!state.activeTimer) return;
  openModal(`
    <div class="font-bold text-xl mb-4">${t('addNote')}</div>
    <textarea id="noteInput" rows="3" maxlength="500" placeholder="...">${escapeHtml(state.activeTimer.note || '')}</textarea>
    <div class="row gap-2 mt-4">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="noteSave">${t('save')}</button>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('noteSave').onclick = () => {
    if (state.activeTimer) { state.activeTimer.note = document.getElementById('noteInput').value.trim(); saveState(); }
    closeModal(); renderTimer();
  };
}

function openCreditEditModal() {
  const mk = currentReportMonth;
  const [y, m] = mk.split('-').map(Number);
  const monthName = t('months')[m-1];
  const current = getMonthCredit(mk);
  const hrs = current ? (current/60).toFixed(2).replace(/\.?0+$/, '') : '';
  openModal(`
    <div class="row-between items-center mb-4">
      <div>
        <div class="font-bold text-xl">${t('editCredit')}</div>
        <div class="text-xs text-faint mt-1">${monthName} ${y}</div>
      </div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="text-sm text-dim mb-4">${t('creditDesc')}</div>
    <div>
      <div class="text-xs font-bold uppercase text-dim mb-2">${t('creditHours')}</div>
      <input type="number" id="creditInput" step="0.25" min="0" max="200" value="${hrs}" placeholder="e.g. 10" />
    </div>
    <div class="row gap-2 mt-5">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="creditSave">${t('save')}</button>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('creditSave').onclick = () => {
    const h = parseFloat(document.getElementById('creditInput').value) || 0;
    const mins = Math.round(h * 60);
    state.creditEntries = state.creditEntries || [];
    state.creditByMonth = state.creditByMonth || {};
    state.creditEntries = (state.creditEntries || []).filter(e => !e.date || !e.date.startsWith(mk));
    if (mins > 0) {
      state.creditEntries.push({
        id: 'c_manual_month_' + mk,
        date: mk + '-01',
        minutes: mins,
        type: 'manualMonthlyCredit',
        note: 'Manual monthly credit total',
        updatedAt: new Date().toISOString(),
      });
      state.creditByMonth[mk] = mins;
    } else {
      delete state.creditByMonth[mk];
    }
    saveState(); closeModal(); renderAll(); toast(t('save'));
  };
}

/* ===== EXPORT / IMPORT (multi-device safe) ===== */
function buildBackupData() {
  return {
    ...state,
    _archives: getAllArchives(),
    _exportedAt: new Date().toISOString(),
  };
}
/* ===== BACKUP REMINDER SYSTEM ===== */
const BACKUP_OVERDUE_DAYS = 30;
const BACKUP_URGENT_SESSIONS = 10;

function getBackupStatus() {
  const last = state.lastBackupISO ? new Date(state.lastBackupISO) : null;
  const daysSince = last ? Math.floor((Date.now() - last.getTime())/86400000) : 999;
  const newSessions = state.sessionsSinceLastBackup || 0;
  const isOverdue = daysSince >= BACKUP_OVERDUE_DAYS;
  const isUrgent = isOverdue && newSessions >= BACKUP_URGENT_SESSIONS;
  return { last, daysSince, newSessions, isOverdue, isUrgent };
}

function shouldShowBackupPopup() {
  if (!state.backupReminder) return false;
  if (!state.sessions || state.sessions.length === 0) return false; // nothing to back up
  const s = getBackupStatus();
  return s.isOverdue;
}

function openBackupReminderModal() {
  const s = getBackupStatus();
  const lastLabel = s.last
    ? s.last.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : t('never');
  const urgentBadge = s.isUrgent
    ? `<div style="background:var(--coral); color:white; padding:4px 12px; border-radius:999px; font-size:11px; font-weight:700; display:inline-block; margin-bottom:8px;">${t('urgentLabel')}</div>`
    : '';
  openModal(`
    <div class="text-center">
      ${urgentBadge}
      <div style="font-size:48px; margin-bottom:8px;">
        <i class="fa-solid fa-cloud-arrow-up" style="color: ${s.isUrgent ? 'var(--coral)' : 'var(--amber)'};"></i>
      </div>
      <div class="font-bold text-xl mb-2">${t('backupReminderTitle')}</div>
      <div class="text-sm text-dim mb-4">
        ${t('backupLastLabel')}: <strong>${escapeHtml(lastLabel)}</strong> · ${s.daysSince} ${t('daysAgoLabel')}<br/>
        ${s.newSessions} ${t('newSessionsSinceBackup')}
      </div>
      <div class="text-sm text-dim mb-5" style="line-height:1.4;">
        ${t('backupWhyText')}
      </div>
      <div class="stack-2">
        <button class="btn btn-primary w-full" id="bkpNow">
          <i class="fa-solid fa-arrow-up-from-bracket"></i>
          <span>${t('backupNowBtn')}</span>
        </button>
        <button class="btn btn-secondary w-full" id="bkpSkip">${t('backupSkipBtn')}</button>
      </div>
      <div class="text-tiny text-faint mt-3">${t('backupSkipHint')}</div>
    </div>`);
  document.getElementById('bkpNow').onclick = () => { closeModal(); setTimeout(() => openExportModal(), 100); };
  document.getElementById('bkpSkip').onclick = () => {
    state.backupBannerDismissed = true;
    saveState();
    closeModal();
    renderBackupBanner();
  };
}

// Persistent banner shown after dismissal
function renderBackupBanner() {
  const existing = document.getElementById('backupBanner');
  const s = getBackupStatus();
  const shouldShow = state.backupReminder && state.backupBannerDismissed && s.isOverdue && state.sessions.length > 0;
  if (!shouldShow) {
    if (existing) existing.remove();
    return;
  }
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'backupBanner';
  banner.className = 'backup-banner';
  banner.innerHTML = `
    <div class="row gap-2 min-w-0" style="align-items:center;">
      <i class="fa-solid fa-cloud-arrow-up" style="font-size:16px;"></i>
      <div class="min-w-0 flex-1">
        <div class="text-xs font-bold uppercase tracking-wider">${t('backupOverdueShort')}</div>
        <div class="text-tiny" style="opacity:0.92;">${s.daysSince}${t('daysShort')} · ${s.newSessions} ${t('newShort')}</div>
      </div>
    </div>
    <button class="banner-stop-btn" id="bkpBannerBtn">
      <i class="fa-solid fa-arrow-up-from-bracket"></i> ${t('backupBtnShort')}
    </button>`;
  document.body.appendChild(banner);
  document.getElementById('bkpBannerBtn').onclick = () => openExportModal();
}

function openExportModal() {
  const data = JSON.stringify(buildBackupData(), null, 2);
  const filename = `ministry-tracker-backup.json`;
  openModal(`
    <div class="row-between items-center mb-2">
      <div class="font-bold text-xl">${t('backupShareTitle')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="text-sm text-dim mb-4">${t('backupShareHint')}</div>
    <div class="stack-2 mb-4">
      <button class="btn btn-primary w-full" id="exDownload">
        <i class="fa-solid fa-arrow-down-to-bracket"></i>
        <span>${t('saveToFile')}</span>
      </button>
      <button class="btn btn-secondary w-full" id="exImport">
        <i class="fa-solid fa-folder-open text-blue"></i>
        <span>${t('importFile')}</span>
      </button>
      <button class="btn btn-secondary w-full" id="exShareNote">
        <i class="fa-solid fa-share-nodes text-purple"></i>
        <span>${t('shareNote')}</span>
      </button>
    </div>
    <details>
      <summary class="text-xs text-faint" style="cursor:pointer;">${t('rawJsonLabel')}</summary>
      <textarea id="exJsonText" rows="6" readonly style="font-family:'JetBrains Mono',monospace; font-size:10px; margin-top:8px;">${escapeHtml(data)}</textarea>
      <button class="btn btn-secondary w-full mt-2" id="exCopyRaw" style="font-size: 12px;">
        <i class="fa-solid fa-copy"></i><span>${t('exportCopy')}</span>
      </button>
    </details>
    <div class="text-tiny text-faint mt-3 font-mono text-center">${escapeHtml(filename)}</div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);

  const markBackup = () => {
    state.lastBackupISO = new Date().toISOString();
    state.sessionsSinceLastBackup = 0;
    state.backupBannerDismissed = false;
    saveState(); renderSettings(); renderAll();
  };

  // Save to file: produces ministry-tracker-backup.json
  document.getElementById('exDownload').onclick = () => {
    try {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.style.display = 'none';
      document.body.appendChild(a); a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 300);
      markBackup(); toast(t('exported'));
    } catch(e) { toast('Save failed — use Copy below as a fallback'); }
  };

  // Import file: prompts confirmation, then triggers file picker
  document.getElementById('exImport').onclick = () => {
    closeModal();
    setTimeout(() => {
      openConfirmModal(t('importConfirmMsg'), () => {
        document.getElementById('importFile').click();
      }, { confirmLabel: t('importBtn'), danger: true });
    }, 120);
  };

  // Share note: shares the monthly report text (NOT the JSON), via picker
  document.getElementById('exShareNote').onclick = () => {
    closeModal();
    setTimeout(() => {
      const text = buildReportText(currentReportMonth || monthKey(new Date()));
      openShareTextPicker(text);
    }, 120);
  };

  // Hidden in collapsible: copy raw JSON for power users
  document.getElementById('exCopyRaw').onclick = async () => {
    try {
      await navigator.clipboard.writeText(data);
      markBackup(); toast(t('copied'));
    } catch(e) {
      const ta = document.getElementById('exJsonText');
      ta.removeAttribute('readonly');
      ta.focus(); ta.select();
      try { document.execCommand('copy'); markBackup(); toast(t('copied')); }
      catch(e2) { toast('Copy failed — select the text manually'); }
      ta.setAttribute('readonly', '');
    }
  };
}

function importJSONFromText(text) {
  try {
    const obj = JSON.parse(text);
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.sessions)) throw new Error('bad');
    // Restore archives if present
    if (obj._archives && typeof obj._archives === 'object') {
      Object.entries(obj._archives).forEach(([k, v]) => {
        try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){ /* ignore */ }
      });
    }
    // Strip private fields and merge
    const { _archives, _exportedAt, ...rest } = obj;
    state = { ...APP_CONFIG.defaults, ...rest };
    if (!Array.isArray(state.creditEntries)) state.creditEntries = [];
    saveState(); applyTheme(); renderAll(); toast(t('importSuccess'));
    return true;
  } catch(e) { toast(t('invalidJson')); return false; }
}
function importJSON(file) {
  const reader = new FileReader();
  reader.onload = (e) => importJSONFromText(e.target.result);
  reader.readAsText(file);
}
function openImportChoiceModal() {
  openModal(`
    <div class="row-between items-center mb-2">
      <div class="font-bold text-xl">${t('importBtn')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="text-sm text-dim mb-4">${t('importHint')}</div>
    <div class="stack-2">
      <button class="btn btn-primary w-full" id="impPickFile"><i class="fa-solid fa-folder-open"></i><span>${t('importBtn')}</span></button>
      <button class="btn btn-secondary w-full" id="impPasteText"><i class="fa-solid fa-paste"></i><span>${t('pasteImportBtn')}</span></button>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('impPickFile').onclick = () => {
    closeModal();
    setTimeout(() => document.getElementById('importFile').click(), 100);
  };
  document.getElementById('impPasteText').onclick = () => {
    closeModal();
    setTimeout(() => openPasteImportModal(), 100);
  };
}

function openPasteImportModal() {
  openModal(`
    <div class="font-bold text-xl mb-2">${t('pasteImportTitle')}</div>
    <div class="text-sm text-dim mb-4">${t('pasteImportHint')}</div>
    <textarea id="pasteImportText" rows="8" placeholder='{"sessions": ...}' style="font-family:'JetBrains Mono',monospace; font-size:11px;"></textarea>
    <div class="row gap-2 mt-4">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="pasteBtn"><i class="fa-solid fa-arrow-down-to-bracket"></i>${t('importLabel')}</button>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('pasteBtn').onclick = () => {
    const txt = document.getElementById('pasteImportText').value.trim();
    if (!txt) { toast(t('invalidJson')); return; }
    if (importJSONFromText(txt)) closeModal();
  };
}
function buildReportText(mk) {
  const [y, m] = mk.split('-').map(Number);
  const monthName = t('months')[m-1];
  const mins = getMonthMinutes(mk);
  const studies = getMonthStudies(mk);
  const credit = getMonthCredit(mk);
  const serviceDays = getMonthServiceDays(mk);
  const dateStamp = new Date().toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${t('reportText')} — ${monthName} ${y}\n\n${t('hours')}: ${formatHM(mins)}\n${t('creditHours')}: ${formatHM(credit)}\n${t('studies')}: ${studies}\n${t('serviceDays')}: ${serviceDays}\n\n— ${dateStamp}`;
}

// Small picker for sharing report text: lets user choose Messages/Mail/etc. OR Copy.
// Copy bypasses iOS Share Sheet entirely, avoiding the "Save to Files → .txt" path.
function openShareTextPicker(text) {
  const canShare = !!navigator.share;
  openModal(`
    <div class="row-between items-center mb-2">
      <div class="font-bold text-xl">${t('shareReportTitle')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="text-sm text-dim mb-3">${t('shareReportHint')}</div>
    <textarea readonly rows="6" style="font-family:'JetBrains Mono',monospace; font-size:11px; margin-bottom:12px;">${escapeHtml(text)}</textarea>
    <div class="stack-2">
      <button class="btn btn-primary w-full" id="shareCopyBtn"><i class="fa-solid fa-copy"></i><span>${t('exportCopy')}</span></button>
      ${canShare ? `<button class="btn btn-secondary w-full" id="shareSendBtn"><i class="fa-solid fa-share-nodes"></i><span>${t('shareReportSend')}</span></button>` : ''}
    </div>
  `);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);

  document.getElementById('shareCopyBtn').onclick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('copied'));
      closeModal();
    } catch(e) {
      // Fallback: select the textarea
      const ta = document.querySelector('.modal-body textarea');
      if (ta) { ta.focus(); ta.select(); try { document.execCommand('copy'); toast(t('copied')); closeModal(); } catch(e2){ /* ignore */ } }
    }
  };

  const sendBtn = document.getElementById('shareSendBtn');
  if (sendBtn) sendBtn.onclick = async () => {
    try {
      await navigator.share({ title: t('monthlyReport'), text });
      closeModal();
    } catch(e) {
      if (e.name !== 'AbortError') toast('Share failed — use Copy instead');
    }
  };
}

/* ===== THEME / NAV ===== */
function resolveTheme() {
  // state.theme: 'light' | 'dark' | 'auto'
  if (state.theme === 'auto') {
    try {
      return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    } catch(e) { return 'light'; }
  }
  return state.theme === 'dark' ? 'dark' : 'light';
}
function applyTheme() {
  const resolved = resolveTheme();
  document.documentElement.setAttribute('data-theme', resolved);
  document.querySelector('meta[name=theme-color]').setAttribute('content', resolved === 'dark' ? '#07080C' : '#FFFFFF');
  const icon = document.getElementById('themeIcon');
  if (icon) {
    // Auto: show a "circle-half-stroke" hint; else sun/moon
    if (state.theme === 'auto') icon.className = 'fa-solid fa-circle-half-stroke';
    else icon.className = resolved === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}
// Listen for system theme changes (only meaningful when state.theme === 'auto')
try {
  const _mm = window.matchMedia('(prefers-color-scheme: dark)');
  if (_mm.addEventListener) _mm.addEventListener('change', () => { if (state.theme === 'auto') applyTheme(); });
  else if (_mm.addListener) _mm.addListener(() => { if (state.theme === 'auto') applyTheme(); });
} catch(e){ /* ignore */ }
const SCREEN_ORDER = ['home', 'timer', 'calendar', 'notes', 'reports', 'settings'];
function switchScreen(name) {
  const prevName = currentScreen;
  if (prevName !== name) previousScreen = prevName;
  currentScreen = name;
  const prevIdx = SCREEN_ORDER.indexOf(prevName);
  const nextIdx = SCREEN_ORDER.indexOf(name);
  // Direction: positive = moving right in tab order, negative = moving left
  // Settings is treated as "above" (slides up from bottom) since it's modal-ish.
  let dir = 0;
  if (prevIdx >= 0 && nextIdx >= 0 && prevName !== name) {
    if (name === 'settings') dir = 2;       // up (slide-from-bottom)
    else if (prevName === 'settings') dir = -2; // back down
    else dir = nextIdx > prevIdx ? 1 : -1;
  }
  document.querySelectorAll('.screen').forEach(s => {
    const isNew = s.id === 'screen-' + name;
    s.classList.toggle('active', isNew);
    // Reset any prior direction classes
    s.classList.remove('screen-slide-right', 'screen-slide-left', 'screen-slide-up', 'screen-slide-down');
    if (isNew && dir !== 0) {
      const cls = dir === 1 ? 'screen-slide-right'
                : dir === -1 ? 'screen-slide-left'
                : dir === 2 ? 'screen-slide-up'
                : dir === -2 ? 'screen-slide-down'
                : 'screen-slide-up';
      // Force reflow so the animation restarts cleanly
      void s.offsetWidth;
      s.classList.add(cls);
    }
  });
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.screen === name));
  renderAll();
}

/* ===== TOAST ===== */
let toastTimer;
function toast(msg, opts = {}) {
  clearTimeout(toastTimer);
  document.querySelectorAll('.toast').forEach(el => el.remove());
  const el = document.createElement('div');
  el.className = 'toast';
  if (opts.actionLabel && typeof opts.onAction === 'function') {
    const text = document.createElement('span');
    text.textContent = msg;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'toast-action';
    btn.textContent = opts.actionLabel;
    btn.onclick = () => {
      clearTimeout(toastTimer);
      el.remove();
      opts.onAction();
    };
    el.append(text, btn);
  } else {
    el.textContent = msg;
  }
  document.body.appendChild(el);
  toastTimer = setTimeout(() => el.remove(), opts.duration || 3200);
}
/* ===== EVENT WIRING ===== */
function wireEvents() {
  document.querySelectorAll('.nav-btn').forEach(b => b.onclick = () => switchScreen(b.dataset.screen));
  document.getElementById('langToggle').onclick = () => {
    state.lang = state.lang === 'en' ? 'es' : 'en'; saveState(); renderAll();
  };
  document.getElementById('themeToggle').onclick = () => {
    // Cycle: auto → light → dark → auto
    if (state.theme === 'auto') state.theme = 'light';
    else if (state.theme === 'light') state.theme = 'dark';
    else state.theme = 'auto';
    saveState(); applyTheme(); renderAll();
  };
  document.getElementById('homeQuickStart').onclick = () => {
    if (state.activeTimer) state.confirmClose ? openConfirmCloseTimer() : stopTimer({save: true});
    else { startTimer(todayStr()); switchScreen('timer'); }
  };
  document.getElementById('homeExportBtn').onclick = openExportModal;
  document.getElementById('homeImportBtn').onclick = openImportChoiceModal;
  document.querySelectorAll('[data-quick-add]').forEach(b => b.onclick = () => {
    const mins = +b.dataset.quickAdd;
    quickAddMinutes(mins);
  });
  document.getElementById('quickAddCustom').onclick = () => openQuickAddModal();
  document.getElementById('liveBannerStop').onclick = () => state.confirmClose ? openConfirmCloseTimer() : stopTimer({save: true});
  document.getElementById('timerSettings').onclick = () => switchScreen('settings');
  document.getElementById('homeSettingsBtn').onclick = () => switchScreen('settings');
  document.getElementById('settingsBackBtn').onclick = () => {
    const target = (previousScreen && previousScreen !== 'settings') ? previousScreen : 'home';
    switchScreen(target);
  };
  document.getElementById('timerDatePrev').onclick = () => { const d = fromYmd(currentTimerDate); d.setDate(d.getDate()-1); currentTimerDate = ymd(d); renderTimer(); };
  document.getElementById('timerDateNext').onclick = () => { const d = fromYmd(currentTimerDate); d.setDate(d.getDate()+1); currentTimerDate = ymd(d); renderTimer(); };
  document.getElementById('timerDatePicker').onclick = () => document.getElementById('timerDateInput').showPicker ? document.getElementById('timerDateInput').showPicker() : document.getElementById('timerDateInput').click();
  document.getElementById('timerDateInput').onchange = (e) => { currentTimerDate = e.target.value; renderTimer(); };
  document.getElementById('timerMainBtn').onclick = () => {
    if (state.activeTimer) state.confirmClose ? openConfirmCloseTimer() : stopTimer({save: true});
    else startTimer(currentTimerDate);
  };
  // Studies stepper works before Start and during an active timer.
  document.getElementById('timerStudyPlus').onclick = () => {
    if (state.activeTimer) {
      if (state.activeTimer.date !== currentTimerDate) { toast(t('inService')); return; }
      state.activeTimer.studyCount = (state.activeTimer.studyCount || 0) + 1;
      saveState();
    } else {
      setPendingStudiesForDate(currentTimerDate, getPendingStudiesForDate(currentTimerDate) + 1);
    }
    vibrate(10); renderTimer();
  };
  document.getElementById('timerStudyMinus').onclick = () => {
    if (state.activeTimer) {
      if (state.activeTimer.date !== currentTimerDate) { toast(t('inService')); return; }
      const cur = state.activeTimer.studyCount || 0;
      if (cur <= 0) return;
      state.activeTimer.studyCount = cur - 1;
      saveState();
    } else {
      const cur = getPendingStudiesForDate(currentTimerDate);
      if (cur <= 0) return;
      setPendingStudiesForDate(currentTimerDate, cur - 1);
    }
    vibrate(8); renderTimer();
  };
  document.getElementById('timerStudyOnlySave').onclick = () => {
    if (state.activeTimer) { toast(t('inService')); return; }
    const count = getPendingStudiesForDate(currentTimerDate);
    if (count <= 0) return;
    addSessionForDate(currentTimerDate, 0, resolveDefaultCategory(), '', count);
    setPendingStudiesForDate(currentTimerDate, 0);
    saveState(); vibrate(12); renderAll(); toast(t('save'));
  };

  // Inline note field on the running timer
  const noteInline = document.getElementById('timerNoteInline');
  if (noteInline) {
    noteInline.addEventListener('focus', () => {
      if (!state.activeTimer) { noteInline.blur(); toast(t('readyToStart')); }
    });
    // Throttled save: write to state every ~400ms after the user stops typing
    let noteSaveTimer = null;
    noteInline.addEventListener('input', (e) => {
      if (!state.activeTimer) return;
      const val = e.target.value || '';
      state.activeTimer.note = val;
      if (noteSaveTimer) clearTimeout(noteSaveTimer);
      noteSaveTimer = setTimeout(() => { saveState(); }, 400);
    });
  }
  // Expand-to-modal button: opens the existing full note modal for more room
  document.getElementById('timerNoteExpand').onclick = () => {
    if (!state.activeTimer) { toast(t('readyToStart')); return; }
    openNoteModal();
  };

  // Stopwatch adjusters: add / subtract / tap-to-set
  document.getElementById('timerAdjustAdd').onclick = () => {
    if (!state.activeTimer) return;
    openDurationWheel(0, (addMin) => {
      if (addMin <= 0) return;
      // Move start back by addMin minutes → elapsed grows by addMin
      const newStart = new Date(new Date(state.activeTimer.startISO).getTime() - addMin*60000);
      state.activeTimer.startISO = newStart.toISOString();
      saveState(); vibrate(15); renderTimer();
      toast(`+${formatHM(addMin)}`);
    });
  };
  document.getElementById('timerAdjustSub').onclick = () => {
    if (!state.activeTimer) return;
    const elapsedSec = Math.floor((Date.now() - new Date(state.activeTimer.startISO))/1000);
    const elapsedMin = Math.floor(elapsedSec / 60);
    if (elapsedMin <= 0) { toast(t('nothingToAdd')); return; }
    openDurationWheel(0, (subMin) => {
      if (subMin <= 0) return;
      const actualSub = Math.min(subMin, elapsedMin);
      // Move start forward → elapsed shrinks by actualSub minutes
      const newStart = new Date(new Date(state.activeTimer.startISO).getTime() + actualSub*60000);
      state.activeTimer.startISO = newStart.toISOString();
      saveState(); vibrate(15); renderTimer();
      toast(`−${formatHM(actualSub)}`);
    });
  };
  document.getElementById('timerDisplay').onclick = () => {
    if (!state.activeTimer) return;
    const elapsedSec = Math.floor((Date.now() - new Date(state.activeTimer.startISO))/1000);
    const elapsedMin = Math.round(elapsedSec / 60);
    openDurationWheel(elapsedMin, (newElapsedMin) => {
      // Set start so that elapsed = newElapsedMin
      const newStart = new Date(Date.now() - newElapsedMin*60000);
      state.activeTimer.startISO = newStart.toISOString();
      saveState(); vibrate(15); renderTimer();
      toast(t('save'));
    });
  };

  document.getElementById('calPrev').onclick = () => calGoMonth(-1);
  document.getElementById('calNext').onclick = () => calGoMonth(1);

  // Swipe between months on the calendar grid (L)
  (function attachCalendarSwipe() {
    const grid = document.getElementById('calGrid');
    if (!grid || grid.dataset.swipeBound) return;
    grid.dataset.swipeBound = '1';
    let startX = 0, startY = 0, tracking = false;
    grid.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { tracking = false; return; }
      tracking = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });
    grid.addEventListener('touchmove', (e) => {
      if (!tracking) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      // Cancel if it's a vertical scroll attempt
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) tracking = false;
    }, { passive: true });
    grid.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = (e.changedTouches[0]?.clientX ?? startX) - startX;
      const dy = (e.changedTouches[0]?.clientY ?? startY) - startY;
      if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
      if (dx < 0) calGoMonth(1);  // swipe left → next
      else        calGoMonth(-1); // swipe right → prev
    }, { passive: true });
  })();

  // ===== ADJUST TIME CARD =====
  document.getElementById('adjDatePrev').onclick = () => {
    const d = fromYmd(adjustSelectedDate); d.setDate(d.getDate()-1);
    adjustSelectedDate = ymd(d);
    // If the new date is in a different month, jump the calendar grid too
    if (monthKey(d) !== currentCalMonth) currentCalMonth = monthKey(d);
    renderCalendar();
  };
  document.getElementById('adjDateNext').onclick = () => {
    const d = fromYmd(adjustSelectedDate); d.setDate(d.getDate()+1);
    adjustSelectedDate = ymd(d);
    if (monthKey(d) !== currentCalMonth) currentCalMonth = monthKey(d);
    renderCalendar();
  };
  document.getElementById('adjDateLabel').onclick = () => {
    const input = document.getElementById('adjDateInput');
    if (input.showPicker) input.showPicker(); else input.click();
  };
  document.getElementById('adjDateInput').onchange = (e) => {
    if (!e.target.value) return;
    adjustSelectedDate = e.target.value;
    const d = fromYmd(adjustSelectedDate);
    if (monthKey(d) !== currentCalMonth) currentCalMonth = monthKey(d);
    renderCalendar();
  };

  // Adjust = set total directly (wheel opens with current total)
  document.getElementById('adjBtnSet').onclick = () => {
    const date = adjustSelectedDate;
    const current = getDayMinutes(date);
    openDurationWheel(current, (newTotal, studies) => {
      if (newTotal <= 0 && current <= 0 && (!studies || studies <= 0)) { toast(t('enterTimeRequired')); return; }
      if (newTotal === current && !studies) return;
      if (newTotal < current) {
        // Block — can't go lower without manual edit
        const cat = (state.categories[0] || { id: 'regular' }).id;
        openConfirmModal(
          t('setLowerMsg').replace('{cur}', formatHM(current)).replace('{target}', formatHM(newTotal)),
          () => { /* user picks Open Sessions — just stay; sessions are already listed below */ },
          { confirmLabel: t('openSessionsBtn'), cancelLabel: t('cancel') }
        );
        return;
      }
      const diff = newTotal - current;
      // If only studies changed (no time diff), still log the studies attached to a zero-min session
      if (diff > 0 || (studies && studies > 0)) {
        addSessionForDate(date, diff, (state.categories[0]||{id:'regular'}).id, '', studies || 0);
      }
      saveState(); vibrate(15); renderAll(); toast(t('save'));
    }, { showStudies: true });
  };

  // + Add — add the picked amount on top of current
  document.getElementById('adjBtnAdd').onclick = () => {
    const date = adjustSelectedDate;
    openDurationWheel(0, (addMin, studies) => {
      if (addMin <= 0 && (!studies || studies <= 0)) { toast(t('enterTimeRequired')); return; }
      addSessionForDate(date, addMin || 0, (state.categories[0]||{id:'regular'}).id, '', studies || 0);
      saveState(); vibrate(15); renderAll();
      const parts = [];
      if (addMin > 0) parts.push(`+${formatHM(addMin)}`);
      if (studies > 0) parts.push(`+${studies} ${t('studies').toLowerCase()}`);
      toast(parts.join(' • ') || t('save'));
    }, { showStudies: true });
  };

  // - Deduct — remove time. Strategy: find the latest session(s) and shorten/delete to match
  document.getElementById('adjBtnSub').onclick = () => {
    const date = adjustSelectedDate;
    const current = getDayMinutes(date);
    if (current <= 0) { toast(t('nothingToAdd')); return; }
    openDurationWheel(0, (subMin) => {
      if (subMin <= 0) return;
      const actualSub = Math.min(subMin, current);
      deductFromDay(date, actualSub);
      saveState(); vibrate(15); renderAll(); toast(`−${formatHM(actualSub)}`);
    });
  };

  document.getElementById('adjBtnPlan').onclick = () => openPlanModal(adjustSelectedDate);
  document.getElementById('adjBtnAddDetailed').onclick = () => openQuickAddModal(adjustSelectedDate);
  // Log History (now inside Reports — Stage A)
  const logHistoryAddBtn = document.getElementById('logHistoryAddBtn');
  if (logHistoryAddBtn) logHistoryAddBtn.onclick = () => openQuickAddModal(todayStr());

  const logHistoryPrevBtn = document.getElementById('logHistoryPrev');
  const logHistoryNextBtn = document.getElementById('logHistoryNext');
  if (logHistoryPrevBtn) logHistoryPrevBtn.onclick = () => {
    const [y, mo] = logHistoryMonth.split('-').map(Number);
    logHistoryMonth = monthKey(new Date(y, mo - 2, 1));
    renderLogHistory();
  };
  if (logHistoryNextBtn) logHistoryNextBtn.onclick = () => {
    const [y, mo] = logHistoryMonth.split('-').map(Number);
    const next = monthKey(new Date(y, mo, 1));
    if (next <= monthKey(new Date())) { logHistoryMonth = next; renderLogHistory(); }
  };

  // Log History search wiring
  const logHistorySearchEl = document.getElementById('logHistorySearch');
  const logHistorySearchClear = document.getElementById('logHistorySearchClear');
  if (logHistorySearchEl) {
    let searchDebounce = null;
    logHistorySearchEl.addEventListener('input', (e) => {
      logHistorySearch = e.target.value || '';
      logHistorySearchClear.classList.toggle('hidden', !logHistorySearch.length);
      if (searchDebounce) clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => { renderLogHistory(); }, 180);
    });
    logHistorySearchClear.onclick = () => {
      logHistorySearch = '';
      logHistorySearchEl.value = '';
      logHistorySearchClear.classList.add('hidden');
      renderLogHistory();
      logHistorySearchEl.focus();
    };
  }

  document.getElementById('reportMonth').onchange = (e) => { currentReportMonth = e.target.value; renderReports(); };
  document.getElementById('reportShare').onclick = () => {
    const text = buildReportText(currentReportMonth);
    openShareTextPicker(text);
  };
  document.getElementById('reportCreditBtn').onclick = () => openCreditEditModal();
  document.getElementById('exportShortcut').onclick = openExportModal;

  // User name field: focus dismisses the hint badge for good; input updates name and re-renders greeting
  document.getElementById('setUserName').addEventListener('focus', () => {
    if (!state.userNameHintSeen) {
      state.userNameHintSeen = true;
      saveState();
      const badge = document.getElementById('userNameHintBadge');
      if (badge) badge.classList.add('hidden');
    }
  });
  document.getElementById('setUserName').addEventListener('input', (e) => {
    state.userName = (e.target.value || '').slice(0, 30);
    saveState();
    renderHome();
  });

  document.getElementById('setPublisherType').onchange = (e) => {
    state.publisherType = e.target.value;
    if (e.target.value === 'regular') { state.annualGoalHrs=600; state.monthlyGoalHrs=50; state.dailyGoalHrs=1.67; }
    else if (e.target.value === 'aux') { state.annualGoalHrs=360; state.monthlyGoalHrs=30; state.dailyGoalHrs=1; }
    else if (e.target.value === 'special') { state.annualGoalHrs=1200; state.monthlyGoalHrs=100; state.dailyGoalHrs=3.33; }
    else { state.annualGoalHrs=0; state.monthlyGoalHrs=0; state.dailyGoalHrs=0; }
    saveState(); renderAll();
  };
  document.getElementById('setAnnualGoal').onchange = (e) => { state.annualGoalHrs = parseFloat(e.target.value) || 0; saveState(); renderAll(); };
  document.getElementById('setMonthlyGoal').onchange = (e) => { state.monthlyGoalHrs = parseFloat(e.target.value) || 0; saveState(); renderAll(); };
  document.getElementById('setDailyGoal').onchange = (e) => { state.dailyGoalHrs = parseFloat(e.target.value) || 0; saveState(); renderAll(); };
  document.getElementById('setRoundMinutes').onchange = (e) => { state.roundMinutes = parseInt(e.target.value) || 0; saveState(); };
  document.getElementById('setAutoPause').onchange = (e) => { state.autoPauseMin = parseInt(e.target.value) || 0; saveState(); };

  document.getElementById('togConfirmClose').onclick = () => { state.confirmClose = !state.confirmClose; saveState(); renderSettings(); };
  document.getElementById('togShowStreak').onclick = () => { state.showStreak = !state.showStreak; saveState(); renderAll(); };
  document.getElementById('togWeekStart').onclick = () => { state.weekStartsMon = !state.weekStartsMon; saveState(); renderAll(); };
  document.getElementById('togCarryOver').onclick = () => { state.carryOver = !state.carryOver; saveState(); renderSettings(); };
  document.getElementById('togHaptics').onclick = () => { state.haptics = !state.haptics; saveState(); renderSettings(); vibrate(20); };
  document.getElementById('togBackupReminder').onclick = () => { state.backupReminder = !state.backupReminder; saveState(); renderSettings(); };

  document.querySelectorAll('[data-theme-set]').forEach(b => b.onclick = () => { state.theme = b.dataset.themeSet; saveState(); applyTheme(); renderAll(); });
  document.querySelectorAll('[data-lang-set]').forEach(b => b.onclick = () => { state.lang = b.dataset.langSet; saveState(); renderAll(); });

  document.getElementById('addCategoryBtn').onclick = () => openCategoryEditModal('__new__');

  initBackupCollapse();
  document.getElementById('btnExport').onclick = openExportModal;
  document.getElementById('btnImport').onclick = () => {
    openConfirmModal(t('importConfirmMsg'), () => {
      document.getElementById('importFile').click();
    }, { confirmLabel: t('importBtn'), danger: true });
  };
  document.getElementById('btnPasteImport').onclick = () => {
    openConfirmModal(t('importConfirmMsg'), () => {
      openPasteImportModal();
    }, { confirmLabel: t('pasteImportBtn'), danger: true });
  };
  document.getElementById('importFile').onchange = (e) => {
    const f = e.target.files[0]; if (f) importJSON(f); e.target.value = '';
  };

  // ── Cloud backup ──────────────────────────────────────────────────────────
  (function setupCloudBackup() {
    const APP_ID = 'ministry-tracker';
    const EXACT_KEYS = [APP_CONFIG.storageKey];
    const PREFIX = APP_CONFIG.archivePrefix;
    const infoEl = document.getElementById('cloudBackupInfo');
    const saveBtn = document.getElementById('btnCloudSave');
    const restoreBtn = document.getElementById('btnCloudRestore');
    const homeSaveBtn = document.getElementById('homeCloudSaveBtn');
    const homeRestoreBtn = document.getElementById('homeCloudRestoreBtn');
    let autoSaveStarted = false;

    if (!window.KHub?.Firebase?.db || !window.KHub?.Firebase?.auth || !window.KHub?.CloudAuth) {
      if (saveBtn) saveBtn.disabled = true;
      if (restoreBtn) restoreBtn.disabled = true;
      if (homeSaveBtn) homeSaveBtn.disabled = true;
      if (homeRestoreBtn) homeRestoreBtn.disabled = true;
      if (infoEl) infoEl.textContent = 'Cloud backup unavailable';
      return;
    }

    const accountBtn = document.createElement('button');
    accountBtn.id = 'btnCloudAccount';
    accountBtn.className = 'btn btn-secondary w-full';
    accountBtn.innerHTML = '<i class="fa-solid fa-user-lock text-blue"></i><span>Cloud Account</span>';
    if (saveBtn && saveBtn.parentNode) saveBtn.parentNode.insertBefore(accountBtn, saveBtn);

    function cloudUser() { return KHub.CloudAuth.currentUser(); }
    function signedIn() { return !!cloudUser(); }
    function cloudErr(e) {
      if (e && e.code === 'auth-required') return 'Sign in to your cloud account first';
      if (e && e.message === 'no-backup') return 'No cloud backup found';
      if (e && e.message === 'cloud-storage-unavailable') return 'Cloud backup storage is temporarily unavailable. Your local app data is still saved on this device.';
      if (window.KHub?.CloudAuth?.authMessage) return KHub.CloudAuth.authMessage(e);
      return (e && (e.message || e.code)) || 'Cloud backup failed: no error details returned. Refresh and sign in again.';
    }
    function handleCloudError(e) {
      console.warn('[MinistryCloud] cloud operation failed', e);
      toast(cloudErr(e));
      if (e && e.code === 'auth-required') openAccountDialog();
    }
    function refreshCloudInfo() {
      const user = cloudUser();
      const ts = window.KHub?.CloudBackup?.lastSaved(APP_ID);
      if (accountBtn) {
        accountBtn.innerHTML = user
          ? '<i class="fa-solid fa-user-check text-accent"></i><span>Signed in: ' + (user.email || 'Cloud account') + '</span>'
          : '<i class="fa-solid fa-user-lock text-blue"></i><span>Sign in for Cloud Backup</span>';
      }
      if (saveBtn) saveBtn.disabled = false;
      if (restoreBtn) restoreBtn.disabled = false;
      if (homeSaveBtn) homeSaveBtn.disabled = false;
      if (homeRestoreBtn) homeRestoreBtn.disabled = false;
      if (infoEl) {
        infoEl.textContent = user
          ? (ts ? 'Last cloud save: ' + new Date(ts).toLocaleString() : 'Signed in. Not saved to cloud yet')
          : 'Sign in to keep this app separate from other users.';
      }
    }
    function openAccountDialog() {
      const user = cloudUser();
      if (user) {
        openConfirmModal('Sign out of cloud backup?', function () {
          KHub.CloudAuth.signOut().then(function () { toast('Signed out'); refreshCloudInfo(); });
        }, { confirmLabel: 'Sign out' });
        return Promise.resolve(null);
      }
      return KHub.CloudAuth.openDialog().then(function (result) {
        if (result === 'reset-sent') toast('Password reset email sent');
        else if (result) toast('Signed in');
        refreshCloudInfo();
        return result;
      }).catch(function () {});
    }
    let cloudSaveTimer = null;
    let cloudChecking = false;
    let cloudSaving = false;

    function checkCloudLatest() {
      if (!signedIn() || cloudChecking) return Promise.resolve();
      cloudChecking = true;
      return KHub.CloudBackup.restoreLatestIfNewer(APP_ID, EXACT_KEYS, PREFIX, function () {
        location.reload();
      }).catch(function (e) {
        console.warn('[MinistryCloud] restore check failed', e);
      }).finally(function () {
        cloudChecking = false;
        refreshCloudInfo();
      });
    }
    function saveCloudSoon() {
      if (!signedIn()) return;
      clearTimeout(cloudSaveTimer);
      cloudSaveTimer = setTimeout(function () {
        if (cloudSaving || !signedIn()) return;
        cloudSaving = true;
        KHub.CloudBackup.save(APP_ID, EXACT_KEYS, PREFIX)
          .then(refreshCloudInfo)
          .catch(function (e) { console.warn('[MinistryCloud] auto save failed', e); })
          .finally(function () { cloudSaving = false; });
      }, 1800);
    }
    function startUserCloudSync() {
      if (!signedIn()) return;
      checkCloudLatest().finally(function () {
        if (!autoSaveStarted) {
          autoSaveStarted = true;
          KHub.CloudBackup.autoSave(APP_ID, EXACT_KEYS, PREFIX);
          document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') checkCloudLatest();
            else saveCloudSoon();
          });
          window.addEventListener('focus', checkCloudLatest);
          window.addEventListener('online', checkCloudLatest);
          document.addEventListener('input', saveCloudSoon, true);
          document.addEventListener('change', saveCloudSoon, true);
          document.addEventListener('click', function (e) {
            if (e && e.target && e.target.closest('button,[data-action],input,select,textarea')) saveCloudSoon();
          }, true);
        }
        refreshCloudInfo();
      });
    }
    accountBtn.onclick = openAccountDialog;
    if (saveBtn) {
      saveBtn.onclick = () => {
        if (!signedIn()) { openAccountDialog(); return; }
        saveBtn.disabled = true;
        KHub.CloudBackup.save(APP_ID, EXACT_KEYS, PREFIX)
          .then(() => { toast('Saved to cloud'); refreshCloudInfo(); })
          .catch(handleCloudError)
          .finally(() => { saveBtn.disabled = !signedIn(); });
      };
    }
    if (homeSaveBtn && saveBtn) homeSaveBtn.onclick = () => saveBtn.click();
    if (restoreBtn) {
      restoreBtn.onclick = () => {
        if (!signedIn()) { openAccountDialog(); return; }
        openConfirmModal(
          'Replace your current data with your signed-in cloud backup? This cannot be undone.',
          () => {
            restoreBtn.disabled = true;
            KHub.CloudBackup.restore(APP_ID, EXACT_KEYS, PREFIX, () => {
              toast('Restored from cloud'); location.reload();
            }).catch(e => {
              handleCloudError(e); restoreBtn.disabled = !signedIn();
            });
          },
          { confirmLabel: 'Restore', danger: true }
        );
      };
    }
    if (homeRestoreBtn && restoreBtn) homeRestoreBtn.onclick = () => restoreBtn.click();
    refreshCloudInfo();
    KHub.CloudAuth.onChange(function () { refreshCloudInfo(); startUserCloudSync(); });
  })();  // ─────────────────────────────────────────────────────────────────────


  document.getElementById('btnClearMonth').onclick = () => {
    const mk = currentReportMonth;
    openConfirmModal(t('confirmClearMonth'), () => {
      state.sessions = state.sessions.filter(s => !s.date.startsWith(mk));
      state.creditEntries = (state.creditEntries || []).filter(e => !e.date || !e.date.startsWith(mk));
      delete (state.creditByMonth || {})[mk];
      saveState(); renderAll(); toast(t('cleared'));
    }, { confirmLabel: t('clearMonth'), danger: true });
  };
  document.getElementById('btnClearAll').onclick = () => {
    openConfirmModal(t('confirmClearAll'), () => {
      // Also remove archives
      try {
        const keysToDelete = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(APP_CONFIG.archivePrefix)) keysToDelete.push(k);
        }
        keysToDelete.forEach(k => localStorage.removeItem(k));
      } catch(e){ /* ignore */ }
      const preserve = {
        publisherType: state.publisherType, annualGoalHrs: state.annualGoalHrs,
        monthlyGoalHrs: state.monthlyGoalHrs, dailyGoalHrs: state.dailyGoalHrs,
        theme: state.theme, lang: state.lang,
        confirmClose: state.confirmClose,
        showStreak: state.showStreak, weekStartsMon: state.weekStartsMon,
        carryOver: state.carryOver, haptics: state.haptics, backupReminder: state.backupReminder,
        roundMinutes: state.roundMinutes, autoPauseMin: state.autoPauseMin,
        categories: state.categories,
      };
      state = { ...JSON.parse(JSON.stringify(APP_CONFIG.defaults)), ...preserve, lastClearedServiceYear: getServiceYearLabel() };
      saveState(); renderAll(); toast(t('cleared'));
    }, { confirmLabel: t('clearAll'), danger: true });
  };

  ['click','touchstart','keydown'].forEach(evt => {
    document.addEventListener(evt, () => { lastInteraction = Date.now(); }, { passive: true });
  });

  // Resume timer cleanly on visibility change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && state.activeTimer) {
      // Force one tick to catch up display
      if (liveTickInterval) {
        // already running
      } else {
        startLiveTick();
      }
    }
  });
}

/* ===== INIT ===== */
window.onload = function() {
  applyTheme();
  checkServiceYearReset();
  checkMonthEndRollover();
  runJune2026RolloverBackfill();
  wireEvents();
  // Resume timer if it was running before reload/restart
  if (state.activeTimer) startLiveTick();
  renderAll();
  switchScreen('home');
  resumePendingReminderSync();
  // Backup reminder: show on open if overdue (but only after UI is up)
  setTimeout(() => {
    if (shouldShowBackupPopup() && !state.backupBannerDismissed) {
      openBackupReminderModal();
    }
  }, 800);
};




// ─── Stage J Weather Redesign v57 ───────────────────────────────
(function(App) {
  'use strict';

  var WX_CACHE_KEY    = 'mt_weather_v2';
  var WX_LOCATION_KEY = 'mt_weather_location';
  var WX_UNITS_KEY    = 'mt_weather_units';
  var WX_EXPANDED_KEY = 'mt_weather_expanded';
  var WX_SAVED_KEY    = 'mt_weather_saved';
  var WX_ADVISORY_KEY = 'mt_wx_advisory_v1';
  var WX_CACHE_TTL    = 30 * 60 * 1000;
  var WX_ADVISORY_TTL = 15 * 60 * 1000;
  var _advisoryDismissed = false;

  var WMO = {
    0:{en:'Clear sky',es:'Cielo despejado',e:'☀️'},
    1:{en:'Mainly clear',es:'Mayormente despejado',e:'🌤️'},
    2:{en:'Partly cloudy',es:'Parcialmente nublado',e:'⛅'},
    3:{en:'Overcast',es:'Nublado',e:'☁️'},
    45:{en:'Foggy',es:'Neblina',e:'🌫️'},
    48:{en:'Icy fog',es:'Niebla helada',e:'🌫️'},
    51:{en:'Light drizzle',es:'Llovizna ligera',e:'🌦️'},
    53:{en:'Drizzle',es:'Llovizna',e:'🌦️'},
    55:{en:'Heavy drizzle',es:'Llovizna intensa',e:'🌦️'},
    61:{en:'Light rain',es:'Lluvia ligera',e:'🌧️'},
    63:{en:'Rain',es:'Lluvia',e:'🌧️'},
    65:{en:'Heavy rain',es:'Lluvia intensa',e:'🌧️'},
    71:{en:'Light snow',es:'Nieve ligera',e:'🌨️'},
    73:{en:'Snow',es:'Nieve',e:'🌨️'},
    75:{en:'Heavy snow',es:'Nieve intensa',e:'🌨️'},
    80:{en:'Rain showers',es:'Chubascos',e:'🌦️'},
    81:{en:'Heavy showers',es:'Chubascos fuertes',e:'🌦️'},
    82:{en:'Violent showers',es:'Chubascos violentos',e:'⛈️'},
    95:{en:'Thunderstorm',es:'Tormenta',e:'⛈️'},
    96:{en:'Storm + hail',es:'Tormenta con granizo',e:'⛈️'},
    99:{en:'Storm + hail',es:'Tormenta con granizo',e:'⛈️'}
  };

  function wmo(code){ return WMO[code]||WMO[Math.floor(code/10)*10]||{en:'Unknown',es:'Desconocido',e:'🌡️'}; }
  function wmoLabel(code,lang){ var w=wmo(code); return w.e+' '+(lang==='es'?w.es:w.en); }

  function getUnits(){ return localStorage.getItem(WX_UNITS_KEY)||'F'; }
  function setUnitsStore(u){ localStorage.setItem(WX_UNITS_KEY,u); }
  function isExpanded(){ return localStorage.getItem(WX_EXPANDED_KEY)==='1'; }
  function setExpanded(v){ localStorage.setItem(WX_EXPANDED_KEY,v?'1':''); }
  function getLang(){ return (typeof state!=='undefined'&&state.lang)?state.lang:'en'; }

  function cToF(c){ return c*9/5+32; }
  function fmtTemp(c){ return getUnits()==='F'?Math.round(cToF(c))+'°F':Math.round(c)+'°C'; }
  function fmtShort(c){ return getUnits()==='F'?Math.round(cToF(c))+'°':Math.round(c)+'°'; }
  function fmtWind(kmh){ return getUnits()==='F'?Math.round(kmh*0.621371)+' mph':Math.round(kmh)+' km/h'; }
  function fmtAge(ts){
    var m=Math.floor((Date.now()-ts)/60000);
    return m<1?'just now':m===1?'1 min ago':m+' min ago';
  }
  function fmtTime12(iso){
    var d=new Date(iso);
    return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:true});
  }
  function dayName(iso,lang){
    var d=new Date(iso);
    var en=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var es=['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
    return(lang==='es'?es:en)[d.getDay()];
  }

  function uvLabel(uv,lang){
    var isEs=lang==='es';
    if(uv<=2) return{txt:isEs?'Bajo':'Low',color:'#10b981'};
    if(uv<=5) return{txt:isEs?'Moderado':'Moderate',color:'#f59e0b'};
    if(uv<=7) return{txt:isEs?'Alto':'High',color:'#f97316'};
    if(uv<=10) return{txt:isEs?'Muy alto':'Very High',color:'#ef4444'};
    return{txt:isEs?'Extremo':'Extreme',color:'#7c3aed'};
  }

  function aqiLabel(aqi,lang){
    var isEs=lang==='es';
    if(aqi<=50)  return{txt:isEs?'Bueno':'Good',color:'#10b981'};
    if(aqi<=100) return{txt:isEs?'Moderado':'Moderate',color:'#f59e0b'};
    if(aqi<=150) return{txt:isEs?'No saludable*':'Unhealthy*',color:'#f97316'};
    if(aqi<=200) return{txt:isEs?'No saludable':'Unhealthy',color:'#ef4444'};
    return{txt:isEs?'Peligroso':'Hazardous',color:'#7c3aed'};
  }

  function loadCache(){ try{var r=localStorage.getItem(WX_CACHE_KEY);return r?JSON.parse(r):null;}catch(e){return null;} }
  function saveCache(d){ try{localStorage.setItem(WX_CACHE_KEY,JSON.stringify(d));}catch(e){ /* ignore */ } }
  function loadLoc(){ try{return JSON.parse(localStorage.getItem(WX_LOCATION_KEY)||'null');}catch(e){return null;} }
  function saveLoc(l){ try{localStorage.setItem(WX_LOCATION_KEY,JSON.stringify(l));}catch(e){ /* ignore */ } }
  function loadSaved(){ try{return JSON.parse(localStorage.getItem(WX_SAVED_KEY)||'[]');}catch(e){return[];} }
  function addSaved(loc){
    var list=loadSaved().filter(function(l){return l.name!==loc.name;});
    list.unshift({lat:loc.lat,lon:loc.lon,name:loc.name});
    if(list.length>6) list=list.slice(0,6);
    try{localStorage.setItem(WX_SAVED_KEY,JSON.stringify(list));}catch(e){ /* ignore */ }
  }

  function loadCachedAdvisory(){
    try{
      var r=localStorage.getItem(WX_ADVISORY_KEY);
      if(!r) return null;
      var o=JSON.parse(r);
      return(Date.now()-o.fetchedAt<WX_ADVISORY_TTL)?o.features:null;
    }catch(e){return null;}
  }

  function outlook(cur){
    var rain=cur.precipitation_probability||0,temp=cur.temperature_2m,wind=cur.windspeed_10m,code=cur.weathercode;
    if(rain>60||temp>40||temp<5||wind>50||code>=61)
      return{level:'bad',icon:'⛔',en:'Not ideal for ministry',es:'No ideal para el ministerio',color:'#ef4444'};
    if(rain>30||temp>35||temp<10||wind>30)
      return{level:'caution',icon:'⚠️',en:'Use caution',es:'Precaución',color:'#f59e0b'};
    return{level:'good',icon:'✅',en:'Good for ministry',es:'Bueno para el ministerio',color:'#10b981'};
  }

  function buildOutlookNarrative(data,lang){
    var isEs=lang==='es';
    var cur=data.current, daily=data.daily;
    if(!daily||!daily.time||!daily.time[0]) return '';
    var code=daily.weathercode[0];
    var w=wmo(code);
    var high=fmtShort(daily.temperature_2m_max[0]);
    var low=fmtShort(daily.temperature_2m_min[0]);
    var rain=daily.precipitation_probability_max[0]||0;
    var cond=isEs?w.es:w.en;
    var sunrise=daily.sunrise?daily.sunrise[0]:'';
    var sunset=daily.sunset?daily.sunset[0]:'';
    var sunStr='';
    if(sunrise&&sunset){
      sunStr=isEs
        ?(' Amanece '+fmtTime12(sunrise)+', anochece '+fmtTime12(sunset)+'.')
        :(' Sunrise '+fmtTime12(sunrise)+', sunset '+fmtTime12(sunset)+'.');
    }
    var rainStr=rain>=70?(isEs?'Alta probabilidad de lluvia.':'High chance of rain.')
               :rain>=40?(isEs?'Posibilidad de lluvia.':'Chance of rain.')
               :rain>=20?(isEs?'Lluvia posible.':'Slight chance of rain.')
               :(isEs?'Poca o ninguna lluvia.':'Little to no rain.');
    if(isEs){
      return cond+'. Máx '+high+', Mín '+low+'. '+rainStr+sunStr;
    }
    return cond+'. High '+high+', Low '+low+'. '+rainStr+sunStr;
  }

  function buildDayDesc(daily,idx,lang){
    var isEs=lang==='es';
    var code=daily.weathercode[idx];
    var w=wmo(code);
    var high=fmtShort(daily.temperature_2m_max[idx]);
    var low=fmtShort(daily.temperature_2m_min[idx]);
    var rain=daily.precipitation_probability_max[idx]||0;
    var cond=isEs?w.es:w.en;
    var rainStr=rain>=70?(isEs?'Alta probabilidad de lluvia.':'High chance of rain.')
               :rain>=40?(isEs?'Posibilidad de lluvia.':'Chance of rain.')
               :rain>=20?(isEs?'Lluvia posible.':'Slight chance of rain.')
               :(isEs?'Poca o ninguna lluvia.':'Little to no rain.');
    var sunStr='';
    if(idx===0&&daily.sunrise&&daily.sunset){
      sunStr=isEs
        ?' Amanece '+fmtTime12(daily.sunrise[0])+', anochece '+fmtTime12(daily.sunset[0])+'.'
        :' Sunrise '+fmtTime12(daily.sunrise[0])+', sunset '+fmtTime12(daily.sunset[0])+'.';
    }
    return isEs
      ?cond+'. Máx '+high+', Mín '+low+'. '+rainStr+sunStr
      :cond+'. High '+high+', Low '+low+'. '+rainStr+sunStr;
  }

  function severityClass(features){
    var levels=['Extreme','Severe','Moderate','Minor'];
    for(var i=0;i<levels.length;i++){
      if(features.some(function(f){return f.properties.severity===levels[i];}))
        return'wx-adv-'+levels[i].toLowerCase();
    }
    return'wx-adv-minor';
  }
  function renderAdvisory(features){
    if(!features||!features.length||_advisoryDismissed) return'';
    var top=features[0].properties;
    var cls=severityClass(features);
    var icon=cls.indexOf('extreme')>=0||cls.indexOf('severe')>=0?'🚨':cls.indexOf('moderate')>=0?'⚠️':'ℹ️';
    var moreHtml=features.length>1?'<span class="wx-adv-more">+'+(features.length-1)+(getLang()==='es'?' más':' more')+'</span>':'';
    return'<div class="wx-advisory '+cls+'" id="wxAdvisory">'
      +'<div class="wx-adv-inner">'
      +'<span class="wx-adv-icon">'+icon+'</span>'
      +'<div class="wx-adv-body">'
      +'<strong>'+(top.event||'')+'</strong>'
      +'<span>'+(top.headline||'')+'</span>'
      +moreHtml
      +'</div>'
      +'<button class="wx-adv-dismiss" onclick="App.Weather.dismissAdvisory()">✕</button>'
      +'</div></div>';
  }

  function renderCollapsed(data,advisory){
    var lang=getLang(),cur=data.current;
    var ol=outlook(cur),w=wmo(cur.weathercode);
    var advHtml=advisory?renderAdvisory(advisory):'';
    return advHtml+'<div class="wx-card wx-collapsed" id="weatherCard">'
      +'<div class="wx-collapsed-inner" onclick="App.Weather.toggle()">'
      +'<div class="wx-col-left">'
      +'<span class="wx-col-emoji">'+w.e+'</span>'
      +'<span class="wx-col-temp">'+fmtTemp(cur.temperature_2m)+'</span>'
      +'<span class="wx-col-desc">'+(lang==='es'?w.es:w.en)+'</span>'
      +'</div>'
      +'<div class="wx-col-right">'
      +'<span class="wx-outlook-pill wx-ol-'+ol.level+'">'+ol.icon+' '+(lang==='es'?ol.es:ol.en)+'</span>'
      +'<span class="wx-col-loc">📍 '+(data.locationName||'')+'</span>'
      +'<span class="wx-col-age">↻ '+fmtAge(data.fetchedAt)+'</span>'
      +'</div>'
      +'<span class="wx-chevron">▼</span>'
      +'</div>'
      +'<div class="wx-expand-bar" onclick="App.Weather.toggle()">▼ '+(lang==='es'?'Toca para expandir':'Tap to expand')+'</div>'
      +'</div>';
  }

  function renderExpanded(data,advisory){
    var lang=getLang(),isEs=lang==='es',cur=data.current;
    var ol=outlook(cur),w=wmo(cur.weathercode),units=getUnits();

    var narrative=buildOutlookNarrative(data,lang);

    var sunriseHtml='',sunsetHtml='';
    if(data.daily&&data.daily.sunrise&&data.daily.sunrise[0]){
      sunriseHtml='<span class="wx-sun-item">🌅 '+fmtTime12(data.daily.sunrise[0])+'</span>';
      sunsetHtml='<span class="wx-sun-item">🌇 '+fmtTime12(data.daily.sunset[0])+'</span>';
    }

    var uvHtml='';
    if(cur.uv_index!==undefined&&cur.uv_index!==null){
      var uvl=uvLabel(cur.uv_index,lang);
      uvHtml='<span class="wx-badge" style="color:'+uvl.color+';border-color:'+uvl.color+'">UV '+Math.round(cur.uv_index)+' · '+uvl.txt+'</span>';
    }

    var humHtml='';
    if(cur.relativehumidity_2m!==undefined){
      humHtml='<span class="wx-feels">💧 '+(isEs?'Humedad ':'Humidity ')+cur.relativehumidity_2m+'%</span>';
    }

    var aqiHtml='';
    if(data.aqi!==undefined&&data.aqi!==null){
      var al=aqiLabel(data.aqi,lang);
      aqiHtml='<span class="wx-badge" style="color:'+al.color+';border-color:'+al.color+'">AQI '+data.aqi+' · '+al.txt+'</span>';
    }

    var now=new Date(),hourlyHtml='',hCount=0;
    if(data.hourly&&data.hourly.time){
      for(var i=0;i<data.hourly.time.length&&hCount<12;i++){
        if(new Date(data.hourly.time[i])<=now) continue;
        var hc=data.hourly.weathercode[i],hw=wmo(hc);
        hourlyHtml+='<div class="wx-hour">'
          +'<div class="wx-h-time">'+fmtTime12(data.hourly.time[i])+'</div>'
          +'<div class="wx-h-icon">'+hw.e+'</div>'
          +'<div class="wx-h-temp">'+fmtShort(data.hourly.temperature_2m[i])+'</div>'
          +'<div class="wx-h-rain">'+(data.hourly.precipitation_probability[i]||0)+'%</div>'
          +'</div>';
        hCount++;
      }
    }

    var dailyHtml='';
    if(data.daily&&data.daily.time){
      for(var j=0;j<data.daily.time.length;j++){
        var dc=data.daily.weathercode[j],dw=wmo(dc);
        var isToday=j===0;
        var desc=buildDayDesc(data.daily,j,lang);
        dailyHtml+='<div class="wx-day'+(isToday?' wx-day-today':'')+'" onclick="App.Weather.toggleDayDesc(this,'+j+')">'
          +'<span class="wx-d-name">'+(isToday?(isEs?'Hoy':'Today'):dayName(data.daily.time[j],lang))+'</span>'
          +'<span class="wx-d-icon">'+dw.e+'</span>'
          +'<span class="wx-d-range">'+fmtShort(data.daily.temperature_2m_max[j])+' / '+fmtShort(data.daily.temperature_2m_min[j])+'</span>'
          +'<span class="wx-d-rain">'+(data.daily.precipitation_probability_max[j]||0)+'%</span>'
          +'</div>'
          +'<div class="wx-day-desc" id="wxDayDesc'+j+'" hidden>'
          +'<span class="wx-day-desc-text">'+desc+'</span>'
          +'</div>';
      }
    }

    var saved=loadSaved();
    var savedHtml=saved.map(function(s){
      return'<button class="wx-saved-chip" onclick="App.Weather.selectSaved(\''+encodeURIComponent(JSON.stringify(s))+'\')">'+s.name+'</button>';
    }).join('');

    var advHtml=advisory?renderAdvisory(advisory):'';

    return advHtml+'<div class="wx-card wx-expanded" id="weatherCard" style="border-left:4px solid '+ol.color+'">'
      +'<div class="wx-exp-header">'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +'<button class="wx-collapse-btn" onclick="App.Weather.toggle()">▲ '+(isEs?'Cerrar':'Collapse')+'</button>'
      +'<span class="wx-col-loc" style="font-size:13px">📍 '+(data.locationName||'')+'</span>'
      +'<span class="wx-col-age" style="font-size:11px">↻ '+fmtAge(data.fetchedAt)+'</span>'
      +'</div>'
      +'<button class="btn btn-sm wx-refresh-btn" onclick="App.Weather.refresh()" title="Refresh">↻</button>'
      +'</div>'
      +(narrative?'<div class="wx-narrative">'+narrative+'</div>':'')
      +'<div class="wx-current">'
      +'<div class="wx-cur-main">'
      +'<span class="wx-temp-big">'+fmtTemp(cur.temperature_2m)+'</span>'
      +'<div class="wx-cur-detail">'
      +'<span class="wx-cond-label">'+w.e+' '+(isEs?w.es:w.en)+'</span>'
      +'<span class="wx-feels">'+(isEs?'Se siente como ':'Feels like ')+fmtShort(cur.apparent_temperature)+'</span>'
      +humHtml
      +'<span class="wx-wind">💨 '+fmtWind(cur.windspeed_10m)+'</span>'
      +'<span class="wx-precip">💧 '+(cur.precipitation_probability||0)+'% '+(isEs?'lluvia':'rain')+'</span>'
      +'</div>'
      +'</div>'
      +'<div class="wx-ol-block" style="border-color:'+ol.color+'">'
      +'<span class="wx-outlook-pill wx-ol-'+ol.level+'">'+ol.icon+' '+(isEs?ol.es:ol.en)+'</span>'
      +(sunriseHtml?'<div class="wx-sun-row">'+sunriseHtml+sunsetHtml+'</div>':'')
      +(uvHtml?'<div style="margin-top:6px">'+uvHtml+'</div>':'')
      +(aqiHtml?'<div style="margin-top:4px">'+aqiHtml+'</div>':'')
      +'</div>'
      +'</div>'
      +'<div class="wx-section-lbl">'+(isEs?'Próximas horas':'Next hours')+'</div>'
      +'<div class="wx-hourly-scroll">'+hourlyHtml+'</div>'
      +'<div class="wx-section-lbl">7 '+(isEs?'días':'days')+'</div>'
      +'<div class="wx-daily">'+dailyHtml+'</div>'
      +'<div class="wx-settings">'
      +'<div class="wx-loc-section">'
      +'<div class="wx-loc-row">'
      +'<button class="wx-loc-pill" onclick="App.Weather.toggleLocPicker()">📍 '+(isEs?'Cambiar ubicación':'Change location')+' ▾</button>'
      +(savedHtml?'<div class="wx-saved-row">'+savedHtml+'</div>':'')
      +'</div>'
      +'<div id="wxLocPicker" class="wx-loc-picker" hidden>'
      +'<button class="wx-gps-btn2" onclick="App.Weather.useGPS()">📍 '+(isEs?'Usar mi ubicación':'Use my location')+'</button>'
      +'<div class="wx-search-row">'
      +'<input id="wxCityInput" class="wx-city-input" placeholder="'+(isEs?'Ciudad, o ZIP + país':'City, or ZIP + country')+'" type="text" onkeydown="if(event.key===\'Enter\')App.Weather.searchCity()">'
      +'<button class="btn btn-sm btn-primary" onclick="App.Weather.searchCity()">'+(isEs?'Buscar':'Search')+'</button>'
      +'</div>'
      +'<div id="wxSearchResults" class="wx-search-results"></div>'
      +'</div>'
      +'</div>'
      +'<div class="wx-set-title" style="margin-top:14px">'+(isEs?'UNIDADES':'UNITS')+'</div>'
      +'<div class="wx-units-row">'
      +'<button class="wx-unit-btn'+(units==='F'?' wx-unit-active':'')+'" onclick="App.Weather.setUnits(\'F\')">°F</button>'
      +'<button class="wx-unit-btn'+(units==='C'?' wx-unit-active':'')+'" onclick="App.Weather.setUnits(\'C\')">°C</button>'
      +'</div>'
      +'<div class="wx-set-title" style="margin-top:14px">'+(isEs?'SOBRE EL PRONÓSTICO':'ABOUT OUTLOOK')+'</div>'
      +'<div class="wx-about-list">'
      +'<div class="wx-about-item"><span>✅</span><span>'+(isEs?'<strong>Bueno:</strong> Cielos despejados, viento leve, sin lluvia':'<strong>Good:</strong> Clear skies, mild wind, no rain expected')+'</span></div>'
      +'<div class="wx-about-item"><span>⚠️</span><span>'+(isEs?'<strong>Precaución:</strong> Nubes, posibilidad de lluvia o viento fuerte':'<strong>Caution:</strong> Some clouds, higher rain chance, or strong wind')+'</span></div>'
      +'<div class="wx-about-item"><span>⛔</span><span>'+(isEs?'<strong>No ideal:</strong> Lluvia, nieve, viento extremo o temperatura extrema':'<strong>Not ideal:</strong> Rain, heavy wind, snow, or extreme temps')+'</span></div>'
      +'</div>'
      +'</div>'
      +'<div class="wx-collapse-bar" onclick="App.Weather.toggle()">▲ '+(isEs?'Toca para cerrar':'Tap to collapse')+'</div>'
      +'</div>';
  }

  async function reverseGeocode(lat,lon){
    try{
      var r=await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+lat+'&longitude='+lon+'&localityLanguage=en');
      if(!r.ok) return null;
      var j=await r.json();
      if(j.city) return j.city+(j.principalSubdivision?', '+j.principalSubdivision:'');
      return null;
    }catch(e){return null;}
  }

  async function fetchCoords(lat,lon,name){
    if(!name) name=await reverseGeocode(lat,lon);
    if(!name) name='Lat '+lat.toFixed(2)+', Lon '+lon.toFixed(2);

    var url='https://api.open-meteo.com/v1/forecast?'
      +'latitude='+lat+'&longitude='+lon
      +'&current=temperature_2m,apparent_temperature,precipitation_probability,weathercode,windspeed_10m,is_day,relativehumidity_2m,uv_index'
      +'&hourly=temperature_2m,precipitation_probability,weathercode,windspeed_10m'
      +'&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
      +'&forecast_days=7&timezone=auto&wind_speed_unit=kmh';

    var r=await fetch(url);
    if(!r.ok) throw new Error('Weather fetch failed: '+r.status);
    var j=await r.json();

    var aqi=null;
    try{
      var aqiUrl='https://air-quality-api.open-meteo.com/v1/air-quality?latitude='+lat+'&longitude='+lon+'&current=us_aqi';
      var aqiR=await fetch(aqiUrl);
      if(aqiR.ok){
        var aqiJ=await aqiR.json();
        aqi=aqiJ.current&&aqiJ.current.us_aqi!=null?aqiJ.current.us_aqi:null;
      }
    }catch(e){ /* ignore */ }

    var d={
      fetchedAt:Date.now(),
      locationName:name,
      lat:lat,lon:lon,
      current:j.current,
      hourly:j.hourly,
      daily:j.daily,
      aqi:aqi
    };
    saveCache(d);
    saveLoc({lat:lat,lon:lon,name:name});
    return d;
  }

  async function geocodeCity(q){
    var raw=(q||'').trim();
    // Postal-code lookup: bare digits default to US; "<postal> <CC>" or "<CC> <postal>"
    // (CC = 2-letter country) hits that country. City names fall through to name search.
    var cc=null, postal=null, m;
    if(/^\d{3,10}$/.test(raw)){ cc='us'; postal=raw; }
    else if((m=raw.match(/^([A-Za-z]{2})[\s,]+([A-Za-z0-9][A-Za-z0-9\s-]{1,9})$/))){ cc=m[1].toLowerCase(); postal=m[2]; }
    else if((m=raw.match(/^([A-Za-z0-9][A-Za-z0-9\s-]{1,9})[\s,]+([A-Za-z]{2})$/))){ cc=m[2].toLowerCase(); postal=m[1]; }
    if(cc && postal){
      try{
        var zr=await fetch('https://api.zippopotam.us/'+cc+'/'+encodeURIComponent(postal.replace(/\s+/g,'')));
        if(zr.ok){
          var zj=await zr.json();
          var out=(zj.places||[]).map(function(p){
            return{lat:parseFloat(p.latitude),lon:parseFloat(p.longitude),name:(p['place name']||postal)+(p['state abbreviation']?', '+p['state abbreviation']:(p.state?', '+p.state:''))+' '+postal.trim()+', '+cc.toUpperCase()};
          });
          if(out.length) return out;
        }
      }catch(e){ /* fall through to name search */ }
    }
    var r=await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(raw)+'&count=5&language=en&format=json');
    if(!r.ok) throw new Error('Geocoding failed');
    var j=await r.json();
    return(j.results||[]).map(function(x){
      return{lat:x.latitude,lon:x.longitude,name:x.name+(x.admin1?', '+x.admin1:'')+', '+x.country_code};
    });
  }

  async function fetchAdvisory(lat,lon){
    try{
      var r=await fetch('https://api.weather.gov/alerts/active?point='+lat.toFixed(4)+','+lon.toFixed(4),
        {headers:{'User-Agent':'MinistryTracker/1.0 contact@example.com'}});
      if(!r.ok) return null;
      var j=await r.json();
      var feats=(j.features||[]).filter(function(f){return f.properties&&f.properties.event;});
      if(feats.length){
        try{localStorage.setItem(WX_ADVISORY_KEY,JSON.stringify({fetchedAt:Date.now(),features:feats}));}catch(e){ /* ignore */ }
      }
      return feats.length?feats:null;
    }catch(e){return null;}
  }

  function getEl(){ return document.getElementById('wxContainer'); }

  function renderSkeleton(){
    return'<div class="wx-card wx-skeleton-card" id="weatherCard">'
      +'<div class="wx-sk wx-sk-w120 wx-sk-h48"></div>'
      +'<div class="wx-sk wx-sk-w200 wx-sk-h16" style="margin-top:8px"></div>'
      +'</div>';
  }
  function renderError(msg){
    var isEs=state.lang==='es';
    return'<div class="wx-card wx-err-card" id="weatherCard">'
      +'<p class="wx-err-msg">⚠️ '+msg+'</p>'
      +'<div class="wx-search-row" style="margin-top:8px">'
      +'<input id="wxCityInput" class="wx-city-input" placeholder="'+(isEs?'Ciudad, o ZIP + país':'City, or ZIP + country')+'" type="text" onkeydown="if(event.key===\'Enter\')App.Weather.searchCity()">'
      +'<button class="btn btn-sm btn-primary" onclick="App.Weather.searchCity()">'+(isEs?'Buscar':'Search')+'</button>'
      +'</div>'
      +'<div id="wxSearchResults" class="wx-search-results"></div>'
      +'<div style="display:flex;gap:8px;margin-top:8px">'
      +'<button class="btn btn-sm" onclick="App.Weather.retry()">'+(isEs?'Reintentar':'Retry')+'</button>'
      +'<button class="btn btn-sm" onclick="App.Weather.useGPS()">'+(isEs?'Usar GPS':'Use GPS')+'</button>'
      +'</div></div>';
  }

  function render(d,advisory){
    var el=getEl(); if(!el) return;
    el.innerHTML=isExpanded()?renderExpanded(d,advisory):renderCollapsed(d,advisory);
  }

  App.Weather = {
    _data: null,
    _initRunning: false,

    async init(){
      if(App.Weather._initRunning) return;
      App.Weather._initRunning = true;
      var el=getEl(); if(!el){ App.Weather._initRunning=false; return; }
      injectWeatherCSS();
      var cached=loadCache();
      if(cached){
        App.Weather._data=cached;
        var adv=loadCachedAdvisory();
        render(cached,adv);
        // If location name is just coordinates, re-geocode silently
        if(cached.locationName&&/^Lat /.test(cached.locationName)&&cached.lat&&cached.lon){
          reverseGeocode(cached.lat,cached.lon).then(function(name){
            if(name&&App.Weather._data){
              App.Weather._data.locationName=name;
              saveCache(App.Weather._data);
              saveLoc({lat:App.Weather._data.lat,lon:App.Weather._data.lon,name:name});
              render(App.Weather._data,loadCachedAdvisory());
            }
          }).catch(function(){});
        }
        var _wxAgeMs = Date.now() - (cached.fetchedAt || 0);
        if (_wxAgeMs < WX_CACHE_TTL) {
          // Cache is fresh — skip all network fetches
          App.Weather._initRunning = false;
          return;
        }
        App.Weather.refresh(true);
        return;
      }
      el.innerHTML=renderSkeleton();
      App.Weather.useGPS();
      App.Weather._initRunning = false;
    },

    toggle(){
      setExpanded(!isExpanded());
      var d=App.Weather._data; if(!d) return;
      var adv=loadCachedAdvisory();
      render(d,adv);
    },

    setUnits:function(u){
      setUnitsStore(u);
      var d=App.Weather._data; if(!d) return;
      var adv=loadCachedAdvisory();
      render(d,adv);
    },

    async refresh(silent){
      var loc=loadLoc(); if(!loc){App.Weather.useGPS();return;}
      if(loc.name&&/^Lat\s/.test(loc.name)){loc.name=null;}
      var el=getEl();
      if(!silent&&el) el.innerHTML=renderSkeleton();
      try{
        var d=await fetchCoords(loc.lat,loc.lon,loc.name);
        App.Weather._data=d;
        var adv=await fetchAdvisory(loc.lat,loc.lon)||loadCachedAdvisory();
        render(d,adv);
      }catch(err){
        if(!silent&&el) el.innerHTML=renderError(err.message);
      }
    },

    useGPS:function(){
      var el=getEl();
      if(!('geolocation' in navigator)){
        if(el) el.innerHTML=renderError('Geolocation not supported'); return;
      }
      if(el) el.innerHTML=renderSkeleton();
      navigator.geolocation.getCurrentPosition(
        async function(pos){
          try{
            var d=await fetchCoords(pos.coords.latitude,pos.coords.longitude,null);
            App.Weather._data=d;
            var adv=await fetchAdvisory(d.lat,d.lon)||loadCachedAdvisory();
            render(d,adv);
          }catch(err){var el2=getEl();if(el2) el2.innerHTML=renderError(err.message);}
        },
        function(){var el2=getEl();if(el2) el2.innerHTML=renderError('Location denied — enter a city below');},
        {timeout:10000}
      );
    },

    async searchCity(){
      var inp=document.getElementById('wxCityInput'),q=inp?inp.value.trim():''; if(!q) return;
      var res=document.getElementById('wxSearchResults'); if(res) res.innerHTML='<div class="wx-searching">🔍...</div>';
      try{
        var results=await geocodeCity(q);
        if(!results.length){if(res) res.innerHTML='<div class="wx-no-results">No results</div>';return;}
        if(res) res.innerHTML=results.map(function(r){
          return'<button class="wx-result-btn" onclick="App.Weather.selectCity('+r.lat+','+r.lon+',\''+r.name.replace(/'/g,'&apos;')+'\')">'+r.name+'</button>';
        }).join('');
      }catch(e){if(res) res.innerHTML='<div class="wx-no-results">Error: '+e.message+'</div>';}
    },

    async selectCity(lat,lon,name){
      var el=getEl(); if(el) el.innerHTML=renderSkeleton();
      try{
        var d=await fetchCoords(lat,lon,name);
        App.Weather._data=d;
        var adv=await fetchAdvisory(lat,lon)||loadCachedAdvisory();
        render(d,adv);
      }catch(err){var el2=getEl();if(el2) el2.innerHTML=renderError(err.message);}
    },

    selectSaved:function(enc){
      try{var s=JSON.parse(decodeURIComponent(enc));App.Weather.selectCity(s.lat,s.lon,s.name);}catch(e){ /* ignore */ }
    },

    dismissAdvisory:function(){
      _advisoryDismissed=true;
      var el=document.getElementById('wxAdvisory'); if(el) el.remove();
    },

    toggleDayDesc:function(el,index){
      var all=document.querySelectorAll('.wx-day-desc');
      all.forEach(function(d){if(d.id!=='wxDayDesc'+index) d.hidden=true;});
      var desc=document.getElementById('wxDayDesc'+index);
      if(desc) desc.hidden=!desc.hidden;
    },

    async fetchAndShowAdvisory(){
      var d=App.Weather._data; if(!d) return;
      var features=loadCachedAdvisory()||await fetchAdvisory(d.lat,d.lon);
      if(!features||_advisoryDismissed) return;
      var container=getEl(); if(!container) return;
      var existing=document.getElementById('wxAdvisory'); if(existing) existing.remove();
      container.insertAdjacentHTML('afterbegin',renderAdvisory(features));
    },

    toggleLocPicker:function(){
      var el=document.getElementById('wxLocPicker');
      if(el) el.hidden=!el.hidden;
    },

    retry:function(){App.Weather.refresh();}
  };

  document.addEventListener('visibilitychange',function(){
    if(document.visibilityState==='visible'){
      var cached=loadCache();
      if(cached&&Date.now()-cached.fetchedAt>WX_CACHE_TTL) App.Weather.refresh(true);
    }
  });

  var _wxInitDone=false;
  var _wxBusy=false;var _wxLast=0;
  App.Weather._tryInit=function(){
    if(_wxBusy) return;
    var _now=Date.now();
    if(_now-_wxLast<300) return;
    _wxLast=_now; _wxBusy=true;
    try{
      injectWeatherCSS();
      var el=document.getElementById('wxContainer');
      if(!el){_wxBusy=false;return;}
      if(!App.Weather._data){
        App.Weather.init().then(function(){_wxBusy=false;}).catch(function(){_wxBusy=false;});
      } else {
        var adv=loadCachedAdvisory();
        render(App.Weather._data,adv);
        _wxBusy=false;
      }
    }catch(e){_wxBusy=false;}
  };

  function injectWeatherCSS(){
    if(document.getElementById('wx-style')) return;
    var css=`.wx-card{background:var(--surface,#1e2130);border-radius:16px;padding:14px 16px;margin-bottom:16px;box-shadow:0 2px 16px rgba(0,0,0,.18);}
[data-theme="light"] .wx-card{background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.08);}
.wx-collapsed-inner{display:flex;align-items:center;gap:10px;cursor:pointer;user-select:none;}
.wx-col-left{display:flex;align-items:center;gap:8px;}
.wx-col-emoji{font-size:28px;line-height:1;}
.wx-col-temp{font-size:26px;font-weight:700;letter-spacing:-1px;}
.wx-col-desc{font-size:13px;color:var(--text-dim,#8a93a8);}
.wx-col-right{flex:1;display:flex;flex-direction:column;align-items:flex-end;gap:2px;}
.wx-col-loc{font-size:12px;color:var(--text-dim,#8a93a8);}
.wx-col-age{font-size:11px;color:var(--text-dim,#8a93a8);}
.wx-chevron,.wx-chevron-up{font-size:12px;color:var(--text-dim,#8a93a8);margin-left:4px;}
.wx-outlook-pill{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600;}
.wx-ol-good{background:rgba(16,185,129,.15);color:#10b981;}
.wx-ol-caution{background:rgba(245,158,11,.15);color:#f59e0b;}
.wx-ol-bad{background:rgba(239,68,68,.15);color:#ef4444;}
.wx-exp-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.wx-narrative{font-size:13px;color:var(--text-dim,#8a93a8);line-height:1.5;margin-bottom:12px;padding:8px 10px;background:rgba(255,255,255,.04);border-radius:8px;}
[data-theme="light"] .wx-narrative{background:rgba(0,0,0,.04);}
.wx-current{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:14px;}
.wx-cur-main{display:flex;align-items:flex-start;gap:10px;}
.wx-temp-big{font-size:52px;font-weight:700;letter-spacing:-2px;line-height:1;}
.wx-cur-detail{display:flex;flex-direction:column;gap:3px;padding-top:6px;}
.wx-cond-label{font-size:16px;font-weight:500;}
.wx-feels,.wx-wind,.wx-precip{font-size:13px;color:var(--text-dim,#8a93a8);}
.wx-ol-block{border-left:4px solid;border-radius:8px;padding:8px 12px;background:rgba(255,255,255,.04);display:flex;flex-direction:column;gap:4px;}
[data-theme="light"] .wx-ol-block{background:rgba(0,0,0,.04);}
.wx-sun-row{display:flex;gap:8px;margin-top:6px;}
.wx-sun-item{font-size:12px;color:var(--text-dim,#8a93a8);}
.wx-badge{font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;border:1px solid;display:inline-block;}
.wx-section-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim,#8a93a8);margin:0 0 8px;}
.wx-hourly-scroll{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:14px;-webkit-overflow-scrolling:touch;scrollbar-width:none;}
.wx-hourly-scroll::-webkit-scrollbar{display:none;}
.wx-hour{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:52px;background:rgba(255,255,255,.05);border-radius:10px;padding:8px 6px;}
[data-theme="light"] .wx-hour{background:rgba(0,0,0,.04);}
.wx-h-time{font-size:10px;color:var(--text-dim,#8a93a8);}
.wx-h-icon{font-size:18px;}
.wx-h-temp{font-size:13px;font-weight:600;}
.wx-h-rain{font-size:10px;color:#60a5fa;}
.wx-daily{display:flex;flex-direction:column;gap:2px;margin-bottom:14px;}
.wx-day{display:flex;align-items:center;gap:10px;padding:6px 4px;border-bottom:1px solid rgba(255,255,255,.06);cursor:pointer;transition:background .15s;}
.wx-day:hover{background:rgba(255,255,255,.04);border-radius:8px;}
[data-theme="light"] .wx-day{border-bottom-color:rgba(0,0,0,.06);}
[data-theme="light"] .wx-day:hover{background:rgba(0,0,0,.03);}
.wx-day:last-child{border-bottom:none;}
.wx-day-today{font-weight:700;}
.wx-d-name{width:38px;font-size:13px;}
.wx-d-icon{font-size:18px;width:24px;text-align:center;}
.wx-d-range{flex:1;font-size:13px;}
.wx-d-rain{font-size:12px;color:#60a5fa;width:32px;text-align:right;}
.wx-day-desc{padding:6px 12px 10px 12px;font-size:13px;color:var(--text,#e2e8f0);line-height:1.6;background:rgba(255,255,255,.05);border-radius:8px;margin:2px 0 6px 0;}[data-theme="light"] .wx-day-desc{background:rgba(0,0,0,.04);color:var(--text,#1a1a2e);}
.wx-settings{border-top:1px solid rgba(255,255,255,.08);padding-top:14px;margin-top:4px;}
[data-theme="light"] .wx-settings{border-top-color:rgba(0,0,0,.08);}
.wx-set-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text-dim,#8a93a8);margin-bottom:8px;}
.wx-gps-btn{width:100%;padding:9px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);color:var(--text,#fff);font-size:13px;cursor:pointer;text-align:left;margin-bottom:8px;}
[data-theme="light"] .wx-gps-btn{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1);color:inherit;}
.wx-gps-btn:hover{background:rgba(255,255,255,.1);}
.wx-search-row{display:flex;gap:8px;margin-bottom:8px;}
.wx-city-input{flex:1;padding:9px 12px;border-radius:8px;border:1px solid var(--border,#333);background:var(--input-bg,#2a2f45);color:var(--text,#fff);font-size:14px;}
.wx-search-results{display:flex;flex-direction:column;gap:4px;max-height:180px;overflow-y:auto;}
.wx-result-btn{text-align:left;padding:9px 12px;border-radius:8px;border:none;background:rgba(255,255,255,.06);color:var(--text,#fff);cursor:pointer;font-size:13px;}
[data-theme="light"] .wx-result-btn{background:rgba(0,0,0,.04);color:inherit;}
.wx-result-btn:hover{background:rgba(255,255,255,.12);}
.wx-saved-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;}
.wx-saved-chip{padding:5px 12px;border-radius:20px;border:1px solid var(--border,#444);background:transparent;color:var(--text-dim,#8a93a8);font-size:12px;cursor:pointer;}
.wx-saved-chip:hover{background:rgba(255,255,255,.08);}
.wx-units-row{display:flex;gap:8px;}
.wx-unit-btn{padding:8px 20px;border-radius:8px;border:1px solid var(--border,#444);background:transparent;color:var(--text-dim,#8a93a8);font-size:14px;cursor:pointer;font-weight:500;}
.wx-unit-active{background:var(--accent,#6366f1);border-color:var(--accent,#6366f1);color:#fff;font-weight:600;}
.wx-about-list{display:flex;flex-direction:column;gap:8px;}
.wx-about-item{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:var(--text-dim,#8a93a8);}
.wx-about-item strong{color:var(--text,#fff);}
.wx-advisory{border-radius:12px;padding:10px 14px;margin-bottom:10px;}
.wx-adv-extreme,.wx-adv-severe{background:rgba(239,68,68,.15);border-left:4px solid #ef4444;}
.wx-adv-moderate{background:rgba(245,158,11,.15);border-left:4px solid #f59e0b;}
.wx-adv-minor{background:rgba(96,165,250,.15);border-left:4px solid #60a5fa;}
[data-theme="light"] .wx-adv-extreme,[data-theme="light"] .wx-adv-severe{background:rgba(239,68,68,.10);}
[data-theme="light"] .wx-adv-moderate{background:rgba(245,158,11,.10);}
.wx-adv-inner{display:flex;align-items:flex-start;gap:10px;}
.wx-adv-icon{font-size:18px;flex-shrink:0;margin-top:2px;}
.wx-adv-body{flex:1;display:flex;flex-direction:column;gap:2px;}
.wx-adv-body strong{font-size:13px;}
.wx-adv-body span{color:var(--text-dim,#8a93a8);font-size:12px;line-height:1.4;}
.wx-adv-more{color:var(--accent,#6366f1);font-size:12px;font-weight:600;}
.wx-adv-dismiss{background:none;border:none;color:var(--text-dim,#8a93a8);font-size:18px;cursor:pointer;padding:0 0 0 8px;flex-shrink:0;}
.wx-skeleton-card{min-height:80px;}
.wx-sk{border-radius:6px;background:rgba(255,255,255,.08);animation:wx-pulse 1.5s ease-in-out infinite;}
.wx-sk-w120{width:120px;}.wx-sk-w200{width:200px;}
.wx-sk-h48{height:48px;}.wx-sk-h16{height:16px;}
@keyframes wx-pulse{0%,100%{opacity:1}50%{opacity:.4}}
.wx-searching,.wx-no-results{font-size:13px;color:var(--text-dim,#8a93a8);padding:8px;}
.wx-err-card{text-align:center;padding:20px;}.wx-err-msg{font-size:14px;color:var(--text-dim,#8a93a8);}
.wx-refresh-btn{padding:4px 10px;font-size:16px;}
.wx-col-meta{display:flex;align-items:center;gap:8px;margin-top:6px;padding-top:6px;border-top:1px solid rgba(255,255,255,.06);}
[data-theme="light"] .wx-col-meta{border-top-color:rgba(0,0,0,.06);}
.wx-expand-hint{font-size:11px;font-weight:600;color:var(--accent,#6366f1);text-align:center;margin-top:8px;letter-spacing:.05em;padding:4px;border-top:1px solid rgba(255,255,255,.06);}
[data-theme="light"] .wx-expand-hint{border-top-color:rgba(0,0,0,.06);}
.wx-collapse-btn{background:rgba(52,211,153,0.12);border:1px solid rgba(52,211,153,0.3);color:var(--accent,#34d399);font-size:12px;font-weight:700;padding:6px 14px;border-radius:20px;cursor:pointer;letter-spacing:0.05em;}
[data-theme="light"] .wx-collapse-btn{background:rgba(5,150,105,0.1);border-color:rgba(5,150,105,0.3);color:var(--accent,#059669);}
.wx-collapse-bar{text-align:center;padding:12px;font-size:12px;font-weight:700;color:var(--accent,#34d399);cursor:pointer;margin-top:8px;border-top:1px solid rgba(52,211,153,0.2);letter-spacing:.05em;}
[data-theme="light"] .wx-collapse-bar{border-top-color:rgba(5,150,105,0.2);color:var(--accent,#059669);}
.wx-collapse-bar:hover{color:var(--text,#fff);}
.wx-loc-section{margin-bottom:4px;}
.wx-loc-row{display:flex;flex-direction:column;gap:8px;}
.wx-loc-pill{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:20px;border:1px solid var(--border,#444);background:transparent;color:var(--text,#fff);font-size:13px;cursor:pointer;align-self:flex-start;}
.wx-loc-pill:hover{background:rgba(255,255,255,.06);}
[data-theme="light"] .wx-loc-pill{color:inherit;}
.wx-loc-picker{margin-top:8px;display:flex;flex-direction:column;gap:8px;}
.wx-gps-btn2{width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:var(--text,#fff);font-size:14px;cursor:pointer;text-align:left;font-weight:500;}
[data-theme="light"] .wx-gps-btn2{background:rgba(0,0,0,.04);border-color:rgba(0,0,0,.1);color:inherit;}
.wx-gps-btn2:hover{background:rgba(255,255,255,.1);}
.wx-expand-bar{text-align:center;padding:8px;font-size:12px;font-weight:700;letter-spacing:0.08em;color:var(--accent,#34d399);border-top:1px solid rgba(255,255,255,0.07);margin-top:6px;}
[data-theme="light"] .wx-expand-bar{border-top-color:rgba(0,0,0,0.07);color:var(--accent,#059669);}
`;
    var el=document.createElement('style');el.id='wx-style';el.textContent=css;
    document.head.appendChild(el);
  }

})(window.App=window.App||{});
// ─── End Stage J Weather Redesign v57 ────────────────────────
