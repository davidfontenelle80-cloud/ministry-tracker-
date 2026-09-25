/**
 * revisit-map.js — lightweight OpenStreetMap renderer for Ministry Revisits.
 * Based on the proven map interaction model used by the standalone Revisita app.
 */
(function (global) {
  'use strict';

  var TILE_SIZE = 256;
  function clamp(v,min,max){return Math.min(max,Math.max(min,v));}
  function normalizeLng(l){while(l>180)l-=360;while(l<-180)l+=360;return l;}
  function latLngToWorld(lat,lng,zoom){
    var z2=Math.pow(2,zoom);
    var sin=Math.sin(clamp(lat,-85.05112878,85.05112878)*Math.PI/180);
    return {
      x:((lng+180)/360)*z2*TILE_SIZE,
      y:(0.5-Math.log((1+sin)/(1-sin))/(4*Math.PI))*z2*TILE_SIZE
    };
  }
  function worldToLatLng(x,y,zoom){
    var z2=Math.pow(2,zoom);
    var lng=(x/(z2*TILE_SIZE))*360-180;
    var n=Math.PI-(2*Math.PI*y)/(z2*TILE_SIZE);
    var lat=(180/Math.PI)*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));
    return {lat:clamp(lat,-85.05112878,85.05112878),lng:lng};
  }
  function haversineKm(aLat,aLng,bLat,bLng){
    var R=6371;
    var dLat=(bLat-aLat)*Math.PI/180;
    var dLng=(bLng-aLng)*Math.PI/180;
    var p1=aLat*Math.PI/180,p2=bLat*Math.PI/180;
    var h=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(p1)*Math.cos(p2)*Math.sin(dLng/2)*Math.sin(dLng/2);
    return 2*R*Math.asin(Math.sqrt(h));
  }
  function formatDistance(km){
    if(!Number.isFinite(km))return '';
    if(km<1)return Math.max(10,Math.round(km*1000/10)*10)+' m';
    if(km<10)return km.toFixed(1)+' km';
    return Math.round(km)+' km';
  }

  function SimpleMap(el,opts){
    opts=opts||{};
    this.el=el;
    this.center={lat:Number(opts.lat)||18.7357,lng:Number(opts.lng)||-70.1627};
    this.zoom=clamp(Math.round(Number(opts.zoom)||8),2,19);
    this.markers=[];
    this.draft=null;
    this.userLocation=null;
    this.onTap=function(){};
    this.onMarkerTap=function(){};
    this.onViewChange=function(){};
    this.drag=null;
    this.tiles=new Map();
    this.markerNodes=new Map();
    this.frame=0;
    this.build();
    this.bind();
    var self=this;
    if('ResizeObserver' in window){
      this.ro=new ResizeObserver(function(){self.schedule();});
      this.ro.observe(el);
    }
    this.schedule();
  }
  SimpleMap.prototype.build=function(){
    this.tileLayer=document.createElement('div');
    this.tileLayer.className='rv-tile-layer';
    this.markerLayer=document.createElement('div');
    this.markerLayer.className='rv-marker-layer';
    this.el.replaceChildren(this.tileLayer,this.markerLayer);
  };
  SimpleMap.prototype.bind=function(){
    var self=this;
    this.el.addEventListener('pointerdown',function(e){
      if(e.button!==0)return;
      if(e.target.closest('.rv-marker'))return;
      self.el.setPointerCapture&&self.el.setPointerCapture(e.pointerId);
      self.drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};
    });
    this.el.addEventListener('pointermove',function(e){
      if(!self.drag||self.drag.id!==e.pointerId)return;
      var dx=e.clientX-self.drag.lastX,dy=e.clientY-self.drag.lastY;
      if(Math.hypot(e.clientX-self.drag.startX,e.clientY-self.drag.startY)>7)self.drag.moved=true;
      if(!dx&&!dy)return;
      var c=latLngToWorld(self.center.lat,self.center.lng,self.zoom);
      var ll=worldToLatLng(c.x-dx,c.y-dy,self.zoom);
      self.center={lat:ll.lat,lng:normalizeLng(ll.lng)};
      self.drag.lastX=e.clientX;self.drag.lastY=e.clientY;
      self.schedule();
    });
    function finish(e){
      if(!self.drag||self.drag.id!==e.pointerId)return;
      var moved=self.drag.moved;self.drag=null;
      if(!moved){
        var r=self.el.getBoundingClientRect();
        self.onTap(self.screenToLatLng(e.clientX-r.left,e.clientY-r.top));
      }else self.onViewChange({lat:self.center.lat,lng:self.center.lng,zoom:self.zoom});
    }
    this.el.addEventListener('pointerup',finish);
    this.el.addEventListener('pointercancel',function(){self.drag=null;});
    this.el.addEventListener('wheel',function(e){
      e.preventDefault();
      self.setZoom(self.zoom+(e.deltaY<0?1:-1));
    },{passive:false});
  };
  SimpleMap.prototype.screenToLatLng=function(x,y){
    var c=latLngToWorld(this.center.lat,this.center.lng,this.zoom);
    return worldToLatLng(c.x+x-this.el.clientWidth/2,c.y+y-this.el.clientHeight/2,this.zoom);
  };
  SimpleMap.prototype.setView=function(lat,lng,zoom){
    this.center={lat:clamp(Number(lat),-85,85),lng:normalizeLng(Number(lng))};
    if(zoom!==undefined)this.zoom=clamp(Math.round(Number(zoom)),2,19);
    this.schedule();
    this.onViewChange({lat:this.center.lat,lng:this.center.lng,zoom:this.zoom});
  };
  SimpleMap.prototype.setZoom=function(z){
    z=clamp(Math.round(Number(z)),2,19);
    if(z===this.zoom)return;
    this.zoom=z;this.schedule();
    this.onViewChange({lat:this.center.lat,lng:this.center.lng,zoom:this.zoom});
  };
  SimpleMap.prototype.setMarkers=function(markers){
    this.markers=Array.isArray(markers)?markers:[];
    this.syncMarkers();this.schedule();
  };
  SimpleMap.prototype.setDraft=function(lat,lng){
    this.draft=Number.isFinite(lat)&&Number.isFinite(lng)?{lat:lat,lng:lng}:null;
    this.syncAux();this.schedule();
  };
  SimpleMap.prototype.setUserLocation=function(lat,lng){
    this.userLocation=Number.isFinite(lat)&&Number.isFinite(lng)?{lat:lat,lng:lng}:null;
    this.syncAux();this.schedule();
  };
  SimpleMap.prototype.fitPoints=function(points,maxZoom){
    if(!points||!points.length)return;
    maxZoom=maxZoom||16;
    if(points.length===1){this.setView(points[0].lat,points[0].lng,maxZoom);return;}
    var w=Math.max(120,this.el.clientWidth-80),h=Math.max(120,this.el.clientHeight-80);
    for(var z=maxZoom;z>=2;z--){
      var ps=points.map(function(p){return latLngToWorld(p.lat,p.lng,z);});
      var xs=ps.map(function(p){return p.x;}),ys=ps.map(function(p){return p.y;});
      var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs),minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys);
      if(maxX-minX<=w&&maxY-minY<=h){
        var ll=worldToLatLng((minX+maxX)/2,(minY+maxY)/2,z);
        this.setView(ll.lat,ll.lng,z);return;
      }
    }
  };
  SimpleMap.prototype.schedule=function(){
    var self=this;if(this.frame)return;
    this.frame=requestAnimationFrame(function(){self.frame=0;self.render();});
  };
  SimpleMap.prototype.render=function(){
    if(!this.el.clientWidth||!this.el.clientHeight)return;
    this.renderTiles();this.renderMarkerPositions();
  };
  SimpleMap.prototype.renderTiles=function(){
    var w=this.el.clientWidth,h=this.el.clientHeight;
    var c=latLngToWorld(this.center.lat,this.center.lng,this.zoom);
    var left=c.x-w/2,top=c.y-h/2;
    var minTx=Math.floor(left/TILE_SIZE)-1,maxTx=Math.floor((left+w)/TILE_SIZE)+1;
    var minTy=Math.floor(top/TILE_SIZE)-1,maxTy=Math.floor((top+h)/TILE_SIZE)+1;
    var n=Math.pow(2,this.zoom),needed=new Set();
    for(var ty=minTy;ty<=maxTy;ty++){
      if(ty<0||ty>=n)continue;
      for(var tx=minTx;tx<=maxTx;tx++){
        var wrapped=((tx%n)+n)%n,key=this.zoom+'/'+tx+'/'+ty;
        needed.add(key);
        var img=this.tiles.get(key);
        if(!img){
          img=document.createElement('img');
          img.className='rv-map-tile';img.alt='';img.draggable=false;img.decoding='async';
          img.src='https://tile.openstreetmap.org/'+this.zoom+'/'+wrapped+'/'+ty+'.png';
          this.tiles.set(key,img);this.tileLayer.append(img);
        }
        img.style.transform='translate3d('+Math.round(tx*TILE_SIZE-left)+'px,'+Math.round(ty*TILE_SIZE-top)+'px,0)';
      }
    }
    var self=this;
    this.tiles.forEach(function(img,key){if(!needed.has(key)){img.remove();self.tiles.delete(key);}});
  };
  SimpleMap.prototype.syncMarkers=function(){
    var self=this,active=new Set();
    this.markers.forEach(function(m){
      if(!m||!m.id)return;active.add(String(m.id));
      var node=self.markerNodes.get(String(m.id));
      if(!node){
        node=document.createElement('button');node.type='button';node.className='rv-marker';
        node.addEventListener('pointerdown',function(e){e.stopPropagation();});
        node.addEventListener('click',function(e){e.stopPropagation();self.onMarkerTap(String(m.id));});
        self.markerNodes.set(String(m.id),node);self.markerLayer.append(node);
      }
      node.className='rv-marker'+(m.status==='completed'?' is-completed':'')+(m.isOverdue?' is-overdue':'');
      node.setAttribute('aria-label','Open revisit '+(m.name||''));
    });
    this.markerNodes.forEach(function(node,id){if(!active.has(id)){node.remove();self.markerNodes.delete(id);}});
    this.syncAux();
  };
  SimpleMap.prototype.syncAux=function(){
    if(this.draft&&!this.draftNode){this.draftNode=document.createElement('div');this.draftNode.className='rv-marker is-draft';this.markerLayer.append(this.draftNode);}
    if(!this.draft&&this.draftNode){this.draftNode.remove();this.draftNode=null;}
    if(this.userLocation&&!this.userNode){this.userNode=document.createElement('div');this.userNode.className='rv-user-dot';this.markerLayer.append(this.userNode);}
    if(!this.userLocation&&this.userNode){this.userNode.remove();this.userNode=null;}
  };
  SimpleMap.prototype.renderMarkerPositions=function(){
    var w=this.el.clientWidth,h=this.el.clientHeight,c=latLngToWorld(this.center.lat,this.center.lng,this.zoom);
    var left=c.x-w/2,top=c.y-h/2,world=Math.pow(2,this.zoom)*TILE_SIZE;
    var self=this;
    function point(lat,lng){
      var p=latLngToWorld(lat,lng,self.zoom),dx=p.x-c.x;
      if(dx>world/2)p.x-=world;if(dx<-world/2)p.x+=world;
      return{x:p.x-left,y:p.y-top};
    }
    this.markers.forEach(function(m){
      var node=self.markerNodes.get(String(m.id));if(!node)return;
      var p=point(m.lat,m.lng),visible=!(p.x<-50||p.y<-50||p.x>w+50||p.y>h+50);
      node.hidden=!visible;if(visible)node.style.transform='translate3d('+p.x+'px,'+p.y+'px,0) translate(-50%,-100%)';
    });
    if(this.draft&&this.draftNode){var d=point(this.draft.lat,this.draft.lng);this.draftNode.style.transform='translate3d('+d.x+'px,'+d.y+'px,0) translate(-50%,-100%)';}
    if(this.userLocation&&this.userNode){var u=point(this.userLocation.lat,this.userLocation.lng);this.userNode.style.transform='translate3d('+u.x+'px,'+u.y+'px,0) translate(-50%,-50%)';}
  };

  global.MinistryRevisitMap={SimpleMap:SimpleMap,haversineKm:haversineKm,formatDistance:formatDistance};
})(window);
