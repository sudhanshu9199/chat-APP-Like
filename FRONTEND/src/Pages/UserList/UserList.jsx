import style from "./UserList.module.scss";
import dpImg from "../../assets/dp_demo_img/doctor.jpg";
import { EllipsisVertical, Loader2, Search } from "lucide-react";
import api from "../../services/api";
import { useState, useEffect } from "react";
const UserList = () => {
  const [users, setusers] = useState([]);
  const [loading, setloading] = useState(true);
  const [error, seterror] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setloading(true);
        const response = await api.get("/users/participants");
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

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return (
    <div className={style.userListPage}>
      <div className={style.header}>
        <div className={style.logo}>
          {/* <img src={AppIcon} alt="App Logo" /> */}
          <p>ConnectX</p>
        </div>
        <div className={style.ownerActivity}>
          <div className={style.profilePic}>
            <img src={dpImg} alt="" />
          </div>
          <EllipsisVertical />
        </div>
      </div>
      <div className={style.searchSession}>
        <Search className={style.icon} />
        <input type="text" placeholder="Search or start new chat" />
      </div>
      <div className={style.participantList}>
        {loading ? (
          <div className={style.loaderContainer}>
            <Loader2 className={style.animateSpin} />
          </div>
        ) : error ? (
          <div style={{textAlign: 'center', color: 'red', marginTop: '20px'}}>{error}</div>
        ) : users.length === 0 ? (
          <div style={{textAlign: 'center', color: '#888', marginTop: '20px'}}>No other users found.</div>
        ) : (
          users.map((user) => (
            <div key={user._id} className={style.participantOverview}>
              <div className={style.profilePic}>
                <img src={user.avatar || dpImg} alt={user.name} />
                {user.isOnline && <div className={style.statusIndicator}></div>}
              </div>
              <div className={style.right}>
                <div className={style.upper}>
                  <p className={style.participantName}>{user.name}</p>
                  <p className={style.DateStamp}>{formatTime(user.lastMessageAt)}</p>
                </div>
                <div className={style.down}>
                  <p className={style.lastMessage}>
                    { user.lastMessage?.slice(0, 30) || 'Start a conversation'}
                    { user.lastMessage?.length > 30 ? '...' : ''}
                  </p>
                  <div className={style.unreadCount}>1</div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
