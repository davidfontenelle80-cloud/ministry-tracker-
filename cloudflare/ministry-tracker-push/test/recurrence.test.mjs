import test from 'node:test';
import assert from 'node:assert/strict';
import '../../../js/recurrence.js';
import worker, { processDueReminders } from '../worker.js';
import { buildFeedIcs, sanitizeEvent } from '../feed.js';
const R = globalThis.MinistryRecurrence;
const rule = (changes = {}) => ({ frequency: 'weekly', interval: 1, startDate: '2026-10-03', time: '10:00', timeZone: 'America/New_York', ...changes });
const dates = (r, from = '2026-10-01', to = '2026-10-31') => R.occurrences(r, from, to).map(o => o.date);

test('weekly, biweekly, daily and monthly dates share one definition', () => {
  assert.deepEqual(dates(rule()), ['2026-10-03','2026-10-10','2026-10-17','2026-10-24','2026-10-31']);
  assert.deepEqual(dates(rule({ interval: 2 })), ['2026-10-03','2026-10-17','2026-10-31']);
  assert.deepEqual(dates(rule({ frequency: 'daily', interval: 2, endDate: '2026-10-07' })), ['2026-10-03','2026-10-05','2026-10-07']);
  assert.deepEqual(dates(rule({ frequency: 'monthly', startDate: '2026-01-31' }), '2026-01-01', '2026-04-30'), ['2026-01-31','2026-03-31']);
});
test('invalid dates, zones, times, intervals and reversed end dates are rejected', () => {
  for (const changes of [{startDate:'2026-02-30'},{time:'24:60'},{timeZone:'bad/zone'},{interval:0},{interval:13},{endDate:'2026-10-01'}]) assert.equal(R.normalize(rule(changes)), null);
});
test('one-time moves remove the original date and keep later weekends', () => {
  const r = rule({ exceptions: {'2026-10-03':{date:'2026-10-05',time:'11:00'}} });
  assert.deepEqual(dates(r), ['2026-10-05','2026-10-10','2026-10-17','2026-10-24','2026-10-31']);
  assert.equal(R.occurrences(r,'2026-10-05','2026-10-05')[0].key, '2026-10-03');
});
test('a move from outside the query range is still included', () => {
  const r = rule({ exceptions: {'2026-10-03':{date:'2027-01-04',time:'11:00'}} });
  assert.equal(R.occurrences(r,'2027-01-04','2027-01-04')[0].key,'2026-10-03');
});
test('pause, one-time appointment during pause, and resume', () => {
  assert.deepEqual(dates(rule({paused:true})), []);
  assert.deepEqual(dates(rule({paused:true,oneTime:{date:'2026-10-06',time:'11:00'}})), ['2026-10-06']);
  assert.equal(R.next(rule({paused:true}),Date.parse('2026-10-01T00:00Z'),15),null);
  assert.equal(dates(rule({paused:false})).length,5);
});
test('skip, complete and end date do not complete the whole record', () => {
  const r = rule({endDate:'2026-10-17',exceptions:{'2026-10-03':{skip:true}}});
  assert.deepEqual(dates(r),['2026-10-10','2026-10-17']);
  const v = R.complete({id:'x',recurrence:r,occurrenceKey:'2026-10-10'},'2026-10-10');
  assert.equal(v.recurrence.exceptions['2026-10-10'].skip,true);
  assert.deepEqual(dates(v.recurrence),['2026-10-17']);
});
test('local clock remains 10 AM across fall-back, and gap/fold handling is deterministic', () => {
  const r=rule({startDate:'2026-10-31'});
  assert.equal(R.next(r,Date.parse('2026-10-30T00:00Z'),15).fireAt,'2026-10-31T13:45:00.000Z');
  assert.equal(R.next(r,Date.parse('2026-11-01T00:00Z'),15).fireAt,'2026-11-07T14:45:00.000Z');
  assert.equal(new Date(R.epoch('2026-03-08','02:30','America/New_York')).toISOString(),'2026-03-08T07:30:00.000Z');
  assert.equal(new Date(R.epoch('2026-11-01','01:30','America/New_York')).toISOString(),'2026-11-01T05:30:00.000Z');
});
test('future series changes discard exceptions; a one-time change keeps them', () => {
  const v={recurrence:rule(),occurrenceKey:'2026-10-03'};
  const moved=R.move(v,'2026-10-05','11:00','once');
  assert.equal(moved.recurrence.startDate,'2026-10-03');
  assert.equal(moved.recurrence.exceptions['2026-10-03'].date,'2026-10-05');
  const future=R.move(moved,'2026-10-06','12:00','future');
  assert.equal(future.recurrence.startDate,'2026-10-06');
  assert.deepEqual(future.recurrence.exceptions,{});
});
test('an old notification completes its own occurrence, not next week', () => {
  const v={recurrence:rule(),occurrenceKey:'2026-10-10'};
  const next=R.complete(v,'2026-10-03');
  assert.deepEqual(dates(next.recurrence),['2026-10-10','2026-10-17','2026-10-24','2026-10-31']);
});
test('calendar occurrence UIDs stay stable when a visit moves, and pause removes events', () => {
  const today = R.localParts(Date.now(),'America/New_York').date;
  const r = rule({startDate:today});
  const event = {uid:'bs-x',date:today,time:'10:00',title:'Study',recurrence:r};
  const original=buildFeedIcs({events:[sanitizeEvent(event)]});
  assert.ok(original.includes('UID:bs-x.'+today+'@ministry-tracker.khub'));
  const moved=buildFeedIcs({events:[sanitizeEvent({...event,recurrence:{...r,exceptions:{[today]:{date:R.addDays(today,1),time:'11:00'}}}})]});
  assert.ok(moved.includes('UID:bs-x.'+today+'@ministry-tracker.khub'));
  assert.ok(moved.includes('DTSTART:'+new Date(R.epoch(R.addDays(today,1),'11:00',r.timeZone)).toISOString().replace(/[-:]/g,'').replace('.000','')));
  assert.doesNotMatch(buildFeedIcs({events:[sanitizeEvent({...event,recurrence:{...r,paused:true}})]}),/BEGIN:VEVENT/);
});
function kv(){const map=new Map(),options=new Map();return {map,options,async get(k,t){let v=map.get(k);return v===undefined?null:t==='json'?JSON.parse(v):v;},async put(k,v,o){map.set(k,v);options.set(k,o);},async delete(k){map.delete(k);}};}
const request=(method,path,body)=>new Request('https://worker.test'+path,{method,headers:{'content-type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
async function setup(changes={}){
  const store=kv(),env={PUSH_STORE:store};await store.put('subscription:sub1',JSON.stringify({subscription:{endpoint:'https://push.test'}}));
  const date=R.addDays(new Date().toISOString().slice(0,10),1);
  const recurrence=rule({startDate:date,timeZone:'UTC',...changes});
  const body={subscriptionId:'sub1',sourceType:'bible-study',sourceId:'study1',title:'Study',fireAt:new Date(R.epoch(date,'10:00','UTC')).toISOString(),recurrence,reminderMinutes:15};
  const response=await worker.fetch(request('POST','/api/reminders',body),env);
  assert.equal(response.status,200);return {store,env,body,record:(await response.json()).reminder};
}
test('closed-app Worker delivers once and queues the following week', async()=>{
  const {store,env,record}=await setup();let delivered=[];
  await processDueReminders(env,{now:record.fireAt,send:async(_sub,p)=>{delivered.push(p);}});
  const saved=await store.get('reminder:sub1:bible-study:study1','json');
  assert.equal(Date.parse(saved.fireAt)-Date.parse(record.fireAt),7*86400000);
  assert.equal(saved.sentAt,undefined);
  assert.equal(delivered.length,1);assert.equal(delivered[0].occurrenceKey,record.occurrenceKey);
  await processDueReminders(env,{now:record.fireAt,send:async()=>{delivered.push({});}});
  assert.equal(delivered.length,1);
});
test('pause/delete cancels the queued reminder and old bucket cannot send',async()=>{
  const {store,env,body,record}=await setup();
  await worker.fetch(request('POST','/api/reminders',{...body,recurrence:{...body.recurrence,paused:true}}),env);
  assert.equal(await store.get('reminder:sub1:bible-study:study1','json'),null);
  let count=0;await processDueReminders(env,{now:record.fireAt,send:async()=>{count++;}});assert.equal(count,0);
});
test('edit during delivery is not overwritten by automatic requeue',async()=>{
  const {store,env,record}=await setup();
  await processDueReminders(env,{now:record.fireAt,send:async()=>{const next={...record,revision:'new-edit',fireAt:new Date(Date.parse(record.fireAt)+86400000).toISOString()};await store.put('reminder:sub1:bible-study:study1',JSON.stringify(next));}});
  assert.equal((await store.get('reminder:sub1:bible-study:study1','json')).revision,'new-edit');
});
test('delete during delivery is not resurrected',async()=>{
  const {store,env,record}=await setup();
  await processDueReminders(env,{now:record.fireAt,send:async()=>{await store.delete('reminder:sub1:bible-study:study1');}});
  assert.equal(await store.get('reminder:sub1:bible-study:study1','json'),null);
});
test('monthly/yearly reminder and bucket survive beyond the old 28-day TTL',async()=>{
  const {store,record}=await setup({startDate:R.addDays(new Date().toISOString().slice(0,10),70),frequency:'monthly',interval:12});
  assert.ok(store.options.get('reminder:sub1:bible-study:study1').expirationTtl>70*86400);
  assert.ok(store.options.get('due:'+record.dueBucketMinute).expirationTtl>70*86400);
});
test('transient failures stay reachable and retry successfully',async()=>{
  const {env,record}=await setup();let count=0;
  await processDueReminders(env,{now:record.fireAt,send:async()=>{throw new Error('offline');}});
  await processDueReminders(env,{now:Date.parse(record.fireAt)+60000,send:async()=>{count++;}});
  assert.equal(count,1);
});

test('a paused one-time appointment far ahead is still queued',()=>{
  const r=rule({paused:true,oneTime:{date:'2030-10-06',time:'11:00'}});
  assert.equal(R.next(r,Date.parse('2026-10-01T00:00Z'),15).fireAt,'2030-10-06T14:45:00.000Z');
  assert.equal(R.project({recurrence:r},Date.parse('2026-10-01T00:00Z')).dueDate,'2030-10-06');
});
test('a moved exception after the last regular session remains scheduled',()=>{
  const r=rule({endDate:'2026-10-03',exceptions:{'2026-10-03':{date:'2030-10-06',time:'11:00'}}});
  assert.equal(R.next(r,Date.parse('2026-10-01T00:00Z'),15).date,'2030-10-06');
});

test('calendar includes an explicitly selected one-time date beyond the rolling horizon',()=>{
  const date=R.addDays(new Date().toISOString().slice(0,10),800);
  const event=sanitizeEvent({uid:'note-long',date:'2026-10-03',time:'10:00',recurrence:rule({paused:true,oneTime:{date,time:'11:00'}})});
  assert.match(buildFeedIcs({events:[event]}),/UID:note-long.one-time@ministry-tracker.khub/);
});
