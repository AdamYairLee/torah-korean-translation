"use strict";
(() => {
const cfg = window.TORAH_5787_CONFIG || {};
const entries = [
 {id:"5787-bereshit",book:"bereshit",title:"파라샤트 베레쉬트",subtitle:"“우주의 나이”와 “창조”는 같은 질문인가? (베레쉬트 1:1)",preview:"라쉬는 베레쉬트 1:1의 문법을 설명하면서 이 구절이 창조의 순서를 가르치려는 문장이라고 단정하지 않는다. 그는 “성경은 무엇이 먼저이고 무엇이 나중인지의 연대를 가르치는 것이 아니다(לא לימד המקרא בסדר המוקדמים והמאוחרים כלום)”라고 기록했다. 물론 창조의 날들에 대해서 문자적으로 이해할 내용도 있으나, 여기서 중요한 건 어느 한 견해를 억지로 과학과 대조해 맞추라는 것이 아니고 토라의 고전 주석들 자체가 이미 본문을 시대에 따른 현대식 연대표로 읽지 않았다는 사실이다. (라쉬 또한 그의 생각으로 토라를 주석한 게 아닌, 유대 문헌들을 정리하고 집대성한 의미를 지닌다)"},
 {id:"5787-noach",book:"bereshit",title:"파라샤트 노악흐",subtitle:"토라 이전에 주어진 인류의 법질서",preview:"파라샤트 노악흐는 유대 민족에게 주어진 것보다 앞서 “인류 전체”에게 최소의 법질서를 훨씬 선명하게 해준다. 그마라 산헤드린 편 56a의 바라이타에선 브네이 노악흐(노악흐의 후손이라고도 하지만, 비유대인 전체를 나타내는 범용적 표현이다)에게 7개의 계명이 주어졌다고 정리한다. (노아하이드 7계명)"},
 {id:"5787-lech-lecha",book:"bereshit",title:"파라샤트 렉흐 렉하",subtitle:"단순한 여행이 아닌 정체성의 해체 (베레쉬트 12:1)",preview:"토라는 아브라함에게 단순히 주소를 바꾸라고 하지 않았다. “너의 땅”, “너의 고향”, “네 아버지의 집”은 인간을 규정하는 국가와 문화, 가족의 3개 층이다. 이동은 손실이기도 하지만 동시에 새로운 정체성을 가능하게 하는 조건이다."}
];
const books = [
 {id:"bereshit",label:"베레쉬트"},
 {id:"shemot",label:"시모트"},
 {id:"vayikra",label:"바이크라"},
 {id:"bamidbar",label:"바미드바르"},
 {id:"devarim",label:"드바림"}
];
let activeBook="bereshit"
const $=id=>document.getElementById(id);
const paymentEnabled=!!(cfg.paymentReady && cfg.supabaseUrl && cfg.supabaseAnonKey);
const supa=cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase
  ? window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
let user=null, accessible=new Set(), permanent=new Set(), isAdmin=false;
function message(s){$("account-feedback").textContent=s;}
function make(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;}
function decorateText(parent,text){
  // Parentheses are subtly smaller; Hebrew text gets its own bookish font.
  const parts=String(text).split(/(\([^()]*\))/g);
  for(const part of parts){
    if(!part)continue;
    const isParenthetical=part.startsWith("(")&&part.endsWith(")");
    const outer=isParenthetical?make("span","paren"):parent;
    if(isParenthetical)parent.appendChild(outer);
    const hebrewBits=part.split(/([\u0590-\u05FF][\u0590-\u05FF\s\u05F3\u05F4"'.,:;!?־]*)/g);
    for(const bit of hebrewBits){
      if(!bit)continue;
      if(/[\u0590-\u05FF]/.test(bit)){const h=make("span","hebrew",bit);h.lang="he";h.dir="auto";outer.appendChild(h);}
      else outer.appendChild(document.createTextNode(bit));
    }
  }
}
function formatParagraph(text,className){const p=make("p",className||"");decorateText(p,text);return p;}
function setEnabledLink(a,url,title){
  if(paymentEnabled && /^https:\/\/ko-fi\.com\/[^\s]+$/i.test(url||"")){
    a.href=url;a.classList.remove("disabled");a.removeAttribute("aria-disabled");a.removeAttribute("tabindex");
    a.target="_blank";a.rel="noopener noreferrer";a.textContent=title;return true;
  }
  a.removeAttribute("href");a.classList.add("disabled");a.setAttribute("aria-disabled","true");a.tabIndex=-1;return false;
}
async function invoke(body){
  if(!supa || !user)throw new Error("로그인이 필요합니다.");
  const {data:sessionResult,error:sessionError}=await supa.auth.getSession();
  if(sessionError || !sessionResult?.session?.access_token)throw new Error("로그인 정보가 만료되었습니다.");
  const resp=await fetch(cfg.supabaseUrl.replace(/\/$/,"")+"/functions/v1/"+encodeURIComponent(cfg.edgeFunctionName||"torah-access"),{
    method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+sessionResult.session.access_token,"apikey":cfg.supabaseAnonKey},
    body:JSON.stringify(body)
  });
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw new Error(data.error||"강의 권한을 확인하지 못했습니다.");
  return data;
}
async function refreshLibrary(){
  accessible.clear();permanent.clear();isAdmin=false;
  if(user){
    try{const data=await invoke({action:"library"});accessible=new Set(data.accessibleIds||[]);permanent=new Set(data.permanentIds||[]);isAdmin=!!data.admin;$("member-status").textContent=isAdmin?"관리자 · 전체 열람":user.email;message("");}
    catch(e){$("member-status").textContent="로그인은 되었지만 서버 연결이 필요합니다.";message(e.message);}
  } else {
    $("member-status").textContent=supa?"로그인 전":"로그인·결제 연결 준비 중";
  }
  $("email-form").hidden=!supa || !!user;$("logout").hidden=!user;$("refresh-access").hidden=!user;
  render();
}
function renderBookNav(){
  const nav=$("book-nav");
  if(!nav)return;
  nav.replaceChildren();
  for(const book of books){
    const count=entries.filter(entry=>(entry.book||"bereshit")===book.id).length;
    const btn=make("button","book-tab"+(activeBook===book.id?" active":""));
    btn.type="button";
    btn.setAttribute("aria-pressed",activeBook===book.id?"true":"false");
    btn.textContent=count?book.label+" · "+count:book.label;
    btn.addEventListener("click",()=>{
      activeBook=book.id;
      $("reader").hidden=true;
      $("reader-content").replaceChildren();
      render();
    });
    nav.appendChild(btn);
  }
}
function render(){
  renderBookNav();
  const list=$("lesson-list");list.replaceChildren();
  const visibleEntries=entries.filter(entry=>(entry.book||"bereshit")===activeBook).slice().reverse();
  if(!visibleEntries.length){
    const empty=make("div","empty-book","아직 등록된 파라샤 강의가 없습니다.");
    list.appendChild(empty);
    return;
  }
  for(const entry of visibleEntries){
    const card=make("article","lesson-card");
    const top=make("div","card-top");
    const heading=make("h3","",entry.title);top.appendChild(heading);
    const hasAccess=isAdmin||accessible.has(entry.id);
    const caption=isAdmin?"✓ 관리자 열람":permanent.has(entry.id)?"✓ 영구 열람":hasAccess?"✓ 구독 중 열람 가능":"첫 문단 무료 공개";
    const status=make("span","lesson-status",caption);top.appendChild(status);card.appendChild(top);
    const preview=make("div","preview no-copy");
    const sub=make("div","preview-title");decorateText(sub,entry.subtitle);preview.appendChild(sub);
    preview.appendChild(formatParagraph(entry.preview));
    card.appendChild(preview);
    const actions=make("div","card-actions");
    if(hasAccess){
      const read=make("button","action read-btn","전문 읽기");read.type="button";read.addEventListener("click",()=>openReader(entry));actions.appendChild(read);
    } else {
      const note=make("span","subtext",user?"구독 결제 후 열람 권한을 새로고침하세요. 구독 중에는 발행된 모든 강의를 읽을 수 있습니다.":"월간 구독 후 Ko-fi 결제 이메일로 로그인하면 강의 전문을 읽을 수 있습니다.");
      actions.appendChild(note);
    }
    card.appendChild(actions);list.appendChild(card);
  }
}
async function openReader(entry){
  try{
    $("reader").hidden=false;$("reader-title").textContent=entry.title;
    const out=$("reader-content");out.replaceChildren(make("p","","열람 권한 확인 중…"));
    $("reader").scrollIntoView({behavior:"smooth",block:"start"});
    const data=await invoke({action:"read",articleId:entry.id});
    out.replaceChildren();
    for(const block of data.blocks||[]){
      if(block.type==="heading"){const h=make("h3");decorateText(h,block.text);out.appendChild(h);}
      else if(block.type==="paragraph")out.appendChild(formatParagraph(block.text));
    }
    if(!out.children.length)out.appendChild(make("p","","본문이 아직 게시되지 않았습니다."));
  }catch(e){$("reader-content").replaceChildren(make("p","",e.message));}
}
async function bootAuth(){
  if(!supa){render();return;}
  const {data}=await supa.auth.getUser();user=data?.user||null;await refreshLibrary();
  supa.auth.onAuthStateChange((_event,session)=>{
    // Do not call auth APIs synchronously from onAuthStateChange.
    const next=session?.user||null;user=next;
    Promise.resolve().then(()=>refreshLibrary()).catch(e=>message(e.message));
  });
}
$("email-form").addEventListener("submit",async ev=>{
  ev.preventDefault();
  const email=$("login-email").value.trim();
  if(!email || !supa)return;
  const {error}=await supa.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
  message(error?error.message:"로그인 링크를 이메일로 보냈습니다. 받은편지함을 확인해 주세요.");
});
$("refresh-access").addEventListener("click",async()=>{
  if(!user)return;
  $("refresh-access").disabled=true;
  try{
    await refreshLibrary();
    message(isAdmin?"관리자 전체 열람 권한을 확인했습니다.":accessible.size?("열람 가능한 강의 "+accessible.size+"편을 확인했습니다."):"아직 확인된 구독 결제 기록이 없습니다. Ko-fi에서 사용한 이메일이 같은지 확인하고 잠시 후 다시 시도해 주세요.");
  }finally{$("refresh-access").disabled=false;}
});
$("logout").addEventListener("click",async()=>{if(supa)await supa.auth.signOut();});
$("close-reader").addEventListener("click",()=>{$("reader").hidden=true;$("reader-content").replaceChildren();});
const memberLink=$("membership-buy");
if(!setEnabledLink(memberLink,cfg.membershipUrl,"월간 구독하기 · $6.50/월"))memberLink.textContent="월간 구독 준비 중";
if(!paymentEnabled)message("Ko-fi 멤버십과 회원 열람 권한 확인이 완료되면 월간 구독 버튼이 활성화됩니다.");
render();bootAuth().catch(e=>message(e.message));
// Best-effort copy deterrence, not DRM.
for(const id of ["lesson-list","reader-content"]){
  const el=$(id);
  el.addEventListener("contextmenu",ev=>ev.preventDefault());
  el.addEventListener("dragstart",ev=>ev.preventDefault());
  el.addEventListener("copy",ev=>ev.preventDefault());
  el.addEventListener("cut",ev=>ev.preventDefault());
  el.addEventListener("selectstart",ev=>ev.preventDefault());
}
document.addEventListener("keydown",ev=>{
  const target=ev.target;
  if(target?.closest?.(".lesson-list,.reader-content") && (ev.ctrlKey||ev.metaKey) && ["c","s","p"].includes(ev.key.toLowerCase()))ev.preventDefault();
});
})();