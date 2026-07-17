(() => {
  const supported = ['ko','he','en'];
  const chosen = localStorage.getItem('shepherdLanguage');
  const browser = (navigator.language || 'ko').toLowerCase();
  const lang = supported.includes(chosen) ? chosen : (browser.startsWith('he') ? 'he' : browser.startsWith('en') ? 'en' : 'ko');
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';

  const dict = {
    he: {
      '양떼를 지켜라':'שמור על הצאן', '개발 중 공개 알파 데모':'גרסת אלפא ציבורית בפיתוח',
      '고대 예루샬라임과 광야 3D 액션 · v0.4 Alpha':'משחק פעולה תלת־ממדי בירושלים העתיקה ובמדבר · אלפא v0.4',
      '이 버전은 게임의 핵심 콘셉트와 플레이 방식을 소개하기 위한 공개 개발판입니다.':'גרסת פיתוח ציבורית זו מציגה את הרעיון המרכזי ואת אופן המשחק.',
      '일부 지형, 충돌, 인공지능 동작과 그래픽은 계속 변경될 수 있습니다.':'חלק מהשטח, ההתנגשויות, התנהגות הבינה המלאכותית והגרפיקה עוד עשויים להשתנות.',
      '새 게임':'משחק חדש','이어하기':'המשך','설정':'הגדרות','토라웹으로 돌아가기':'חזרה לאתר התורה',
      '캐릭터 선택':'בחירת דמות','현재 다비드 플레이만 활성화되어 있습니다.':'כרגע ניתן לשחק רק כדוד.',
      '다비드':'דוד','청소년 목동 · 회전식 돌팔매':'רועה צעיר · קלע מסתובב','다비드로 시작':'התחל כדוד',
      '아침':'בוקר','점심':'צהריים','오후':'אחר הצהריים','저녁':'ערב','밤':'לילה',
      '양떼의 갈증':'צמא הצאן','체력':'חיים','무기':'נשק','Tab으로 전환':'החלפה באמצעות Tab',
      '예루샬라임':'ירושלים','양을 다음 구유가 있는 야영지까지 보호하십시오.':'הגן על הצאן עד למחנה הבא שבו אבוס.',
      '돌팔매 기술 +2':'מיומנות קלע +2','전체 화면 종료: Esc 또는 F11 · 다른 창으로 전환: Alt+Tab':'יציאה ממסך מלא: Esc או F11 · מעבר חלון: Alt+Tab',
      '게임 화면으로 돌아오면 WASD 또는 화면 클릭으로 시점을 다시 연결할 수 있습니다.':'לאחר החזרה למשחק, השתמש ב־WASD או לחץ על המסך כדי לחבר מחדש את המצלמה.',
      '돌팔매 연습을 하시겠습니까?':'האם ברצונך להתאמן בקלע?','야영지의 과녁을 향해 최대 5번 연습합니다.':'ניתן לירות עד חמש יריות לעבר המטרה במחנה.',
      '예':'כן','아니오':'לא','일시정지':'השהיה','계속':'המשך','저장':'שמירה','메인 화면':'מסך ראשי',
      '마우스 감도':'רגישות העכבר','환경음과 효과음 사용':'הפעלת צלילי סביבה ואפקטים','게임 볼륨':'עוצמת המשחק','확인':'אישור',
      '낮을수록 천천히, 높을수록 빠르게 시야가 움직입니다.':'ערך נמוך מזיז את המצלמה לאט יותר, וערך גבוה מהר יותר.',
      '치트키 입력':'הקלדת קוד','쓰러졌습니다':'נפלת','마지막 저장 지점에서 다시 시작하시겠습니까?':'להתחיל מחדש מנקודת השמירה האחרונה?',
      '다시 시작':'התחלה מחדש','기혼 샘':'מעיין הגיחון','쉴로악흐':'השילוח','키드론 골짜기':'נחל קדרון','예루샬라임 주변 광야':'המדבר סביב ירושלים',
      '잃어버린 양을 찾아주십시오':'מצא את הכבש האבוד','양 떼 전체를 불러 모았습니다.':'כל הצאן נאסף.',
      '성 밖에 야생 동물이 나타났습니다.':'חיית בר הופיעה מחוץ לעיר.','미션 성공!':'המשימה הושלמה!','미션 실패!':'המשימה נכשלה!',
      '양젖을 짜고 있습니다.':'חולבים את הצאן.','맹수에게 패배해 셰켈 5를 빼앗겼습니다.':'הובסת בידי חיית טרף ואיבדת 5 שקלים.',
      '돌팔매 조준 및 타격 기술이 향상되었습니다.':'מיומנות הכיוון והפגיעה בקלע השתפרה.','돌팔매 연습을 마쳤습니다.':'אימון הקלע הסתיים.',
      '지팡이':'מקל רועים','지팡이로 양들을 재촉했습니다.':'זירזת את הצאן בעזרת המקל.','회전식 돌팔매':'קלע מסתובב','좋은 돌':'אבן טובה','거친 돌':'אבן מחוספסת','둥근 돌':'אבן עגולה','큰 돌':'אבן גדולה',
      '늑대':'זאב','여우':'שועל','사자':'אריה','곰':'דוב','강도':'שודד','남문':'השער הדרומי','북문':'השער הצפוני','북동문':'השער הצפון־מזרחי','동문':'השער המזרחי','서문':'השער המערבי',
      '이 게임은 데스크탑 환경에 맞게 제작되었습니다.':'המשחק מיועד למחשב שולחני.','더 넓은 화면과 키보드·마우스로 플레이해 주세요.':'יש לשחק במסך רחב, באמצעות מקלדת ועכבר.',
      '© 2026 Adam / JewishKorean. All rights reserved.':'© 2026 Adam / JewishKorean. כל הזכויות שמורות.','코드·그래픽·음원·게임 자산의 무단 복제, 재배포 및 상업적 이용을 금합니다.':'אין להעתיק, להפיץ מחדש או לעשות שימוש מסחרי בקוד, בגרפיקה, בצלילים או בנכסי המשחק ללא רשות.'
    },
    en: {
      '양떼를 지켜라':'Guard the Flock','개발 중 공개 알파 데모':'Public Alpha Demo — In Development',
      '고대 예루샬라임과 광야 3D 액션 · v0.4 Alpha':'3D action in ancient Jerusalem and the wilderness · v0.4 Alpha',
      '이 버전은 게임의 핵심 콘셉트와 플레이 방식을 소개하기 위한 공개 개발판입니다.':'This public development build introduces the game’s core concept and gameplay.',
      '일부 지형, 충돌, 인공지능 동작과 그래픽은 계속 변경될 수 있습니다.':'Terrain, collisions, AI behavior, and graphics may continue to change.',
      '새 게임':'New Game','이어하기':'Continue','설정':'Settings','토라웹으로 돌아가기':'Return to Torah Web',
      '캐릭터 선택':'Character Selection','현재 다비드 플레이만 활성화되어 있습니다.':'Only David is currently available.',
      '다비드':'David','청소년 목동 · 회전식 돌팔매':'Young shepherd · rotational sling','다비드로 시작':'Start as David',
      '아침':'Morning','점심':'Noon','오후':'Afternoon','저녁':'Evening','밤':'Night',
      '양떼의 갈증':'Flock Thirst','체력':'Health','무기':'Weapon','Tab으로 전환':'Switch with Tab',
      '예루샬라임':'Jerusalem','양을 다음 구유가 있는 야영지까지 보호하십시오.':'Protect the flock until the next camp with a feeding trough.',
      '돌팔매 기술 +2':'Sling Skill +2','전체 화면 종료: Esc 또는 F11 · 다른 창으로 전환: Alt+Tab':'Exit full screen: Esc or F11 · Switch window: Alt+Tab',
      '게임 화면으로 돌아오면 WASD 또는 화면 클릭으로 시점을 다시 연결할 수 있습니다.':'After returning to the game, use WASD or click the screen to reconnect the camera.',
      '돌팔매 연습을 하시겠습니까?':'Practice with the sling?','야영지의 과녁을 향해 최대 5번 연습합니다.':'You may fire up to five practice shots at the camp target.',
      '예':'Yes','아니오':'No','일시정지':'Paused','계속':'Resume','저장':'Save','메인 화면':'Main Menu',
      '마우스 감도':'Mouse Sensitivity','환경음과 효과음 사용':'Use ambient and effect sounds','게임 볼륨':'Game Volume','확인':'Confirm',
      '낮을수록 천천히, 높을수록 빠르게 시야가 움직입니다.':'Lower values move the camera more slowly; higher values move it faster.',
      '치트키 입력':'Enter cheat code','쓰러졌습니다':'You Fell','마지막 저장 지점에서 다시 시작하시겠습니까?':'Restart from the last save point?',
      '다시 시작':'Restart','기혼 샘':'Gihon Spring','쉴로악흐':'Shiloah','키드론 골짜기':'Kidron Valley','예루샬라임 주변 광야':'Wilderness around Jerusalem',
      '잃어버린 양을 찾아주십시오':'Find the lost sheep','양 떼 전체를 불러 모았습니다.':'The entire flock has gathered.',
      '성 밖에 야생 동물이 나타났습니다.':'A wild animal has appeared outside the city.','미션 성공!':'Mission Complete!','미션 실패!':'Mission Failed!',
      '양젖을 짜고 있습니다.':'Milking the flock.','맹수에게 패배해 셰켈 5를 빼앗겼습니다.':'A predator defeated you and took 5 shekels.',
      '돌팔매 조준 및 타격 기술이 향상되었습니다.':'Your sling aiming and striking skill improved.','돌팔매 연습을 마쳤습니다.':'Sling practice finished.',
      '지팡이':'Staff','지팡이로 양들을 재촉했습니다.':'You urged the sheep forward with the staff.','회전식 돌팔매':'Rotational Sling','좋은 돌':'Good Stone','거친 돌':'Rough Stone','둥근 돌':'Round Stone','큰 돌':'Large Stone',
      '늑대':'Wolf','여우':'Fox','사자':'Lion','곰':'Bear','강도':'Bandit','남문':'South Gate','북문':'North Gate','북동문':'Northeast Gate','동문':'East Gate','서문':'West Gate',
      '이 게임은 데스크탑 환경에 맞게 제작되었습니다.':'This game is designed for desktop computers.','더 넓은 화면과 키보드·마우스로 플레이해 주세요.':'Please play with a larger screen, keyboard, and mouse.',
      '© 2026 Adam / JewishKorean. All rights reserved.':'© 2026 Adam / JewishKorean. All rights reserved.','코드·그래픽·음원·게임 자산의 무단 복제, 재배포 및 상업적 이용을 금합니다.':'Unauthorized copying, redistribution, or commercial use of the code, graphics, audio, or game assets is prohibited.'
    }
  };

  const exact = dict[lang] || {};
  const patterns = lang === 'he' ? [
    [/^돌\s*([\d,]+)\/25$/, 'אבנים $1/25'], [/^존중\s*([\d,]+)\/100$/, 'כבוד $1/100'], [/^([\d,]+)\s*셰켈$/, '$1 שקלים'],
    [/^돌팔매 기술 \+2$/, 'מיומנות קלע +2'], [/^([\d,]+)\/50$/, '$1/50'], [/^(.+) 명중!$/, 'פגיעה ב־$1!'],
    [/^존중 \+([\d,]+) 상승 · 셰켈 \+15$/, 'כבוד +$1 · 15+ שקלים'], [/^존중 \+([\d,]+)$/, 'כבוד +$1']
  ] : lang === 'en' ? [
    [/^돌\s*([\d,]+)\/25$/, 'Stones $1/25'], [/^존중\s*([\d,]+)\/100$/, 'Respect $1/100'], [/^([\d,]+)\s*셰켈$/, '$1 shekels'],
    [/^([\d,]+)\/50$/, '$1/50'], [/^(.+) 명중!$/, '$1 hit!'], [/^존중 \+([\d,]+) 상승 · 셰켈 \+15$/, 'Respect +$1 · Shekels +15'], [/^존중 \+([\d,]+)$/, 'Respect +$1']
  ] : [];

  function translateText(value) {
    if (lang === 'ko' || !value) return value;
    const trimmed = value.trim();
    if (exact[trimmed]) return value.replace(trimmed, exact[trimmed]);
    let out = value;
    for (const [re, replacement] of patterns) {
      if (re.test(trimmed)) return value.replace(trimmed, trimmed.replace(re, replacement));
    }
    // Phrase-level substitutions for longer dynamic notices.
    const phraseMap = lang === 'he' ? {
      '양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממעיין הגיחון והרווה את צמאונו.',
      '양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממי השילוח והרווה את צמאונו.',
      '양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.':'הצאן צמא מאוד. מהרו למצוא את שוקת המים הבאה.',
      '양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?':'הצאן לא הצליח לשתות. להתחיל מחדש מנקודת השמירה האחרונה?',
      '예루샬라임과 주변 광야\n성 안에서는 강도를, 성 밖에서는 야생 동물을 경계하십시오.':'ירושלים והמדבר שסביבה\nהישמרו משודדים בתוך העיר ומחיות בר מחוצה לה.'
    } : {
      '양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'The flock drank from the Gihon Spring and quenched its thirst.',
      '양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.':'The flock drank from Shiloah and quenched its thirst.',
      '양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.':'The flock is extremely thirsty. Hurry to the next water trough.',
      '양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?':'The flock failed to drink. Restart from the last save point?',
      '예루샬라임과 주변 광야\n성 안에서는 강도를, 성 밖에서는 야생 동물을 경계하십시오.':'Jerusalem and the surrounding wilderness\nBeware of bandits inside the city and wild animals outside.'
    };
    for (const [ko, tr] of Object.entries(phraseMap)) out = out.split(ko).join(tr);
    return out;
  }

  let translating = false;
  function translateNode(node) {
    if (lang === 'ko') return;
    if (node.nodeType === Node.TEXT_NODE) {
      const next = translateText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (const attr of ['placeholder','aria-label','alt','title']) {
        if (node.hasAttribute(attr)) node.setAttribute(attr, translateText(node.getAttribute(attr)));
      }
      node.childNodes.forEach(translateNode);
    }
  }
  function runTranslate() {
    if (translating) return;
    translating = true;
    try { translateNode(document.body); } finally { translating = false; }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-lang]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.lang === lang);
      btn.addEventListener('click', () => {
        const next = btn.dataset.lang;
        if (!supported.includes(next) || next === lang) return;
        localStorage.setItem('shepherdLanguage', next);
        location.reload();
      });
    });
    runTranslate();
    // Translate only changed nodes. Traversing the entire game DOM every frame
    // caused the Hebrew/English builds to freeze as the clock and HUD updated.
    const observer = new MutationObserver(mutations => {
      if (translating) return;
      translating = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData') {
            translateNode(mutation.target);
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(translateNode);
          } else if (mutation.type === 'attributes') {
            translateNode(mutation.target);
          }
        }
      } finally {
        translating = false;
      }
    });
    observer.observe(document.body, {subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['placeholder','aria-label','alt','title']});
  });
})();
