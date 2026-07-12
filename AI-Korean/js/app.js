const app = document.getElementById('app');
const CONFIG_FALLBACK = {
  KOFI_URL: 'https://ko-fi.com/YOUR_KOFI_ID',
  SITE_NAME: 'AI Korean Master',
  VERSION: '1.5 Oral Torah & K-Drama Update',
  WHATSAPP_URL: 'https://wa.me/972502188989?text=Hello!%20I%20am%20interested%20in%20your%20Korean%20learning%20platform.%20I%20would%20like%20to%20discuss%20a%20business%20partnership.',
  OLIVE_YOUNG_URL: 'https://global.oliveyoung.com/if/rd?su=MXJKYTY1',
  TRAVEL_URL: '#',
  EMAIL: 'contact@jewishkorean.com'
};
const SITE_CONFIG = (typeof CONFIG !== 'undefined') ? { ...CONFIG_FALLBACK, ...CONFIG } : CONFIG_FALLBACK;

let UI_LANG = localStorage.getItem('ui_lang') || 'he';
let currentVoice = null;
let currentCategory = null;
let currentTestData = [];
let currentTestIndex = 0;
let currentTestFlipped = false;
let singleModeData = [];
let singleModeIndex = -1;
let singleModeKind = '';
let singleModeFlipped = false;
let singleModeTitle = { he: '', en: '', ko: '' };
let singleModeViewCount = 0;

const UI = {
  he: {
    chooseLanguage: 'בחרו שפה',
    mainCourse: 'קורס מאסטר לאותיות ותנועות',
    realConversation: 'קריאת שיחות אמיתיות',
    daily: 'ביטויים שימושיים ליום-יום',
    business: 'ביטויים חיוניים לעסקים',
    kdrama: 'ביטויים מדרמות קוריאניות',
    todayLabel: '🇰🇷 Today\'s Korean',
    todayStart: 'התחל מהביטוי היומי',
    home: 'דף ראשי',
    back: 'חזרה לתפריט הקודם',
    courseTitle: 'קורס קריאה',
    courseDesc: 'הקוריאנית מוצגת בגדול, והתרגום/ההסבר מוצגים לפי השפה שבחרתם.',
    consonants: 'עיצורים',
    vowels: 'תנועות',
    noPatchim: 'צירופים בלי פצ׳ים',
    basicPatchim: 'צירופים עם פצ׳ים',
    mediumPatchim: 'צירופים בינוניים',
    advancedPatchim: 'צירופים מתקדמים',
    start: 'התחלה',
    randomTest: 'מבחן אקראי',
    showAnswer: 'הצג תשובה',
    showTranslation: 'הצג תרגום',
    nextCard: 'הכרטיס הבא',
    nextRandom: 'כרטיס אקראי הבא',
    backToStudy: 'חזרה ללימוד',
    done: 'סיימת!',
    error: 'שגיאה',
    listen: '🔊 שמע',
    readFirst: 'קודם נסו לקרוא את הקוריאנית',
    noData: 'אין נתונים להצגה.',
    phraseDesc: 'קוראים משפטים קרובים לשיחה אמיתית, כרטיס אחד בכל פעם.',
    wordDesc: 'קוראים ביטויים ככרטיסים אקראיים. נסו לקרוא לפני שמציגים את התרגום.',
    kofiKo: '이 프로젝트가 도움이 되셨다면, 다음 레슨과 새로운 콘텐츠 제작을 응원해 주세요.',
    kofi: 'אם הפרויקט עזר לכם, תוכלו לתמוך בפיתוח שיעורים ותכנים חדשים.',
    beta: 'Beta Version 1.5 · פרויקט ללימוד קריאה בקוריאנית לדוברי עברית ואנגלית.',
    journeyTitle: '🇰🇷 Continue Your Korean Journey',
    journeySub: 'המשיכו לגלות את קוריאה מעבר ללימוד האותיות.',
    beautyTitle: '🧴 Korean Beauty',
    beautyText: 'גלו מוצרי K-Beauty דרך OLIVE YOUNG Global.',
    travelTitle: '✈ Visit Korea',
    travelText: 'מקום עתידי לשיתופי פעולה עם טיולים וחוויות בקוריאה.',
    supportTitle: '🎮 משחק הרכבת מילים בקוריאנית',
    supportText: 'האזינו למילה בקוריאנית והרכיבו אותה מאותיות האנגול.',
    explore: 'פתח',
    businessInquiryTitle: '🤝 Business Inquiry',
    businessInquiryText: 'לשיתופי פעולה, חסויות, תיירות, מוצרים קוריאניים או חינוך קוריאני.',
    whatsapp: '💬 WhatsApp Business',
    email: '📧 Email',
    kdramaDesc: 'קראו ביטויים נפוצים בסגנון דרמות קוריאניות, כרטיס אקראי אחד בכל פעם.',
    kofiPopupTitle: 'נהנים מהלימוד?',
    kofiPopupText: 'אם האתר עוזר לכם ללמוד לקרוא קוריאנית, אפשר לתמוך בהמשך הפיתוח וביצירת שיעורים חדשים.',
    supportOnKofi: 'תמיכה ב-Ko-fi',
    maybeLater: 'אולי אחר כך'
  },
  en: {
    chooseLanguage: 'Choose language',
    mainCourse: 'Hangul Master Course',
    realConversation: 'Real Conversation Reading',
    daily: 'Daily Essential Expressions',
    business: 'Business Essential Expressions',
    kdrama: 'K-Drama Expressions',
    todayLabel: '🇰🇷 Today\'s Korean',
    todayStart: 'Start with today\'s expression',
    home: 'Home',
    back: 'Back to Previous Menu',
    courseTitle: 'Reading Course',
    courseDesc: 'Korean is shown large. The explanation/translation follows the language you select.',
    consonants: 'Consonants',
    vowels: 'Vowels',
    noPatchim: 'Basic syllables without final consonants',
    basicPatchim: 'Basic syllables with final consonants',
    mediumPatchim: 'Intermediate final consonant practice',
    advancedPatchim: 'Advanced final consonant practice',
    start: 'Start',
    randomTest: 'Random Test',
    showAnswer: 'Show Answer',
    showTranslation: 'Show Translation',
    nextCard: 'Next Card',
    nextRandom: 'Next Random Card',
    backToStudy: 'Back to Study',
    done: 'Done!',
    error: 'Error',
    listen: '🔊 Listen',
    readFirst: 'Try to read the Korean first',
    noData: 'No data to display.',
    phraseDesc: 'Read real conversation-style sentences, one random card at a time.',
    wordDesc: 'Read expressions one random card at a time. Try reading before showing the translation.',
    kofiKo: '이 프로젝트가 도움이 되셨다면, 다음 레슨과 새로운 콘텐츠 제작을 응원해 주세요.',
    kofi: 'If this project helped you, you can support the creation of new Korean lessons and content.',
    beta: 'Beta Version 1.5 · Korean reading-first learning project for Hebrew and English speakers.',
    journeyTitle: '🇰🇷 Continue Your Korean Journey',
    journeySub: 'Discover more of Korea beyond learning Hangul.',
    beautyTitle: '🧴 Korean Beauty',
    beautyText: 'Explore K-Beauty products through OLIVE YOUNG Global.',
    travelTitle: '✈ Visit Korea',
    travelText: 'A future space for travel partners, tours, and Korea experiences.',
    supportTitle: '🎮 Korean Letter Game',
    supportText: 'Listen to a Korean word and build it with Hangul letters.',
    explore: 'Explore',
    businessInquiryTitle: '🤝 Business Inquiry',
    businessInquiryText: 'For partnerships, sponsorships, Korean travel, Korean products, or Korean education collaboration.',
    whatsapp: '💬 WhatsApp Business',
    email: '📧 Email',
    kdramaDesc: 'Read common K-drama-style expressions, one random card at a time.',
    kofiPopupTitle: 'Enjoying the lesson?',
    kofiPopupText: 'If this site helps you learn to read Korean, you can support the next lessons and new content.',
    supportOnKofi: 'Support on Ko-fi',
    maybeLater: 'Maybe later'
  }
};

