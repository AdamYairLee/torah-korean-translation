function showCurriculumMenu() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <button class="back-btn" onclick="location.reload()">← 메인으로</button>
        <div class="btn-group">
            <button onclick="loadLearning('consonants')">자음 <span class="korean-sub">עיצורים</span></button>
            <button onclick="loadLearning('vowels')">모음 <span class="korean-sub">תנועות</span></button>
            <button onclick="loadLearning('basic_no_patchim')">받침 없는 기본 조합 <span class="korean-sub">צירופים בסיסיים</span></button>
            <button onclick="loadLearning('basic_patchim')">받침 있는 기본 조합 <span class="korean-sub">עיצור בסוף הברה</span></button>
            <button onclick="loadLearning('medium_patchim')">받침 있는 중등 조합 <span class="korean-sub">צירופים בינוניים</span></button>
            <button onclick="loadLearning('advanced_patchim')">받침 있는 고등 조합 <span class="korean-sub">צירופים מתקדמים</span></button>
        </div>
    `;
}

async function loadLearning(category) {
    const app = document.getElementById('app');
    const response = await fetch('data/curriculum.json');
    const allData = await response.json();
    const filteredData = allData.filter(item => item.category === category);
    
    app.innerHTML = `
        <button class="back-btn" onclick="location.reload()">← 메인으로</button>
        <button class="back-btn" onclick="showCurriculumMenu()">이전 메뉴로</button>
        <div class="list-container fade-in"></div>
    `;
    
    const container = app.querySelector('.list-container');
    filteredData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        // 자음/모음은 글자 크기를 더 키우고, 발음 기호는 깔끔하게 처리
        card.innerHTML = `
            <p class="hebrew-text" style="font-family: Arial, sans-serif; font-size: 1.5em;">${item.he}</p>
            <p class="korean-text">${item.ko}</p>
        `;
        card.onclick = () => speak(item.ko);
        container.appendChild(card);
    });
}
function speak(text) {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ko-KR';
    u.pitch = 1.0;      // 0~2 사이 (1.0이 기본, 낮을수록 굵고 무게감 있음)
    u.rate = 0.85;      // 0.1~2 사이 (1.0이 기본, 낮을수록 천천히 또박또박)
    u.volume = 1.0;     // 0~1 사이 (최대 볼륨)

    // 구글 음성 우선 탐색
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => v.name.includes('Google 한국어'));
    if (googleVoice) u.voice = googleVoice;

    window.speechSynthesis.speak(u);
}