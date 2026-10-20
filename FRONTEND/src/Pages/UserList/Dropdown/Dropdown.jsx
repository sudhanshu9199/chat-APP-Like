import style from './Dropdown.module.scss';
import { LogOut, Sparkles, Cat, HardDrive } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanionPet } from '../../../components/CompanionPet/CompanionContext';

const Dropdown = ({ onLogout }) => {
  const navigate = useNavigate();
  const { isVisible, togglePetVisibility } = useCompanionPet();

  return (
    <div className={style.dropDownMenu}>
        <div className={style.menuItem} onClick={() => navigate("/profile")}>
            <HardDrive size={18} color="#0284c7" />
            <span>Chat Vault (₹0)</span>
        </div>
        <div className={style.menuItem} onClick={() => navigate("/preview")}>
            <Sparkles size={18} color="#06b6d4" />
            <span>2026 UI (Test)</span>
        </div>
        <div className={style.menuItem} onClick={togglePetVisibility}>
            <Cat size={18} color="#a855f7" />
            <span>{isVisible ? "Hide Mascot" : "Show Mascot"}</span>
        </div>
        <div className={style.menuItem} onClick={onLogout}>
            <LogOut size={18}/>
            <span>Logout</span>
        </div>
    </div>
  );
};

export default Dropdown;