const curriculumMeta = {
  consonants: { title: { he: 'עיצורים', en: 'Consonants' }, titleKo: '자음', desc: { he: 'ראו את האותיות הקוריאניות בגדול ולחצו כדי לשמוע.', en: 'See the Korean letters large and click to hear the sound.' } },
  vowels: { title: { he: 'תנועות', en: 'Vowels' }, titleKo: '모음', desc: { he: 'כדי לשפר את הדיוק, התנועות נקראות כהברות אמיתיות כמו 아, 어, 으.', en: 'For better TTS accuracy, vowels are spoken as real syllables such as 아, 어, 으.' } },
  basic_no_patchim: { title: { he: 'צירופים בסיסיים בלי פצ׳ים', en: 'Basic syllables without final consonants' }, titleKo: '받침 없는 기본 조합', desc: { he: 'צירופים פשוטים ללא עיצור סופי.', en: 'Easy combinations without a final consonant.' } },
  basic_patchim: { title: { he: 'צירופים בסיסיים עם פצ׳ים', en: 'Basic syllables with final consonants' }, titleKo: '받침 있는 기본 조합', desc: { he: 'מילים עם פצ׳ים בסיסי.', en: 'Words that include basic final consonants.' } },
  medium_patchim: { title: { he: 'צירופים בינוניים', en: 'Intermediate final consonant practice' }, titleKo: '받침 있는 중등 조합', desc: { he: 'דוגמאות קריאה עם פצ׳ים מעט מורכבים יותר.', en: 'Reading examples with slightly more complex final consonants.' } },
  advanced_patchim: { title: { he: 'צירופים מתקדמים', en: 'Advanced final consonant practice' }, titleKo: '받침 있는 고등 조합', desc: { he: 'דוגמאות עם פצ׳ים מורכבים וצלילים שמשתנים בקריאה אמיתית.', en: 'Examples with complex final consonants and sounds that may change in real reading.' } }
};

