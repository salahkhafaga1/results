import sqlite3
from fastapi import FastAPI, Form, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
import uvicorn

app = FastAPI()
DB_PATH = "results.db"

def query_student(seating_no: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT seating_no, arabic_name, total_degree, student_case_desc FROM results WHERE seating_no = ?", (seating_no,))
    row = c.fetchone()
    conn.close()
    return row

HTML_PAGE = """
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>نتيجة الثانوية العامة</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            width: 100%;
            max-width: 500px;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 8px;
            color: #555;
            font-weight: 600;
        }
        input[type="text"] {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 18px;
            transition: border 0.3s;
            text-align: center;
            direction: ltr;
        }
        input[type="text"]:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border: none;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
        }
        .result {
            margin-top: 25px;
            padding: 20px;
            border-radius: 12px;
            background: #f8f9ff;
            display: none;
        }
        .result.show { display: block; }
        .result h2 {
            color: #333;
            margin-bottom: 15px;
            text-align: center;
        }
        .result-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e8e8ff;
        }
        .result-item:last-child { border-bottom: none; }
        .result-label { color: #888; font-weight: 600; }
        .result-value { color: #333; font-weight: 700; }
        .error {
            margin-top: 25px;
            padding: 15px;
            background: #fff0f0;
            color: #d32f2f;
            border-radius: 10px;
            text-align: center;
            display: none;
            font-weight: 600;
        }
        .error.show { display: block; }
        .loading {
            margin-top: 25px;
            text-align: center;
            color: #667eea;
            display: none;
            font-weight: 600;
        }
        .loading.show { display: block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📄 نتيجة الثانوية العامة</h1>
        <p class="subtitle">أدخل رقم الجلوس لعرض النتيجة</p>
        <form id="searchForm">
            <div class="form-group">
                <label for="seatingNo">رقم الجلوس</label>
                <input type="text" id="seatingNo" placeholder="مثال: 2001970" inputmode="numeric" pattern="[0-9]*" required>
            </div>
            <button type="submit">🔍 بحث</button>
        </form>
        <div class="loading" id="loading">جاري البحث...</div>
        <div class="error" id="error"></div>
        <div class="result" id="result"></div>
    </div>

    <script>
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
    </script>
</body>
</html>
"""

@app.get("/", response_class=HTMLResponse)
async def home():
    return HTML_PAGE

@app.get("/search")
async def search(seating_no: str):
    if not seating_no.isdigit():
        return {"error": "يرجى إدخال رقم جلوس صحيح"}
    row = query_student(int(seating_no))
    if not row:
        return {"error": f"لم يتم العثور على نتيجة لرقم الجلوس {seating_no}"}
    return {
        "seating_no": row[0],
        "arabic_name": row[1],
        "total_degree": row[2],
        "student_case_desc": row[3]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
