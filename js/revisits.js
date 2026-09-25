/**
 * revisits.js — integrated Return Visits for Ministry Tracker.
 * Keeps revisit records separate from ordinary notes while sharing Ministry
 * storage, cloud backup, language/theme, PWA and push infrastructure.
 */
(function (global) {
  'use strict';

  var mode='notes';
  var view='today';
  var listFilter='active';
  var mapMode='active';
  var currentLocation=null;
  var pendingLocation=null;
  var pendingPurpose='create';
  var pendingTypedAddress='';
  var movePinId='';
  var addressSearchResults=[];
  var map=null;
  var initialized=false;
  var activeVisitId='';
  var directionsVisitId='';
  var importChecked=false;
  var dialogClicksBound=false;
  var autoLocationRequested=false;
  var mapHasOpened=false;

  function L(en,es){return state.lang==='es'?es:en;}
  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(ch){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];
    });
  }
  function todayKey(d){
    d=d||new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function parseKey(s){var p=String(s||'').split('-').map(Number);return new Date(p[0],(p[1]||1)-1,p[2]||1);}
  function addDays(key,n){var d=parseKey(key);d.setDate(d.getDate()+n);return todayKey(d);}
  function addMonths(key,n){var d=parseKey(key),day=d.getDate();d.setDate(1);d.setMonth(d.getMonth()+n);var last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate();d.setDate(Math.min(day,last));return todayKey(d);}
  function nowIso(){return new Date().toISOString();}
  function makeId(){return 'rv-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);}
  function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);}
  function scheduleBucket(v){
    if(v.status==='completed')return 'completed';
    if(!v.dueDate)return 'undated';
    var t=todayKey();
    if(v.dueDate<t)return 'overdue';
    if(v.dueDate===t)return 'today';
    return 'upcoming';
  }
  function compareSchedule(a,b){
    var ad=a.dueDate||'9999-12-31',bd=b.dueDate||'9999-12-31';
    if(ad!==bd)return ad.localeCompare(bd);
    var at=a.dueTime||'99:99',bt=b.dueTime||'99:99';
    if(at!==bt)return at.localeCompare(bt);
    return String(b.updatedAt||'').localeCompare(String(a.updatedAt||''));
  }
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
  function placeLine(v){return [v.reference,v.address].filter(Boolean).join(' · ');}
  function digits(phone){return String(phone||'').replace(/\D+/g,'');}
  function telUrl(phone){return digits(phone).length>=7?'tel:'+String(phone).replace(/[^\d+]/g,''):'';}
  function coord(n){return String(+Number(n).toFixed(6));}
  function hasCoords(v){
    return !!v && Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lng));
  }
  function navigationTarget(v){
    if(!v)return '';
    if(hasCoords(v))return coord(v.lat)+','+coord(v.lng);
    return String(v.address||v.reference||'').trim();
  }
  function mapLink(v){
    var target=navigationTarget(v);
    return target?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(target):'';
  }
  function directionsUrl(v,app){
    app=app||state.revisitSettings.navApp||'ask';
    if(app==='auto'||app==='ask')app=isIOS()?'apple':'google';
    var target=navigationTarget(v);
    if(!target)return '';
    if(app==='waze'){
      return hasCoords(v)
        ? 'https://waze.com/ul?ll='+encodeURIComponent(target)+'&navigate=yes'
        : 'https://waze.com/ul?q='+encodeURIComponent(target)+'&navigate=yes';
    }
    if(app==='apple')return 'https://maps.apple.com/?daddr='+encodeURIComponent(target)+'&dirflg=d';
    return 'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(target)+'&travelmode=driving';
  }
  function normalizeVisit(v){
    if(!v||typeof v!=='object')return null;
    var lat=(v.lat===null||v.lat===undefined||v.lat==='')?null:Number(v.lat);
    var lng=(v.lng===null||v.lng===undefined||v.lng==='')?null:Number(v.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)){lat=null;lng=null;}
    return {
      id:String(v.id||makeId()),
      name:String(v.name||L('Return visit','Revisita')),
      reference:String(v.reference||''),
      address:String(v.address||''),
      notes:String(v.notes||''),
      phone:String(v.phone||''),
      leftWith:String(v.leftWith||''),
      nextTopic:String(v.nextTopic||''),
      calendarSlot:String(v.calendarSlot||''),
      calendarSeq:Math.max(0,Number(v.calendarSeq)||0),
      dueDate:String(v.dueDate||''),
      dueTime:/^\d{2}:\d{2}$/.test(v.dueTime||'')?v.dueTime:'',
      notify5Min:v.notify5Min!==false,
      status:v.status==='completed'?'completed':'active',
      completedAt:v.status==='completed'?(v.completedAt||null):null,
      history:Array.isArray(v.history)?v.history:[],
      lat:lat,lng:lng,
      createdAt:v.createdAt||nowIso(),
      updatedAt:v.updatedAt||nowIso()
    };
  }
  function ensureState(){
    var changed=false;
    if(!Array.isArray(state.ministryRevisits)){state.ministryRevisits=[];changed=true;}
    state.ministryRevisits=state.ministryRevisits.map(normalizeVisit).filter(Boolean);
    if(!state.revisitSettings||typeof state.revisitSettings!=='object'){
      state.revisitSettings={navApp:'auto',calendarMode:'auto',calendarOnSave:false,calendarReminderMinutes:5,pushReminderDefault:true};
      changed=true;
    }else{
      var defaults={navApp:'auto',calendarMode:'auto',calendarOnSave:false,calendarReminderMinutes:5,pushReminderDefault:true};
      Object.keys(defaults).forEach(function(k){if(state.revisitSettings[k]===undefined){state.revisitSettings[k]=defaults[k];changed=true;}});
    }
    if(!state.revisitMap||typeof state.revisitMap!=='object'){
      state.revisitMap={lat:18.7357,lng:-70.1627,zoom:8,manual:false};changed=true;
    }
    if(changed)saveState();
  }
  function persist(){saveState();}

  function root(){return document.getElementById('revisitsContent');}
  function notesRoot(){return document.getElementById('notesContent');}
  function activate(next){
    mode=next==='revisits'?'revisits':'notes';
    var n=notesRoot(),r=root();
    if(n)n.classList.toggle('hidden',mode!=='notes');
    if(r)r.classList.toggle('hidden',mode!=='revisits');
    document.querySelectorAll('[data-notes-mode]').forEach(function(b){var on=b.dataset.notesMode===mode;b.classList.toggle('is-active',on);b.setAttribute('aria-selected',on?'true':'false');});
    var noteLabel=document.getElementById('notesModeNotesLabel');
    var rvLabel=document.getElementById('notesModeRevisitsLabel');
    if(noteLabel)noteLabel.textContent=L('Notes','Notas');
    if(rvLabel)rvLabel.textContent=L('Return Visits','Revisitas');
    if(mode==='revisits'){
      render();
      autoLocateOnRevisitsOpen();
    } else if(typeof renderNotes==='function')renderNotes();
  }

  function viewTabs(){
    return '<div class="rv-view-tabs" role="tablist" aria-label="'+esc(L('Return Visit views','Vistas de revisitas'))+'">'+
      tabButton('today','fa-calendar-day',L('Today','Hoy'))+
      tabButton('map','fa-map-location-dot',L('Map','Mapa'))+
      tabButton('list','fa-address-book',L('All','Todas'))+
      '</div>';
  }
  function tabButton(name,icon,label){
    return '<button class="rv-view-tab'+(view===name?' is-active':'')+'" data-rv-view="'+name+'" type="button"><i class="fa-solid '+icon+'"></i><span>'+esc(label)+'</span></button>';
  }
  function render(){
    ensureState();
    var el=root();if(!el||mode!=='revisits')return;
    map=null;
    var body=view==='map'?renderMap():view==='list'?renderList():renderToday();
    el.innerHTML='<div class="rv-shell">'+viewTabs()+body+renderSettings()+'</div>';
    requestAnimationFrame(refreshRevisitSettingsStatus);
    if(view==='map')requestAnimationFrame(initMap);
  }
  function heading(title,subtitle,newBtn){
    return '<div class="rv-heading"><div><h2 class="text-xl font-bold">'+esc(title)+'</h2>'+(subtitle?'<div class="rv-muted">'+esc(subtitle)+'</div>':'')+'</div>'+
      (newBtn?'<button class="btn btn-primary" type="button" data-rv-new><i class="fa-solid fa-plus"></i>'+esc(L('New','Nueva'))+'</button>':'')+'</div>';
  }
  function visitStatus(v){
    var b=scheduleBucket(v);
    if(b==='overdue')return '<span class="rv-badge is-overdue">'+esc(L('Overdue','Atrasada'))+'</span>';
    if(b==='today')return '<span class="rv-badge is-today">'+esc(L('Today','Hoy'))+'</span>';
    if(b==='completed')return '<span class="rv-badge is-history">'+esc(L('History','Historial'))+'</span>';
    if(b==='undated')return '<span class="rv-badge">'+esc(L('No date','Sin fecha'))+'</span>';
    return '<span class="rv-badge">'+esc(fmtDate(v.dueDate,true))+'</span>';
  }
  function visitCard(v,compact){
    var phone=telUrl(v.phone);
    var distance=currentLocation&&hasCoords(v)&&global.MinistryRevisitMap?global.MinistryRevisitMap.formatDistance(global.MinistryRevisitMap.haversineKm(currentLocation.lat,currentLocation.lng,v.lat,v.lng)):'';
    var when=v.dueDate?[fmtDate(v.dueDate),v.dueTime?fmtTime(v.dueTime):''].filter(Boolean).join(' · '):L('No date set','Sin fecha');
    var place=placeLine(v)||L('Pinned location','Ubicación marcada');
    return '<article class="rv-card" data-rv-card="'+esc(v.id)+'">'+
      '<div class="rv-card-head"><div class="min-w-0"><div class="rv-card-title">'+esc(v.name)+'</div><div class="rv-card-meta"><span>'+esc(when)+'</span>'+(distance?'<span>'+esc(distance)+'</span>':'')+'</div></div>'+visitStatus(v)+'</div>'+
      '<button class="rv-muted rv-place-link" type="button" data-rv-directions="'+esc(v.id)+'"><i class="fa-solid fa-location-dot"></i><span>'+esc(place)+'</span></button>'+
      (!compact&&v.nextTopic?'<div class="rv-small"><strong>'+esc(L('Next topic:','Próximo tema:'))+'</strong> '+esc(v.nextTopic)+'</div>':'')+
      '<div class="rv-card-actions">'+
        '<button class="btn btn-secondary" type="button" data-rv-open="'+esc(v.id)+'"><i class="fa-solid fa-pen"></i>'+esc(L('Open','Abrir'))+'</button>'+
        (phone?'<a class="btn btn-secondary" href="'+esc(phone)+'"><i class="fa-solid fa-phone"></i>'+esc(L('Call','Llamar'))+'</a>':'')+
        '<button class="btn btn-secondary" type="button" data-rv-directions="'+esc(v.id)+'"><i class="fa-solid fa-diamond-turn-right"></i>'+esc(L('Directions','Cómo llegar'))+'</button>'+
        (v.status!=='completed'?'<button class="btn btn-primary" type="button" data-rv-log="'+esc(v.id)+'"><i class="fa-solid fa-check"></i>'+esc(L('Log visit','Registrar'))+'</button>':'')+
      '</div></article>';
  }
  function nextVisit(){
    var active=state.ministryRevisits.filter(function(v){return v.status!=='completed';});
    var today=todayKey();
    var due=active.filter(function(v){return scheduleBucket(v)==='today';}).sort(compareSchedule);
    var overdue=active.filter(function(v){return scheduleBucket(v)==='overdue';}).sort(compareSchedule);
    var upcoming=active.filter(function(v){return scheduleBucket(v)==='upcoming';}).sort(compareSchedule);
    var hm=String(new Date().getHours()).padStart(2,'0')+':'+String(new Date().getMinutes()).padStart(2,'0');
    var future=due.filter(function(v){return !v.dueTime||v.dueTime>=hm;});
    return future[0]||due[0]||overdue[0]||upcoming[0]||null;
  }
  function renderToday(){
    var t=todayKey(),weekEnd=addDays(t,7),next=nextVisit();
    var active=state.ministryRevisits.filter(function(v){return v.status!=='completed';});
    var overdue=active.filter(function(v){return scheduleBucket(v)==='overdue'&&(!next||v.id!==next.id);}).sort(compareSchedule);
    var due=active.filter(function(v){return scheduleBucket(v)==='today'&&(!next||v.id!==next.id);}).sort(compareSchedule);
    var upcoming=active.filter(function(v){return scheduleBucket(v)==='upcoming'&&v.dueDate<=weekEnd&&(!next||v.id!==next.id);}).sort(compareSchedule);
    var html=heading(L('Return Visits','Revisitas'),new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()),true);
    if(next){
      var when=next.dueDate?[fmtDate(next.dueDate),next.dueTime?fmtTime(next.dueTime):''].filter(Boolean).join(' · '):L('No date','Sin fecha');
      html+='<section class="rv-next-card"><div class="rv-kicker">'+esc(L('Next Return Visit','Próxima revisita'))+'</div><div class="rv-next-main"><div><h3>'+esc(next.name)+'</h3><div class="rv-muted">'+esc([when,placeLine(next)].filter(Boolean).join(' · '))+'</div></div><div class="rv-next-time">'+esc(next.dueTime?fmtTime(next.dueTime):fmtDate(next.dueDate,true))+'</div></div><div class="rv-card-actions"><button class="btn btn-secondary" data-rv-open="'+esc(next.id)+'">'+esc(L('Open','Abrir'))+'</button><button class="btn btn-secondary" data-rv-directions="'+esc(next.id)+'">'+esc(L('Directions','Cómo llegar'))+'</button><button class="btn btn-primary" data-rv-log="'+esc(next.id)+'">'+esc(L('Log visit','Registrar visita'))+'</button></div></section>';
    }
    if(overdue.length)html+=sectionList(L('Overdue','Atrasadas'),overdue,'overdue');
    if(due.length)html+=sectionList(L('For today','Para hoy'),due,'today');
    if(upcoming.length)html+=sectionList(L('Next 7 days','Próximos 7 días'),upcoming,'upcoming');
    if(!next&&!overdue.length&&!due.length&&!upcoming.length){
      html+='<div class="rv-empty"><div class="rv-empty-icon"><i class="fa-solid fa-check"></i></div><strong>'+esc(L('All caught up','Todo al día'))+'</strong><div class="rv-muted">'+esc(L('No return visits are due right now.','No tienes revisitas pendientes ahora mismo.'))+'</div><button class="btn btn-secondary mt-3" data-rv-map-active>'+esc(L('View active map','Ver mapa de activas'))+'</button></div>';
    }
    return html;
  }
  function sectionList(title,items){
    return '<section class="rv-section"><div class="rv-section-head"><h3>'+esc(title)+'</h3><span class="rv-badge">'+items.length+'</span></div><div class="rv-agenda">'+items.map(function(v){return visitCard(v,true);}).join('')+'</div></section>';
  }

  function renderList(){
    var html=heading(L('All Return Visits','Todas las revisitas'),state.ministryRevisits.length+' '+L('saved','guardadas'),true);
    html+='<input id="rvSearch" class="rv-search" type="search" autocomplete="off" placeholder="'+esc(L('Search name, address or note','Buscar nombre, dirección o nota'))+'">';
    html+='<div class="rv-filter-row">'+
      filterChip('active',L('Active','Activas'))+
      filterChip('undated',L('No date','Sin fecha'))+
      filterChip('completed',L('History','Historial'))+
      filterChip('all',L('All','Todas'))+'</div>';
    var q='';
    var search=document.getElementById('rvSearch');
    if(search)q=search.value.trim().toLowerCase();
    var visits=state.ministryRevisits.filter(function(v){
      if(listFilter==='active'&&v.status==='completed')return false;
      if(listFilter==='undated'&&(v.status==='completed'||v.dueDate))return false;
      if(listFilter==='completed'&&v.status!=='completed')return false;
      if(q){
        var hay=[v.name,v.address,v.reference,v.notes,v.nextTopic,v.leftWith].join(' ').toLowerCase();
        if(hay.indexOf(q)<0)return false;
      }
      return true;
    }).sort(compareSchedule);
    html+='<div class="rv-list" id="rvList">'+(visits.length?visits.map(function(v){return visitCard(v,false);}).join(''):'<div class="rv-empty">'+esc(L('No Return Visits match this filter.','No hay revisitas con este filtro.'))+'</div>')+'</div>';
    return html;
  }
  function filterChip(id,label){return '<button class="rv-chip'+(listFilter===id?' is-active':'')+'" type="button" data-rv-filter="'+id+'">'+esc(label)+'</button>';}

  function mapVisits(){
    var arr=state.ministryRevisits.filter(hasCoords);
    if(mapMode==='today')arr=arr.filter(function(v){var b=scheduleBucket(v);return v.status==='active'&&(b==='today'||b==='overdue');});
    else if(mapMode==='active')arr=arr.filter(function(v){return v.status==='active';});
    else if(mapMode==='nearby')arr=currentLocation?arr.filter(function(v){return v.status==='active'&&global.MinistryRevisitMap.haversineKm(currentLocation.lat,currentLocation.lng,v.lat,v.lng)<=5;}):[];
    return arr.map(function(v){var x=Object.assign({},v);x.isOverdue=scheduleBucket(v)==='overdue';return x;});
  }
  function mapChip(id,label){return '<button class="rv-chip'+(mapMode===id?' is-active':'')+'" type="button" data-rv-map-mode="'+id+'">'+esc(label)+'</button>';}
  function renderMap(){
    var html=heading(L('Return Visit map','Mapa de revisitas'),L('Tap the map to place or move a pin.','Toca el mapa para colocar o mover un pin.'),true);
    html+='<div class="rv-filter-row">'+mapChip('today',L('Today','Hoy'))+mapChip('active',L('Active','Activas'))+mapChip('all',L('All','Todas'))+mapChip('nearby',L('Nearby','Cerca'))+'</div>';
    html+='<div class="rv-map-toolbar"><span class="rv-muted">'+esc(L('Pins can be adjusted before you save them.','Puedes ajustar los pines antes de guardarlos.'))+'</span><button class="btn btn-secondary" type="button" data-rv-save-zone><i class="fa-solid fa-download"></i>'+esc(L('Save area offline','Guardar zona'))+'</button></div>';
    html+='<div class="rv-map-shell" id="rvMapShell"><div class="rv-map" id="rvMap" role="application" aria-label="'+esc(L('Map of return visits','Mapa de revisitas'))+'"></div>'+
      '<div class="rv-map-controls"><button class="rv-map-control" data-rv-zoom="1" aria-label="'+esc(L('Zoom in','Acercar'))+'">+</button><button class="rv-map-control" data-rv-zoom="-1" aria-label="'+esc(L('Zoom out','Alejar'))+'">−</button></div>'+
      '<button class="btn btn-secondary rv-locate" type="button" data-rv-locate><i class="fa-solid fa-location-crosshairs"></i>'+esc(L('Use my location','Usar mi ubicación'))+'</button>'+
      '<div class="rv-map-attribution">© OpenStreetMap contributors</div>'+
      '<div id="rvLocationConfirm" class="rv-location-confirm" '+(pendingLocation?'':'hidden')+'>'+
        '<strong>'+esc(L('Is this the right location?','¿Es esta la ubicación correcta?'))+'</strong>'+
        '<div id="rvPendingAddress" class="rv-muted">'+esc(pendingLocation?(pendingLocation.address||L('Approximate location','Ubicación aproximada')):'')+'</div>'+
        '<div id="rvPendingAccuracy" class="rv-small">'+(pendingLocation&&Number.isFinite(pendingLocation.accuracy)?esc(L('GPS accuracy: ','Precisión GPS: ')+Math.round(pendingLocation.accuracy)+' m'):'')+'</div>'+
        '<div id="rvPendingCoords" class="rv-small font-mono">'+(pendingLocation?esc(coord(pendingLocation.lat)+', '+coord(pendingLocation.lng)):'')+'</div>'+
        '<div class="rv-card-actions"><button class="btn btn-secondary" data-rv-cancel-pin>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-secondary" data-rv-adjust-pin>'+esc(L('Adjust location','Ajustar ubicación'))+'</button><button class="btn btn-primary" data-rv-confirm-pin>'+esc(L('Confirm pin','Confirmar ubicación'))+'</button></div>'+
      '</div></div>';
    var vis=mapVisits();
    html+='<div class="rv-map-list" id="rvMapList">'+(vis.length?vis.map(function(v){return visitCard(v,true);}).join(''):'<div class="rv-empty">'+esc(L('No Return Visits to show on this map.','No hay revisitas para mostrar en este mapa.'))+'</div>')+'</div>';
    return html;
  }
  function initMap(){
    var el=document.getElementById('rvMap');
    if(!el||!global.MinistryRevisitMap)return;
    map=new global.MinistryRevisitMap.SimpleMap(el,state.revisitMap);
    map.onViewChange=function(p){state.revisitMap={lat:p.lat,lng:p.lng,zoom:p.zoom,manual:true};persist();};
    map.onTap=function(ll){
      pendingLocation={lat:ll.lat,lng:ll.lng,address:pendingTypedAddress||'',accuracy:null};
      pendingPurpose=movePinId?'move':'create';
      map.setDraft(ll.lat,ll.lng);
      refreshConfirmPanel();
      reverseGeocode(ll.lat,ll.lng).then(function(address){
        if(pendingLocation){
          pendingLocation.address=pendingTypedAddress||address||pendingLocation.address||'';
          refreshConfirmPanel();
        }
      });
    };
    map.onMarkerTap=function(id){openEditor(id);};
    var vis=mapVisits();
    map.setMarkers(vis);
    if(currentLocation)map.setUserLocation(currentLocation.lat,currentLocation.lng);
    if(pendingLocation){
      map.setDraft(pendingLocation.lat,pendingLocation.lng);
      map.setView(pendingLocation.lat,pendingLocation.lng,Math.max(map.zoom,17));
    } else if(currentLocation&&!mapHasOpened){
      map.setView(currentLocation.lat,currentLocation.lng,17);
    } else if(!currentLocation&&!state.revisitMap.manual&&vis.length){
      map.fitPoints(vis,15);
    }
    mapHasOpened=true;
  }
  function refreshConfirmPanel(){
    var panel=document.getElementById('rvLocationConfirm');if(!panel)return;
    panel.hidden=!pendingLocation;
    var a=document.getElementById('rvPendingAddress'),acc=document.getElementById('rvPendingAccuracy'),c=document.getElementById('rvPendingCoords');
    if(a)a.textContent=pendingLocation?(pendingLocation.address||L('Looking up approximate address…','Buscando dirección aproximada…')):'';
    if(acc)acc.textContent=pendingLocation&&Number.isFinite(pendingLocation.accuracy)?L('GPS accuracy: ','Precisión GPS: ')+Math.round(pendingLocation.accuracy)+' m':'';
    if(c)c.textContent=pendingLocation?coord(pendingLocation.lat)+', '+coord(pendingLocation.lng):'';
  }
  function locationErrorMessage(e){
    if(e&&e.code===1){
      return L(
        'Location permission is blocked. Allow location for Ministry in your browser or phone settings, then tap Use my location again.',
        'El permiso de ubicación está bloqueado. Permite la ubicación para Ministry en el navegador o en los ajustes del teléfono y vuelve a tocar Usar mi ubicación.'
      );
    }
    if(e&&e.code===3)return L('Location request timed out. Try again.','La solicitud de ubicación tardó demasiado. Inténtalo de nuevo.');
    return L('Could not get your location. You can still place the pin manually.','No se pudo obtener tu ubicación. Aún puedes colocar el pin manualmente.');
  }
  function setCurrentLocationFromPosition(p){
    currentLocation={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy};
    if(map)map.setUserLocation(currentLocation.lat,currentLocation.lng);
    return currentLocation;
  }
  function autoLocateOnRevisitsOpen(){
    if(autoLocationRequested||!navigator.geolocation)return;
    autoLocationRequested=true;
    navigator.geolocation.getCurrentPosition(function(p){
      var loc=setCurrentLocationFromPosition(p);
      if(mode==='revisits'){
        if(view==='map'&&map&&!pendingLocation)map.setView(loc.lat,loc.lng,17);
        else render();
      }
    },function(e){
      if(e&&e.code===1)toast(locationErrorMessage(e));
    },{enableHighAccuracy:true,timeout:12000,maximumAge:60000});
  }
  function requestLocation(onDone,options){
    options=options||{};
    if(!navigator.geolocation){toast(L('GPS is not supported on this device.','GPS no está disponible en este dispositivo.'));return;}
    toast(L('Finding your location…','Buscando tu ubicación…'));
    navigator.geolocation.getCurrentPosition(function(p){
      var loc=setCurrentLocationFromPosition(p);
      if(options.center!==false&&map)map.setView(loc.lat,loc.lng,17);
      if(onDone)onDone(loc);
    },function(e){
      toast(locationErrorMessage(e));
    },{enableHighAccuracy:true,timeout:12000,maximumAge:30000});
  }
  function beginGpsPin(loc,purpose){
    pendingPurpose=purpose||'create';
    pendingTypedAddress='';
    pendingLocation={lat:loc.lat,lng:loc.lng,address:'',accuracy:Number.isFinite(loc.accuracy)?loc.accuracy:null};
    view='map';
    render();
    reverseGeocode(loc.lat,loc.lng).then(function(address){
      if(!pendingLocation)return;
      pendingLocation.address=address||'';
      refreshConfirmPanel();
    });
  }
  function compactAddress(result){
    var a=result&&result.address;
    if(!a)return String(result&&result.display_name||'').split(',').slice(0,5).join(',').trim();
    var road=a.road||a.pedestrian||a.footway||a.path||'';
    var street=[a.house_number||'',road].filter(Boolean).join(' ');
    var area=a.neighbourhood||a.suburb||a.quarter||a.hamlet||a.village||'';
    var city=a.city||a.town||a.municipality||a.county||'';
    var stateName=a.state||a.region||'';
    var postal=a.postcode||'';
    return [street,area,city,stateName,postal].filter(function(x,i,arr){return x&&arr.indexOf(x)===i;}).join(', ');
  }
  function zoneTileUrls(bounds,zooms,max){
    max=max||200;var urls=[];
    function tile(lat,lng,z){
      var n=Math.pow(2,z);
      var x=Math.floor((lng+180)/360*n);
      var latRad=Math.max(-85.05112878,Math.min(85.05112878,lat))*Math.PI/180;
      var y=Math.floor((1-Math.asinh(Math.tan(latRad))/Math.PI)/2*n);
      return {x:x,y:y,n:n};
    }
    zooms.forEach(function(z){
      if(urls.length>=max)return;
      var nw=tile(bounds.north,bounds.west,z),se=tile(bounds.south,bounds.east,z);
      for(var x=nw.x;x<=se.x&&urls.length<max;x++){
        for(var y=nw.y;y<=se.y&&urls.length<max;y++){
          if(y<0||y>=nw.n)continue;
          var wrapped=((x%nw.n)+nw.n)%nw.n;
          urls.push('https://tile.openstreetmap.org/'+z+'/'+wrapped+'/'+y+'.png');
        }
      }
    });
    return urls;
  }
  function saveOfflineZone(){
    if(!map||!map.el){toast(L('Open the map first.','Abre el mapa primero.'));return;}
    if(!navigator.onLine||!('caches' in global)){toast(L('Connect to the internet to save a map area.','Conéctate a internet para guardar una zona.'));return;}
    var w=map.el.clientWidth,h=map.el.clientHeight;
    if(!w||!h)return;
    var nw=map.screenToLatLng(0,0),se=map.screenToLatLng(w,h);
    var base=Math.max(14,Math.min(map.zoom,17));
    var urls=zoneTileUrls({north:nw.lat,west:nw.lng,south:se.lat,east:se.lng},[base,base+1,base+2].filter(function(z){return z<=18;}),200);
    if(!urls.length){toast(L('Zoom in closer before saving the map area.','Acerca más el mapa antes de guardar la zona.'));return;}
    toast(L('Saving map area for offline use…','Guardando zona para usar sin conexión…'));
    caches.open('ministry-revisit-zones-v1').then(function(cache){
      var done=0,failed=0,queue=urls.slice();
      function worker(){
        if(!queue.length)return Promise.resolve();
        var url=queue.shift();
        return cache.match(url).then(function(hit){
          if(hit)return null;
          return fetch(url,{mode:'cors'}).then(function(r){if(r.ok)return cache.put(url,r);failed++;}).catch(function(){failed++;});
        }).then(function(){done++;return worker();});
      }
      return Promise.all([worker(),worker()]).then(function(){
        toast(failed?L('Most of the map area was saved; some tiles could not be cached.','Se guardó la mayor parte de la zona; algunos mosaicos no se pudieron guardar.'):L('Map area saved for offline use.','Zona guardada para usar sin conexión.'));
      });
    }).catch(function(){toast(L('Could not save the map area.','No se pudo guardar la zona.'));});
  }

  function reverseGeocode(lat,lng){
    if(!navigator.onLine)return Promise.resolve('');
    var q=new URLSearchParams({format:'jsonv2',addressdetails:'1',lat:String(lat),lon:String(lng),zoom:'18','accept-language':state.lang==='es'?'es':'en'});
    return fetch('https://nominatim.openstreetmap.org/reverse?'+q.toString(),{headers:{Accept:'application/json'}})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(compactAddress).catch(function(){return '';});
  }
  function savedAddressSuggestions(){
    var seen=new Set(),out=[];
    state.ministryRevisits.forEach(function(v){
      var a=String(v.address||'').trim();
      if(!a||seen.has(a.toLowerCase()))return;
      seen.add(a.toLowerCase());
      out.push(a);
    });
    return out.slice(0,20);
  }
  function populateAddressDatalist(){
    var list=dialog('rvAddressDatalist');if(!list)return;
    list.innerHTML=savedAddressSuggestions().map(function(a){return '<option value="'+esc(a)+'"></option>';}).join('');
  }
  function addressSearchLabel(row,query){
    if(!row)return String(query||'');
    var full=String(row.display_name||'').trim();
    var compact=compactAddress(row);
    return compact||full||String(query||'');
  }
  function forwardGeocode(query){
    query=String(query||'').trim();
    if(!query)return Promise.resolve([]);
    var exact=state.ministryRevisits.find(function(v){return String(v.address||'').trim().toLowerCase()===query.toLowerCase();});
    if(exact){
      return Promise.resolve([{lat:exact.lat,lng:exact.lng,address:exact.address,fullAddress:exact.address,accuracy:null,source:'saved'}]);
    }
    if(!navigator.onLine){
      toast(L('Address search needs an internet connection.','La búsqueda de direcciones necesita conexión a internet.'));
      return Promise.resolve([]);
    }
    var args={format:'jsonv2',addressdetails:'1',limit:'5',q:query,'accept-language':state.lang==='es'?'es':'en'};
    if(currentLocation){
      var span=.75;
      args.viewbox=[currentLocation.lng-span,currentLocation.lat+span,currentLocation.lng+span,currentLocation.lat-span].join(',');
      args.bounded='0';
    }
    var q=new URLSearchParams(args);
    return fetch('https://nominatim.openstreetmap.org/search?'+q.toString(),{headers:{Accept:'application/json'}})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(function(rows){
        return (rows||[]).map(function(row){
          var lat=Number(row.lat),lng=Number(row.lon);
          if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
          var label=addressSearchLabel(row,query);
          var full=String(row.display_name||label);
          return {lat:lat,lng:lng,address:label,fullAddress:full,accuracy:null};
        }).filter(Boolean);
      }).catch(function(){return [];});
  }
  function renderAddressResults(results,query){
    addressSearchResults=Array.isArray(results)?results:[];
    var box=dialog('rvAddressResults');if(!box)return;
    if(!addressSearchResults.length){
      box.innerHTML='<div class="rv-address-empty">'+esc(L('No exact match found. You can still place this address on the map.','No se encontró una coincidencia exacta. Aún puedes colocar esta dirección en el mapa.'))+'</div>';
      return;
    }
    box.innerHTML='<div class="rv-address-results-title">'+esc(L('Choose the correct address','Elige la dirección correcta'))+'</div>'+
      addressSearchResults.map(function(loc,i){
        return '<button class="rv-address-result" type="button" data-rv-address-result="'+i+'"><i class="fa-solid fa-location-dot"></i><span><strong>'+esc(loc.address||query)+'</strong><small>'+esc(loc.fullAddress||'')+'</small></span></button>';
      }).join('');
  }
  function useAddressResult(index){
    var loc=addressSearchResults[Number(index)];if(!loc)return;
    pendingTypedAddress=loc.address||loc.fullAddress||'';
    pendingLocation={lat:loc.lat,lng:loc.lng,address:pendingTypedAddress,accuracy:null};
    pendingPurpose=movePinId?'move':'create';
    view='map';
    closeDialog('rvAddressDialog');
    render();
    toast(L('Verify the pin, then confirm the location.','Verifica la ubicación y luego confírmala.'));
  }
  function useTypedAddressOnMap(){
    var input=dialog('rvAddressSearch');
    var query=input?input.value.trim():'';
    if(!query)return;
    pendingTypedAddress=query;
    pendingLocation=null;
    pendingPurpose=movePinId?'move':'create';
    view='map';
    closeDialog('rvAddressDialog');
    render();
    requestAnimationFrame(function(){
      if(map&&currentLocation)map.setView(currentLocation.lat,currentLocation.lng,17);
    });
    toast(L('Tap the correct spot on the map, then confirm the pin.','Toca el lugar correcto en el mapa y luego confirma la ubicación.'));
  }
  function continueWithTypedAddress(){
    var input=dialog('rvAddressSearch');
    var query=input?input.value.trim():'';
    if(!query)return;
    pendingTypedAddress=query;
    pendingLocation=null;
    closeDialog('rvAddressDialog');
    openEditor(null,{lat:null,lng:null,address:query},{addressOnly:true});
  }
  function searchAddressToMap(query){
    query=String(query||'').trim();
    if(!query)return Promise.resolve([]);
    toast(L('Finding address…','Buscando dirección…'));
    return forwardGeocode(query).then(function(results){
      if(results.length){
        useAddressResult(0);
        return results;
      }
      pendingTypedAddress=query;
      pendingLocation=null;
      pendingPurpose=movePinId?'move':'create';
      view='map';
      closeDialog('rvAddressDialog');
      render();
      requestAnimationFrame(function(){if(map&&currentLocation)map.setView(currentLocation.lat,currentLocation.lng,17);});
      toast(L('Address not found automatically. Tap the correct spot on the map.','No se encontró la dirección automáticamente. Toca el lugar correcto en el mapa.'));
      return results;
    });
  }

  function renderSettings(){
    var s=state.revisitSettings;
    var standaloneCount=standaloneVisits().length;
    return '<details class="rv-settings"><summary>'+esc(L('Return Visit settings','Configuración de revisitas'))+'</summary><div class="rv-settings-content">'+
      '<div class="rv-cloud-note"><i class="fa-solid fa-cloud"></i> '+esc(L('Return Visits use Ministry’s language, theme, cloud backup and app installation. No separate account is needed.','Las revisitas usan el idioma, tema, copia en la nube e instalación de Ministry. No necesitas otra cuenta.'))+'</div>'+
      '<section class="rv-settings-group"><strong>'+esc(L('Reminders & calendar','Recordatorios y calendario'))+'</strong>'+
        '<label class="rv-check"><input type="checkbox" data-rv-setting="calendarOnSave" '+(s.calendarOnSave?'checked':'')+'><span><strong>'+esc(L('Add to calendar after saving','Añadir al calendario al guardar'))+'</strong><br><span class="rv-muted">'+esc(L('You can also add any Return Visit manually from its card.','También puedes añadir cualquier revisita manualmente desde su tarjeta.'))+'</span></span></label>'+
        '<label class="rv-field"><span>'+esc(L('Calendar app','Calendario'))+'</span><select data-rv-setting="calendarMode"><option value="auto" '+(s.calendarMode==='auto'?'selected':'')+'>'+esc(L('Automatic','Automático'))+'</option><option value="ics" '+(s.calendarMode==='ics'?'selected':'')+'>ICS '+esc(L('(alarm included)','(incluye alarma)'))+'</option><option value="google" '+(s.calendarMode==='google'?'selected':'')+'>Google Calendar</option></select></label>'+
        '<label class="rv-field"><span>'+esc(L('Calendar alarm','Alarma del calendario'))+'</span><select data-rv-setting="calendarReminderMinutes">'+[0,5,15,30,60,120].map(function(n){var label=n===0?L('At time','A la hora'):n===60?'1 h':n===120?'2 h':n+' min';return '<option value="'+n+'" '+(Number(s.calendarReminderMinutes)===n?'selected':'')+'>'+label+'</option>';}).join('')+'</select></label>'+
        '<label class="rv-check"><input type="checkbox" data-rv-setting="pushReminderDefault" '+(s.pushReminderDefault?'checked':'')+'><span><strong>'+esc(L('5-minute app reminder by default','Aviso de 5 minutos por defecto'))+'</strong><br><span class="rv-muted">'+esc(L('A Return Visit must have both a date and time.','La revisita debe tener fecha y hora.'))+'</span></span></label>'+
        '<div class="rv-settings-buttons"><button class="btn btn-secondary" type="button" data-rv-enable-push><i class="fa-solid fa-bell"></i>'+esc(L('Enable notifications','Activar avisos'))+'</button><button class="btn btn-secondary" type="button" data-rv-test-push><i class="fa-solid fa-paper-plane"></i>'+esc(L('Test notification','Probar aviso'))+'</button></div><div id="rvPushStatus" class="rv-muted" role="status"></div>'+
      '</section>'+
      '<section class="rv-settings-group"><strong>'+esc(L('Navigation','Navegación'))+'</strong><label class="rv-field"><span>'+esc(L('Open Directions with','Abrir “Cómo llegar” con'))+'</span><select data-rv-setting="navApp"><option value="ask" '+(s.navApp==='ask'||s.navApp==='auto'?'selected':'')+'>'+esc(L('Ask every time','Preguntar siempre'))+'</option><option value="google" '+(s.navApp==='google'?'selected':'')+'>Google Maps</option><option value="apple" '+(s.navApp==='apple'?'selected':'')+'>Apple Maps</option><option value="waze" '+(s.navApp==='waze'?'selected':'')+'>Waze</option></select></label></section>'+
      '<section class="rv-settings-group"><strong>'+esc(L('Import & backup','Importar y copia'))+'</strong>'+
        (standaloneCount?'<button class="btn btn-secondary w-full" type="button" data-rv-import><i class="fa-solid fa-file-import"></i>'+esc(L('Import '+standaloneCount+' Return Visits from Revisita','Importar '+standaloneCount+' revisitas desde Revisita'))+'</button>':'')+
        '<button class="btn btn-secondary w-full" type="button" data-rv-import-file><i class="fa-solid fa-file-arrow-up"></i>'+esc(L('Import a Revisita backup file','Importar una copia de Revisita'))+'</button><input id="rvImportFile" type="file" accept="application/json,.json" hidden>'+
        '<button class="btn btn-secondary w-full" type="button" data-rv-export><i class="fa-solid fa-file-arrow-down"></i>'+esc(L('Export Return Visits','Exportar revisitas'))+'</button>'+
      '</section>'+
      '<section class="rv-settings-group"><strong>'+esc(L('Privacy & data','Privacidad y datos'))+'</strong><div class="rv-muted">'+esc(L('Return Visit names, notes and locations stay in Ministry storage and are included in your Ministry cloud backup. Map/address lookup uses OpenStreetMap services when online.','Los nombres, notas y ubicaciones de las revisitas se guardan en Ministry y se incluyen en la copia en la nube de Ministry. El mapa y la búsqueda de direcciones usan servicios de OpenStreetMap cuando hay conexión.'))+'</div><button class="btn btn-secondary rv-danger w-full" type="button" data-rv-delete-all><i class="fa-solid fa-trash"></i>'+esc(L('Delete all Return Visits','Borrar todas las revisitas'))+'</button></section>'+
      '</div></details>';
  }
  function refreshRevisitSettingsStatus(){
    var status=document.getElementById('rvPushStatus');if(!status)return;
    if(!global.MinistryPush||typeof global.MinistryPush.diagnose!=='function'){
      status.textContent=L('Notifications are not available in this build.','Los avisos no están disponibles en esta versión.');
      return;
    }
    global.MinistryPush.diagnose().then(function(d){
      if(!document.getElementById('rvPushStatus'))return;
      var text=d.permission==='granted'?L('Notifications are allowed on this device.','Los avisos están permitidos en este dispositivo.'):
        d.permission==='denied'?L('Notifications are blocked in device/browser settings.','Los avisos están bloqueados en los ajustes del dispositivo o navegador.'):
        L('Notifications have not been enabled yet.','Los avisos todavía no se han activado.');
      if(d.environmentBlock)text=d.environmentBlock;
      document.getElementById('rvPushStatus').textContent=text;
    }).catch(function(){status.textContent='';});
  }
  function enableRevisitPush(){
    if(!global.MinistryPush||typeof global.MinistryPush.subscribe!=='function'){toast(L('Notifications are not available.','Los avisos no están disponibles.'));return;}
    var status=document.getElementById('rvPushStatus');if(status)status.textContent=L('Setting up notifications…','Configurando avisos…');
    global.MinistryPush.subscribe().then(function(){
      toast(L('Notifications enabled.','Avisos activados.'));
      refreshRevisitSettingsStatus();
    }).catch(function(err){
      toast((err&&err.message)||L('Could not enable notifications.','No se pudieron activar los avisos.'));
      refreshRevisitSettingsStatus();
    });
  }
  function testRevisitPush(){
    if(!global.MinistryPush||typeof global.MinistryPush.sendTestPush!=='function'){toast(L('Notifications are not available.','Los avisos no están disponibles.'));return;}
    var status=document.getElementById('rvPushStatus');if(status)status.textContent=L('Sending test…','Enviando prueba…');
    global.MinistryPush.sendTestPush().then(function(result){
      toast(result&&result.ok===false?L('The test notification could not be sent.','No se pudo enviar el aviso de prueba.'):L('Test notification sent.','Aviso de prueba enviado.'));
      refreshRevisitSettingsStatus();
    });
  }
  function deleteAllRevisits(){
    var count=state.ministryRevisits.length;
    if(!count){toast(L('There are no Return Visits to delete.','No hay revisitas para borrar.'));return;}
    if(!confirm(L('Delete all '+count+' saved Return Visits? This cannot be undone.','¿Borrar las '+count+' revisitas guardadas? Esta acción no se puede deshacer.')))return;
    var ids=state.ministryRevisits.map(function(v){return v.id;});
    state.ministryRevisits=[];persist();render();
    ids.forEach(clearPush);
    toast(L('All Return Visits deleted.','Se borraron todas las revisitas.'));
  }
  function exportRevisitBackup(){
    var s=state.revisitSettings||{};
    var payload={app:'Revisita',schemaVersion:3,exportedAt:nowIso(),visits:state.ministryRevisits,settings:{navApp:s.navApp||'ask',calendarOnSave:s.calendarOnSave===true,calendarMode:s.calendarMode||'auto',reminderMinutes:Number(s.calendarReminderMinutes)||5}};
    var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='return-visits-'+todayKey()+'.json';document.body.append(a);a.click();a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},30000);
    toast(L('Return Visits exported.','Revisitas exportadas.'));
  }
  function applyImportedRevisita(payload){
    if(!payload||payload.app!=='Revisita'||!Array.isArray(payload.visits))throw new Error(L('This is not a valid Revisita backup.','Esta no es una copia válida de Revisita.'));
    var incoming=payload.visits.map(normalizeVisit).filter(Boolean);
    var by=new Map(state.ministryRevisits.map(function(v){return [v.id,v];}));
    incoming.forEach(function(v){
      var prev=by.get(v.id);
      if(!prev||String(v.updatedAt||'')>=String(prev.updatedAt||''))by.set(v.id,v);
    });
    state.ministryRevisits=Array.from(by.values());
    var s=payload.settings||{};
    if(['ask','google','apple','waze'].indexOf(s.navApp)>=0)state.revisitSettings.navApp=s.navApp;
    if(typeof s.calendarOnSave==='boolean')state.revisitSettings.calendarOnSave=s.calendarOnSave;
    if(['auto','ics','google'].indexOf(s.calendarMode)>=0)state.revisitSettings.calendarMode=s.calendarMode;
    if(Number.isFinite(Number(s.reminderMinutes)))state.revisitSettings.calendarReminderMinutes=Math.max(0,Math.min(120,Number(s.reminderMinutes)));
    persist();render();
    toast(L('Imported '+incoming.length+' Return Visits and compatible settings.','Se importaron '+incoming.length+' revisitas y la configuración compatible.'));
  }
  function importRevisitBackupFile(file){
    if(!file)return;
    var reader=new FileReader();
    reader.onload=function(){
      try{applyImportedRevisita(JSON.parse(String(reader.result||'')));}
      catch(err){toast((err&&err.message)||L('Could not import the backup.','No se pudo importar la copia.'));}
    };
    reader.readAsText(file);
  }

  function ensureDialogs(){
    if(document.getElementById('rvVisitDialog'))return;
    var wrap=document.createElement('div');
    wrap.id='rvDialogsHost';
    wrap.innerHTML=
      '<dialog id="rvNewDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('New Return Visit','Nueva revisita'))+'</h2><div class="rv-muted">'+esc(L('How do you want to locate the person?','¿Cómo quieres ubicar a la persona?'))+'</div></div><button class="rv-icon-btn" data-rv-close-new>×</button></div><div class="rv-list">'+
        '<button class="rv-choice-btn is-primary" type="button" data-rv-new-here><i class="fa-solid fa-location-crosshairs"></i><span><strong>'+esc(L('Here — use my location','Aquí — usar mi ubicación'))+'</strong><small>'+esc(L('Use GPS while you are at the house.','Usa el GPS cuando estés frente a la casa.'))+'</small></span></button>'+
        '<button class="rv-choice-btn" type="button" data-rv-new-address><i class="fa-solid fa-location-dot"></i><span><strong>'+esc(L('Enter an address','Escribir una dirección'))+'</strong><small>'+esc(L('Search the address and verify the pin.','Busca la dirección y verifica el pin.'))+'</small></span></button>'+
        '<button class="rv-choice-btn" type="button" data-rv-new-map><i class="fa-solid fa-map-pin"></i><span><strong>'+esc(L('Choose on the map','Elegir en el mapa'))+'</strong><small>'+esc(L('Drop the pin exactly where you want it.','Coloca el pin exactamente donde quieras.'))+'</small></span></button>'+
      '</div></div></dialog>'+
      '<dialog id="rvAddressDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Enter an address','Escribir una dirección'))+'</h2><div class="rv-muted">'+esc(L('You can continue with the address alone, or use the map to verify or place a pin.','Puedes continuar solo con la dirección o usar el mapa para verificarla o colocar un pin.'))+'</div></div><button class="rv-icon-btn" data-rv-close-address>×</button></div>'+
        '<form id="rvAddressForm" class="rv-form"><label class="rv-field"><span>'+esc(L('Address','Dirección'))+'</span><input id="rvAddressSearch" type="text" maxlength="220" list="rvAddressDatalist" autocomplete="street-address" autocapitalize="words" spellcheck="false" required placeholder="'+esc(L('Street, city, state or area','Calle, ciudad, estado o sector'))+'"><datalist id="rvAddressDatalist"></datalist></label>'+
        '<div class="rv-address-actions"><button class="btn btn-primary" type="submit"><i class="fa-solid fa-arrow-right"></i>'+esc(L('Continue','Continuar'))+'</button><button class="btn btn-secondary" type="button" data-rv-address-map-search><i class="fa-solid fa-map-pin"></i>'+esc(L('Find on map','Buscar en el mapa'))+'</button></div>'+
        '<div id="rvAddressResults" class="rv-address-results"></div></form></div></dialog>'+
      '<dialog id="rvVisitDialog" class="rv-dialog rv-visit-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2 id="rvVisitDialogTitle">'+esc(L('Return Visit','Revisita'))+'</h2><div id="rvVisitCoords" class="rv-muted font-mono"></div></div><button class="rv-icon-btn" data-rv-close-visit>×</button></div>'+
        '<section id="rvVisitView" class="rv-visit-view" hidden>'+
          '<button id="rvViewPlace" class="rv-view-place" type="button" data-rv-view-directions><i class="fa-solid fa-location-dot"></i><span></span></button>'+
          '<div id="rvViewSchedule" class="rv-view-schedule"></div>'+
          '<div class="rv-view-primary-actions"><button class="btn btn-primary" type="button" data-rv-view-directions><i class="fa-solid fa-diamond-turn-right"></i>'+esc(L('Directions','Cómo llegar'))+'</button><button id="rvViewLogBtn" class="btn btn-primary" type="button" data-rv-view-log><i class="fa-solid fa-check"></i>'+esc(L('Log visit','Registrar visita'))+'</button></div>'+
          '<div id="rvViewContact" class="rv-view-contact" hidden><a id="rvViewCall" class="btn btn-secondary" href="#"><i class="fa-solid fa-phone"></i>'+esc(L('Call','Llamar'))+'</a><a id="rvViewWhatsapp" class="btn btn-secondary" href="#" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>WhatsApp</a></div>'+
          '<dl id="rvViewDetails" class="rv-view-details"></dl>'+
          '<div id="rvViewHistory" class="rv-history" hidden></div>'+
          '<div class="rv-view-secondary-actions"><button class="btn btn-secondary" type="button" data-rv-view-calendar><i class="fa-solid fa-calendar-plus"></i>'+esc(L('Calendar','Calendario'))+'</button><button id="rvViewReminderBtn" class="btn btn-secondary" type="button" data-rv-view-reminder><i class="fa-solid fa-bell"></i><span>'+esc(L('Set reminder','Poner aviso'))+'</span></button><button class="btn btn-secondary" type="button" data-rv-view-share><i class="fa-solid fa-share-nodes"></i>'+esc(L('Share','Compartir'))+'</button><button class="btn btn-secondary" type="button" data-rv-view-map><i class="fa-solid fa-map-location-dot"></i>'+esc(L('View on map','Ver en mapa'))+'</button><button class="btn btn-secondary" type="button" data-rv-view-edit><i class="fa-solid fa-pen"></i>'+esc(L('Edit','Editar'))+'</button></div>'+
        '</section>'+
        '<form id="rvVisitForm" class="rv-form"><input type="hidden" id="rvVisitId"><input type="hidden" id="rvVisitLat"><input type="hidden" id="rvVisitLng">'+
          '<label class="rv-field"><span>'+esc(L('Name','Nombre'))+' *</span><input id="rvVisitName" maxlength="120" required autocomplete="off" placeholder="'+esc(L('Example: Smith family, Maria','Ej.: Familia Pérez, doña Carmen'))+'"></label>'+
          '<label class="rv-field"><span>'+esc(L('Reference / how to find the house','Referencia / cómo encontrar la casa'))+'</span><textarea id="rvVisitReference" maxlength="300" rows="2" placeholder="'+esc(L('Example: green house across from the store','Ej.: casa verde frente al colmado'))+'"></textarea></label>'+
          '<fieldset class="rv-schedule-box"><legend>'+esc(L('When will you return?','¿Cuándo vuelves?'))+'</legend><div class="rv-quick-dates"><button class="rv-chip" type="button" data-rv-date-preset="7">+1 '+esc(L('week','semana'))+'</button><button class="rv-chip" type="button" data-rv-date-preset="14">+2 '+esc(L('weeks','semanas'))+'</button><button class="rv-chip" type="button" data-rv-date-preset="month">+1 '+esc(L('month','mes'))+'</button></div><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Return date','Volver el'))+'</span><input id="rvVisitDueDate" type="date"></label><label class="rv-field"><span>'+esc(L('Return time','Hora de volver'))+'</span><input id="rvVisitDueTime" type="time" step="60"></label></div><label class="rv-check"><input id="rvVisitNotify" type="checkbox"><span><strong>'+esc(L('App reminder 5 minutes before','Aviso en la app 5 minutos antes'))+'</strong><br><span class="rv-muted">'+esc(L('The phone may ask for notification permission.','El teléfono puede pedir permiso para las notificaciones.'))+'</span></span></label></fieldset>'+
          '<details id="rvMoreDetails" class="rv-more-details"><summary>'+esc(L('More details (optional)','Más detalles (opcional)'))+'</summary><div class="rv-more-details-body">'+
            '<label class="rv-field"><span>'+esc(L('Phone / WhatsApp','Teléfono / WhatsApp'))+'</span><input id="rvVisitPhone" type="tel" maxlength="40" autocomplete="tel"></label>'+
            '<label class="rv-field"><span>'+esc(L('Address','Dirección'))+'</span><div class="rv-field-row"><input id="rvVisitAddress" maxlength="220" autocomplete="street-address" style="flex:1"><button id="rvFindAddressBtn" class="btn btn-secondary" type="button" data-rv-find-address><i class="fa-solid fa-location-dot"></i>'+esc(L('Map','Mapa'))+'</button></div></label>'+
            '<label class="rv-field"><span>'+esc(L('Notes','Notas'))+'</span><textarea id="rvVisitNotes" maxlength="1200" rows="4" placeholder="'+esc(L('What you discussed, what to remember, best time…','Qué hablaron, qué recordar, mejor horario…'))+'"></textarea></label>'+
            '<label class="rv-field"><span>'+esc(L('What you left','Qué le dejaste'))+'</span><input id="rvVisitLeftWith" maxlength="160"></label>'+
            '<label class="rv-field"><span>'+esc(L('Next topic','Tema para la próxima vez'))+'</span><input id="rvVisitNextTopic" maxlength="200"></label>'+
          '</div></details>'+
          '<div class="rv-dialog-actions"><button id="rvMovePinBtn" class="btn btn-secondary" type="button" data-rv-form-move hidden><i class="fa-solid fa-location-dot"></i>'+esc(L('Move pin','Mover pin'))+'</button><button id="rvDeleteBtn" class="btn btn-secondary rv-danger" type="button" hidden><i class="fa-solid fa-trash"></i>'+esc(L('Delete','Eliminar'))+'</button><button class="btn btn-secondary" type="button" data-rv-cancel-edit>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit"><i class="fa-solid fa-check"></i>'+esc(L('Save','Guardar'))+'</button></div>'+
        '</form></div></dialog>'+
      '<dialog id="rvLogDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Log visit','Registrar visita'))+'</h2><div id="rvLogName" class="rv-muted"></div></div><button class="rv-icon-btn" data-rv-close-log>×</button></div><form id="rvLogForm" class="rv-form"><label class="rv-field"><span>'+esc(L('What happened?','¿Qué pasó?'))+'</span><textarea id="rvLogNote" maxlength="600"></textarea></label><label class="rv-field"><span>'+esc(L('What you left','Qué le dejaste'))+'</span><input id="rvLogLeftWith" maxlength="160"></label><label class="rv-field"><span>'+esc(L('Next topic','Tema para la próxima vez'))+'</span><input id="rvLogNextTopic" maxlength="200"></label><div class="rv-quick-dates"><button class="rv-chip" type="button" data-rv-log-preset="7">+1 '+esc(L('week','semana'))+'</button><button class="rv-chip" type="button" data-rv-log-preset="14">+2 '+esc(L('weeks','semanas'))+'</button><button class="rv-chip" type="button" data-rv-log-preset="month">+1 '+esc(L('month','mes'))+'</button></div><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Return date','Volver el'))+'</span><input id="rvLogDueDate" type="date"></label><label class="rv-field"><span>'+esc(L('Return time','Hora'))+'</span><input id="rvLogDueTime" type="time" step="60"></label></div><label class="rv-check"><input id="rvLogEnd" type="checkbox"><span>'+esc(L('Do not return — move to history','No volver — pasar al historial'))+'</span></label><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-rv-close-log>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit">'+esc(L('Save visit','Guardar visita'))+'</button></div></form></div></dialog>'+
      '<dialog id="rvDirectionsDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Start navigation','Iniciar navegación'))+'</h2><div id="rvDirectionsName" class="rv-muted"></div></div><button class="rv-icon-btn" data-rv-close-directions>×</button></div><div class="rv-list"><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="google"><i class="fa-brands fa-google"></i>Google Maps</button><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="apple"><i class="fa-brands fa-apple"></i>Apple Maps</button><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="waze"><i class="fa-solid fa-diamond-turn-right"></i>Waze</button><label class="rv-check"><input id="rvRememberNav" type="checkbox"><span>'+esc(L('Remember my choice','Recordar mi elección'))+'</span></label></div></div></dialog>';
    document.body.appendChild(wrap);
    bindDialogs();
  }
  function dialog(id){return document.getElementById(id);}
  function showDialog(id){var d=dialog(id);if(d&&!d.open)d.showModal();}
  function closeDialog(id){var d=dialog(id);if(d&&d.open)d.close();}

  function whatsappUrl(phone){
    var d=digits(phone);return d.length>=7?'https://wa.me/'+d:'';
  }
  function visitScheduleText(v){
    if(!v||!v.dueDate)return L('No return date','Sin fecha para volver');
    return [fmtDate(v.dueDate),v.dueTime?fmtTime(v.dueTime):''].filter(Boolean).join(' · ');
  }
  function historyHtml(v){
    var h=v&&Array.isArray(v.history)?v.history.slice().reverse():[];
    if(!h.length)return '';
    return '<strong>'+esc(L('Visit history','Historial de visitas'))+'</strong>'+h.map(function(x){
      var d=x.completedAt?new Date(x.completedAt):null;
      var stamp=d&&!isNaN(d)?new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):'';
      return '<div class="rv-history-item"><strong>'+esc(stamp)+'</strong>'+(x.note?'<div>'+esc(x.note)+'</div>':'')+(x.leftWith?'<div class="rv-muted">'+esc(L('Left: ','Dejó: ')+x.leftWith)+'</div>':'')+'</div>';
    }).join('');
  }
  function renderVisitView(v){
    var place=placeLine(v)||L('Pinned location','Ubicación marcada');
    var placeEl=dialog('rvViewPlace');if(placeEl){placeEl.querySelector('span').textContent=place;}
    var schedule=dialog('rvViewSchedule');if(schedule){
      schedule.textContent=v.status==='completed'?L('In history','En historial'):visitScheduleText(v);
      schedule.className='rv-view-schedule'+(scheduleBucket(v)==='overdue'?' is-overdue':'')+(v.status==='completed'?' is-history':'');
    }
    var rows=[
      [L('Notes','Notas'),v.notes],
      [L('What you left','Qué le dejaste'),v.leftWith],
      [L('Next topic','Próximo tema'),v.nextTopic],
      [L('Phone','Teléfono'),v.phone]
    ].filter(function(row){return row[1];});
    var details=dialog('rvViewDetails');if(details){
      details.innerHTML=rows.map(function(row){return '<dt>'+esc(row[0])+'</dt><dd>'+esc(row[1])+'</dd>';}).join('');
      details.hidden=!rows.length;
    }
    var tel=telUrl(v.phone),wa=whatsappUrl(v.phone),contact=dialog('rvViewContact');
    if(contact)contact.hidden=!(tel||wa);
    var call=dialog('rvViewCall');if(call){call.hidden=!tel;if(tel)call.href=tel;}
    var whatsapp=dialog('rvViewWhatsapp');if(whatsapp){whatsapp.hidden=!wa;if(wa)whatsapp.href=wa;}
    var hist=dialog('rvViewHistory');if(hist){hist.innerHTML=historyHtml(v);hist.hidden=!hist.innerHTML;}
    var log=dialog('rvViewLogBtn');if(log)log.hidden=v.status==='completed';
    var reminder=dialog('rvViewReminderBtn');
    if(reminder){
      var label=reminder.querySelector('span');
      if(label)label.textContent=(v.notify5Min&&v.dueDate&&v.dueTime)?L('Reminder on · 5 min','Aviso activo · 5 min'):L('Set reminder','Poner aviso');
    }
  }
  function setVisitDialogMode(mode,v){
    var viewing=mode==='view';
    var viewEl=dialog('rvVisitView'),form=dialog('rvVisitForm');
    if(viewEl)viewEl.hidden=!viewing;
    if(form)form.hidden=viewing;
    var coords=dialog('rvVisitCoords');if(coords)coords.hidden=viewing;
    var del=dialog('rvDeleteBtn');if(del)del.hidden=mode!=='edit';
    var move=dialog('rvMovePinBtn');if(move)move.hidden=mode!=='edit';
    if(v&&viewing)renderVisitView(v);
  }
  function openNewChooser(){
    ensureDialogs();
    populateAddressDatalist();
    showDialog('rvNewDialog');
  }
  function openEditor(id,coords,options){
    options=options||{};
    ensureDialogs();
    var v=id?state.ministryRevisits.find(function(x){return x.id===id;}):null;
    var p=v||coords;if(!p)return;
    activeVisitId=v?v.id:'';
    dialog('rvVisitId').value=v?v.id:'';
    dialog('rvVisitLat').value=hasCoords(p)?p.lat:'';
    dialog('rvVisitLng').value=hasCoords(p)?p.lng:'';
    dialog('rvVisitName').value=v?v.name:'';
    dialog('rvVisitPhone').value=v?v.phone:'';
    dialog('rvVisitReference').value=v?v.reference:'';
    dialog('rvVisitAddress').value=v?v.address:(coords&&coords.address)||'';
    dialog('rvVisitNotes').value=v?v.notes:'';
    dialog('rvVisitLeftWith').value=v?v.leftWith:'';
    dialog('rvVisitNextTopic').value=v?v.nextTopic:'';
    dialog('rvVisitDueDate').value=v?v.dueDate:'';
    dialog('rvVisitDueTime').value=v?v.dueTime:'';
    dialog('rvVisitNotify').checked=v?v.notify5Min!==false:state.revisitSettings.pushReminderDefault!==false;
    dialog('rvVisitDialogTitle').textContent=v?v.name:L('New Return Visit','Nueva revisita');
    dialog('rvVisitCoords').textContent=hasCoords(p)?coord(p.lat)+', '+coord(p.lng):L('Address saved — map pin optional','Dirección guardada — el pin del mapa es opcional');
    var more=dialog('rvMoreDetails');if(more)more.open=Boolean(v&&(v.phone||v.address||v.notes||v.leftWith||v.nextTopic));
    var findAddressBtn=dialog('rvFindAddressBtn');if(findAddressBtn)findAddressBtn.hidden=!v;
    var mode=!v?'new':options.edit?'edit':'view';
    setVisitDialogMode(mode,v);
    showDialog('rvVisitDialog');
    if(mode==='new')setTimeout(function(){dialog('rvVisitName').focus();},80);
  }
  function bindDialogs(){
    if(!dialogClicksBound){
      dialogClicksBound=true;
      document.addEventListener('click',function(e){
        if(e.target.closest('[data-rv-close-new]'))closeDialog('rvNewDialog');
        if(e.target.closest('[data-rv-close-visit]'))closeDialog('rvVisitDialog');
        if(e.target.closest('[data-rv-close-log]'))closeDialog('rvLogDialog');
        if(e.target.closest('[data-rv-close-address]'))closeDialog('rvAddressDialog');
        if(e.target.closest('[data-rv-close-directions]'))closeDialog('rvDirectionsDialog');

        if(e.target.closest('[data-rv-new-here]')){
          closeDialog('rvNewDialog');movePinId='';pendingTypedAddress='';
          requestLocation(function(loc){beginGpsPin(loc,'create');},{center:false});
        }
        if(e.target.closest('[data-rv-new-map]')){
          closeDialog('rvNewDialog');view='map';movePinId='';pendingPurpose='create';pendingTypedAddress='';pendingLocation=null;
          render();toast(L('Tap the map, then confirm the pin.','Toca el mapa y confirma la ubicación.'));
        }
        if(e.target.closest('[data-rv-new-address]')){
          closeDialog('rvNewDialog');movePinId='';pendingTypedAddress='';addressSearchResults=[];
          populateAddressDatalist();
          dialog('rvAddressSearch').value='';
          dialog('rvAddressResults').innerHTML='';
          showDialog('rvAddressDialog');
          setTimeout(function(){dialog('rvAddressSearch').focus();},60);
        }
        if(e.target.closest('[data-rv-find-address]')){
          var av=findActive();if(!av)return;
          movePinId=av.id;addressSearchResults=[];
          populateAddressDatalist();
          dialog('rvAddressSearch').value=dialog('rvVisitAddress').value.trim()||av.address||'';
          dialog('rvAddressResults').innerHTML='';
          closeDialog('rvVisitDialog');showDialog('rvAddressDialog');
          setTimeout(function(){dialog('rvAddressSearch').focus();},60);
        }
        var ar=e.target.closest('[data-rv-address-result]');
        if(ar){useAddressResult(ar.dataset.rvAddressResult);return;}
        if(e.target.closest('[data-rv-address-map-search]')){
          var mq=dialog('rvAddressSearch').value.trim();if(!mq)return;
          searchAddressToMap(mq);return;
        }

        var preset=e.target.closest('[data-rv-date-preset]');
        if(preset){
          var val=preset.dataset.rvDatePreset;
          dialog('rvVisitDueDate').value=val==='month'?addMonths(todayKey(),1):addDays(todayKey(),Number(val));
        }
        var lp=e.target.closest('[data-rv-log-preset]');
        if(lp){
          var lv=lp.dataset.rvLogPreset;
          dialog('rvLogDueDate').value=lv==='month'?addMonths(todayKey(),1):addDays(todayKey(),Number(lv));
        }

        if(e.target.closest('[data-rv-view-directions]')){var vd=findActive();if(vd)openDirections(vd);}
        if(e.target.closest('[data-rv-view-log]')){var vl=findActive();if(vl){closeDialog('rvVisitDialog');openLog(vl.id);}}
        if(e.target.closest('[data-rv-view-calendar]')){var vc=findActive();if(vc)addToCalendar(vc);}
        if(e.target.closest('[data-rv-view-reminder]')){var vr=findActive();if(vr)setReminderForVisit(vr);}
        if(e.target.closest('[data-rv-view-share]')){var vs=findActive();if(vs)shareVisit(vs);}
        if(e.target.closest('[data-rv-view-map]')){var vm=findActive();if(vm)showVisitOnMap(vm);}
        if(e.target.closest('[data-rv-view-edit]')){var ve=findActive();if(ve)openEditor(ve.id,null,{edit:true});}

        if(e.target.closest('[data-rv-form-move]')){
          var mv=findActive();if(!mv)return;
          movePinId=mv.id;pendingPurpose='move';pendingTypedAddress=mv.address||'';
          pendingLocation={lat:mv.lat,lng:mv.lng,address:mv.address||'',accuracy:null};
          closeDialog('rvVisitDialog');view='map';render();
          toast(L('Tap another spot to move the pin, or confirm this location.','Toca otro lugar para mover el pin o confirma esta ubicación.'));
        }
        if(e.target.closest('[data-rv-cancel-edit]')){
          var cv=findActive();
          if(cv)openEditor(cv.id);else closeDialog('rvVisitDialog');
        }

        var nav=e.target.closest('[data-rv-nav-app]');
        if(nav){
          var nv=state.ministryRevisits.find(function(x){return x.id===directionsVisitId;});
          var app=nav.dataset.rvNavApp;
          if(dialog('rvRememberNav')&&dialog('rvRememberNav').checked){state.revisitSettings.navApp=app;persist();}
          closeDialog('rvDirectionsDialog');
          if(nv)global.open(directionsUrl(nv,app),'_blank','noopener');
        }
      });
    }
    dialog('rvVisitForm').addEventListener('submit',saveVisit);
    dialog('rvDeleteBtn').addEventListener('click',deleteActive);
    dialog('rvLogForm').addEventListener('submit',saveLog);
    dialog('rvAddressForm').addEventListener('submit',function(e){
      e.preventDefault();
      continueWithTypedAddress();
    });
  }
  function findActive(){return state.ministryRevisits.find(function(v){return v.id===activeVisitId;});}
  function showVisitOnMap(v){
    if(!v)return;
    closeDialog('rvVisitDialog');
    view='map';mapMode=v.status==='completed'?'all':'active';
    state.revisitMap={lat:v.lat,lng:v.lng,zoom:17,manual:true};
    persist();render();
    requestAnimationFrame(function(){if(map)map.setView(v.lat,v.lng,17);});
  }
  function shareVisit(v){
    if(!v)return;
    var url=mapLink(v);
    var text=[v.name,placeLine(v),v.dueDate?visitScheduleText(v):'',url].filter(Boolean).join('\n');
    if(navigator.share){
      navigator.share({title:L('Return Visit: ','Revisita: ')+v.name,text:text}).catch(function(err){
        if(err&&err.name!=='AbortError')toast(L('Could not share this Return Visit.','No se pudo compartir esta revisita.'));
      });
      return;
    }
    if(navigator.clipboard&&navigator.clipboard.writeText){
      navigator.clipboard.writeText(text).then(function(){toast(L('Return Visit copied.','Revisita copiada.'));}).catch(function(){toast(L('Could not copy the Return Visit.','No se pudo copiar la revisita.'));});
    }
  }
  function setReminderForVisit(v){
    if(!v)return;
    if(!v.dueDate||!v.dueTime){
      toast(L('Set a return date and time first.','Primero fija una fecha y hora para volver.'));
      openEditor(v.id,null,{edit:true});
      return;
    }
    var next=Object.assign({},v,{notify5Min:true,updatedAt:nowIso()});
    state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===v.id?next:x;});
    persist();renderVisitView(next);
    Promise.resolve(syncPush(next)).then(function(result){
      if(!result||result.ok!==false)toast(L('Reminder set for 5 minutes before.','Aviso programado 5 minutos antes.'));
    });
  }

  function saveVisit(e){
    e.preventDefault();
    var id=dialog('rvVisitId').value;
    var prev=id?state.ministryRevisits.find(function(v){return v.id===id;}):null;
    var due=dialog('rvVisitDueDate').value||'',time=due?(dialog('rvVisitDueTime').value||''):'';
    var v=normalizeVisit({
      id:id||makeId(),
      name:dialog('rvVisitName').value.trim()||L('Return visit','Revisita'),
      phone:dialog('rvVisitPhone').value.trim(),
      reference:dialog('rvVisitReference').value.trim(),
      address:dialog('rvVisitAddress').value.trim(),
      notes:dialog('rvVisitNotes').value.trim(),
      leftWith:dialog('rvVisitLeftWith').value.trim(),
      nextTopic:dialog('rvVisitNextTopic').value.trim(),
      dueDate:due,dueTime:time,
      notify5Min:dialog('rvVisitNotify').checked,
      calendarSlot:prev?prev.calendarSlot:'',
      calendarSeq:prev?prev.calendarSeq:0,
      status:prev?prev.status:'active',
      completedAt:prev?prev.completedAt:null,
      history:prev?prev.history:[],
      lat:Number(dialog('rvVisitLat').value),lng:Number(dialog('rvVisitLng').value),
      createdAt:prev?prev.createdAt:nowIso(),updatedAt:nowIso()
    });
    if(!v)return;
    if(prev)state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===id?v:x;});
    else state.ministryRevisits.push(v);
    persist();closeDialog('rvVisitDialog');render();
    syncPush(v);
    var newSlot=calendarSlot(v);
    if(prev&&prev.calendarSlot&&prev.calendarSlot!==newSlot)toast(L('The old phone calendar event may still need to be removed.','Quizás tengas que borrar manualmente el evento anterior del calendario.'));
    if(state.revisitSettings.calendarOnSave&&v.dueDate)addToCalendar(v);
    else toast(L('Return Visit saved.','Revisita guardada.'));
  }
  function deleteActive(){
    var v=findActive();if(!v)return;
    if(!confirm(L('Delete this Return Visit?','¿Eliminar esta revisita?')))return;
    state.ministryRevisits=state.ministryRevisits.filter(function(x){return x.id!==v.id;});
    persist();clearPush(v.id);closeDialog('rvVisitDialog');render();
    if(v.calendarSlot)toast(L('Deleted here. Remove its phone calendar event separately if needed.','Eliminada aquí. Borra por separado el evento del calendario si es necesario.'));
    else toast(L('Return Visit deleted.','Revisita eliminada.'));
  }
  function openLog(id){
    ensureDialogs();var v=state.ministryRevisits.find(function(x){return x.id===id;});if(!v)return;
    activeVisitId=id;
    dialog('rvLogName').textContent=v.name;
    dialog('rvLogNote').value='';
    dialog('rvLogLeftWith').value='';
    dialog('rvLogNextTopic').value=v.nextTopic||'';
    dialog('rvLogDueDate').value='';
    dialog('rvLogDueTime').value=v.dueTime||'';
    dialog('rvLogEnd').checked=false;
    showDialog('rvLogDialog');
  }
  function saveLog(e){
    e.preventDefault();var v=findActive();if(!v)return;
    var ended=dialog('rvLogEnd').checked;
    var entry={completedAt:nowIso(),dueDate:v.dueDate||'',dueTime:v.dueTime||'',note:dialog('rvLogNote').value.trim(),leftWith:dialog('rvLogLeftWith').value.trim(),ended:ended};
    var next=Object.assign({},v,{
      history:(v.history||[]).concat([entry]),
      leftWith:entry.leftWith||v.leftWith,
      nextTopic:dialog('rvLogNextTopic').value.trim(),
      updatedAt:nowIso()
    });
    if(ended){next.status='completed';next.completedAt=entry.completedAt;next.dueDate='';next.dueTime='';}
    else{next.status='active';next.completedAt=null;next.dueDate=dialog('rvLogDueDate').value||'';next.dueTime=next.dueDate?(dialog('rvLogDueTime').value||''):'';}
    state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===v.id?next:x;});
    persist();closeDialog('rvLogDialog');render();syncPush(next);
    if(state.revisitSettings.calendarOnSave&&next.dueDate)addToCalendar(next);
    toast(ended?L('Moved to history.','Pasó al historial.'):L('Visit logged.','Visita registrada.'));
  }

  function clearPush(id){
    if(global.MinistryPush&&typeof global.MinistryPush.clearReminder==='function'){
      global.MinistryPush.clearReminder('revisit',id).catch(function(){});
    }
  }
  function syncPush(v){
    if(!global.MinistryPush||typeof global.MinistryPush.syncReminder!=='function')return Promise.resolve({ok:false,skipped:'unavailable'});
    if(v.status==='completed'||!v.notify5Min||!v.dueDate||!v.dueTime){return Promise.resolve(clearPush(v.id)).then(function(){return {ok:true,skipped:'not-needed'};});}
    var at=new Date(v.dueDate+'T'+v.dueTime+':00');
    if(isNaN(at.getTime()))return Promise.resolve({ok:false,skipped:'invalid-time'});
    var fire=new Date(at.getTime()-5*60000);
    if(fire.getTime()<=Date.now()+30000){
      clearPush(v.id);
      toast(L('This visit is too soon for a 5-minute app reminder.','Esta visita está demasiado cerca para un aviso de 5 minutos.'));
      return Promise.resolve({ok:false,skipped:'too-soon'});
    }
    var body=[fmtDate(v.dueDate),fmtTime(v.dueTime),placeLine(v)].filter(Boolean).join(' · ');
    return global.MinistryPush.syncReminder('revisit',v.id,L('Return Visit: ','Revisita: ')+v.name,body,fire.toISOString()).then(function(result){
      if(result&&result.ok===false)toast(L('Return Visit saved, but the app reminder could not be scheduled.','Revisita guardada, pero no se pudo programar el aviso.'));
      return result||{ok:true};
    }).catch(function(){
      toast(L('Return Visit saved, but the app reminder could not be scheduled.','Revisita guardada, pero no se pudo programar el aviso.'));
      return {ok:false};
    });
  }

  function calendarSlot(v){return v&&v.dueDate?(v.dueTime?v.dueDate+' '+v.dueTime:v.dueDate):'';}
  function icsEscape(s){return String(s||'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');}
  function localStamp(key,time){return key.replace(/-/g,'')+'T'+time.replace(':','')+'00';}
  function endStamp(key,time,mins){
    var p=time.split(':').map(Number),d=parseKey(key);d.setHours(p[0],p[1]+mins,0,0);
    return todayKey(d).replace(/-/g,'')+'T'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+'00';
  }
  function buildICS(v){
    var reminder=Math.max(0,Number(state.revisitSettings.calendarReminderMinutes)||0);
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KHub//Ministry Return Visits//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:ministry-revisit-'+v.id+'@khub','SEQUENCE:'+Math.max(0,Number(v.calendarSeq)||0),'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')];
    if(v.dueTime)lines.push('DTSTART:'+localStamp(v.dueDate,v.dueTime),'DTEND:'+endStamp(v.dueDate,v.dueTime,30));
    else lines.push('DTSTART;VALUE=DATE:'+v.dueDate.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(v.dueDate,1).replace(/-/g,''));
    var description=[v.nextTopic?L('Next topic: ','Próximo tema: ')+v.nextTopic:'',v.leftWith?L('Left: ','Dejó: ')+v.leftWith:'',v.phone?L('Phone: ','Teléfono: ')+v.phone:'',mapLink(v)].filter(Boolean).join('\n');
    lines.push('SUMMARY:'+icsEscape(L('Return Visit: ','Revisita: ')+v.name),'LOCATION:'+icsEscape(placeLine(v)||coord(v.lat)+', '+coord(v.lng)),'GEO:'+coord(v.lat)+';'+coord(v.lng),'DESCRIPTION:'+icsEscape(description),'URL:'+mapLink(v),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape(L('Return Visit: ','Revisita: ')+v.name),v.dueTime?'TRIGGER:-PT'+reminder+'M':'TRIGGER:PT8H','END:VALARM','END:VEVENT','END:VCALENDAR');
    return lines.join('\r\n')+'\r\n';
  }
  function googleCalendarUrl(v){
    var dates=v.dueTime?localStamp(v.dueDate,v.dueTime)+'/'+endStamp(v.dueDate,v.dueTime,30):v.dueDate.replace(/-/g,'')+'/'+addDays(v.dueDate,1).replace(/-/g,'');
    var details=[v.nextTopic?L('Next topic: ','Próximo tema: ')+v.nextTopic:'',v.leftWith?L('Left: ','Dejó: ')+v.leftWith:'',mapLink(v)].filter(Boolean).join('\n');
    var q=new URLSearchParams({action:'TEMPLATE',text:L('Return Visit: ','Revisita: ')+v.name,dates:dates,details:details,location:placeLine(v)||coord(v.lat)+','+coord(v.lng)});
    return 'https://calendar.google.com/calendar/render?'+q.toString();
  }
  function addToCalendar(v){
    if(!v||!v.dueDate){toast(L('Set a date first.','Primero fija una fecha.'));return;}
    var mode=state.revisitSettings.calendarMode||'auto';if(mode==='auto')mode=isIOS()?'ics':'google';
    try{
      if(mode==='google')global.open(googleCalendarUrl(v),'_blank','noopener');
      else{
        var blob=new Blob([buildICS(v)],{type:'text/calendar;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download='revisit-'+String(v.name||'visit').replace(/[^\wÀ-ſ-]+/g,'-').slice(0,40)+'.ics';document.body.append(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},60000);
      }
      var slot=calendarSlot(v);
      state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===v.id?Object.assign({},x,{calendarSlot:slot,calendarSeq:(Number(x.calendarSeq)||0)+1}):x;});
      persist();toast(L('Calendar opened.','Calendario abierto.'));
    }catch(e){console.warn('[MinistryRevisits] calendar handoff failed',e);toast(L('Could not open the calendar.','No se pudo abrir el calendario.'));}
  }
  function openDirections(v){
    if(!v)return;
    var app=state.revisitSettings.navApp||'ask';
    if(app&&app!=='ask'&&app!=='auto'){global.open(directionsUrl(v,app),'_blank','noopener');return;}
    ensureDialogs();
    directionsVisitId=v.id;
    var name=dialog('rvDirectionsName');if(name)name.textContent=[v.name,placeLine(v)].filter(Boolean).join(' · ');
    var remember=dialog('rvRememberNav');if(remember)remember.checked=false;
    var apple=dialog('rvDirectionsDialog')&&dialog('rvDirectionsDialog').querySelector('[data-rv-nav-app="apple"]');
    if(apple)apple.hidden=!isIOS()&&/Android/i.test(navigator.userAgent);
    showDialog('rvDirectionsDialog');
  }

  function standalonePayload(){
    try{
      var raw=localStorage.getItem('revisita.state.v1');if(!raw)return null;
      var parsed=JSON.parse(raw);if(!parsed||!Array.isArray(parsed.visits))return null;
      return {app:'Revisita',schemaVersion:parsed.version||3,visits:parsed.visits,settings:parsed.settings||{}};
    }catch(e){return null;}
  }
  function standaloneVisits(){
    if(importChecked&&standaloneVisits.cache)return standaloneVisits.cache;
    var payload=standalonePayload();
    var arr=payload?payload.visits.map(normalizeVisit).filter(Boolean):[];
    standaloneVisits.cache=arr;importChecked=true;return arr;
  }
  function importStandalone(){
    var payload=standalonePayload();if(!payload||!payload.visits.length)return;
    if(!confirm(L('Import Return Visits and compatible settings from Revisita? Matching IDs will keep the newest edit.','¿Importar las revisitas y la configuración compatible desde Revisita? Los ID iguales conservarán la edición más reciente.')))return;
    applyImportedRevisita(payload);
  }

  function bindRoot(){
    var el=root();if(!el||el.dataset.rvBound)return;el.dataset.rvBound='1';
    el.addEventListener('click',function(e){
      var b=e.target.closest('[data-rv-view]');if(b){view=b.dataset.rvView;render();return;}
      if(e.target.closest('[data-rv-new]')){openNewChooser();return;}
      if(e.target.closest('[data-rv-map-active]')){view='map';mapMode='active';render();return;}
      var open=e.target.closest('[data-rv-open]');if(open){openEditor(open.dataset.rvOpen);return;}
      var log=e.target.closest('[data-rv-log]');if(log){openLog(log.dataset.rvLog);return;}
      var dir=e.target.closest('[data-rv-directions]');if(dir){var v=state.ministryRevisits.find(function(x){return x.id===dir.dataset.rvDirections;});if(v)openDirections(v);return;}
      var f=e.target.closest('[data-rv-filter]');if(f){listFilter=f.dataset.rvFilter;render();return;}
      var mm=e.target.closest('[data-rv-map-mode]');if(mm){mapMode=mm.dataset.rvMapMode;if(mapMode==='nearby'&&!currentLocation){requestLocation(function(){render();},{center:false});}else render();return;}
      var z=e.target.closest('[data-rv-zoom]');if(z&&map){map.setZoom(map.zoom+Number(z.dataset.rvZoom));return;}
      if(e.target.closest('[data-rv-save-zone]')){saveOfflineZone();return;}
      if(e.target.closest('[data-rv-locate]')){requestLocation(function(loc){beginGpsPin(loc,movePinId?'move':'create');},{center:false});return;}
      if(e.target.closest('[data-rv-adjust-pin]')){
        if(pendingLocation&&map){map.setView(pendingLocation.lat,pendingLocation.lng,19);toast(L('Tap another spot to move the pin.','Toca otro lugar para mover el pin.'));}
        return;
      }
      if(e.target.closest('[data-rv-cancel-pin]')){
        var cancelledMove=movePinId;
        pendingLocation=null;pendingTypedAddress='';movePinId='';
        if(map)map.setDraft(null,null);
        refreshConfirmPanel();
        if(cancelledMove)openEditor(cancelledMove,null,{edit:true});
        return;
      }
      if(e.target.closest('[data-rv-confirm-pin]')){
        if(!pendingLocation)return;
        var p=Object.assign({},pendingLocation),move=movePinId;
        pendingLocation=null;pendingTypedAddress='';movePinId='';
        if(move){
          var old=state.ministryRevisits.find(function(x){return x.id===move;});
          if(old){
            var moved=Object.assign({},old,{lat:p.lat,lng:p.lng,address:p.address||old.address,updatedAt:nowIso()});
            state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===move?moved:x;});
            persist();render();openEditor(move,null,{edit:true});toast(L('Pin moved.','Ubicación actualizada.'));
          }
        }else{
          render();openEditor(null,p);
        }
        return;
      }
      if(e.target.closest('[data-rv-enable-push]')){enableRevisitPush();return;}
      if(e.target.closest('[data-rv-test-push]')){testRevisitPush();return;}
      if(e.target.closest('[data-rv-import]')){importStandalone();return;}
      if(e.target.closest('[data-rv-import-file]')){var fileInput=document.getElementById('rvImportFile');if(fileInput)fileInput.click();return;}
      if(e.target.closest('[data-rv-export]')){exportRevisitBackup();return;}
      if(e.target.closest('[data-rv-delete-all]')){deleteAllRevisits();return;}
    });
    el.addEventListener('input',function(e){
      if(e.target.id==='rvSearch'){
        var q=e.target.value.trim().toLowerCase();
        var box=document.getElementById('rvList');if(!box)return;
        var visits=state.ministryRevisits.filter(function(v){
          if(listFilter==='active'&&v.status==='completed')return false;
          if(listFilter==='undated'&&(v.status==='completed'||v.dueDate))return false;
          if(listFilter==='completed'&&v.status!=='completed')return false;
          if(listFilter==='all'){}
          var hay=[v.name,v.address,v.reference,v.notes,v.nextTopic,v.leftWith].join(' ').toLowerCase();
          return !q||hay.indexOf(q)>=0;
        }).sort(compareSchedule);
        box.innerHTML=visits.length?visits.map(function(v){return visitCard(v,false);}).join(''):'<div class="rv-empty">'+esc(L('No Return Visits match this search.','No hay revisitas que coincidan.'))+'</div>';
      }
    });
    el.addEventListener('change',function(e){
      if(e.target.id==='rvImportFile'){
        var file=e.target.files&&e.target.files[0];if(file)importRevisitBackupFile(file);
        e.target.value='';return;
      }
      var key=e.target.dataset.rvSetting;if(!key)return;
      if(e.target.type==='checkbox')state.revisitSettings[key]=e.target.checked;
      else if(key==='calendarReminderMinutes')state.revisitSettings[key]=Number(e.target.value);
      else state.revisitSettings[key]=e.target.value;
      persist();
    });
  }

  function init(){
    if(initialized)return;initialized=true;ensureState();bindRoot();
    document.querySelectorAll('[data-notes-mode]').forEach(function(b){b.addEventListener('click',function(){activate(b.dataset.notesMode);});});
    document.addEventListener('click',function(e){
      if(e.target.closest('#langToggle'))setTimeout(function(){var host=document.getElementById('rvDialogsHost');if(host)host.remove();if(mode==='revisits')render();activate(mode);},30);
      var nav=e.target.closest('.nav-btn[data-screen="notes"]');if(nav)setTimeout(function(){activate(mode);},30);
    },true);
    activate('notes');
  }

  function routeNotification(route){
    if(!route||route.sourceType!=='revisit')return;
    setTimeout(function(){
      if(typeof global.switchScreen==='function')global.switchScreen('notes');
      activate('revisits');
      if(route.sourceId)openEditor(route.sourceId);
    },120);
  }
  if(global.KHub&&typeof global.KHub.on==='function')global.KHub.on('notification:route',routeNotification);

  global.MinistryRevisits={
    init:init,
    activate:function(){if(typeof global.switchScreen==='function')global.switchScreen('notes');activate('revisits');},
    open:function(id){activate('revisits');openEditor(id);},
    render:render
  };
  global.addEventListener('load',init);
})(window);
