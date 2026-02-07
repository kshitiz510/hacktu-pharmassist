"""MongoDB connection utilities and FastAPI dependency helpers."""

from typing import Optional
import uuid
from datetime import datetime
from fastapi import Request
from pymongo import MongoClient, ASCENDING
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

            # Ensure notifications collection & indexes
            self._ensure_notifications_indexes()

        except Exception as e:  # pragma: no cover - connectivity errors surface early
            print(f"[DB] MongoDB connection failed: {e}")
            raise

    def _ensure_notifications_indexes(self):
        """Create indexes on the notifications collection for fast lookup."""
        try:
            notif = self.db["notifications"]
            notif.create_index(
                [("sessionId", ASCENDING), ("promptId", ASCENDING), ("enabled", ASCENDING)],
                name="idx_session_prompt_enabled",
            )
            notif.create_index(
                [("notificationId", ASCENDING)],
                name="idx_notification_id",
                unique=True,
            )
            print("[DB] Notifications indexes ensured")
        except Exception as e:
            print(f"[DB] Warning: could not create notifications indexes: {e}")
    
    def get_session(self, session_id: str):
        doc = self.sessions.find_one({"sessionId": session_id})
        return self._serialize(doc)

    def list_sessions(self, skip: int = 0, limit: int = 50):
        """Return lightweight session summaries (no agentsData/chatHistory) with pagination."""
        projection = {
            "agentsData": 0,
            "workflowState": 0,
            "chatHistory": 0,
        }
        docs = list(
            self.sessions.find({}, projection)
            .sort("_id", -1)
            .skip(skip)
            .limit(limit)
        )
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
