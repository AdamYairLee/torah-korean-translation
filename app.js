// 페이지 로드 시 실행되는 통합 함수
window.onload = function() {
    fetchShabbatInfo();
};

// 1. 샤밧 정보 가져오기 (예루살렘 고정)
async function fetchShabbatInfo() {
    const infoDiv = document.getElementById('shabbat-info');
    if (!infoDiv) return;
    const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=281184&m=50`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const parashat = data.items.find(item => item.category === 'parashat')?.title || "";
        const candleLighting = data.items.find(item => item.category === 'candles')?.title || "";
        const havdalah = data.items.find(item => item.category === 'havdalah')?.title || "";
        infoDiv.innerHTML = `${parashat}<br>${candleLighting} | ${havdalah}`;
    } catch (error) {
        console.error("샤밧 정보를 불러올 수 없습니다.", error);
        infoDiv.innerText = "Shabbat info unavailable.";
    }
}

// 2. 환영 문구 숨기기
function hideWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';
}

// 3. 콘텐츠 불러오기 (토라 본문)
function loadContent(filename, element) {
    // 1. 메뉴 선택 표시 로직 (정상 작동)
    if (element) {
        document.querySelectorAll('.main-nav button').forEach(btn => btn.classList.remove('menu-active'));
        element.classList.add('menu-active');
    }

    hideWelcome(); 
    fetch(filename)
        .then(response => {
            if (!response.ok) throw new Error('파일 없음');
            return response.json();
        })
        .then(data => {
            const container = document.getElementById('torah-container');
            container.innerHTML = '';
            
            // [복구 완료] 여기서부터 본문 출력 로직이 다시 살아납니다!
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
            // 본문 출력 로직 끝
        })
        .catch(err => {
            // "제목 없음.png"에 나온 안내문구 수정은 아래에서!
            showWorkingMessage();
        });
}

// 작업 중 메시지 함수
function showWorkingMessage() {
    const container = document.getElementById('torah-container');
    container.innerHTML = `
        <div class="working-msg-box">
            <h2>현재 작업 중입니다.</h2>
            <p>번역 중인 문헌입니다.</p>
        </div>
    `;
}

// 4. 다크 모드 & 메뉴 제어
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});

function toggleMenu(menuId) {
    const targetMenu = document.getElementById(menuId);
    targetMenu.classList.toggle('active');
    let parent = targetMenu.parentElement;
    if (parent && parent.classList.contains('sub-menu')) {
        parent.classList.add('active');
    }
}

// 5. 정보창 관리
function showInfo(type) {
    const overlay = document.getElementById('info-overlay');
    const content = document.getElementById('info-content');
    const data = {
        about: `<h2>소개(About)</h2><p>'생명의 근원을 맞이하는 공간'</p><p>이 사이트는 토라 원문을 바탕으로 그 기본적인 의미를 우리말로 풀어내는 연구의 공간입니다.</p>`,
        contact: `<h2>문의(Contact)</h2><p>유튜브: 유대교 TV<br><br>이메일: koreanjewish@email.com</p>`,
        privacy: `<h2>개인정보(Privacy)</h2><p>본 사이트는 사용자에게 어떠한 개인정보도 수집하지 않습니다.</p>`
    };
    if (data[type]) {
        content.innerHTML = data[type] + '<br><br><button onclick="closeInfo()">닫기</button>';
        overlay.style.setProperty('display', 'flex', 'important');
    }
}

function closeInfo() {
    document.getElementById('info-overlay').style.setProperty('display', 'none', 'important');
}

// 6. 노아하이드 강의 & 검색 로직 (아담님 원본 함수)
function loadBlog(filename, index = 0) {
    hideWelcome();
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('torah-container');
            const allItems = data.content;
            container.innerHTML = ''; 
            const toc = document.createElement('div');
            toc.style.cssText = "margin-bottom:30px; padding:15px; background-color:#f9f9f9; border:1px solid #ddd;";
            toc.innerHTML = '<h4 style="margin:0 0 10px 0;">강의 목차</h4>';
            allItems.forEach((item, i) => {
                const link = document.createElement('span');
                link.innerText = `${i + 1}. ${item.title}`;
                link.style.cssText = "display:block; cursor:pointer; color:#007bff; margin-bottom:5px; font-size:14px; text-decoration:underline;";
                link.onclick = () => {
                    const postArea = document.getElementById('post-area');
                    postArea.innerHTML = `<h2>${item.title}</h2><small style="color:#888;">${item.date}</small><p style="margin-top:20px; line-height:1.6; white-space: pre-line;">${item.body}</p>`;
                };
                toc.appendChild(link);
            });
            container.appendChild(toc);
            const postArea = document.createElement('div');
            postArea.id = 'post-area';
            const initialItem = allItems[index];
            postArea.innerHTML = `<h2>${initialItem.title}</h2><small style="color:#888;">${initialItem.date}</small><p style="margin-top:20px; line-height:1.6; white-space: pre-line;">${initialItem.body}</p>`;
            container.appendChild(postArea);
        });
}

function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    hideWelcome(); 
    const highlighted = document.querySelectorAll('.highlight');
    highlighted.forEach(el => { el.outerHTML = el.innerText; });
    const container = document.getElementById('torah-container');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node, textNodes = [];
    while (node = walker.nextNode()) { if (node.nodeValue.includes(query)) textNodes.push(node); }
    textNodes.forEach(node => {
        const parent = node.parentNode;
        const newHTML = node.nodeValue.replace(new RegExp(`(${query})`, 'gi'), '<span class="highlight" style="background-color: yellow;">$1</span>');
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;
        while (tempDiv.firstChild) parent.insertBefore(tempDiv.firstChild, node);
        parent.removeChild(node);
    });
    if (document.querySelector('.highlight')) document.querySelector('.highlight').scrollIntoView({ behavior: 'smooth', block: 'center' });
    else alert("검색 결과가 없습니다.");
}