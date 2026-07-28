import os, sqlite3
from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
import uvicorn

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EXCEL_PATH = os.path.join(BASE_DIR, "..", "نتيجة ثانوية عامة نظام حديث.xlsx")
DB_PATH = os.path.join(BASE_DIR, "database.db")

def ensure_db():
    if os.path.exists(DB_PATH):
        conn = sqlite3.connect(DB_PATH)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_seating_no ON results(seating_no)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_arabic_name ON results(arabic_name)")
        conn.commit()
        conn.close()
        return
    if not os.path.exists(EXCEL_PATH):
        return
    import pandas as pd
    df = pd.read_excel(EXCEL_PATH)
    conn = sqlite3.connect(DB_PATH)
    df.to_sql("results", conn, if_exists="replace", index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_seating_no ON results(seating_no)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_arabic_name ON results(arabic_name)")
    conn.commit()
    conn.close()

ensure_db()

app = FastAPI()
templates = Jinja2Templates(directory=os.path.join(BASE_DIR, "templates"))
app.mount("/static", StaticFiles(directory=os.path.join(BASE_DIR, "static")), name="static")

def query_student(seating_no: int):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT seating_no, arabic_name, total_degree, student_case_desc FROM results WHERE seating_no = ?", (seating_no,))
    row = c.fetchone()
    conn.close()
    return row

@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

def search_by_name(name: str, exact: bool = False, limit: int = 100):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if exact:
        c.execute("SELECT seating_no, arabic_name, total_degree, student_case_desc FROM results WHERE arabic_name = ? LIMIT ?", (name, limit))
    else:
        c.execute("SELECT seating_no, arabic_name, total_degree, student_case_desc FROM results WHERE arabic_name LIKE ? LIMIT ?", (f"%{name}%", limit))
    rows = c.fetchall()
    conn.close()
    return [{"seating_no": r[0], "arabic_name": r[1], "total_degree": r[2], "student_case_desc": r[3]} for r in rows]

def suggest_names(query: str):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT DISTINCT arabic_name FROM results WHERE arabic_name LIKE ? LIMIT 50", (f"{query}%",))
    rows = [r[0] for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/suggest")
async def suggest(q: str):
    if len(q.strip()) < 2:
        return {"names": []}
    return {"names": suggest_names(q.strip())}

@app.get("/search")
async def search(seating_no: str = None, name: str = None, exact: str = "0"):
    if seating_no:
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
    if name:
        name = name.strip()
        if len(name) < 3 and exact != "1":
            return {"error": "يرجى إدخال 3 أحرف على الأقل للبحث بالاسم"}
        results = search_by_name(name, exact=(exact == "1"))
        if not results:
            return {"error": f"لم يتم العثور على طالب بهذا الاسم"}
        return {"results": results, "count": len(results)}
    return {"error": "يرجى إدخال رقم جلوس أو اسم"}

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
