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
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

/**
 * ChatSidebar Component
 * Provides ChatGPT-like chat management interface with collapsible sidebar
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
  onToggleCollapse,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredId, setHoveredId] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [deletedChat, setDeletedChat] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const editInputRef = useRef(null);
  const menuRef = useRef(null);
  const undoTimeoutRef = useRef(null);
  const searchInputRef = useRef(null);

  // Focus search input when expanding from search button
  const handleSearchExpand = () => {
    onToggleCollapse();
    // Focus search input after animation completes
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 350);
  };

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
          <div className="flex items-center gap-1.5 px-2 py-2 bg-muted rounded-xl border border-primary/30">
            <input
              ref={editInputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveEdit}
              className="flex-1 bg-background text-foreground text-sm px-3 py-1.5 rounded-lg outline-none border border-border focus:border-primary transition-colors"
            />
            <button
              onClick={handleSaveEdit}
              className="p-1.5 hover:bg-emerald-500/20 rounded-lg text-emerald-500 transition-colors"
            >
              <Check size={14} />
            </button>
            <button
              onClick={handleCancelEdit}
              className="p-1.5 hover:bg-destructive/20 rounded-lg text-destructive transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div
            onClick={() => onSelectChat(chat.id)}
            className={`relative flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
              isActive
                ? "bg-primary/10 border border-primary/25 shadow-lg shadow-primary/5"
                : "hover:bg-muted border border-transparent"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isActive ? "bg-primary/20" : "bg-muted"
              }`}
            >
              <MessageSquare
                size={14}
                className={isActive ? "text-primary" : "text-muted-foreground"}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium truncate ${
                  isActive ? "text-foreground" : "text-foreground/80"
                }`}
              >
                {chat.title}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                  className="flex items-center gap-0.5 bg-background/90 rounded-lg p-0.5"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartEdit(chat);
                    }}
                    className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Rename"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(chat.id);
                    }}
                    className="p-1.5 hover:bg-destructive/20 rounded text-muted-foreground hover:text-destructive transition-colors"
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
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        <div className="space-y-1">
          <AnimatePresence>{chatList.map(renderChatItem)}</AnimatePresence>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      animate={{ width: isCollapsed ? "72px" : "288px" }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="bg-card border-r border-border flex flex-col h-screen overflow-hidden"
    >
      {isCollapsed ? (
        /* Collapsed Sidebar */
        <div className="flex flex-col items-center h-full py-4 gap-4">
          {/* Expand Button - Same position as collapse */}
          <button
            onClick={onToggleCollapse}
            className="w-12 h-12 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight size={20} className="text-muted-foreground" />
          </button>

          {/* Logo - Opens new chat */}
          <button
            onClick={onNewChat}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            title="New Analysis"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-6 h-6 text-white"
            >
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="5" r="1" />
              <circle cx="5" cy="19" r="1" />
              <circle cx="19" cy="19" r="1" />
              <line x1="12" y1="12" x2="19" y2="5" />
              <line x1="12" y1="12" x2="5" y2="19" />
              <line x1="12" y1="12" x2="19" y2="19" />
            </svg>
          </button>

          {/* Search Button - Expands and focuses search */}
          <button
            onClick={handleSearchExpand}
            className="w-12 h-12 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            title="Search Conversations"
          >
            <Search size={20} className="text-muted-foreground" />
          </button>
        </div>
      ) : (
        /* Expanded Sidebar */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
          className="flex flex-col h-full"
        >
          {/* Logo/Brand Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => onSelectChat(null)}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group flex-1"
                title="Home"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
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
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="19" cy="5" r="1" />
                    <circle cx="5" cy="19" r="1" />
                    <circle cx="19" cy="19" r="1" />
                    <line x1="12" y1="12" x2="19" y2="5" />
                    <line x1="12" y1="12" x2="5" y2="19" />
                    <line x1="12" y1="12" x2="19" y2="19" />
                  </svg>
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    PharmAssist
                  </h1>
                  <p className="text-xs text-muted-foreground">Drug Repurposing AI</p>
                </div>
              </button>

              {/* Collapse Button */}
              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={18} className="text-muted-foreground" />
              </button>
            </div>
            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={onNewChat}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-primary-foreground transition-all duration-300 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 hover:shadow-primary/40"
            >
              <Plus size={18} />
              <span>New Analysis</span>
            </motion.button>
          </div>

          {/* Search */}
          <div className="px-4 py-3 border-b border-border">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-background border border-border rounded-xl pl-10 pr-8 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:bg-background transition-all duration-200"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
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
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <MessageSquare size={28} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? "No conversations found" : "No conversations yet"}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5 max-w-[180px]">
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
                className="mx-3 mb-3 p-3 bg-card border border-border rounded-xl shadow-lg"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {deletedChat.title}
                    </p>
                    <p className="text-xs text-muted-foreground">Chat deleted</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleUndo}
                      className="px-3 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold rounded-lg transition-colors"
                    >
                      Undo
                    </motion.button>
                    <button
                      onClick={handleDismissUndo}
                      className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer */}
          <div className="p-4 border-t border-border bg-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs text-muted-foreground">
                  {chats.length} conversation{chats.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">v1.0</div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

export default ChatSidebar;
