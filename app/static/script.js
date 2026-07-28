let searchMode = 'seating';
const MIN_NAME_LENGTH = 3;

document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        searchMode = this.dataset.mode;
        const label = document.getElementById('searchLabel');
        const input = document.getElementById('searchInput');
        if (searchMode === 'seating') {
            label.textContent = 'رقم الجلوس';
            input.placeholder = 'مثال: 2001970';
            input.inputMode = 'numeric';
            input.pattern = '[0-9]*';
        } else {
            label.textContent = 'الاسم';
            input.placeholder = 'أدخل الاسم (3 أحرف على الأقل)';
            input.inputMode = 'text';
            input.removeAttribute('pattern');
        }
        document.getElementById('resultsContainer').innerHTML = '';
        document.getElementById('error').classList.remove('show');
    });
});

document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const query = document.getElementById('searchInput').value.trim();
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
            if (query.length < MIN_NAME_LENGTH) {
                loadingDiv.classList.remove('show');
                errorDiv.textContent = 'يرجى إدخال 3 أحرف على الأقل للبحث بالاسم';
                errorDiv.classList.add('show');
                return;
            }
            url = `/search?name=${encodeURIComponent(query)}`;
        }

        const response = await fetch(url);
        const data = await response.json();
        loadingDiv.classList.remove('show');

        if (data.error) {
            errorDiv.textContent = data.error;
            errorDiv.classList.add('show');
            return;
        }

        if (data.results) {
            renderNameResults(data.results, data.count, query);
        } else {
            renderSingleResult(data);
        }
    } catch (err) {
        loadingDiv.classList.remove('show');
        errorDiv.textContent = 'حدث خطأ في الاتصال بالخادم';
        errorDiv.classList.add('show');
    }
});

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
    document.getElementById('searchForm').dispatchEvent(new Event('submit'));
}
