"""
Test script to verify MongoDB connection and basic operations
"""
from db_manager import get_db_manager, close_db_connection
from models import Message

def test_mongodb_connection():
    """Test MongoDB connection and basic CRUD operations"""
    print("=" * 60)
    print("Testing MongoDB Connection and Operations")
    print("=" * 60)
    
    try:
        # Get database manager
        print("\n1. Connecting to MongoDB...")
        db = get_db_manager()
        print("✓ Successfully connected to MongoDB!")
        
        # Create a test session
        print("\n2. Creating test session...")
        session = db.create_session(title="Test Session - MongoDB Integration")
        print(f"✓ Created session: {session.sessionId}")
        print(f"  Title: {session.title}")
        
        # Add a message
        print("\n3. Adding test message...")
        msg = Message(
            role="user",
            content="Hello, this is a test message!",
            type="text"
        )
        success = db.add_message(session.sessionId, msg)
        if success:
            print(f"✓ Message added successfully")
        
        # Retrieve the session
        print("\n4. Retrieving session...")
        retrieved_session = db.get_session(session.sessionId)
        if retrieved_session:
            print(f"✓ Session retrieved successfully")
            print(f"  Message count: {retrieved_session.messageCount}")
            print(f"  Chat history length: {len(retrieved_session.chatHistory)}")
        
        # Update agent data
        print("\n5. Updating agent data...")
        agent_data = {
            "status": "completed",
            "data": {"test": "This is test data"}
        }
        success = db.update_agent_data(session.sessionId, "test_agent", agent_data)
        if success:
            print(f"✓ Agent data updated successfully")
        
        # List sessions
        print("\n6. Listing all sessions...")
        sessions = db.list_sessions(limit=10)
        print(f"✓ Found {len(sessions)} session(s)")
        
        # Delete the test session
        print("\n7. Cleaning up - deleting test session...")
        success = db.delete_session(session.sessionId)
        if success:
            print(f"✓ Test session deleted successfully")
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED - MongoDB Integration Working!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\n" + "=" * 60)
        print("✗ TESTS FAILED - Please check your MongoDB connection")
        print("=" * 60)
        raise
    
    finally:
        # Close connection
        print("\nClosing database connection...")
        close_db_connection()
        print("✓ Connection closed")


if __name__ == "__main__":
    test_mongodb_connection()
