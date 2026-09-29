// Run with Playwright installed: node tests/recurrence-browser.mjs
// Uses a disposable context and blocks external requests; no real visits/calendar writes.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES ? process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES + '/playwright' : 'playwright');
const browser = await chromium.launch({headless:true,executablePath:process.env.MINISTRY_CHROME,args:['--no-sandbox']});
const context = await browser.newContext({viewport:process.env.MINISTRY_DESKTOP ? {width:1280,height:900} : {width:390,height:844},timezoneId:'America/New_York',serviceWorkers:'block'});
await context.route('**/*',route=>route.request().url().startsWith('http://127.0.0.1:8765/') ? route.continue() : route.abort());
const page = await context.newPage(), errors=[];
page.on('pageerror',e=>errors.push(e.message));
try {
  await page.goto(process.env.MINISTRY_TEST_URL || 'http://127.0.0.1:8765/', {waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.MinistryOrganizer && window.MinistryRevisits && window.MinistryCalendarFeed);
  await page.evaluate(()=>{
    state.lang='en'; state.ministryNotes=[];state.ministryBibleStudies=[];state.ministryRevisits=[];
    window.testPush=[];
    MinistryPush.syncReminder=(type,id,title,body,fireAt)=>{testPush.push({type,id,fireAt});return Promise.resolve({ok:true});};
    MinistryPush.clearReminder=(type,id)=>{testPush.push({type,id,clear:true});return Promise.resolve({ok:true});};
    switchScreen('notes');MinistryOrganizer.activateNotes();
  });
  const today=await page.evaluate(()=>MinistryRecurrence.localParts(Date.now(),'America/New_York').date);
  const date=await page.evaluate(d=>MinistryRecurrence.addDays(d,2),today);
  async function fillRepeat(form){await page.locator(form+' [data-rec-frequency]').selectOption('weekly');await page.locator(form+' [data-rec-zone]').fill('America/New_York');}
  await page.locator('[data-org-add-note]').click();
  await page.locator('#orgNoteTitle').fill('Recurring test note');await page.locator('#orgNoteDate').fill(date);await page.locator('#orgNoteTime').fill('10:00');await page.locator('#orgNoteReminder').check();await fillRepeat('#orgNoteForm');
  await page.locator('#orgNoteForm button[type=submit]').click();
  const noteId=await page.evaluate(()=>state.ministryNotes[0].id);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.frequency),'weekly');
  await page.evaluate(id=>MinistryOrganizer.openNote(id),noteId);
  await page.getByRole('button',{name:'Manage repeating schedule',exact:true}).click();
  const moved=await page.evaluate(d=>MinistryRecurrence.addDays(d,1),date);
  await page.locator('#recOnceDate').fill(moved);await page.locator('#recOnceTime').fill('11:00');await page.locator('[data-rec-action=move]').click();
  await page.waitForFunction(()=>document.getElementById('recSyncStatus').textContent.startsWith('Saved.'));
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].dueDate),moved);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.startDate),date);
  await page.locator('[data-rec-action=pause]').click();await page.waitForFunction(()=>state.ministryNotes[0].recurrence.paused);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].dueDate),'');
  assert.ok(await page.evaluate(()=>testPush.some(x=>x.clear)));
  await page.locator('#recOnceDate').fill(moved);await page.locator('#recOnceTime').fill('12:00');await page.locator('[data-rec-action=move]').click();
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.oneTime.date),moved);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.paused),true);
  await page.locator('[data-rec-action=pause]').click();assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.oneTime),null);
  await page.locator('[data-rec-action=skip]').click();
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].dueDate),await page.evaluate(d=>MinistryRecurrence.addDays(d,7),date));
  await page.screenshot({path:process.env.MINISTRY_DESKTOP ? '/tmp/ministry-recurring-desktop.png' : '/tmp/ministry-recurring-mobile.png'});
  await page.locator('[data-rec-action=close]').click();await page.locator('[data-org-close=orgNoteDetail]').click();
  await page.evaluate(()=>MinistryOrganizer.activateStudies());await page.locator('[data-org-add-study]').click();
  await page.locator('#orgStudyName').fill('Recurring test study');await page.locator('#orgStudyDate').fill(date);await page.locator('#orgStudyTime').fill('10:00');await fillRepeat('#orgStudyForm');await page.locator('#orgStudyForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].recurrence.frequency),'weekly');
  await page.locator('[data-org-study-log]').click();await page.locator('#orgStudyLogForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].history.length),1);
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].dueDate),await page.evaluate(d=>MinistryRecurrence.addDays(d,7),date));
  await page.locator('[data-org-close=orgStudyDetail]').click();
  // Exercise the actual revisit editor using a disposable seeded pin.
  await page.evaluate(d=>{state.ministryRevisits=[{id:'test-visit',name:'Test return visit',dueDate:d,dueTime:'10:00',status:'active',notify5Min:true,reminderMinutes:5,lat:41.7,lng:-72.7}];MinistryRevisits.open('test-visit');},date);
  await page.locator('[data-rv-view-edit]').click();await fillRepeat('#rvVisitForm');await page.locator('#rvVisitForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>state.ministryRevisits[0].recurrence.frequency),'weekly');
  const feed=await page.evaluate(()=>MinistryCalendarFeed.buildEvents());assert.equal(feed.length,3);assert.ok(feed.every(e=>e.recurrence.frequency==='weekly'));
  // Validate that editing one occasion does not discard recurrence during normalization.
  await page.evaluate(()=>{document.getElementById('rvVisitDialog').close();MinistryOrganizer.openNote(state.ministryNotes[0].id);});
  await page.locator('[data-org-note-edit]').click();await page.locator('#orgNoteTime').fill('13:00');await page.locator('#orgNoteForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.time),'10:00');
  await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.MinistryOrganizer);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence.frequency),'weekly');
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].recurrence.frequency),'weekly');
  assert.equal(await page.evaluate(()=>state.ministryRevisits[0].recurrence.frequency),'weekly');
  // Repeating can be stopped while keeping a one-time appointment.
  await page.evaluate(()=>{switchScreen('notes');MinistryOrganizer.openNote(state.ministryNotes[0].id);});
  await page.getByRole('button',{name:'Manage repeating schedule',exact:true}).click();
  const single=await page.locator('#recOnceDate').inputValue();
  await page.locator('[data-rec-action=stop]').click();
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].recurrence),null);
  assert.equal(await page.evaluate(()=>state.ministryNotes[0].dueDate),single);
  await page.locator('[data-rec-action=close]').click();
  await page.locator('[data-org-close=orgNoteDetail]').click();
  // Permanent edits intentionally re-anchor the future series.
  await page.evaluate(()=>MinistryOrganizer.openStudy(state.ministryBibleStudies[0].id));
  await page.locator('[data-org-study-edit]').click();
  const future=await page.evaluate(d=>MinistryRecurrence.addDays(d,10),date);
  await page.locator('#orgStudyDate').fill(future);await page.locator('#orgStudyTime').fill('09:00');
  await page.locator('#orgStudyForm [data-rec-scope]').selectOption('future');
  await page.locator('#orgStudyForm button[type=submit]').click();
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].recurrence.startDate),future);
  assert.equal(await page.evaluate(()=>state.ministryBibleStudies[0].recurrence.time),'09:00');
  await page.evaluate(()=>{state.lang='es';document.getElementById('orgDialogsHost').remove();MinistryOrganizer.openStudy(state.ministryBibleStudies[0].id);});
  await page.getByRole('button',{name:'Administrar repetición',exact:true}).click();
  await page.screenshot({path:process.env.MINISTRY_DESKTOP ? '/tmp/ministry-recurring-es-desktop.png' : '/tmp/ministry-recurring-es-mobile.png'});
  assert.equal(await page.locator('#recurrenceManager').evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: mobile editor, all three records, moves, pause, paused one-time appointment, resume, skip, log completion, feed payload, edit preservation, reload.');
} finally {await browser.close();}
