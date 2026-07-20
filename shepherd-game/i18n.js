(() => {
  const supported = ['ko', 'he'];
  const urlLang = new URLSearchParams(location.search).get('lang');
  const saved = localStorage.getItem('shepherdLanguage');
  const browser = (navigator.language || 'ko').toLowerCase();
  let lang = supported.includes(urlLang) ? urlLang : supported.includes(saved) ? saved : (browser.startsWith('he') ? 'he' : 'ko');

  const he = {
    '양떼를 지켜라':'שמור על הצאן','개발 중 공개 알파 데모':'גרסת אלפא ציבורית בפיתוח','고대 예루샬라임과 광야 3D 액션 · v0.6 Alpha':'משחק פעולה תלת־ממדי בירושלים העתיקה ובמדבר · אלפא v0.6',
    '이 버전은 게임의 핵심 콘셉트와 플레이 방식을 소개하기 위한 공개 개발판입니다.':'גרסת פיתוח ציבורית זו מציגה את רעיון המשחק ואת אופן המשחק.','일부 지형, 충돌, 인공지능 동작과 그래픽은 계속 변경될 수 있습니다.':'חלק מהשטח, ההתנגשויות, התנהגות הדמויות והגרפיקה עשויים עוד להשתנות.',
    '새 게임':'משחק חדש','이어하기':'המשך משחק','설정':'הגדרות','토라웹으로 돌아가기':'חזרה לאתר תורה־קוריאנית','캐릭터 선택':'בחירת דמות','현재 다비드 플레이만 활성화되어 있습니다.':'כרגע ניתן לשחק רק כדוד.','다비드':'דוד','청소년 목동 · 회전식 돌팔매':'רועה צעיר · קלע','다비드로 시작':'התחל כדוד',
    '아침':'בוקר','점심':'צהריים','오후':'אחר הצהריים','저녁':'ערב','밤':'לילה','새벽':'לפנות בוקר','양떼의 갈증':'צמא הצאן','체력':'חיים','무기':'נשק','Tab으로 전환':'החלפה באמצעות Tab','예루샬라임':'ירושלים','양을 다음 구유가 있는 야영지까지 보호하십시오.':'הגן על הצאן עד למחנה הבא שבו שוקת.','돌팔매 기술 +2':'מיומנות קלע +2',
    '전체 화면 종료: Esc 또는 F11 · 다른 창으로 전환: Alt+Tab':'יציאה ממסך מלא: Esc או F11 · מעבר חלון: Alt+Tab','게임 화면으로 돌아오면 WASD 또는 화면 클릭으로 시점을 다시 연결할 수 있습니다.':'לאחר החזרה למשחק, השתמש ב־WASD או לחץ על המסך כדי להחזיר את השליטה במצלמה.',
    '돌팔매 연습을 하시겠습니까?':'האם להתאמן בקלע?','야영지의 과녁을 향해 최대 5번 연습합니다.':'אפשר לירות עד חמש יריות אימון לעבר המטרה במחנה.','예':'כן','아니오':'לא','일시정지':'השהיה','계속':'המשך','저장':'שמירה','메인 화면':'מסך ראשי','마우스 감도':'רגישות העכבר','환경음과 효과음 사용':'הפעלת צלילי סביבה ואפקטים','게임 볼륨':'עוצמת המשחק','확인':'אישור','낮을수록 천천히, 높을수록 빠르게 시야가 움직입니다.':'ערך נמוך מזיז את המצלמה לאט יותר, וערך גבוה מהר יותר.','치트키 입력':'הקלד קוד רמאות','쓰러졌습니다':'נפלת','마지막 저장 지점에서 다시 시작하시겠습니까?':'להתחיל מחדש מנקודת השמירה האחרונה?','다시 시작':'התחל מחדש',
    '기혼 샘':'מעיין הגיחון','쉴로악흐':'השילוח','키드론 골짜기':'נחל קדרון','예루샬라임 주변 광야':'המדבר סביב ירושלים','성전산':'הר הבית','예루샬라임 성내':'בתוך ירושלים','남문':'השער הדרומי','북문':'השער הצפוני','동문':'השער המזרחי','북동문':'השער הצפון־מזרחי','서문':'השער המערבי',
    '기본 시점':'מצלמה רגילה','사람 확대 시점':'מצלמה קרובה','눈 시점':'מבט מגוף ראשון','원거리 시점':'מצלמה רחוקה','좋은 돌':'אבן טובה','거친 돌':'אבן מחוספסת','둥근 돌':'אבן עגולה','큰 돌':'אבן גדולה','회전식 돌팔매':'קלע','지팡이':'מקל רועים','늑대':'זאב','여우':'שועל','사자':'אריה','곰':'דוב','강도':'שודד','적':'אויב',
    '멀리 새로운 목동 야영지가 정해졌습니다.':'מחנה רועים חדש נקבע במרחק.','돌팔매 조준 및 타격 기술이 향상되었습니다.':'מיומנות הכיוון והפגיעה בקלע השתפרה.','돌팔매 연습을 마쳤습니다.':'אימון הקלע הסתיים.','미션 성공!':'המשימה הושלמה!','늑대 한 마리를 물리쳤습니다. +15 셰켈':'הבסת זאב אחד. 15+ שקלים','늑대 떼를 모두 물리쳤습니다. 존중 +10 · +15 셰켈':'הבסת את כל להקת הזאבים. כבוד +10 · 15+ שקלים','회전식 돌팔매를 들었습니다.':'בחרת בקלע.','지팡이를 들었습니다.':'בחרת במקל הרועים.','양 떼 전체를 불러 모았습니다.':'כל הצאן נאסף.','지팡이로 양들을 재촉했습니다.':'זירזת את הצאן בעזרת המקל.','지팡이로 상대를 밀쳐냈습니다.':'הדפת את היריב בעזרת המקל.','돌이 없어 지팡이로 자동 전환했습니다.':'אין אבנים; הנשק הוחלף אוטומטית למקל.','과녁을 향해 돌팔매를 5번 연습하십시오.':'ירה חמש יריות קלע לעבר המטרה.','치트키가 입력되었습니다.':'קוד הרמאות הופעל.','치트키가 해제되었습니다.':'קוד הרמאות בוטל.','잃어버린 양을 찾아주십시오':'מצא את הכבש האבוד.','돌은 최대 25개까지 지닐 수 있습니다.':'אפשר לשאת עד 25 אבנים.','가까운 곳에 적합한 돌이 없습니다.':'אין אבן מתאימה בקרבת מקום.','돌을 줍는 중 오류가 발생했습니다. 다시 시도해 주세요.':'אירעה שגיאה בעת איסוף האבן. נסה שוב.','멀리서 맹수의 기척이 느껴집니다.':'מורגשת נוכחות של חיית טרף במרחק.','성 안에 강도가 나타났습니다.':'שודד הופיע בתוך העיר.','성 밖에 야생 동물이 나타났습니다.':'חיית בר הופיעה מחוץ לעיר.','과녁 명중!':'פגיעה במטרה!','양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממעיין הגיחון והרווה את צמאונו.','양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממי השילוח והרווה את צמאונו.','양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.':'הצאן צמא מאוד. מהר אל שוקת המים הבאה.','미션 실패!':'המשימה נכשלה!','양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?':'הצאן לא הצליח לשתות. להתחיל מחדש מנקודת השמירה האחרונה?','양젖을 짜고 있습니다.':'חולבים את הכבשים.','맹수에게 패배해 셰켈 5를 빼앗겼습니다.':'הובסת בידי חיית טרף ואיבדת 5 שקלים.','저장되었습니다.':'המשחק נשמר.',
    '이 게임은 데스크탑 환경에 맞게 제작되었습니다.':'המשחק מיועד למחשב שולחני.','더 넓은 화면과 키보드·마우스로 플레이해 주세요.':'יש לשחק במסך רחב באמצעות מקלדת ועכבר.','코드·그래픽·음원·게임 자산의 무단 복제, 재배포 및 상업적 이용을 금합니다.':'אין להעתיק, להפיץ מחדש או לעשות שימוש מסחרי בקוד, בגרפיקה, בצלילים או בנכסי המשחק ללא רשות.',
    'Tab 또는 방향키로 선택 · Enter로 실행':'בחירה באמצעות Tab או מקשי החצים · הפעלה באמצעות Enter','WASD 이동 · 마우스 360° 시점 · V 시점 변경 · Space 뛰기 · Shift 점프 · Z 양 호출 · 우클릭 조준 · 좌클릭 발사 · E 또는 Ctrl 돌 줍기 · Tab 무기 전환 · Enter 치트 콘솔 · Esc 메뉴':'WASD תנועה · עכבר מבט 360° · V החלפת מצלמה · Space ריצה · Shift קפיצה · Z קריאה לצאן · לחצן ימני כיוון · לחצן שמאלי ירי · E או Ctrl איסוף אבן · Tab החלפת נשק · Enter מסוף קודים · Esc תפריט'
  };

  const patterns = [
    [/^돌\s*([\d,]+)(\/25)?$/, 'אבנים $1$2'],[/^존중\s*([\d,]+)(\/100)?$/, 'כבוד $1$2'],[/^([\d,]+)\s*셰켈$/, '$1 שקלים'],
    [/^존중 \+([\d,]+) 상승 · 셰켈 \+15$/, 'כבוד +$1 · 15+ שקלים'],[/^(.+)을 물리쳤습니다\. 존중 \+5 · \+15 셰켈$/, 'הבסת את $1. כבוד +5 · 15+ שקלים'],
    [/^(.+) 명중!$/, 'פגיעה ב־$1!'],[/^(.+)을 주웠습니다\. \(([\d,]+)\/25\)$/, 'אספת $1. ($2/25)']
  ];

  function tr(value) {
    if (lang === 'ko' || value == null) return value;
    const text = String(value);
    const trimmed = text.trim();
    const normalized = trimmed.replace(/\s+/g, ' ');
    if (he[normalized]) return text.replace(trimmed, he[normalized]);
    for (const [re, replacement] of patterns) if (re.test(normalized)) return text.replace(trimmed, normalized.replace(re, replacement));
    return text;
  }

  function applyDocumentDirection() {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.body?.classList.toggle('lang-he', lang === 'he');
  }
  let translating = false;
  function translateNode(node) {
    if (lang === 'ko' || !node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.nodeValue;
      const next = tr(current);
      if (next !== current) node.nodeValue = next;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      ['placeholder','aria-label','alt','title'].forEach(attr => {
        if (!node.hasAttribute(attr)) return;
        const current = node.getAttribute(attr);
        const next = tr(current);
        if (next !== current) node.setAttribute(attr, next);
      });
      node.childNodes.forEach(translateNode);
    }
  }
  function refreshButtons() {
    document.querySelectorAll('[data-lang]').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
  }
  function setLanguage(next) {
    if (!supported.includes(next) || next === lang) return;
    localStorage.setItem('shepherdLanguage', next);
    const u = new URL(location.href); u.searchParams.set('lang', next); location.href = u.toString();
  }
  window.ShepherdI18n = { tr, getLanguage: () => lang, setLanguage };

  document.addEventListener('DOMContentLoaded', () => {
    applyDocumentDirection(); refreshButtons();
    document.querySelectorAll('[data-lang]').forEach(btn => btn.addEventListener('click', () => setLanguage(btn.dataset.lang)));
    translateNode(document.body);
    const observer = new MutationObserver(mutations => {
      if (translating) return;
      translating = true;
      try {
        for (const m of mutations) {
          if (m.type === 'characterData') translateNode(m.target);
          else if (m.type === 'childList') m.addedNodes.forEach(translateNode);
          else translateNode(m.target);
        }
      } finally {
        translating = false;
      }
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['placeholder','aria-label','alt','title']});
  });
})();
