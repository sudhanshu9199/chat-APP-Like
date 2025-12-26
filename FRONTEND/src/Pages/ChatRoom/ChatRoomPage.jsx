import style from "./ChatRoomPage.module.scss";

const ChatRoomPage = () => {
  return (
    <div className={style.chatRoomPage}>
      <div className="header">
        <div className="back"></div>
        <div className="pic"></div>
        <div className="texts">
          <p className="contactName">User Name</p>
          <p className="status">Online</p>
        </div>
        <div className="videoCall"></div>
        <div className="voiceCall"></div>
        <div className="info"></div>
      </div>
      <div className="fullMessage">
        <div className="firstOne">
            <p className="message">Hello there!</p>
        </div>
        <div className="secondOne">
            <p className="message">Hello there!</p>
        </div>
      </div>
      <form >
        <input type="text" placeholder="Type a message" />
        <button type="submit" className="send">send</button>
      </form>
    </div>
  );
};

export default ChatRoomPage;
