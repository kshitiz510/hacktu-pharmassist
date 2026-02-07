import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plus,
  MessageSquare,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronDown,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/**
 * ChatSidebar Component
 * Provides ChatGPT-like chat management interface
 */
export function ChatSidebar({
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRestoreChat,
  onRenameChat,
  isCollapsed = false,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [deletedChat, setDeletedChat] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);
  const undoTimeoutRef = useRef(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Filter chats based on search
  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Sort chats by most recent
  const sortedChats = [...filteredChats].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
  );

  // Group chats by date
  const groupChatsByDate = (chatList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const groups = {
      today: [],
      yesterday: [],
      lastWeek: [],
      lastMonth: [],
      older: [],
    };

    chatList.forEach((chat) => {
      const chatDate = new Date(chat.updatedAt || chat.createdAt);
      if (chatDate >= today) {
        groups.today.push(chat);
      } else if (chatDate >= yesterday) {
        groups.yesterday.push(chat);
      } else if (chatDate >= lastWeek) {
        groups.lastWeek.push(chat);
      } else if (chatDate >= lastMonth) {
        groups.lastMonth.push(chat);
      } else {
        groups.older.push(chat);
      }
    });

    return groups;
  };

  const groupedChats = groupChatsByDate(sortedChats);

  const handleStartEdit = (chat) => {
    setEditingId(chat.id);
    setEditTitle(chat.title);
    setMenuOpenId(null);
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim()) {
      onRenameChat(editingId, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  const handleDelete = (chatId) => {
    setMenuOpenId(null);

    // Find and store the chat before deleting
    const chatToDelete = chats.find((c) => c.id === chatId);
    if (!chatToDelete) return;

    // Clear any existing undo timeout
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    // Store deleted chat and show undo toast
    setDeletedChat(chatToDelete);
    setShowUndo(true);

    // Delete the chat
    onDeleteChat(chatId);

    // Auto-hide undo after 5 seconds
    undoTimeoutRef.current = setTimeout(() => {
      setShowUndo(false);
      setDeletedChat(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (deletedChat && onRestoreChat) {
      onRestoreChat(deletedChat);
      setShowUndo(false);
      setDeletedChat(null);
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    }
  };

  const handleDismissUndo = () => {
    setShowUndo(false);
    setDeletedChat(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };

  const renderChatItem = (chat) => {
    const isActive = chat.id === activeChatId;
    const isEditing = chat.id === editingId;
    const isHovered = chat.id === hoveredId;
    const isMenuOpen = chat.id === menuOpenId;

    return (
      <motion.div
        key={chat.id}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        transition={{ duration: 0.15 }}
        className="relative group"
        onMouseEnter={() => setHoveredId(chat.id)}
        onMouseLeave={() => {
          setHoveredId(null);
          if (!isMenuOpen) setMenuOpenId(null);
        }}
      >
        {isEditing ? (
          <div className="flex items-center gap-1.5 px-2 py-2 bg-zinc-800 rounded-xl border border-cyan-500/30">
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="flex-1 bg-zinc-900 text-zinc-100 text-sm px-3 py-1.5 rounded-lg outline-none border border-zinc-700 focus:border-cyan-500 transition-colors"
            />
            <button
              onClick={handleSaveEdit}
              className="p-1.5 hover:bg-green-500/20 rounded-lg text-green-400 transition-colors"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-400 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onSelectChat(chat.id)}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/15 border border-cyan-500/25 shadow-lg shadow-cyan-500/5"
                : "hover:bg-zinc-800/60 border border-transparent"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isActive ? "bg-cyan-500/20" : "bg-zinc-800"
              }`}
            >
              <MessageSquare size={14} className={isActive ? "text-cyan-400" : "text-zinc-500"} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isActive ? "text-white" : "text-zinc-300"
                }`}
              >
                {chat.title}
              </p>
              <p className="text-xs text-zinc-500 truncate mt-0.5">
                {chat.messages && chat.messages.length > 0
                  ? `${chat.messages.filter((m) => m.role === "user").length} message${chat.messages.filter((m) => m.role === "user").length !== 1 ? "s" : ""}`
                  : "No messages yet"}
              </p>
            </div>

            {/* Action buttons - show on hover */}
            <AnimatePresence>
              {(isHovered || isMenuOpen) && !isEditing && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.1 }}
                  className="flex items-center gap-0.5 bg-zinc-900/90 rounded-lg p-0.5"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(chat);
                    }}
                    className="p-1.5 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(chat.id);
                    }}
                    className="p-1.5 hover:bg-red-500/20 rounded text-zinc-400 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    );
  };

  const renderGroup = (title, chatList) => {
    if (chatList.length === 0) return null;

    return (
      <div key={title} className="mb-5">
        <div className="flex items-center gap-2 px-3 mb-2">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {title}
          </p>
          <div className="flex-1 h-px bg-zinc-800/50"></div>
        </div>
        <div className="space-y-1">
          <AnimatePresence>{chatList.map(renderChatItem)}</AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <div className="w-72 min-w-[288px] bg-gradient-to-b from-zinc-950 via-zinc-950 to-zinc-900 border-r border-zinc-800/80 flex flex-col h-screen">
      {/* Logo/Brand Header */}
      <div className="p-4 border-b border-zinc-800/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 text-white"
            >
              <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">PharmAssist</h1>
            <p className="text-xs text-zinc-500">Drug Repurposing AI</p>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white transition-all duration-300 bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 hover:from-cyan-400 hover:via-blue-400 hover:to-blue-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
        >
          <Plus size={18} />
          <span>New Analysis</span>
        </motion.button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-zinc-800/30">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900/80 border border-zinc-800/50 rounded-xl pl-10 pr-8 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50 focus:bg-zinc-900 transition-all duration-200"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-zinc-700 rounded text-zinc-500 hover:text-zinc-300"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 px-3 py-3">
        {sortedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-zinc-600" />
            </div>
            <p className="text-sm font-medium text-zinc-400">
              {searchQuery ? "No conversations found" : "No conversations yet"}
            </p>
            <p className="text-xs text-zinc-600 mt-1.5 max-w-[180px]">
              {searchQuery
                ? "Try a different search term"
                : "Start a new analysis to begin exploring drug repurposing opportunities"}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {renderGroup("Today", groupedChats.today)}
            {renderGroup("Yesterday", groupedChats.yesterday)}
            {renderGroup("Last 7 Days", groupedChats.lastWeek)}
            {renderGroup("Last 30 Days", groupedChats.lastMonth)}
            {renderGroup("Older", groupedChats.older)}
          </div>
        )}
      </ScrollArea>

      {/* Undo Toast */}
      <AnimatePresence>
        {showUndo && deletedChat && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="mx-3 mb-3 p-3 bg-zinc-800 border border-zinc-700 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 truncate">{deletedChat.title}</p>
                <p className="text-xs text-zinc-500">Chat deleted</p>
              </div>
              <div className="flex items-center gap-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleUndo}
                  className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Undo
                </motion.button>
                <button
                  onClick={handleDismissUndo}
                  className="p-1.5 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-zinc-300 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-xs text-zinc-500">
              {chats.length} conversation{chats.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="text-xs text-zinc-600">v1.0</div>
        </div>
      </div>
    </div>
  );
}

export default ChatSidebar;
