import style from "./UserList.module.scss";
import dpImg from "../../assets/DefaultUserPic.png";
import {
  EllipsisVertical,
  Loader2,
  Search,
  X,
  Phone,
  Video,
  Sparkles,
  MessageSquare,
  Users,
} from "lucide-react";
import api from "../../services/api";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import Dropdown from "./Dropdown/Dropdown";
import { logoutUser } from "../../Redux/slices/authSlice";
import { useSocketContext } from "../../context/SocketContext";
import { getAllConversations } from "../../services/chatDb";
import BrandLogo from "../../components/BrandLogo/BrandLogo";

const UserList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchInputRef = useRef(null);

  const [users, setusers] = useState([]);
  const [loading, setloading] = useState(true);
  const [error, seterror] = useState(null);
  const [searchTerm, setsearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // 'all' | 'unread' | 'online'
  const [showDropdown, setshowDropdown] = useState(false);

  const { socket } = useSocketContext();
  const { onlineUsers } = useSelector((state) => state.socket);
  const { user: currentUser } = useSelector((state) => state.auth);

  // OPTIMIZATION: O(1) set lookup for online user IDs
  const onlineUserSet = useMemo(() => new Set(onlineUsers || []), [onlineUsers]);

  const getUserId = useCallback((user) => user?._id || user?.id, []);

  const isUserOnline = useCallback(
    (userId) => {
      if (!userId) return false;
      return onlineUserSet.has(String(userId));
    },
    [onlineUserSet],
  );

  // Fetch initial chat participants & merge with local IndexedDB conversation summaries
  useEffect(() => {
    let isMounted = true;
    const fetchUsers = async () => {
      try {
        setloading(true);
        const [response, localConvs] = await Promise.all([
          api.get("/users/participants"),
          getAllConversations().catch(() => ({})),
        ]);

        if (isMounted) {
          const serverParticipants = response.data.participants || [];

          // Merge server directory with local browser IndexedDB summaries
          const merged = serverParticipants.map((p) => {
            const pId = String(getUserId(p));
            const local = localConvs[pId];

            if (local && local.lastMessageAt) {
              const localDate = new Date(local.lastMessageAt).getTime();
              const serverDate = p.lastMessageAt ? new Date(p.lastMessageAt).getTime() : 0;

              if (localDate >= serverDate || p.lastMessage === "Start a conversation") {
                return {
                  ...p,
                  lastMessage: local.lastMessage,
                  lastMessageAt: local.lastMessageAt,
                  unreadCount: local.unreadCount !== undefined ? local.unreadCount : p.unreadCount,
                };
              }
            }
            return p;
          });

          // Sort by latest message timestamp
          merged.sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return timeB - timeA;
          });

          setusers(merged);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
        if (isMounted) {
          seterror("Failed to load chats. Please try again.");
        }
      } finally {
        if (isMounted) {
          setloading(false);
        }
      }
    };
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, [getUserId]);

  // Real-time socket message handler (updates preview & unread badge)
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (newMessage) => {
      setusers((prevUsers) => {
        const updated = prevUsers.map((user) => {
          const userId = String(getUserId(user));

          // If incoming message from this user: update text, timestamp and increment unread badge
          if (userId === String(newMessage.sender)) {
            return {
              ...user,
              lastMessage: newMessage.text,
              lastMessageAt: newMessage.createdAt,
              unreadCount: (user.unreadCount || 0) + 1,
            };
          }

          // If current user sent message: update text and timestamp
          if (userId === String(newMessage.receiver)) {
            return {
              ...user,
              lastMessage: newMessage.text,
              lastMessageAt: newMessage.createdAt,
            };
          }

          return user;
        });

        // Resort by most recent activity
        return updated.sort((a, b) => {
          const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
          const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
          return timeB - timeA;
        });
      });
    };

    socket.on("newMessage", handleNewMessage);
    return () => {
      socket.off("newMessage", handleNewMessage);
    };
  }, [socket, getUserId]);

  // Keyboard shortcut: Cmd+K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter & Search computation
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        !searchTerm.trim() ||
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (activeFilter === "unread") {
        return (user.unreadCount || 0) > 0;
      }
      if (activeFilter === "online") {
        return isUserOnline(getUserId(user));
      }
      return true;
    });
  }, [users, searchTerm, activeFilter, isUserOnline, getUserId]);

  // Online participants for Active Pulse rail
  const onlineParticipants = useMemo(() => {
    return users.filter((user) => isUserOnline(getUserId(user)));
  }, [users, isUserOnline, getUserId]);

  // Total unread count for badge
  const totalUnreadCount = useMemo(() => {
    return users.reduce((sum, u) => sum + (u.unreadCount || 0), 0);
  }, [users]);

  // Formatter for timestamps (Today: 04:38 PM, Yesterday, or Date)
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    if (isYesterday) {
      return "Yesterday";
    }
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setshowDropdown((prev) => !prev);
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    setshowDropdown(false);
    navigate("/login");
  };

  useEffect(() => {
    const closeMenu = () => setshowDropdown(false);
    if (showDropdown) {
      window.addEventListener("click", closeMenu);
    }
    return () => window.removeEventListener("click", closeMenu);
  }, [showDropdown]);

  const handleOpenChat = (user) => {
    const userId = getUserId(user);
    navigate(`/chatroom/${userId}`, {
      state: { selectedUser: user },
    });
  };

  return (
    <div className={style.userListPage}>
      {/* Ambient Glows */}
      <div className={style.ambientGlowTop}></div>
      <div className={style.ambientGlowMid}></div>
      <div className={style.ambientGlowBottom}></div>

      <div className={style.mainContent}>
        {/* App Header */}
        <header className={style.header}>
          <BrandLogo size="md" withLink={false} />

          <div className={style.ownerActivity}>
            <div
              className={style.profileAvatarWrapper}
              onClick={() => navigate("/profile")}
              title="Update Profile"
            >
              <div className={style.avatarInner}>
                <img src={currentUser?.avatar || dpImg} alt={currentUser?.name || "Profile"} />
              </div>
              <span className={style.ownerStatusDot}></span>
            </div>

            <button
              type="button"
              className={style.menuBtn}
              onClick={toggleDropdown}
              aria-label="Menu"
            >
              <EllipsisVertical size={18} />
            </button>

            {showDropdown && <Dropdown onLogout={handleLogout} />}
          </div>
        </header>

        {/* 2026 Liquid Glass Search & Command Bar */}
        <div className={style.searchContainer}>
          <div className={style.searchBar}>
            <Search className={style.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search chats, contacts, or messages..."
              value={searchTerm}
              onChange={(e) => setsearchTerm(e.target.value)}
            />
            {searchTerm ? (
              <button
                type="button"
                className={style.clearBtn}
                onClick={() => setsearchTerm("")}
                aria-label="Clear Search"
              >
                <X size={16} />
              </button>
            ) : (
              <span
                className={style.kbdShortcut}
                onClick={() => searchInputRef.current?.focus()}
                title="Press Ctrl+K or Cmd+K to search"
              >
                ⌘K
              </span>
            )}
          </div>
        </div>

        {/* Active Pulse / Spatial Presence Rail */}
        <section className={style.activePulseSection}>
          <div className={style.pulseHeader}>
            <span className={style.pulseTitle}>Active Pulse</span>
            <span className={style.pulseCount}>
              {onlineParticipants.length} Online
            </span>
          </div>

          <div className={style.pulseRail}>
            {/* Add Note / Your Pulse item */}
            <div
              className={`${style.pulseItem} ${style.yourPulse}`}
              onClick={() => navigate("/profile")}
            >
              <div className={style.addPulseIcon}>+</div>
              <span className={style.pulseName}>Your Pulse</span>
            </div>

            {/* Online Participants */}
            {onlineParticipants.map((user) => {
              const userId = getUserId(user);
              return (
                <div
                  key={userId}
                  className={style.pulseItem}
                  onClick={() => handleOpenChat(user)}
                  title={`Chat with ${user.name}`}
                >
                  <div className={style.pulseAvatarWrapper}>
                    <div className={style.pulseAvatar}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} />
                      ) : (
                        <span className={style.pulseInitial}>
                          {user.name?.charAt(0).toUpperCase() || "X"}
                        </span>
                      )}
                    </div>
                    <span className={style.liveBadge}>LIVE</span>
                  </div>
                  <span className={style.pulseName}>{user.name}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Filter Tabs */}
        <div className={style.filterTabs} role="tablist">
          <button
            type="button"
            className={`${style.filterPill} ${
              activeFilter === "all" ? style.activeFilter : ""
            }`}
            onClick={() => setActiveFilter("all")}
          >
            All Chats
          </button>

          <button
            type="button"
            className={`${style.filterPill} ${
              activeFilter === "unread" ? style.activeFilter : ""
            }`}
            onClick={() => setActiveFilter("unread")}
          >
            Unread
            {totalUnreadCount > 0 && (
              <span className={style.badgeCount}>{totalUnreadCount}</span>
            )}
          </button>

          <button
            type="button"
            className={`${style.filterPill} ${
              activeFilter === "online" ? style.activeFilter : ""
            }`}
            onClick={() => setActiveFilter("online")}
          >
            Online
            {onlineParticipants.length > 0 && (
              <span className={style.badgeCount}>
                {onlineParticipants.length}
              </span>
            )}
          </button>
        </div>

        {/* Participant Chat Cards Stack */}
        <main className={style.participantList}>
          {loading ? (
            <div className={style.loaderContainer}>
              <Loader2 className={style.animateSpin} size={28} />
              <span>Loading conversations...</span>
            </div>
          ) : error ? (
            <div className={style.emptyState}>{error}</div>
          ) : filteredUsers.length === 0 ? (
            <div className={style.emptyState}>
              <MessageSquare className={style.emptyIcon} size={32} />
              <p>
                {searchTerm
                  ? `No chats found matching "${searchTerm}"`
                  : activeFilter === "unread"
                    ? "No unread messages right now 🎉"
                    : activeFilter === "online"
                      ? "No other contacts are online right now."
                      : "No other users found."}
              </p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const userId = getUserId(user);
              const isOnline = isUserOnline(userId);
              const hasUnread = (user.unreadCount || 0) > 0;

              return (
                <div
                  key={userId}
                  className={`${style.chatCard} ${
                    hasUnread ? style.chatCardActive : ""
                  }`}
                  onClick={() => handleOpenChat(user)}
                >
                  <div className={style.cardLeft}>
                    <div className={style.avatarContainer}>
                      <div className={style.avatarBox}>
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} />
                        ) : (
                          <span className={style.avatarFallback}>
                            {user.name?.slice(0, 2).toUpperCase() || "X"}
                          </span>
                        )}
                      </div>
                      {isOnline && <span className={style.onlineIndicator}></span>}
                    </div>

                    <div className={style.metaInfo}>
                      <div className={style.nameRow}>
                        <h3 className={style.participantName}>{user.name}</h3>
                        {isOnline && (
                          <span className={style.tagPill}>HD Voice</span>
                        )}
                      </div>

                      <p
                        className={`${style.messagePreview} ${
                          hasUnread ? style.unreadPreview : ""
                        }`}
                      >
                        {hasUnread ? (
                          <span className={style.pulseDot}></span>
                        ) : (
                          <Sparkles className={style.sparkleIcon} />
                        )}
                        <span className={style.previewText}>
                          {user.lastMessage || "Tap to start a conversation"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className={style.cardRight}>
                    <span
                      className={`${style.dateStamp} ${
                        hasUnread ? style.activeDate : ""
                      }`}
                    >
                      {formatTime(user.lastMessageAt)}
                    </span>

                    <div className={style.rightActionArea}>
                      {hasUnread && (
                        <span className={style.unreadBadge}>
                          {user.unreadCount}
                        </span>
                      )}

                      <button
                        type="button"
                        className={style.quickCallBtn}
                        title={`Call ${user.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(user);
                        }}
                      >
                        <Video size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
};

export default UserList;
