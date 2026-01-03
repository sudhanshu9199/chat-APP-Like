import style from './UserInfoPopup.module.scss';
import defaultImg from '../../../assets/DefaultUserPic.png';
import { X } from 'lucide-react';

const UserInfoPopup = ({ user, onClose}) => {
    if (!user) return null;
  return (
    <div className={style.overlay} onClick={onClose}>
        <div className={style.popup} onClick={e => e.stopPropagation()}>
            <div className={style.header}>
                <h3>User Info</h3>
                <button className={style.closeBtn} onClick={onClose}>
                    <X size={20}/>
                </button>
            </div>

            <div className={style.content}>
                <div className={style.imageContainer}>
                    <img src={user.avatar || defaultImg} alt={user.name} />
                </div>

                <div className={style.details}>
                    <h2 className={style.name}>{user.name}</h2>
                    <div className={style.aboutSection}>
                        <span className={style.label}>About</span>
                        <p className={style.about}>
                            {user.about || 'Hey there! I am using ConnectX.'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
  )
}

export default UserInfoPopup