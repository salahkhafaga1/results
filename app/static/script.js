let searchMode = 'seating';
const MIN_NAME_LENGTH = 2;
let suggestTimeout = null;
let selectedSuggestion = -1;
let isExactSearch = false;

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        searchMode = this.dataset.mode;
        const label = document.getElementById('searchLabel');
        const input = document.getElementById('searchInput');
        const suggestions = document.getElementById('suggestions');
        suggestions.classList.remove('show');
        suggestions.innerHTML = '';
        if (searchMode === 'seating') {
            label.textContent = 'رقم الجلوس';
            input.placeholder = 'مثال: 2001970';
            input.inputMode = 'numeric';
            input.pattern = '[0-9]*';
        } else {
            label.textContent = 'الاسم';
            input.placeholder = 'ابحث بالاسم...';
            input.inputMode = 'text';
            input.removeAttribute('pattern');
        }
        document.getElementById('resultsContainer').innerHTML = '';
        document.getElementById('error').classList.remove('show');
    });
});

document.getElementById('searchInput').addEventListener('input', function() {
    const suggestions = document.getElementById('suggestions');
    if (searchMode === 'seating') {
        suggestions.classList.remove('show');
        return;
    }
    const query = this.value.trim();
    if (query.length < 2) {
        suggestions.classList.remove('show');
        return;
    }
    clearTimeout(suggestTimeout);
    selectedSuggestion = -1;
    suggestTimeout = setTimeout(() => fetchSuggestions(query), 200);
});

document.getElementById('searchInput').addEventListener('keydown', function(e) {
    const items = document.querySelectorAll('#suggestions .item');
    if (!items.length) return;
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestion = Math.min(selectedSuggestion + 1, items.length - 1);
        updateHighlight(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestion = Math.max(selectedSuggestion - 1, -1);
        updateHighlight(items);
    } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
        e.preventDefault();
        items[selectedSuggestion].click();
    }
});

function updateHighlight(items) {
    items.forEach((el, i) => {
        el.classList.toggle('highlighted', i === selectedSuggestion);
        if (i === selectedSuggestion) el.scrollIntoView({ block: 'nearest' });
    });
}

async function fetchSuggestions(query) {
    try {
        const resp = await fetch(`/suggest?q=${encodeURIComponent(query)}`);
        if (!resp.ok) return;
        const data = await resp.json();
        renderSuggestions(data.names, query);
    } catch (e) {}
}

function renderSuggestions(names, query) {
    const el = document.getElementById('suggestions');
    if (!names || !names.length) {
        el.innerHTML = '<div class="item" style="color:#999;cursor:default">لا توجد نتائج</div>';
        el.classList.add('show');
        return;
    }
    el.innerHTML = names.map(n => {
        const safe = n.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
        const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        const highlighted = safe.replace(regex, '<mark>$1</mark>');
        return `<div class="item" data-name="${safe}" onclick="selectSuggestion(this)">${highlighted}</div>`;
    }).join('');
    el.classList.add('show');
}

function selectSuggestion(el) {
    const name = el.dataset.name;
    document.getElementById('searchInput').value = name;
    document.getElementById('suggestions').classList.remove('show');
    isExactSearch = true;
    doSearch(name);
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.input-wrapper')) {
        document.getElementById('suggestions').classList.remove('show');
    }
});

document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
    if (searchMode === 'name' && query.length < MIN_NAME_LENGTH) {
        showError('يرجى إدخال حرفين على الأقل للبحث بالاسم');
        return;
    }
    doSearch(query);
});

async function doSearch(query) {
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');
    const container = document.getElementById('resultsContainer');

    errorDiv.classList.remove('show');
    container.innerHTML = '';
    loadingDiv.classList.add('show');

    try {
        let url;
        if (searchMode === 'seating') {
            url = `/search?seating_no=${encodeURIComponent(query)}`;
        } else {
            url = `/search?name=${encodeURIComponent(query)}`;
        }
        if (searchMode === 'name' && isExactSearch) {
            url += '&exact=1';
            isExactSearch = false;
        }

        const resp = await fetch(url);
        let data;
        try { data = await resp.json(); } catch (e) { data = {}; }
        loadingDiv.classList.remove('show');

        if (!resp.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error :
                       Array.isArray(data.detail) ? data.detail.map(d => d.msg || JSON.stringify(d)).join('; ') :
                       data.detail || 'حدث خطأ في الاستعلام';
            showError(msg);
            return;
        }

        if (data.results) {
            renderNameResults(data.results, data.count, query);
        } else {
            renderSingleResult(data);
        }
    } catch (err) {
        loadingDiv.classList.remove('show');
        showError('حدث خطأ في الاتصال بالخادم');
    }
}

function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = msg;
    el.classList.add('show');
}

function renderSingleResult(data) {
    const container = document.getElementById('resultsContainer');
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

function renderNameResults(results, count, query) {
    const container = document.getElementById('resultsContainer');
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
    document.getElementById('searchInput').value = no;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-mode="seating"]').classList.add('active');
    searchMode = 'seating';
    document.getElementById('searchLabel').textContent = 'رقم الجلوس';
    doSearch(no);
}
