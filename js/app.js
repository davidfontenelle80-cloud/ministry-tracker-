/**
 * app.js — Ministry Tracker
 * Field service hour tracker for JW congregation. EN/ES bilingual.
 */

/* ===== STATE / CONFIG ===== */
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
    carryOverMin: 0,
    lastMonthProcessed: null,
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
    haptics: 'Haptic feedback',
    backupReminder: 'Monthly backup reminder',
    roundMins: 'Round minutes', roundOff: 'Off (exact)',
    autoPause: 'Auto-pause (min idle, 0 = off)',
    data: 'Data', exportBtn: 'Export backup', backupBtn: 'Backup',
    pastSY: 'Past service years', pastSYNone: 'No past years archived yet.',
    pastSYHours: 'hours', pastSYStudies: 'studies', pastSYDays: 'days', pastSYArchived: 'archived',
    importBtn: 'Import from file', pasteImportBtn: 'Paste backup text',
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
    backupTitle: 'Backup & restore',
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
    reminderScheduled: 'Reminder scheduled',
    reminderSyncSaved: 'Reminder scheduled',
    reminderSyncFailed: 'Reminder sync failed',
    reminderSyncSkipped: 'Reminder sync skipped',
    notifDenied: 'Notifications disabled. Enable in device Settings.',
    notifUnsupported: 'Notifications not supported on this device',
    noNotifLabel: 'Due date only — no notification',
    confirmDeleteNote: 'Delete this note?',
        noteDueDate: 'Due date',
    noteDueTime: 'Due time',
    noteReminder: 'Reminder',
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
    haptics: 'Vibración táctil',
    backupReminder: 'Recordatorio mensual de respaldo',
    roundMins: 'Redondear minutos', roundOff: 'Exacto',
    autoPause: 'Pausa automática (min inactivo, 0 = apagado)',
    data: 'Datos', exportBtn: 'Exportar respaldo', backupBtn: 'Respaldo',
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
    reminderScheduled: 'Reminder scheduled',
    reminderSyncSaved: 'Reminder scheduled',
    reminderSyncFailed: 'Reminder sync failed',
    reminderSyncSkipped: 'Reminder sync skipped',
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
    '.mn-category-card::before{content:\"\";position:absolute;inset:0 auto 0 0;width:5px;background:var(--mn-color,var(--accent))}',
    '.mn-category-icon{width:44px;height:44px;border-radius:11px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--mn-color,var(--accent)) 18%,transparent);font-size:24px}',
    '.mn-card-actions{display:flex;gap:6px}',
    '.mn-empty{padding:40px 20px;text-align:center;border:1px dashed var(--border);border-radius:14px;background:var(--surface);color:var(--text-dim)}',
    '.mn-empty-icon{width:56px;height:56px;border-radius:14px;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:var(--surface-2,var(--surface));font-size:26px}',
    '.mn-empty-cta{display:inline-flex;align-items:center;gap:6px;margin-top:18px;padding:10px 20px;border-radius:999px;background:var(--accent,#34d399);color:var(--on-accent,#06120e);font-size:14px;font-weight:700;border:none;cursor:pointer;transition:opacity .15s ease}',
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
        } catch(e) {}
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
    try { navigator.vibrate(p); } catch(e) {}
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
    try { localStorage.setItem(archKey, JSON.stringify(archive)); } catch(e) {}
    state.sessions = [];
    state.studiesByDate = {};
    state.creditEntries = [];
    state.creditByMonth = {};
    state.plannedByDate = {};
    state.carryOverMin = 0;
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
    const prevTotal = getMonthMinutes(prevMK);
    const remainderMins = prevTotal % 60;
    if (remainderMins > 0) {
      // Carry-over is a field-service planning helper, not credit-hour storage.
      state.carryOverMin = remainderMins;
    } else {
      state.carryOverMin = 0;
    }
  } else {
    state.carryOverMin = 0;
  }

  state.lastMonthProcessed = currentMK;
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
        try { archives[key] = JSON.parse(localStorage.getItem(key)); } catch(e) {}
      }
    }
  } catch(e) {}
  return archives;
}

/* ===== AGGREGATIONS ===== */
function getSessionsForDate(d) { return state.sessions.filter(s => s.date === d && s.stopISO); }
function getDayMinutes(d) { return getSessionsForDate(d).reduce((a,s) => a + (s.durationMin||0), 0); }
function getMonthMinutes(mk) {
  return state.sessions.filter(s => s.date.startsWith(mk) && s.stopISO).reduce((a,s) => a + (s.durationMin||0), 0);
}
function getMonthSessions(mk) { return state.sessions.filter(s => s.date.startsWith(mk) && s.stopISO); }
function getMonthStudies(mk) { return getMonthSessions(mk).reduce((a,s) => a + (s.studies||0), 0); }
// Unique dates with any logged minutes this month: the "Service days" stat.
function getMonthServiceDays(mk) {
  const days = new Set();
  for (const s of state.sessions) {
    if (s.date && s.date.startsWith(mk) && s.stopISO && (s.durationMin || 0) > 0) {
      days.add(s.date);
    }
  }
  return days.size;
}
function getCreditEntriesForMonth(mk) {
  return (Array.isArray(state.creditEntries) ? state.creditEntries : [])
    .filter(e => e && e.date && e.date.startsWith(mk) && (parseInt(e.minutes, 10) || 0) > 0);
}
function getMonthCredit(mk) {
  return getCreditEntriesForMonth(mk)
    .reduce((a, e) => a + (parseInt(e.minutes, 10) || 0), 0);
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
  return state.sessions.filter(x => x.date >= s && x.date <= e && x.stopISO).reduce((a,x) => a + (x.durationMin||0), 0);
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
    lbl_data: 'data', lbl_exportBtn: 'exportBtn',
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
  const cat = categoryLabel(s.category);
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
        planEl.innerHTML = `<i class="fa-solid fa-bullseye text-blue"></i> ${t('plannedHours')}: ${formatHM(planned)} <span style="color:var(--coral);"> (${formatHM(diff)})</span>`;
      }
    } else {
      planEl.textContent = '';
    }
  }

  // Sessions list
  const sessions = getSessionsForDate(date).sort((a,b) => a.startISO.localeCompare(b.startISO));
  const list = document.getElementById('adjSessionsList');
  if (sessions.length === 0) {
    list.innerHTML = `<div class="card-flat text-faint text-sm text-center" style="padding:14px;">${t('empty')}</div>`;
  } else {
    list.innerHTML = sessions.map(sessionCardHTML).join('');
    list.querySelectorAll('[data-edit-session]').forEach(el => {
      el.onclick = () => openEditSessionModal(el.dataset.editSession);
    });
  }
}

/* ---------- LOG ---------- */
function renderLog() {
  const all = state.sessions.filter(s => s.stopISO).sort((a,b) => b.startISO.localeCompare(a.startISO));
  const today = todayStr();
  const now = new Date(); const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate()-7);
  const wAgoStr = ymd(weekAgo); const mk = monthKey(now);
  let filtered;
  if (logFilter === 'today') filtered = all.filter(s => s.date === today);
  else if (logFilter === 'week') filtered = all.filter(s => s.date >= wAgoStr);
  else filtered = all.filter(s => s.date.startsWith(mk)); // month is the default

  // Apply search filter: case-insensitive match on note text
  const q = (logSearch || '').trim().toLowerCase();
  if (q) {
    filtered = filtered.filter(s => (s.note || '').toLowerCase().includes(q));
  }

  const list = document.getElementById('logList');
  if (!list) return; // Log screen removed in Stage A — log history is in Reports
  if (!filtered.length) {
    const msg = q ? t('searchEmpty').replace('{q}', escapeHtml(q)) : t('empty');
    list.innerHTML = `<div class="card text-center text-faint">${msg}</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(s => { (groups[s.date] = groups[s.date] || []).push(s); });
  const dks = Object.keys(groups).sort((a,b) => b.localeCompare(a));
  list.innerHTML = dks.map(dk => {
    const dayMins = groups[dk].reduce((a,s) => a + (s.durationMin || 0), 0);
    const d = fromYmd(dk);
    const dateLbl = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <div>
        <div class="row-between mb-2 px-4">
          <span class="text-xs font-bold uppercase tracking-wider text-dim">${dateLbl}</span>
          <div class="row gap-2 items-center">
            <span class="text-xs font-mono font-bold text-accent">${formatHM(dayMins)}</span>
            <button class="btn btn-secondary text-xs" style="padding:6px 10px;" data-log-add-date="${dk}">
              <i class="fa-solid fa-plus text-accent"></i>
              <span>Add</span>
            </button>
          </div>
        </div>
        <div class="stack-2">${groups[dk].map(sessionCardHTML).join('')}</div>
      </div>`;
  }).join('');
  list.querySelectorAll('[data-log-add-date]').forEach(el => {
    el.onclick = () => openQuickAddModal(el.dataset.logAddDate);
  });
  list.querySelectorAll('[data-edit-session]').forEach(el => {
    el.onclick = () => openEditSessionModal(el.dataset.editSession);
  });
}

/* ---------- NOTES & REMINDERS (Stage A placeholder) ---------- */
function renderNotes() {
  const scr = document.getElementById('notesContent');
  if (!scr) return;
  injectMinistryNotesPolishCss();
  const lang = state.lang || 'en';
  if (!Array.isArray(state.ministryNoteCategories) || state.ministryNoteCategories.length === 0) {
    state.ministryNoteCategories = DEFAULT_MINISTRY_NOTE_CATEGORIES.map(c => ({
      id: c.id, name: { en: c.name.en, es: c.name.es }, icon: c.icon, color: c.color,
    }));
    saveState();
  }
  if (currentNotesView === 'notes' && currentNotesCategoryId) {
    var cat = state.ministryNoteCategories.find(function(c) { return c.id === currentNotesCategoryId; });
    if (cat) { renderNotesListView(scr, cat); return; }
    currentNotesView = 'categories'; currentNotesCategoryId = null;
  }
  if (currentNotesView === 'all') {
    renderNotesListView(scr, null);
    return;
  }
  const cats = state.ministryNoteCategories;
  const n = cats.length;
  const countLabel = t('categoryCount').replace('{n}', n);
  var gridHTML;
  if (n === 0) {
    gridHTML = '<div class="card text-center" style="padding:40px 16px;">' +
      '<div class="text-faint text-sm mb-4">' + t('noCategories') + '</div>' +
      '<button class="btn btn-primary" data-add-cat>' +
      '<i class="fa-solid fa-plus"></i><span>' + t('addCategory') + '</span></button></div>';
  } else {
    var cards = cats.map(function(cat) {
      var name = ministryCategoryName(cat);
      var color = cat.color || 'var(--accent)';
      var icon = cat.icon || '📝';
      var nc = (state.ministryNotes || []).filter(function(mn) { return mn.categoryId === cat.id; }).length;
      return '<div class="card" data-cat-open="' + cat.id + '" style="border:1.5px solid ' + color + '55; border-left:4px solid ' + color +
        '; box-shadow:0 0 0 2px ' + color + '33; display:flex; flex-direction:column; justify-content:space-between; min-height:110px; cursor:pointer;">' +
        '<div><div style="font-size:26px; line-height:1; margin-bottom:6px;">' + escapeHtml(icon) + '</div>' +
        '<div class="font-semibold text-sm">' + escapeHtml(name) + '</div>' +
        (nc > 0 ? '<div class="text-tiny text-faint mt-1">' + nc + '</div>' : '') + '</div>' +
        '<div class="row gap-1 mt-3" style="justify-content:flex-end;">' +
        '<button class="btn btn-secondary btn-icon" data-cat-edit="' + cat.id + '" style="width:44px;height:44px;" aria-label="' + t('editCategory') + '">' +
        '<i class="fa-solid fa-pen" style="font-size:11px;"></i></button>' +
        '<button class="btn btn-secondary btn-icon" data-cat-del="' + cat.id + '" style="width:44px;height:44px;" aria-label="' + t('deleteCategory') + '">' +
        '<i class="fa-solid fa-trash" style="font-size:11px; color:var(--coral);"></i></button>' +
        '</div></div>';
    }).join('');
    gridHTML = '<div class="grid grid-2">' + cards + '</div>';
  }
  gridHTML = n === 0
    ? '<div class="mn-empty"><div class="mn-empty-icon"><i class="fa-regular fa-note-sticky"></i></div>' +
      '<div class="font-bold mb-1">' + escapeHtml(t('noCategories')) + '</div>' +
      '<div class="text-sm mb-4">' + escapeHtml(t('notesEmptyHint')) + '</div>' +
      '<button class="btn btn-primary" data-add-cat><i class="fa-solid fa-plus"></i><span>' + escapeHtml(t('addCategory')) + '</span></button></div>'
    : '<div class="mn-category-grid">' + cats.map(function(cat) {
      var name = ministryCategoryName(cat);
      var color = cat.color || 'var(--accent)';
      var icon = cat.icon || '\uD83D\uDCDD';
      var catNotes = (state.ministryNotes || []).filter(function(mn) { return mn.categoryId === cat.id; });
      var activeCount = catNotes.filter(ministryNoteMatchesFilter).length;
      var dueCount = catNotes.filter(function(note) { return !!note.dueDate && !note.completed && !note.archived; }).length;
      return '<div class="mn-category-card" data-cat-open="' + escapeHtml(cat.id) + '" style="--mn-color:' + escapeHtml(color) + '">' +
        '<div class="row-between" style="align-items:flex-start;gap:10px;">' +
        '<div class="mn-category-icon">' + escapeHtml(icon) + '</div>' +
        '<div class="mn-card-actions">' +
        '<button class="btn btn-secondary btn-icon" data-cat-edit="' + escapeHtml(cat.id) + '" style="width:40px;height:40px;" aria-label="' + escapeHtml(t('editCategory')) + '"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>' +
        '<button class="btn btn-secondary btn-icon" data-cat-del="' + escapeHtml(cat.id) + '" style="width:40px;height:40px;" aria-label="' + escapeHtml(t('deleteCategory')) + '"><i class="fa-solid fa-trash" style="font-size:11px;color:var(--coral);"></i></button>' +
        '</div></div>' +
        '<div class="font-bold text-base mt-3">' + escapeHtml(name) + '</div>' +
        '<div class="text-sm text-dim mt-1">' + catNotes.length + ' ' + escapeHtml(t('allNotes').toLowerCase()) + '</div>' +
        '<div class="mn-badges"><span class="mn-badge">' + activeCount + ' ' + escapeHtml(t('notesFilterActive')) + '</span>' +
        (dueCount ? '<span class="mn-badge"><i class="fa-regular fa-clock"></i>' + dueCount + '</span>' : '') +
        '</div></div>';
    }).join('') + '</div>';
  scr.innerHTML =
    '<div class="card card-flat mb-4"><div class="text-sm text-dim">' + t('notesCategoriesHint') + '</div></div>' +
    '<div class="row-between mb-3" style="gap:8px;align-items:center;flex-wrap:wrap;"><span class="text-xs font-bold uppercase tracking-wider text-dim">' + countLabel + '</span>' +
    '<div class="row gap-2" style="flex-wrap:wrap;justify-content:flex-end;">' +
    '<button class="btn btn-secondary" data-all-notes style="font-size:13px;padding:7px 14px;">' + escapeHtml(t('allNotes')) + '</button>' +
    '<button class="btn btn-secondary" data-push-test style="font-size:13px;padding:7px 14px;">' + escapeHtml(t('testPush')) + '</button>' +
    '<button class="btn btn-primary" data-add-cat style="font-size:13px;padding:7px 14px;">' +
    '<i class="fa-solid fa-plus"></i><span>' + t('addCategory') + '</span></button></div></div>' +
    gridHTML;
  scr.querySelectorAll('[data-add-cat]').forEach(function(el) { el.addEventListener('click', openAddCategoryModal); });
  var allNotesBtn = scr.querySelector('[data-all-notes]');
  if (allNotesBtn) allNotesBtn.addEventListener('click', function() { currentNotesView = 'all'; currentNotesCategoryId = null; renderNotes(); });
  scr.querySelectorAll('[data-push-test]').forEach(function(el) {
    el.addEventListener('click', function() { runMinistryPushDiagnostic(el); });
  });
  scr.querySelectorAll('[data-cat-open]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (!e.target.closest('[data-cat-edit],[data-cat-del]')) { openNotesCategory(el.dataset.catOpen); }
    });
  });
  scr.querySelectorAll('[data-cat-edit]').forEach(function(el) {
    el.addEventListener('click', function(e) { e.stopPropagation(); openEditCategoryModal(el.dataset.catEdit); });
  });
  scr.querySelectorAll('[data-cat-del]').forEach(function(el) {
    el.addEventListener('click', function(e) { e.stopPropagation(); deleteMinistryNoteCategory(el.dataset.catDel); });
  });
}

