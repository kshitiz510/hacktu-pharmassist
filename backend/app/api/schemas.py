from pydantic import BaseModel
from typing import Optional


class SessionCreateRequest(BaseModel):
    title: Optional[str] = "New Analysis"


class AnalysisRequest(BaseModel):
    sessionId: str
    prompt: str
