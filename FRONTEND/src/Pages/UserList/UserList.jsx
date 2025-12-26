import style from "./UserList.module.scss";

const UserList = () => {
  return (
    <div>
      <div className="header"></div>
      <div className="searchSession"></div>
      <div className="contactList">
        <div className="contactOverview">
          <div className="profilePic"></div>
          <div className="texts">
            <p className="contactName">User Name</p>
            <p className="status">Online</p>
          </div>
          <div className="activity">
            <p className="timeStamp">12:45 PM</p>
            <div className="unreadCount">3</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserList;
