import style from "./ChatRoomPage.module.scss";
import { ArrowLeft, Video, Phone, Info, Send, Image } from "lucide-react";
import userImg from "../../assets/dp_demo_img/doctor.jpg";

const ChatRoomPage = () => {
  return (
    <div className={style.chatRoomPage}>
      <div className={style.header}>
        <ArrowLeft />
        <div className={style.participantDp}>
          <img src={userImg} alt="userDP" />
        </div>
        <div className={style.texts}>
          <p className={style.participantName}>User Name</p>
          <p className={style.status}>Online</p>
        </div>
        <div className={style.userAction}>
          <Video className={style.icon} />
          <Phone className={style.icon} />
          <Info className={style.icon} />
        </div>
      </div>
      <div className={style.fullMessage}>
        <div className={style.participantMsg}>
          <p className={style.message}>Hello there!</p>
          <div className={style.timeline}>11:49 PM</div>
        </div>
        <div className={style.yourMsg}>
          <p className={style.message}>Hello there!</p>
          <div className={style.timeline}>2:18 PM</div>
        </div>
      </div>
      <form>
        <div className={style.inputBox}>
          <Image className={style.icon} />
          <input type="text" placeholder="Type a message" />
        </div>
        <button type="submit" className="send">
          <Send className={style.icon} />
        </button>
      </form>
    </div>
  );
};

export default ChatRoomPage;
