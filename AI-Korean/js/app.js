const app = document.getElementById('app');
const CONFIG_FALLBACK = { KOFI_URL: 'https://ko-fi.com/YOUR_KOFI_ID', SITE_NAME: 'AI Korean Master', VERSION: '1.3 Beta' };
const SITE_CONFIG = (typeof CONFIG !== 'undefined') ? { ...CONFIG_FALLBACK, ...CONFIG } : CONFIG_FALLBACK;
let currentVoice = null;
let currentCategory = null;
let currentTestData = [];
let currentTestIndex = 0;
let currentTestFlipped = false;

const curriculumMeta = {
  consonants: {
    titleHe: 'עיצורים',
    titleKo: '자음',
    desc: '한글을 크게 보고, 클릭하면 소리를 들을 수 있습니다.'
  },
  vowels: {
    titleHe: 'תנועות',
    titleKo: '모음',
    desc: '모음은 자모 단독 음성이 부정확할 수 있어 실제 음절(아, 어, 으 등)로 읽게 했습니다.'
  },
  basic_no_patchim: {
    titleHe: 'צירופים בסיסיים בלי פצ׳ים',
    titleKo: '받침 없는 기본 조합',
    desc: '받침 없이 읽는 쉬운 조합입니다.'
  },
  basic_patchim: {
    titleHe: 'צירופים בסיסיים עם פצ׳ים',
    titleKo: '받침 있는 기본 조합',
    desc: '기본 받침을 포함한 단어입니다.'
  },
  medium_patchim: {
    titleHe: 'צירופים בינוניים',
    titleKo: '받침 있는 중등 조합',
    desc: '조금 더 복잡한 받침과 실제 읽기 예시입니다.'
  },
  advanced_patchim: {
    titleHe: 'צירופים מתקדמים',
    titleKo: '받침 있는 고등 조합',
    desc: '겹받침과 실제 발음이 달라지는 예시입니다.'
  }
};



