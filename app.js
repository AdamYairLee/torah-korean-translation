// 환영 문구 숨기기 함수
function hideWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';
}

// 1. 콘텐츠 불러오기 함수
function loadContent(filename) {
    hideWelcome(); 
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

// 2. 다크 모드 & 스마트 메뉴 제어
document.getElementById('dark-mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
});

function toggleMenu(menuId) {
    const targetMenu = document.getElementById(menuId);
    
    // 토글 (active 클래스를 넣었다 뺐다 함)
    targetMenu.classList.toggle('active');
    
    // 부모 메뉴가 있다면 부모도 강제로 펼쳐주기 (이 부분이 핵심!)
    let parent = targetMenu.parentElement;
    if (parent && parent.classList.contains('sub-menu')) {
        parent.classList.add('active');
    }
}

// 3. 정보창 관리 함수
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
    const overlay = document.getElementById('info-overlay');
    overlay.style.setProperty('display', 'none', 'important');
}

// 4. 노아하이드 강의 블로그
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

// 검색 실행 함수
function performSearch() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;

    hideWelcome(); 
    
    const highlighted = document.querySelectorAll('.highlight');
    highlighted.forEach(el => {
        el.outerHTML = el.innerText;
    });

    const container = document.getElementById('torah-container');
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
    let node;
    let found = false;
    const textNodes = [];

    while (node = walker.nextNode()) {
        if (node.nodeValue.includes(query)) textNodes.push(node);
    }

    textNodes.forEach(node => {
        const parent = node.parentNode;
        const text = node.nodeValue;
        const regex = new RegExp(`(${query})`, 'gi');
        const newHTML = text.replace(regex, '<span class="highlight" style="background-color: yellow;">$1</span>');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newHTML;
        while (tempDiv.firstChild) parent.insertBefore(tempDiv.firstChild, node);
        parent.removeChild(node);
        found = true;
    });

    if (!found) alert("검색 결과가 없습니다.");
    else {
        const firstHighlight = document.querySelector('.highlight');
        if (firstHighlight) firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}