const learningIntros = {
  basic_no_patchim: {
    ko: `받침 없이 자음과 모음만 만나면 한 글자가 됩니다.<br>예를 들어 ㄴ + ㅏ = 나, ㅁ + ㅗ = 모처럼 읽습니다.<br>먼저 받침 없는 글자부터 익히면 한글의 기본 리듬을 쉽게 잡을 수 있습니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `כאשר עיצור ותנועה מתחברים בלי עיצור סופי, נוצרת הברה אחת.<br>לדוגמה: ㄴ + ㅏ = 나, וㅁ + ㅗ = 모.<br>אם מתחילים מהברות בלי עיצור סופי, קל יותר להבין את הקצב הבסיסי של הקוריאנית.<br><br>אז נתחיל?`,
    en: `When a consonant and a vowel meet without a final consonant, they form one syllable.<br>For example: ㄴ + ㅏ = 나, and ㅁ + ㅗ = 모.<br>Starting with syllables without final consonants helps you feel the basic rhythm of Korean.<br><br>Ready to begin?`
  },
  basic_patchim: {
    ko: `한글에서는 글자 아래에 오는 마지막 자음을 받침이라고 합니다.<br>예를 들어 방, 밥, 손처럼 글자의 끝소리를 만들어 줍니다.<br>받침을 익히면 더 많은 한국어 단어를 읽을 수 있습니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בקוריאנית, העיצור שמופיע בתחתית ההברה נקרא פצ׳ים.<br>לדוגמה, במילים 방, 밥, 손 הוא יוצר את הצליל הסופי של ההברה.<br>כשלומדים פצ׳ים, אפשר לקרוא הרבה יותר מילים בקוריאנית.<br><br>אז נתחיל?`,
    en: `In Korean, the final consonant placed at the bottom of a syllable is called patchim.<br>For example, in 방, 밥, and 손, it creates the ending sound of the syllable.<br>Learning patchim helps you read many more Korean words.<br><br>Ready to begin?`
  },
  medium_patchim: {
    ko: `이 단계에서는 받침이 들어간 단어를 조금 더 자연스럽게 읽는 연습을 합니다.<br>글자 하나씩 끊어 읽기보다, 단어 전체의 흐름을 보면서 읽어 보세요.<br>받침 소리가 익숙해지면 한국어 읽기가 훨씬 부드러워집니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בשלב הזה מתרגלים קריאה טבעית יותר של מילים עם פצ׳ים.<br>במקום לקרוא כל הברה בנפרד, נסו לראות את הזרימה של כל המילה.<br>כשהצליל הסופי נעשה מוכר, הקריאה בקוריאנית הופכת להרבה יותר חלקה.<br><br>אז נתחיל?`,
    en: `In this stage, you practice reading words with final consonants more naturally.<br>Instead of cutting every syllable separately, try to see the flow of the whole word.<br>Once final consonant sounds become familiar, Korean reading becomes much smoother.<br><br>Ready to begin?`
  },
  advanced_patchim: {
    ko: `이 단계에서는 읽기 어려운 받침과 복잡한 조합을 연습합니다.<br>어떤 단어는 글자 모양과 실제 소리가 조금 다르게 느껴질 수 있습니다.<br>천천히 보고, 듣고, 다시 읽으면 어려운 단어도 익숙해집니다.<br><br>자, 그럼 시작해 볼까요?`,
    he: `בשלב הזה מתרגלים פצ׳ים קשים וצירופים מורכבים יותר.<br>בחלק מהמילים, הצורה הכתובה והצליל בפועל עשויים להרגיש מעט שונים.<br>אם מסתכלים לאט, מקשיבים וקוראים שוב, גם מילים קשות נעשות מוכרות.<br><br>אז נתחיל?`,
    en: `In this stage, you practice difficult final consonants and more complex combinations.<br>Some words may feel slightly different between their written form and actual sound.<br>If you look slowly, listen, and read again, even difficult words become familiar.<br><br>Ready to begin?`
  }
};

function t(key) { return (UI[UI_LANG] && UI[UI_LANG][key]) || UI.he[key] || key; }
function isHebrewMode() { return UI_LANG === 'he'; }
function dirAttr() { return isHebrewMode() ? 'dir="rtl" class="hebrew"' : 'dir="ltr"'; }
function textByLang(obj) { if (!obj) return ''; return typeof obj === 'string' ? obj : (obj[UI_LANG] || (UI_LANG === 'he' ? obj.he : obj.en) || ''); }
function itemTranslation(item) { return item[UI_LANG] || (UI_LANG === 'he' ? (item.he || item.he_sound || '') : (item.en || item.en_sound || '')); }
function itemSoundHint(item) { return UI_LANG === 'he' ? (item.he_sound || item.he || '') : (item.en_sound || item.en || ''); }
function setLang(lang) { UI_LANG = lang; localStorage.setItem('ui_lang', lang); renderMain(); }
function renderLangSwitch() {
  return `<div class="lang-switch" aria-label="Language selector">
    <span>${t('chooseLanguage')}</span>
    <button type="button" class="${UI_LANG === 'he' ? 'active' : ''}" onclick="setLang('he')">עברית</button>
    <button type="button" class="${UI_LANG === 'en' ? 'active' : ''}" onclick="setLang('en')">English</button>
  </div>`;
}
function trackEvent(name, params = {}) { if (typeof gtag === 'function') gtag('event', name, params); }
function outbound(url, eventName) { trackEvent(eventName || 'outbound_click', { link_url: url }); window.open(url, '_blank', 'noopener'); }

function pickRandomIndex(length, previousIndex = -1) {
  if (!length) return -1;
  if (length === 1) return 0;
  let next = previousIndex;
  while (next === previousIndex) next = Math.floor(Math.random() * length);
  return next;
}

const todaySeed = new Date().toISOString().slice(0, 10).replace(/-/g, '');
function getDailyIndex(length) { if (!length) return 0; let n = 0; for (const ch of todaySeed) n += ch.charCodeAt(0); return n % length; }

function renderTodayExpressionPlaceholder() {
  return `<section class="today-card" id="today-card">
    <div class="today-label">${t('todayLabel')} <span class="korean-sub">(오늘의 표현)</span></div>
    <div class="today-ko">로딩 중...</div>
    <div class="today-he" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${isHebrewMode() ? 'טוען...' : 'Loading...'}</div>
  </section>`;
}

async function hydrateTodayExpression() {
  const box = document.getElementById('today-card');
  if (!box) return;
  try {
    const daily = await loadJson('data/daily.json');
    const item = daily[getDailyIndex(daily.length)] || daily[0];
    if (!item) return;
    const translated = itemTranslation(item);
    box.innerHTML = `
      <div class="today-label">${t('todayLabel')} <span class="korean-sub">(오늘의 표현)</span></div>
      <button class="today-sound" type="button" onclick="speak('${(item.speak || item.ko).replace(/'/g, "\\'")}', 0.82); trackEvent('listen_today')">🔊</button>
      <div class="today-ko">${item.ko}</div>
      <div class="today-he" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${translated}</div>
      <button class="today-start" type="button" onclick="loadWordMode('daily'); trackEvent('start_today_expression')">${t('todayStart')} <span class="korean-sub">(오늘의 표현으로 시작)</span></button>
    `;
  } catch (error) {
    box.innerHTML = `<div class="today-label">${t('todayLabel')} <span class="korean-sub">(오늘의 표현)</span></div><div class="today-ko">안녕하세요</div><div class="today-he" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${isHebrewMode() ? 'שלום' : 'Hello'}</div>`;
  }
}

function renderJourneySection() {
  return `<section class="journey-section">
    <h2>${t('journeyTitle')}</h2>
    <p class="journey-sub" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${t('journeySub')}</p>
    <div class="journey-grid">
      <button type="button" class="journey-card" onclick="outbound(SITE_CONFIG.OLIVE_YOUNG_URL, 'click_olive_young')"><h3>${t('beautyTitle')}</h3><p>${t('beautyText')}</p><span>${t('explore')}</span></button>
      <button type="button" class="journey-card" onclick="outbound(SITE_CONFIG.TRAVEL_URL, 'click_travel_partner')"><h3>${t('travelTitle')}</h3><p>${t('travelText')}</p><span>${t('explore')}</span></button>
      <button type="button" class="journey-card" onclick="outbound(SITE_CONFIG.KOFI_URL, 'click_kofi_journey')"><h3>${t('supportTitle')}</h3><p>${t('supportText')}</p><span>Ko-fi</span></button>
    </div>
  </section>`;
}

function renderBusinessInquiry() {
  return `<section class="business-contact">
    <h2>${t('businessInquiryTitle')}</h2>
    <p ${isHebrewMode() ? 'dir="rtl" class="hebrew"' : 'dir="ltr"'}>${t('businessInquiryText')}</p>
    <div class="business-contact-buttons">
      <button type="button" class="business-btn" onclick="outbound(SITE_CONFIG.WHATSAPP_URL, 'click_whatsapp_business')">${t('whatsapp')}</button>
      <button type="button" class="business-btn" onclick="window.location.href='mailto:'+SITE_CONFIG.EMAIL+'?subject=Business%20Inquiry'; trackEvent('click_email_business')">${t('email')}</button>
    </div>
  </section>`;
}

function renderMain() {
  removeRandomButton();
  app.className = 'fade-in';
  app.innerHTML = `
    ${renderLangSwitch()}
    <h1 class="main-title">Don't study,<br />Just read first!</h1>
    ${renderTodayExpressionPlaceholder()}
    <div class="btn-group main-menu">
      <button type="button" onclick="showCurriculumMenu(); trackEvent('open_curriculum')">${t('mainCourse')}<span class="korean-sub">(자·모음 마스터 코스)</span></button>
      <button type="button" onclick="loadPhraseMode('pronunciation'); trackEvent('open_real_conversation')">${t('realConversation')}<span class="korean-sub">(실전 회화 읽기)</span></button>
      <button type="button" onclick="loadWordMode('daily'); trackEvent('open_daily')">${t('daily')}<span class="korean-sub">(일상 필수 표현)</span></button>
      <button type="button" onclick="loadWordMode('business'); trackEvent('open_business')">${t('business')}<span class="korean-sub">(비즈니스 필수 표현)</span></button>
      <button type="button" onclick="loadWordMode('kdrama'); trackEvent('open_kdrama')">🎬 ${t('kdrama')}<span class="korean-sub">(한국 드라마 회화 표현)</span></button>
    </div>
    <a href="${SITE_CONFIG.KOFI_URL}" target="_blank" rel="noopener" class="kofi-banner" onclick="trackEvent('click_kofi_main')">
      <span class="kofi-heart">☕</span>
      <span>${t('kofiKo')}</span>
      <span ${isHebrewMode() ? 'class="hebrew" dir="rtl"' : 'dir="ltr"'}>${t('kofi')}</span>
    </a>
    ${renderJourneySection()}
    ${renderBusinessInquiry()}
    <p class="beta-note">${t('beta')}</p>
  `;
  hydrateTodayExpression();
}

function getVoicesSafely() {
  const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
  currentVoice = voices.find(v => v.lang === 'ko-KR' && v.name.includes('Google')) || voices.find(v => v.lang === 'ko-KR' && /Yuna|한국|Korean|ko-KR/i.test(v.name)) || voices.find(v => v.lang === 'ko-KR') || voices.find(v => v.lang && v.lang.startsWith('ko')) || null;
}
if ('speechSynthesis' in window) { getVoicesSafely(); window.speechSynthesis.onvoiceschanged = getVoicesSafely; }
function speak(text, rate = 0.72) { if (!('speechSynthesis' in window)) return; window.speechSynthesis.cancel(); getVoicesSafely(); const u = new SpeechSynthesisUtterance(text); u.lang = 'ko-KR'; u.pitch = 1.05; u.rate = rate; u.volume = 1.0; if (currentVoice) u.voice = currentVoice; window.speechSynthesis.speak(u); }
async function loadJson(path) { const res = await fetch(path, { cache: 'no-store' }); if (!res.ok) throw new Error(`${path} 로드 실패`); return res.json(); }

function showError(message) { removeRandomButton(); app.innerHTML = `<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button></div><h2 class="section-title">${t('error')} <span class="korean-sub">(오류)</span></h2><p class="section-desc">${message}</p>`; }

function showCurriculumMenu() {
  removeRandomButton(); app.className = 'fade-in';
  app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button></div><h2 class="section-title">${t('courseTitle')}</h2><p class="section-desc" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${t('courseDesc')}</p><div class="btn-group curriculum-grid">
      <button onclick="loadLearning('consonants')">${t('consonants')} <span class="korean-sub">(자음)</span></button>
      <button onclick="loadLearning('vowels')">${t('vowels')} <span class="korean-sub">(모음)</span></button>
      <button onclick="showLearningIntro('basic_no_patchim')">${t('noPatchim')} <span class="korean-sub">(받침 없는 기본 조합)</span></button>
      <button onclick="showLearningIntro('basic_patchim')">${t('basicPatchim')} <span class="korean-sub">(받침 있는 기본 조합)</span></button>
      <button onclick="showLearningIntro('medium_patchim')">${t('mediumPatchim')} <span class="korean-sub">(받침 있는 중등 조합)</span></button>
      <button onclick="showLearningIntro('advanced_patchim')">${t('advancedPatchim')} <span class="korean-sub">(받침 있는 고등 조합)</span></button>
    </div>`;
}

