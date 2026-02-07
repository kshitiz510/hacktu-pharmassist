"""
Pydantic models for MongoDB documents
"""
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
from uuid import uuid4


class Message(BaseModel):
    """Individual message in a chat session"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    type: str = "text"  # 'text' | 'greeting' | 'rejection' | 'agent-complete'
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class WorkflowState(BaseModel):
    """Workflow state for tracking analysis progress"""
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


class ChatSession(BaseModel):
    """Complete chat session document"""
    sessionId: str = Field(default_factory=lambda: str(uuid4()))
    title: str = "New Analysis"
    createdAt: datetime = Field(default_factory=datetime.utcnow)
    updatedAt: datetime = Field(default_factory=datetime.utcnow)
    
    # Agent data storage (one field per agent)
    agentsData: Dict[str, Any] = Field(default_factory=dict)
    
    # Chat history array
    chatHistory: List[Message] = Field(default_factory=list)
    
    # Workflow state
    workflowState: WorkflowState = Field(default_factory=WorkflowState)
    
    # Message count for quick reference
    messageCount: int = 0


class SessionCreate(BaseModel):
    """Request model for creating a new session"""
    title: Optional[str] = "New Analysis"


class SessionUpdate(BaseModel):
    """Request model for updating session data"""
    title: Optional[str] = None
    agentsData: Optional[Dict[str, Any]] = None
    workflowState: Optional[Dict[str, Any]] = None


class MessageCreate(BaseModel):
    """Request model for adding a message to a session"""
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    type: str = "text"


class SessionResponse(BaseModel):
    """Response model for session data"""
    sessionId: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: int
    agentsData: Dict[str, Any] = Field(default_factory=dict)
    chatHistory: List[Message] = Field(default_factory=list)
    workflowState: WorkflowState


class SessionListItem(BaseModel):
    """Minimal session info for listing"""
    sessionId: str
    title: str
    createdAt: datetime
    updatedAt: datetime
    messageCount: int
