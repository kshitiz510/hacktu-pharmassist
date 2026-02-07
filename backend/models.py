"""
Pydantic models for MongoDB documents (ACTIVE ONLY)
Everything else is commented out for now.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import uuid4


# ===== ACTIVE MODELS =====

class Message(BaseModel):
    """Individual message in a chat session"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    type: str = "text"  # 'text' | 'greeting' | 'rejection' | 'agent-complete'
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ChatSession(BaseModel):
    """
    Complete chat session document.
    For now, most logic lives inside this object.
    """
    sessionId: str = Field(default_factory=lambda: str(uuid4()))
    title: str = "New Analysis"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)

    # Full conversation
    chatHistory: List[Message] = Field(default_factory=list)

    # All agent outputs (keyed by agent name)
    agentsData: Dict[str, Any] = Field(default_factory=dict)

    # Unified orchestration / state blob (will evolve later)
    sessionState: Dict[str, Any] = Field(default_factory=dict)

    # Quick counter
    messageCount: int = 0


class SessionCreate(BaseModel):
    """Request model for creating a new session"""
    title: Optional[str] = "New Analysis"


class MessageCreate(BaseModel):
    """Request model for adding a message to a session"""
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    type: str = "text"


# ===== COMMENTED OUT (FOR LATER PHASE) =====

"""
class WorkflowState(BaseModel):
    activeAgent: Optional[str] = None
    showAgentDataByAgent: Dict[str, bool] = Field(default_factory=dict)
    reportReady: bool = False
    workflowComplete: bool = False
    queryRejected: bool = False
    systemResponse: Optional[str] = None
    panelCollapsed: bool = False
    showAgentFlow: bool = False
    drugName: Optional[str] = None
    indication: Optional[str] = None


class SessionUpdate(BaseModel):
    title: Optional[str] = None
    agentsData: Optional[Dict[str, Any]] = None
    workflowState: Optional[Dict[str, Any]] = None


class SessionResponse(BaseModel):
    sessionId: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: int
    agentsData: Dict[str, Any] = Field(default_factory=dict)
    chatHistory: List[Message] = Field(default_factory=list)
    workflowState: WorkflowState


class SessionListItem(BaseModel):
    sessionId: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: int
"""
