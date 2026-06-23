function loadContent(filename) {
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('torah-container');
            container.innerHTML = '';
            
            data.content.forEach(item => {
                const div = document.createElement('div');
                
                // 1. 슈타인잘쯔 방식
                if (item.type) {
                    div.className = item.type === 'paragraph' ? 's-body' : 's-title';
                    div.innerHTML = item.text.replace(/\((.*?)\)/g, '<span class="parens">($1)</span>');
                } 
                // 2. 토라 방식 (절 번호 + 라쉬 토글)
                else {
                    div.className = 'verse-item';
                    div.innerHTML = `
                        <div class="verse-header" style="cursor:pointer;">
                            <span class="verse-number">1:${item.id}</span>
                            <span class="hebrew-text">${item.hebrew || ''}</span>
                        </div>
                        <div class="korean-text">${item.korean || ''}</div>
                        ${item.rashi_title ? `
                            <div class="rashi-container" style="display:none; margin-top:5px; border-left:3px solid #ccc; padding-left:10px;">
                                <div class="rashi-title" style="font-weight:bold; font-size:12px;">${item.rashi_title}</div>
                                <div class="rashi-body" style="font-size:11px; color:#444;">${item.rashi_body || ''}</div>
                            </div>
                        ` : ''}
                    `;
                    
                    // 라쉬 토글 클릭 이벤트
                    if (item.rashi_title) {
                        div.querySelector('.verse-header').onclick = function() {
                            const rashi = div.querySelector('.rashi-container');
                            rashi.style.display = (rashi.style.display === 'none') ? 'block' : 'none';
                        };
                    }
                }
                container.appendChild(div);
            });
        });
}
// app.js
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});
// app.js 맨 아래에 추가
function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    // 메뉴가 현재 보이면 숨기고, 안 보이면 보이게 함
    if (menu.style.display === "none") {
        menu.style.display = "block";
    } else {
        menu.style.display = "none";
    }
}
function showInfo(type) {
    const overlay = document.getElementById('info-overlay');
    const content = document.getElementById('info-content');
    
    const data = {
        about: "<h2>소개</h2><p>'생명의 근원을 맞이하는 공간'\n\n - 이 사이트는 토라 원문을 바탕으로 그 기본적인 의미를 우리말로 풀어내는 연구의 공간입니다. 더불어 다양한 유대 문헌의 한국어 번역을 함께 올려 소개하는 공간으로서, 그 궁극적인 목적은 유대인과 이스라엘에 대한 그릇된 이해를 바로잡고, 각자의 삶의 가치를 진정으로 깨닫게 하는데 있습니다.</p>",
        contact: "<h2>문의</h2><p>유튜브: 유대교 TV\n\n / 이메일: koreanjewish@email.com</p>",
        privacy: `<h2>개인정보 처리방침</h2>
                  <p>본 사이트는 사용자에게 어떠한 개인정보도 수집하지 않습니다. 
                  애드센스 광고 노출을 위해 쿠키가 사용될 수 있으나, 개인 식별 정보는 저장하지 않습니다.</p>`
    };

    content.innerHTML = data[type] + '<br><button onclick="closeInfo()">닫기</button>';
    overlay.style.display = 'flex';
    setTimeout(() => overlay.style.opacity = '1', 10); // 페이드인
}

function closeInfo() {
    const overlay = document.getElementById('info-overlay');
    overlay.style.opacity = '0';
    setTimeout(() => overlay.style.display = 'none', 500);
}