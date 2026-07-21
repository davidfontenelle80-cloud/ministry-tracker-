/**
 * i18n.js — KHub Boilerplate
 * EN/ES language toggle. Persists to localStorage.
 *
 * Usage:
 *   data-i18n="key"           — sets element textContent
 *   data-i18n-aria="key"      — sets element aria-label
 *   data-i18n-placeholder="key" — sets input placeholder
 *   KHub.I18n.set('es')       — switch to Spanish
 *   KHub.I18n.t('key')        — get translated string
 *
 * To add a new string: add the key to BOTH en and es blocks.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'khub_lang';

  const strings = {
    en: {
      // Navigation / shell
      welcome:           'Welcome to KHub',
      welcomeSub:        'Your app starts here.',
      getStarted:        'Get Started',
      appName:           'KHub App',

      // Updates
      updateAvailable:   'Update available —',
      refresh:           'Refresh',

      // Errors
      errorTitle:        'Something went wrong',
      dismiss:           'Dismiss',
      tryAgain:          'Try again',

      // Auth
      signIn:            'Sign In',
      signOut:           'Sign Out',
      signInPrompt:      'Sign in to continue',
      email:             'Email address',
      password:          'Password',

      // Accessibility labels
      langToggleToES:    'Switch to Spanish',
      langToggleToEN:    'Switch to English',
      themeToggleDark:   'Switch to dark mode',
      themeToggleLight:  'Switch to light mode',

      // Generic UI
      cancel:            'Cancel',
      confirm:           'Confirm',
      save:              'Save',
      close:             'Close',
      loading:           'Loading…',
      noData:            'No data yet.',

      // Shell
      skipLink:          'Skip to main content',

      // Cloud account dialog
      cloudAccountTitle: 'Cloud account',
      cloudDialogHint:   'Sign in with the same email and password on every device. Use Sign in if the email already exists; use Create account only the first time.',
      createAccount:     'Create account',
      resetPassword:     'Reset password',
      enterEmailFirst:   'Enter your email first.',
      signingIn:         'Signing in...',
      creatingAccount:   'Creating account...',
      sendingReset:      'Sending reset email...',

      // Cloud auth errors
      authUserNotFound:  'No account found for that email.',
      authWrongPassword: 'Email or password was not correct. Try Sign in with your existing password, or tap Reset password.',
      authEmailInUse:    'That email already has an account. Tap Sign in instead of Create account.',
      authWeakPassword:  'Use a password with at least 6 characters.',
      authInvalidEmail:  'Enter a valid email address.',
      authCfgNotFound:   'Cloud sign-in is not enabled yet. In Firebase Authentication, enable Email/Password sign-in.',
      authNetworkFail:   'Cloud sign-in could not reach Firebase. Check your connection and try again.',
      authTooMany:       'Firebase temporarily blocked sign-in attempts. Wait a few minutes, then try again.',
      authTimeout:       'Cloud sign-in is taking too long. Check your connection and tap Sign in again.',
      authPermissionDenied: 'Cloud backup is blocked by Firestore rules. Update rules to allow backups/{appId}/users/{yourUserId}.',
      authGenericFail:   'Cloud account failed.',

      // Error boundary
      errorCaught:       'App error caught',
      errorLabel:        'Error label: ',
      errorWhere:        'Where: ',
      errorHelp:         'Send this label and what you tapped before the error.',
      copyError:         'Copy error',
      copiedShort:       'Copied',
    },
    es: {
      // Navigation / shell
      welcome:           'Bienvenido a KHub',
      welcomeSub:        'Tu app comienza aquí.',
      getStarted:        'Comenzar',
      appName:           'KHub App',

      // Updates
      updateAvailable:   'Actualización disponible —',
      refresh:           'Actualizar',

      // Errors
      errorTitle:        'Algo salió mal',
      dismiss:           'Cerrar',
      tryAgain:          'Reintentar',

      // Auth
      signIn:            'Iniciar sesión',
      signOut:           'Cerrar sesión',
      signInPrompt:      'Inicia sesión para continuar',
      email:             'Correo electrónico',
      password:          'Contraseña',

      // Accessibility labels
      langToggleToES:    'Cambiar a español',
      langToggleToEN:    'Cambiar a inglés',
      themeToggleDark:   'Cambiar a modo oscuro',
      themeToggleLight:  'Cambiar a modo claro',

      // Generic UI
      cancel:            'Cancelar',
      confirm:           'Confirmar',
      save:              'Guardar',
      close:             'Cerrar',
      loading:           'Cargando…',
      noData:            'Sin datos aún.',

      // Shell
      skipLink:          'Saltar al contenido principal',

      // Cloud account dialog
      cloudAccountTitle: 'Cuenta de la nube',
      cloudDialogHint:   'Inicia sesión con el mismo correo y contraseña en todos tus dispositivos. Usa Iniciar sesión si el correo ya existe; usa Crear cuenta solo la primera vez.',
      createAccount:     'Crear cuenta',
      resetPassword:     'Restablecer contraseña',
      enterEmailFirst:   'Primero escribe tu correo.',
      signingIn:         'Iniciando sesión…',
      creatingAccount:   'Creando la cuenta…',
      sendingReset:      'Enviando el correo de restablecimiento…',

      // Cloud auth errors
      authUserNotFound:  'No se encontró ninguna cuenta con ese correo.',
      authWrongPassword: 'El correo o la contraseña no son correctos. Prueba Iniciar sesión con tu contraseña actual o toca Restablecer contraseña.',
      authEmailInUse:    'Ese correo ya tiene una cuenta. Toca Iniciar sesión en lugar de Crear cuenta.',
      authWeakPassword:  'Usa una contraseña de al menos 6 caracteres.',
      authInvalidEmail:  'Escribe un correo electrónico válido.',
      authCfgNotFound:   'El inicio de sesión en la nube aún no está habilitado. En Firebase Authentication, habilita el acceso con correo y contraseña.',
      authNetworkFail:   'No se pudo conectar con Firebase. Revisa tu conexión e inténtalo de nuevo.',
      authTooMany:       'Firebase bloqueó temporalmente los intentos de inicio de sesión. Espera unos minutos e inténtalo de nuevo.',
      authTimeout:       'El inicio de sesión está tardando demasiado. Revisa tu conexión y toca Iniciar sesión de nuevo.',
      authPermissionDenied: 'Las reglas de Firestore bloquean la copia en la nube. Actualiza las reglas para permitir backups/{appId}/users/{yourUserId}.',
      authGenericFail:   'Falló la cuenta de la nube.',

      // Error boundary
      errorCaught:       'Se detectó un error en la app',
      errorLabel:        'Etiqueta del error: ',
      errorWhere:        'Dónde: ',
      errorHelp:         'Envía esta etiqueta y qué tocaste antes del error.',
      copyError:         'Copiar error',
      copiedShort:       'Copiado',
    },
  };

  let current = localStorage.getItem(STORAGE_KEY) || 'en';

  /**
   * Apply a language to the entire page.
   * Updates textContent, aria-label, and placeholder on all marked elements.
   */
  function applyLang(lang) {
    if (!strings[lang]) { console.warn('[KHub.I18n] Unknown lang:', lang); return; }
    current = lang;

    // Set <html lang=""> for screen readers
    document.documentElement.lang = lang;

    // Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      if (strings[lang][key] !== undefined) el.textContent = strings[lang][key];
    });

    // aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach(el => {
      const key = el.dataset.i18nAria;
      if (strings[lang][key] !== undefined) el.setAttribute('aria-label', strings[lang][key]);
    });

    // placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.dataset.i18nPlaceholder;
      if (strings[lang][key] !== undefined) el.placeholder = strings[lang][key];
    });

    // Update lang toggle button
    const btn = document.getElementById('lang-toggle');
    if (btn) {
      btn.textContent = lang === 'en' ? 'ES' : 'EN';
      btn.setAttribute('aria-label', lang === 'en' ? strings.en.langToggleToES : strings.es.langToggleToEN);
    }

    localStorage.setItem(STORAGE_KEY, lang);

    // Notify other modules
    if (window.KHub?.emit) window.KHub.emit('lang:change', lang);
  }

  function toggle() { applyLang(current === 'en' ? 'es' : 'en'); }

  /** Get a translated string. Falls back to key if missing. */
  function t(key) { return strings[current]?.[key] ?? key; }

  window.KHub = window.KHub || {};
  window.KHub.I18n = {
    set: applyLang,
    toggle,
    t,
    get current() { return current; },
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyLang(current);
    document.getElementById('lang-toggle')?.addEventListener('click', toggle);
  });
})();

