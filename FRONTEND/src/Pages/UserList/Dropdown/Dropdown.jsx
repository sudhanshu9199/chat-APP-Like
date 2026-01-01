import style from './Dropdown.module.scss';
import { LogOut } from 'lucide-react'

const Dropdown = ({ onLogout }) => {
  return (
    <div className={style.dropDownMenu}>
        <div className={style.menuItem} onClick={onLogout}>
            <LogOut size={18}/>
            <span>Logout</span>
        </div>
    </div>
  )
}

export default Dropdown;