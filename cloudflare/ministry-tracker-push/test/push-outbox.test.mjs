import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
const pushSource=fs.readFileSync(new URL('../../../js/push.js',import.meta.url),'utf8');
const recurrenceSource=fs.readFileSync(new URL('../../../js/recurrence.js',import.meta.url),'utf8');
function harness(){
  const stored=new Map([['ministryPushSubscriptionId','sub1']]), calls=[], listeners={};let offline=false;
  const c={Date,Intl,Map,Uint8Array,URL,Promise,setTimeout,clearTimeout,console:{info(){},warn(){}},
    localStorage:{getItem:k=>stored.get(k)||null,setItem:(k,v)=>stored.set(k,v)},
    MINISTRY_TRACKER_PUSH_CONFIG:{workerUrl:'https://test.invalid',vapidPublicKey:'AQ'},
    Notification:{permission:'granted'},PushManager:function(){},matchMedia:()=>({matches:false}),
    atob:v=>Buffer.from(v,'base64').toString('binary'),btoa:v=>Buffer.from(v,'binary').toString('base64'),
    addEventListener:(e,fn)=>listeners[e]=fn,document:{visibilityState:'visible',addEventListener:(e,fn)=>listeners[e]=fn},
    navigator:{userAgent:'Test Desktop',serviceWorker:{ready:Promise.resolve({pushManager:{getSubscription:()=>Promise.resolve({endpoint:'https://push.invalid'})}})}},
    state:{ministryNotes:[],ministryBibleStudies:[],ministryRevisits:[]},
    fetch:async(url,options)=>{calls.push({url,options});if(offline)throw new Error('offline');return new Response(JSON.stringify(url.endsWith('/api/subscribe')?{ok:true,id:'sub1'}:{ok:true}));}
  };
  c.window=c;const context=vm.createContext(c);vm.runInContext(recurrenceSource,context);vm.runInContext(pushSource,context);
  return {c,stored,calls,listeners,setOffline:v=>offline=v};
}
async function settled(h){for(let i=0;i<30;i++){await new Promise(resolve=>setImmediate(resolve));if(Object.keys(JSON.parse(h.stored.get('ministry-reminder-outbox-v1')||'{}')).length===0)return;}throw new Error('outbox did not finish');}
test('failed pause/delete is retained and replayed after returning online',async()=>{
  const h=harness();h.setOffline(true);
  const result=await h.c.MinistryPush.clearReminder('bible-study','x');assert.equal(result.ok,false);
  assert.equal(Object.keys(JSON.parse(h.stored.get('ministry-reminder-outbox-v1'))).length,1);
  h.setOffline(false);h.listeners.online();await settled(h);
  assert.equal(h.calls.at(-1).options.method,'DELETE');
});
test('replayed recurring updates recompute the next reminder from the current rule',async()=>{
  const h=harness(),R=h.c.MinistryRecurrence;
  const date=R.addDays(R.localParts(Date.now(),'UTC').date,1);
  h.c.state.ministryNotes=[{id:'note1',reminder:true,reminderMinutes:15,recurrence:{frequency:'weekly',interval:1,startDate:date,time:'10:00',timeZone:'UTC'}}];
  h.setOffline(true);await h.c.MinistryPush.syncReminder('ministry-note','note1','Note','',new Date(Date.now()+1000).toISOString());
  h.c.state.ministryNotes[0].recurrence.time='11:00';
  h.setOffline(false);h.c.MinistryPush.retryPending();await settled(h);
  const body=JSON.parse(h.calls.findLast(x=>x.url.endsWith('/api/reminders')).options.body);
  assert.equal(body.recurrence.time,'11:00');
  assert.equal(body.fireAt,date+'T10:45:00.000Z');
});
test('latest cancellation wins over a queued save; no stale POST is sent',async()=>{
  const h=harness();h.c.state.ministryNotes=[{id:'note1',reminder:true}];
  const one=h.c.MinistryPush.syncReminder('ministry-note','note1','Note','',new Date(Date.now()+86400000).toISOString());
  const two=h.c.MinistryPush.clearReminder('ministry-note','note1');
  await Promise.all([one,two]);await settled(h);
  assert.equal(h.calls.filter(x=>x.url.endsWith('/api/reminders')).length,0);
  assert.equal(h.calls.at(-1).options.method,'DELETE');
});
test('a queued save of a removed item becomes a delete when replayed',async()=>{
  const h=harness();h.c.state.ministryNotes=[{id:'note1',reminder:true}];h.setOffline(true);
  await h.c.MinistryPush.syncReminder('ministry-note','note1','Note','',new Date(Date.now()+86400000).toISOString());
  h.c.state.ministryNotes=[];h.setOffline(false);h.listeners.online();await settled(h);
  assert.equal(h.calls.at(-1).options.method,'DELETE');
});
