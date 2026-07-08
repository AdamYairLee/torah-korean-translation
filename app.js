// JewishKorean Torah app navigation/search/reader upgrade
let currentData = null;
let currentFilename = null;
let currentChapter = null;
let currentActiveElement = null;

const SEARCH_FILES = [
    { file: 'data/shemot.json', label: '슈모트 / 출애굽기' },
    { file: 'data/vayikra.json', label: '바이크라 / 레위기' },
    { file: 'data/steinsaltz_bereshit.json', label: '슈타인잘쯔 베레쉬트' },
    { file: 'data/steinsaltz_shemot.json', label: '슈타인잘쯔 슈모트' },
    { file: 'data/steinsaltz_vayikra.json', label: '슈타인잘쯔 바이크라' },
    { file: 'data/steinsaltz_bamidbar.json', label: '슈타인잘쯔 바미드바르' },
    { file: 'data/steinsaltz_devarim.json', label: '슈타인잘쯔 드바림' },
    { file: 'data/noahide.json', label: '노아하이드 강의' }
];

window.onload = function() {
    fetchShabbatInfo();
    const darkToggle = document.getElementById('dark-mode-toggle');
    if (darkToggle) {
        darkToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-mode');
            localStorage.setItem('torahDarkMode', document.body.classList.contains('dark-mode') ? '1' : '0');
        });
    }
    if (localStorage.getItem('torahDarkMode') === '1') document.body.classList.add('dark-mode');
};

// 샤밧 정보: 기본은 예루살렘 고정. 위치 기반은 나중에 선택 버튼 방식으로 확장 가능.
async function fetchShabbatInfo() {
    const infoDiv = document.getElementById('shabbat-info');
    if (!infoDiv) return;
    const url = `https://www.hebcal.com/shabbat?cfg=json&geonameid=281184&m=50`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        const parashat = data.items.find(item => item.category === 'parashat')?.title || '';
        const candleLighting = data.items.find(item => item.category === 'candles')?.title || '';
        const havdalah = data.items.find(item => item.category === 'havdalah')?.title || '';
        infoDiv.innerHTML = `${parashat}<br>${candleLighting} | ${havdalah}`;
    } catch (error) {
        console.error('샤밧 정보를 불러올 수 없습니다.', error);
        infoDiv.innerText = 'Jerusalem Shabbat info unavailable.';
    }
}

function hideWelcome() {
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = 'none';
}

function clearActiveButtons() {
    document.querySelectorAll('.main-nav button').forEach(btn => btn.classList.remove('menu-active'));
}

function showMainHome() {
    currentData = null;
    currentFilename = null;
    currentChapter = null;
    currentActiveElement = null;
    clearActiveButtons();
    document.querySelectorAll('.sub-menu').forEach(menu => menu.classList.remove('active'));
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = '';
    const container = document.getElementById('torah-container');
    if (container) container.innerHTML = '본문을 선택해주세요.';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getTitleFromFilename(filename) {
    const found = SEARCH_FILES.find(x => x.file === filename);
    if (found) return found.label;
    if (filename.includes('bereshit')) return '베레쉬트 / 창세기';
    if (filename.includes('shemot')) return '슈모트 / 출애굽기';
    if (filename.includes('vayikra')) return '바이크라 / 레위기';
    if (filename.includes('bamidbar')) return '바미드바르 / 민수기';
    if (filename.includes('devarim')) return '드바림 / 신명기';
    return '본문';
}

function toggleMenu(menuId) {
    const targetMenu = document.getElementById(menuId);
    if (!targetMenu) return;
    const isActive = targetMenu.classList.contains('active');
    document.querySelectorAll('.sub-menu').forEach(menu => menu.classList.remove('active'));
    if (!isActive) {
        targetMenu.classList.add('active');
        let parent = targetMenu.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('sub-menu')) parent.classList.add('active');
            parent = parent.parentElement;
        }
    }
}

