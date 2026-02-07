"""Simple MongoDB connection manager"""

import uuid
from datetime import datetime
from pymongo import MongoClient
from config import MONGO_URI, MONGO_DB_NAME, MONGO_CHAT_COLLECTION

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

        except Exception as e:
            print(f"[DB] MongoDB connection failed: {e}")
            raise

    def create_session(self, title: str = "New Analysis") -> str:
        """Create a session with a unique UUID and return sessionId"""
        while True:
            session_id = str(uuid.uuid4())
            exists = self.sessions.find_one({"sessionId": session_id})
            if not exists:
                break  # unique

        now = datetime.utcnow().isoformat()
        self.sessions.insert_one({
            "sessionId": session_id,
            "title": title,
            "createdAt": now,
            "updatedAt": now,
            "chatHistory": [],
            "agentsData": {},
            "workflowState": {
                "activeAgent": None,
                "showAgentDataByAgent": {},
                "reportReady": False,
                "workflowComplete": False,
                "queryRejected": False,
                "systemResponse": None,
                "panelCollapsed": False,
                "showAgentFlow": False
            }
        })

        print(f"[DB] Created session {session_id}")
        return session_id
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session by sessionId"""
        result = self.sessions.delete_one({"sessionId": session_id})
        if result.deleted_count > 0:
            print(f"[DB] Deleted session {session_id}")
            return True
        else:
            print(f"[DB] Session {session_id} not found for deletion")
            return False


# Singleton instance
_db = None

def get_db_manager() -> DatabaseManager:
    global _db
    if _db is None:
        _db = DatabaseManager()
    return _db
