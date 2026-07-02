async function loadLearning(type) {
    const app = document.getElementById('app');
    
    // 데이터 로드
    const response = await fetch(`data/${type}.json`);
    const data = await response.json();
    
    // 메인 화면 숨기기 및 컨텐츠 영역 초기화
    app.innerHTML = `
        <button class="back-btn" onclick="location.reload()">← 메인으로</button>
        <div class="list-container fade-in"></div>
    `;
    
    const container = app.querySelector('.list-container');
    
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <p class="hebrew-text">${item.he}</p>
            <p class="korean-text">${item.ko}</p>
        `;
        // 클릭 시 음성 출력
        card.onclick = () => speak(item.ko);
        container.appendChild(card);
    });
}

function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.pitch = 1.3;
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
}
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    // 감정이 섞인 듯한 톤과 속도 조정
    utterance.pitch = 1.1; 
    utterance.rate = 0.9;

    // 브라우저에서 제공하는 더 자연스러운 목소리 탐색
    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find(v => v.lang === 'ko-KR' && v.name.includes('Google'));
    if (koreanVoice) utterance.voice = koreanVoice;

    window.speechSynthesis.speak(utterance);
}