(() => {
  const supported = ['en', 'ko', 'he'];
  const urlParams = new URLSearchParams(location.search);
  const urlLang = urlParams.get('lang');
  const saveLanguage = value => {
    try { localStorage.setItem('shepherdLanguage', value); }
    catch (error) { console.warn('Could not save the language setting:', error); }
  };
  let savedLang = null;
  try { savedLang = localStorage.getItem('shepherdLanguage'); }
  catch (error) { console.warn('Could not read the language setting:', error); }
  const pwaLaunch = urlParams.get('pwa') === '1';
  let lang = supported.includes(urlLang)
    ? urlLang
    : pwaLaunch && supported.includes(savedLang)
      ? savedLang
      : null;

  const he = {
    '양떼를 지켜라':'שמור על הצאן','고대 예루샬라임과 유대 광야의 3D 양치기 모험':'הרפתקת רועים תלת־ממדית בירושלים העתיקה ובמדבר יהודה',
    '양 떼를 이끌고 물과 안전한 야영지를 찾으십시오.':'הובל את הצאן ומצא מים ומחנה בטוח.','야생 동물과 성 안의 위험으로부터 양 떼를 지키십시오.':'הגן על הצאן מפני חיות בר ומסכנות בתוך העיר.',
    '새 게임':'משחק חדש','이어하기':'המשך משחק','설정':'הגדרות','토라웹으로 돌아가기':'חזרה לאתר תורה־קוריאנית','캐릭터 선택':'בחירת דמות','현재 다비드 플레이만 활성화되어 있습니다.':'כרגע ניתן לשחק רק כדוד.','다비드':'דוד','청소년 목동 · 회전식 돌팔매':'רועה צעיר · קלע','다비드로 시작':'התחל כדוד',
    '아침':'בוקר','점심':'צהריים','오후':'אחר הצהריים','저녁':'ערב','밤':'לילה','새벽':'לפנות בוקר','양떼의 갈증':'צמא הצאן','체력':'חיים','무기':'נשק','Tab으로 전환':'החלפה באמצעות Tab','예루샬라임':'ירושלים','양을 다음 구유가 있는 야영지까지 보호하십시오.':'הגן על הצאן עד למחנה הבא שבו שוקת.','돌팔매 기술 +2':'מיומנות קלע +2','필살기가 발동되었습니다!':'המהלך המיוחד הופעל!',
    '전체 화면 종료: Esc 또는 F11 · 다른 창으로 전환: Alt+Tab':'יציאה ממסך מלא: Esc או F11 · מעבר חלון: Alt+Tab','게임 화면으로 돌아오면 WASD 또는 화면 클릭으로 시점을 다시 연결할 수 있습니다.':'לאחר החזרה למשחק, השתמש ב־WASD או לחץ על המסך כדי להחזיר את השליטה במצלמה.',
    '돌팔매 연습을 하시겠습니까?':'האם להתאמן בקלע?','야영지의 과녁을 향해 최대 5번 연습합니다.':'אפשר לירות עד חמש יריות אימון לעבר המטרה במחנה.','예':'כן','아니오':'לא','일시정지':'השהיה','계속':'המשך','저장':'שמירה','저장 완료':'השמירה הושלמה','저장 실패':'השמירה נכשלה','메인 화면':'מסך ראשי','마우스 감도':'רגישות העכבר','환경음과 효과음 사용':'הפעלת צלילי סביבה ואפקטים','게임 볼륨':'עוצמת המשחק','확인':'אישור','낮을수록 천천히, 높을수록 빠르게 시야가 움직입니다.':'ערך נמוך מזיז את המצלמה לאט יותר, וערך גבוה מהר יותר.','치트키 입력':'הקלד קוד רמאות','쓰러졌습니다':'נפלת','마지막 저장 지점에서 다시 시작하시겠습니까?':'להתחיל מחדש מנקודת השמירה האחרונה?','다시 시작':'התחל מחדש','저장하지 못했습니다. 브라우저의 사이트 데이터 허용 여부를 확인해 주세요.':'לא ניתן לשמור. יש לוודא שהדפדפן מאפשר נתוני אתר.',
    '기혼 샘':'מעיין הגיחון','쉴로악흐':'השילוח','키드론 골짜기':'נחל קדרון','예루샬라임 주변 광야':'המדבר סביב ירושלים','성전산':'הר הבית','예루샬라임 성내':'בתוך ירושלים','남문':'השער הדרומי','북문':'השער הצפוני','동문':'השער המזרחי','북동문':'השער הצפון־מזרחי','서문':'השער המערבי',
    '기본 시점':'מצלמה רגילה','사람 확대 시점':'מצלמה קרובה','눈 시점':'מבט מגוף ראשון','원거리 시점':'מצלמה רחוקה','좋은 돌':'אבן טובה','거친 돌':'אבן מחוספסת','둥근 돌':'אבן עגולה','큰 돌':'אבן גדולה','회전식 돌팔매':'קלע','지팡이':'מקל רועים','늑대':'זאב','여우':'שועל','사자':'אריה','강도':'שודד','적':'אויב',
    '멀리 새로운 목동 야영지가 정해졌습니다.':'מחנה רועים חדש נקבע במרחק.','돌팔매 조준 및 타격 기술이 향상되었습니다.':'מיומנות הכיוון והפגיעה בקלע השתפרה.','돌팔매 연습을 마쳤습니다.':'אימון הקלע הסתיים.','미션 성공!':'המשימה הושלמה!','늑대 한 마리를 물리쳤습니다. +15 셰켈':'הבסת זאב אחד. 15+ שקלים','늑대 떼를 모두 물리쳤습니다. 존중 +10 · +15 셰켈':'הבסת את כל להקת הזאבים. כבוד +10 · 15+ שקלים','회전식 돌팔매를 들었습니다.':'בחרת בקלע.','지팡이를 들었습니다.':'בחרת במקל הרועים.','양 떼 전체를 불러 모았습니다.':'כל הצאן נאסף.','지팡이로 양들을 재촉했습니다.':'זירזת את הצאן בעזרת המקל.','지팡이로 상대를 밀쳐냈습니다.':'הדפת את היריב בעזרת המקל.','돌이 없어 지팡이로 자동 전환했습니다.':'אין אבנים; הנשק הוחלף אוטומטית למקל.','과녁을 향해 돌팔매를 5번 연습하십시오.':'ירה חמש יריות קלע לעבר המטרה.','치트키가 입력되었습니다.':'קוד הרמאות הופעל.','치트키가 해제되었습니다.':'קוד הרמאות בוטל.','잃어버린 양을 찾아주십시오':'מצא את הכבש האבוד.','돌은 최대 25개까지 지닐 수 있습니다.':'אפשר לשאת עד 25 אבנים.','가까운 곳에 적합한 돌이 없습니다.':'אין אבן מתאימה בקרבת מקום.','돌을 줍는 중 오류가 발생했습니다. 다시 시도해 주세요.':'אירעה שגיאה בעת איסוף האבן. נסה שוב.','멀리서 맹수의 기척이 느껴집니다.':'מורגשת נוכחות של חיית טרף במרחק.','성 안에 강도가 나타났습니다.':'שודד הופיע בתוך העיר.','성 밖에 야생 동물이 나타났습니다.':'חיית בר הופיעה מחוץ לעיר.','과녁 명중!':'פגיעה במטרה!','양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממעיין הגיחון והרווה את צמאונו.','양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.':'הצאן שתה ממי השילוח והרווה את צמאונו.','양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.':'הצאן צמא מאוד. מהר אל שוקת המים הבאה.','미션 실패!':'המשימה נכשלה!','양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?':'הצאן לא הצליח לשתות. להתחיל מחדש מנקודת השמירה האחרונה?','양젖을 짜고 있습니다.':'חולבים את הכבשים.','맹수에게 패배해 셰켈 5를 빼앗겼습니다.':'הובסת בידי חיית טרף ואיבדת 5 שקלים.','저장되었습니다.':'המשחק נשמר.',
    '이 게임은 데스크탑 환경에 맞게 제작되었습니다.':'המשחק מיועד למחשב שולחני.','더 넓은 화면과 키보드·마우스로 플레이해 주세요.':'יש לשחק במסך רחב באמצעות מקלדת ועכבר.','코드·그래픽·음원·게임 자산의 무단 복제, 재배포 및 상업적 이용을 금합니다.':'אין להעתיק, להפיץ מחדש או לעשות שימוש מסחרי בקוד, בגרפיקה, בצלילים או בנכסי המשחק ללא רשות.',
    'Tab 또는 방향키로 선택 · Enter로 실행':'בחירה באמצעות Tab או מקשי החצים · הפעלה באמצעות Enter','WASD 이동 · 마우스 360° 시점 · V 시점 변경 · Space 뛰기 · Shift 점프 · Z 양 호출 · 우클릭 조준 · 좌클릭 발사 · E 또는 Ctrl 돌 줍기 · Tab 무기 전환 · Enter 치트 콘솔 · Esc 메뉴':'WASD תנועה · עכבר מבט 360° · V החלפת מצלמה · Space ריצה · Shift קפיצה · Z קריאה לצאן · לחצן ימני כיוון · לחצן שמאלי ירי · E או Ctrl איסוף אבן · Tab החלפת נשק · Enter מסוף קודים · Esc תפריט',
    '언어 선택':'בחירת שפה','언어 변경':'שינוי שפה','영어':'אנגלית','한국어':'קוריאנית','히브리어':'עברית','키 소개':'מקשים ושליטה','설정으로 돌아가기':'חזרה להגדרות','두루마리 형태의 미니맵':'מפת גלילה',
    '설정 메뉴':'תפריט הגדרות','일시정지 메뉴':'תפריט השהיה','돌팔매 연습 선택':'בחירת אימון בקלע',
    '© 2026 Adam / JewishKorean. All rights reserved.':'© 2026 Adam / JewishKorean. כל הזכויות שמורות.',
    'N':'צ',
    '이동':'תנועה','마우스':'עכבר','360° 시점 조작':'שליטה במבט 360°','시점 변경':'החלפת מצלמה','뛰기':'ריצה','점프':'קפיצה','양 호출':'קריאה לצאן','우클릭':'לחצן ימני','좌클릭':'לחצן שמאלי','조준':'כוונת','발사':'ירי','돌 줍기':'איסוף אבן','무기 전환':'החלפת נשק','치트 콘솔':'מסוף קודים','메뉴':'תפריט',
    '(치트키는 제작자에게 물어보세요)':'(לקבלת קודי רמאות יש לפנות ליוצר המשחק)',
    '다비드로 게임 시작':'התחלת המשחק כדוד','청소년 다비드 캐릭터 선택 완성본':'דמות דוד הצעיר לבחירה',
    '이 야영지에 머물며 밤이 끝날 때까지 양 떼를 지키십시오.':'הישאר במחנה הזה והגן על הצאן עד סוף הלילה.',
    '밤 동안에는 이 야영지에 머물러 양 떼를 지키십시오.':'במהלך הלילה הישאר במחנה הזה והגן על הצאן.',
    '모든 양을 잃었습니다':'כל הצאן אבד',
    '양 떼를 모두 잃어 셰켈과 존중을 포함한 모든 진행 상황이 초기화되었습니다. 처음부터 다시 시작하십시오.':'כל הצאן אבד. כל ההתקדמות, לרבות השקלים והכבוד, אופסה. יש להתחיל מחדש.',
    '남은 양이 5마리 미만이어서 셰켈 보상 없음':'אין פרס שקלים משום שנותרו פחות מחמש כבשים',
    '다비드의 도시 · 성전산 · 키드론 골짜기 · 올리브산 성문과 골목을 따라 성전산까지 올라갈 수 있습니다.':'עיר דוד · הר הבית · נחל קדרון · הר הזיתים אפשר לעלות אל הר הבית דרך שערי העיר והסמטאות.',
    '양들은 남문 밖 양 상점 곁의 안전한 대기장에서 기다립니다.':'הצאן ממתין במכלאה הבטוחה ליד דוכן הכבשים שמחוץ לשער הדרומי.',
    '남문 밖 대기장에서 양 떼와 다시 합류했습니다.':'הצטרפת מחדש לצאן במכלאה שמחוץ לשער הדרומי.',
    '양 한 마리가 위험합니다. 맹수를 빨리 막으십시오.':'כבשה אחת בסכנה. עצור במהירות את חיית הטרף.',
    '양 한 마리는 100셰켈입니다. 셰켈이 부족합니다.':'מחיר כבשה אחת הוא 100 שקלים. אין לך מספיק שקלים.',
    '성 안에서 강도의 기척이 느껴집니다.':'מורגשת נוכחות של שודד בתוך העיר.',
    '새벽이 되었습니다. 양 떼가 야영지에서 다시 이동을 시작합니다.':'השחר עלה. הצאן מתחיל לנוע שוב מן המחנה.',
    '야영지에서 너무 멀리 벗어났습니다. 양 떼 곁으로 돌아가십시오.':'התרחקת יותר מדי מן המחנה. חזור אל הצאן.',
    '야영지에 도착했습니다. 이곳에서 밤이 끝날 때까지 양 떼를 지키십시오.':'הגעת למחנה. הגן כאן על הצאן עד סוף הלילה.',
    '짧고 위험한 와디 길':'דרך הוואדי הקצרה והמסוכנת','길고 안전한 올리브산 능선길':'דרך הרכס הארוכה והבטוחה בהר הזיתים','물이 있는 샘길':'דרך המעיינות',
    '짧은 와디 길: 맹수가 자주 나타나지만 도착 시 존중 보너스를 받습니다.':'דרך הוואדי הקצרה: חיות טרף מופיעות לעיתים קרובות, אך בהגעה מתקבל בונוס כבוד.',
    '올리브산 능선길: 더 멀지만 맹수 출현이 적습니다.':'דרך הרכס בהר הזיתים: ארוכה יותר, אך מופיעות בה פחות חיות טרף.',
    '샘길: 기혼 샘이나 쉴로악흐에서 양 떼의 갈증을 채울 수 있습니다.':'דרך המעיינות: אפשר להשקות את הצאן במעיין הגיחון או בשילוח.',
    '남문 경비병이 다비드를 추격합니다.':'שומר השער הדרומי רודף אחרי דוד.',
    '경비병 경계':'כוננות השומר',
    '성전 뜰에서 에너지가 회복되었습니다.':'האנרגיה של דוד התחדשה בחצר המקדש.',
    '게임을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.':'לא ניתן היה להתחיל את המשחק. נסה שוב בעוד רגע.',
    '성 안의 사람을 공격해 경비병이 추격합니다.':'תקפת אדם בתוך העיר, והשומר רודף אחריך.',
    '나를 속이려 하지 마!':'אל תעבוד עלי!',
    '화면 회전 안내':'הנחיה לסיבוב המסך','기기를 가로로 돌려주세요':'סובבו את המכשיר למצב אופקי',
    '게임은 휴대폰과 태블릿에서 가로 화면으로 진행됩니다.':'המשחק פועל בטלפונים ובטאבלטים במצב אופקי.',
    '모바일 게임 조작':'פקדי משחק למכשיר נייד','이동 조이스틱':'בקר תנועה','양떼 부르기':'קריאה לצאן',
    '돌팔매 던지기':'הטלת אבן בקלע','지팡이 사용':'שימוש במקל הרועים','무기 선택':'בחירת נשק','달리기':'ריצה','소리 설정':'הגדרות צליל','게임 종료':'יציאה מהמשחק',
    '앱 설치 안내':'התקנת היישום','양떼를 지켜라 앱 아이콘':'סמל היישום שמור על הצאן',
    '앱으로 설치하시겠습니까?':'להתקין את המשחק כיישום?','홈 화면에서 전체 화면으로 바로 게임을 시작할 수 있습니다.':'אפשר להפעיל את המשחק ישירות ממסך הבית ובמסך מלא.',
    '앱으로 설치':'התקנת היישום','나중에':'אחר כך',
    'iPhone/iPad에서는 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하십시오.':'ב־iPhone או iPad לחצו על כפתור השיתוף ולאחר מכן בחרו „הוספה למסך הבית”.',
    '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하십시오.':'בתפריט הדפדפן בחרו „התקנת יישום” או „הוספה למסך הבית”.'
  };

  const en = {
    '양떼를 지켜라':'Protect the Flock',
    '고대 예루샬라임과 유대 광야의 3D 양치기 모험':'A 3D Shepherd Adventure in Ancient Jerusalem and the Judean Wilderness',
    '양 떼를 이끌고 물과 안전한 야영지를 찾으십시오.':'Lead the flock to water and a safe camp.',
    '야생 동물과 성 안의 위험으로부터 양 떼를 지키십시오.':'Protect the flock from wild animals and dangers inside the city.',
    '새 게임':'New Game','이어하기':'Continue','설정':'Settings','토라웹으로 돌아가기':'Back to TorahWeb','캐릭터 선택':'Choose a Character',
    '현재 다비드 플레이만 활성화되어 있습니다.':'Only David is currently available.','다비드':'David',
    '청소년 목동 · 회전식 돌팔매':'Young shepherd · traditional sling','다비드로 시작':'Play as David',
    '아침':'Morning','점심':'Midday','오후':'Afternoon','저녁':'Evening','밤':'Night','새벽':'Dawn',
    '양떼의 갈증':'Flock Thirst','체력':'Health','무기':'Weapon','Tab으로 전환':'Press Tab to switch',
    '예루샬라임':'Jerusalem','양을 다음 구유가 있는 야영지까지 보호하십시오.':'Protect the flock on the way to the next camp with a water trough.',
    '돌팔매 기술 +2':'Sling Skill +2','필살기가 발동되었습니다!':'Special attack activated!',
    '전체 화면 종료: Esc 또는 F11 · 다른 창으로 전환: Alt+Tab':'Exit fullscreen: Esc or F11 · Switch windows: Alt+Tab',
    '게임 화면으로 돌아오면 WASD 또는 화면 클릭으로 시점을 다시 연결할 수 있습니다.':'When you return, press WASD or click the game to restore camera control.',
    '돌팔매 연습을 하시겠습니까?':'Practice with the sling?',
    '야영지의 과녁을 향해 최대 5번 연습합니다.':'Take up to five practice shots at the camp target.',
    '예':'Yes','아니오':'No','일시정지':'Paused','계속':'Resume','저장':'Save','저장 완료':'Game saved',
    '저장 실패':'Save failed','메인 화면':'Main Menu','마우스 감도':'Mouse Sensitivity',
    '환경음과 효과음 사용':'Enable ambience and sound effects','게임 볼륨':'Game Volume','확인':'Done',
    '낮을수록 천천히, 높을수록 빠르게 시야가 움직입니다.':'Lower values move the camera more slowly; higher values move it faster.',
    '치트키 입력':'Enter cheat code','쓰러졌습니다':'You Have Fallen',
    '마지막 저장 지점에서 다시 시작하시겠습니까?':'Restart from your latest save?',
    '다시 시작':'Restart',
    '저장하지 못했습니다. 브라우저의 사이트 데이터 허용 여부를 확인해 주세요.':'Could not save. Check that your browser allows site data.',
    '기혼 샘':'Gihon Spring','쉴로악흐':'Siloam','키드론 골짜기':'Kidron Valley',
    '예루샬라임 주변 광야':'Wilderness around Jerusalem','성전산':'Temple Mount',
    '예루샬라임 성내':'Inside Jerusalem','남문':'South Gate','북문':'North Gate',
    '동문':'East Gate','북동문':'Northeast Gate','서문':'West Gate',
    '기본 시점':'Standard Camera','사람 확대 시점':'Close Camera','눈 시점':'First-Person View',
    '원거리 시점':'Distant Camera','좋은 돌':'Good Stone','거친 돌':'Rough Stone',
    '둥근 돌':'Round Stone','큰 돌':'Large Stone','회전식 돌팔매':'Sling',
    '지팡이':'Shepherd Staff','늑대':'Wolf','여우':'Fox','사자':'Lion','강도':'Bandit','적':'Enemy',
    '멀리 새로운 목동 야영지가 정해졌습니다.':'A new shepherd camp has been marked in the distance.',
    '돌팔매 조준 및 타격 기술이 향상되었습니다.':'Your sling accuracy and striking skill improved.',
    '돌팔매 연습을 마쳤습니다.':'Sling practice complete.','미션 성공!':'Mission Complete!',
    '늑대 한 마리를 물리쳤습니다. +15 셰켈':'Defeated one wolf. +15 shekels',
    '늑대 떼를 모두 물리쳤습니다. 존중 +10 · +15 셰켈':'Defeated the wolf pack. Respect +10 · +15 shekels',
    '회전식 돌팔매를 들었습니다.':'Sling equipped.','지팡이를 들었습니다.':'Shepherd staff equipped.',
    '양 떼 전체를 불러 모았습니다.':'The whole flock has been called together.',
    '지팡이로 양들을 재촉했습니다.':'You guided the sheep with the staff.',
    '지팡이로 상대를 밀쳐냈습니다.':'You pushed the opponent back with the staff.',
    '돌이 없어 지팡이로 자동 전환했습니다.':'No stones remain. Switched to the staff.',
    '과녁을 향해 돌팔매를 5번 연습하십시오.':'Take five sling shots at the target.',
    '치트키가 입력되었습니다.':'Cheat enabled.','치트키가 해제되었습니다.':'Cheat disabled.',
    '잃어버린 양을 찾아주십시오':'Find the lost sheep.','돌은 최대 25개까지 지닐 수 있습니다.':'You can carry up to 25 stones.',
    '가까운 곳에 적합한 돌이 없습니다.':'There is no suitable stone nearby.',
    '돌을 줍는 중 오류가 발생했습니다. 다시 시도해 주세요.':'The stone could not be collected. Try again.',
    '멀리서 맹수의 기척이 느껴집니다.':'A predator is nearby.','성 안에 강도가 나타났습니다.':'A bandit appeared inside the city.',
    '성 밖에 야생 동물이 나타났습니다.':'A wild animal appeared outside the city.','과녁 명중!':'Target hit!',
    '양 떼가 기혼 샘의 물을 마셔 갈증을 해소했습니다.':'The flock drank from Gihon Spring and quenched its thirst.',
    '양 떼가 쉴로악흐의 물을 마셔 갈증을 해소했습니다.':'The flock drank from Siloam and quenched its thirst.',
    '양 떼가 심하게 목말라합니다. 다음 물구유를 서둘러 찾으십시오.':'The flock is very thirsty. Hurry to the next water trough.',
    '미션 실패!':'Mission Failed!',
    '양 떼가 물을 마시지 못했습니다. 마지막 저장 지점에서 다시 시작하시겠습니까?':'The flock could not reach water. Restart from your latest save?',
    '양젖을 짜고 있습니다.':'Milking the flock.',
    '맹수에게 패배해 셰켈 5를 빼앗겼습니다.':'A predator defeated you. You lost 5 shekels.',
    '저장되었습니다.':'Game saved.',
    '이 게임은 데스크탑 환경에 맞게 제작되었습니다.':'This game is designed for desktop computers.',
    '더 넓은 화면과 키보드·마우스로 플레이해 주세요.':'Please play on a larger screen with a keyboard and mouse.',
    '코드·그래픽·음원·게임 자산의 무단 복제, 재배포 및 상업적 이용을 금합니다.':'Unauthorized copying, redistribution, or commercial use of the code, graphics, audio, or game assets is prohibited.',
    'Tab 또는 방향키로 선택 · Enter로 실행':'Select with Tab or the arrow keys · Confirm with Enter',
    'WASD 이동 · 마우스 360° 시점 · V 시점 변경 · Space 뛰기 · Shift 점프 · Z 양 호출 · 우클릭 조준 · 좌클릭 발사 · E 또는 Ctrl 돌 줍기 · Tab 무기 전환 · Enter 치트 콘솔 · Esc 메뉴':'WASD Move · Mouse Look · V Camera · Space Run · Shift Jump · Z Call Flock · Right Click Aim · Left Click Throw · E or Ctrl Collect Stone · Tab Switch Weapon · Enter Cheat Console · Esc Menu',
    '언어 선택':'Select Language','언어 변경':'Change Language','영어':'English','한국어':'Korean','히브리어':'Hebrew',
    '키 소개':'Controls','설정으로 돌아가기':'Back to Settings','두루마리 형태의 미니맵':'Scroll-shaped minimap',
    '설정 메뉴':'Settings menu','일시정지 메뉴':'Pause menu','돌팔매 연습 선택':'Sling practice choice',
    '© 2026 Adam / JewishKorean. All rights reserved.':'© 2026 Adam / JewishKorean. All rights reserved.',
    'N':'N','이동':'Move','마우스':'Mouse','360° 시점 조작':'360° camera control','시점 변경':'Change camera',
    '뛰기':'Run','점프':'Jump','양 호출':'Call the flock','우클릭':'Right Click','좌클릭':'Left Click',
    '조준':'Aim','발사':'Throw','돌 줍기':'Collect stone','무기 전환':'Switch weapon',
    '치트 콘솔':'Cheat console','메뉴':'Menu',
    '(치트키는 제작자에게 물어보세요)':'(Ask the creator for cheat codes)',
    '다비드로 게임 시작':'Start the game as David','청소년 다비드 캐릭터 선택 완성본':'Young David character portrait',
    '이 야영지에 머물며 밤이 끝날 때까지 양 떼를 지키십시오.':'Stay at this camp and protect the flock until the night ends.',
    '밤 동안에는 이 야영지에 머물러 양 떼를 지키십시오.':'Stay at this camp and protect the flock through the night.',
    '모든 양을 잃었습니다':'The Entire Flock Was Lost',
    '양 떼를 모두 잃어 셰켈과 존중을 포함한 모든 진행 상황이 초기화되었습니다. 처음부터 다시 시작하십시오.':'The entire flock was lost. All progress, including shekels and respect, has been reset. Start again from the beginning.',
    '남은 양이 5마리 미만이어서 셰켈 보상 없음':'No shekel reward because fewer than five sheep remain',
    '다비드의 도시 · 성전산 · 키드론 골짜기 · 올리브산 성문과 골목을 따라 성전산까지 올라갈 수 있습니다.':"David's City · Temple Mount · Kidron Valley · Mount of Olives Follow the city gates and alleys to reach the Temple Mount.",
    '양들은 남문 밖 양 상점 곁의 안전한 대기장에서 기다립니다.':'The flock is waiting in the safe pen beside the sheep stall outside the South Gate.',
    '남문 밖 대기장에서 양 떼와 다시 합류했습니다.':'You rejoined the flock in the pen outside the South Gate.',
    '양 한 마리가 위험합니다. 맹수를 빨리 막으십시오.':'A sheep is in danger. Stop the predator quickly.',
    '양 한 마리는 100셰켈입니다. 셰켈이 부족합니다.':'One sheep costs 100 shekels. You do not have enough.',
    '성 안에서 강도의 기척이 느껴집니다.':'A bandit is nearby inside the city.',
    '새벽이 되었습니다. 양 떼가 야영지에서 다시 이동을 시작합니다.':'Dawn has arrived. The flock is leaving the camp again.',
    '야영지에서 너무 멀리 벗어났습니다. 양 떼 곁으로 돌아가십시오.':'You have moved too far from camp. Return to the flock.',
    '야영지에 도착했습니다. 이곳에서 밤이 끝날 때까지 양 떼를 지키십시오.':'You reached the camp. Protect the flock here until the night ends.',
    '짧고 위험한 와디 길':'Short, Dangerous Wadi Route',
    '길고 안전한 올리브산 능선길':'Long, Safe Mount of Olives Ridge Route',
    '물이 있는 샘길':'Spring Route with Water',
    '짧은 와디 길: 맹수가 자주 나타나지만 도착 시 존중 보너스를 받습니다.':'Short wadi route: predators appear more often, but arrival grants bonus respect.',
    '올리브산 능선길: 더 멀지만 맹수 출현이 적습니다.':'Mount of Olives ridge route: farther, but predators appear less often.',
    '샘길: 기혼 샘이나 쉴로악흐에서 양 떼의 갈증을 채울 수 있습니다.':'Spring route: the flock can drink at Gihon Spring or Siloam.',
    '남문 경비병이 다비드를 추격합니다.':'The South Gate guard is chasing David.',
    '경비병 경계':'Guard Alert','성전 뜰에서 에너지가 회복되었습니다.':'David recovered his energy in the Temple courtyard.',
    '게임을 시작하지 못했습니다. 잠시 후 다시 시도해 주세요.':'The game could not start. Please try again in a moment.',
    '성 안의 사람을 공격해 경비병이 추격합니다.':'You attacked someone inside the city, and the guard is chasing you.',
    '나를 속이려 하지 마!':"You can't fool me!",
    '화면 회전 안내':'Screen rotation instructions','기기를 가로로 돌려주세요':'Rotate your device to landscape',
    '게임은 휴대폰과 태블릿에서 가로 화면으로 진행됩니다.':'The game runs in landscape mode on phones and tablets.',
    '모바일 게임 조작':'Mobile game controls','이동 조이스틱':'Movement joystick','양떼 부르기':'Call the flock',
    '돌팔매 던지기':'Throw with sling','지팡이 사용':'Use shepherd staff','무기 선택':'Select weapon','달리기':'Run','소리 설정':'Sound settings','게임 종료':'Exit Game',
    '앱 설치 안내':'App installation','양떼를 지켜라 앱 아이콘':'Protect the Flock app icon',
    '앱으로 설치하시겠습니까?':'Install this game as an app?','홈 화면에서 전체 화면으로 바로 게임을 시작할 수 있습니다.':'Launch the game directly from your home screen in full screen.',
    '앱으로 설치':'Install App','나중에':'Later',
    'iPhone/iPad에서는 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하십시오.':'On iPhone or iPad, tap Share and then choose “Add to Home Screen.”',
    '브라우저 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택하십시오.':'Choose “Install app” or “Add to Home Screen” from the browser menu.'
  };

  function activeDictionary() {
    return lang === 'he' ? he : en;
  }

  function dynamicTerm(value) {
    const dictionary = activeDictionary();
    if (dictionary[value]) return dictionary[value];
    if (value === '+15 셰켈') return lang === 'he' ? '15+ שקלים' : '+15 shekels';
    return value;
  }

  function defeatedEnemy(value) {
    if (lang !== 'he') return dynamicTerm(value);
    return ({
      '사자':'האריה','늑대':'הזאב','여우':'השועל','강도':'השודד','적':'האויב'
    })[value] || dynamicTerm(value);
  }

  function hitTarget(value) {
    if (lang !== 'he') return dynamicTerm(value);
    return ({
      '사자':'באריה','늑대':'בזאב','여우':'בשועל','강도':'בשודד','적':'באויב'
    })[value] || ('ב־' + dynamicTerm(value));
  }

  const hePatterns = [
    [/^양 한 마리를 100셰켈에 샀습니다\. 현재 ([\d,]+)마리$/, 'קנית כבשה אחת ב־100 שקלים. כעת יש בצאן $1 כבשים.'],
    [/^맹수가 양 한 마리를 공격했습니다\. 남은 양 ([\d,]+)마리$/, 'חיית טרף תקפה כבשה. נותרו $1 כבשים.'],
    [/^늑대 한 마리를 물리쳤습니다\. (.+)$/, function (_all, reward) { return 'הבסת זאב אחד. ' + dynamicTerm(reward); }],
    [/^늑대 떼를 모두 물리쳤습니다\. 존중 \+10 · (.+)$/, function (_all, reward) { return 'הבסת את כל להקת הזאבים. כבוד +10 · ' + dynamicTerm(reward); }],
    [/^(.+)을 물리쳤습니다\. 존중 \+5 · (.+)$/, function (_all, enemy, reward) { return 'הבסת את ' + defeatedEnemy(enemy) + '. כבוד +5 · ' + dynamicTerm(reward); }],
    [/^남은 양이 5마리 미만이어서 셰켈 보상 없음$/, 'אין פרס שקלים משום שנותרו פחות מחמש כבשים'],
    [/^\+15 셰켈$/, '15+ שקלים'],
    [/^돌\s*([\d,]+)(\/25)?$/, 'אבנים $1$2'],
    [/^존중\s*([\d,]+)(\/100)?$/, 'כבוד $1$2'],
    [/^([\d,]+)\s*셰켈$/, '$1 שקלים'],
    [/^존중 \+([\d,]+) 상승 · 셰켈 \+15$/, 'כבוד +$1 · 15+ שקלים'],
    [/^(.+)에게 필살기 명중!$/, function (_all, target) { return 'פגיעת המהלך המיוחד ' + hitTarget(target) + '!'; }],
    [/^(.+) 명중!$/, function (_all, target) { return 'פגיעה ' + hitTarget(target) + '!'; }],
    [/^(.+)을 주웠습니다\. \(([\d,]+)\/25\)$/, function (_all, stone, count) { return 'אספת ' + dynamicTerm(stone) + '. (' + count + '/25)'; }]
  ];

  const enPatterns = [
    [/^양 한 마리를 100셰켈에 샀습니다\. 현재 ([\d,]+)마리$/, 'Bought one sheep for 100 shekels. Flock: $1 sheep.'],
    [/^맹수가 양 한 마리를 공격했습니다\. 남은 양 ([\d,]+)마리$/, 'A predator attacked one sheep. Sheep remaining: $1.'],
    [/^늑대 한 마리를 물리쳤습니다\. (.+)$/, function (_all, reward) { return 'Defeated one wolf. ' + dynamicTerm(reward); }],
    [/^늑대 떼를 모두 물리쳤습니다\. 존중 \+10 · (.+)$/, function (_all, reward) { return 'Defeated the wolf pack. Respect +10 · ' + dynamicTerm(reward); }],
    [/^(.+)을 물리쳤습니다\. 존중 \+5 · (.+)$/, function (_all, enemy, reward) { return 'Defeated the ' + defeatedEnemy(enemy).toLowerCase() + '. Respect +5 · ' + dynamicTerm(reward); }],
    [/^남은 양이 5마리 미만이어서 셰켈 보상 없음$/, 'No shekel reward because fewer than five sheep remain'],
    [/^\+15 셰켈$/, '+15 shekels'],
    [/^돌\s*([\d,]+)(\/25)?$/, 'Stones $1$2'],
    [/^존중\s*([\d,]+)(\/100)?$/, 'Respect $1$2'],
    [/^([\d,]+)\s*셰켈$/, '$1 shekels'],
    [/^존중 \+([\d,]+) 상승 · 셰켈 \+15$/, 'Respect +$1 · Shekels +15'],
    [/^(.+)에게 필살기 명중!$/, function (_all, target) { return 'Special attack hit the ' + hitTarget(target).toLowerCase() + '!'; }],
    [/^(.+) 명중!$/, function (_all, target) { return 'Hit the ' + hitTarget(target).toLowerCase() + '!'; }],
    [/^(.+)을 주웠습니다\. \(([\d,]+)\/25\)$/, function (_all, stone, count) { return 'Collected ' + dynamicTerm(stone).toLowerCase() + '. (' + count + '/25)'; }]
  ];

  function tr(value) {
    if (!lang || lang === 'ko' || value == null) return value;
    const text = String(value);
    const trimmed = text.trim();
    const normalized = trimmed.replace(/\s+/g, ' ');
    const dictionary = activeDictionary();
    if (dictionary[normalized]) return text.replace(trimmed, dictionary[normalized]);
    const patterns = lang === 'he' ? hePatterns : enPatterns;
    for (const entry of patterns) {
      const re = entry[0];
      const replacement = entry[1];
      if (!re.test(normalized)) continue;
      re.lastIndex = 0;
      return text.replace(trimmed, normalized.replace(re, replacement));
    }
    return text;
  }

  function applyDocumentDirection() {
    document.documentElement.lang = lang || 'en';
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    if (document.body) document.body.classList.toggle('lang-he', lang === 'he');
    const description = document.querySelector('meta[name="description"]');
    if (lang === 'he') {
      document.title = 'שמור על הצאן · v2.3.1';
      if (description) description.content = 'הרפתקת רועים תלת־ממדית למחשבים ולמכשירים ניידים, בירושלים העתיקה ובמדבר יהודה.';
    } else if (lang === 'ko') {
      document.title = '양떼를 지켜라 · v2.3.1';
      if (description) description.content = '고대 예루샬라임과 유대 광야를 배경으로 양 떼를 지키는 데스크톱·모바일 3D 양치기 모험입니다.';
    } else {
      document.title = 'Protect the Flock · v2.3.1';
      if (description) description.content = 'A cross-device 3D shepherd adventure set in ancient Jerusalem and the Judean wilderness.';
    }
  }

  let translating = false;
  function translateNode(node) {
    if (!lang || lang === 'ko' || !node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      const current = node.nodeValue;
      const next = tr(current);
      if (next !== current) node.nodeValue = next;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      ['placeholder','aria-label','alt','title'].forEach(function (attr) {
        if (!node.hasAttribute(attr)) return;
        const current = node.getAttribute(attr);
        const next = tr(current);
        if (next !== current) node.setAttribute(attr, next);
      });
      node.childNodes.forEach(translateNode);
    }
  }

  function refreshButtons() {
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      button.classList.toggle('active', button.dataset.lang === lang);
    });
  }

  function setLanguage(next) {
    if (!supported.includes(next) || next === lang) return;
    window.dispatchEvent(new CustomEvent('shepherd:before-language-change'));
    saveLanguage(next);
    const url = new URL(location.href);
    url.searchParams.set('lang', next);
    location.href = url.toString();
  }

  window.ShepherdI18n = { tr: tr, getLanguage: function () { return lang || 'en'; }, setLanguage: setLanguage };

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-lang]').forEach(function (button) {
      button.addEventListener('click', function () { setLanguage(button.dataset.lang); });
    });
    const gate = document.querySelector('#languageGate');
    if (!lang) {
      document.documentElement.lang = 'en';
      document.documentElement.dir = 'ltr';
      document.body.classList.add('language-unselected');
      if (gate) gate.classList.remove('hidden');
      document.documentElement.classList.remove('i18n-pending');
      return;
    }
    document.body.classList.remove('language-unselected');
    if (gate) gate.classList.add('hidden');
    applyDocumentDirection();
    refreshButtons();
    translateNode(document.body);
    document.documentElement.classList.remove('i18n-pending');
    const observer = new MutationObserver(function (mutations) {
      if (translating) return;
      translating = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData') translateNode(mutation.target);
          else if (mutation.type === 'childList') mutation.addedNodes.forEach(translateNode);
          else translateNode(mutation.target);
        }
      } finally {
        translating = false;
      }
    });
    observer.observe(document.body, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['placeholder','aria-label','alt','title'] });
  });
})();
