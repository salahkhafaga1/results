let searchMode = 'seating';
const MIN_LENGTH = 2;
const DEBOUNCE_MS = 300;
let debounceTimer = null;
let selectedIndex = -1;
let isExactSearch = false;

const searchInput = document.getElementById('searchInput');
const searchForm = document.getElementById('searchForm');
const suggestions = document.getElementById('suggestions');
const errorDiv = document.getElementById('error');
const loadingDiv = document.getElementById('loading');
const container = document.getElementById('resultsContainer');
const searchLabel = document.getElementById('searchLabel');

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        searchMode = tab.dataset.mode;
        suggestions.classList.remove('show');
        suggestions.innerHTML = '';
        if (searchMode === 'seating') {
            searchLabel.textContent = 'رقم الجلوس';
            searchInput.placeholder = 'مثال: 2001970';
            searchInput.inputMode = 'numeric';
            searchInput.pattern = '[0-9]*';
        } else {
            searchLabel.textContent = 'الاسم';
            searchInput.placeholder = 'ابحث بالاسم...';
            searchInput.inputMode = 'text';
            searchInput.removeAttribute('pattern');
        }
        container.innerHTML = '';
        errorDiv.classList.remove('show');
    });
});

searchInput.addEventListener('input', () => {
    if (searchMode === 'seating') {
        suggestions.classList.remove('show');
        return;
    }
    const query = searchInput.value.trim();
    if (query.length < MIN_LENGTH) {
        suggestions.classList.remove('show');
        return;
    }
    clearTimeout(debounceTimer);
    selectedIndex = -1;
    debounceTimer = setTimeout(() => fetchSuggestions(query), DEBOUNCE_MS);
});

searchInput.addEventListener('keydown', (e) => {
    const items = suggestions.querySelectorAll('.item');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
        highlightItem(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, -1);
        highlightItem(items);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        items[selectedIndex].click();
    } else if (e.key === 'Escape') {
        suggestions.classList.remove('show');
        selectedIndex = -1;
    }
});

function highlightItem(items) {
    items.forEach((el, i) => {
        el.classList.toggle('highlighted', i === selectedIndex);
        if (i === selectedIndex) el.scrollIntoView({ block: 'nearest' });
    });
}

async function fetchSuggestions(query) {
    try {
        const resp = await fetch(`/api/search?name=${encodeURIComponent(query)}`);
        const data = resp.ok ? await resp.json() : { results: [] };
        renderDropdown(data.results, query);
    } catch (_) {
        renderDropdown([], query);
    }
}

function renderDropdown(results, query) {
    if (!results || !results.length) {
        suggestions.innerHTML = '<div class="item empty">لا توجد نتائج</div>';
        suggestions.classList.add('show');
        return;
    }
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'gi');
    suggestions.innerHTML = results.map(s => {
        const safe = s.arabic_name
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        const highlighted = safe.replace(regex, (m) => `<mark>${m}</mark>`);
        return `<div class="item" data-seating="${s.seating_no}" data-name="${safe}">${highlighted}</div>`;
    }).join('');
    suggestions.classList.add('show');
}

suggestions.addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (!item || item.classList.contains('empty')) return;
    const name = item.dataset.name;
    searchInput.value = name;
    suggestions.classList.remove('show');
    selectedIndex = -1;
    isExactSearch = true;
    doSearch(name);
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('.input-wrapper')) {
        suggestions.classList.remove('show');
    }
});

searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = searchInput.value.trim();
    if (searchMode === 'name' && query.length < MIN_LENGTH) {
        showError('يرجى إدخال حرفين على الأقل للبحث بالاسم');
        return;
    }
    doSearch(query);
});

async function doSearch(query) {
    errorDiv.classList.remove('show');
    container.innerHTML = '';
    loadingDiv.classList.add('show');
    try {
        let url;
        if (searchMode === 'seating') {
            url = `/search?seating_no=${encodeURIComponent(query)}`;
        } else {
            url = `/search?name=${encodeURIComponent(query)}`;
            if (isExactSearch) {
                url += '&exact=1';
                isExactSearch = false;
            }
        }
        const resp = await fetch(url);
        let data;
        try { data = await resp.json(); } catch (_) { data = {}; }
        loadingDiv.classList.remove('show');
        if (!resp.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error
                : Array.isArray(data.detail) ? data.detail.map(d => d.msg || JSON.stringify(d)).join('; ')
                : data.detail || 'حدث خطأ في الاستعلام';
            showError(msg);
            return;
        }
        if (data.results) {
            renderNameResults(data.results, data.count);
        } else {
            renderSingleResult(data);
        }
    } catch (_) {
        loadingDiv.classList.remove('show');
        showError('حدث خطأ في الاتصال بالخادم');
    }
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.add('show');
}

function renderSingleResult(data) {
    container.innerHTML = `
        <div class="result show">
            <h2>نتيجة الطالب</h2>
            <div class="result-item"><span class="result-label">رقم الجلوس</span><span class="result-value">${data.seating_no}</span></div>
            <div class="result-item"><span class="result-label">الاسم</span><span class="result-value">${data.arabic_name}</span></div>
            <div class="result-item"><span class="result-label">المجموع</span><span class="result-value">${data.total_degree}</span></div>
            <div class="result-item"><span class="result-label">الحالة</span><span class="result-value">${data.student_case_desc}</span></div>
        </div>
    `;
}

function renderNameResults(results, count) {
    let html = `<div class="count-info">تم العثور على ${count} نتيجة</div>`;
    html += '<div class="result-list show">';
    results.forEach(r => {
        html += `
            <div class="result-card" onclick="searchBySeating(${r.seating_no})">
                <div class="name">${r.arabic_name}</div>
                <div class="meta">
                    <span>🆔 ${r.seating_no}</span>
                    <span>📊 ${r.total_degree} درجة</span>
                    <span>${r.student_case_desc}</span>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

function searchBySeating(no) {
    searchInput.value = no;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-mode="seating"]').classList.add('active');
    searchMode = 'seating';
    searchLabel.textContent = 'رقم الجلوس';
    doSearch(no);
}