function openNotesCategory(categoryId) {
  currentNotesCategoryId = categoryId;
  currentNotesView = 'notes';
  renderNotes();
}

function renderNotesListView(scr, cat) {
  if (!Array.isArray(state.ministryNotes)) state.ministryNotes = [];
  var isAllNotesView = !cat;
  if (!cat) cat = { id: '', name: t('allNotes'), icon: '\uD83D\uDCDD' };
  var notes = state.ministryNotes.filter(function(n) { return isAllNotesView || n.categoryId === cat.id; })
    .filter(ministryNoteMatchesFilter)
    .filter(ministryNoteMatchesSearch);
  notes = sortMinistryNotes(notes);
  var catName = isAllNotesView ? t('allNotes') : ministryCategoryName(cat);
  var icon = cat.icon || '📝';
  var noNotesMessage = (currentNotesSearch || currentNotesFilter !== 'active') ? t('noNotesFound') : t('noNotesInCategory');
  var noteCards = notes.length === 0
    ? '<div class="card text-center" style="padding:40px 16px;"><div class="text-faint text-sm">' + escapeHtml(noNotesMessage) + '</div></div>'
    : notes.map(function(note) {
        var preview = (note.body || '').slice(0, 60) + ((note.body || '').length > 60 ? '…' : '');
        var noteCompl = note.completed ? 'opacity:0.55;text-decoration:line-through' : '';
                var noteBadges = '';
                if(note.priority==='high') noteBadges+='<span style="background:var(--coral);color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">▲ '+(I18N[state.lang].priorityHigh||'High')+'</span>';
                if(note.priority==='medium') noteBadges+='<span style="background:#f59e0b;color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">◆ '+(I18N[state.lang].priorityMedium||'Medium')+'</span>';
                if(note.priority==='low') noteBadges+='<span style="background:var(--accent);color:#fff;font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">▼ '+(I18N[state.lang].priorityLow||'Low')+'</span>';
                if(note.status&&note.status!=='open'){var _sl={'in-progress':I18N[state.lang].statusInProgress||'In Progress','done':I18N[state.lang].statusDone||'Done'};noteBadges+='<span style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim);font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">'+(_sl[note.status]||note.status)+'</span>';}
                if(note.dueDate){var _d=new Date(note.dueDate+'T00:00'),_ms=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],_ds=_ms[_d.getMonth()]+' '+_d.getDate()+(_d.getFullYear()!==new Date().getFullYear()?', '+_d.getFullYear():'');noteBadges+='<span style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim);font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">📅 '+_ds+'</span>';}
                if(note.archived) noteBadges+='<span style="background:var(--surface);border:1px solid var(--border);color:var(--text-dim);font-size:0.65rem;padding:1px 6px;border-radius:99px;margin-right:3px">'+(I18N[state.lang].noteArchived||'Archived')+'</span>';
                var badgeRow=noteBadges?'<div style="margin-bottom:4px">'+noteBadges+'</div>':'';
                var dateStr = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString() : '';
        return '<div class="card mb-3" data-note-card="' + escapeHtml(note.id) + '" style="cursor:pointer;">' +
          badgeRow + '<div class="font-semibold text-sm mb-1" style="'+noteCompl+'">' + escapeHtml(note.title || '') + '</div>' +
          (preview ? '<div class="text-sm text-dim mb-2">' + escapeHtml(preview) + '</div>' : '') +
          '<div class="row-between" style="align-items:center;"><span class="text-tiny text-faint">' + escapeHtml(dateStr) + '</span>' +
          '<div class="row gap-1">' +
          '<button class="btn btn-secondary btn-icon" data-note-edit="' + note.id + '" data-note-cat="' + cat.id + '" style="width:36px;height:36px;" aria-label="' + t('editNote') + '">' +
          '<i class="fa-solid fa-pen" style="font-size:11px;"></i></button>' +
          '<button class="btn btn-secondary btn-icon" data-note-del="' + note.id + '" style="width:36px;height:36px;" aria-label="' + t('deleteNote') + '">' +
          '<i class="fa-solid fa-trash" style="font-size:11px; color:var(--coral);"></i></button>' +
          '</div></div></div>';
      }).join('');
  var notesToolbar = '<div class="card card-flat mb-3" style="padding:12px;">' +
    '<div class="row gap-2" style="align-items:center;flex-wrap:wrap;">' +
    '<input id="mnNotesSearch" class="input" type="search" value="' + escapeHtml(currentNotesSearch || '') + '" placeholder="' + escapeHtml(t('notesSearchPlaceholder')) + '" style="flex:1 1 170px;min-width:0;">' +
    '<select id="mnNotesFilter" class="input" style="flex:0 0 150px;min-height:40px;">' +
    '<option value="active"' + (currentNotesFilter === 'active' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterActive')) + '</option>' +
    '<option value="all"' + (currentNotesFilter === 'all' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterAll')) + '</option>' +
    '<option value="completed"' + (currentNotesFilter === 'completed' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterCompleted')) + '</option>' +
    '<option value="archived"' + (currentNotesFilter === 'archived' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterArchived')) + '</option>' +
    '</select></div></div>';
  notesToolbar = '<div class="mn-notes-controls">' +
    '<input id="mnNotesSearch" class="input" type="search" value="' + escapeHtml(currentNotesSearch || '') + '" placeholder="' + escapeHtml(t('notesSearchPlaceholder')) + '">' +
    '<select id="mnNotesFilter" class="input" style="min-height:44px;">' +
    '<option value="active"' + (currentNotesFilter === 'active' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterActive')) + '</option>' +
    '<option value="open"' + (currentNotesFilter === 'open' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterOpen')) + '</option>' +
    '<option value="in-progress"' + (currentNotesFilter === 'in-progress' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterInProgress')) + '</option>' +
    '<option value="done"' + (currentNotesFilter === 'done' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterDone')) + '</option>' +
    '<option value="all"' + (currentNotesFilter === 'all' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterAll')) + '</option>' +
    '<option value="completed"' + (currentNotesFilter === 'completed' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterCompleted')) + '</option>' +
    '<option value="archived"' + (currentNotesFilter === 'archived' ? ' selected' : '') + '>' + escapeHtml(t('notesFilterArchived')) + '</option>' +
    '</select>' +
    '<select id="mnNotesSort" class="input" style="min-height:44px;">' +
    '<option value="updated"' + (currentNotesSort === 'updated' ? ' selected' : '') + '>' + escapeHtml(t('notesSortUpdated')) + '</option>' +
    '<option value="due"' + (currentNotesSort === 'due' ? ' selected' : '') + '>' + escapeHtml(t('notesSortDue')) + '</option>' +
    '<option value="priority"' + (currentNotesSort === 'priority' ? ' selected' : '') + '>' + escapeHtml(t('notesSortPriority')) + '</option>' +
    '<option value="title"' + (currentNotesSort === 'title' ? ' selected' : '') + '>' + escapeHtml(t('notesSortTitle')) + '</option>' +
    '</select></div>';
  noteCards = notes.length === 0
    ? '<div class="mn-empty">' +
      '<div class="mn-empty-icon"><i class="fa-regular fa-note-sticky"></i></div>' +
      '<div class="font-bold mb-1">' + escapeHtml((currentNotesSearch || currentNotesFilter !== 'active') ? t('noNotesSearch') : t('notesEmptyTitle')) + '</div>' +
      '<div class="text-sm">' + escapeHtml((currentNotesSearch || currentNotesFilter !== 'active') ? t('noNotesFound') : t('notesEmptyHint')) + '</div>' +
      ((!currentNotesSearch && currentNotesFilter === 'active') ? '<button class="mn-empty-cta" data-mn-add-from-empty><i class="fa-solid fa-plus"></i><span>' + escapeHtml(t('mnAddNote')) + '</span></button>' : '') +
      '</div>'
    : '<div class="mn-note-grid">' + notes.map(function(note) {
      var catInfo = ministryNoteCategory(note.categoryId);
      var title = note.title || t('noteUntitled');
      var preview = note.body || t('noteNoBody');
      var cardClass = 'mn-note-card' + ((note.completed || note.status === 'done') ? ' done' : '') + (note.archived ? ' archived' : '');
      var statusLabel = ministryNoteStatusLabel(note);
      var dueLabel = ministryNoteDueLabel(note);
      var updatedLabel = note.updatedAt ? new Date(note.updatedAt).toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US') : '';
      var priorityLabel = note.priority ? (note.priority === 'high' ? t('priorityHigh') : note.priority === 'medium' ? t('priorityMedium') : t('priorityLow')) : '';
      var badges = '';
      if (priorityLabel) badges += '<span class="mn-badge priority-' + escapeHtml(note.priority) + '">' + escapeHtml(priorityLabel) + '</span>';
      if (statusLabel) badges += '<span class="mn-badge">' + escapeHtml(statusLabel) + '</span>';
      if (dueLabel) {
        var _dueCls = '';
        if (note.dueDate && !note.completed && !note.archived && note.status !== 'done') {
          var _dueMs = new Date(note.dueDate + 'T00:00').getTime() - Date.now();
          if (_dueMs < 0) _dueCls = ' overdue';
          else if (_dueMs < 48 * 3600 * 1000) _dueCls = ' due-soon';
        }
        badges += '<span class="mn-badge' + _dueCls + '"><i class="fa-regular fa-calendar"></i>' + escapeHtml(t('noteDueBadge')) + ' ' + escapeHtml(dueLabel) + '</span>';
      }
      if (note.reminder) badges += '<span class="mn-badge"><i class="fa-regular fa-bell"></i>' + escapeHtml(t('noteReminderOn')) + '</span>';
      badges += '<span class="mn-badge">' + (catInfo ? escapeHtml((catInfo.icon || '') + ' ' + ministryCategoryName(catInfo)) : escapeHtml(t('noteNoCategory'))) + '</span>';
      return '<div class="' + cardClass + '" data-note-card="' + escapeHtml(note.id) + '">' +
        '<div class="row-between" style="align-items:flex-start;gap:10px;">' +
        '<div style="min-width:0;"><div class="mn-note-title">' + escapeHtml(title) + '</div>' +
        '<div class="mn-note-body">' + escapeHtml(preview) + '</div></div>' +
        '<div class="mn-card-actions">' +
        '<button class="btn btn-secondary btn-icon" data-note-edit="' + escapeHtml(note.id) + '" data-note-cat="' + escapeHtml(note.categoryId || '') + '" style="width:40px;height:40px;" aria-label="' + escapeHtml(t('editNote')) + '"><i class="fa-solid fa-pen" style="font-size:11px;"></i></button>' +
        '<button class="btn btn-secondary btn-icon" data-note-del="' + escapeHtml(note.id) + '" style="width:40px;height:40px;" aria-label="' + escapeHtml(t('deleteNote')) + '"><i class="fa-solid fa-trash" style="font-size:11px;color:var(--coral);"></i></button>' +
        '</div></div><div class="mn-badges">' + badges + '</div>' +
        '<div class="mn-note-meta"><span>' + escapeHtml(updatedLabel) + '</span><span>' + escapeHtml(catName) + '</span></div></div>';
    }).join('') + '</div>';
  scr.innerHTML =
    '<div class="row-between mb-4" style="align-items:center;">' +
    '<button class="btn btn-secondary" data-mn-back style="font-size:13px;padding:7px 14px;">' + escapeHtml(t('notesBackBtn')) + '</button>' +
    '<div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">' + escapeHtml(icon) + '</span>' +
    '<span class="font-semibold text-sm">' + escapeHtml(catName) + '</span></div>' +
    '<button class="btn btn-secondary" data-push-test style="font-size:13px;padding:7px 14px;">' + escapeHtml(t('testPush')) + '</button>' +
    '<button class="btn btn-primary" data-mn-add style="font-size:13px;padding:7px 14px;">' + escapeHtml(t('mnAddNote')) + '</button></div>' +
    notesToolbar + noteCards;
  var addBtn = scr.querySelector('[data-mn-add]');
  if (addBtn) addBtn.addEventListener('click', function() { openMinistryNoteModal(isAllNotesView ? '' : cat.id, null); });
  var addFromEmptyBtn = scr.querySelector('[data-mn-add-from-empty]');
  if (addFromEmptyBtn) addFromEmptyBtn.addEventListener('click', function() { openMinistryNoteModal(isAllNotesView ? '' : cat.id, null); });
  var backBtn = scr.querySelector('[data-mn-back]');
  if (backBtn) backBtn.addEventListener('click', function() { currentNotesView = 'categories'; currentNotesCategoryId = null; renderNotes(); });
  scr.querySelectorAll('[data-push-test]').forEach(function(el) {
    el.addEventListener('click', function() { runMinistryPushDiagnostic(el); });
  });
  var searchEl = scr.querySelector('#mnNotesSearch');
  if (searchEl) searchEl.addEventListener('input', function() { currentNotesSearch = searchEl.value || ''; renderNotes(); });
  var filterEl = scr.querySelector('#mnNotesFilter');
  if (filterEl) filterEl.addEventListener('change', function() { currentNotesFilter = filterEl.value || 'active'; renderNotes(); });
  var sortEl = scr.querySelector('#mnNotesSort');
  if (sortEl) sortEl.addEventListener('change', function() { currentNotesSort = sortEl.value || 'updated'; renderNotes(); });
  scr.querySelectorAll('[data-note-card]').forEach(function(el) {
    el.addEventListener('click', function(e) {
      if (!e.target.closest('[data-note-edit],[data-note-del]')) openMinistryNoteModal('', el.dataset.noteCard);
    });
  });
  scr.querySelectorAll('[data-note-edit]').forEach(function(el) {
    el.addEventListener('click', function() { openMinistryNoteModal(el.dataset.noteCat, el.dataset.noteEdit); });
  });
  scr.querySelectorAll('[data-note-del]').forEach(function(el) {
    el.addEventListener('click', function() { deleteMinistryNote(el.dataset.noteDel); });
  });
}

function ministryNoteReminderFireAt(note) {
  if (!note) return '';
  if (note.reminderAt) return new Date(note.reminderAt).toISOString();
  if (note.dueDate) return new Date(note.dueDate + (note.dueTime ? 'T' + note.dueTime : 'T00:00')).toISOString();
  return '';
}

function ministryNoteReminderSkipReason(note) {
  if (!note) return 'missing note';
  if (note.completed) return 'completed note';
  if (note.archived) return 'archived note';
  if (note.status === 'done') return 'status done';
  const fireAt = ministryNoteReminderFireAt(note);
  if (!fireAt || Number.isNaN(new Date(fireAt).getTime())) return 'invalid fireAt';
  return '';
}

function ministryNoteNeedsPush(note) {
  if (!note || !note.reminder) return false;
  return !ministryNoteReminderSkipReason(note);
}

function ministryNotePushBody(note) {
  const bits = [];
  if (note.body) bits.push(String(note.body).slice(0, 180));
  if (note.dueDate) bits.push(note.dueTime ? note.dueDate + ' ' + note.dueTime : note.dueDate);
  return bits.join(' - ') || 'Ministry note reminder';
}

function ministryPushSafeResult(result) {
  if (!result || typeof result !== 'object') return result || null;
  return {
    ok: result.ok,
    handled: result.handled,
    action: result.action,
    skipped: result.skipped,
    error: result.error,
    status: result.status,
    postReached: result.postReached,
    dueBucketMinute: result.dueBucketMinute || (result.reminder && result.reminder.dueBucketMinute)
  };
}

function setMinistryPushSyncDebug(details) {
  const payload = Object.assign({
    sourceId: '',
    fireAt: '',
    result: null,
    error: '',
    skippedReason: '',
    timestamp: new Date().toISOString()
  }, details || {});
  payload.result = ministryPushSafeResult(payload.result);
  window.__ministryLastPushSyncDebug = payload;
  return payload;
}

function ministryStoredNoteForSync(note) {
  if (!note || !note.id) return note;
  const storedNote = (state.ministryNotes || []).find(function(n) { return n && n.id === note.id; }) || note;
  console.info('[MinistryPush] reminder stored note loaded', {
    sourceId: storedNote.id,
    reminder: !!storedNote.reminder,
    dueDate: storedNote.dueDate || '',
    dueTime: storedNote.dueTime || '',
    fireAt: ministryNoteReminderFireAt(storedNote)
  });
  return storedNote;
}

function clearMinistryNotePush(noteId) {
  if (!noteId) return Promise.resolve({ ok: true, skipped: 'missing-note-id' });
  if (!window.MinistryPush || !window.MinistryPush.isConfigured || !window.MinistryPush.isConfigured()) {
    console.warn('[MinistryPush] clear skipped: push client unavailable or unconfigured.');
    return Promise.resolve({ ok: true, skipped: 'push-unavailable' });
  }
  return window.MinistryPush.clearReminder('ministry-note', noteId).then(function(result) {
    if (result && result.ok === false) {
      console.warn('[MinistryPush] reminder clear handled:', result.error || result);
      return result;
    }
    return result;
  }).catch(function(err) {
    var message = err && err.message ? err.message : String(err || 'Reminder clear failed.');
    console.warn('[MinistryPush] reminder clear handled:', message);
    return { ok: false, handled: true, action: 'reminder-clear', error: message };
  });
}

function scheduleReminderOnSave(note) {
  if (!note || !note.reminder) {
    if (note && note.id) clearMinistryNotePush(note.id).catch(function() {});
    return Promise.resolve({ ok: true, skipped: 'no-reminder' });
  }
  var hasNotif = ('Notification' in window) || ('PushManager' in window);
  if (!hasNotif) { toast(t('notifUnsupported')); return Promise.resolve({ ok: false, skipped: 'unsupported' }); }
  var perm = ('Notification' in window) ? Notification.permission : 'denied';
  if (perm === 'granted') { return syncMinistryNotePush(ministryStoredNoteForSync(note)); }
  if (perm !== 'default') { toast(t('notifDenied')); return Promise.resolve({ ok: false, skipped: 'denied' }); }
  return Notification.requestPermission().then(function(p) {
    if (p !== 'granted') { toast(t('notifDenied')); return Promise.resolve({ ok: false, skipped: 'denied' }); }
    var sub = (window.MinistryPush && window.MinistryPush.subscribe) ? window.MinistryPush.subscribe() : Promise.resolve();
    return sub.catch(function() {}).then(function() { return syncMinistryNotePush(ministryStoredNoteForSync(note)); });
  });
}

function syncMinistryNotePush(note) {
  const sourceId = note && note.id ? note.id : '';
  const fireAt = ministryNoteReminderFireAt(note);
  if (!note) {
    const result = { ok: false, skipped: 'missing note' };
    setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result, skippedReason: 'missing note' });
    console.warn('[MinistryPush] reminder sync skipped', { sourceId: sourceId, fireAt: fireAt, skippedReason: 'missing note' });
    toast(t('reminderSyncSkipped') + ': missing note');
    return Promise.resolve(result);
  }
  if (!window.MinistryPush || !window.MinistryPush.isConfigured || !window.MinistryPush.isConfigured()) {
    const result = { ok: false, skipped: 'push unavailable' };
    setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result, skippedReason: 'push unavailable' });
    console.warn('[MinistryPush] reminder sync skipped', { sourceId: sourceId, fireAt: fireAt, skippedReason: 'push unavailable' });
    toast(t('reminderSyncSkipped') + ': push unavailable');
    return Promise.resolve(result);
  }
  // Silent skip: note.reminder encodes date+opt-out decision
  if (!note.reminder) {
    if (note.id) clearMinistryNotePush(note.id).catch(function() {});
    return Promise.resolve({ ok: true, skipped: 'no-reminder' });
  }
  const skippedReason = ministryNoteReminderSkipReason(note);
  if (skippedReason) {
    console.warn('[MinistryPush] reminder sync skipped', { sourceId: sourceId, fireAt: fireAt, skippedReason: skippedReason });
    toast(t('reminderSyncSkipped') + ': ' + skippedReason);
    return clearMinistryNotePush(note.id).then(function(clearResult) {
      setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: clearResult, skippedReason: skippedReason });
      return clearResult;
    }).catch(function(err) {
      var message = err && err.message ? err.message : String(err || 'Reminder clear failed.');
      var result = { ok: false, handled: true, action: 'reminder-clear', error: message };
      setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result, error: message, skippedReason: skippedReason });
      return result;
    });
  }
  console.info('[MinistryPush] reminder sync requested', {
    sourceType: 'ministry-note',
    sourceId: sourceId,
    fireAt: fireAt
  });
  toast(t('reminderSyncStarted'));
  const syncPromise = window.MinistryPush.syncReminder(
    'ministry-note',
    sourceId,
    note.title || 'Ministry Tracker Reminder',
    ministryNotePushBody(note),
    fireAt
  ).then(function(result) {
    if (result && result.ok === false) {
      var reason = result.error || result.skipped || 'Unknown failure';
      setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result, error: reason });
      console.warn('[MinistryPush] reminder sync failed', { sourceId: sourceId, fireAt: fireAt, reason: reason, postReached: result.postReached });
      toast(t('reminderSyncFailed') + ': ' + reason);
      return result;
    }
    const dueBucketMinute = result && (result.dueBucketMinute || (result.reminder && result.reminder.dueBucketMinute));
    setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result });
    console.info('[MinistryPush] reminder scheduled', { sourceId: sourceId, fireAt: fireAt, dueBucketMinute: dueBucketMinute });
    toast(t('reminderScheduled'));
    return result;
  }).catch(function(err) {
    var message = err && err.message ? err.message : String(err || 'Reminder sync failed.');
    var result = { ok: false, handled: true, action: 'reminder-sync', error: message };
    setMinistryPushSyncDebug({ sourceId: sourceId, fireAt: fireAt, result: result, error: message });
    console.warn('[MinistryPush] reminder sync failed', { sourceId: sourceId, fireAt: fireAt, reason: message });
    toast(t('reminderSyncFailed') + ': ' + message);
    return result;
  });
  window.__ministryLastPushSync = syncPromise;
  return syncPromise;
}

