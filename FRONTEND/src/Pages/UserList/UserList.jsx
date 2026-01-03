import style from "./UserList.module.scss";
import dpImg from "../../assets/DefaultUserPic.png";
import { EllipsisVertical, Loader2, Search } from "lucide-react";
import api from "../../services/api";
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import Dropdown from "./Dropdown/Dropdown";
import { logoutUser } from "../../Redux/slices/authSlice";
import { useSocketContext } from "../../context/SocketContext";

const UserList = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  
  const [users, setusers] = useState([]);
  const [loading, setloading] = useState(true);
  const [error, seterror] = useState(null);
  const [searchTerm, setsearchTerm] = useState("");
  const [showDropdown, setshowDropdown] = useState(false);
  
  const { socket } = useSocketContext();
  const { onlineUsers } = useSelector((state) => state.socket);
  
  const { user: currentUser } = useSelector(state => state.auth);
  
  // OPTIMIZATION: Create a Set for O(1) lookup
  const onlineUserSet = useMemo(() => new Set(onlineUsers), [onlineUsers]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setloading(true);
        const response = await api.get("/users/participants"); //
        setusers(response.data.participants);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        seterror("Failed to load chats.");
      } finally {
        setloading(false);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    socket?.on("newMessage", (newMessage) => {
      setusers((prevUsers) => {
        return prevUsers.map((user) => {
          const userId = user._id || user.id;

          // If the message is FROM this user, update text AND increment count
          if (userId === newMessage.sender) {
            return {
              ...user,
              lastMessage: newMessage.text,
              lastMessageAt: newMessage.createdAt,
              unreadCount: (user.unreadCount || 0) + 1, // INCREMENT HERE
            };
          }
          
          // If I sent the message, just update the text (no count change)
          if (userId === newMessage.receiver) {
             return {
              ...user,
              lastMessage: newMessage.text,
              lastMessageAt: newMessage.createdAt,
            };
          }
          return user;
        });
      });
    });
    return () => {
      socket?.off("newMessage");
    };
  }, [socket]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    return users.filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [users, searchTerm]);

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ROBUST CHECK: Helper to get ID regardless of database format
  const getUserId = (user) => user._id || user.id;

  const isUserOnline = (userId) => {
    // Convert to string to ensure type matching (e.g. ObjectId vs String)
    return onlineUserSet.has(String(userId));
  };

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setshowDropdown(!showDropdown);
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
  return (
    <div className={style.userListPage}>
      <div className={style.header}>
        <div className={style.logo}>
          <p>ConnectX</p>
        </div>
        <div className={style.ownerActivity}>
          <div className={style.profilePic} onClick={() => navigate('/profile')} title="update Profile">
            <img src={currentUser?.avatar || dpImg} alt="Owner" />
          </div>
          <EllipsisVertical onClick={toggleDropdown} />
          {showDropdown && <Dropdown onLogout={handleLogout} />}
        </div>
      </div>
      <div className={style.searchSession}>
        <Search className={style.icon} />
        <input
          type="text"
          placeholder="Search or start new chat"
          value={searchTerm}
          onChange={(e) => setsearchTerm(e.target.value)}
        />
      </div>
      <div className={style.participantList}>
        {loading ? (
          <div className={style.loaderContainer}>
            <Loader2 className={style.animateSpin} />
          </div>
        ) : error ? (
          <div style={{ textAlign: "center", color: "red", marginTop: "20px" }}>
            {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div
            style={{ textAlign: "center", color: "#888", marginTop: "20px" }}
          >
            {searchTerm ? "No users found" : "No other users found."}
          </div>
        ) : (
          filteredUsers.map((user) => {
            const userId = getUserId(user);
            return (
              <div
                key={userId}
                className={style.participantOverview}
                onClick={() =>
                  navigate(`/chatroom/${userId}`, {
                    state: { selectedUser: user },
                  })
                }
                style={{ cursor: "pointer" }}
              >
                <div className={style.profilePic}>
                  <img src={user.avatar || dpImg} alt={user.name} />
                  {isUserOnline(userId) && (
                    <div className={style.statusIndicator}></div>
                  )}
                </div>
                <div className={style.right}>
                  <div className={style.upper}>
                    <p className={style.participantName}>{user.name}</p>
                    <p className={style.DateStamp}>
                      {formatTime(user.lastMessageAt)}
                    </p>
                  </div>
                  <div className={style.down}>
                    <p className={style.lastMessage}>
                      {user.lastMessage?.slice(0, 30) || "Start a conversation"}
                      {user.lastMessage?.length > 30 ? "..." : ""}
                    </p>
                    {user.unreadCount > 0 && (<div className={style.unreadCount}>{user.unreadCount}</div>)}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default UserList;
