"""
MongoDB Database Manager for Chat Sessions
"""
import os
from typing import Optional, List, Dict, Any
from datetime import datetime
from pymongo import MongoClient, DESCENDING
from pymongo.errors import PyMongoError
from dotenv import load_dotenv
from models import ChatSession, Message, SessionUpdate

# Load environment variables
load_dotenv()

class DatabaseManager:
    """Manages MongoDB connections and operations for chat sessions"""
    
    def __init__(self):
        self.mongo_uri = os.getenv("MONGO_URI")
        if not self.mongo_uri:
            raise ValueError("MONGO_URI not found in environment variables")
        
        self.client = None
        self.db = None
        self.sessions_collection = None
        self._connect()
    
    def _connect(self):
        """Establish MongoDB connection"""
        try:
            self.client = MongoClient(self.mongo_uri)
            self.db = self.client["pharmassist_db"]
            self.sessions_collection = self.db["chat_sessions"]
            
            # Create indexes for better performance
            self.sessions_collection.create_index([("sessionId", 1)], unique=True)
            self.sessions_collection.create_index([("updatedAt", DESCENDING)])
            
            # Test connection
            self.client.admin.command('ping')
            print("[DB] Successfully connected to MongoDB")
        except Exception as e:
            print(f"[DB] Failed to connect to MongoDB: {e}")
            raise
    
    def close(self):
        """Close MongoDB connection"""
        if self.client:
            self.client.close()
            print("[DB] MongoDB connection closed")
    
    # ===== SESSION OPERATIONS =====
    
    def create_session(self, title: str = "New Analysis") -> ChatSession:
        """Create a new chat session"""
        try:
            session = ChatSession(title=title)
            session_dict = session.model_dump(mode='json')
            
            # Convert datetime objects to ISO format
            session_dict['createdAt'] = session.createdAt.isoformat()
            session_dict['updatedAt'] = session.updatedAt.isoformat()
            session_dict['chatHistory'] = [
                {**msg.model_dump(mode='json'), 'timestamp': msg.timestamp.isoformat()}
                for msg in session.chatHistory
            ]
            
            self.sessions_collection.insert_one(session_dict)
            print(f"[DB] Created session: {session.sessionId}")
            return session
        except PyMongoError as e:
            print(f"[DB] Error creating session: {e}")
            raise
    
    def get_session(self, session_id: str) -> Optional[ChatSession]:
        """Retrieve a session by ID"""
        try:
            session_data = self.sessions_collection.find_one({"sessionId": session_id})
            if not session_data:
                return None
            
            # Remove MongoDB _id field
            session_data.pop('_id', None)
            
            # Convert ISO strings back to datetime
            if isinstance(session_data.get('createdAt'), str):
                session_data['createdAt'] = datetime.fromisoformat(session_data['createdAt'])
            if isinstance(session_data.get('updatedAt'), str):
                session_data['updatedAt'] = datetime.fromisoformat(session_data['updatedAt'])
            
            # Convert message timestamps
            for msg in session_data.get('chatHistory', []):
                if isinstance(msg.get('timestamp'), str):
                    msg['timestamp'] = datetime.fromisoformat(msg['timestamp'])
            
            return ChatSession(**session_data)
        except PyMongoError as e:
            print(f"[DB] Error retrieving session {session_id}: {e}")
            return None
    
    def list_sessions(self, limit: int = 50, skip: int = 0) -> List[Dict[str, Any]]:
        """List all sessions with pagination"""
        try:
            cursor = self.sessions_collection.find(
                {},
                {
                    'sessionId': 1,
                    'title': 1,
                    'createdAt': 1,
                    'updatedAt': 1,
                    'messageCount': 1,
                    '_id': 0
                }
            ).sort('updatedAt', DESCENDING).skip(skip).limit(limit)
            
            sessions = list(cursor)
            return sessions
        except PyMongoError as e:
            print(f"[DB] Error listing sessions: {e}")
            return []
    
    def update_session(self, session_id: str, updates: Dict[str, Any]) -> bool:
        """Update session data"""
        try:
            # Always update the updatedAt timestamp
            updates['updatedAt'] = datetime.utcnow().isoformat()
            
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {"$set": updates}
            )
            
            if result.modified_count > 0:
                print(f"[DB] Updated session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error updating session {session_id}: {e}")
            return False
    
    def delete_session(self, session_id: str) -> bool:
        """Delete a session"""
        try:
            result = self.sessions_collection.delete_one({"sessionId": session_id})
            if result.deleted_count > 0:
                print(f"[DB] Deleted session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error deleting session {session_id}: {e}")
            return False
    
    # ===== MESSAGE OPERATIONS =====
    
    def add_message(self, session_id: str, message: Message) -> bool:
        """Add a message to a session's chat history"""
        try:
            message_dict = message.model_dump(mode='json')
            message_dict['timestamp'] = message.timestamp.isoformat()
            
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {
                    "$push": {"chatHistory": message_dict},
                    "$inc": {"messageCount": 1},
                    "$set": {"updatedAt": datetime.utcnow().isoformat()}
                }
            )
            
            if result.modified_count > 0:
                print(f"[DB] Added message to session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error adding message to session {session_id}: {e}")
            return False
    
    def get_chat_history(self, session_id: str, limit: int = 100) -> List[Message]:
        """Get chat history for a session"""
        try:
            session_data = self.sessions_collection.find_one(
                {"sessionId": session_id},
                {"chatHistory": {"$slice": -limit}, "_id": 0}
            )
            
            if not session_data or 'chatHistory' not in session_data:
                return []
            
            messages = []
            for msg_data in session_data['chatHistory']:
                if isinstance(msg_data.get('timestamp'), str):
                    msg_data['timestamp'] = datetime.fromisoformat(msg_data['timestamp'])
                messages.append(Message(**msg_data))
            
            return messages
        except PyMongoError as e:
            print(f"[DB] Error getting chat history for session {session_id}: {e}")
            return []
    
    # ===== AGENT DATA OPERATIONS =====
    
    def update_agent_data(self, session_id: str, agent_id: str, data: Dict[str, Any]) -> bool:
        """Update agent data for a session"""
        try:
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        f"agentsData.{agent_id}": data,
                        "updatedAt": datetime.utcnow().isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"[DB] Updated agent data for {agent_id} in session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error updating agent data for session {session_id}: {e}")
            return False
    
    def update_workflow_state(self, session_id: str, workflow_state: Dict[str, Any]) -> bool:
        """Update workflow state for a session"""
        try:
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "workflowState": workflow_state,
                        "updatedAt": datetime.utcnow().isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"[DB] Updated workflow state for session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error updating workflow state for session {session_id}: {e}")
            return False
    
    def update_title(self, session_id: str, title: str) -> bool:
        """Update session title"""
        try:
            result = self.sessions_collection.update_one(
                {"sessionId": session_id},
                {
                    "$set": {
                        "title": title,
                        "updatedAt": datetime.utcnow().isoformat()
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"[DB] Updated title for session: {session_id}")
                return True
            return False
        except PyMongoError as e:
            print(f"[DB] Error updating title for session {session_id}: {e}")
            return False


# Global database manager instance
db_manager: Optional[DatabaseManager] = None


def get_db_manager() -> DatabaseManager:
    """Get or create the global database manager instance"""
    global db_manager
    if db_manager is None:
        db_manager = DatabaseManager()
    return db_manager


def close_db_connection():
    """Close the database connection"""
    global db_manager
    if db_manager:
        db_manager.close()
        db_manager = None