const learningIntros = {
  basic_no_patchim: {
    ko: `받침 없이 자음과 모음만 만나면 한 글자가 됩니다.<br>예를 들어 ㄴ + ㅏ = 나, ㅁ + ㅗ = 모처럼 읽습니다.<br>먼저 받침 없는 글자부터 익히면 한글의 기본 리듬을 쉽게 잡을 수 있습니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `כאשר עיצור ותנועה מתחברים בלי עיצור סופי, נוצרת הברה אחת.<br>לדוגמה: ㄴ + ㅏ = 나, וㅁ + ㅗ = 모.<br>אם מתחילים מהברות בלי עיצור סופי, קל יותר להבין את הקצב הבסיסי של הקוריאנית.<br><br>אז נתחיל?`
  },
  basic_patchim: {
    ko: `한글에서는 글자 아래에 오는 마지막 자음을 받침이라고 합니다.<br>예를 들어 방, 밥, 손처럼 글자의 끝소리를 만들어 줍니다.<br>받침을 익히면 더 많은 한국어 단어를 읽을 수 있습니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בקוריאנית, העיצור שמופיע בתחתית ההברה נקרא פצ׳ים.<br>לדוגמה, במילים 방, 밥, 손 הוא יוצר את הצליל הסופי של ההברה.<br>כשלומדים פצ׳ים, אפשר לקרוא הרבה יותר מילים בקוריאנית.<br><br>אז נתחיל?`
  },
  medium_patchim: {
    ko: `이 단계에서는 받침이 들어간 단어를 조금 더 자연스럽게 읽는 연습을 합니다.<br>글자 하나씩 끊어 읽기보다, 단어 전체의 흐름을 보면서 읽어 보세요.<br>받침 소리가 익숙해지면 한국어 읽기가 훨씬 부드러워집니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בשלב הזה מתרגלים קריאה טבעית יותר של מילים עם פצ׳ים.<br>במקום לקרוא כל הברה בנפרד, נסו לראות את הזרימה של כל המילה.<br>כשהצליל הסופי נעשה מוכר, הקריאה בקוריאנית הופכת להרבה יותר חלקה.<br><br>אז נתחיל?`
  },
  advanced_patchim: {
    ko: `이 단계에서는 읽기 어려운 받침과 복잡한 조합을 연습합니다.<br>어떤 단어는 글자 모양과 실제 소리가 조금 다르게 느껴질 수 있습니다.<br>천천히 보고, 듣고, 다시 읽으면 어려운 단어도 익숙해집니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בשלב הזה מתרגלים פצ׳ים קשים וצירופים מורכבים יותר.<br>בחלק מהמילים, הצורה הכתובה והצליל בפועל עשויים להרגיש מעט שונים.<br>אם מסתכלים לאט, מקשיבים וקוראים שוב, גם מילים קשות נעשות מוכרות.<br><br>אז נתחיל?`
  }
};

let singleModeData = [];
let singleModeIndex = -1;
let singleModeKind = '';
let singleModeFlipped = false;
let singleModeTitle = { he: '', ko: '' };

function pickRandomIndex(length, previousIndex = -1) {
  if (!length) return -1;
  if (length === 1) return 0;
  let next = previousIndex;
  while (next === previousIndex) {
    next = Math.floor(Math.random() * length);
  }
  return next;
}


const todaySeed = new Date().toISOString().slice(0, 10).replace(/-/g, '');

function getDailyIndex(length) {
  if (!length) return 0;
  let n = 0;
  for (const ch of todaySeed) n += ch.charCodeAt(0);
  return n % length;
}

function renderTodayExpressionPlaceholder() {
  return `
    <section class="today-card" id="today-card">
      <div class="today-label">🇰🇷 Today's Korean <span class="korean-sub">(오늘의 표현)</span></div>
      <div class="today-ko">로딩 중...</div>
      <div class="today-he" dir="rtl">טוען...</div>
    </section>
  `;
}

async function hydrateTodayExpression() {
  const box = document.getElementById('today-card');
  if (!box) return;
  try {
    const daily = await loadJson('data/daily.json');
    const item = daily[getDailyIndex(daily.length)] || daily[0];
    if (!item) return;
    box.innerHTML = `
      <div class="today-label">🇰🇷 Today's Korean <span class="korean-sub">(오늘의 표현)</span></div>
      <button class="today-sound" type="button" onclick="speak('${(item.speak || item.ko).replace(/'/g, "\\'")}', 0.82)">🔊</button>
      <div class="today-ko">${item.ko}</div>
      <div class="today-he" dir="rtl">${item.he || ''}</div>
      <button class="today-start" type="button" onclick="loadWordMode('daily')">התחל מהביטוי היומי <span class="korean-sub">(오늘의 표현으로 시작)</span></button>
    `;
  } catch (error) {
    box.innerHTML = `
      <div class="today-label">🇰🇷 Today's Korean <span class="korean-sub">(오늘의 표현)</span></div>
      <div class="today-ko">안녕하세요</div>
      <div class="today-he" dir="rtl">שלום</div>
    `;
  }
}

function renderMain() {
  removeRandomButton();
  app.className = 'fade-in';
  app.innerHTML = `
    <h1 class="main-title">Don't study,<br />Just read first!</h1>
    ${renderTodayExpressionPlaceholder()}
    <div class="btn-group main-menu">
      <button type="button" onclick="showCurriculumMenu()">
        קורס מאסטר לאותיות ותנועות
        <span class="korean-sub">(자·모음 마스터 코스)</span>
      </button>
      <button type="button" onclick="loadPhraseMode('pronunciation')">
        קריאת שיחות אמיתיות
        <span class="korean-sub">(실전 회화 읽기)</span>
      </button>
      <button type="button" onclick="loadWordMode('daily')">
        ביטויים שימושיים ליום-יום
        <span class="korean-sub">(일상 필수 표현)</span>
      </button>
      <button type="button" onclick="loadWordMode('business')">
        ביטויים חיוניים לעסקים
        <span class="korean-sub">(비즈니스 필수 표현)</span>
      </button>
    </div>
    <a href="${SITE_CONFIG.KOFI_URL}" target="_blank" rel="noopener" class="kofi-banner">
      <span class="kofi-heart">☕</span>
      <span>이 프로젝트가 도움이 되셨다면, 다음 레슨과 새로운 콘텐츠 제작을 응원해 주세요.</span>
      <span class="hebrew" dir="rtl">אם הפרויקט עזר לכם, תוכלו לתמוך בפיתוח שיעורים ותכנים חדשים.</span>
    </a>
    <p class="beta-note">Beta Version 1.1 · 히브리어 사용자를 위한 한국어 읽기 중심 학습 프로젝트입니다.</p>
  `;
  hydrateTodayExpression();
}

function getVoicesSafely() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  currentVoice =
    voices.find(v => v.lang === 'ko-KR' && v.name.includes('Google')) ||
    voices.find(v => v.lang === 'ko-KR' && /Yuna|한국|Korean|ko-KR/i.test(v.name)) ||
    voices.find(v => v.lang === 'ko-KR') ||
    voices.find(v => v.lang && v.lang.startsWith('ko')) ||
    null;
}

if ('speechSynthesis' in window) {
  getVoicesSafely();
  window.speechSynthesis.onvoiceschanged = getVoicesSafely;
}

function speak(text, rate = 0.72) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  getVoicesSafely();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ko-KR';
  u.pitch = 1.05;
  u.rate = rate;
  u.volume = 1.0;
  if (currentVoice) u.voice = currentVoice;
  window.speechSynthesis.speak(u);
}

async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} 로드 실패`);
  return res.json();
}