function renderToolbar(container, title) {
    const toolbar = document.createElement('div');
    toolbar.className = 'reader-toolbar';
    toolbar.innerHTML = `
        <button onclick="showMainHome()">홈</button>
        <button onclick="window.scrollTo({top:0, behavior:'smooth'})">위로</button>
    `;
    container.appendChild(toolbar);
    const h = document.createElement('div');
    h.className = 'reader-title';
    h.textContent = title;
    container.appendChild(h);
}

function renderChapters(container, data) {
    const chapters = [...new Set((data.content || []).filter(item => !item.type && item.chapter).map(item => item.chapter))];
    if (chapters.length <= 1) return;
    const nav = document.createElement('div');
    nav.className = 'chapter-nav';
    const allBtn = document.createElement('button');
    allBtn.className = 'chapter-btn' + (currentChapter === null ? ' active' : '');
    allBtn.textContent = '전체';
    allBtn.onclick = () => { currentChapter = null; renderContent(); };
    nav.appendChild(allBtn);
    chapters.forEach(ch => {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn' + (currentChapter === ch ? ' active' : '');
        btn.textContent = `${ch}장`;
        btn.onclick = () => { currentChapter = ch; renderContent(); };
        nav.appendChild(btn);
    });
    container.appendChild(nav);
}

