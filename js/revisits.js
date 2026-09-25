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
  var movePinId='';
  var map=null;
  var initialized=false;
  var activeVisitId='';
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
  function mapLink(v){return 'https://www.google.com/maps/search/?api=1&query='+coord(v.lat)+','+coord(v.lng);}
  function directionsUrl(v){
    var app=state.revisitSettings.navApp||'auto';
    if(app==='auto')app=isIOS()?'apple':'google';
    var ll=coord(v.lat)+','+coord(v.lng);
    if(app==='waze')return 'https://waze.com/ul?ll='+ll+'&navigate=yes';
    if(app==='apple')return 'https://maps.apple.com/?daddr='+ll+'&dirflg=d';
    return 'https://www.google.com/maps/dir/?api=1&destination='+ll+'&travelmode=driving';
  }
  function normalizeVisit(v){
    if(!v||typeof v!=='object')return null;
    var lat=Number(v.lat),lng=Number(v.lng);
    if(!Number.isFinite(lat)||!Number.isFinite(lng))return null;
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
    if(rvLabel)rvLabel.textContent=L('Revisits','Revisitas');
    if(mode==='revisits'){
      render();
      autoLocateOnRevisitsOpen();
    } else if(typeof renderNotes==='function')renderNotes();
  }

  function viewTabs(){
    return '<div class="rv-view-tabs" role="tablist" aria-label="'+esc(L('Revisit views','Vistas de revisitas'))+'">'+
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
    var distance=currentLocation&&global.MinistryRevisitMap?global.MinistryRevisitMap.formatDistance(global.MinistryRevisitMap.haversineKm(currentLocation.lat,currentLocation.lng,v.lat,v.lng)):'';
    var when=v.dueDate?[fmtDate(v.dueDate),v.dueTime?fmtTime(v.dueTime):''].filter(Boolean).join(' · '):L('No date set','Sin fecha');
    var place=placeLine(v)||L('Pinned location','Ubicación marcada');
    return '<article class="rv-card" data-rv-card="'+esc(v.id)+'">'+
      '<div class="rv-card-head"><div class="min-w-0"><div class="rv-card-title">'+esc(v.name)+'</div><div class="rv-card-meta"><span>'+esc(when)+'</span>'+(distance?'<span>'+esc(distance)+'</span>':'')+'</div></div>'+visitStatus(v)+'</div>'+
      '<div class="rv-muted">'+esc(place)+'</div>'+
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
    var html=heading(L('Revisits','Revisitas'),new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{weekday:'long',month:'long',day:'numeric'}).format(new Date()),true);
    if(next){
      var when=next.dueDate?[fmtDate(next.dueDate),next.dueTime?fmtTime(next.dueTime):''].filter(Boolean).join(' · '):L('No date','Sin fecha');
      html+='<section class="rv-next-card"><div class="rv-kicker">'+esc(L('Next revisit','Próxima revisita'))+'</div><div class="rv-next-main"><div><h3>'+esc(next.name)+'</h3><div class="rv-muted">'+esc([when,placeLine(next)].filter(Boolean).join(' · '))+'</div></div><div class="rv-next-time">'+esc(next.dueTime?fmtTime(next.dueTime):fmtDate(next.dueDate,true))+'</div></div><div class="rv-card-actions"><button class="btn btn-secondary" data-rv-open="'+esc(next.id)+'">'+esc(L('Open','Abrir'))+'</button><button class="btn btn-secondary" data-rv-directions="'+esc(next.id)+'">'+esc(L('Directions','Cómo llegar'))+'</button><button class="btn btn-primary" data-rv-log="'+esc(next.id)+'">'+esc(L('Log visit','Registrar visita'))+'</button></div></section>';
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
    var html=heading(L('All revisits','Todas las revisitas'),state.ministryRevisits.length+' '+L('saved','guardadas'),true);
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
    html+='<div class="rv-list" id="rvList">'+(visits.length?visits.map(function(v){return visitCard(v,false);}).join(''):'<div class="rv-empty">'+esc(L('No revisits match this filter.','No hay revisitas con este filtro.'))+'</div>')+'</div>';
    return html;
  }
  function filterChip(id,label){return '<button class="rv-chip'+(listFilter===id?' is-active':'')+'" type="button" data-rv-filter="'+id+'">'+esc(label)+'</button>';}

  function mapVisits(){
    var t=todayKey(),arr=state.ministryRevisits.slice();
    if(mapMode==='today')arr=arr.filter(function(v){var b=scheduleBucket(v);return v.status==='active'&&(b==='today'||b==='overdue');});
    else if(mapMode==='active')arr=arr.filter(function(v){return v.status==='active';});
    else if(mapMode==='nearby')arr=currentLocation?arr.filter(function(v){return v.status==='active'&&global.MinistryRevisitMap.haversineKm(currentLocation.lat,currentLocation.lng,v.lat,v.lng)<=5;}):[];
    return arr.map(function(v){var x=Object.assign({},v);x.isOverdue=scheduleBucket(v)==='overdue';return x;});
  }
  function mapChip(id,label){return '<button class="rv-chip'+(mapMode===id?' is-active':'')+'" type="button" data-rv-map-mode="'+id+'">'+esc(label)+'</button>';}
  function renderMap(){
    var html=heading(L('Revisit map','Mapa de revisitas'),L('Tap the map to place or move a pin.','Toca el mapa para colocar o mover un pin.'),true);
    html+='<div class="rv-filter-row">'+mapChip('today',L('Today','Hoy'))+mapChip('active',L('Active','Activas'))+mapChip('all',L('All','Todas'))+mapChip('nearby',L('Nearby','Cerca'))+'</div>';
    html+='<div class="rv-map-shell" id="rvMapShell"><div class="rv-map" id="rvMap" role="application" aria-label="'+esc(L('Map of return visits','Mapa de revisitas'))+'"></div>'+
      '<div class="rv-map-controls"><button class="rv-map-control" data-rv-zoom="1" aria-label="'+esc(L('Zoom in','Acercar'))+'">+</button><button class="rv-map-control" data-rv-zoom="-1" aria-label="'+esc(L('Zoom out','Alejar'))+'">−</button></div>'+
      '<button class="btn btn-secondary rv-locate" type="button" data-rv-locate><i class="fa-solid fa-location-crosshairs"></i>'+esc(L('Use my location','Usar mi ubicación'))+'</button>'+
      '<div class="rv-map-attribution">© OpenStreetMap contributors</div>'+
      '<div id="rvLocationConfirm" class="rv-location-confirm" '+(pendingLocation?'':'hidden')+'>'+
        '<strong>'+esc(L('Is this the right location?','¿Es esta la ubicación correcta?'))+'</strong>'+
        '<div id="rvPendingAddress" class="rv-muted">'+esc(pendingLocation?(pendingLocation.address||L('Approximate location','Ubicación aproximada')):'')+'</div>'+
        '<div id="rvPendingCoords" class="rv-small font-mono">'+(pendingLocation?esc(coord(pendingLocation.lat)+', '+coord(pendingLocation.lng)):'')+'</div>'+
        '<div class="rv-card-actions"><button class="btn btn-secondary" data-rv-cancel-pin>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" data-rv-confirm-pin>'+esc(L('Confirm pin','Confirmar ubicación'))+'</button></div>'+
      '</div></div>';
    var vis=mapVisits();
    html+='<div class="rv-map-list" id="rvMapList">'+(vis.length?vis.map(function(v){return visitCard(v,true);}).join(''):'<div class="rv-empty">'+esc(L('No revisits to show on this map.','No hay revisitas para mostrar en este mapa.'))+'</div>')+'</div>';
    return html;
  }
  function initMap(){
    var el=document.getElementById('rvMap');
    if(!el||!global.MinistryRevisitMap)return;
    map=new global.MinistryRevisitMap.SimpleMap(el,state.revisitMap);
    map.onViewChange=function(p){state.revisitMap={lat:p.lat,lng:p.lng,zoom:p.zoom,manual:true};persist();};
    map.onTap=function(ll){
      pendingLocation={lat:ll.lat,lng:ll.lng,address:'',accuracy:null};
      pendingPurpose=movePinId?'move':'create';
      map.setDraft(ll.lat,ll.lng);
      refreshConfirmPanel();
      reverseGeocode(ll.lat,ll.lng).then(function(address){
        if(pendingLocation){pendingLocation.address=address||'';refreshConfirmPanel();}
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
    var a=document.getElementById('rvPendingAddress'),c=document.getElementById('rvPendingCoords');
    if(a)a.textContent=pendingLocation?(pendingLocation.address||L('Looking up approximate address…','Buscando dirección aproximada…')):'';
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
    var a=result&&result.address;if(!a)return String(result&&result.display_name||'').split(',').slice(0,3).join(',').trim();
    var street=[a.road||a.pedestrian||a.footway||a.path||'',a.house_number||''].filter(Boolean).join(' ');
    var area=a.neighbourhood||a.suburb||a.quarter||a.hamlet||a.village||'';
    var city=a.city||a.town||a.municipality||a.county||'';
    return [street,area,city].filter(function(x,i,arr){return x&&arr.indexOf(x)===i;}).join(', ');
  }
  function reverseGeocode(lat,lng){
    if(!navigator.onLine)return Promise.resolve('');
    var q=new URLSearchParams({format:'jsonv2',addressdetails:'1',lat:String(lat),lon:String(lng),zoom:'18','accept-language':state.lang==='es'?'es':'en'});
    return fetch('https://nominatim.openstreetmap.org/reverse?'+q.toString(),{headers:{Accept:'application/json'}})
      .then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
      .then(compactAddress).catch(function(){return '';});
  }

  function renderSettings(){
    var s=state.revisitSettings;
    var standaloneCount=standaloneVisits().length;
    return '<details class="rv-settings"><summary>'+esc(L('Revisit settings','Configuración de revisitas'))+'</summary><div class="rv-settings-content">'+
      '<div class="rv-cloud-note"><i class="fa-solid fa-cloud"></i> '+esc(L('Revisits are included in Ministry cloud backup.','Las revisitas se incluyen en la copia de seguridad de Ministry.'))+'</div>'+
      '<label class="rv-check"><input type="checkbox" data-rv-setting="calendarOnSave" '+(s.calendarOnSave?'checked':'')+'><span><strong>'+esc(L('Add to calendar after saving','Añadir al calendario al guardar'))+'</strong><br><span class="rv-muted">'+esc(L('You can also add any visit manually.','También puedes añadir cualquier visita manualmente.'))+'</span></span></label>'+
      '<label class="rv-field"><span>'+esc(L('Calendar app','Calendario'))+'</span><select data-rv-setting="calendarMode"><option value="auto" '+(s.calendarMode==='auto'?'selected':'')+'>'+esc(L('Automatic','Automático'))+'</option><option value="ics" '+(s.calendarMode==='ics'?'selected':'')+'>ICS '+esc(L('(alarm included)','(incluye alarma)'))+'</option><option value="google" '+(s.calendarMode==='google'?'selected':'')+'>Google Calendar</option></select></label>'+
      '<label class="rv-field"><span>'+esc(L('Calendar alarm','Alarma del calendario'))+'</span><select data-rv-setting="calendarReminderMinutes">'+[0,5,15,30,60].map(function(n){return '<option value="'+n+'" '+(Number(s.calendarReminderMinutes)===n?'selected':'')+'>'+ (n? n+' min':L('At time','A la hora')) +'</option>';}).join('')+'</select></label>'+
      '<label class="rv-field"><span>'+esc(L('Directions app','App de navegación'))+'</span><select data-rv-setting="navApp"><option value="auto" '+(s.navApp==='auto'?'selected':'')+'>'+esc(L('Automatic','Automático'))+'</option><option value="google" '+(s.navApp==='google'?'selected':'')+'>Google Maps</option><option value="apple" '+(s.navApp==='apple'?'selected':'')+'>Apple Maps</option><option value="waze" '+(s.navApp==='waze'?'selected':'')+'>Waze</option></select></label>'+
      '<label class="rv-check"><input type="checkbox" data-rv-setting="pushReminderDefault" '+(s.pushReminderDefault?'checked':'')+'><span><strong>'+esc(L('5-minute app reminder by default','Recordatorio de 5 minutos por defecto'))+'</strong><br><span class="rv-muted">'+esc(L('Requires notifications to be allowed on this device.','Requiere permitir notificaciones en este dispositivo.'))+'</span></span></label>'+
      (standaloneCount?'<button class="btn btn-secondary" type="button" data-rv-import><i class="fa-solid fa-file-import"></i>'+esc(L('Import '+standaloneCount+' from Revisita','Importar '+standaloneCount+' de Revisita'))+'</button>':'')+
      '</div></details>';
  }

  function ensureDialogs(){
    if(document.getElementById('rvVisitDialog'))return;
    var wrap=document.createElement('div');
    wrap.id='rvDialogsHost';
    wrap.innerHTML=
      '<dialog id="rvNewDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('New revisit','Nueva revisita'))+'</h2><div class="rv-muted">'+esc(L('Where is the person?','¿Dónde está la persona?'))+'</div></div><button class="rv-icon-btn" data-rv-close-new>×</button></div><div class="rv-list"><button class="btn btn-primary w-full" data-rv-new-here><i class="fa-solid fa-location-crosshairs"></i>'+esc(L('Here — use my location','Aquí — usar mi ubicación'))+'</button><button class="btn btn-secondary w-full" data-rv-new-map><i class="fa-solid fa-map-pin"></i>'+esc(L('Choose on map','Elegir en el mapa'))+'</button><button class="btn btn-secondary w-full" data-rv-new-address><i class="fa-solid fa-location-dot"></i>'+esc(L('Enter an address','Escribir una dirección'))+'</button></div></div></dialog>'+
      '<dialog id="rvAddressDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Find an address','Buscar una dirección'))+'</h2><div class="rv-muted">'+esc(L('Type an address, then verify the pin on the map.','Escribe una dirección y luego verifica la ubicación en el mapa.'))+'</div></div><button class="rv-icon-btn" data-rv-close-address>×</button></div><form id="rvAddressForm" class="rv-form"><label class="rv-field"><span>'+esc(L('Address','Dirección'))+'</span><input id="rvAddressSearch" type="search" maxlength="220" autocomplete="street-address" required placeholder="'+esc(L('Street, city, state or area','Calle, ciudad, estado o sector'))+'"></label><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-rv-close-address>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit"><i class="fa-solid fa-magnifying-glass"></i>'+esc(L('Find on map','Buscar en el mapa'))+'</button></div></form></div></dialog>'+
      '<dialog id="rvVisitDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2 id="rvVisitDialogTitle">'+esc(L('Revisit','Revisita'))+'</h2><div id="rvVisitCoords" class="rv-muted font-mono"></div></div><button class="rv-icon-btn" data-rv-close-visit>×</button></div><div id="rvExistingActions" class="rv-card-actions"></div><form id="rvVisitForm" class="rv-form"><input type="hidden" id="rvVisitId"><input type="hidden" id="rvVisitLat"><input type="hidden" id="rvVisitLng">'+
        '<label class="rv-field"><span>'+esc(L('Name','Nombre'))+'</span><input id="rvVisitName" maxlength="80" required autocomplete="off"></label>'+
        '<div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Phone','Teléfono'))+'</span><input id="rvVisitPhone" type="tel" maxlength="40" autocomplete="tel"></label><label class="rv-field"><span>'+esc(L('Reference / landmark','Referencia'))+'</span><input id="rvVisitReference" maxlength="120"></label></div>'+
        '<label class="rv-field"><span>'+esc(L('Address','Dirección'))+'</span><div class="rv-field-row"><input id="rvVisitAddress" maxlength="180" style="flex:1"><button class="btn btn-secondary" type="button" data-rv-find-address><i class="fa-solid fa-location-dot"></i>'+esc(L('Map','Mapa'))+'</button></div></label>'+
        '<label class="rv-field"><span>'+esc(L('Notes','Notas'))+'</span><textarea id="rvVisitNotes" maxlength="800"></textarea></label>'+
        '<div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('What you left','Qué le dejaste'))+'</span><input id="rvVisitLeftWith" maxlength="160"></label><label class="rv-field"><span>'+esc(L('Next topic','Próximo tema'))+'</span><input id="rvVisitNextTopic" maxlength="200"></label></div>'+
        '<div class="rv-quick-dates"><button class="rv-chip" type="button" data-rv-date-preset="7">+1 '+esc(L('week','semana'))+'</button><button class="rv-chip" type="button" data-rv-date-preset="14">+2 '+esc(L('weeks','semanas'))+'</button><button class="rv-chip" type="button" data-rv-date-preset="month">+1 '+esc(L('month','mes'))+'</button></div>'+
        '<div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Next date','Próxima fecha'))+'</span><input id="rvVisitDueDate" type="date"></label><label class="rv-field"><span>'+esc(L('Time','Hora'))+'</span><input id="rvVisitDueTime" type="time" step="60"></label></div>'+
        '<label class="rv-check"><input id="rvVisitNotify" type="checkbox"><span><strong>'+esc(L('App reminder 5 minutes before','Aviso en la app 5 minutos antes'))+'</strong><br><span class="rv-muted">'+esc(L('Works when notifications are enabled.','Funciona cuando las notificaciones están activadas.'))+'</span></span></label>'+
        '<div id="rvHistoryBlock" class="rv-history" hidden></div>'+
        '<div class="rv-dialog-actions"><button id="rvDeleteBtn" class="btn btn-secondary rv-danger" type="button" hidden><i class="fa-solid fa-trash"></i>'+esc(L('Delete','Eliminar'))+'</button><button class="btn btn-secondary" type="button" data-rv-close-visit>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit"><i class="fa-solid fa-check"></i>'+esc(L('Save','Guardar'))+'</button></div></form></div></dialog>'+
      '<dialog id="rvLogDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Log visit','Registrar visita'))+'</h2><div id="rvLogName" class="rv-muted"></div></div><button class="rv-icon-btn" data-rv-close-log>×</button></div><form id="rvLogForm" class="rv-form"><label class="rv-field"><span>'+esc(L('What happened?','¿Qué pasó?'))+'</span><textarea id="rvLogNote" maxlength="600"></textarea></label><label class="rv-field"><span>'+esc(L('What you left','Qué le dejaste'))+'</span><input id="rvLogLeftWith" maxlength="160"></label><label class="rv-field"><span>'+esc(L('Next topic','Tema para la próxima vez'))+'</span><input id="rvLogNextTopic" maxlength="200"></label><div class="rv-quick-dates"><button class="rv-chip" type="button" data-rv-log-preset="7">+1 '+esc(L('week','semana'))+'</button><button class="rv-chip" type="button" data-rv-log-preset="14">+2 '+esc(L('weeks','semanas'))+'</button><button class="rv-chip" type="button" data-rv-log-preset="month">+1 '+esc(L('month','mes'))+'</button></div><div class="rv-grid-2"><label class="rv-field"><span>'+esc(L('Return date','Volver el'))+'</span><input id="rvLogDueDate" type="date"></label><label class="rv-field"><span>'+esc(L('Return time','Hora'))+'</span><input id="rvLogDueTime" type="time" step="60"></label></div><label class="rv-check"><input id="rvLogEnd" type="checkbox"><span>'+esc(L('Do not return — move to history','No volver — pasar al historial'))+'</span></label><div class="rv-dialog-actions"><button class="btn btn-secondary" type="button" data-rv-close-log>'+esc(L('Cancel','Cancelar'))+'</button><button class="btn btn-primary" type="submit">'+esc(L('Save visit','Guardar visita'))+'</button></div></form></div></dialog>'+
      '<dialog id="rvDirectionsDialog" class="rv-dialog"><div class="rv-dialog-body"><div class="rv-dialog-head"><div><h2>'+esc(L('Start navigation','Iniciar navegación'))+'</h2><div id="rvDirectionsName" class="rv-muted"></div></div><button class="rv-icon-btn" data-rv-close-directions>×</button></div><div class="rv-list"><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="google"><i class="fa-brands fa-google"></i>Google Maps</button><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="apple"><i class="fa-brands fa-apple"></i>Apple Maps</button><button class="btn btn-secondary w-full" type="button" data-rv-nav-app="waze"><i class="fa-solid fa-diamond-turn-right"></i>Waze</button><label class="rv-check"><input id="rvRememberNav" type="checkbox"><span>'+esc(L('Remember my choice','Recordar mi elección'))+'</span></label></div></div></dialog>';
    document.body.appendChild(wrap);
    bindDialogs();
  }
  function dialog(id){return document.getElementById(id);}
  function showDialog(id){var d=dialog(id);if(d&&!d.open)d.showModal();}
  function closeDialog(id){var d=dialog(id);if(d&&d.open)d.close();}

  function openNewChooser(){ensureDialogs();showDialog('rvNewDialog');}
  function openEditor(id,coords){
    ensureDialogs();
    var v=id?state.ministryRevisits.find(function(x){return x.id===id;}):null;
    var p=v||coords;if(!p)return;
    activeVisitId=v?v.id:'';
    dialog('rvVisitId').value=v?v.id:'';
    dialog('rvVisitLat').value=p.lat;
    dialog('rvVisitLng').value=p.lng;
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
    dialog('rvVisitDialogTitle').textContent=v?v.name:L('New revisit','Nueva revisita');
    dialog('rvVisitCoords').textContent=coord(p.lat)+', '+coord(p.lng);
    dialog('rvDeleteBtn').hidden=!v;
    var actions=dialog('rvExistingActions');
    actions.innerHTML=v?'<button class="btn btn-secondary" type="button" data-rv-dialog-move><i class="fa-solid fa-location-dot"></i>'+esc(L('Move pin','Mover pin'))+'</button><button class="btn btn-secondary" type="button" data-rv-dialog-calendar><i class="fa-solid fa-calendar-plus"></i>'+esc(L('Calendar','Calendario'))+'</button><button class="btn btn-secondary" type="button" data-rv-dialog-directions><i class="fa-solid fa-diamond-turn-right"></i>'+esc(L('Directions','Cómo llegar'))+'</button>'+(v.status!=='completed'?'<button class="btn btn-primary" type="button" data-rv-dialog-log><i class="fa-solid fa-check"></i>'+esc(L('Log','Registrar'))+'</button>':''):'';
    renderHistory(v);
    showDialog('rvVisitDialog');
    if(!v)setTimeout(function(){dialog('rvVisitName').focus();},80);
  }
  function renderHistory(v){
    var box=dialog('rvHistoryBlock');if(!box)return;
    var h=v&&Array.isArray(v.history)?v.history.slice().reverse():[];
    box.hidden=!h.length;
    box.innerHTML=h.length?'<strong>'+esc(L('Visit history','Historial de visitas'))+'</strong>'+h.map(function(x){
      var d=x.completedAt?new Date(x.completedAt):null;
      var stamp=d&&!isNaN(d)?new Intl.DateTimeFormat(state.lang==='es'?'es-US':'en-US',{month:'short',day:'numeric',year:'numeric'}).format(d):'';
      return '<div class="rv-history-item"><strong>'+esc(stamp)+'</strong>'+(x.note?'<div>'+esc(x.note)+'</div>':'')+(x.leftWith?'<div class="rv-muted">'+esc(L('Left: ','Dejó: ')+x.leftWith)+'</div>':'')+'</div>';
    }).join(''):'';
  }

  function bindDialogs(){
    if(!dialogClicksBound){
      dialogClicksBound=true;
      document.addEventListener('click',function(e){
      if(e.target.closest('[data-rv-close-new]'))closeDialog('rvNewDialog');
      if(e.target.closest('[data-rv-close-visit]'))closeDialog('rvVisitDialog');
      if(e.target.closest('[data-rv-close-log]'))closeDialog('rvLogDialog');
      if(e.target.closest('[data-rv-new-here]')){
        closeDialog('rvNewDialog');
        requestLocation(function(loc){beginGpsPin(loc,'create');},{center:false});
      }
      if(e.target.closest('[data-rv-new-map]')){closeDialog('rvNewDialog');view='map';movePinId='';pendingPurpose='create';render();toast(L('Tap the map, then confirm the pin.','Toca el mapa y confirma la ubicación.'));}
      var preset=e.target.closest('[data-rv-date-preset]');
      if(preset){var val=preset.dataset.rvDatePreset;dialog('rvVisitDueDate').value=val==='month'?addMonths(todayKey(),1):addDays(todayKey(),Number(val));}
      var lp=e.target.closest('[data-rv-log-preset]');
      if(lp){var lv=lp.dataset.rvLogPreset;dialog('rvLogDueDate').value=lv==='month'?addMonths(todayKey(),1):addDays(todayKey(),Number(lv));}
      if(e.target.closest('[data-rv-dialog-calendar]')){var cv=findActive();if(cv)addToCalendar(cv);}
      if(e.target.closest('[data-rv-dialog-directions]')){var dv=findActive();if(dv)openDirections(dv);}
      if(e.target.closest('[data-rv-dialog-log]')){var lv2=findActive();if(lv2){closeDialog('rvVisitDialog');openLog(lv2.id);}}
      if(e.target.closest('[data-rv-dialog-move]')){
        var mv=findActive();if(!mv)return;
        movePinId=mv.id;pendingPurpose='move';pendingLocation={lat:mv.lat,lng:mv.lng,address:mv.address||''};
        closeDialog('rvVisitDialog');view='map';render();
      }
      });
    }
    dialog('rvVisitForm').addEventListener('submit',saveVisit);
    dialog('rvDeleteBtn').addEventListener('click',deleteActive);
    dialog('rvLogForm').addEventListener('submit',saveLog);
  }
  function findActive(){return state.ministryRevisits.find(function(v){return v.id===activeVisitId;});}

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
    else toast(L('Revisit saved.','Revisita guardada.'));
  }
  function deleteActive(){
    var v=findActive();if(!v)return;
    if(!confirm(L('Delete this revisit?','¿Eliminar esta revisita?')))return;
    state.ministryRevisits=state.ministryRevisits.filter(function(x){return x.id!==v.id;});
    persist();clearPush(v.id);closeDialog('rvVisitDialog');render();
    if(v.calendarSlot)toast(L('Deleted here. Remove its phone calendar event separately if needed.','Eliminada aquí. Borra por separado el evento del calendario si es necesario.'));
    else toast(L('Revisit deleted.','Revisita eliminada.'));
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
    if(!global.MinistryPush||typeof global.MinistryPush.syncReminder!=='function')return;
    if(v.status==='completed'||!v.notify5Min||!v.dueDate||!v.dueTime){clearPush(v.id);return;}
    var at=new Date(v.dueDate+'T'+v.dueTime+':00');
    if(isNaN(at.getTime()))return;
    var fire=new Date(at.getTime()-5*60000);
    if(fire.getTime()<=Date.now()+30000){clearPush(v.id);toast(L('This visit is too soon for a 5-minute app reminder.','Esta visita está demasiado cerca para un aviso de 5 minutos.'));return;}
    var body=[fmtDate(v.dueDate),fmtTime(v.dueTime),placeLine(v)].filter(Boolean).join(' · ');
    global.MinistryPush.syncReminder('revisit',v.id,L('Revisit: ','Revisita: ')+v.name,body,fire.toISOString()).then(function(result){
      if(result&&result.ok===false)toast(L('Revisit saved, but the app reminder could not be scheduled.','Revisita guardada, pero no se pudo programar el aviso.'));
    }).catch(function(){toast(L('Revisit saved, but the app reminder could not be scheduled.','Revisita guardada, pero no se pudo programar el aviso.'));});
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
    var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//KHub//Ministry Revisits//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH','BEGIN:VEVENT','UID:ministry-revisit-'+v.id+'@khub','SEQUENCE:'+Math.max(0,Number(v.calendarSeq)||0),'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z')];
    if(v.dueTime)lines.push('DTSTART:'+localStamp(v.dueDate,v.dueTime),'DTEND:'+endStamp(v.dueDate,v.dueTime,30));
    else lines.push('DTSTART;VALUE=DATE:'+v.dueDate.replace(/-/g,''),'DTEND;VALUE=DATE:'+addDays(v.dueDate,1).replace(/-/g,''));
    var description=[v.nextTopic?L('Next topic: ','Próximo tema: ')+v.nextTopic:'',v.leftWith?L('Left: ','Dejó: ')+v.leftWith:'',v.phone?L('Phone: ','Teléfono: ')+v.phone:'',mapLink(v)].filter(Boolean).join('\n');
    lines.push('SUMMARY:'+icsEscape(L('Revisit: ','Revisita: ')+v.name),'LOCATION:'+icsEscape(placeLine(v)||coord(v.lat)+', '+coord(v.lng)),'GEO:'+coord(v.lat)+';'+coord(v.lng),'DESCRIPTION:'+icsEscape(description),'URL:'+mapLink(v),'BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEscape(L('Revisit: ','Revisita: ')+v.name),v.dueTime?'TRIGGER:-PT'+reminder+'M':'TRIGGER:PT8H','END:VALARM','END:VEVENT','END:VCALENDAR');
    return lines.join('\r\n')+'\r\n';
  }
  function googleCalendarUrl(v){
    var dates=v.dueTime?localStamp(v.dueDate,v.dueTime)+'/'+endStamp(v.dueDate,v.dueTime,30):v.dueDate.replace(/-/g,'')+'/'+addDays(v.dueDate,1).replace(/-/g,'');
    var details=[v.nextTopic?L('Next topic: ','Próximo tema: ')+v.nextTopic:'',v.leftWith?L('Left: ','Dejó: ')+v.leftWith:'',mapLink(v)].filter(Boolean).join('\n');
    var q=new URLSearchParams({action:'TEMPLATE',text:L('Revisit: ','Revisita: ')+v.name,dates:dates,details:details,location:placeLine(v)||coord(v.lat)+','+coord(v.lng)});
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
  function openDirections(v){global.open(directionsUrl(v),'_blank','noopener');}

  function standaloneVisits(){
    if(importChecked&&standaloneVisits.cache)return standaloneVisits.cache;
    var arr=[];
    try{var raw=localStorage.getItem('revisita.state.v1');if(raw){var parsed=JSON.parse(raw);if(Array.isArray(parsed.visits))arr=parsed.visits.map(normalizeVisit).filter(Boolean);}}catch(e){}
    standaloneVisits.cache=arr;importChecked=true;return arr;
  }
  function importStandalone(){
    var incoming=standaloneVisits();if(!incoming.length)return;
    if(!confirm(L('Import existing Revisita records into Ministry? Matching IDs will keep the newest edit.','¿Importar las revisitas existentes a Ministry? Los ID iguales conservarán la edición más reciente.')))return;
    var by=new Map(state.ministryRevisits.map(function(v){return [v.id,v];}));
    incoming.forEach(function(v){var prev=by.get(v.id);if(!prev||String(v.updatedAt||'')>String(prev.updatedAt||''))by.set(v.id,v);});
    state.ministryRevisits=Array.from(by.values());persist();render();toast(L('Revisita records imported.','Revisitas importadas.'));
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
      if(e.target.closest('[data-rv-locate]')){requestLocation(function(loc){beginGpsPin(loc,movePinId?'move':'create');},{center:false});return;}
      if(e.target.closest('[data-rv-cancel-pin]')){pendingLocation=null;movePinId='';if(map)map.setDraft(null,null);refreshConfirmPanel();return;}
      if(e.target.closest('[data-rv-confirm-pin]')){
        if(!pendingLocation)return;
        var p=Object.assign({},pendingLocation),move=movePinId;pendingLocation=null;movePinId='';
        if(move){
          var old=state.ministryRevisits.find(function(x){return x.id===move;});
          if(old){var moved=Object.assign({},old,{lat:p.lat,lng:p.lng,address:p.address||old.address,updatedAt:nowIso()});state.ministryRevisits=state.ministryRevisits.map(function(x){return x.id===move?moved:x;});persist();render();openEditor(move);toast(L('Pin moved.','Ubicación actualizada.'));}
        }else{render();openEditor(null,p);}
        return;
      }
      if(e.target.closest('[data-rv-import]')){importStandalone();return;}
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
        box.innerHTML=visits.length?visits.map(function(v){return visitCard(v,false);}).join(''):'<div class="rv-empty">'+esc(L('No revisits match this search.','No hay revisitas que coincidan.'))+'</div>';
      }
    });
    el.addEventListener('change',function(e){
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
