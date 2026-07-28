document.getElementById('searchForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const seatingNo = document.getElementById('seatingNo').value.trim();
    const resultDiv = document.getElementById('result');
    const errorDiv = document.getElementById('error');
    const loadingDiv = document.getElementById('loading');

    resultDiv.classList.remove('show');
    errorDiv.classList.remove('show');
    loadingDiv.classList.add('show');

    try {
        const response = await fetch(`/search?seating_no=${encodeURIComponent(seatingNo)}`);
        const data = await response.json();

        loadingDiv.classList.remove('show');

        if (data.error) {
            errorDiv.textContent = data.error;
            errorDiv.classList.add('show');
            return;
        }

        resultDiv.innerHTML = `
            <h2>نتيجة الطالب</h2>
            <div class="result-item"><span class="result-label">رقم الجلوس</span><span class="result-value">${data.seating_no}</span></div>
            <div class="result-item"><span class="result-label">الاسم</span><span class="result-value">${data.arabic_name}</span></div>
            <div class="result-item"><span class="result-label">المجموع</span><span class="result-value">${data.total_degree}</span></div>
            <div class="result-item"><span class="result-label">الحالة</span><span class="result-value">${data.student_case_desc}</span></div>
        `;
        resultDiv.classList.add('show');
    } catch (err) {
        loadingDiv.classList.remove('show');
        errorDiv.textContent = 'حدث خطأ في الاتصال بالخادم';
        errorDiv.classList.add('show');
    }
});
