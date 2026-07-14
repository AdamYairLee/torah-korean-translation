// JewishKorean Torah app navigation/search/reader upgrade
let currentData = null;
let currentFilename = null;
let currentChapter = null;
let currentActiveElement = null;
let currentParashaIndex = null;

const SEARCH_FILES = [
    { file: 'data/shemot.json', label: '슈모트 / 출애굽기' },
    { file: 'data/vayikra.json', label: '바이크라 / 레위기' },
    { file: 'data/steinsaltz_bereshit.json', label: '슈타인잘쯔 베레쉬트' },
    { file: 'data/steinsaltz_shemot.json', label: '슈타인잘쯔 슈모트' },
    { file: 'data/steinsaltz_vayikra.json', label: '슈타인잘쯔 바이크라' },
    { file: 'data/steinsaltz_bamidbar.json', label: '슈타인잘쯔 바미드바르' },
    { file: 'data/steinsaltz_devarim.json', label: '슈타인잘쯔 드바림' },
    { file: 'data/noahide.json', label: '노아하이드 강의' },
    { file: 'data/mishna/berakhot.json', label: '미슈나 베락호트' },
    { file: 'data/mishna/demai.json', label: '미슈나 데마이' }
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
    currentParashaIndex = null;
    currentActiveElement = null;
    clearActiveButtons();
    closeAllMenus();
    const welcome = document.getElementById('welcome-message');
    if (welcome) welcome.style.display = '';
    const container = document.getElementById('torah-container');
    if (container) {
        container.classList.remove('demai-reader');
        container.innerHTML = '본문을 선택해주세요.';
    }
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
    if (filename.includes('mishna/berakhot')) return '미슈나 베락호트';
    if (filename.includes('mishna/demai')) return '미슈나 데마이';
    return '본문';
}

function closeAllMenus() {
    document.querySelectorAll('.sub-menu').forEach(menu => menu.classList.remove('active'));
}

