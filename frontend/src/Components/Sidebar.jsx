import React, { useState } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FaEye, FaUserAlt, FaBars } from "react-icons/fa";
import { PiWallFill } from "react-icons/pi";
import { NotificationsActive, AttachMoney,NewReleases } from '@mui/icons-material';
import {Link} from "react-router-dom"

import "../Styles/Sidebar.css";

const SidebarAdmin = () => {
  const [collapsed, setCollapsed] = useState(false);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div id="sidebar-container">
      <Sidebar collapsed={collapsed} id="sidebar-container">
        <Menu className="sidebar-menu">
          <div className="sidebar-header">
            <button className="toggle-btn" onClick={handleToggle}>
              <FaBars />
            </button>
           
          </div>
          
          <MenuItem className="menu-item">
          <Link to={'/payment-reminder'}>
            <div className="sidebar-items">
            <NotificationsActive className="sidebar-icon" />
              {!collapsed && "Payment Reminder"}
            </div>
            </Link>
          </MenuItem>
          <MenuItem className="menu-item">
          <Link to={'new-product'}>
            <div className="sidebar-items">
            <NewReleases className="sidebar-icon" />
              {!collapsed && "New Products"}
            </div>
            </Link>
          </MenuItem>
          
        </Menu>
      </Sidebar>
    </div>
  );
};

export default SidebarAdmin;