/* Ministry Tracker note/reminder copy polish.
 * Translation values only: no reminder scheduling, storage, layout, or timing changes.
 */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    if (typeof I18N !== 'undefined') {
      Object.assign(I18N.en, {
        testPush: 'Test notification',
        pushNotReady: 'Notifications are not ready yet.',
        pushTestSent: 'Test notification sent.',
        pushTestFailed: 'Could not send the test notification.',
        reminderSyncStarted: 'Saving reminder…',
        reminderScheduled: 'Reminder scheduled',
        reminderSyncSaved: 'Reminder saved',
        reminderSyncFailed: 'Could not save the reminder',
        reminderSyncSkipped: 'Saved without a reminder',
        noNotifLabel: 'Save the date only, without a reminder',
      });

      Object.assign(I18N.es, {
        noteDueDate: 'Fecha del recordatorio',
        noteDueTime: 'Hora del recordatorio',
        noteReminder: 'Activar recordatorio',
        deliversAround: 'Recibirás el recordatorio cerca de las {time}',
        reminderLeadError: 'Elige una hora al menos {min} minutos a partir de ahora para poder recibir el recordatorio.',
        setForDelivers: 'Programado para las {picked}. La notificación llegará cerca de las {time}.',
        testPush: 'Probar notificación',
        pushNotReady: 'Las notificaciones aún no están disponibles.',
        pushTestSent: 'Notificación de prueba enviada.',
        pushTestFailed: 'No se pudo enviar la notificación de prueba.',
        reminderSyncStarted: 'Guardando recordatorio…',
        reminderScheduled: 'Recordatorio programado',
        reminderSyncSaved: 'Recordatorio guardado',
        reminderSyncFailed: 'No se pudo guardar el recordatorio',
        reminderSyncSkipped: 'Guardado sin recordatorio',
        notifDenied: 'Las notificaciones están desactivadas. Actívalas en Configuración.',
        notifUnsupported: 'Las notificaciones no están disponibles en este dispositivo.',
        noNotifLabel: 'Guardar solo la fecha, sin recordatorio',
      });
    }

    if (typeof I18N_FALLBACKS !== 'undefined' && I18N_FALLBACKS.es) {
      Object.assign(I18N_FALLBACKS.es, {
        notesSortUpdated: 'Más recientes',
        notesSortDue: 'Fecha del recordatorio',
        notesSortTitle: 'Título',
        noNotesFound: 'No hay notas que coincidan con la búsqueda o el filtro.',
        noNotesSearch: 'No hay notas que coincidan. Prueba con otra búsqueda o filtro.',
        notesEmptyTitle: 'Aún no hay notas aquí',
        noteUntitled: 'Nota sin título',
        noteNoBody: 'Aún no hay detalles.',
        noteNoCategory: 'Sin categoría',
        keepNotesNoCategory: 'Conservar las notas en Todas las notas',
        deleteCategoryAndNotes: 'Eliminar categoría y notas',
        confirmDeleteCatWithNotes: 'Esta categoría tiene {n} notas. ¿Qué quieres hacer con ellas?',
        categoryIconSelected: 'Ícono seleccionado',
        testPush: 'Probar notificación',
        pushNotReady: 'Las notificaciones aún no están disponibles.',
        pushTestSent: 'Notificación de prueba enviada.',
        pushTestFailed: 'No se pudo enviar la notificación de prueba.',
        reminderSyncStarted: 'Guardando recordatorio…',
        reminderScheduled: 'Recordatorio programado',
        reminderSyncSaved: 'Recordatorio guardado',
        reminderSyncFailed: 'No se pudo guardar el recordatorio',
        reminderSyncSkipped: 'Guardado sin recordatorio',
        notifDenied: 'Las notificaciones están desactivadas. Actívalas en Configuración.',
        notifUnsupported: 'Las notificaciones no están disponibles en este dispositivo.',
        noNotifLabel: 'Guardar solo la fecha, sin recordatorio',
      });
    }

    if (typeof toast === 'function') {
      const originalToast = toast;
      toast = function (message, options) {
        let text = message;
        if (typeof text === 'string' && text.startsWith('⏰ Se entrega alrededor de las ')) {
          text = text.replace(
            '⏰ Se entrega alrededor de las ',
            '⏰ Recibirás el recordatorio cerca de las '
          );
        }
        return originalToast(text, options);
      };
    }
  });
})();