function runMinistryPushDiagnostic(btn) {
  if (!window.MinistryPush || !window.MinistryPush.sendTestPush) {
    console.warn('[MinistryPush] test skipped: push client unavailable.');
    toast(t('pushNotReady'));
    return Promise.resolve({ ok: false, skipped: 'push-unavailable' });
  }
  const original = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.textContent = t('testPush') + '...'; }
  const testPromise = window.MinistryPush.sendTestPush().then(function(result) {
    if (result && result.ok === false) {
      console.warn('[MinistryPush] test push handled:', result.error || result);
      toast(t('pushTestFailed') + ' ' + (result.error || ''));
      return result;
    }
    console.info('[MinistryPush] test push sent', result);
    toast(t('pushTestSent'));
    return result;
  }).catch(function(err) {
    var message = err && err.message ? err.message : String(err || 'Test push failed.');
    console.warn('[MinistryPush] test push handled:', message);
    toast(t('pushTestFailed') + ' ' + message);
    return { ok: false, handled: true, action: 'test-push', error: message };
  }).finally(function() {
    if (btn) { btn.disabled = false; btn.innerHTML = original || escapeHtml(t('testPush')); }
  });
  window.__ministryLastPushTest = testPromise;
  return testPromise;
}

window.MinistryPushDebugApp = {
  testPush: function() { return runMinistryPushDiagnostic(null); },
  lastSync: function() { return window.__ministryLastPushSync || null; },
  lastTest: function() { return window.__ministryLastPushTest || null; }
};

