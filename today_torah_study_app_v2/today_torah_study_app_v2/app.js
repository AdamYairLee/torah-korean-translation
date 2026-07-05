const APP_PASSWORD = "torah";
const DATA_URL = "data/daily.json";
const GLOSSARY_URL = "data/glossary.json";
const $ = (id) => document.getElementById(id);
const loading=$('loading'), app=$('app'), lockScreen=$('lockScreen'), studyScreen=$('studyScreen');
const passwordInput=$('passwordInput'), unlockBtn=$('unlockBtn'), logoutBtn=$('logoutBtn'), cards=$('cards'), dateLabel=$('dateLabel');
const dateSelect=$('dateSelect'), prevDateBtn=$('prevDateBtn'), nextDateBtn=$('nextDateBtn'), backBtn=$('backBtn');
const tabs=document.querySelectorAll('.tabs button'), bottomBtns=document.querySelectorAll('.bottom-nav button');
const views={today:$('todayView'),archive:$('archiveView'),glossary:$('glossaryView'),settings:$('settingsView')};
const wrongTerm=$('wrongTerm'), rightTerm=$('rightTerm'), addGlossaryBtn=$('addGlossaryBtn'), glossaryList=$('glossaryList'), archiveList=$('archiveList');
let dailyData=[], glossary={terms:[],replacements:{}}, activeFilter='all', selectedDate='', historyStack=['today'];
window.addEventListener('load', async()=>{setTimeout(()=>{loading.classList.add('hidden');app.classList.remove('hidden')},1000);await loadData(); if(localStorage.getItem('torahAppUnlocked')==='true') unlock();});
async function loadData(){const [d,g]=await Promise.all([fetch(DATA_URL),fetch(GLOSSARY_URL)]);dailyData=await d.json();glossary=await g.json();const dates=getDates();selectedDate=dates[0]||'';renderDateSelect();renderGlossary();renderArchive();}
unlockBtn.addEventListener('click',tryUnlock);passwordInput.addEventListener('keydown',e=>{if(e.key==='Enter')tryUnlock()});logoutBtn.addEventListener('click',()=>{localStorage.removeItem('torahAppUnlocked');studyScreen.classList.add('hidden');lockScreen.classList.remove('hidden')});
function tryUnlock(){if(passwordInput.value===APP_PASSWORD){localStorage.setItem('torahAppUnlocked','true');unlock()}else{passwordInput.value='';passwordInput.placeholder='비밀번호가 다릅니다'}}
function unlock(){lockScreen.classList.add('hidden');studyScreen.classList.remove('hidden');showView('today',false);renderCards()}
function getTodayKey(){return new Date().toISOString().slice(0,10)}
function getDates(){const today=getTodayKey();return [...new Set(dailyData.filter(x=>x.date<=today).map(x=>x.date))].sort((a,b)=>b.localeCompare(a));}
function renderDateSelect(){const dates=getDates();dateSelect.innerHTML=dates.map(d=>`<option value="${d}">${d}</option>`).join('');dateSelect.value=selectedDate;}
dateSelect.addEventListener('change',()=>{selectedDate=dateSelect.value;renderCards()});
prevDateBtn.addEventListener('click',()=>moveDate(1));nextDateBtn.addEventListener('click',()=>moveDate(-1));
function moveDate(delta){const dates=getDates();const i=dates.indexOf(selectedDate);const n=i+delta;if(n>=0&&n<dates.length){selectedDate=dates[n];dateSelect.value=selectedDate;renderCards();}}
tabs.forEach(tab=>tab.addEventListener('click',()=>{tabs.forEach(t=>t.classList.remove('active'));tab.classList.add('active');activeFilter=tab.dataset.filter;renderCards()}));
bottomBtns.forEach(btn=>btn.addEventListener('click',()=>showView(btn.dataset.view,true)));
backBtn.addEventListener('click',()=>{historyStack.pop();showView(historyStack.pop()||'today',true)});
function showView(name,push=true){Object.entries(views).forEach(([k,v])=>v.classList.toggle('hidden',k!==name));bottomBtns.forEach(b=>b.classList.toggle('active',b.dataset.view===name));if(push)historyStack.push(name);if(name==='today')renderCards();}
function renderCards(){const items=dailyData.filter(item=>item.date===selectedDate&&(activeFilter==='all'||item.type===activeFilter));dateLabel.textContent=selectedDate?`${selectedDate} 기준 · 이전 공부 메뉴에서 지난 날짜를 볼 수 있습니다.`:'데이터 없음';cards.innerHTML=items.length?items.map(cardTemplate).join(''):'<article class="study-card">이 날짜에는 표시할 데이터가 없습니다.</article>';}
function cardTemplate(item){const translation=applyGlossary(item.translation||'');const originalBlock=item.original?`<div class="original">${escapeHtml(item.original)}</div><div class="divider">번역</div>`:'';const noteBlock=item.note?`<div class="note">${escapeHtml(item.note)}</div>`:'';return `<article class="study-card" data-type="${item.type}"><h2>${escapeHtml(item.title)}</h2><div class="source">${escapeHtml(item.source||'')}</div>${originalBlock}<div class="translation">${escapeHtml(translation)}</div>${noteBlock}</article>`}
function applyGlossary(text){return Object.entries(glossary.replacements||{}).reduce((r,[w,right])=>r.replaceAll(w,right),text)}
addGlossaryBtn.addEventListener('click',()=>{const w=wrongTerm.value.trim(), r=rightTerm.value.trim();if(!w||!r)return;glossary.replacements[w]=r;wrongTerm.value='';rightTerm.value='';renderCards();renderGlossary()});
function renderGlossary(){const repl=Object.entries(glossary.replacements||{}).map(([w,r])=>`<div class="term"><b>${escapeHtml(w)}</b> → ${escapeHtml(r)}</div>`).join('');const terms=(glossary.terms||[]).map(t=>`<div class="term"><b>${escapeHtml(t.preferred)}</b> <span dir="rtl">${escapeHtml(t.source)}</span><br><small>${escapeHtml(t.note||'')}</small></div>`).join('');glossaryList.innerHTML=(repl?'<h3>자동 치환</h3>'+repl:'')+'<h3>고정 용어집</h3>'+terms;}
function renderArchive(){const dates=getDates();archiveList.innerHTML=dates.map(d=>{const count=dailyData.filter(x=>x.date===d).length;return `<div class="archive-item"><div><b>${d}</b><br><small>${count}개 카드</small></div><button data-date="${d}">열기</button></div>`}).join('');archiveList.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{selectedDate=b.dataset.date;dateSelect.value=selectedDate;showView('today',true);renderCards()}));}
function escapeHtml(text){return String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
