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
            # Configure MongoDB with longer timeouts and connection pool settings
            self.client = MongoClient(
                MONGO_URI,
                maxPoolSize=50,  # Increase pool size for concurrent operations
                minPoolSize=10,  # Maintain minimum connections
                maxIdleTimeMS=45000,  # Keep idle connections alive longer
                serverSelectionTimeoutMS=30000,  # Increase server selection timeout
                socketTimeoutMS=45000,  # Increase socket timeout for long operations
                connectTimeoutMS=20000,  # Connection timeout
                retryWrites=True,  # Enable automatic retry for write operations
                retryReads=True,  # Enable automatic retry for read operations
            )
            self.db = self.client[MONGO_DB_NAME]
            self.sessions = self.db[MONGO_CHAT_COLLECTION]
            self.users = self.db["users"]

            # Test connection
            self.client.admin.command("ping")
            print("[DB] Connected to MongoDB successfully")

            # Ensure notifications collection & indexes
            self._ensure_notifications_indexes()
            self._ensure_users_indexes()

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

    def _ensure_users_indexes(self):
        """Create indexes on the users collection."""
        try:
            self.users.create_index(
                [("clerkUserId", ASCENDING)],
                name="idx_clerk_user_id",
                unique=True,
            )
            print("[DB] Users indexes ensured")
        except Exception as e:
            print(f"[DB] Warning: could not create users indexes: {e}")

    # ── User operations ─────────────────────────────────────────────────

    def upsert_user(self, clerk_user_id: str) -> dict:
        """Create or touch a user record on every authenticated request.

        Lightweight: only sets ``clerkUserId`` and timestamps.
        """
        now = datetime.utcnow().isoformat()
        result = self.users.find_one_and_update(
            {"clerkUserId": clerk_user_id},
            {
                "$setOnInsert": {"clerkUserId": clerk_user_id, "createdAt": now},
                "$set": {"lastSeenAt": now},
            },
            upsert=True,
            return_document=True,
        )
        return self._serialize(result)

    # ── Session operations (user-scoped) ────────────────────────────────

    def get_session(self, session_id: str, user_id: str | None = None):
        query = {"sessionId": session_id}
        if user_id is not None:
            query["userId"] = user_id
        doc = self.sessions.find_one(query)
        return self._serialize(doc)

    def list_sessions(self, skip: int = 0, limit: int = 50, user_id: str | None = None):
        """Return lightweight session summaries scoped to a user."""
        query = {}
        if user_id is not None:
            query["userId"] = user_id
        projection = {
            "agentsData": 0,
            "workflowState": 0,
            "chatHistory": 0,
        }
        docs = list(
            self.sessions.find(query, projection)
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


    def create_session(self, title: str = "New Analysis", user_id: str | None = None) -> str:
        """Create a session with a unique UUID and return sessionId."""
        while True:
            session_id = str(uuid.uuid4())
            exists = self.sessions.find_one({"sessionId": session_id})
            if not exists:
                break

        now = datetime.utcnow().isoformat()
        doc = {
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
        if user_id is not None:
            doc["userId"] = user_id

        self.sessions.insert_one(doc)

        print(f"[DB] Created session {session_id}")
        return session_id

    def delete_session(self, session_id: str, user_id: str | None = None) -> bool:
        """Delete a session by sessionId, optionally scoped to a user."""
        query = {"sessionId": session_id}
        if user_id is not None:
            query["userId"] = user_id
        result = self.sessions.delete_one(query)
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