function openMinistryNoteModal(categoryId, noteId, _calDate) {
  var note = noteId ? (state.ministryNotes || []).find(function(n) { return n.id === noteId; }) : null;
  var selectedCategoryId = note ? (note.categoryId || '') : (categoryId != null ? categoryId : ministryNoteDefaultCategoryId());
  var cats = Array.isArray(state.ministryNoteCategories) && state.ministryNoteCategories.length ? state.ministryNoteCategories : DEFAULT_MINISTRY_NOTE_CATEGORIES;
  var catOpts = '<option value="">' + escapeHtml(t('noteNoCategory')) + '</option>' + cats.map(function(c) {
    return '<option value="' + escapeHtml(c.id || '') + '"' + (selectedCategoryId === c.id ? ' selected' : '') + '>' + escapeHtml((c.icon ? c.icon + ' ' : '') + ministryCategoryName(c)) + '</option>';
  }).join('');
  var priorityOpts = [
    ['', '--'],
    ['high', t('priorityHigh')],
    ['medium', t('priorityMedium')],
    ['low', t('priorityLow')]
  ].map(function(p) { return '<option value="' + p[0] + '"' + ((note && note.priority === p[0]) ? ' selected' : '') + '>' + escapeHtml(p[1]) + '</option>'; }).join('');
  var statusOpts = [
    ['', '--'],
    ['open', t('statusOpen')],
    ['in-progress', t('statusInProgress')],
    ['done', t('statusDone')]
  ].map(function(s) { return '<option value="' + s[0] + '"' + ((note && note.status === s[0]) ? ' selected' : '') + '>' + escapeHtml(s[1]) + '</option>'; }).join('');
  openModal(
    '<div class="row-between items-center mb-3"><div class="font-bold text-xl">' + escapeHtml(note ? t('editNote') : t('mnAddNote')) + '</div>' +
    '<button class="btn btn-secondary btn-icon" data-close-modal style="width:38px;height:38px;" aria-label="' + escapeHtml(t('cancel')) + '"><i class="fa-solid fa-xmark"></i></button></div>' +
    '<div class="stack-3">' +
    '<div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnTitleInput">' + escapeHtml(t('noteTitle')) + '</label>' +
    '<input id="mnTitleInput" class="input" type="text" maxlength="100" placeholder="' + escapeHtml(t('noteTitlePlaceholder')) + '" value="' + escapeHtml(note ? note.title || '' : '') + '"></div>' +
    '<div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnBodyInput">' + escapeHtml(t('noteBody')) + '</label>' +
    '<textarea id="mnBodyInput" class="input" rows="5" placeholder="' + escapeHtml(t('noteBodyPlaceholder')) + '" style="resize:vertical;">' + escapeHtml(note ? note.body || '' : '') + '</textarea></div>' +
    '<div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnCatSelect">' + escapeHtml(t('noteCategory')) + '</label><select id="mnCatSelect" class="input">' + catOpts + '</select></div>' +
    '<div class="mn-modal-grid"><div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnPrioritySelect">' + escapeHtml(t('notePriority')) + '</label><select id="mnPrioritySelect" class="input">' + priorityOpts + '</select></div>' +
    '<div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnStatusSelect">' + escapeHtml(t('noteStatus')) + '</label><select id="mnStatusSelect" class="input">' + statusOpts + '</select></div></div>' +
    '<div class="mn-modal-grid"><div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnDueDateInput">' + escapeHtml(t('noteDueDate')) + '</label><input type="date" id="mnDueDateInput" class="input" value="' + escapeHtml((note && note.dueDate) || _calDate || '') + '"></div>' +
    '<div><label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="mnDueTimeInput">' + escapeHtml(t('noteDueTime')) + '</label><input type="time" id="mnDueTimeInput" class="input" value="' + escapeHtml((note && note.dueTime) || '') + '"></div></div>' +
    '<div id="mnOptOutRow" style="display:none;margin-top:6px;">' +
    '<label style="display:flex;align-items:center;gap:8px;font-size:0.9em;color:var(--color-faint,#888)">' +
    '<input type="checkbox" id="noteNoNotifToggle" style="width:18px;height:18px;"> ' + escapeHtml(t('noNotifLabel')) + '</label></div>' +
    '<div class="mn-modal-grid">' +
    '<label class="mn-toggle-row"><span class="text-sm font-semibold" style="flex:1;">' + escapeHtml(t('noteCompleted')) + '</span><input type="checkbox" id="mnCompletedToggle" style="width:22px;height:22px;"' + (note && note.completed ? ' checked' : '') + '></label>' +
    '<label class="mn-toggle-row"><span class="text-sm font-semibold" style="flex:1;">' + escapeHtml(t('noteArchived')) + '</span><input type="checkbox" id="mnArchivedToggle" style="width:22px;height:22px;"' + (note && note.archived ? ' checked' : '') + '></label>' +
    '</div></div>' +
    '<div class="row gap-2 mt-4" style="align-items:center;flex-wrap:wrap;">' +
    (note ? '<button class="btn btn-secondary" id="mnQuickDoneBtn" style="flex:1 1 auto;">' + escapeHtml(note.completed || note.status === 'done' ? t('statusOpen') : t('notesFilterDone')) + '</button>' : '') +
    (note ? '<button class="btn btn-secondary" id="mnQuickArchiveBtn" style="flex:1 1 auto;">' + escapeHtml(note.archived ? t('notesFilterActive') : t('notesFilterArchived')) + '</button>' : '') +
    '<button class="btn btn-secondary" id="mnCancelBtn" style="flex:1 1 auto;">' + escapeHtml(t('cancel')) + '</button>' +
    '<button class="btn btn-primary" id="mnSaveBtn" style="flex:1 1 auto;">' + escapeHtml(t('save')) + '</button></div>'
  );
  setTimeout(function() {
    var ti = document.getElementById('mnTitleInput');
    var bi = document.getElementById('mnBodyInput');
    var sb = document.getElementById('mnSaveBtn');
    var cb = document.getElementById('mnCancelBtn');
    document.querySelectorAll('[data-close-modal]').forEach(function(b) { b.onclick = closeModal; });
    if (cb) cb.addEventListener('click', closeModal);
    if (ti) ti.focus();
    var optRow = document.getElementById('mnOptOutRow');
    var noNotifEl = document.getElementById('noteNoNotifToggle');
    var dueDateEl = document.getElementById('mnDueDateInput');
    if (optRow) optRow.style.display = (note && note.dueDate) ? '' : 'none';
    if (noNotifEl && note) noNotifEl.checked = !!(note.dueDate && !note.reminder);
    if (dueDateEl) dueDateEl.addEventListener('change', function() {
      var r = document.getElementById('mnOptOutRow');
      if (r) r.style.display = this.value ? '' : 'none';
      if (!this.value && noNotifEl) noNotifEl.checked = false;
    });
    var doneBtn = document.getElementById('mnQuickDoneBtn');
    if (doneBtn && note) doneBtn.addEventListener('click', function() {
      note.completed = !(note.completed || note.status === 'done');
      note.status = note.completed ? 'done' : 'open';
      note.updatedAt = Date.now();
      saveState(); closeModal(); renderNotes(); renderCalendar(); syncMinistryNotePush(ministryStoredNoteForSync(note));
    });
    var archiveBtn = document.getElementById('mnQuickArchiveBtn');
    if (archiveBtn && note) archiveBtn.addEventListener('click', function() {
      note.archived = !note.archived;
      note.updatedAt = Date.now();
      saveState(); closeModal(); renderNotes(); renderCalendar(); syncMinistryNotePush(ministryStoredNoteForSync(note));
    });
    if (sb) sb.addEventListener('click', function() {
      var nt = ((ti && ti.value) || '').trim();
      var nb = ((bi && bi.value) || '').trim();
      if (!nt && !nb) { if (ti) ti.focus(); return; }
      if (!Array.isArray(state.ministryNotes)) state.ministryNotes = [];
      var ncatId = (document.getElementById('mnCatSelect') || {}).value || null;
      var ndueDate = (document.getElementById('mnDueDateInput') || {}).value || null;
      var ndueTime = (document.getElementById('mnDueTimeInput') || {}).value || null;
      var noNotif = document.getElementById('noteNoNotifToggle') ? document.getElementById('noteNoNotifToggle').checked : false;
      var nreminder = !!(ndueDate && !noNotif);
      var nreminderAt = (nreminder && ndueTime) ? new Date(ndueDate + 'T' + ndueTime).getTime() : null;
      var npriority = (document.getElementById('mnPrioritySelect') || {}).value || null;
      var nstatus = (document.getElementById('mnStatusSelect') || {}).value || null;
      var ncompleted = document.getElementById('mnCompletedToggle') ? document.getElementById('mnCompletedToggle').checked : false;
      var narchived = document.getElementById('mnArchivedToggle') ? document.getElementById('mnArchivedToggle').checked : false;
      var savedNote;
      if (note) {
        note.title = nt || nb.slice(0, 60) || t('noteUntitled');
        note.body = nb;
        note.categoryId = ncatId;
        note.dueDate = ndueDate; note.dueTime = ndueTime;
        note.reminder = !!nreminder; note.reminderAt = nreminderAt || null;
        note.priority = npriority; note.status = ncompleted ? 'done' : nstatus;
        note.completed = !!ncompleted; note.archived = !!narchived; note.updatedAt = Date.now();
        savedNote = note;
      } else {
        savedNote = { id: 'mn-' + Date.now(), categoryId: ncatId, title: nt || nb.slice(0, 60) || t('noteUntitled'), body: nb,
          createdAt: _calDate ? new Date(_calDate + 'T12:00:00').getTime() : Date.now(), updatedAt: Date.now(),
          dueDate: ndueDate, dueTime: ndueTime, reminder: !!nreminder, reminderAt: nreminderAt || null,
          priority: npriority, status: ncompleted ? 'done' : nstatus, completed: !!ncompleted, archived: !!narchived };
        state.ministryNotes.push(savedNote);
      }
      saveState(); closeModal(); renderNotes(); renderCalendar();
      scheduleReminderOnSave(savedNote).catch(function(e) { console.warn('[MinistryTracker] scheduleReminderOnSave error', e); });
    });
  }, 50);
  return;
  var note = noteId ? (state.ministryNotes || []).find(function(n) { return n.id === noteId; }) : null;
  var titleVal = note ? (note.title || '') : '';
  var bodyVal  = note ? (note.body  || '') : '';
  var heading = note ? t('editNote') : t('mnAddNote');
  openModal(
    '<div class="font-semibold mb-4">' + escapeHtml(heading) + '</div>' +
    '<div class="mb-3"><label class="text-xs text-dim mb-1 block">' + escapeHtml(t('noteTitle')) + '</label>' +
    '<input id="mnTitleInput" class="input" type="text" maxlength="100" placeholder="' + escapeHtml(t('noteTitlePlaceholder')) + '" style="width:100%;"></div>' +
    '<div class="mb-4"><label class="text-xs text-dim mb-1 block">' + escapeHtml(t('noteBody')) + '</label>' +
    '<textarea id="mnBodyInput" class="input" rows="4" placeholder="' + escapeHtml(t('noteBodyPlaceholder')) + '" style="width:100%;resize:vertical;"></textarea></div>' +
    '<div class="row gap-2"><button class="btn btn-secondary flex-1" id="mnCancelBtn">' + escapeHtml(t('cancel')) + '</button>' +
    '<button class="btn btn-primary flex-1" id="mnSaveBtn">' + escapeHtml(t('save')) + '</button></div>'
  );
  setTimeout(function() {
    var ti = document.getElementById('mnTitleInput');
    var bi = document.getElementById('mnBodyInput');
    var sb = document.getElementById('mnSaveBtn');
    var cb = document.getElementById('mnCancelBtn');
    if (ti) { ti.value = titleVal; ti.focus(); }
    if (bi) bi.value = bodyVal;
    // Stage G: inject extra note fields
    (function(){
      var t2=I18N[state.lang];
      var cats=Array.isArray(state.ministryNoteCategories)&&state.ministryNoteCategories.length?state.ministryNoteCategories:DEFAULT_MINISTRY_NOTE_CATEGORIES;
      var catOpts=cats.map(function(c){return '<option value="'+escapeHtml(c.id||'')+'"'+((note?note.categoryId:categoryId)===c.id?' selected':'')+'>'+escapeHtml((c.icon?c.icon+' ':'')+ministryCategoryName(c))+'</option>';}).join('');
      var xH='<div style="display:flex;flex-direction:column;gap:8px;padding:0 0 8px">'
        +'<label style="font-size:0.75rem;color:var(--text-dim)">'+escapeHtml(t2.noteCategory||'Category')+'</label>'
        +'<select id="mnCatSelect" style="background:var(--input-bg,var(--surface));border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm,6px);padding:10px;min-height:44px">'+catOpts+'</select>'
        +'<label style="font-size:0.75rem;color:var(--text-dim)">'+escapeHtml(t2.notePriority||'Priority')+'</label>'
        +'<select id="mnPrioritySelect" style="background:var(--input-bg,var(--surface));border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm,6px);padding:10px;min-height:44px">'
        +'<option value="">—</option>'
        +'<option value="high">'+escapeHtml(t2.priorityHigh||'High')+'</option>'
        +'<option value="medium">'+escapeHtml(t2.priorityMedium||'Medium')+'</option>'
        +'<option value="low">'+escapeHtml(t2.priorityLow||'Low')+'</option>'
        +'</select>'
        +'<label style="font-size:0.75rem;color:var(--text-dim)">'+escapeHtml(t2.noteStatus||'Status')+'</label>'
        +'<select id="mnStatusSelect" style="background:var(--input-bg,var(--surface));border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm,6px);padding:10px;min-height:44px">'
        +'<option value="">—</option>'
        +'<option value="open">'+escapeHtml(t2.statusOpen||'Open')+'</option>'
        +'<option value="in-progress">'+escapeHtml(t2.statusInProgress||'In Progress')+'</option>'
        +'<option value="done">'+escapeHtml(t2.statusDone||'Done')+'</option>'
        +'</select>'
        +'<label style="font-size:0.75rem;color:var(--text-dim)">'+escapeHtml(t2.noteDueDate||'Due date')+'</label>'
        +'<input type="date" id="mnDueDateInput" style="background:var(--input-bg,var(--surface));border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm,6px);padding:10px;min-height:44px">'
        +'<div id="mnDueTimeRow" style="display:none;flex-direction:column;gap:6px">'
        +'<label style="font-size:0.75rem;color:var(--text-dim)">'+escapeHtml(t2.noteDueTime||'Due time')+'</label>'
        +'<input type="time" id="mnDueTimeInput" style="background:var(--input-bg,var(--surface));border:1px solid var(--border);color:var(--text);border-radius:var(--radius-sm,6px);padding:10px;min-height:44px"></div>'
        +'<div style="display:flex;align-items:center;gap:10px;min-height:44px"><label style="font-size:0.75rem;color:var(--text-dim);flex:1">'+escapeHtml(t2.noteReminder||'Reminder')+'</label><input type="checkbox" id="mnReminderToggle" style="width:22px;height:22px"></div>'
        +'<div style="display:flex;align-items:center;gap:10px;min-height:44px"><label style="font-size:0.75rem;color:var(--text-dim);flex:1">'+escapeHtml(t2.noteCompleted||'Completed')+'</label><input type="checkbox" id="mnCompletedToggle" style="width:22px;height:22px"></div>'
        +'<div style="display:flex;align-items:center;gap:10px;min-height:44px"><label style="font-size:0.75rem;color:var(--text-dim);flex:1">'+escapeHtml(t2.noteArchived||'Archived')+'</label><input type="checkbox" id="mnArchivedToggle" style="width:22px;height:22px"></div>'
        +'</div>';
      var xDiv=document.createElement('div');xDiv.innerHTML=xH;
      var btnRow=cb?cb.parentNode:null;
      if(btnRow&&btnRow.parentNode)btnRow.parentNode.insertBefore(xDiv,btnRow);
      var ddEl=document.getElementById('mnDueDateInput');
      if(ddEl)ddEl.addEventListener('input',function(){var tr=document.getElementById('mnDueTimeRow');if(tr)tr.style.display=this.value?'flex':'none';});
      if(note){
        var csEl=document.getElementById('mnCatSelect');if(csEl&&note.categoryId)csEl.value=note.categoryId;
        var prEl=document.getElementById('mnPrioritySelect');if(prEl&&note.priority)prEl.value=note.priority;
        var stEl=document.getElementById('mnStatusSelect');if(stEl&&note.status)stEl.value=note.status;
        if(ddEl&&note.dueDate){ddEl.value=note.dueDate;var tr2=document.getElementById('mnDueTimeRow');if(tr2)tr2.style.display='flex';}
        var dtEl=document.getElementById('mnDueTimeInput');if(dtEl&&note.dueTime)dtEl.value=note.dueTime;
        var rmEl=document.getElementById('mnReminderToggle');if(rmEl)rmEl.checked=!!note.reminder;
        var cpEl=document.getElementById('mnCompletedToggle');if(cpEl)cpEl.checked=!!note.completed;
        var arEl=document.getElementById('mnArchivedToggle');if(arEl)arEl.checked=!!note.archived;
      }
    }());
    if (cb) cb.addEventListener('click', closeModal);
    if (sb) sb.addEventListener('click', function() {
      var nt = (ti || {}).value.trim();
      var nb = (bi || {}).value.trim();
          var ncatId=(document.getElementById('mnCatSelect')||{}).value||categoryId;
          var ndueDate=(document.getElementById('mnDueDateInput')||{}).value||null;
          var ndueTime=(document.getElementById('mnDueTimeInput')||{}).value||null;
          var nreminder=document.getElementById('mnReminderToggle')?document.getElementById('mnReminderToggle').checked:false;
          var nreminderAt=ndueDate&&nreminder?new Date(ndueDate+(ndueTime?'T'+ndueTime:'T00:00')).getTime():null;
          var npriority=(document.getElementById('mnPrioritySelect')||{}).value||null;
          var nstatus=(document.getElementById('mnStatusSelect')||{}).value||null;
          var ncompleted=document.getElementById('mnCompletedToggle')?document.getElementById('mnCompletedToggle').checked:false;
          var narchived=document.getElementById('mnArchivedToggle')?document.getElementById('mnArchivedToggle').checked:false;
      if (!nt) { if (ti) ti.focus(); return; }
      if (!Array.isArray(state.ministryNotes)) state.ministryNotes = [];
      var savedNote;
      if (note) { note.title = nt; note.body = nb; note.updatedAt = Date.now();
            if(ncatId)note.categoryId=ncatId;
            note.dueDate=ndueDate||null;note.dueTime=ndueTime||null;
            note.reminder=!!nreminder;note.reminderAt=nreminderAt||null;
            note.priority=npriority||null;note.status=nstatus||null;
            note.completed=!!ncompleted;note.archived=!!narchived; savedNote = note; }
      else { savedNote = { id: 'mn-' + Date.now(), categoryId: ncatId||categoryId, title: nt, body: nb, createdAt: _calDate ? new Date(_calDate + 'T12:00:00').getTime() : Date.now(), updatedAt: Date.now(), dueDate:ndueDate||null, dueTime:ndueTime||null, reminder:!!nreminder, reminderAt:nreminderAt||null, priority:npriority||null, status:nstatus||null, completed:!!ncompleted, archived:!!narchived }; state.ministryNotes.push(savedNote); }
      saveState(); closeModal(); renderNotes();
      syncMinistryNotePush(savedNote);
    });
  }, 50);
}

