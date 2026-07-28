(() => {
    'use strict';

    const DATA_URL = 'data/jewish-misc/posts.json';
    let pageData = null;

    const listView = document.getElementById('listView');
    const postView = document.getElementById('postView');
    const postList = document.getElementById('postList');
    const postTitle = document.getElementById('postTitle');
    const postBody = document.getElementById('postBody');
    const errorBox = document.getElementById('errorBox');
    const pageTitle = document.getElementById('pageTitle');
    const pageDescription = document.getElementById('pageDescription');

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#039;');
    }

    function showList(updateUrl = true) {
        postView.hidden = true;
        listView.hidden = false;
        if (updateUrl) history.replaceState(null, '', 'jewish-misc.html');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
function styleParentheses(rootElement) {
    const walker = document.createTreeWalker(
        rootElement,
        NodeFilter.SHOW_TEXT
    );

    const textNodes = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        const parentTag = node.parentElement?.tagName;

        // code 같은 특수 영역은 건드리지 않음
        if (
            parentTag !== 'SCRIPT' &&
            parentTag !== 'STYLE' &&
            parentTag !== 'CODE'
        ) {
            textNodes.push(node);
        }
    }

    textNodes.forEach((textNode) => {
        const text = textNode.nodeValue;

        // 괄호가 없는 문장은 그대로 둠
        if (!text || !/\([^()]+\)/.test(text)) return;

        const fragment = document.createDocumentFragment();
        const parts = text.split(/(\([^()]+\))/g);

        parts.forEach((part) => {
            if (/^\([^()]+\)$/.test(part)) {
                const span = document.createElement('span');
                span.className = 'parenthetical-note';
                span.textContent = part;
                fragment.appendChild(span);
            } else {
                fragment.appendChild(document.createTextNode(part));
            }
        });

        textNode.replaceWith(fragment);
    });
}

    function showPost(post, updateUrl = true) {
        postTitle.textContent = post.title || '제목 없음';
        postBody.innerHTML = post.body || '';
        styleParentheses(postBody);
        listView.hidden = true;
        postView.hidden = false;
        if (updateUrl) {
            history.replaceState(null, '', `jewish-misc.html#${encodeURIComponent(post.id)}`);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function renderPosts(posts) {
        postList.innerHTML = '';
        posts.slice(0, 5).forEach((post) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'misc-post-card';
            button.innerHTML = `<h3>${escapeHtml(post.title || '제목 없음')}</h3>`;
            button.addEventListener('click', () => showPost(post));
            postList.appendChild(button);
        });
    }

    async function init() {
        try {
            const response = await fetch(DATA_URL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            pageData = await response.json();
            pageTitle.textContent = pageData.title || '유대교 이모저모';
            pageDescription.textContent = pageData.description || '';
            const posts = Array.isArray(pageData.posts) ? pageData.posts : [];
            renderPosts(posts);

            const requestedId = decodeURIComponent(location.hash.replace(/^#/, ''));
            if (requestedId) {
                const post = posts.find((item) => item.id === requestedId);
                if (post) showPost(post, false);
            }
        } catch (error) {
            console.error(error);
            errorBox.hidden = false;
        }
    }

    document.getElementById('backButton').addEventListener('click', () => {
        if (!postView.hidden) {
            showList();
            return;
        }
        if (history.length > 1) history.back();
        else location.href = 'index.html';
    });

    document.getElementById('listButton').addEventListener('click', () => showList());
    document.getElementById('titleHomeButton').addEventListener('click', () => showList());

    init();
})();
