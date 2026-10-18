import style from './Dropdown.module.scss';
import { LogOut, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dropdown = ({ onLogout }) => {
  const navigate = useNavigate();

  return (
    <div className={style.dropDownMenu}>
        <div className={style.menuItem} onClick={() => navigate("/preview")}>
            <Sparkles size={18} color="#06b6d4" />
            <span>2026 UI (Test)</span>
        </div>
        <div className={style.menuItem} onClick={onLogout}>
            <LogOut size={18}/>
            <span>Logout</span>
        </div>
    </div>
  );
};

export default Dropdown;