function showError(message) {
  removeRandomButton();
  app.innerHTML = `
    <div class="btn-row"><button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button></div>
    <h2 class="section-title">שגיאה <span class="korean-sub">(오류)</span></h2>
    <p class="section-desc">${message}</p>
  `;
}

function showCurriculumMenu() {
  removeRandomButton();
  app.className = 'fade-in';
  app.innerHTML = `
    <div class="btn-row">
      <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
    </div>
    <h2 class="section-title">קורס קריאה</h2>
    <p class="section-desc">히브리어 먼저, 한글은 괄호로 표시합니다. 학습 본문은 한글을 가장 크게 보여줍니다.</p>
    <div class="btn-group curriculum-grid">
      <button onclick="loadLearning('consonants')">עיצורים <span class="korean-sub">(자음)</span></button>
      <button onclick="loadLearning('vowels')">תנועות <span class="korean-sub">(모음)</span></button>
      <button onclick="showLearningIntro('basic_no_patchim')">צירופים בלי פצ׳ים <span class="korean-sub">(받침 없는 기본 조합)</span></button>
      <button onclick="showLearningIntro('basic_patchim')">צירופים עם פצ׳ים <span class="korean-sub">(받침 있는 기본 조합)</span></button>
      <button onclick="showLearningIntro('medium_patchim')">צירופים בינוניים <span class="korean-sub">(받침 있는 중등 조합)</span></button>
      <button onclick="showLearningIntro('advanced_patchim')">צירופים מתקדמים <span class="korean-sub">(받침 있는 고등 조합)</span></button>
    </div>
  `;
}


function showLearningIntro(category) {
  const meta = curriculumMeta[category] || { titleHe: category, titleKo: category };
  const intro = learningIntros[category];
  if (!intro) {
    loadLearning(category);
    return;
  }
  removeRandomButton();
  app.className = 'fade-in';
  app.innerHTML = `
    <div class="btn-row">
      <button class="nav-btn" onclick="showCurriculumMenu()">חזרה לתפריט הקודם <span class="korean-sub">(이전 메뉴로)</span></button>
      <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
    </div>
    <section class="intro-panel fade-in">
      <h2>${meta.titleHe} <span class="korean-sub">(${meta.titleKo})</span></h2>
      <p class="intro-ko">${intro.ko}</p>
      <p class="intro-he" dir="rtl">${intro.he}</p>
      <button class="primary-btn start-btn" onclick="loadLearning('${category}')">התחלה <span class="korean-sub">(시작하기)</span></button>
    </section>
  `;
}