function showLearningIntro(category) {
  const meta = curriculumMeta[category] || { title: { he: category, en: category }, titleKo: category };
  const intro = learningIntros[category];
  if (!intro) { loadLearning(category); return; }
  removeRandomButton(); app.className = 'fade-in';
  app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="showCurriculumMenu()">${t('back')} <span class="korean-sub">(이전 메뉴로)</span></button><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button></div><section class="intro-panel fade-in"><h2>${textByLang(meta.title)} <span class="korean-sub">(${meta.titleKo})</span></h2><p class="intro-ko">${intro.ko}</p><p class="intro-he" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${intro[UI_LANG] || intro.he}</p><button class="primary-btn start-btn" onclick="loadLearning('${category}')">${t('start')} <span class="korean-sub">(시작하기)</span></button></section>`;
}

async function loadLearning(category) {
  try {
    currentCategory = category; removeRandomButton();
    const all = await loadJson('data/curriculum.json'); const data = all.filter(item => item.category === category);
    const meta = curriculumMeta[category] || { title: { he: category, en: category }, titleKo: category, desc: { he: '', en: '' } };
    app.className = 'fade-in';
    app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button><button class="nav-btn" onclick="showCurriculumMenu()">${t('back')} <span class="korean-sub">(이전 메뉴로)</span></button></div><h2 class="section-title">${textByLang(meta.title)} <span class="korean-sub">(${meta.titleKo})</span></h2><p class="section-desc" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${textByLang(meta.desc)}</p><div class="list-container" id="list-container"></div>`;
    renderStudyCards(data); addRandomTestButton(category);
  } catch (err) { showError(err.message); }
}

