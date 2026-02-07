"""MongoDB connection utilities and FastAPI dependency helpers."""

from typing import Optional
import uuid
from datetime import datetime
from fastapi import Request
from pymongo import MongoClient
from bson import ObjectId

from app.core.config import MONGO_URI, MONGO_DB_NAME, MONGO_CHAT_COLLECTION


class DatabaseManager:
    def __init__(self):
        if not MONGO_URI:
            raise ValueError("MONGO_URI not found in environment variables")

        try:
            self.client = MongoClient(MONGO_URI)
            self.db = self.client[MONGO_DB_NAME]
            self.sessions = self.db[MONGO_CHAT_COLLECTION]

            # Test connection
            self.client.admin.command("ping")
            print("[DB] Connected to MongoDB successfully")

        except Exception as e:  # pragma: no cover - connectivity errors surface early
            print(f"[DB] MongoDB connection failed: {e}")
            raise
    
    def get_session(self, session_id: str):
        doc = self.sessions.find_one({"sessionId": session_id})
        return self._serialize(doc)

    def list_sessions(self):
        docs = list(self.sessions.find({}))
        return self._serialize(docs)

    def _serialize(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, uuid.UUID):
            return str(obj)
        if isinstance(obj, list):
            return [self._serialize(i) for i in obj]
        if isinstance(obj, dict):
            return {k: self._serialize(v) for k, v in obj.items()}
        return obj


    def create_session(self, title: str = "New Analysis") -> str:
        """Create a session with a unique UUID and return sessionId."""
        while True:
            session_id = str(uuid.uuid4())
            exists = self.sessions.find_one({"sessionId": session_id})
            if not exists:
                break

        now = datetime.utcnow().isoformat()
        self.sessions.insert_one(
            {
                "sessionId": session_id,
                "title": title,
                "createdAt": now,
                "updatedAt": now,
                "chatHistory": [],
                "agentsData": [],
                "workflowState": {
                    "activeAgent": None,
                    "showAgentDataByAgent": {},
                    "reportReady": False,
                    "workflowComplete": False,
                    "queryRejected": False,
                    "systemResponse": None,
                    "panelCollapsed": False,
                    "showAgentFlow": False,
                },
            }
        )

        print(f"[DB] Created session {session_id}")
        return session_id

    def delete_session(self, session_id: str) -> bool:
        """Delete a session by sessionId."""
        result = self.sessions.delete_one({"sessionId": session_id})
        if result.deleted_count > 0:
            print(f"[DB] Deleted session {session_id}")
            return True

        print(f"[DB] Session {session_id} not found for deletion")
        return False

def init_db() -> DatabaseManager:
    """Create a database manager instance."""
    return DatabaseManager()


def get_db(request: Request) -> DatabaseManager:
    """FastAPI dependency to fetch the shared DatabaseManager."""
    db: Optional[DatabaseManager] = getattr(request.app.state, "db", None)
    if db is None:
        raise RuntimeError("Database not initialized on application state")
    return db
