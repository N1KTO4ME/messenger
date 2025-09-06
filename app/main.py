from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from app.router import users, chats
from app.websockets import router as websocket_router

app = FastAPI()

# Подключение статических файлов (CSS, JS, изображения)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Подключение маршрутов API
app.include_router(users.router, prefix="/api")
app.include_router(chats.router, prefix="/api")
app.include_router(websocket_router)

@app.get("/", response_class=RedirectResponse)
async def read_root():
    return RedirectResponse(url="/login")

@app.get("/login", response_class=HTMLResponse)
async def get_login_page(request: Request):
    with open("app/static/login.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/chat", response_class=HTMLResponse)
async def get_chat_page(request: Request):
    with open("app/static/chat.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/profile", response_class=HTMLResponse)
async def get_profile_page(request: Request):
    with open("app/static/profile.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)