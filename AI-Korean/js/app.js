document.addEventListener('DOMContentLoaded', () => {
    fetch('data/words.json')
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('curriculum-container');
            const step = data.curriculum.reading[0]; // 1단계 자음 확인
            container.innerHTML = `<h2>${step.name}</h2><p>${step.items.join(', ')}</p>`;
        })
        .catch(error => console.error('데이터 로드 실패:', error));
});