function renderContent(scrollKey = null) {
    if (!currentData) return;
    const container = document.getElementById('torah-container');
    container.innerHTML = '';
    renderToolbar(container, getTitleFromFilename(currentFilename));
    renderChapters(container, currentData);
    (currentData.content || []).forEach(item => {
        if (!item.type && currentChapter !== null && item.chapter !== currentChapter) return;
        const div = document.createElement('div');
        if (item.type) {
            div.className = item.type === 'paragraph' ? 's-body' : 's-title';
            div.innerText = item.text || '';
            div.innerHTML = div.innerHTML.replace(/\((.*?)\)/g, '<span class="parens">($1)</span>');
        } else {
            const key = `${item.chapter}-${item.verse}`;
            div.className = 'verse-item';
            div.id = `verse-${key}`;
            div.innerHTML = `
                <div class="verse-header" style="cursor:${item.rashi_title ? 'pointer' : 'default'};">
                    <span class="verse-number">${item.chapter}:${item.verse}</span>
                    <span class="hebrew-text">${item.hebrew || ''}</span>
                </div>
                <div class="korean-text">${item.korean || ''}</div>
                ${item.rashi_title ? `
                    <div class="rashi-container" style="display:none;">
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
    if (scrollKey) {
        const target = document.getElementById(`verse-${scrollKey}`);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function loadContent(filename, element, options = {}) {
    if (element) {
        clearActiveButtons();
        element.classList.add('menu-active');
        currentActiveElement = element;
    }
    hideWelcome();
    currentFilename = filename;
    currentChapter = options.chapter ?? null;
    fetch(filename)
        .then(response => {
            if (!response.ok) throw new Error('파일 없음');
            return response.json();
        })
        .then(data => {
            currentData = data;
            renderContent(options.scrollKey || null);
        })
        .catch(() => showWorkingMessage());
}

function showWorkingMessage() {
    const container = document.getElementById('torah-container');
    container.innerHTML = `
        <div class="working-msg-box">
            <h2>현재 작업 중입니다.</h2>
            <p>번역 중인 문헌입니다.</p>
        </div>
    `;
}

function textOf(item) {
    if (item.type) return item.text || '';
    return `${item.hebrew || ''} ${item.korean || ''} ${item.rashi_title || ''} ${item.rashi_body || ''}`;
}

function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}

function makeSnippet(text, query) {
    const compact = text.replace(/\s+/g, ' ').trim();
    const lower = compact.toLowerCase();
    const q = query.toLowerCase();
    const idx = lower.indexOf(q);
    const start = idx >= 0 ? Math.max(0, idx - 45) : 0;
    const end = idx >= 0 ? Math.min(compact.length, idx + query.length + 65) : Math.min(compact.length, 160);
    let snippet = compact.slice(start, end);
    if (start > 0) snippet = '…' + snippet;
    if (end < compact.length) snippet += '…';
    const safe = escapeHtml(snippet);
    return safe.replace(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<span class="highlight">$1</span>');
}

async function performSearch() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    if (!query) return;
    hideWelcome();
    const container = document.getElementById('torah-container');
    container.innerHTML = '<div class="working-msg-box"><h2>검색 중입니다...</h2></div>';
    const results = [];
    for (const source of SEARCH_FILES) {
        try {
            const response = await fetch(source.file);
            if (!response.ok) continue;
            const data = await response.json();
            (data.content || []).forEach((item, index) => {
                const text = textOf(item);
                if (text.toLowerCase().includes(query.toLowerCase())) results.push({ source, item, index, text });
            });
        } catch (e) { console.warn('검색 제외:', source.file, e); }
    }
    container.innerHTML = '';
    const header = document.createElement('div');
    header.className = 'search-results-header';
    header.innerHTML = `<button onclick="showMainHome()">홈</button><strong>“${escapeHtml(query)}” 검색 결과 ${results.length}개</strong>`;
    container.appendChild(header);
    if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'working-msg-box';
        empty.innerHTML = '<h2>검색 결과가 없습니다.</h2>';
        container.appendChild(empty);
        return;
    }
    results.slice(0, 120).forEach(result => {
        const item = result.item;
        const div = document.createElement('div');
        div.className = 'search-result-item';
        const meta = item.type ? result.source.label : `${result.source.label} ${item.chapter}:${item.verse}`;
        div.innerHTML = `<div class="search-result-meta">${escapeHtml(meta)}</div><div>${makeSnippet(result.text, query)}</div>`;
        div.onclick = () => {
            if (item.type) loadContent(result.source.file, null);
            else loadContent(result.source.file, null, { chapter: item.chapter, scrollKey: `${item.chapter}-${item.verse}` });
        };
        container.appendChild(div);
    });
}

function showInfo(type) {
    const overlay = document.getElementById('info-overlay');
    const content = document.getElementById('info-content');
    const data = {
        about: `<h2>소개(About)</h2><p>'생명의 근원을 맞이하는 공간'</p><p>이 사이트는 토라 원문을 바탕으로 그 기본적인 의미를 우리말로 풀어내는 연구의 공간입니다.</p>`,
        contact: `<h2>문의(Contact)</h2><p>유튜브: 유대교 TV<br><br>이메일: contact@jewishkorean.com</p>`,
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

function loadBlog(filename, index = 0) {
    hideWelcome();
    fetch(filename)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('torah-container');
            const allItems = data.content || [];
            container.innerHTML = '';
            renderToolbar(container, '노아하이드 강의');
            const toc = document.createElement('div');
            toc.className = 'toc-card';
            toc.innerHTML = '<h4 style="margin:0 0 10px 0;">강의 목차</h4>';
            allItems.forEach((item, i) => {
                const link = document.createElement('span');
                link.innerText = `${i + 1}. ${item.title}`;
                link.className = 'toc-link';
                link.onclick = () => {
                    const postArea = document.getElementById('post-area');
                    postArea.innerHTML = `<h2>${item.title}</h2><small>${item.date}</small><p>${item.body}</p>`;
                };
                toc.appendChild(link);
            });
            container.appendChild(toc);
            const postArea = document.createElement('div');
            postArea.id = 'post-area';
            const initialItem = allItems[index] || {title:'', date:'', body:''};
            postArea.innerHTML = `<h2>${initialItem.title}</h2><small>${initialItem.date}</small><p>${initialItem.body}</p>`;
            container.appendChild(postArea);
        });
}
