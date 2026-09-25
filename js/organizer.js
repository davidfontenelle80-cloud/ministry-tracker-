/**
 * organizer.js — shared Notes + Bible Studies + dashboard agenda.
 * Return Visits stay in revisits.js, but all three workflows share the same
 * scheduling/reminder/calendar language and feed the Home dashboard.
 */
(function (global) {
  'use strict';

  var noteFilter='today';
  var studyFilter='today';
  var activeNoteId='';
  var activeStudyId='';
  var initialized=false;

  function L(en,es){return state.lang==='es'?es:en;}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];});}
  function nowIso(){return new Date().toISOString();}
  function makeId(prefix){return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);}
  function todayKey(d){d=d||new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function parseKey(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
  function addDays(key,n){var d=parseKey(key);d.setDate(d.getDate()+n);return todayKey(d);}
  function fmtDate(key,short){
    if(!key)return '';
    try{return new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',short?{month:'short',day:'numeric'}:{weekday:'short',month:'short',day:'numeric'}).format(parseKey(key));}
    catch(e){return key;}
  }
  function fmtTime(time){
    if(!/^\d{2}:\d{2}$/.test(time||''))return '';
    var p=time.split(':').map(Number);
    return new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{hour:'numeric',minute:'2-digit'}).format(new Date(2000,0,1,p[0],p[1]));
  }
  function scheduleBucket(v){
    if(v.completed||v.status==='completed'||v.status==='done')return 'completed';
    if(!v.dueDate)return 'undated';
    var t=todayKey();
    if(v.dueDate<t)return 'overdue';
    if(v.dueDate===t)return 'today';
    return 'upcoming';
  }
  function compareSchedule(a,b){
    var ad=a.dueDate||'9999-12-31',bd=b.dueDate||'9999-12-31';
    if(ad!==bd)return ad.localeCompare(bd);
    return (a.dueTime||'99:99').localeCompare(b.dueTime||'99:99');
  }
  function digits(phone){return String(phone||'').replace(/\D+/g,'');}
  function telUrl(phone){return digits(phone).length>=7?'tel:'+String(phone).replace(/[^\d+]/g,''):'';}
  function smsUrl(phone){return digits(phone).length>=7?'sms:'+String(phone).replace(/[^\d+]/g,''):'';}
  function whatsappUrl(phone){var d=digits(phone);return d.length>=7?'https://wa.me/'+d:'';}
  function mailUrl(email){email=String(email||'').trim();return email&&email.indexOf('@')>0?'mailto:'+email:'';}
  function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
  function reminderMinutes(v,def){var n=Number(v&&v.reminderMinutes);return Number.isFinite(n)&&n>=0?n:def;}
  function scheduleText(v){
    if(!v||!v.dueDate)return L('No date','Sin fecha');
    return [fmtDate(v.dueDate),v.dueTime?fmtTime(v.dueTime):''].filter(Boolean).join(' · ');
  }

  function normalizeNote(n){
    n=n&&typeof n==='object'?n:{};
    var out=Object.assign({},n);
    out.id=String(n.id||makeId('note'));
    out.title=String(n.title||'');
    out.body=String(n.body||'');
    out.categoryId='';
    out.dueDate=String(n.dueDate||'');
    out.dueTime=/^\d{2}:\d{2}$/.test(n.dueTime||'')?n.dueTime:'';
    out.reminder=Boolean(n.reminder||n.notify);
    out.reminderMinutes=reminderMinutes(n,15);
    out.completed=Boolean(n.completed||n.status==='done'||n.status==='completed');
    out.status=out.completed?'done':'open';
    out.archived=Boolean(n.archived);
    out.snoozedUntil=String(n.snoozedUntil||'');
    out.createdAt=n.createdAt||nowIso();
    out.updatedAt=n.updatedAt||out.createdAt;
    return out;
  }
  function normalizeStudy(s){
    s=s&&typeof s==='object'?s:{};
    return {
      id:String(s.id||makeId('bs')),
      name:String(s.name||''),
      phone:String(s.phone||''),
      email:String(s.email||''),
      address:String(s.address||''),
      notes:String(s.notes||''),
      publication:String(s.publication||''),
      lesson:String(s.lesson||''),
      dueDate:String(s.dueDate||''),
      dueTime:/^\d{2}:\d{2}$/.test(s.dueTime||'')?s.dueTime:'',
      notify:s.notify!==false,
      reminderMinutes:reminderMinutes(s,15),
      repeatWeekly:Boolean(s.repeatWeekly),
      snoozedUntil:String(s.snoozedUntil||''),
      status:s.status==='completed'?'completed':'active',
      history:Array.isArray(s.history)?s.history:[],
      createdAt:s.createdAt||nowIso(),
      updatedAt:s.updatedAt||nowIso()
    };
  }
  function ensureState(){
    var changed=false;
    if(!Array.isArray(state.ministryNotes)){state.ministryNotes=[];changed=true;}
    state.ministryNotes=state.ministryNotes.map(normalizeNote);
    if(!Array.isArray(state.ministryBibleStudies)){state.ministryBibleStudies=[];changed=true;}
    state.ministryBibleStudies=state.ministryBibleStudies.map(normalizeStudy);
    if(changed)saveState();
  }
  function persist(){saveState();refreshDashboard();}

  function notesRoot(){return document.getElementById('notesContent');}
  function studiesRoot(){return document.getElementById('studiesContent');}
  function setTopTab(name){
    document.querySelectorAll('[data-notes-mode]').forEach(function(b){
      var on=b.dataset.notesMode===name;
      b.classList.toggle('is-active',on);
      b.setAttribute('aria-selected',on?'true':'false');
    });
  }
  function showOnly(name){
    var n=notesRoot(),r=document.getElementById('revisitsContent'),s=studiesRoot();
    if(n)n.classList.toggle('hidden',name!=='notes');
    if(r)r.classList.toggle('hidden',name!=='revisits');
    if(s)s.classList.toggle('hidden',name!=='studies');
    setTopTab(name);
    var nl=document.getElementById('notesModeNotesLabel'),rl=document.getElementById('notesModeRevisitsLabel'),sl=document.getElementById('notesModeStudiesLabel');
    if(nl)nl.textContent=L('Notes','Notas');
    if(rl)rl.textContent=L('Return Visits','Revisitas');
    if(sl)sl.textContent=L('Bible Studies','Estudios');
  }

  function filterTabs(kind,current,records){
    var labels=[
      ['today','fa-calendar-day',L('Today','Hoy')],
      ['upcoming','fa-clock',L('Upcoming','Próximos')],
      ['overdue','fa-triangle-exclamation',L('Overdue','Atrasados')],
      ['all','fa-layer-group',L('All','Todos')]
    ];
    var overdueCount=(records||[]).filter(function(v){return scheduleBucket(v)==='overdue';}).length;
    return '<div class="org-filter-tabs" role="tablist">'+labels.map(function(x){
      var count=x[0]==='overdue'&&overdueCount?'<b class="org-filter-count">'+overdueCount+'</b>':'';
      return '<button class="org-filter-tab'+(current===x[0]?' is-active':'')+'" type="button" data-org-'+kind+'-filter="'+x[0]+'"><i class="fa-solid '+x[1]+'"></i><span>'+esc(x[2])+'</span>'+count+'</button>';
    }).join('')+'</div>';
  }
  function statusBadge(v){
    var b=scheduleBucket(v);
    if(b==='today')return '<span class="org-badge is-today">'+esc(L('Today','Hoy'))+'</span>';
    if(b==='overdue')return '<span class="org-badge is-overdue">'+esc(L('Overdue','Atrasado'))+'</span>';
    if(b==='upcoming')return '<span class="org-badge">'+esc(fmtDate(v.dueDate,true))+'</span>';
    if(b==='completed')return '<span class="org-badge is-complete">'+esc(L('Done','Hecho'))+'</span>';
    return '<span class="org-badge">'+esc(L('No date','Sin fecha'))+'</span>';
  }
  function filtered(arr,filter){
    return arr.filter(function(v){
      var b=scheduleBucket(v);
      if(filter==='all')return !v.archived;
      return b===filter;
    }).sort(compareSchedule);
  }

  function noteCard(n){
    var bucket=scheduleBucket(n);
    var when='';
    if(bucket==='overdue'&&n.dueDate){
      when='<span class="org-overdue-when"><i class="fa-regular fa-calendar"></i> '+esc(L('Due ','Venció ')+fmtDate(n.dueDate,true)+(n.dueTime?' · '+fmtTime(n.dueTime):''))+'</span>';
    }else if(n.dueTime){
      when='<span><i class="fa-regular fa-clock"></i> '+esc(fmtTime(n.dueTime))+'</span>';
    }
    return '<button class="org-note-card'+(bucket==='overdue'?' is-overdue':'')+'" type="button" data-org-open-note="'+esc(n.id)+'">'+
      '<div class="org-card-main"><div class="org-card-title">'+esc(n.title||L('Untitled note','Nota sin título'))+'</div>'+
      '<div class="org-card-meta">'+statusBadge(n)+when+
      (n.reminder?'<span title="'+esc(L('Push reminder','Aviso push'))+'"><i class="fa-solid fa-bell"></i></span>':'')+'</div></div>'+
      '<i class="fa-solid fa-chevron-right org-chevron"></i></button>';
  }
  function renderNotes(){
    ensureState();
    var root=notesRoot();if(!root)return;
    var all=(state.ministryNotes||[]).filter(function(n){return !n.archived;});
    var items=filtered(all,noteFilter);
    var listHtml='';
    if(noteFilter==='today'){
      var todayItems=filtered(all,'today');
      var overdueItems=filtered(all,'overdue');
      if(todayItems.length)listHtml+=todayItems.map(noteCard).join('');
      else listHtml+='<div class="org-empty org-today-empty"><i class="fa-regular fa-circle-check"></i> '+esc(L('Nothing else scheduled for today.','No hay nada más programado para hoy.'))+'</div>';
      if(overdueItems.length){
        listHtml+='<div class="org-needs-attention"><div class="org-needs-attention-head"><span><i class="fa-solid fa-triangle-exclamation"></i> '+esc(L('Needs Attention','Necesita atención'))+'</span><small>'+esc(L('Overdue items stay here until you handle them.','Los elementos atrasados permanecen aquí hasta que los atiendas.'))+'</small></div>'+overdueItems.map(noteCard).join('')+'</div>';
      }
    }else{
      listHtml=items.length?items.map(noteCard).join(''):'<div class="org-empty">'+esc(L('Nothing here yet.','Todavía no hay nada aquí.'))+'</div>';
    }
    root.innerHTML='<div class="org-shell">'+
      '<div class="org-heading"><div><h2>'+esc(L('Notes','Notas'))+'</h2><p>'+esc(L('Simple notes and reminders. The note body stays hidden until you open the card.','Notas y recordatorios simples. El contenido queda oculto hasta que abras la tarjeta.'))+'</p></div>'+
      '<button class="btn btn-primary" type="button" data-org-add-note><i class="fa-solid fa-plus"></i>'+esc(L('Add Note','Añadir nota'))+'</button></div>'+
      filterTabs('note',noteFilter,all)+
      '<div class="org-card-list">'+listHtml+'</div>'+
      '</div>';
  }

  function studyCard(s){
    var tel=telUrl(s.phone);
    return '<div class="org-person-card">'+
      '<button class="org-person-open" type="button" data-org-open-study="'+esc(s.id)+'">'+
        '<div><div class="org-card-title">'+esc(s.name||L('Bible Study','Estudio bíblico'))+'</div><div class="org-card-sub">'+esc([s.publication,s.lesson].filter(Boolean).join(' · ')||s.address||'')+'</div>'+
        '<div class="org-card-meta">'+statusBadge(s)+(s.dueTime?'<span><i class="fa-regular fa-clock"></i> '+esc(fmtTime(s.dueTime))+'</span>':'')+(s.notify?'<span><i class="fa-solid fa-bell"></i></span>':'')+'</div></div>'+
        '<i class="fa-solid fa-chevron-right org-chevron"></i></button>'+
      '<div class="org-inline-actions">'+
        (tel?'<a class="btn btn-secondary" href="'+esc(tel)+'"><i class="fa-solid fa-phone"></i>'+esc(L('Call','Llamar'))+'</a>':'<button class="btn btn-secondary person-phone-prompt" type="button" data-org-study-add-phone="'+esc(s.id)+'"><i class="fa-solid fa-phone-plus"></i>'+esc(L('Add phone','Añadir teléfono'))+'</button>')+
        (s.address?'<button class="btn btn-secondary" type="button" data-org-study-directions="'+esc(s.id)+'"><i class="fa-solid fa-diamond-turn-right"></i>'+esc(L('Directions','Cómo llegar'))+'</button>':'')+
        '<button class="btn btn-secondary" type="button" data-org-open-study="'+esc(s.id)+'"><i class="fa-solid fa-arrow-up-right-from-square"></i>'+esc(L('Open','Abrir'))+'</button>'+
      '</div></div>';
  }
  function renderStudies(){
    ensureState();
    var root=studiesRoot();if(!root)return;
    var items=filtered((state.ministryBibleStudies||[]).filter(function(s){return s.status!=='completed';}),studyFilter);
    root.innerHTML='<div class="org-shell">'+
      '<div class="org-heading"><div><h2>'+esc(L('Bible Studies','Estudios bíblicos'))+'</h2><p>'+esc(L('One card per student, with schedule, contact, reminders and study history.','Una tarjeta por estudiante, con horario, contacto, recordatorios e historial.'))+'</p></div>'+
      '<button class="btn btn-primary" type="button" data-org-add-study><i class="fa-solid fa-plus"></i>'+esc(L('New Study','Nuevo estudio'))+'</button></div>'+
      filterTabs('study',studyFilter,state.ministryBibleStudies||[])+
      '<div class="org-card-list">'+(items.length?items.map(studyCard).join(''):'<div class="org-empty">'+esc(L('No Bible Studies in this view.','No hay estudios bíblicos en esta vista.'))+'</div>')+'</div>'+
      '</div>';
  }

  function ensureDialogs(){
    if(document.getElementById('orgDialogsHost'))return;
    var host=document.createElement('div');host.id='orgDialogsHost';
    host.innerHTML=
      '<dialog id="orgNoteDetail" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2 id="orgNoteDetailTitle"></h2><div id="orgNoteDetailSchedule" class="rv-muted"></div></div><button class="rv-icon-btn" data-org-close="orgNoteDetail">×</button></div><div id="orgNoteDetailBody" class="org-note-body"></div><div class="org-detail-actions"><button class="btn btn-secondary" data-org-note-calendar><i class="fa-solid fa-calendar-plus"></i>'+esc(L('Calendar','Calendario'))+'</button><button id="orgNoteReminderBtn" class="btn btn-secondary" data-org-note-reminder><i class="fa-solid fa-bell"></i><span>'+esc(L('Set Reminder','Poner aviso'))+'</span></button><button class="btn btn-secondary" data-org-note-complete><i class="fa-solid fa-check"></i>'+esc(L('Complete','Completar'))+'</button><button class="btn btn-secondary" data-org-note-edit><i class="fa-solid fa-pen"></i>'+esc(L('Edit','Editar'))+'</button><button class="btn btn-secondary rv-danger" data-org-note-delete><i class="fa-solid fa-trash"></i>'+esc(L('Delete','Eliminar'))+'</button></div></div></dialog>'+
      '<dialog id="orgNoteEdit" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2 id="orgNoteEditTitle">'+esc(L('Note','Nota'))+'</h2></div><button class="rv-icon-btn" data-org-close="orgNoteEdit">×</button></div><form id="orgNoteForm" class="rv-form"><input id="orgNoteId" type="hidden"><label class="rv-field"><span>'+esc(L('Title / subject','Título / asunto'))+'</span><input id="orgNoteTitle" maxlength="120" required autocomplete="off"></label><label class="rv-field"><span>'+esc(L('Note','Nota'))+'</span><textarea id="orgNoteBody" rows="10" maxlength="5000" placeholder="'+esc(L('Write the full note here…','Escribe aquí la nota completa…'))+'"></textarea></label><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Date','Fecha'))+'</span><input id="orgNoteDate" type="date"></label><label class="rv-field"><span>'+esc(L('Time','Hora'))+'</span><input id="orgNoteTime" type="time" step="60"></label></div><label class="rv-check"><input id="orgNoteReminder" type="checkbox"><span>'+esc(L('Push reminder','Recordatorio push'))+'</span></label><label class="rv-field"><span>'+esc(L('Remind me this many minutes before','Avisarme estos minutos antes'))+'</span><input id="orgNoteReminderMinutes" type="number" min="0" max="10080" step="1" value="15"></label><label class="rv-check"><input id="orgNoteCalendarOnSave" type="checkbox"><span>'+esc(L('Add to calendar after saving','Añadir al calendario al guardar'))+'</span></label><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-org-close="orgNoteEdit">'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit"><i class="fa-solid fa-check"></i>'+esc(L('Save','Guardar'))+'</button></div></form></div></dialog>'+
      '<dialog id="orgStudyDetail" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2 id="orgStudyDetailName"></h2><div id="orgStudyDetailSchedule" class="rv-muted"></div></div><button class="rv-icon-btn" data-org-close="orgStudyDetail">×</button></div><button id="orgStudyAddress" class="rv-view-place" type="button" data-org-study-detail-directions><i class="fa-solid fa-location-dot"></i><span></span></button><div id="orgStudyContact" class="org-contact-actions"></div><button id="orgStudyAddPhone" class="person-missing-phone" type="button" data-org-study-add-phone-detail hidden><i class="fa-solid fa-phone-plus"></i><span>'+esc(L('Add a phone number to enable Call, Text and WhatsApp','Añade un teléfono para activar Llamar, Texto y WhatsApp'))+'</span><i class="fa-solid fa-chevron-right"></i></button><dl id="orgStudyDetails" class="rv-view-details"></dl><div id="orgStudyHistory" class="rv-history" hidden></div><div class="org-detail-actions"><button class="btn btn-primary" data-org-study-log><i class="fa-solid fa-check"></i>'+esc(L('Log Study','Registrar estudio'))+'</button><button class="btn btn-secondary" data-org-study-calendar><i class="fa-solid fa-calendar-plus"></i>'+esc(L('Calendar','Calendario'))+'</button><button class="btn btn-secondary" data-org-study-reminder><i class="fa-solid fa-bell"></i>'+esc(L('Set Reminder','Poner aviso'))+'</button><button class="btn btn-secondary" data-org-study-edit><i class="fa-solid fa-pen"></i>'+esc(L('Edit','Editar'))+'</button><button class="btn btn-secondary rv-danger" data-org-study-delete><i class="fa-solid fa-trash"></i>'+esc(L('Delete','Eliminar'))+'</button></div></div></dialog>'+
      '<dialog id="orgStudyEdit" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Bible Study','Estudio bíblico'))+'</h2></div><button class="rv-icon-btn" data-org-close="orgStudyEdit">×</button></div><form id="orgStudyForm" class="rv-form"><input id="orgStudyId" type="hidden"><label class="rv-field"><span>'+esc(L('Name','Nombre'))+' *</span><input id="orgStudyName" maxlength="120" required autocomplete="name"></label><label class="rv-field"><span>'+esc(L('Phone number','Número de teléfono'))+'</span><input id="orgStudyPhone" type="tel" maxlength="50" autocomplete="tel" placeholder="'+esc(L('Recommended','Recomendado'))+'"><small class="person-field-hint">'+esc(L('Add it now to enable Call, Text and WhatsApp after saving.','Añádelo ahora para activar Llamar, Texto y WhatsApp después de guardar.'))+'</small></label><label class="rv-field"><span>'+esc(L('Address','Dirección'))+'</span><input id="orgStudyAddressInput" maxlength="240" autocomplete="street-address"></label><fieldset class="rv-schedule-box"><legend>'+esc(L('Next study','Próximo estudio'))+'</legend><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Date','Fecha'))+'</span><input id="orgStudyDate" type="date"></label><label class="rv-field"><span>'+esc(L('Time','Hora'))+'</span><input id="orgStudyTime" type="time" step="60"></label></div><label class="rv-check"><input id="orgStudyWeekly" type="checkbox"><span>'+esc(L('Usually repeats weekly','Normalmente se repite cada semana'))+'</span></label><label class="rv-check"><input id="orgStudyNotify" type="checkbox"><span>'+esc(L('Push reminder','Recordatorio push'))+'</span></label><label class="rv-field"><span>'+esc(L('Minutes before','Minutos antes'))+'</span><input id="orgStudyReminderMinutes" type="number" min="0" max="10080" step="1" value="15"></label><label class="rv-check"><input id="orgStudyCalendarOnSave" type="checkbox"><span>'+esc(L('Add to calendar after saving','Añadir al calendario al guardar'))+'</span></label></fieldset><details id="orgStudyMoreDetails" class="rv-more-details"><summary>'+esc(L('More details (optional)','Más detalles (opcional)'))+'</summary><div class="rv-more-details-body"><label class="rv-field"><span>'+esc(L('Email','Correo electrónico'))+'</span><input id="orgStudyEmail" type="email" maxlength="160" autocomplete="email"></label><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Publication / material','Publicación / material'))+'</span><input id="orgStudyPublication" maxlength="160"></label><label class="rv-field"><span>'+esc(L('Lesson / chapter','Lección / capítulo'))+'</span><input id="orgStudyLesson" maxlength="120"></label></div><label class="rv-field"><span>'+esc(L('Study notes','Notas del estudio'))+'</span><textarea id="orgStudyNotes" rows="5" maxlength="2000"></textarea></label></div></details><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-org-close="orgStudyEdit">'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit"><i class="fa-solid fa-check"></i>'+esc(L('Save','Guardar'))+'</button></div></form></div></dialog>'+
      '<dialog id="orgStudyLog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Log Bible Study','Registrar estudio bíblico'))+'</h2><div id="orgStudyLogName" class="rv-muted"></div></div><button class="rv-icon-btn" data-org-close="orgStudyLog">×</button></div><form id="orgStudyLogForm" class="rv-form"><label class="rv-field"><span>'+esc(L('What did you cover?','¿Qué estudiaron?'))+'</span><textarea id="orgStudyLogNote" rows="4" maxlength="1200"></textarea></label><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Publication / material','Publicación / material'))+'</span><input id="orgStudyLogPublication" maxlength="160"></label><label class="rv-field"><span>'+esc(L('Lesson / chapter','Lección / capítulo'))+'</span><input id="orgStudyLogLesson" maxlength="120"></label></div><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Next date','Próxima fecha'))+'</span><input id="orgStudyLogDate" type="date"></label><label class="rv-field"><span>'+esc(L('Next time','Próxima hora'))+'</span><input id="orgStudyLogTime" type="time" step="60"></label></div><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-org-close="orgStudyLog">'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit">'+esc(L('Save','Guardar'))+'</button></div></form></div></dialog>'+
      '<dialog id="orgNotificationQuick" class="rv-dialog org-quick-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><div class="org-eyebrow" id="orgQuickType"></div><h2 id="orgQuickTitle"></h2><div id="orgQuickSchedule" class="rv-muted"></div></div><button class="rv-icon-btn" data-org-close="orgNotificationQuick">×</button></div><div id="orgQuickPlace" class="org-quick-place"></div><div id="orgQuickActions" class="org-quick-actions"></div><div id="orgQuickReminderActions" class="org-reminder-actions"></div></div></dialog>';
    document.body.appendChild(host);
    bindDialogs();
  }
  function D(id){return document.getElementById(id);}
  function showDialog(id){var d=D(id);if(d&&!d.open)d.showModal();}
  function closeDialog(id){var d=D(id);if(d&&d.open)d.close();}

  function openNoteEdit(id,prefillDate){
    ensureDialogs();ensureState();
    var n=id?(state.ministryNotes||[]).find(function(x){return x.id===id;}):null;
    activeNoteId=n?n.id:'';
    D('orgNoteId').value=n?n.id:'';
    D('orgNoteTitle').value=n?n.title:'';
    D('orgNoteBody').value=n?n.body:'';
    D('orgNoteDate').value=n?n.dueDate:(prefillDate||'');
    D('orgNoteTime').value=n?n.dueTime:'';
    D('orgNoteReminder').checked=n?n.reminder:false;
    D('orgNoteReminderMinutes').value=n?reminderMinutes(n,15):15;
    D('orgNoteCalendarOnSave').checked=false;
    D('orgNoteEditTitle').textContent=n?L('Edit Note','Editar nota'):L('New Note','Nueva nota');
    closeDialog('orgNoteDetail');showDialog('orgNoteEdit');
    setTimeout(function(){D('orgNoteTitle').focus();},60);
  }
  function openNoteDetail(id){
    ensureDialogs();ensureState();
    var n=(state.ministryNotes||[]).find(function(x){return x.id===id;});if(!n)return;
    activeNoteId=id;
    D('orgNoteDetailTitle').textContent=n.title||L('Untitled note','Nota sin título');
    D('orgNoteDetailSchedule').textContent=n.dueDate?scheduleText(n):L('No reminder date','Sin fecha de recordatorio');
    D('orgNoteDetailBody').textContent=n.body||L('No details.','Sin detalles.');
    var complete=D('orgNoteDetail').querySelector('[data-org-note-complete]');
    if(complete)complete.textContent=n.completed?L('Reopen','Reabrir'):L('Complete','Completar');
    var reminderBtn=D('orgNoteReminderBtn'),reminderLabel=reminderBtn&&reminderBtn.querySelector('span');
    if(reminderLabel)reminderLabel.textContent=(n.reminder&&n.dueDate&&n.dueTime)?L('Reminder on · ','Aviso activo · ')+reminderMinutes(n,15)+' min':L('Set Reminder','Poner aviso');
    showDialog('orgNoteDetail');
  }

  function studyById(id){return (state.ministryBibleStudies||[]).find(function(x){return x.id===id;});}
  function studyHistoryHtml(s){
    var h=Array.isArray(s.history)?s.history.slice().reverse():[];
    if(!h.length)return '';
    return '<strong>'+esc(L('Study history','Historial del estudio'))+'</strong>'+h.map(function(x){
      var d=x.completedAt?new Date(x.completedAt):null;
      var stamp=d&&!isNaN(d)?new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):'';
      return '<div class="rv-history-item"><strong>'+esc(stamp)+'</strong>'+(x.note?'<div>'+esc(x.note)+'</div>':'')+([x.publication,x.lesson].filter(Boolean).length?'<div class="rv-muted">'+esc([x.publication,x.lesson].filter(Boolean).join(' · '))+'</div>':'')+'</div>';
    }).join('');
  }
  function openStudyDetail(id){
    ensureDialogs();ensureState();
    var s=studyById(id);if(!s)return;
    activeStudyId=id;
    D('orgStudyDetailName').textContent=s.name||L('Bible Study','Estudio bíblico');
    D('orgStudyDetailSchedule').textContent=scheduleText(s)+(s.repeatWeekly?' · '+L('weekly','semanal'):'');
    var addr=D('orgStudyAddress');addr.hidden=!s.address;
    if(s.address)addr.querySelector('span').textContent=s.address;
    var actions=[],tel=telUrl(s.phone),sms=smsUrl(s.phone),wa=whatsappUrl(s.phone),mail=mailUrl(s.email);
    if(tel)actions.push('<a class="btn btn-secondary" href="'+esc(tel)+'"><i class="fa-solid fa-phone"></i>'+esc(L('Call','Llamar'))+'</a>');
    if(sms)actions.push('<a class="btn btn-secondary" href="'+esc(sms)+'"><i class="fa-solid fa-message"></i>'+esc(L('Text','Texto'))+'</a>');
    if(wa)actions.push('<a class="btn btn-secondary" href="'+esc(wa)+'" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>WhatsApp</a>');
    if(mail)actions.push('<a class="btn btn-secondary" href="'+esc(mail)+'"><i class="fa-solid fa-envelope"></i>'+esc(L('Email','Correo'))+'</a>');
    D('orgStudyContact').innerHTML=actions.join('');
    D('orgStudyContact').hidden=!actions.length;
    var addPhone=D('orgStudyAddPhone');if(addPhone)addPhone.hidden=!!tel;
    var rows=[[L('Notes','Notas'),s.notes],[L('Publication / material','Publicación / material'),s.publication],[L('Lesson / chapter','Lección / capítulo'),s.lesson],[L('Phone','Teléfono'),s.phone],[L('Email','Correo electrónico'),s.email]].filter(function(x){return x[1];});
    D('orgStudyDetails').innerHTML=rows.map(function(x){return '<dt>'+esc(x[0])+'</dt><dd>'+esc(x[1])+'</dd>';}).join('');
    D('orgStudyDetails').hidden=!rows.length;
    var hist=D('orgStudyHistory');hist.innerHTML=studyHistoryHtml(s);hist.hidden=!hist.innerHTML;
    showDialog('orgStudyDetail');
  }
  function openStudyEdit(id){
    ensureDialogs();ensureState();
    var s=id?studyById(id):null;
    activeStudyId=s?s.id:'';
    D('orgStudyId').value=s?s.id:'';
    D('orgStudyName').value=s?s.name:'';
    D('orgStudyPhone').value=s?s.phone:'';
    D('orgStudyEmail').value=s?s.email:'';
    D('orgStudyAddressInput').value=s?s.address:'';
    D('orgStudyPublication').value=s?s.publication:'';
    D('orgStudyLesson').value=s?s.lesson:'';
    D('orgStudyNotes').value=s?s.notes:'';
    D('orgStudyDate').value=s?s.dueDate:'';
    D('orgStudyTime').value=s?s.dueTime:'';
    D('orgStudyWeekly').checked=s?s.repeatWeekly:false;
    D('orgStudyNotify').checked=s?s.notify:true;
    D('orgStudyReminderMinutes').value=s?reminderMinutes(s,15):15;
    D('orgStudyCalendarOnSave').checked=false;
    var more=D('orgStudyMoreDetails');if(more)more.open=Boolean(s&&(s.email||s.publication||s.lesson||s.notes));
    closeDialog('orgStudyDetail');showDialog('orgStudyEdit');
    if(!s)setTimeout(function(){D('orgStudyName').focus();},60);
  }
  function openStudyLog(id){
    ensureDialogs();var s=studyById(id);if(!s)return;activeStudyId=id;
    D('orgStudyLogName').textContent=s.name;
    D('orgStudyLogNote').value='';
    D('orgStudyLogPublication').value=s.publication||'';
    D('orgStudyLogLesson').value=s.lesson||'';
    D('orgStudyLogDate').value=s.repeatWeekly?addDays(s.dueDate||todayKey(),7):'';
    D('orgStudyLogTime').value=s.dueTime||'';
    closeDialog('orgStudyDetail');showDialog('orgStudyLog');
  }

  function pushFireAt(v,minutes){
    if(!v.dueDate||!v.dueTime)return null;
    var at=new Date(v.dueDate+'T'+v.dueTime+':00');
    if(isNaN(at.getTime()))return null;
    return new Date(at.getTime()-Math.max(0,Number(minutes)||0)*60000);
  }
  function futureSnooze(v){
    if(!v||!v.snoozedUntil)return null;
    var d=new Date(v.snoozedUntil);
    return !isNaN(d.getTime())&&d.getTime()>Date.now()+30000?d:null;
  }
  function syncNotePush(n){
    if(!global.MinistryPush)return Promise.resolve({ok:false});
    if(n.completed||!n.reminder||!n.dueDate||!n.dueTime)return global.MinistryPush.clearReminder('ministry-note',n.id);
    var fire=futureSnooze(n)||pushFireAt(n,n.reminderMinutes);
    if(!fire||fire.getTime()<=Date.now()+30000){global.MinistryPush.clearReminder('ministry-note',n.id);return Promise.resolve({ok:false,skipped:'too-soon'});}
    n.reminderAt=fire.toISOString();
    saveState();
    return global.MinistryPush.syncReminder('ministry-note',n.id,n.title||L('Note','Nota'),scheduleText(n),fire.toISOString());
  }
  function syncStudyPush(s){
    if(!global.MinistryPush)return Promise.resolve({ok:false});
    if(s.status==='completed'||!s.notify||!s.dueDate||!s.dueTime)return global.MinistryPush.clearReminder('bible-study',s.id);
    var fire=futureSnooze(s)||pushFireAt(s,s.reminderMinutes);
    if(!fire||fire.getTime()<=Date.now()+30000){global.MinistryPush.clearReminder('bible-study',s.id);return Promise.resolve({ok:false,skipped:'too-soon'});}
    return global.MinistryPush.syncReminder('bible-study',s.id,L('Bible Study: ','Estudio bíblico: ')+s.name,scheduleText(s),fire.toISOString());
  }

  function icsEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');}
  function localStamp(date,time){return String(date||'').replace(/-/g,'')+'T'+String(time||'09:00').replace(':','')+'00';}
  function endStamp(date,time,mins){
    var d=new Date(date+'T'+(time||'09:00')+':00');d=new Date(d.getTime()+mins*60000);
    return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+'00';
  }
  function downloadICS(filename,lines){
    var blob=new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},30000);
  }
  function calendarForNote(n){
    if(!n.dueDate){toast(L('Set a date first.','Primero fija una fecha.'));return;}
    var title=n.title||L('Note','Nota'),description=n.body||'';
    if(!isIOS()){
      var dates=n.dueTime?localStamp(n.dueDate,n.dueTime)+'/'+endStamp(n.dueDate,n.dueTime,30):n.dueDate.replace(/-/g,'')+'/'+addDays(n.dueDate,1).replace(/-/g,'');
      global.open('https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:title,dates:dates,details:description}).toString(),'_blank','noopener');
      return;
    }
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KHub//Ministry Notes//EN','BEGIN:VEVENT','UID:'+n.id+'@khub','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')];
    if(n.dueTime)lines.push('DTSTART:'+localStamp(n.dueDate,n.dueTime),'DTEND:'+endStamp(n.dueDate,n.dueTime,30));else lines.push('DTSTART;VALUE=DATE:'+n.dueDate.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(n.dueDate,1).replace(/-/g,''));
    lines.push('SUMMARY:'+icsEscape(title),'DESCRIPTION:'+icsEscape(description));
    if(n.dueTime&&n.reminder)lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape(title),'TRIGGER:-PT'+Math.max(0,Number(n.reminderMinutes)||15)+'M','END:VALARM');
    lines.push('END:VEVENT','END:VCALENDAR');downloadICS('ministry-note-'+n.dueDate+'.ics',lines);
  }
  function calendarForStudy(s){
    if(!s.dueDate){toast(L('Set the next study date first.','Primero fija la fecha del próximo estudio.'));return;}
    var title=L('Bible Study: ','Estudio bíblico: ')+s.name;
    var details=[s.publication,s.lesson,s.notes].filter(Boolean).join('\n');
    if(!isIOS()){
      var dates=s.dueTime?localStamp(s.dueDate,s.dueTime)+'/'+endStamp(s.dueDate,s.dueTime,60):s.dueDate.replace(/-/g,'')+'/'+addDays(s.dueDate,1).replace(/-/g,'');
      global.open('https://calendar.google.com/calendar/render?'+new URLSearchParams({action:'TEMPLATE',text:title,dates:dates,details:details,location:s.address||''}).toString(),'_blank','noopener');
      return;
    }
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KHub//Ministry Bible Studies//EN','BEGIN:VEVENT','UID:'+s.id+'@khub','DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')];
    if(s.dueTime)lines.push('DTSTART:'+localStamp(s.dueDate,s.dueTime),'DTEND:'+endStamp(s.dueDate,s.dueTime,60));else lines.push('DTSTART;VALUE=DATE:'+s.dueDate.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(s.dueDate,1).replace(/-/g,''));
    lines.push('SUMMARY:'+icsEscape(title),'LOCATION:'+icsEscape(s.address||''),'DESCRIPTION:'+icsEscape(details));
    if(s.dueTime&&s.notify)lines.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape(title),'TRIGGER:-PT'+Math.max(0,Number(s.reminderMinutes)||15)+'M','END:VALARM');
    lines.push('END:VEVENT','END:VCALENDAR');downloadICS('bible-study-'+s.dueDate+'.ics',lines);
  }

  function navigationUrl(record){
    if(!record)return '';
    var hasCoords=record.lat!==null&&record.lat!==undefined&&record.lat!==''&&record.lng!==null&&record.lng!==undefined&&record.lng!==''&&Number.isFinite(Number(record.lat))&&Number.isFinite(Number(record.lng));
    var target=hasCoords?(Number(record.lat).toFixed(6)+','+Number(record.lng).toFixed(6)):String(record.address||'').trim();
    if(!target)return '';
    var app=(state.revisitSettings&&state.revisitSettings.navApp)||'auto';
    if(app==='auto'||app==='ask')app=isIOS()?'apple':'google';
    if(app==='waze')return hasCoords?'https://waze.com/ul?ll='+encodeURIComponent(target)+'&navigate=yes':'https://waze.com/ul?q='+encodeURIComponent(target)+'&navigate=yes';
    if(app==='apple')return 'https://maps.apple.com/?daddr='+encodeURIComponent(target)+'&dirflg=d';
    return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(target)+'&travelmode=driving';
  }
  function openDirections(record){
    var url=navigationUrl(record);if(!url){toast(L('Add an address first.','Primero añade una dirección.'));return;}global.open(url,'_blank','noopener');
  }

  function saveNote(e){
    e.preventDefault();ensureState();
    var id=D('orgNoteId').value||makeId('note'),prev=(state.ministryNotes||[]).find(function(x){return x.id===id;});
    var n=normalizeNote(Object.assign({},prev||{},{
      id:id,title:D('orgNoteTitle').value.trim(),body:D('orgNoteBody').value,
      dueDate:D('orgNoteDate').value||'',dueTime:D('orgNoteDate').value?(D('orgNoteTime').value||''):'',
      reminder:D('orgNoteReminder').checked,reminderMinutes:Math.max(0,Number(D('orgNoteReminderMinutes').value)||0),
      snoozedUntil:'',
      updatedAt:nowIso(),createdAt:prev?prev.createdAt:nowIso()
    }));
    if(prev)state.ministryNotes=state.ministryNotes.map(function(x){return x.id===id?n:x;});else state.ministryNotes.push(n);
    persist();closeDialog('orgNoteEdit');renderNotes();syncNotePush(n);
    if(D('orgNoteCalendarOnSave').checked)calendarForNote(n);
    toast(L('Note saved.','Nota guardada.'));
  }
  function setNoteReminder(){
    var n=(state.ministryNotes||[]).find(function(x){return x.id===activeNoteId;});if(!n)return;
    if(!n.dueDate||!n.dueTime){toast(L('Set a date and time first.','Primero fija fecha y hora.'));openNoteEdit(n.id);return;}
    n=normalizeNote(Object.assign({},n,{reminder:true,updatedAt:nowIso()}));
    state.ministryNotes=state.ministryNotes.map(function(x){return x.id===n.id?n:x;});
    persist();syncNotePush(n).then(function(result){
      if(!result||result.ok!==false)toast(L('Reminder scheduled.','Recordatorio programado.'));
      openNoteDetail(n.id);
    });
  }

  function saveStudy(e){
    e.preventDefault();ensureState();
    var id=D('orgStudyId').value||makeId('bs'),prev=studyById(id);
    var s=normalizeStudy({
      id:id,name:D('orgStudyName').value.trim(),phone:D('orgStudyPhone').value.trim(),email:D('orgStudyEmail').value.trim(),
      address:D('orgStudyAddressInput').value.trim(),publication:D('orgStudyPublication').value.trim(),lesson:D('orgStudyLesson').value.trim(),
      notes:D('orgStudyNotes').value.trim(),dueDate:D('orgStudyDate').value||'',dueTime:D('orgStudyDate').value?(D('orgStudyTime').value||''):'',
      repeatWeekly:D('orgStudyWeekly').checked,notify:D('orgStudyNotify').checked,reminderMinutes:Math.max(0,Number(D('orgStudyReminderMinutes').value)||0),
      snoozedUntil:'',
      status:prev?prev.status:'active',history:prev?prev.history:[],createdAt:prev?prev.createdAt:nowIso(),updatedAt:nowIso()
    });
    if(prev)state.ministryBibleStudies=state.ministryBibleStudies.map(function(x){return x.id===id?s:x;});else state.ministryBibleStudies.push(s);
    persist();closeDialog('orgStudyEdit');renderStudies();syncStudyPush(s);
    if(!prev)openStudyDetail(s.id);
    if(D('orgStudyCalendarOnSave').checked)calendarForStudy(s);
    toast(L('Bible Study saved.','Estudio bíblico guardado.'));
  }
  function saveStudyLog(e){
    e.preventDefault();var s=studyById(activeStudyId);if(!s)return;
    var nextDate=D('orgStudyLogDate').value||'',nextTime=nextDate?(D('orgStudyLogTime').value||''):'';
    var h={completedAt:nowIso(),note:D('orgStudyLogNote').value.trim(),publication:D('orgStudyLogPublication').value.trim(),lesson:D('orgStudyLogLesson').value.trim()};
    var next=normalizeStudy(Object.assign({},s,{history:(s.history||[]).concat([h]),publication:h.publication||s.publication,lesson:h.lesson||s.lesson,dueDate:nextDate,dueTime:nextTime,snoozedUntil:'',updatedAt:nowIso()}));
    state.ministryBibleStudies=state.ministryBibleStudies.map(function(x){return x.id===s.id?next:x;});
    persist();closeDialog('orgStudyLog');renderStudies();syncStudyPush(next);openStudyDetail(next.id);
  }

  function deleteNote(){
    var id=activeNoteId;if(!id)return;
    if(!confirm(L('Delete this note?','¿Borrar esta nota?')))return;
    state.ministryNotes=state.ministryNotes.filter(function(x){return x.id!==id;});persist();
    if(global.MinistryPush)global.MinistryPush.clearReminder('ministry-note',id);
    closeDialog('orgNoteDetail');renderNotes();
  }
  function toggleNoteComplete(){
    var n=(state.ministryNotes||[]).find(function(x){return x.id===activeNoteId;});if(!n)return;
    n=normalizeNote(Object.assign({},n,{completed:!n.completed,status:!n.completed?'done':'open',updatedAt:nowIso()}));
    state.ministryNotes=state.ministryNotes.map(function(x){return x.id===n.id?n:x;});persist();syncNotePush(n);closeDialog('orgNoteDetail');renderNotes();
  }
  function deleteStudy(){
    var s=studyById(activeStudyId);if(!s)return;
    if(!confirm(L('Delete this Bible Study?','¿Borrar este estudio bíblico?')))return;
    state.ministryBibleStudies=state.ministryBibleStudies.filter(function(x){return x.id!==s.id;});persist();
    if(global.MinistryPush)global.MinistryPush.clearReminder('bible-study',s.id);
    closeDialog('orgStudyDetail');renderStudies();
  }
  function setStudyReminder(){
    var s=studyById(activeStudyId);if(!s)return;
    if(!s.dueDate||!s.dueTime){toast(L('Set a date and time first.','Primero fija fecha y hora.'));openStudyEdit(s.id);return;}
    s=normalizeStudy(Object.assign({},s,{notify:true,updatedAt:nowIso()}));
    state.ministryBibleStudies=state.ministryBibleStudies.map(function(x){return x.id===s.id?s:x;});persist();syncStudyPush(s).then(function(){toast(L('Reminder scheduled.','Recordatorio programado.'));});
  }

  function agendaItems(){
    ensureState();
    var out=[];
    (state.ministryNotes||[]).forEach(function(n){if(!n.completed&&!n.archived&&n.dueDate)out.push({type:'note',id:n.id,title:n.title||L('Untitled note','Nota sin título'),dueDate:n.dueDate,dueTime:n.dueTime||'',subtitle:L('Note','Nota')});});
    (state.ministryRevisits||[]).forEach(function(v){if(v.status!=='completed'&&v.dueDate)out.push({type:'revisit',id:v.id,title:v.name||L('Return Visit','Revisita'),dueDate:v.dueDate,dueTime:v.dueTime||'',subtitle:L('Return Visit','Revisita')});});
    (state.ministryBibleStudies||[]).forEach(function(s){if(s.status!=='completed'&&s.dueDate)out.push({type:'bible-study',id:s.id,title:s.name||L('Bible Study','Estudio bíblico'),dueDate:s.dueDate,dueTime:s.dueTime||'',subtitle:L('Bible Study','Estudio bíblico')});});
    return out.sort(compareSchedule);
  }
  function dashboardItem(x){
    var icon=x.type==='note'?'fa-note-sticky':x.type==='revisit'?'fa-location-dot':'fa-book-open';
    return '<button class="org-dashboard-item" type="button" data-org-dashboard-open="'+x.type+'" data-org-id="'+esc(x.id)+'"><span class="org-dashboard-icon"><i class="fa-solid '+icon+'"></i></span><span class="org-dashboard-copy"><strong>'+esc(x.title)+'</strong><small>'+esc(x.subtitle+(x.dueTime?' · '+fmtTime(x.dueTime):''))+'</small></span><i class="fa-solid fa-chevron-right"></i></button>';
  }
  function refreshDashboard(){
    var root=document.getElementById('organizerDashboard');if(!root)return;
    ensureState();
    var all=agendaItems(),today=todayKey();
    var dueToday=all.filter(function(x){return x.dueDate===today;});
    var overdue=all.filter(function(x){return x.dueDate<today;});
    var upcoming=all.filter(function(x){return x.dueDate>today;}).slice(0,4);
    root.innerHTML='<div class="org-dashboard card">'+
      '<div class="org-dashboard-head"><div><div class="text-xs uppercase tracking-wider text-dim font-semibold">'+esc(L("Today's agenda",'Agenda de hoy'))+'</div><div class="text-sm text-faint">'+esc(L('Notes, Return Visits and Bible Studies','Notas, revisitas y estudios bíblicos'))+'</div></div><button class="btn btn-secondary" type="button" data-org-open-organizer><i class="fa-solid fa-list-check"></i>'+esc(L('Open','Abrir'))+'</button></div>'+
      (dueToday.length?'<div class="org-dashboard-section"><strong>'+esc(L('Today','Hoy'))+'</strong>'+dueToday.map(dashboardItem).join('')+'</div>':'<div class="org-dashboard-empty"><i class="fa-regular fa-circle-check"></i> '+esc(L('Nothing scheduled for today.','No hay nada programado para hoy.'))+'</div>')+
      (overdue.length?'<div class="org-dashboard-section"><strong class="org-overdue-label">'+esc(L('Overdue','Atrasado'))+'</strong>'+overdue.slice(0,3).map(dashboardItem).join('')+'</div>':'')+
      (upcoming.length?'<div class="org-dashboard-section"><strong>'+esc(L('Upcoming','Próximos'))+'</strong>'+upcoming.map(dashboardItem).join('')+'</div>':'')+
      '</div>';
  }

  function openRecord(type,id){
    if(type==='note'){if(typeof global.switchScreen==='function')global.switchScreen('notes');showOnly('notes');renderNotes();setTimeout(function(){openNoteDetail(id);},80);return;}
    if(type==='revisit'){if(global.MinistryRevisits&&global.MinistryRevisits.open)global.MinistryRevisits.open(id);return;}
    if(type==='bible-study'){if(typeof global.switchScreen==='function')global.switchScreen('notes');showOnly('studies');renderStudies();setTimeout(function(){openStudyDetail(id);},80);}
  }
  function quickRecord(sourceType,id){
    if(sourceType==='ministry-note')return (state.ministryNotes||[]).find(function(x){return x.id===id;});
    if(sourceType==='revisit')return (state.ministryRevisits||[]).find(function(x){return x.id===id;});
    if(sourceType==='bible-study')return studyById(id);
    return null;
  }
  function reminderTitle(sourceType,rec){
    if(sourceType==='ministry-note')return rec.title||L('Note','Nota');
    if(sourceType==='revisit')return L('Return Visit: ','Revisita: ')+(rec.name||'');
    return L('Bible Study: ','Estudio bíblico: ')+(rec.name||'');
  }
  function reminderBody(sourceType,rec){
    if(sourceType==='ministry-note')return scheduleText(rec);
    return [scheduleText(rec),rec.address||rec.reference||''].filter(Boolean).join(' · ');
  }
  function snoozeReminder(sourceType,id,minutes){
    ensureState();
    var rec=quickRecord(sourceType,id);if(!rec||!global.MinistryPush)return Promise.resolve({ok:false,skipped:'missing'});
    minutes=Math.max(1,Number(minutes)||15);
    var fire=new Date(Date.now()+minutes*60000),iso=fire.toISOString();
    if(sourceType==='ministry-note'){
      rec=normalizeNote(Object.assign({},rec,{reminder:true,snoozedUntil:iso,reminderAt:iso,updatedAt:nowIso()}));
      state.ministryNotes=state.ministryNotes.map(function(x){return x.id===id?rec:x;});
    }else if(sourceType==='bible-study'){
      rec=normalizeStudy(Object.assign({},rec,{notify:true,snoozedUntil:iso,updatedAt:nowIso()}));
      state.ministryBibleStudies=state.ministryBibleStudies.map(function(x){return x.id===id?rec:x;});
    }else if(sourceType==='revisit'){
      rec=Object.assign({},rec,{notify5Min:true,snoozedUntil:iso,updatedAt:nowIso()});
      state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===id?rec:x;});
    }
    persist();
    return global.MinistryPush.syncReminder(sourceType,id,reminderTitle(sourceType,rec),reminderBody(sourceType,rec),iso).then(function(result){
      if(!result||result.ok!==false)toast(L('Snoozed for ','Pospuesto por ')+minutes+L(' minutes.',' minutos.'));
      return result;
    });
  }
  function completeNotificationItem(sourceType,id){
    if(sourceType==='ministry-note'){
      var n=(state.ministryNotes||[]).find(function(x){return x.id===id;});if(!n)return;
      n=normalizeNote(Object.assign({},n,{completed:true,status:'done',reminder:false,snoozedUntil:'',updatedAt:nowIso()}));
      state.ministryNotes=state.ministryNotes.map(function(x){return x.id===id?n:x;});
      persist();
      if(global.MinistryPush)global.MinistryPush.clearReminder('ministry-note',id);
      renderNotes();closeDialog('orgNotificationQuick');toast(L('Marked done.','Marcado como hecho.'));
      return;
    }
    closeDialog('orgNotificationQuick');
    if(sourceType==='revisit'&&global.MinistryRevisits&&typeof global.MinistryRevisits.log==='function'){global.MinistryRevisits.log(id);return;}
    if(sourceType==='bible-study'){openStudyLog(id);}
  }
  function handleNotificationAction(sourceType,id,action){
    if(!sourceType||!id)return false;
    if(action==='snooze'){snoozeReminder(sourceType,id,15);return true;}
    if(action==='done'){completeNotificationItem(sourceType,id);return true;}
    return false;
  }
  function showNotificationQuickCard(sourceType,id){
    ensureDialogs();ensureState();
    var rec=quickRecord(sourceType,id);if(!rec){openRecord(sourceType==='ministry-note'?'note':sourceType,id);return;}
    activeStudyId=sourceType==='bible-study'?id:activeStudyId;
    activeNoteId=sourceType==='ministry-note'?id:activeNoteId;
    var isNote=sourceType==='ministry-note',isRevisit=sourceType==='revisit';
    D('orgQuickType').textContent=isNote?L('Note reminder','Recordatorio de nota'):isRevisit?L('Return Visit reminder','Recordatorio de revisita'):L('Bible Study reminder','Recordatorio de estudio bíblico');
    D('orgQuickTitle').textContent=isNote?(rec.title||L('Untitled note','Nota sin título')):(rec.name||'');
    D('orgQuickSchedule').textContent=scheduleText(rec);
    D('orgQuickPlace').textContent=isNote?'':(rec.address||rec.reference||'');
    var acts=[];
    var quickHasCoords=!isNote&&rec.lat!==null&&rec.lat!==undefined&&rec.lat!==''&&rec.lng!==null&&rec.lng!==undefined&&rec.lng!==''&&Number.isFinite(Number(rec.lat))&&Number.isFinite(Number(rec.lng));
    if(!isNote&&(rec.address||quickHasCoords))acts.push('<button class="btn btn-primary" type="button" data-org-quick-nav="'+sourceType+'" data-org-id="'+esc(id)+'"><i class="fa-solid fa-diamond-turn-right"></i>'+esc(L('Navigate','Navegar'))+'</button>');
    if(!isNote&&telUrl(rec.phone))acts.push('<a class="btn btn-primary" href="'+esc(telUrl(rec.phone))+'"><i class="fa-solid fa-phone"></i>'+esc(L('Call','Llamar'))+'</a>');
    acts.push('<button class="btn btn-secondary" type="button" data-org-quick-open="'+sourceType+'" data-org-id="'+esc(id)+'"><i class="fa-solid fa-arrow-up-right-from-square"></i>'+esc(L('Full Card','Tarjeta completa'))+'</button>');
    D('orgQuickActions').innerHTML=acts.join('');
    var doneLabel=isNote?L('Done','Hecho'):isRevisit?L('Log Visit','Registrar visita'):L('Log Study','Registrar estudio');
    D('orgQuickReminderActions').innerHTML=
      '<button class="btn btn-secondary" type="button" data-org-quick-done="'+sourceType+'" data-org-id="'+esc(id)+'"><i class="fa-solid fa-check"></i>'+esc(doneLabel)+'</button>'+
      '<button class="btn btn-secondary" type="button" data-org-quick-snooze="'+sourceType+'" data-org-id="'+esc(id)+'"><i class="fa-solid fa-clock-rotate-left"></i>'+esc(L('Snooze 15m','Posponer 15m'))+'</button>'+
      '<button class="btn btn-secondary" type="button" data-org-quick-dismiss><i class="fa-solid fa-xmark"></i>'+esc(L('Dismiss','Descartar'))+'</button>';
    showDialog('orgNotificationQuick');
  }

  function bindDialogs(){
    D('orgNoteForm').addEventListener('submit',saveNote);
    D('orgStudyForm').addEventListener('submit',saveStudy);
    D('orgStudyLogForm').addEventListener('submit',saveStudyLog);
  }
  function bindGlobal(){
    document.addEventListener('click',function(e){
      var close=e.target.closest('[data-org-close]');if(close){closeDialog(close.dataset.orgClose);return;}
      var nf=e.target.closest('[data-org-note-filter]');if(nf){noteFilter=nf.dataset.orgNoteFilter;renderNotes();return;}
      var sf=e.target.closest('[data-org-study-filter]');if(sf){studyFilter=sf.dataset.orgStudyFilter;renderStudies();return;}
      if(e.target.closest('[data-org-add-note]')){openNoteEdit('');return;}
      if(e.target.closest('[data-org-add-study]')){openStudyEdit('');return;}
      var on=e.target.closest('[data-org-open-note]');if(on){openNoteDetail(on.dataset.orgOpenNote);return;}
      var os=e.target.closest('[data-org-open-study]');if(os){openStudyDetail(os.dataset.orgOpenStudy);return;}
      var sd=e.target.closest('[data-org-study-directions]');if(sd){var s1=studyById(sd.dataset.orgStudyDirections);if(s1)openDirections(s1);return;}
      var sap=e.target.closest('[data-org-study-add-phone]');if(sap){openStudyEdit(sap.dataset.orgStudyAddPhone);setTimeout(function(){D('orgStudyPhone').focus();},80);return;}
      if(e.target.closest('[data-org-study-add-phone-detail]')){openStudyEdit(activeStudyId);setTimeout(function(){D('orgStudyPhone').focus();},80);return;}
      if(e.target.closest('[data-org-note-calendar]')){var n=(state.ministryNotes||[]).find(function(x){return x.id===activeNoteId;});if(n)calendarForNote(n);return;}
      if(e.target.closest('[data-org-note-reminder]')){setNoteReminder();return;}
      if(e.target.closest('[data-org-note-complete]')){toggleNoteComplete();return;}
      if(e.target.closest('[data-org-note-edit]')){openNoteEdit(activeNoteId);return;}
      if(e.target.closest('[data-org-note-delete]')){deleteNote();return;}
      if(e.target.closest('[data-org-study-detail-directions]')){var s=studyById(activeStudyId);if(s)openDirections(s);return;}
      if(e.target.closest('[data-org-study-log]')){openStudyLog(activeStudyId);return;}
      if(e.target.closest('[data-org-study-calendar]')){var s2=studyById(activeStudyId);if(s2)calendarForStudy(s2);return;}
      if(e.target.closest('[data-org-study-reminder]')){setStudyReminder();return;}
      if(e.target.closest('[data-org-study-edit]')){openStudyEdit(activeStudyId);return;}
      if(e.target.closest('[data-org-study-delete]')){deleteStudy();return;}
      var db=e.target.closest('[data-org-dashboard-open]');if(db){openRecord(db.dataset.orgDashboardOpen,db.dataset.orgId);return;}
      if(e.target.closest('[data-org-open-organizer]')){if(typeof global.switchScreen==='function')global.switchScreen('notes');showOnly('notes');renderNotes();return;}
      var qn=e.target.closest('[data-org-quick-nav]');if(qn){var qr=quickRecord(qn.dataset.orgQuickNav,qn.dataset.orgId);if(qr)openDirections(qr);return;}
      var qo=e.target.closest('[data-org-quick-open]');if(qo){closeDialog('orgNotificationQuick');openRecord(qo.dataset.orgQuickOpen==='ministry-note'?'note':qo.dataset.orgQuickOpen,qo.dataset.orgId);return;}
      var qdone=e.target.closest('[data-org-quick-done]');if(qdone){completeNotificationItem(qdone.dataset.orgQuickDone,qdone.dataset.orgId);return;}
      var qs=e.target.closest('[data-org-quick-snooze]');if(qs){snoozeReminder(qs.dataset.orgQuickSnooze,qs.dataset.orgId,15).finally(function(){closeDialog('orgNotificationQuick');});return;}
      if(e.target.closest('[data-org-quick-dismiss]')){closeDialog('orgNotificationQuick');return;}
      if(e.target.closest('#langToggle'))setTimeout(function(){var h=document.getElementById('orgDialogsHost');if(h)h.remove();ensureDialogs();renderNotes();renderStudies();refreshDashboard();},50);
    },true);
  }

  function routeNotification(route){
    if(!route||!route.sourceId)return;
    if(route.sourceType!=='ministry-note'&&route.sourceType!=='bible-study')return;
    setTimeout(function(){
      if(typeof global.switchScreen==='function')global.switchScreen('notes');
      if(route.sourceType==='bible-study'){showOnly('studies');renderStudies();}
      else{showOnly('notes');renderNotes();}
      if(handleNotificationAction(route.sourceType,route.sourceId,route.notificationAction||''))return;
      showNotificationQuickCard(route.sourceType,route.sourceId);
    },150);
  }

  function init(){
    if(initialized)return;initialized=true;
    ensureState();ensureDialogs();bindGlobal();renderNotes();renderStudies();showOnly('notes');refreshDashboard();
    // Existing Calendar and notification routes call this global. Replace the
    // legacy category editor with the new simple Notes card workflow.
    global.openMinistryNoteModal=function(categoryId,noteId,calDate){
      if(noteId)openNoteDetail(noteId);else openNoteEdit('',calDate||'');
    };
    if(global.KHub&&typeof global.KHub.on==='function')global.KHub.on('notification:route',routeNotification);
    setTimeout(function(){
      if(!('Notification' in global)||Notification.permission!=='granted')return;
      (state.ministryBibleStudies||[]).forEach(function(s){
        if(s.status!=='completed'&&s.notify&&s.dueDate&&s.dueTime)syncStudyPush(s);
      });
    },1200);
  }

  global.MinistryOrganizer={
    init:init,
    renderNotes:renderNotes,
    renderStudies:renderStudies,
    activateNotes:function(){showOnly('notes');renderNotes();},
    activateStudies:function(){showOnly('studies');renderStudies();},
    openNote:openNoteDetail,
    openStudy:openStudyDetail,
    refreshDashboard:refreshDashboard,
    showNotificationQuickCard:showNotificationQuickCard,
    snoozeReminder:snoozeReminder,
    handleNotificationAction:handleNotificationAction
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
  else init();
})(window);