function toggleMenu(menuId) {
    const targetMenu = document.getElementById(menuId);
    if (!targetMenu) return;

    const isActive = targetMenu.classList.contains('active');
    closeAllMenus();

    if (!isActive) {
        targetMenu.classList.add('active');

        // 중첩 메뉴를 열 때는 상위 메뉴만 다시 펼칩니다.
        let parent = targetMenu.parentElement;
        while (parent) {
            if (parent.classList && parent.classList.contains('sub-menu')) {
                parent.classList.add('active');
            }
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


function appendTorahSupportNote(container) {
    const note = document.createElement('div');
    note.className = 'torah-support-note';
    note.innerHTML = `
        <p>이 번역 프로젝트가 도움이 되셨다면 Ko-fi를 통해 후원하실 수 있습니다.</p>
        <a href="https://ko-fi.com/adamlee1986" target="_blank" rel="noopener" class="support-mini-btn">후원하기 / Support / לתמיכה</a>
    `;
    container.appendChild(note);
}

function showCenterChoice(title, items) {
    hideWelcome();
    closeAllMenus();
    const container = document.getElementById('torah-container');
    container.classList.remove('demai-reader');
    container.innerHTML = `
        <div class="mishna-overlay-box fade-in-center">
            <button class="modal-close-mini" onclick="showMainHome()">×</button>
            <h2>${title}</h2>
            <div class="mishna-choice-grid"></div>
        </div>
    `;
    const grid = container.querySelector('.mishna-choice-grid');
    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'mishna-choice-btn';
        btn.innerHTML = item.subtitle ? `${item.label}<span>${item.subtitle}</span>` : item.label;
        btn.onclick = item.action;
        grid.appendChild(btn);
    });
}

function showOralTorahMenu() {
    showCenterChoice('구전 토라', [
        { label: '미슈나', subtitle: 'Mishna', action: showMishnaOrders }
    ]);
}

function showMishnaOrders() {
    showCenterChoice('미슈나', [
        { label: '제라임', subtitle: 'Zeraim', action: () => showMishnaTractates('zeraim') }
    ]);
}

function showMishnaTractates(order) {
    if (order === 'zeraim') {
        showCenterChoice('미슈나 · 제라임', [
            { label: '베락호트', subtitle: 'Berakhot', action: () => loadContent('data/mishna/berakhot.json', null) },
            { label: '페아', subtitle: 'Peah', action: () => loadContent('data/mishna/peah.json') },
            { label: '데마이', subtitle: 'Demai', action: () => loadContent('data/mishna/demai.json') },
        ]);
        return;
    }
    showWorkingMishnaOrder(order);
}

function showWorkingMishnaOrder(name) {
    showCenterChoice(`미슈나 · ${name}`, [
        { label: '현재 번역 준비 중입니다', subtitle: '새 문헌이 준비되면 이곳에 추가됩니다.', action: () => {} }
    ]);
}

function isSteinsaltzFile(filename) {
    return typeof filename === 'string' && filename.includes('steinsaltz_');
}

function getParashaSections(data) {
    const content = data.content || [];
    const titleIndexes = [];

    content.forEach((item, index) => {
        if (item.type === 'title' && typeof item.text === 'string') {
            titleIndexes.push(index);
        }
    });

    return titleIndexes.map((startIndex, position) => ({
        startIndex,
        endIndex: titleIndexes[position + 1] ?? content.length,
        fullTitle: content[startIndex].text,
        // 원문 JSON에 적힌 이름을 그대로 사용하고 공통 접두어만 화면에서 제거합니다.
        buttonTitle: content[startIndex].text.replace(/^파라샤트\s*/, '')
    }));
}

function renderParashaNav(container, data) {
    const sections = getParashaSections(data);
    if (!sections.length) return;

    const nav = document.createElement('div');
    nav.className = 'chapter-nav parasha-nav';

    sections.forEach((section, index) => {
        const btn = document.createElement('button');
        btn.className = 'chapter-btn' + (currentParashaIndex === index ? ' active' : '');
        btn.textContent = section.buttonTitle;
        btn.onclick = () => {
            currentParashaIndex = index;
            renderContent();
        };
        nav.appendChild(btn);
    });

    container.appendChild(nav);
}

function renderContent(scrollKey = null) {
    if (!currentData) return;
    const container = document.getElementById('torah-container');
    container.classList.remove('demai-reader');
    container.innerHTML = '';

    // 일반 토라/슈타인잘쯔 본문에는 미슈나 전용 탐색 버튼을 표시하지 않습니다.
    renderToolbar(container, getTitleFromFilename(currentFilename));

    const steinsaltzMode = isSteinsaltzFile(currentFilename);
    const parashaSections = steinsaltzMode ? getParashaSections(currentData) : [];

    if (steinsaltzMode) renderParashaNav(container, currentData);
    else renderChapters(container, currentData);

    (currentData.content || []).forEach((item, itemIndex) => {
        if (steinsaltzMode && currentParashaIndex !== null) {
            const section = parashaSections[currentParashaIndex];
            if (section && (itemIndex < section.startIndex || itemIndex >= section.endIndex)) return;
        }
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
    appendTorahSupportNote(container);
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
    closeAllMenus();
    currentFilename = filename;
    currentChapter = options.chapter ?? null;
    currentParashaIndex = null;
    fetch(filename)
        .then(response => {
            if (!response.ok) throw new Error('파일 없음');
            return response.json();
        })
        .then(data => {
    currentData = data;

    // 드마이는 기존 문헌과 다른 JSON 필드(title/body)를 사용하므로
    // 이 파일에만 적용되는 전용 렌더러로 표시합니다.
    if (currentFilename === 'data/mishna/demai.json') {
        renderDemaiContent(currentData);
        return;
    }

    if (currentData.chapters && currentData.chapters[0]?.mishnayot) {
        renderMishnahContent(currentData);
        return;
    }

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
    closeAllMenus();

    fetch(filename)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('torah-container');
            const allItems = data.content || [];
            const itemsPerPage = 5;
            let currentTocPage = Math.floor(index / itemsPerPage);
            let currentPostIndex = index;

            container.innerHTML = '';
            renderToolbar(container, '노아하이드 강의');

            const toc = document.createElement('div');
            toc.className = 'toc-card';
            container.appendChild(toc);

            const postArea = document.createElement('div');
            postArea.id = 'post-area';
            container.appendChild(postArea);

            function showPost(itemIndex) {
                const item = allItems[itemIndex] || { title: '', date: '', body: '' };
                currentPostIndex = itemIndex;
                postArea.innerHTML = `<h2>${item.title}</h2><small>${item.date}</small><p>${item.body}</p>`;
                renderTocPage();
            }

            function renderTocPage() {
                toc.innerHTML = '<h4 style="margin:0 0 10px 0;">강의 목차</h4>';

                const startIndex = currentTocPage * itemsPerPage;
                const pageItems = allItems.slice(startIndex, startIndex + itemsPerPage);

                pageItems.forEach((item, localIndex) => {
                    const itemIndex = startIndex + localIndex;
                    const link = document.createElement('span');
                    link.innerText = `${itemIndex + 1}. ${item.title}`;
                    link.className = 'toc-link' + (itemIndex === currentPostIndex ? ' active' : '');
                    link.onclick = () => showPost(itemIndex);
                    toc.appendChild(link);
                });

                const pageCount = Math.ceil(allItems.length / itemsPerPage);
                if (pageCount > 1) {
                    const pagination = document.createElement('div');
                    pagination.className = 'chapter-nav blog-pagination';

                    for (let page = 0; page < pageCount; page += 1) {
                        const pageBtn = document.createElement('button');
                        pageBtn.className = 'chapter-btn' + (page === currentTocPage ? ' active' : '');
                        pageBtn.textContent = `[${page + 1}]`;
                        pageBtn.onclick = () => {
                            currentTocPage = page;
                            renderTocPage();
                        };
                        pagination.appendChild(pageBtn);
                    }

                    toc.appendChild(pagination);
                }
            }

            showPost(currentPostIndex);
        });
}

function renderDemaiContent(book, selectedChapter = null) {
    const container = document.getElementById('torah-container');
    if (!container) return;

    const entries = Array.isArray(book.content) ? book.content : [];
    const chapters = [...new Set(entries.map(item => Number(item.chapter)).filter(Number.isFinite))].sort((a, b) => a - b);
    const activeChapter =
    selectedChapter === 0
        ? 0
        : (chapters[0] || 1);
    container.innerHTML = '';
    container.classList.add('demai-reader');

    const nav = document.createElement('div');
    nav.className = 'mishna-nav demai-top-nav';
    nav.innerHTML = `
      <button type="button" onclick="showMishnaTractates('zeraim')">← 제라임으로</button>
      <button type="button" onclick="showMishnaOrders()">미슈나 목차</button>
      <button type="button" onclick="showMainHome()">홈</button>
    `;
    container.appendChild(nav);

    const header = document.createElement('section');
    header.className = 'demai-header';
    header.innerHTML = `
        <p class="demai-kicker">미슈나 · 제라임</p>
        <h1>${escapeHtml(book.title || book.titleKo || '미슈나 데마이')}</h1>
        <p class="demai-summary">장을 선택하면 해당 장의 미슈나만 표시됩니다.</p>
    `;
    container.appendChild(header);

    const chapterNav = document.createElement('div');
    chapterNav.className = 'demai-chapter-nav';
    chapterNav.setAttribute('aria-label', '데마이 장 선택');
    const allButton = document.createElement('button');
allButton.type = 'button';
allButton.className = 'demai-chapter-btn' + (activeChapter === 0 ? ' active' : '');
allButton.textContent = '전체';
allButton.onclick = () => {
    renderDemaiContent(book, 0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
};
chapterNav.appendChild(allButton);
    chapters.forEach(chapter => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'demai-chapter-btn' + (chapter === activeChapter ? ' active' : '');
        button.textContent = `${chapter}장`;
        button.onclick = () => {
            renderDemaiContent(book, chapter);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        chapterNav.appendChild(button);
    });
    container.appendChild(chapterNav);

    const chapterHeading = document.createElement('h2');
    chapterHeading.className = 'demai-chapter-heading';
    chapterHeading.textContent = `제 ${activeChapter}장`;
    container.appendChild(chapterHeading);

    (activeChapter === 0
    ? entries
    : entries.filter(item => Number(item.chapter) === activeChapter)
).forEach(item => {
        const article = document.createElement('article');
        article.className = 'content-card demai-card';

        const heading = document.createElement('h3');
        heading.className = 'demai-item-title';
        const ref = item.ref || `Demai ${item.chapter}:${item.verse}`;
        heading.innerHTML = `<span class="demai-ref">${escapeHtml(ref)}</span>${item.title ? `<span>${escapeHtml(item.title)}</span>` : ''}`;

        const body = document.createElement('div');
        body.className = 'demai-body';
        body.innerHTML = item.body || item.korean || '';

        article.appendChild(heading);
        article.appendChild(body);
        container.appendChild(article);
    });

    const bottomNav = nav.cloneNode(true);
    bottomNav.classList.add('demai-bottom-nav');
    container.appendChild(bottomNav);
}

function renderMishnahContent(book) {
    const container = document.getElementById('torah-container');
    if (!container) return;

    container.classList.remove('demai-reader');
    container.innerHTML = '';

    // 미슈나 전용 탐색 버튼은 실제 미슈나 본문에서만 표시합니다.
    const nav = document.createElement('div');
    nav.className = 'mishna-nav';
    nav.innerHTML = `
      <button onclick="showMishnaTractates('zeraim')">← 제라임으로</button>
      <button onclick="showMishnaOrders()">미슈나 목차</button>
      <button onclick="showHome()">홈</button>
    `;
    container.appendChild(nav);

    const title = document.createElement('h1');
    title.textContent = book.titleKo || book.title || '미슈나';
    container.appendChild(title);

    book.chapters.forEach(chapter => {
        const chapterTitle = document.createElement('h2');
        chapterTitle.textContent = chapter.titleKo || `제 ${chapter.chapter}장`;
        container.appendChild(chapterTitle);

        chapter.mishnayot.forEach(m => {
            const div = document.createElement('div');
            div.className = 'content-card';

            div.innerHTML = `
                <h3>${m.ref || ''} ${m.title || ''}</h3>
                <p>${m.body || ''}</p>
            `;

            container.appendChild(div);
        });
    });
}