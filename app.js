// 1. 콘텐츠 불러오기 함수
function loadContent(filename) {
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('torah-container');
            container.innerHTML = '';
            data.content.forEach(item => {
                const div = document.createElement('div');
                if (item.type) {
                    div.className = item.type === 'paragraph' ? 's-body' : 's-title';
                    div.innerText = item.text; 
                    div.innerHTML = div.innerHTML.replace(/\((.*?)\)/g, '<span class="parens">($1)</span>');
                } else {
                    div.className = 'verse-item';
                    div.innerHTML = `
                        <div class="verse-header" style="cursor:pointer;">
                            <span class="verse-number">${item.chapter}:${item.verse}</span>
                            <span class="hebrew-text">${item.hebrew || ''}</span>
                        </div>
                        <div class="korean-text">${item.korean || ''}</div>
                        ${item.rashi_title ? `
                            <div class="rashi-container" style="display:none; margin-top:5px; border-left:3px solid #ccc; padding-left:10px;">
                                <div class="rashi-title">${item.rashi_title}</div>
                                <div class="rashi-body">${item.rashi_body || ''}</div>
                            </div>
                        ` : ''}
                    `;
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

// 2. 다크 모드 & 메뉴
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});

function toggleMenu(menuId) {
    const menu = document.getElementById(menuId);
    menu.style.display = (menu.style.display === "none") ? "block" : "none";
}

// 3. [최종 수정] 정보창 관리 함수 (창이 안 뜨는 문제를 방지하기 위해 스타일을 강제로 직접 적용)
function showInfo(type) {
    const overlay = document.getElementById('info-overlay');
    const content = document.getElementById('info-content');
    
    const data = {
        about: `<h2>소개(About)</h2><p>'생명의 근원을 맞이하는 공간'</p><p>이 사이트는 토라 원문을 바탕으로 그 기본적인 의미를 우리말로 풀어내는 연구의 공간입니다. 더불어 다양한 유대 문헌의 한국어 번역을 함께 올려 소개하는 공간으로서, 그 궁극적인 목적은 유대인과 이스라엘에 대한 그릇된 이해를 바로잡고, 각자의 삶의 가치를 진정으로 깨닫게 하는데 있습니다.</p>`,
        contact: `<h2>문의(Contact)</h2><p>유튜브: 유대교 TV<br><br>이메일: koreanjewish@email.com</p>`,
        privacy: `<h2>개인정보(Privacy)</h2><p>본 사이트는 사용자에게 어떠한 개인정보도 수집하지 않습니다.<br><br>광고 노출을 위해 쿠키가 사용될 수 있으나, 개인 식별 정보는 저장하지 않습니다.</p>`
    };

    if (data[type]) {
        content.innerHTML = data[type] + '<br><br><button onclick="closeInfo()">닫기</button>';
        
        // 중요: CSS 스타일이 안 먹힐 경우를 대비해 여기서 직접 스타일을 강제 적용합니다.
        overlay.style.setProperty('display', 'flex', 'important');
        overlay.style.opacity = '1';
        overlay.style.visibility = 'visible';
    }
}

function closeInfo() {
    const overlay = document.getElementById('info-overlay');
    overlay.style.setProperty('display', 'none', 'important');
    overlay.style.opacity = '0';
    overlay.style.visibility = 'hidden';
}