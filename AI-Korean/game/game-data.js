/*
  임시 게임 데이터입니다.

  반드시 나중에 현재 자모음 마스터 코스의 실제 4개 조합 단어로 교체하세요.
  형식은 그대로 유지하면 됩니다.

  한 단어의 자모 수가 36개를 넘으면 6×6 보드에 들어갈 수 없습니다.
*/

const GAME_WORD_GROUPS = [
  {
    id: "combination-1",
    words: [
      { korean: "나무", he: "עץ", en: "tree" },
      { korean: "나라", he: "מדינה", en: "country" },
      { korean: "바다", he: "ים", en: "sea" },
      { korean: "사과", he: "תפוח", en: "apple" }
    ]
  },
  {
    id: "combination-2",
    words: [
      { korean: "우유", he: "חלב", en: "milk" },
      { korean: "아이", he: "ילד", en: "child" },
      { korean: "오이", he: "מלפפון", en: "cucumber" },
      { korean: "여우", he: "שועל", en: "fox" }
    ]
  },
  {
    id: "combination-3",
    words: [
      { korean: "학교", he: "בית ספר", en: "school" },
      { korean: "친구", he: "חבר", en: "friend" },
      { korean: "가방", he: "תיק", en: "bag" },
      { korean: "공부", he: "לימוד", en: "study" }
    ]
  },
  {
    id: "combination-4",
    words: [
      { korean: "사랑", he: "אהבה", en: "love" },
      { korean: "감사", he: "תודה", en: "thanks" },
      { korean: "음악", he: "מוזיקה", en: "music" },
      { korean: "한국", he: "קוריאה", en: "Korea" }
    ]
  }
];
