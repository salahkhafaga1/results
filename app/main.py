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
        return
    if not os.path.exists(EXCEL_PATH):
        return
    import pandas as pd
    df = pd.read_excel(EXCEL_PATH)
    conn = sqlite3.connect(DB_PATH)
    df.to_sql("results", conn, if_exists="replace", index=False)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_seating_no ON results(seating_no)")
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
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
