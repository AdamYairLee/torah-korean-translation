(() => {
  "use strict";

  const DAILY_LIMIT = 5;
  const MAX_MISTAKES = 3;
  const ROUND_SECONDS = 60;
  const STORAGE_KEY = "aiKoreanMasterLetterGameDailyState";

  const INITIALS = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ",
    "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ",
    "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
  ];

  const MEDIALS = [
    "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ",
    "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ",
    "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅡ", "ㅢ", "ㅣ"
  ];

  const FINALS = [
    "",
    "ㄱ", "ㄲ", "ㄳ", "ㄴ", "ㄵ", "ㄶ",
    "ㄷ", "ㄹ", "ㄺ", "ㄻ", "ㄼ", "ㄽ",
    "ㄾ", "ㄿ", "ㅀ", "ㅁ", "ㅂ", "ㅄ",
    "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅊ", "ㅋ",
    "ㅌ", "ㅍ", "ㅎ"
  ];

  const COMPOUND_MEDIALS = {
    "ㅘ": ["ㅗ", "ㅏ"],
    "ㅙ": ["ㅗ", "ㅐ"],
    "ㅚ": ["ㅗ", "ㅣ"],
    "ㅝ": ["ㅜ", "ㅓ"],
    "ㅞ": ["ㅜ", "ㅔ"],
    "ㅟ": ["ㅜ", "ㅣ"],
    "ㅢ": ["ㅡ", "ㅣ"]
  };

  const COMPOUND_FINALS = {
    "ㄳ": ["ㄱ", "ㅅ"],
    "ㄵ": ["ㄴ", "ㅈ"],
    "ㄶ": ["ㄴ", "ㅎ"],
    "ㄺ": ["ㄹ", "ㄱ"],
    "ㄻ": ["ㄹ", "ㅁ"],
    "ㄼ": ["ㄹ", "ㅂ"],
    "ㄽ": ["ㄹ", "ㅅ"],
    "ㄾ": ["ㄹ", "ㅌ"],
    "ㄿ": ["ㄹ", "ㅍ"],
    "ㅀ": ["ㄹ", "ㅎ"],
    "ㅄ": ["ㅂ", "ㅅ"]
  };

  const BASIC_JAMO = [
    "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ",
    "ㅂ", "ㅃ", "ㅅ", "ㅆ", "ㅇ", "ㅈ", "ㅉ",
    "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ",
    "ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ",
    "ㅖ", "ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ", "ㅣ"
  ];

  const elements = {
    homeButton: document.getElementById("homeButton"),
    completeHomeButton: document.getElementById("completeHomeButton"),
    lockedHomeButton: document.getElementById("lockedHomeButton"),

    startScreen: document.getElementById("startScreen"),
    playScreen: document.getElementById("playScreen"),
    resultScreen: document.getElementById("resultScreen"),
    completeScreen: document.getElementById("completeScreen"),
    lockedScreen: document.getElementById("lockedScreen"),

    gameTitle: document.getElementById("gameTitle"),
    gameDescription: document.getElementById("gameDescription"),
    difficultyTitle: document.getElementById("difficultyTitle"),
    easyTitle: document.getElementById("easyTitle"),
    easyDescription: document.getElementById("easyDescription"),
    hardTitle: document.getElementById("hardTitle"),
    hardDescription: document.getElementById("hardDescription"),
    startButton: document.getElementById("startButton"),

    dailyProgressLabel: document.getElementById("dailyProgressLabel"),
    dailyProgress: document.getElementById("dailyProgress"),
    timer: document.getElementById("timer"),

    instructionText: document.getElementById("instructionText"),
    listenButton: document.getElementById("listenButton"),
    listenText: document.getElementById("listenText"),
    targetWord: document.getElementById("targetWord"),
    mistakeLabel: document.getElementById("mistakeLabel"),
    mistakeCount: document.getElementById("mistakeCount"),
    selectedLetters: document.getElementById("selectedLetters"),
    letterGrid: document.getElementById("letterGrid"),

    resultTitle: document.getElementById("resultTitle"),
    resultWord: document.getElementById("resultWord"),
    resultMeaning: document.getElementById("resultMeaning"),
    successActions: document.getElementById("successActions"),
    failureActions: document.getElementById("failureActions"),
    nextButton: document.getElementById("nextButton"),
    retryButton: document.getElementById("retryButton"),
    skipButton: document.getElementById("skipButton"),

    completeTitle: document.getElementById("completeTitle"),
    completeMessage: document.getElementById("completeMessage"),
    learnedWordsTitle: document.getElementById("learnedWordsTitle"),
    learnedWords: document.getElementById("learnedWords"),

    lockedTitle: document.getElementById("lockedTitle"),
    lockedMessage: document.getElementById("lockedMessage")
  };

  let language = getCurrentLanguage();
  let text = GAME_I18N[language];
  let state = loadDailyState();

  let currentWord = null;
  let currentAnswer = [];
  let selectedAnswer = [];
  let timerId = null;
  let secondsLeft = ROUND_SECONDS;
  let roundFinished = false;

  function getCurrentLanguage() {
    const possibleKeys = [
      "language",
      "selectedLanguage",
      "appLanguage",
      "currentLang",
      "aiKoreanLanguage"
    ];

    for (const key of possibleKeys) {
      const value = localStorage.getItem(key);
      if (value === "en") return "en";
      if (value === "he") return "he";
    }

    const htmlLang = document.documentElement.lang;
    return htmlLang === "en" ? "en" : "he";
  }

  function applyLanguage() {
    language = getCurrentLanguage();
    text = GAME_I18N[language];

    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";

    elements.gameTitle.textContent = text.gameTitle;
    elements.gameDescription.textContent = text.gameDescription;
    elements.difficultyTitle.textContent = text.difficultyTitle;
    elements.easyTitle.textContent = text.easyTitle;
    elements.easyDescription.textContent = text.easyDescription;
    elements.hardTitle.textContent = text.hardTitle;
    elements.hardDescription.textContent = text.hardDescription;
    elements.startButton.textContent = text.start;

    elements.dailyProgressLabel.textContent = text.dailyProgress;
    elements.instructionText.textContent = text.instruction;
    elements.listenText.textContent = text.listen;
    elements.mistakeLabel.textContent = text.mistakes;

    elements.retryButton.textContent = text.retry;
    elements.skipButton.textContent = text.skip;
    elements.completeHomeButton.textContent = text.backHome;
    elements.lockedHomeButton.textContent = text.backHome;
    elements.learnedWordsTitle.textContent = text.learnedWords;

    updateStatus();
  }

  function getDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getAllWords() {
    return GAME_WORD_GROUPS.flatMap(group => group.words);
  }

  function shuffle(items) {
    const copy = [...items];

    for (let index = copy.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
    }

    return copy;
  }

  function createDailyState() {
    const allWords = getAllWords();

    if (allWords.length < DAILY_LIMIT) {
      throw new Error("게임 단어가 최소 5개 필요합니다.");
    }

    const selected = shuffle(allWords).slice(0, DAILY_LIMIT);

    return {
      date: getDateKey(),
      words: selected,
      currentIndex: 0,
      completedCount: 0,
      mistakes: 0,
      difficulty: "easy",
      completedForToday: false,
      failedForToday: false
    };
  }

  function saveDailyState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadDailyState() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      const newState = createDailyState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    }

    try {
      const parsed = JSON.parse(stored);

      if (
        parsed.date !== getDateKey() ||
        !Array.isArray(parsed.words) ||
        parsed.words.length !== DAILY_LIMIT
      ) {
        const newState = createDailyState();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        return newState;
      }

      return parsed;
    } catch (error) {
      console.error("게임 저장 데이터를 읽지 못했습니다.", error);
      const newState = createDailyState();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      return newState;
    }
  }

  function splitHangulWord(word) {
    const result = [];

    for (const character of word) {
      const code = character.charCodeAt(0);

      if (code < 0xac00 || code > 0xd7a3) {
        continue;
      }

      const syllableIndex = code - 0xac00;
      const initialIndex = Math.floor(syllableIndex / 588);
      const medialIndex = Math.floor((syllableIndex % 588) / 28);
      const finalIndex = syllableIndex % 28;

      result.push(INITIALS[initialIndex]);

      const medial = MEDIALS[medialIndex];
      if (COMPOUND_MEDIALS[medial]) {
        result.push(...COMPOUND_MEDIALS[medial]);
      } else {
        result.push(medial);
      }

      const final = FINALS[finalIndex];
      if (final) {
        if (COMPOUND_FINALS[final]) {
          result.push(...COMPOUND_FINALS[final]);
        } else {
          result.push(final);
        }
      }
    }

    return result;
  }

  function createBoard(answerLetters) {
    if (answerLetters.length > 36) {
      throw new Error("이 단어는 자모가 36개를 넘어 6×6 보드에 넣을 수 없습니다.");
    }

    const board = [...answerLetters];

    while (board.length < 36) {
      const randomLetter = BASIC_JAMO[
        Math.floor(Math.random() * BASIC_JAMO.length)
      ];
      board.push(randomLetter);
    }

    return shuffle(board);
  }

  function showScreen(screenElement) {
    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });

    screenElement.classList.add("active");
  }

  function updateStatus() {
    const displayNumber = Math.min(state.currentIndex + 1, DAILY_LIMIT);
    elements.dailyProgress.textContent =
      state.completedForToday ? `${DAILY_LIMIT} / ${DAILY_LIMIT}` : `${displayNumber} / ${DAILY_LIMIT}`;

    elements.mistakeCount.textContent = `${state.mistakes} / ${MAX_MISTAKES}`;
  }

  function getSelectedDifficulty() {
    const selected = document.querySelector(
      'input[name="difficulty"]:checked'
    );

    return selected ? selected.value : "easy";
  }

  function beginGame() {
    if (state.failedForToday) {
      showLockedScreen(false);
      return;
    }

    if (state.completedForToday || state.currentIndex >= DAILY_LIMIT) {
      showCompleteScreen(true);
      return;
    }

    state.difficulty = getSelectedDifficulty();
    saveDailyState();
    startCurrentRound();
  }

  function startCurrentRound() {
    clearTimer();
    roundFinished = false;
    selectedAnswer = [];

    currentWord = state.words[state.currentIndex];
    currentAnswer = splitHangulWord(currentWord.korean);

    if (!currentWord || currentAnswer.length === 0) {
      console.error("잘못된 게임 단어입니다.", currentWord);
      skipCurrentWord();
      return;
    }

    renderBoard(createBoard(currentAnswer));
    renderSelectedLetters();
    updateStatus();

    if (state.difficulty === "easy") {
      elements.targetWord.textContent = currentWord.korean;
      elements.targetWord.hidden = false;
    } else {
      elements.targetWord.textContent = "";
      elements.targetWord.hidden = true;
    }

    showScreen(elements.playScreen);
    startTimer();

    window.setTimeout(() => {
      speakKorean(currentWord.korean);
    }, 250);
  }

  function renderBoard(board) {
    elements.letterGrid.innerHTML = "";

    board.forEach((letter, index) => {
      const button = document.createElement("button");

      button.type = "button";
      button.className = "letter-cell";
      button.textContent = letter;
      button.dataset.letter = letter;
      button.dataset.index = String(index);
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", letter);

      button.addEventListener("click", () => {
        handleLetterClick(button);
      });

      elements.letterGrid.appendChild(button);
    });
  }

  function handleLetterClick(button) {
    if (roundFinished || button.disabled) return;

    const chosenLetter = button.dataset.letter;
    const expectedLetter = currentAnswer[selectedAnswer.length];

    if (chosenLetter !== expectedLetter) {
      button.classList.add("wrong");

      window.setTimeout(() => {
        button.classList.remove("wrong");
      }, 450);

      registerRoundFailure("wrong");
      return;
    }

    button.disabled = true;
    button.classList.add("selected");
    selectedAnswer.push(chosenLetter);
    renderSelectedLetters();

    if (selectedAnswer.length === currentAnswer.length) {
      finishRoundSuccess();
    }
  }

  function renderSelectedLetters() {
    elements.selectedLetters.textContent =
      selectedAnswer.length > 0 ? selectedAnswer.join("  ") : "· · ·";
  }

  function registerRoundFailure(reason) {
    if (roundFinished) return;

    roundFinished = true;
    clearTimer();

    state.mistakes += 1;
    saveDailyState();
    updateStatus();

    if (state.mistakes >= MAX_MISTAKES) {
      state.failedForToday = true;
      saveDailyState();
      showLockedScreen(false);
      return;
    }

    elements.resultTitle.textContent =
      reason === "time" ? text.timeUp : text.wrong;

    elements.resultWord.textContent = currentWord.korean;
    elements.resultMeaning.textContent = currentWord[language] || "";
    elements.successActions.hidden = true;
    elements.failureActions.hidden = false;

    showScreen(elements.resultScreen);
  }

  function finishRoundSuccess() {
    if (roundFinished) return;

    roundFinished = true;
    clearTimer();

    elements.resultTitle.textContent = text.correct;
    elements.resultWord.textContent = currentWord.korean;
    elements.resultMeaning.textContent = currentWord[language] || "";

    elements.successActions.hidden = false;
    elements.failureActions.hidden = true;

    const isLast = state.currentIndex >= DAILY_LIMIT - 1;
    elements.nextButton.textContent = isLast ? text.finish : text.next;

    showScreen(elements.resultScreen);
  }

  function completeCurrentWord() {
    state.completedCount += 1;
    state.currentIndex += 1;

    if (state.currentIndex >= DAILY_LIMIT) {
      state.completedForToday = true;
      saveDailyState();
      showCompleteScreen(false);
      return;
    }

    saveDailyState();
    startCurrentRound();
  }

  function retryCurrentWord() {
    /*
      추후 리워드 광고를 붙일 경우 이 함수 시작 부분에서
      광고가 끝난 뒤 startCurrentRound()가 실행되도록 연결하면 됩니다.
    */
    startCurrentRound();
  }

  function skipCurrentWord() {
    state.completedCount += 1;
    state.currentIndex += 1;

    if (state.currentIndex >= DAILY_LIMIT) {
      state.completedForToday = true;
      saveDailyState();
      showCompleteScreen(false);
      return;
    }

    saveDailyState();
    startCurrentRound();
  }

  function showCompleteScreen(alreadyCompleted) {
    clearTimer();

    elements.completeTitle.textContent = alreadyCompleted
      ? text.alreadyCompleteTitle
      : text.completeTitle;

    elements.completeMessage.textContent = alreadyCompleted
      ? text.alreadyCompleteMessage
      : text.completeMessage;

    elements.learnedWords.innerHTML = "";

    state.words.forEach(word => {
      const item = document.createElement("div");
      item.className = "learned-word";

      const korean = document.createElement("strong");
      korean.textContent = word.korean;

      const meaning = document.createElement("span");
      meaning.textContent = word[language] || "";

      item.append(korean, meaning);
      elements.learnedWords.appendChild(item);
    });

    updateStatus();
    showScreen(elements.completeScreen);
  }

  function showLockedScreen(alreadyCompleted) {
    clearTimer();

    elements.lockedTitle.textContent = alreadyCompleted
      ? text.alreadyCompleteTitle
      : text.lockedTitle;

    elements.lockedMessage.textContent = alreadyCompleted
      ? text.alreadyCompleteMessage
      : text.lockedMessage;

    showScreen(elements.lockedScreen);
  }

  function startTimer() {
    clearTimer();
    secondsLeft = ROUND_SECONDS;
    updateTimer();

    timerId = window.setInterval(() => {
      secondsLeft -= 1;
      updateTimer();

      if (secondsLeft <= 0) {
        clearTimer();
        registerRoundFailure("time");
      }
    }, 1000);
  }

  function clearTimer() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  function updateTimer() {
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;

    elements.timer.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function speakKorean(word) {
    if (!("speechSynthesis" in window)) {
      console.warn("이 브라우저는 음성 합성을 지원하지 않습니다.");
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "ko-KR";
    utterance.rate = 0.82;
    utterance.pitch = 1;

    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(voice =>
      voice.lang && voice.lang.toLowerCase().startsWith("ko")
    );

    if (koreanVoice) {
      utterance.voice = koreanVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  function goHome() {
    clearTimer();
    window.speechSynthesis?.cancel();

    /*
      game 폴더가 한글앱 바로 아래에 있다면 ../index.html 이 맞습니다.
      현재 앱의 메인 파일명이 다르면 아래 주소만 수정하세요.
    */
    window.location.href = "../index.html";
  }

  function initialize() {
    applyLanguage();
    updateStatus();

    if (state.failedForToday) {
      showLockedScreen(false);
      return;
    }

    if (state.completedForToday || state.currentIndex >= DAILY_LIMIT) {
      showCompleteScreen(true);
      return;
    }

    const savedDifficulty = state.difficulty || "easy";
    const radio = document.querySelector(
      `input[name="difficulty"][value="${savedDifficulty}"]`
    );

    if (radio) radio.checked = true;

    showScreen(elements.startScreen);
  }

  elements.startButton.addEventListener("click", beginGame);
  elements.listenButton.addEventListener("click", () => {
    if (currentWord) speakKorean(currentWord.korean);
  });

  elements.nextButton.addEventListener("click", completeCurrentWord);
  elements.retryButton.addEventListener("click", retryCurrentWord);
  elements.skipButton.addEventListener("click", skipCurrentWord);

  elements.homeButton.addEventListener("click", goHome);
  elements.completeHomeButton.addEventListener("click", goHome);
  elements.lockedHomeButton.addEventListener("click", goHome);

  window.addEventListener("beforeunload", () => {
    clearTimer();
    window.speechSynthesis?.cancel();
  });

  initialize();
})();