async function loadLearning(category) {
  try {
    currentCategory = category;
    removeRandomButton();
    const all = await loadJson('data/curriculum.json');
    const data = all.filter(item => item.category === category);
    const meta = curriculumMeta[category] || { titleHe: category, titleKo: category, desc: '' };
    app.className = 'fade-in';
    app.innerHTML = `
      <div class="btn-row">
        <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
        <button class="nav-btn" onclick="showCurriculumMenu()">חזרה לתפריט הקודם <span class="korean-sub">(이전 메뉴로)</span></button>
      </div>
      <h2 class="section-title">${meta.titleHe} <span class="korean-sub">(${meta.titleKo})</span></h2>
      <p class="section-desc">${meta.desc}</p>
      <div class="list-container" id="list-container"></div>
    `;
    renderStudyCards(data);
    addRandomTestButton(category);
  } catch (err) {
    showError(err.message);
  }
}

function renderStudyCards(data) {
  const container = document.getElementById('list-container');
  container.innerHTML = '';
  data.forEach(item => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <p class="ko-big ${item.ko.length > 1 ? 'ko-word' : ''}">${item.ko}</p>
      <div class="roman">${item.roman || ''}</div>
      <div class="he-sound">${item.he_sound || item.he || ''}</div>
      <button class="nav-btn" type="button">🔊 듣기</button>
    `;
    card.addEventListener('click', () => speak(item.speak || item.ko));
    container.appendChild(card);
  });
}

function addRandomTestButton(category) {
  removeRandomButton();
  const btn = document.createElement('button');
  btn.className = 'random-test-btn';
  btn.type = 'button';
  btn.innerHTML = 'מבחן אקראי<br><span class="korean-sub">(랜덤 테스트)</span>';
  btn.onclick = () => startTestMode(category);
  document.body.appendChild(btn);
}

function removeRandomButton() {
  document.querySelectorAll('.random-test-btn').forEach(btn => btn.remove());
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

async function startTestMode(category) {
  try {
    removeRandomButton();
    const all = await loadJson('data/curriculum.json');
    currentTestData = shuffle(all.filter(item => item.category === category));
    currentTestIndex = 0;
    currentTestFlipped = false;
    renderTestCard();
  } catch (err) {
    showError(err.message);
  }
}

function renderTestCard() {
  const item = currentTestData[currentTestIndex];
  if (!item) {
    app.innerHTML = `
      <div class="btn-row">
        <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
        <button class="nav-btn" onclick="showCurriculumMenu()">חזרה לתפריט הקודם <span class="korean-sub">(이전 메뉴로)</span></button>
        <button class="nav-btn" onclick="loadLearning(currentCategory)">חזרה ללימוד <span class="korean-sub">(학습으로)</span></button>
      </div>
      <h2 class="section-title">סימת! <span class="korean-sub">(완료!)</span></h2>
    `;
    return;
  }

  const front = `<div class="test-front">${item.ko}</div>`;
  const back = `
    <div class="test-back">
      <div class="ko-mini">${item.ko}</div>
      <div class="roman">${item.roman || ''}</div>
      <div class="he-sound">${item.he_sound || item.he || ''}</div>
    </div>
  `;

  app.className = 'fade-in';
  app.innerHTML = `
    <div class="btn-row">
      <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
      <button class="nav-btn" onclick="showCurriculumMenu()">חזרה לתפריט הקודם <span class="korean-sub">(이전 메뉴로)</span></button>
      <button class="nav-btn" onclick="loadLearning(currentCategory)">חזרה ללימוד <span class="korean-sub">(학습으로)</span></button>
    </div>
    <div class="test-shell">
      <div class="progress">${currentTestIndex + 1} / ${currentTestData.length}</div>
      <div class="test-card" id="test-card" role="button" tabindex="0" onclick="flipCurrentCard()">${currentTestFlipped ? back : front}</div>
      <div class="btn-row">
        <button class="primary-btn" onclick="flipCurrentCard()">הצג תשובה <span class="korean-sub">(정답 보기)</span></button>
        <button onclick="nextTestCard()">הכרטיס הבא <span class="korean-sub">(다음 카드)</span></button>
      </div>
    </div>
  `;
}

function flipCurrentCard() {
  const item = currentTestData[currentTestIndex];
  if (!item) return;
  currentTestFlipped = !currentTestFlipped;
  speak(item.speak || item.ko);
  renderTestCard();
}

function nextTestCard() {
  currentTestIndex += 1;
  currentTestFlipped = false;
  renderTestCard();
}


async function loadWordMode(kind) {
  try {
    removeRandomButton();
    const file = kind === 'business' ? 'business' : 'daily';
    const titleHe = kind === 'business' ? 'ביטויים חיוניים לעסקים' : 'בטויים שמושיים ליוםיום';
    const titleKo = kind === 'business' ? '비즈니스 필수 표현' : '일상 필수 표현';
    singleModeData = await loadJson(`data/${file}.json`);
    singleModeKind = kind;
    singleModeTitle = { he: titleHe, ko: titleKo };
    singleModeIndex = pickRandomIndex(singleModeData.length);
    singleModeFlipped = false;
    renderSingleModeCard();
  } catch (err) {
    showError(err.message);
  }
}

async function loadPhraseMode() {
  try {
    removeRandomButton();
    singleModeData = await loadJson('data/pronunciation.json');
    singleModeKind = 'pronunciation';
    singleModeTitle = { he: 'קריאת שיחות אמיתיות', ko: '실전 회화 읽기' };
    singleModeIndex = pickRandomIndex(singleModeData.length);
    singleModeFlipped = false;
    renderSingleModeCard();
  } catch (err) {
    showError(err.message);
  }
}

function renderSingleModeCard() {
  const item = singleModeData[singleModeIndex];
  if (!item) {
    showError('표시할 데이터가 없습니다.');
    return;
  }

  const isPhrase = singleModeKind === 'pronunciation';
  const description = isPhrase
    ? '실제 대화에 가까운 문장을 한 장씩 랜덤으로 읽습니다.'
    : '표현을 한 장씩 랜덤으로 읽습니다. 정답을 보기 전에 먼저 한글을 읽어 보세요.';

  app.className = 'fade-in';
  app.innerHTML = `
    <div class="btn-row">
      <button class="nav-btn" onclick="renderMain()">דף ראשי <span class="korean-sub">(메인으로)</span></button>
    </div>
    <h2 class="section-title">${singleModeTitle.he} <span class="korean-sub">(${singleModeTitle.ko})</span></h2>
    <p class="section-desc">${description}</p>
    <section class="single-card-shell">
      <div class="progress">${singleModeIndex + 1} / ${singleModeData.length}</div>
      <article class="single-practice-card ${singleModeFlipped ? 'is-flipped' : ''}" onclick="flipSingleModeCard()">
        <div class="phrase-ko">${item.ko}</div>
        ${singleModeFlipped ? `
          <div class="roman">${item.roman || ''}</div>
          <div class="phrase-he" dir="rtl">${item.he || ''}</div>
        ` : `<div class="hint-text">먼저 한글을 읽어 보세요</div>`}
      </article>
      <div class="btn-row single-controls">
        <button class="primary-btn" onclick="flipSingleModeCard()">הצג תרגום <span class="korean-sub">(정답/번역 보기)</span></button>
        <button onclick="speak(singleModeData[singleModeIndex].speak || singleModeData[singleModeIndex].ko, ${isPhrase ? '0.78' : '0.82'})">🔊 듣기</button>
        <button onclick="nextSingleRandomCard()">כרטיס אקראי הבא <span class="korean-sub">(다음 랜덤 카드)</span></button>
      </div>
    </section>
  `;
}

function flipSingleModeCard() {
  singleModeFlipped = !singleModeFlipped;
  renderSingleModeCard();
}

function nextSingleRandomCard() {
  singleModeIndex = pickRandomIndex(singleModeData.length, singleModeIndex);
  singleModeFlipped = false;
  renderSingleModeCard();
}

renderMain();