function renderStudyCards(data) {
  const container = document.getElementById('list-container'); container.innerHTML = '';
  data.forEach(item => { const card = document.createElement('article'); card.className = 'card'; card.innerHTML = `<p class="ko-big ${item.ko.length > 1 ? 'ko-word' : ''}">${item.ko}</p><div class="roman">${item.roman || ''}</div><div class="he-sound" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${itemSoundHint(item)}</div><button class="nav-btn" type="button">${t('listen')}</button>`; card.addEventListener('click', () => { speak(item.speak || item.ko); trackEvent('listen_curriculum', { category: item.category || currentCategory }); }); container.appendChild(card); });
}

function addRandomTestButton(category) { removeRandomButton(); const btn = document.createElement('button'); btn.className = 'random-test-btn'; btn.type = 'button'; btn.innerHTML = `${t('randomTest')}<br><span class="korean-sub">(랜덤 테스트)</span>`; btn.onclick = () => startTestMode(category); document.body.appendChild(btn); }
function removeRandomButton() { document.querySelectorAll('.random-test-btn').forEach(btn => btn.remove()); }
function shuffle(items) { return [...items].sort(() => Math.random() - 0.5); }
async function startTestMode(category) { try { removeRandomButton(); const all = await loadJson('data/curriculum.json'); currentTestData = shuffle(all.filter(item => item.category === category)); currentTestIndex = 0; currentTestFlipped = false; renderTestCard(); } catch (err) { showError(err.message); } }