function deleteMinistryNote(noteId) {
  openConfirmModal(t('confirmDeleteNote'), function() {
    var removed = (state.ministryNotes || []).find(function(n) { return n.id === noteId; });
    state.ministryNotes = (state.ministryNotes || []).filter(function(n) { return n.id !== noteId; });
    saveState(); renderNotes();
    clearMinistryNotePush(removed && removed.id);
  }, { confirmLabel: t('deleteNote'), danger: true });
}
/* ── Stage F: Calendar Notes Panel ──────────────────────────────────── */
let _calNotesCssInjected = false;
function _injectCalNotesCss() {
  if (_calNotesCssInjected) return; _calNotesCssInjected = true;
  const s = document.createElement('style');
  s.textContent = [
    '.cal-note-dot{display:block;width:5px;height:5px;border-radius:50%;background:var(--accent,#4f8ef7);margin:1px auto 0}',
    '.cal-notes-panel{margin:.75rem 1rem .5rem;background:var(--card-bg,#fff);border-radius:12px;overflow:hidden;border:1px solid var(--border,#e2e8f0)}',
    '.dark .cal-notes-panel{background:var(--card-bg,#1e293b);border-color:var(--border,#334155)}',
    '.cal-notes-panel-hdr{font-size:.7rem;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:.05em;padding:.6rem 1rem .4rem}',
    '.cal-notes-empty{font-size:.875rem;color:var(--text-muted,#64748b);padding:.4rem 1rem .6rem}',
    '.cal-notes-list{display:flex;flex-direction:column}',
    '.cal-note-item{display:block;width:100%;text-align:left;background:none;border:none;border-top:1px solid var(--border,#e2e8f0);padding:.6rem 1rem;cursor:pointer;color:var(--text,#1e293b)}',
    '.cal-note-item:active{background:var(--hover,#f1f5f9)}',
    '.cal-note-item-title{display:block;font-size:.875rem;font-weight:500}',
    '.cal-note-item-body{display:block;font-size:.75rem;color:var(--text-muted,#64748b);margin-top:2px}',
    '.cal-add-note-btn{display:block;width:100%;text-align:center;background:none;border:none;border-top:1px solid var(--border,#e2e8f0);padding:.7rem 1rem;font-size:.875rem;font-weight:600;color:var(--accent,#4f8ef7);cursor:pointer}',
    '.cal-add-note-btn:active{opacity:.7}'
  ].join('');
  document.head.appendChild(s);
}
function renderCalendarNotesPanel() {
  _injectCalNotesCss();
  const panel = document.getElementById('calNotesPanel');
  if (!panel) return;
  const ds = adjustSelectedDate;
  if (!ds) { panel.innerHTML = ''; panel.classList.add('hidden'); return; }
  const dayNotes = sortMinistryNotes((state.ministryNotes || []).filter(n => ministryNoteOccursOnDate(n, ds)));
  const parts = ds.split('-');
  const dateLabel = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]))
    .toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'long', day: 'numeric' });
  let h = '<div class="cal-notes-panel">';
  h += '<div class="cal-notes-panel-hdr">' + t('calNotesForDay') + ' — ' + dateLabel + '</div>';
  if (dayNotes.length === 0) {
    h += '<p class="cal-notes-empty">' + t('calNoNotesForDay') + '</p>';
  } else {
    h += '<div class="cal-notes-list">';
    for (const n of dayNotes) {
      function sanitizeInlineArg(v) { return String(v || '').replace(/['"]/g, ''); }
      const sid = sanitizeInlineArg(n.id);
      const scat = sanitizeInlineArg(n.categoryId);
      const ttl = (n.title||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const bdy = (n.body||'').replace(/&/g,'&amp;').replace(/</g,'&lt;');
      const bSnip = bdy.length > 80 ? bdy.substring(0,80) + '…' : bdy;
      h += '<button class="cal-note-item" onclick="openMinistryNoteModal(\'' + scat + '\',\'' + sid + '\')">';
      h += '<span class="cal-note-item-title">' + (ttl || '(' + t('noteTitle') + ')') + '</span>';
      if (bSnip) h += '<span class="cal-note-item-body">' + bSnip + '</span>';
      h += '</button>';
    }
    h += '</div>';
  }
  const defCat = ((state.ministryNoteCategories||[])[0] || {}).id || '';
  h += '<button class="cal-add-note-btn" onclick="openMinistryNoteModal(\'' + defCat + '\',null,\'' + ds + '\')">' + t('calAddNote') + '</button>';
  h += '</div>';
  panel.innerHTML = h;
  panel.classList.remove('hidden');
}


/* ---------- CATEGORY MODAL (Add / Edit) ---------- */
function openCategoryModal(existingCat) {
  const isEdit = !!existingCat;
  const lang = state.lang || 'en';
  const title = isEdit ? t('editCategory') : t('addCategory');
  const currentName = isEdit
    ? ((existingCat.name && typeof existingCat.name === 'object')
        ? (existingCat.name[lang] || existingCat.name.en || '')
        : (existingCat.name || ''))
    : '';
  const currentIcon  = isEdit ? (existingCat.icon  || '📝')     : '📝';
  const currentColor = isEdit ? (existingCat.color || '#6366f1') : '#6366f1';

  const swatches = CAT_PRESET_COLORS.map(c => {
    const sel = c === currentColor;
    return `<button type="button" class="cat-swatch" data-swatch-color="${c}" aria-label="${c}"
      style="width:28px;height:28px;border-radius:50%;background:${c};cursor:pointer;
             border:3px solid ${sel ? 'var(--text)' : 'transparent'};flex-shrink:0;"
      onclick="selectCatSwatch('${c}')"></button>`;
  }).join('');
  const iconButtons = CAT_PRESET_ICONS.map(icon => {
    const sel = icon === currentIcon;
    return `<button type="button" class="cat-icon-choice" data-cat-icon="${escapeHtml(icon)}" aria-pressed="${sel ? 'true' : 'false'}"
      style="width:42px;height:42px;border-radius:8px;border:2px solid ${sel ? 'var(--accent)' : 'var(--border)'};
             background:var(--surface);color:var(--text);font-size:20px;display:flex;align-items:center;justify-content:center;"
      onclick="selectCatIcon('${escapeHtml(icon)}')">${escapeHtml(icon)}</button>`;
  }).join('');

  openModal(`
    <div class="row-between items-center mb-4">
      <div class="font-bold text-xl">${escapeHtml(title)}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px;height:36px;" aria-label="${t('cancel')}">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <div class="stack-3">
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="catModalName">${t('categoryName')}</label>
        <input type="text" id="catModalName" class="input" value="${escapeHtml(currentName)}" placeholder="${t('categoryName')}" maxlength="40" autocomplete="off">
      </div>
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-dim block mb-1" for="catModalIcon">${t('categoryIcon')}</label>
        <input type="text" id="catModalIcon" class="input" value="${escapeHtml(currentIcon)}" placeholder="📝" maxlength="4"
          style="font-size:24px;text-align:center;width:64px;padding:6px 4px;">
        <div class="card card-flat mt-2 mb-2" style="padding:10px;display:flex;align-items:center;gap:10px;">
          <div id="catIconPreview" style="width:42px;height:42px;border-radius:8px;background:var(--surface);display:flex;align-items:center;justify-content:center;font-size:22px;">${escapeHtml(currentIcon)}</div>
          <div>
            <div class="text-xs font-bold uppercase tracking-wider text-dim">${escapeHtml(t('categoryIconSelected'))}</div>
            <div class="text-sm text-dim">${escapeHtml(t('categoryIconCustom'))}</div>
          </div>
        </div>
        <div class="row gap-2 mb-2" style="flex-wrap:wrap;align-items:center;">${iconButtons}</div>
        <input type="text" id="catModalCustomIcon" class="input" value="" placeholder="${escapeHtml(t('categoryIconCustom'))}" maxlength="8" style="width:100%;max-width:180px;">
      </div>
      <div>
        <label class="text-xs font-bold uppercase tracking-wider text-dim block mb-2">${t('categoryColor')}</label>
        <div class="row gap-2" style="flex-wrap:wrap;align-items:center;">
          ${swatches}
          <input type="color" id="catModalColor" value="${escapeHtml(currentColor)}"
            style="width:28px;height:28px;padding:0;border:none;background:none;cursor:pointer;border-radius:50%;overflow:hidden;"
            aria-label="${t('categoryColor')}">
        </div>
      </div>
    </div>
    <div class="row gap-2 mt-4">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="catModalSave">${t('save')}</button>
    </div>`);

  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);

  const colorInput = document.getElementById('catModalColor');
  if (colorInput) {
    colorInput.addEventListener('input', () => {
      document.querySelectorAll('.cat-swatch').forEach(s => {
        s.style.borderColor = s.dataset.swatchColor === colorInput.value ? 'var(--text)' : 'transparent';
      });
    });
  }
  const customIconInput = document.getElementById('catModalCustomIcon');
  if (customIconInput) {
    customIconInput.addEventListener('input', () => {
      const v = customIconInput.value.trim();
      if (v) selectCatIcon(v);
    });
  }

  setTimeout(() => { const el = document.getElementById('catModalName'); if (el) el.focus(); }, 60);

  document.getElementById('catModalSave').onclick = () => {
    const nameVal  = (document.getElementById('catModalName')?.value || '').trim();
    const iconVal  = (document.getElementById('catModalIcon')?.value || '').trim() || '📝';
    const colorVal = document.getElementById('catModalColor')?.value || '#6366f1';
    if (!nameVal) { toast(t('invalidName')); return; }

    if (isEdit) {
      const cat = state.ministryNoteCategories.find(c => c.id === existingCat.id);
      if (cat) { cat.name = { en: nameVal, es: nameVal }; cat.icon = iconVal; cat.color = colorVal; }
    } else {
      state.ministryNoteCategories.push({
        id: 'mnc-' + Date.now(),
        name: { en: nameVal, es: nameVal },
        icon: iconVal,
        color: colorVal,
      });
    }
    saveState(); closeModal(); renderNotes(); toast(t('save'));
  };
}

function selectCatSwatch(color) {
  const inp = document.getElementById('catModalColor');
  if (inp) inp.value = color;
  document.querySelectorAll('.cat-swatch').forEach(s => {
    s.style.borderColor = s.dataset.swatchColor === color ? 'var(--text)' : 'transparent';
  });
}

function selectCatIcon(icon) {
  const clean = String(icon || '').trim();
  const inp = document.getElementById('catModalIcon');
  const preview = document.getElementById('catIconPreview');
  if (inp) inp.value = clean;
  if (preview) preview.textContent = clean;
  document.querySelectorAll('.cat-icon-choice').forEach(btn => {
    const selected = btn.dataset.catIcon === clean;
    btn.style.borderColor = selected ? 'var(--accent)' : 'var(--border)';
    btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
  });
}

function openAddCategoryModal() { openCategoryModal(null); }

function openEditCategoryModal(id) {
  const cat = (state.ministryNoteCategories || []).find(c => c.id === id);
  if (cat) openCategoryModal(cat);
}

function deleteMinistryNoteCategory(id) {
  const cat = (state.ministryNoteCategories || []).find(c => c.id === id);
  if (!cat) return;
  const lang = state.lang || 'en';
  const name = (cat.name && typeof cat.name === 'object')
    ? (cat.name[lang] || cat.name.en || '') : (cat.name || '');
  const noteCount = (state.ministryNotes || []).filter(n => n.categoryId === id).length;
  if (noteCount > 0) {
    openModal(`
      <div class="font-bold text-xl mb-2">${escapeHtml(t('deleteCategory'))}</div>
      <div class="text-sm text-dim mb-4">${escapeHtml(t('confirmDeleteCatWithNotes').replace('{n}', noteCount))}</div>
      <div class="stack-2">
        <button class="btn btn-secondary w-full" id="catDeleteKeepNotes">${escapeHtml(t('keepNotesNoCategory'))}</button>
        <button class="btn btn-danger w-full" id="catDeleteWithNotes">${escapeHtml(t('deleteCategoryAndNotes'))}</button>
        <button class="btn btn-secondary w-full" data-close-modal>${escapeHtml(t('cancel'))}</button>
      </div>`);
    document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
    document.getElementById('catDeleteKeepNotes').onclick = () => {
      state.ministryNotes.forEach(n => { if (n.categoryId === id) { n.categoryId = null; n.updatedAt = Date.now(); } });
      state.ministryNoteCategories = state.ministryNoteCategories.filter(c => c.id !== id);
      if (currentNotesCategoryId === id) { currentNotesView = 'categories'; currentNotesCategoryId = null; }
      saveState(); closeModal(); renderNotes(); renderCalendar(); toast(t('delete'));
    };
    document.getElementById('catDeleteWithNotes').onclick = () => {
      state.ministryNotes = (state.ministryNotes || []).filter(n => n.categoryId !== id);
      state.ministryNoteCategories = state.ministryNoteCategories.filter(c => c.id !== id);
      if (currentNotesCategoryId === id) { currentNotesView = 'categories'; currentNotesCategoryId = null; }
      saveState(); closeModal(); renderNotes(); renderCalendar(); toast(t('delete'));
    };
    return;
  }
  openConfirmModal(
    t('confirmDeleteCat') + ' ' + name,
    () => {
      state.ministryNoteCategories = state.ministryNoteCategories.filter(c => c.id !== id);
      saveState(); renderNotes(); toast(t('delete'));
    },
    { confirmLabel: t('delete'), danger: true }
  );
}


/* ---------- LOG HISTORY (inside Reports — Stage A) ---------- */
function renderLogHistory() {
  const monthLabel = document.getElementById('logHistoryMonthLabel');
  if (!monthLabel) return;
  const [y, m] = logHistoryMonth.split('-').map(Number);
  monthLabel.textContent = `${t('months')[m-1]} ${y}`;

  // Disable Next button when already at current month
  const nextBtn = document.getElementById('logHistoryNext');
  if (nextBtn) nextBtn.disabled = logHistoryMonth >= monthKey(new Date());

  const all = state.sessions.filter(s => s.stopISO).sort((a,b) => b.startISO.localeCompare(a.startISO));
  let filtered = all.filter(s => s.date.startsWith(logHistoryMonth));

  const q = (logHistorySearch || '').trim().toLowerCase();
  if (q) filtered = filtered.filter(s => (s.note || '').toLowerCase().includes(q));

  const list = document.getElementById('logHistoryList');
  if (!list) return;

  if (!filtered.length) {
    const msg = q ? t('searchEmpty').replace('{q}', escapeHtml(q)) : t('empty');
    list.innerHTML = `<div class="text-faint text-sm text-center py-4">${msg}</div>`;
    return;
  }

  const groups = {};
  filtered.forEach(s => { (groups[s.date] = groups[s.date] || []).push(s); });
  const dks = Object.keys(groups).sort((a,b) => b.localeCompare(a));
  list.innerHTML = dks.map(dk => {
    const dayMins = groups[dk].reduce((a,s) => a + (s.durationMin || 0), 0);
    const d = fromYmd(dk);
    const dateLbl = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <div>
        <div class="row-between mb-2 px-4">
          <span class="text-xs font-bold uppercase tracking-wider text-dim">${dateLbl}</span>
          <div class="row gap-2 items-center">
            <span class="text-xs font-mono font-bold text-accent">${formatHM(dayMins)}</span>
            <button class="btn btn-secondary text-xs" style="padding:6px 10px;" data-lh-add-date="${dk}">
              <i class="fa-solid fa-plus text-accent"></i>
              <span>Add</span>
            </button>
          </div>
        </div>
        <div class="stack-2">${groups[dk].map(sessionCardHTML).join('')}</div>
      </div>`;
  }).join('');
  list.querySelectorAll('[data-lh-add-date]').forEach(el => {
    el.onclick = () => openQuickAddModal(el.dataset.lhAddDate);
  });
  list.querySelectorAll('[data-edit-session]').forEach(el => {
    el.onclick = () => openEditSessionModal(el.dataset.editSession);
  });
}

/* ---------- REPORTS ---------- */
function renderReports() {
  const sel = document.getElementById('reportMonth');
  const monthSet = new Set([monthKey(new Date())]);
  state.sessions.forEach(s => monthSet.add(s.date.slice(0,7)));
  const months = [...monthSet].sort().reverse();
  sel.innerHTML = months.map(mk => {
    const [y,m] = mk.split('-').map(Number);
    return `<option value="${mk}">${t('months')[m-1]} ${y}</option>`;
  }).join('');
  if (!months.includes(currentReportMonth)) currentReportMonth = months[0];
  sel.value = currentReportMonth;

  const mins = getMonthMinutes(currentReportMonth);
  const studies = getMonthStudies(currentReportMonth);
  const credit = getMonthCredit(currentReportMonth);
  const serviceDays = getMonthServiceDays(currentReportMonth);
  animateMinutesTo('reportHours', mins);
  animateNumberTo('reportStudies', studies);
  animateMinutesTo('reportCredit', credit);
  animateNumberTo('reportServiceDays', serviceDays);

  const { start } = getServiceYearRange();
  document.getElementById('reportSYLabel').textContent = `${start.getFullYear()}–${getServiceYearLabel()}`;
  const syMins = getServiceYearMinutes();
  document.getElementById('reportSYTotal').textContent = formatHM(syMins);
  document.getElementById('reportSYGoalLabel').textContent = state.annualGoalHrs;

  const chart = document.getElementById('reportChart');
  const labels = document.getElementById('reportChartLabels');
  const monthGoal = Math.round(state.monthlyGoalHrs * 60);
  const bars = []; let maxMins = monthGoal * 1.5;
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth()+i, 1);
    const mk = monthKey(d); const m = getMonthMinutes(mk);
    maxMins = Math.max(maxMins, m);
    bars.push({ mk, mins: m, monthIdx: d.getMonth() });
  }
  // Goal line
  const goalY = maxMins ? 100 - (monthGoal/maxMins)*100 : 50;
  chart.innerHTML = `<div style="position:absolute; left:0; right:0; top:${goalY}%; border-top:2px dashed var(--blue); opacity:0.4;"></div>` +
    bars.map(b => {
      const h = maxMins ? (b.mins/maxMins)*100 : 0;
      const over = b.mins >= monthGoal;
      return `<div class="bar-track" style="height: 100%"><div class="bar-fill ${over?'over':''}" style="height:${h}%"></div></div>`;
    }).join('');
  labels.innerHTML = bars.map(b => `<div>${t('monthsShort')[b.monthIdx]}</div>`).join('');

  const elapsedMonths = Math.max(1, bars.filter(b => b.mins > 0).length);
  document.getElementById('reportAvg').textContent = formatHM(Math.round(syMins/elapsedMonths));
  const { start: syStart, end: syEnd } = getServiceYearRange();
  const totalDays = Math.round((syEnd - syStart)/86400000) + 1;
  const elapsedDays = Math.max(1, Math.round((new Date() - syStart)/86400000) + 1);
  document.getElementById('reportProj').textContent = formatHM(Math.round((syMins/elapsedDays) * totalDays));

  // Categories
  const sessions = getMonthSessions(currentReportMonth);
  const catTotals = {};
  sessions.forEach(s => { catTotals[s.category] = (catTotals[s.category]||0) + s.durationMin; });
  const total = Object.values(catTotals).reduce((a,b) => a+b, 0);
  const catEl = document.getElementById('reportCategories');
  if (!total) { catEl.innerHTML = `<div class="text-faint text-sm text-center py-4">${t('empty')}</div>`; return; }
  const colors = ['var(--accent)','var(--blue)','var(--amber)','var(--purple)','var(--coral)'];
  catEl.innerHTML = Object.entries(catTotals).sort((a,b) => b[1]-a[1]).map(([cat, m], i) => {
    const pct = (m/total)*100;
    return `
      <div>
        <div class="row-between text-sm mb-1">
          <span class="font-semibold">${escapeHtml(categoryLabel(cat))}</span>
          <span class="font-mono font-bold">${formatHM(m)}</span>
        </div>
        <div class="progress-track" style="height:8px;"><div style="width:${pct}%; height:100%; background:${colors[i%colors.length]}; border-radius:999px;"></div></div>
      </div>`;
  }).join('');
}

/* ---------- SETTINGS ---------- */
function renderSettings() {
  document.getElementById('setUserName').value = state.userName || '';
  document.getElementById('userNameHintBadge').classList.toggle('hidden', !!state.userNameHintSeen);
  document.getElementById('setPublisherType').value = state.publisherType;
  document.getElementById('setAnnualGoal').value = state.annualGoalHrs;
  document.getElementById('setMonthlyGoal').value = state.monthlyGoalHrs;
  document.getElementById('setDailyGoal').value = state.dailyGoalHrs;
  document.getElementById('setRoundMinutes').value = state.roundMinutes;
  document.getElementById('setAutoPause').value = state.autoPauseMin;
  setToggle('togConfirmClose', state.confirmClose);
  setToggle('togShowStreak', state.showStreak);
  setToggle('togWeekStart', state.weekStartsMon);
  setToggle('togCarryOver', state.carryOver);
  setToggle('togHaptics', state.haptics);
  setToggle('togBackupReminder', state.backupReminder);
  document.querySelectorAll('[data-theme-set]').forEach(b => b.classList.toggle('active', b.dataset.themeSet === state.theme));
  document.querySelectorAll('[data-lang-set]').forEach(b => b.classList.toggle('active', b.dataset.langSet === state.lang));
  document.getElementById('setSchemaInfo').textContent = `schema v${state.schemaVersion} · SY ${getServiceYearLabel()}`;
  const lb = state.lastBackupISO ? new Date(state.lastBackupISO).toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : t('never');
  document.getElementById('lastBackupInfo').textContent = `${t('lastBackup')}: ${lb}`;
  renderCategoryList();
  renderPastServiceYears();
}
function setToggle(id, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!on);
}
function renderCategoryList() {
  const wrap = document.getElementById('categoryList');
  if (!wrap) return;
  wrap.innerHTML = (state.categories || []).map((c, i) => `
    <div class="cat-row">
      <div class="flex-1">
        <div class="font-medium text-sm">${escapeHtml(c.label_en)}</div>
        ${c.label_es && c.label_es !== c.label_en ? `<div class="text-xs text-faint">${escapeHtml(c.label_es)}</div>` : ''}
      </div>
      <button class="btn btn-secondary btn-icon" style="width:36px; height:36px;" data-cat-edit="${c.id}"><i class="fa-solid fa-pen" style="font-size:12px;"></i></button>
      <button class="btn btn-secondary btn-icon text-coral" style="width:36px; height:36px;" data-cat-del="${c.id}"><i class="fa-solid fa-trash" style="font-size:12px;"></i></button>
    </div>`).join('');
  wrap.querySelectorAll('[data-cat-edit]').forEach(b => b.onclick = () => openCategoryEditModal(b.dataset.catEdit));
  wrap.querySelectorAll('[data-cat-del]').forEach(b => b.onclick = () => deleteCategory(b.dataset.catDel));
}

// Read-only summary of archived service years (D)
function renderPastServiceYears() {
  const wrap = document.getElementById('pastSYList');
  if (!wrap) return;
  // Collect all archive keys from localStorage
  const archives = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(APP_CONFIG.archivePrefix)) continue;
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        if (!data || !data.serviceYear) continue;
        const sessions = Array.isArray(data.sessions) ? data.sessions : [];
        const totalMin = sessions.reduce((a, s) => a + (s.durationMin || 0), 0);
        const studies = sessions.reduce((a, s) => a + (s.studies || 0), 0);
        const dayset = new Set();
        sessions.forEach(s => { if (s.date && (s.durationMin || 0) > 0) dayset.add(s.date); });
        archives.push({
          sy: data.serviceYear,
          totalMin,
          studies,
          days: dayset.size,
          archivedAt: data.archivedAt || null,
        });
      } catch(e) {}
    }
  } catch(e) {}
  archives.sort((a, b) => b.sy - a.sy); // newest first

  if (!archives.length) {
    wrap.innerHTML = `<div class="text-xs text-faint text-center py-2">${t('pastSYNone')}</div>`;
    return;
  }
  wrap.innerHTML = archives.map(a => {
    const syLabel = `${a.sy - 1}–${a.sy}`;
    const archivedLine = a.archivedAt
      ? `<div class="text-tiny text-faint">${t('pastSYArchived')}: ${new Date(a.archivedAt).toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>`
      : '';
    return `
    <div class="card-flat" style="padding:10px 14px;">
      <div class="row-between items-baseline mb-1">
        <div class="font-semibold text-sm">${escapeHtml(syLabel)}</div>
        <div class="display-num font-mono text-base text-accent">${formatHM(a.totalMin)}</div>
      </div>
      <div class="row gap-3 text-xs text-dim">
        <div><i class="fa-solid fa-calendar-check" style="font-size:10px;"></i> ${a.days} ${t('pastSYDays')}</div>
        <div><i class="fa-solid fa-book-open" style="font-size:10px;"></i> ${a.studies} ${t('pastSYStudies')}</div>
      </div>
      ${archivedLine}
    </div>`;
  }).join('');
}

/* ===== MODALS ===== */
function openModal(html) {
  const root = document.getElementById('modalRoot');
  root.innerHTML = `<div class="modal-backdrop" data-modal-backdrop><div class="modal-body">${html}</div></div>`;
  root.querySelector('[data-modal-backdrop]').onclick = (e) => {
    if (e.target.dataset.modalBackdrop !== undefined) closeModal();
  };
}
function closeModal() { document.getElementById('modalRoot').innerHTML = ''; }

function openConfirmModal(message, onConfirm, opts = {}) {
  const { confirmLabel = t('save'), cancelLabel = t('cancel'), danger = false } = opts;
  openModal(`
    <div class="text-center">
      <div class="text-base font-semibold mb-4">${escapeHtml(message)}</div>
      <div class="row gap-2">
        <button class="btn btn-secondary flex-1" data-cancel>${cancelLabel}</button>
        <button class="btn ${danger?'btn-coral':'btn-primary'} flex-1" data-confirm>${confirmLabel}</button>
      </div>
    </div>`);
  document.querySelector('[data-cancel]').onclick = closeModal;
  document.querySelector('[data-confirm]').onclick = () => { closeModal(); onConfirm(); };
}

// Three-button picker for "which side to update when duration changes"
function openDurationTargetPicker(onPick) {
  openModal(`
    <div class="font-bold text-xl mb-2 text-center">${t('durationLabel')}</div>
    <div class="text-sm text-dim mb-4 text-center">${t('durTargetHint')}</div>
    <div class="stack-2">
      <button class="btn btn-primary w-full" data-target="stop">
        <i class="fa-solid fa-arrow-right"></i>
        <span>${t('durTargetStop')}</span>
      </button>
      <button class="btn btn-secondary w-full" data-target="start">
        <i class="fa-solid fa-arrow-left"></i>
        <span>${t('durTargetStart')}</span>
      </button>
      <button class="btn btn-secondary w-full" data-close-modal>${t('cancel')}</button>
    </div>`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.querySelectorAll('[data-target]').forEach(b => b.onclick = () => {
    const choice = b.dataset.target;
    closeModal();
    setTimeout(() => onPick(choice), 80);
  });
}

// Scroll-wheel picker for duration (hours: 0-999, minutes: 0-59)
function openDurationWheel(initialMin, onPick, options) {
  // Backward compat: third arg is an options object. Old callers pass nothing.
  options = options || {};
  const showStudies = !!options.showStudies;
  let studiesCount = Math.max(0, parseInt(options.initialStudies) || 0);

  initialMin = Math.max(0, Math.min(99 * 60 + 59, initialMin || 0));
  // We type up to 4 digits in HHMM order; e.g. "230" → 2:30, "1500" → 15:00, "5" → 0:05
  // Initial value gets pre-loaded as digit string
  let digits = '';
  if (initialMin > 0) {
    const h = Math.floor(initialMin / 60);
    const m = initialMin % 60;
    digits = String(h) + String(m).padStart(2, '0');
    // Strip leading zeros for cleanliness
    digits = digits.replace(/^0+/, '') || '';
  }

  function digitsToMin(d) {
    // Last 2 digits are minutes, anything before is hours
    if (!d) return 0;
    let padded = d.padStart(3, '0'); // ensures at least 1 hour digit + 2 minute digits
    const h = parseInt(padded.slice(0, -2)) || 0;
    const m = parseInt(padded.slice(-2)) || 0;
    return h * 60 + Math.min(59, m); // clamp minutes
  }
  // Show the digits exactly as typed, formatted into H:MM with leading-zero padding
  // so the colon stays put and you never see weird clamping mid-entry.
  // Examples: "" -> "0:00", "4" -> "0:04", "48" -> "0:48", "480" -> "4:80",
  // "4800" -> "48:00", "1500" -> "15:00"
  function display(d) {
    if (!d) return '0:00';
    const padded = d.padStart(3, '0');
    const hPart = padded.slice(0, -2).replace(/^0+/, '') || '0';
    const mPart = padded.slice(-2);
    return `${hPart}:${mPart}`;
  }

  openModal(`
    <div class="row-between items-center mb-3">
      <div class="font-bold text-xl">${t('durationLabel')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="text-xs text-dim text-center mb-3" id="kpHint">${t('keypadHint')}</div>

    <div class="card-flat text-center" style="padding: 22px 16px; margin-bottom: 8px;">
      <div id="kpDisplay" class="display-num font-mono text-accent" style="font-size: 56px; line-height: 1.1; letter-spacing: 2px;">0:00</div>
      <div class="row" style="justify-content:center; gap: 0; margin-top: 6px;">
        <div class="text-tiny uppercase tracking-wider text-faint font-bold" style="width: 50%; text-align: right; padding-right: 18px;">${t('hoursLabel')}</div>
        <div class="text-tiny uppercase tracking-wider text-faint font-bold" style="width: 50%; text-align: left; padding-left: 18px;">${t('minutesLabel')}</div>
      </div>
    </div>

    <!-- Quick-pick chips for common amounts -->
    <div class="row gap-2 flex-wrap mb-3" style="justify-content: center;">
      <button class="chip text-xs" data-kp-quick="15">15m</button>
      <button class="chip text-xs" data-kp-quick="30">30m</button>
      <button class="chip text-xs" data-kp-quick="45">45m</button>
      <button class="chip text-xs" data-kp-quick="60">1h</button>
      <button class="chip text-xs" data-kp-quick="90">1:30</button>
      <button class="chip text-xs" data-kp-quick="120">2h</button>
      <button class="chip text-xs" data-kp-quick="180">3h</button>
      <button class="chip text-xs" data-kp-quick="240">4h</button>
    </div>

    ${showStudies ? `
    <!-- Studies stepper (optional, when adding time you may also log studies) -->
    <div class="card-flat row-between items-center mb-3" style="padding: 10px 14px;">
      <div>
        <div class="text-sm font-semibold" id="kpStudiesLabel">${t('studies')}</div>
        <div class="text-tiny text-faint">${t('studiesOptional')}</div>
      </div>
      <div class="row gap-2 items-center">
        <button class="btn btn-secondary btn-icon" id="kpStudiesMinus" style="width:36px;height:36px;" aria-label="Decrease studies">
          <i class="fa-solid fa-minus text-coral" style="font-size: 12px;"></i>
        </button>
        <div id="kpStudiesVal" class="display-num font-mono text-lg" style="min-width: 24px; text-align: center;">${studiesCount}</div>
        <button class="btn btn-secondary btn-icon" id="kpStudiesPlus" style="width:36px;height:36px;" aria-label="Increase studies">
          <i class="fa-solid fa-plus text-accent" style="font-size: 12px;"></i>
        </button>
      </div>
    </div>
    ` : ''}

    <!-- Keypad grid -->
    <div class="keypad-grid">
      <button class="keypad-btn" data-kp="1">1</button>
      <button class="keypad-btn" data-kp="2">2</button>
      <button class="keypad-btn" data-kp="3">3</button>
      <button class="keypad-btn" data-kp="4">4</button>
      <button class="keypad-btn" data-kp="5">5</button>
      <button class="keypad-btn" data-kp="6">6</button>
      <button class="keypad-btn" data-kp="7">7</button>
      <button class="keypad-btn" data-kp="8">8</button>
      <button class="keypad-btn" data-kp="9">9</button>
      <button class="keypad-btn keypad-clear" id="kpClear">${t('keypadClear')}</button>
      <button class="keypad-btn" data-kp="0">0</button>
      <button class="keypad-btn keypad-back" id="kpBack"><i class="fa-solid fa-delete-left"></i></button>
    </div>

    <div class="row gap-2 mt-4">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="kpDone">${t('save')}</button>
    </div>`);

  const dispEl = document.getElementById('kpDisplay');
  const updateDisplay = () => { dispEl.textContent = display(digits); };
  updateDisplay();

  // Number pad: append digit, max 4 digits total (max value 99:59)
  document.querySelectorAll('[data-kp]').forEach(btn => {
    btn.onclick = () => {
      if (digits.length >= 4) return; // max 4 digits
      // Don't allow leading zero unless that's the only char
      if (digits === '' && btn.dataset.kp === '0') return;
      digits += btn.dataset.kp;
      vibrate(5);
      updateDisplay();
    };
  });

  // Backspace
  document.getElementById('kpBack').onclick = () => {
    digits = digits.slice(0, -1);
    vibrate(5);
    updateDisplay();
  };

  // Clear
  document.getElementById('kpClear').onclick = () => {
    digits = '';
    vibrate(8);
    updateDisplay();
  };

  // Quick-pick chips: directly set the value
  document.querySelectorAll('[data-kp-quick]').forEach(btn => {
    btn.onclick = () => {
      const mins = parseInt(btn.dataset.kpQuick);
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      digits = (h > 0 ? String(h) : '') + String(m).padStart(2, '0');
      digits = digits.replace(/^0+/, '') || '';
      // Edge case: if quick pick is "30m", digits becomes "30" which the display reads as 0:30 (correct)
      vibrate(8);
      updateDisplay();
    };
  });

  // Studies stepper wiring (only when shown)
  if (showStudies) {
    const stepperEl = document.getElementById('kpStudiesVal');
    const updateStudies = () => { if (stepperEl) stepperEl.textContent = studiesCount; };
    document.getElementById('kpStudiesMinus').onclick = () => {
      if (studiesCount > 0) { studiesCount--; vibrate(5); updateStudies(); }
    };
    document.getElementById('kpStudiesPlus').onclick = () => {
      if (studiesCount < 99) { studiesCount++; vibrate(5); updateStudies(); }
    };
  }

  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('kpDone').onclick = () => {
    const mins = digitsToMin(digits);
    closeModal();
    // Backward compat: pass studies as second arg ONLY when shown; otherwise old signature
    setTimeout(() => {
      if (showStudies) onPick(mins, studiesCount);
      else onPick(mins);
    }, 50);
  };
}

function openCalendarDayModal(dateStr) {
  const d = fromYmd(dateStr);
  const isToday = dateStr === todayStr();
  const dateLbl = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const actual = getDayMinutes(dateStr);
  const planned = getPlannedForDate(dateStr);
  const sessions = getSessionsForDate(dateStr);
  const remaining = planned - actual;
  let statusHTML = '';
  if (planned > 0) {
    statusHTML = remaining > 0
      ? `<div class="chip chip-blue">${formatHM(remaining)} ${t('remaining')}</div>`
      : `<div class="chip chip-accent">+${formatHM(-remaining)} ${t('over')}</div>`;
  }
  openModal(`
    <div class="row-between items-start mb-4">
      <div>
        <div class="font-bold text-xl">${escapeHtml(dateLbl)}</div>
        <div class="text-xs text-faint mt-1 font-mono">${dateStr}</div>
      </div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="card-flat mb-4">
      <div class="grid grid-2">
        <div>
          <div class="text-tiny uppercase tracking-wider text-dim font-bold">${t('actualHours')}</div>
          <div class="display-num text-2xl font-mono text-accent mt-1">${formatHM(actual)}</div>
        </div>
        <div>
          <div class="text-tiny uppercase tracking-wider text-dim font-bold">${t('plannedHours')}</div>
          <div class="display-num text-2xl font-mono mt-1" style="color: ${planned ? 'var(--blue)' : 'var(--text-faint)'}">${planned ? formatHM(planned) : '—'}</div>
        </div>
      </div>
      <div class="row justify-center mt-3">${statusHTML}</div>
    </div>
    <div class="stack-2">
      <button class="btn btn-secondary w-full" id="dayPlanBtn">
        <i class="fa-solid fa-bullseye text-blue"></i>
        <span>${planned > 0 ? t('clearPlan') + ' / ' + t('setPlanned') : t('setPlanned')}</span>
      </button>
      ${isToday ? `<button class="btn btn-primary w-full" id="dayStartBtn"><i class="fa-solid fa-play"></i><span>${t('startTimerHere')}</span></button>` : ''}
      <button class="btn btn-secondary w-full" id="dayQuickAddBtn">
        <i class="fa-solid fa-plus text-accent"></i><span>${t('logTime')}</span>
      </button>
    </div>
    ${sessions.length ? `<div class="mt-5"><div class="text-xs uppercase tracking-wider text-dim font-bold mb-2">${t('sessions')}</div><div class="stack-2">${sessions.map(sessionCardHTML).join('')}</div></div>` : ''}`);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.querySelectorAll('[data-edit-session]').forEach(el => {
    el.onclick = () => { closeModal(); setTimeout(() => openEditSessionModal(el.dataset.editSession), 100); };
  });
  document.getElementById('dayPlanBtn').onclick = () => { closeModal(); setTimeout(() => openPlanModal(dateStr), 100); };
  document.getElementById('dayQuickAddBtn').onclick = () => { closeModal(); setTimeout(() => openQuickAddModal(dateStr), 100); };
  const sb = document.getElementById('dayStartBtn');
  if (sb) sb.onclick = () => {
    closeModal();
    if (!state.activeTimer) { startTimer(dateStr); switchScreen('timer'); }
    else switchScreen('timer');
  };
}

function openPlanModal(dateStr) {
  const d = fromYmd(dateStr);
  const dateLbl = d.toLocaleDateString(state.lang === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const currentMins = getPlannedForDate(dateStr);
  const currentHrs = currentMins ? (currentMins/60).toFixed(2).replace(/\.?0+$/, '') : '';
  const mk = dateStr.slice(0,7);
  const monthPlanned = getMonthPlannedTotal(mk);
  const monthGoal = Math.round(state.monthlyGoalHrs * 60);
  openModal(`
    <div class="row-between items-start mb-4">
      <div>
        <div class="font-bold text-xl">${t('planForDay')}</div>
        <div class="text-xs text-faint mt-1">${escapeHtml(dateLbl)}</div>
      </div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="card-flat mb-4">
      <div class="text-tiny uppercase tracking-wider text-dim font-bold mb-2">${t('monthlyPlan')}</div>
      <div class="row-between items-baseline">
        <div><span id="planPreviewVal" class="display-num text-2xl font-mono text-blue">${formatHM(monthPlanned)}</span><span class="text-faint text-sm"> / ${formatHM(monthGoal)}</span></div>
        <div id="planPreviewDelta" class="font-mono font-bold text-sm">—</div>
      </div>
      <div class="progress-track mt-2"><div id="planPreviewBar" class="progress-fill" style="background:var(--blue); width:${monthGoal ? Math.min(100, (monthPlanned/monthGoal)*100) : 0}%;"></div></div>
    </div>
    <div class="text-xs font-bold uppercase text-dim mb-2">${t('hours')}</div>
    <div class="row gap-2 mb-3">
      <button class="quick-add-btn" data-preset="0">0</button>
      <button class="quick-add-btn" data-preset="1">1h</button>
      <button class="quick-add-btn" data-preset="2">2h</button>
      <button class="quick-add-btn" data-preset="3">3h</button>
      <button class="quick-add-btn" data-preset="4">4h</button>
      <button class="quick-add-btn" data-preset="6">6h</button>
    </div>
    <input type="number" id="planInput" step="0.25" min="0" max="24" placeholder="e.g. 2.5" value="${currentHrs}" />
    <div class="text-tiny text-faint mt-1">${t('hours')} (0 = ${t('clearPlan').toLowerCase()})</div>
    <div class="row gap-2 mt-5">
      <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
      <button class="btn btn-primary flex-1" id="planSaveBtn">${t('save')}</button>
    </div>`);
  function preview(hrs) {
    const newMins = Math.round((parseFloat(hrs) || 0) * 60);
    const total = monthPlanned - currentMins + newMins;
    document.getElementById('planPreviewVal').textContent = formatHM(total);
    const delta = total - monthGoal;
    const dEl = document.getElementById('planPreviewDelta');
    if (delta >= 0) { dEl.textContent = `+${formatHM(delta)} ${t('over')}`; dEl.className = 'font-mono font-bold text-sm text-accent'; }
    else { dEl.textContent = formatHM(delta); dEl.className = 'font-mono font-bold text-sm text-coral'; }
    document.getElementById('planPreviewBar').style.width = (monthGoal ? Math.min(100, (total/monthGoal)*100) : 0) + '%';
  }
  preview(currentHrs);
  document.querySelectorAll('[data-preset]').forEach(b => b.onclick = () => {
    document.getElementById('planInput').value = b.dataset.preset; preview(b.dataset.preset); vibrate(8);
  });
  document.getElementById('planInput').oninput = (e) => preview(e.target.value);
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.getElementById('planSaveBtn').onclick = () => {
    const hrs = parseFloat(document.getElementById('planInput').value) || 0;
    const mins = Math.round(hrs * 60);
    state.plannedByDate = state.plannedByDate || {};
    if (mins <= 0) delete state.plannedByDate[dateStr];
    else state.plannedByDate[dateStr] = mins;
    saveState(); vibrate(15); closeModal(); renderAll(); toast(t('save'));
  };
}

function openEditSessionModal(sessionId) {
  const s = state.sessions.find(x => x.id === sessionId);
  if (!s) return;
  const startD = new Date(s.startISO), stopD = new Date(s.stopISO);
  const startTime = `${String(startD.getHours()).padStart(2,'0')}:${String(startD.getMinutes()).padStart(2,'0')}`;
  const stopTime = `${String(stopD.getHours()).padStart(2,'0')}:${String(stopD.getMinutes()).padStart(2,'0')}`;
  openModal(`
    <div class="row-between items-center mb-4">
      <div class="font-bold text-xl">${t('edit')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="stack-4">
      <div class="grid grid-2">
        <div>
          <div class="text-xs font-bold uppercase text-dim mb-2">${t('pickStart')}</div>
          <input type="time" id="editStartTime" value="${startTime}" />
        </div>
        <div>
          <div class="text-xs font-bold uppercase text-dim mb-2">${t('pickStop')}</div>
          <input type="time" id="editStopTime" value="${stopTime}" />
        </div>
      </div>
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('selectCategory')}</div>
        <select id="editSessCat">
          ${state.categories.map(c => `<option value="${c.id}" ${c.id===s.category?'selected':''}>${escapeHtml(categoryLabel(c.id))}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('addStudies')}</div>
        <input type="number" id="editSessStudies" min="0" value="${s.studies||0}" />
      </div>
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('addNote')}</div>
        <textarea id="editSessNote" rows="2" maxlength="500">${escapeHtml(s.note||'')}</textarea>
      </div>
      <div class="card-flat duration-tile text-center" id="editDurationTile">
        <div class="text-tiny uppercase tracking-wider text-dim font-bold">${t('durationLabel')}</div>
        <div id="editSessDuration" class="display-num text-3xl font-mono text-accent mt-1">${formatHM(s.durationMin)}</div>
        <div class="text-tiny text-faint mt-1">${t('tapToEdit')}</div>
      </div>
      <div class="row gap-2">
        <button class="btn btn-coral" data-delete-sess><i class="fa-solid fa-trash"></i></button>
        <button class="btn btn-secondary flex-1" data-close-modal>${t('cancel')}</button>
        <button class="btn btn-primary flex-1" data-save-sess>${t('save')}</button>
      </div>
    </div>`);
  // Track local working values so wheel edits + time edits stay in sync
  let workingStartISO = s.startISO;
  let workingStopISO = s.stopISO;
  let workingDurMin = s.durationMin;
  let lastEdit = 'times'; // 'times' or 'wheel'

  function refreshDurFromTimes() {
    const startVal = document.getElementById('editStartTime').value;
    const stopVal = document.getElementById('editStopTime').value;
    if (!startVal || !stopVal) return false;
    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = stopVal.split(':').map(Number);
    if (![sh, sm, eh, em].every(Number.isFinite)) return false;
    const d = fromYmd(s.date);
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate(), sh, sm);
    let b = new Date(d.getFullYear(), d.getMonth(), d.getDate(), eh, em);
    if (b < a) b = new Date(b.getTime() + 86400000);
    workingStartISO = a.toISOString();
    workingStopISO = b.toISOString();
    workingDurMin = roundMins(Math.round((b - a)/60000));
    document.getElementById('editSessDuration').textContent = formatHM(workingDurMin);
    return true;
  }
  document.getElementById('editStartTime').oninput = () => { lastEdit = 'times'; refreshDurFromTimes(); };
  document.getElementById('editStopTime').oninput = () => { lastEdit = 'times'; refreshDurFromTimes(); };
  document.getElementById('editDurationTile').onclick = () => {
    openDurationWheel(workingDurMin, (newMin) => {
      if (newMin === workingDurMin) return;
      openDurationTargetPicker((target) => {
        const startD = new Date(workingStartISO);
        if (target === 'stop') {
          const newStop = new Date(startD.getTime() + newMin*60000);
          workingStopISO = newStop.toISOString();
        } else {
          const stopD = new Date(workingStopISO);
          const newStart = new Date(stopD.getTime() - newMin*60000);
          workingStartISO = newStart.toISOString();
        }
        workingDurMin = newMin;
        lastEdit = 'wheel';
        // Update visible time fields (show wrapped value if >24h)
        const ns = new Date(workingStartISO);
        const ne = new Date(workingStopISO);
        document.getElementById('editStartTime').value = `${String(ns.getHours()).padStart(2,'0')}:${String(ns.getMinutes()).padStart(2,'0')}`;
        document.getElementById('editStopTime').value = `${String(ne.getHours()).padStart(2,'0')}:${String(ne.getMinutes()).padStart(2,'0')}`;
        document.getElementById('editSessDuration').textContent = formatHM(workingDurMin);
      });
    });
  };
  document.querySelectorAll('[data-close-modal]').forEach(b => b.onclick = closeModal);
  document.querySelector('[data-delete-sess]').onclick = () => {
    openConfirmModal(t('confirmDelete'), () => {
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      saveState(); renderAll(); toast(t('delete'));
    }, { confirmLabel: t('delete'), danger: true });
  };
  document.querySelector('[data-save-sess]').onclick = () => {
    // Only re-derive from time inputs if user's last edit was the time fields.
    // If they used the wheel, workingStart/Stop/Dur already hold the correct values.
    if (lastEdit === 'times' && !refreshDurFromTimes()) { toast(t('enterTimeRequired')); return; }
    if (!Number.isFinite(workingDurMin) || workingDurMin < 0) { toast(t('enterTimeRequired')); return; }
    s.startISO = workingStartISO;
    s.stopISO = workingStopISO;
    s.durationMin = workingDurMin;
    s.category = document.getElementById('editSessCat').value;
    s.studies = parseInt(document.getElementById('editSessStudies').value) || 0;
    s.note = document.getElementById('editSessNote').value.trim();
    saveState(); closeModal(); renderAll(); toast(t('save'));
  };
}

function openQuickAddModal(dateStr, draft) {
  draft = draft || {};
  dateStr = draft.date || dateStr || currentTimerDate;
  openModal(`
    <div class="row-between items-center mb-4">
      <div class="font-bold text-xl">${t('quickAddSession')}</div>
      <button data-close-modal class="btn btn-secondary btn-icon" style="width:36px; height:36px;"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <div class="stack-4">
      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('dateLabel')}</div>
        <input type="date" id="qaDate" value="${dateStr}" />
      </div>

      <div id="qaCurrentBox" class="card-flat" style="padding:12px 16px;">
        <div class="row-between items-baseline">
          <div class="text-xs uppercase tracking-wider text-dim font-bold">${t('alreadyLogged')}</div>
          <div id="qaCurrentTotal" class="display-num text-xl font-mono text-accent">0:00</div>
        </div>
        <button id="qaViewSessions" class="text-xs text-blue mt-1" style="background:none;border:none;padding:0;cursor:pointer;text-decoration:underline;">${t('viewEditSessions')}</button>
      </div>

      <div>
        <div class="text-xs font-bold uppercase text-dim mb-2">${t('actionLabel')}</div>
        <div class="row gap-2">
          <button class="chip active" data-qa-mode="add" style="flex:1;padding:10px 14px;font-size:13px;">${t('addToTotal')}</button>
          <button class="chip" data-qa-mode="set" style="flex:1;padding:10px 14px;font-size:13px;">${t('setTotal')}</button>
        </div>
      </div>

      <div class="grid grid-2">
        <div>
          <div class="text-xs font-bold uppercase text-dim mb-2">${t('selectCategory')}</div>
          <select id="qaCat">${state.categories.map(c => `<option value="${c.id}"${c.id === resolveDefaultCategory() ? ' selected' : ''}>${escapeHtml(categoryLabel(c.id))}</option>`).join('')}</select>
        </div>
        <div class="card-flat duration-tile text-center" id="qaDurationTile">
          <div id="qaDurationLabel" class="text-tiny uppercase tracking-wider text-dim font-bold">${t('addAmount')}</div>
          <div id="qaDuration" class="display-num text-2xl font-mono text-accent mt-1"></div>
          <div id="qaDurationHelp" class="text-tiny text-faint mt-1">${t('addAmountHelp')}</div>
        </div>
      </div>

      <div id="qaPreviewBox" class="card-flat" style="padding:10px 14px;display:none;">
        <div class="row-between items-baseline">
          <div class="text-xs uppercase tracking-wider text-dim font-bold">${t('newTotalAfter')}</div>
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
    state.creditEntries = (state.creditEntries || []).filter(e => !e.date || !e.date.startsWith(mk) || e.id !== 'c_manual_month_' + mk);
    if (mins > 0) {
      state.creditEntries.push({
        id: 'c_manual_month_' + mk,
        date: mk + '-01',
        minutes: mins,
        type: 'otherCredit',
        note: 'Manual monthly credit total',
      });
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
        try { localStorage.setItem(k, JSON.stringify(v)); } catch(e) {}
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
      if (ta) { ta.focus(); ta.select(); try { document.execCommand('copy'); toast(t('copied')); closeModal(); } catch(e2) {} }
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
} catch(e) {}
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
      } catch(e) {}
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
  wireEvents();
  // Resume timer if it was running before reload/restart
  if (state.activeTimer) startLiveTick();
  renderAll();
  switchScreen('home');
  // Backup reminder: show on open if overdue (but only after UI is up)
  setTimeout(() => {
    if (shouldShowBackupPopup() && !state.backupBannerDismissed) {
      openBackupReminderModal();
    }
  }, 800);
};
