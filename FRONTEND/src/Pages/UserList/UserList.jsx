import style from "./UserList.module.scss";
import AppIcon from '../../assets/AppIcon.png';
import dpImg from '../../assets/dp_demo_img/doctor.jpg';
import { EllipsisVertical, Search } from 'lucide-react';
const UserList = () => {
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
        <Search className={style.icon}/>
        <input type="text" placeholder="Search or start new chat" />
      </div>
      <div className={style.participantList}>
        <div className={style.participantOverview}>
          <div className={style.profilePic}>
            <img src={dpImg} alt="" />
            <div className={style.statusIndicator}></div>
          </div>
          <div className={style.right}>
            <div className={style.upper}>
              <p className={style.participantName}>User Name</p>
            <p className={style.DateStamp}>21/12/25</p>
            </div>
            <div className={style.down}>
              <p className={style.lastMessage}>Last message preview goes here...</p>
            <div className={style.unreadCount}>31</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserList;