function renderTestCard() {
  const item = currentTestData[currentTestIndex];
  if (!item) { app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button><button class="nav-btn" onclick="showCurriculumMenu()">${t('back')} <span class="korean-sub">(이전 메뉴로)</span></button><button class="nav-btn" onclick="loadLearning(currentCategory)">${t('backToStudy')} <span class="korean-sub">(학습으로)</span></button></div><h2 class="section-title">${t('done')} <span class="korean-sub">(완료!)</span></h2>`; return; }
  const front = `<div class="test-front">${item.ko}</div>`;
  const back = `<div class="test-back"><div class="ko-mini">${item.ko}</div><div class="roman">${item.roman || ''}</div><div class="he-sound" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${itemSoundHint(item)}</div></div>`;
  app.className = 'fade-in';
  app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button><button class="nav-btn" onclick="showCurriculumMenu()">${t('back')} <span class="korean-sub">(이전 메뉴로)</span></button><button class="nav-btn" onclick="loadLearning(currentCategory)">${t('backToStudy')} <span class="korean-sub">(학습으로)</span></button></div><div class="test-shell"><div class="progress">${currentTestIndex + 1} / ${currentTestData.length}</div><div class="test-card" id="test-card" role="button" tabindex="0" onclick="flipCurrentCard()">${currentTestFlipped ? back : front}</div><div class="btn-row"><button class="primary-btn" onclick="flipCurrentCard()">${t('showAnswer')} <span class="korean-sub">(정답 보기)</span></button><button onclick="nextTestCard()">${t('nextCard')} <span class="korean-sub">(다음 카드)</span></button></div></div>`;
}
function flipCurrentCard() { const item = currentTestData[currentTestIndex]; if (!item) return; currentTestFlipped = !currentTestFlipped; speak(item.speak || item.ko); renderTestCard(); }
function nextTestCard() { currentTestIndex += 1; currentTestFlipped = false; renderTestCard(); }


function shouldShowLearningSupportPrompt() {
  return !localStorage.getItem('kofiLearningPromptShown') && singleModeViewCount >= 15;
}

function maybeShowLearningSupportPrompt() {
  if (!shouldShowLearningSupportPrompt()) return;
  localStorage.setItem('kofiLearningPromptShown', '1');
  trackEvent('show_kofi_learning_prompt', { mode: singleModeKind });
  const overlay = document.createElement('div');
  overlay.className = 'support-modal-overlay';
  overlay.innerHTML = `
    <div class="support-modal">
      <h2>${t('kofiPopupTitle')}</h2>
      <p ${isHebrewMode() ? 'dir="rtl" class="hebrew"' : 'dir="ltr"'}>${t('kofiPopupText')}</p>
      <div class="support-modal-actions">
        <button type="button" class="primary-btn" onclick="outbound(SITE_CONFIG.KOFI_URL, 'click_kofi_learning_prompt'); this.closest('.support-modal-overlay').remove();">${t('supportOnKofi')}</button>
        <button type="button" onclick="trackEvent('dismiss_kofi_learning_prompt'); this.closest('.support-modal-overlay').remove();">${t('maybeLater')}</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function registerSingleModeCardView() {
  singleModeViewCount += 1;
  setTimeout(maybeShowLearningSupportPrompt, 150);
}

async function loadWordMode(kind) {
  try {
    removeRandomButton();
    let file = 'daily';
    let title = { he: UI.he.daily, en: UI.en.daily, ko: '일상 필수 표현' };
    if (kind === 'business') { file = 'business'; title = { he: UI.he.business, en: UI.en.business, ko: '비즈니스 필수 표현' }; }
    if (kind === 'kdrama') { file = 'kdrama'; title = { he: UI.he.kdrama, en: UI.en.kdrama, ko: '한국 드라마 회화 표현' }; }
    singleModeData = await loadJson(`data/${file}.json`);
    singleModeKind = kind;
    singleModeTitle = title;
    singleModeViewCount = 0;
    singleModeIndex = pickRandomIndex(singleModeData.length);
    singleModeFlipped = false;
    registerSingleModeCardView();
    renderSingleModeCard();
  }
  catch (err) { showError(err.message); }
}
async function loadPhraseMode() { try { removeRandomButton(); singleModeData = await loadJson('data/pronunciation.json'); singleModeKind = 'pronunciation'; singleModeTitle = { he: UI.he.realConversation, en: UI.en.realConversation, ko: '실전 회화 읽기' }; singleModeViewCount = 0; singleModeIndex = pickRandomIndex(singleModeData.length); singleModeFlipped = false; registerSingleModeCardView(); renderSingleModeCard(); } catch (err) { showError(err.message); } }

function renderSingleModeCard() {
  const item = singleModeData[singleModeIndex]; if (!item) { showError(t('noData')); return; }
  const isPhrase = singleModeKind === 'pronunciation'; const description = singleModeKind === 'kdrama' ? t('kdramaDesc') : (isPhrase ? t('phraseDesc') : t('wordDesc'));
  const translated = itemTranslation(item);
  app.className = 'fade-in';
  app.innerHTML = `${renderLangSwitch()}<div class="btn-row"><button class="nav-btn" onclick="renderMain()">${t('home')} <span class="korean-sub">(메인으로)</span></button></div><h2 class="section-title">${singleModeTitle[UI_LANG] || singleModeTitle.he} <span class="korean-sub">(${singleModeTitle.ko})</span></h2><p class="section-desc" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${description}</p><section class="single-card-shell"><div class="progress">${singleModeIndex + 1} / ${singleModeData.length}</div><article class="single-practice-card ${singleModeFlipped ? 'is-flipped' : ''}" onclick="flipSingleModeCard()"><div class="phrase-ko">${item.ko}</div>${singleModeFlipped ? `<div class="roman">${item.roman || ''}</div><div class="phrase-he" ${isHebrewMode() ? 'dir="rtl"' : 'dir="ltr"'}>${translated}</div>` : `<div class="hint-text">${t('readFirst')}</div>`}</article><div class="btn-row single-controls"><button class="primary-btn" onclick="flipSingleModeCard()">${t('showTranslation')} <span class="korean-sub">(정답/번역 보기)</span></button><button onclick="speak(singleModeData[singleModeIndex].speak || singleModeData[singleModeIndex].ko, ${isPhrase ? '0.78' : '0.82'}); trackEvent('listen_single_card', { mode: singleModeKind })">${t('listen')}</button><button onclick="nextSingleRandomCard()">${t('nextRandom')} <span class="korean-sub">(다음 랜덤 카드)</span></button></div></section>`;
}
function flipSingleModeCard() { singleModeFlipped = !singleModeFlipped; renderSingleModeCard(); }
function nextSingleRandomCard() { singleModeIndex = pickRandomIndex(singleModeData.length, singleModeIndex); singleModeFlipped = false; registerSingleModeCardView(); renderSingleModeCard(); }

renderMain();


/* ==================================================
   Continue Your Korean Journey:
   두 번째 Ko-fi 버튼을 한글 게임 버튼으로 교체
================================================== */

(function setupKoreanGameEntry() {
    function getGameUrl() {
    const currentLanguage = getMainAppLanguage();

    if (currentLanguage === "en") {
      return "./game/index.html?lang=en";
    }

    return "./game/index.html?lang=he";
  }

  function getMainAppLanguage() {
    const possibleKeys = [
      "language",
      "selectedLanguage",
      "appLanguage",
      "currentLang",
      "aiKoreanLanguage"
    ];

    for (const key of possibleKeys) {
      const savedValue = localStorage.getItem(key);

      if (savedValue === "en") {
        return "en";
      }

      if (savedValue === "he") {
        return "he";
      }
    }

    const htmlLanguage =
      document.documentElement.lang?.toLowerCase();

    if (htmlLanguage?.startsWith("en")) {
      return "en";
    }

    return "he";
  }

  function getGameButtonText() {
    return getMainAppLanguage() === "en"
      ? "Korean Letter Game"
      : "משחק אותיות בקוריאנית";
  }

  function convertSecondKofiButton() {
    /*
      현재 화면에 생성된 모든 Ko-fi 링크를 찾습니다.
      위쪽 후원 링크가 첫 번째,
      Continue Your Korean Journey 안의 중복 링크가 두 번째입니다.
    */
    const kofiLinks = Array.from(
      document.querySelectorAll(
        'a[href*="ko-fi.com"], a[href*="ko-fi"]'
      )
    );

    if (kofiLinks.length < 2) {
      return false;
    }

    /*
      마지막 Ko-fi 링크를 사용합니다.
      두 개가 있다면 두 번째 링크가 선택됩니다.
    */
    const duplicateKofiButton =
      kofiLinks[kofiLinks.length - 1];

    if (
      duplicateKofiButton.dataset.gameConverted === "true"
    ) {
      updateGameButtonLanguage(duplicateKofiButton);
      return true;
    }

    duplicateKofiButton.href = getGameUrl();
    duplicateKofiButton.removeAttribute("target");
    duplicateKofiButton.removeAttribute("rel");

    duplicateKofiButton.id = "koreanGameEntryButton";

    duplicateKofiButton.classList.add(
      "korean-game-entry-button"
    );

    duplicateKofiButton.dataset.gameConverted = "true";

    duplicateKofiButton.innerHTML = `
      <span
        class="korean-game-entry-icon"
        aria-hidden="true"
      >
        🎮
      </span>

      <span class="korean-game-entry-label">
        ${getGameButtonText()}
      </span>
    `;

    duplicateKofiButton.setAttribute(
      "aria-label",
      getGameButtonText()
    );

    return true;
  }

  function updateGameButtonLanguage(button) {
    const gameButton =
      button ||
      document.getElementById("koreanGameEntryButton");

    if (!gameButton) {
      return;
    }

    const label = gameButton.querySelector(
      ".korean-game-entry-label"
    );

    const translatedText = getGameButtonText();

    if (label) {
      label.textContent = translatedText;
    }

    gameButton.setAttribute(
      "aria-label",
      translatedText
    );
  }

  /*
    앱이 시작된 뒤 카드와 Ko-fi 링크가 생성될 수 있기 때문에
    화면 변경을 계속 감시합니다.
  */
  const observer = new MutationObserver(() => {
    convertSecondKofiButton();
  });

  function startGameButtonSetup() {
    convertSecondKofiButton();

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    /*
      기존 히브리어/영어 버튼을 눌렀을 때
      게임 버튼 문구도 함께 다시 확인합니다.
    */
    document.addEventListener("click", () => {
      window.setTimeout(() => {
        updateGameButtonLanguage();
      }, 100);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      startGameButtonSetup
    );
  } else {
    startGameButtonSetup();
  }
})();

/* =====================================================
   Continue Your Korean Journey의 Support 카드를
   Korean Letter Game 카드로 변경
===================================================== */

(function connectKoreanLetterGameCard() {
  
  const GAME_TITLES = [
    "Korean Letter Game",
    "משחק הרכבת מילים בקוריאנית"
  ];

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isGameTitleElement(element) {
    const text = normalizeText(element.textContent);

    return GAME_TITLES.some((title) => text.includes(title));
  }

  function findGameTitle() {
    const possibleTitles = document.querySelectorAll(
      "h1, h2, h3, h4, h5, strong, .title, .card-title"
    );

    return Array.from(possibleTitles).find(isGameTitleElement) || null;
  }

  function findGameCard(titleElement) {
    if (!titleElement) {
      return null;
    }

    /*
      카드에 자주 사용되는 태그와 클래스부터 찾습니다.
      정확한 클래스 이름을 몰라도 작동하도록 여러 형태를 검사합니다.
    */
    return (
      titleElement.closest(
        "a, article, li, .journey-card, .affiliate-card, .resource-card, .card"
      ) ||
      titleElement.parentElement?.parentElement ||
      titleElement.parentElement
    );
  }

  function getCurrentGameLanguage() {
    const htmlLanguage =
      document.documentElement.lang?.toLowerCase() || "";

    if (htmlLanguage.startsWith("en")) {
      return "en";
    }

    const storedKeys = [
      "language",
      "selectedLanguage",
      "appLanguage",
      "currentLang",
      "aiKoreanLanguage"
    ];

    for (const key of storedKeys) {
      const value = localStorage.getItem(key);

      if (value === "en") {
        return "en";
      }

      if (value === "he") {
        return "he";
      }
    }

    return "he";
  }

  function getPlayText() {
    return getCurrentGameLanguage() === "en"
      ? "Play"
      : "שחקו";
  }

  function updateGameCard() {
    const titleElement = findGameTitle();

    if (!titleElement) {
      return false;
    }

    const card = findGameCard(titleElement);

    if (!card) {
      return false;
    }

    /*
      카드 안의 기존 Ko-fi 링크를 찾습니다.
    */
    let gameLink = card.matches("a")
      ? card
      : card.querySelector(
          'a[href*="ko-fi"], a[href*="kofi"], a'
        );

    /*
      카드 안에 링크가 없을 경우 카드 자체를 클릭 가능하게 만듭니다.
    */
    if (!gameLink) {
      card.setAttribute("role", "link");
      card.setAttribute("tabindex", "0");
      card.style.cursor = "pointer";

      card.onclick = function () {
        window.location.href = getGameUrl();
      };

      card.onkeydown = function (event) {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          window.location.href = getGameUrl();
        }
      };
    } else {
      gameLink.href = getGameUrl();
      gameLink.removeAttribute("target");
      gameLink.removeAttribute("rel");
    }

    /*
      카드 아래에 표시되는 Ko-fi 글자만 Play/שחקו로 변경합니다.
      카드 전체 내용을 덮어쓰지는 않습니다.
    */
    const cardElements = card.querySelectorAll(
      "a, button, span, strong, p, div"
    );

    cardElements.forEach((element) => {
      const currentText = normalizeText(element.textContent);

      if (currentText === "Ko-fi") {
        element.textContent = getPlayText();
      }
    });

    card.dataset.koreanGameConnected = "true";

    return true;
  }

  function initializeGameCard() {
    updateGameCard();

    /*
      앱이 카드를 나중에 생성하거나 언어를 변경해도
      게임 링크와 버튼 문구를 다시 적용합니다.
    */
    const observer = new MutationObserver(() => {
      updateGameCard();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    document.addEventListener("click", () => {
      window.setTimeout(updateGameCard, 100);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      initializeGameCard
    );
  } else {
    initializeGameCard();
  }
})();