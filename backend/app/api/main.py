from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import analysis, health, sessions
from app.core.config import API_METADATA, CORS_ORIGINS
from app.core.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = init_db()
    print("[API] Database initialized successfully")
    yield


app = FastAPI(**API_METADATA, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(sessions.router)
app.include_router(analysis.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.api.main:app", host="0.0.0.0", port=8000, reload=True)


# {
#   "status": "success",
#   "message": "Semaglutide shows promising repurposing signals...",
#   "session": {
#     "sessionId": "...",
#     "title": "...",
#     "chatHistory": [
#       { "role": "user", "content": "..." },
#       { "role": "assistant", "content": "..." }
#     ],
#     "agentsData": {
#       "iqvia": { ... },
#       "exim": { ... },
#       "patent": { ... },
#       "clinical": { ... },
#       "internal": { ... },
#       "report": { ... }
#     },
#     "workflowState": { ... }
#   },
#   "meta": {}
# }
