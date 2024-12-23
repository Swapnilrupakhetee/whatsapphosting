import React, { useState } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FaEye, FaUserAlt, FaBars } from "react-icons/fa";
import { PiWallFill } from "react-icons/pi";
import { NotificationsActive, NewReleases } from "@mui/icons-material";
import { Link } from "react-router-dom";

import "../Styles/Sidebar.css";

const SidebarAdmin = () => {
  const [collapsed, setCollapsed] = useState(true);

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  return (
    <div className="sidebar-wrapper">
      <div className={`sidebar-container ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} className="sidebar">
          <Menu className="sidebar-menu">
            <div className="sidebar-header">
              <button className="toggle-btn" onClick={handleToggle}>
                <FaBars />
              </button>
            </div>
            <Link to={"/payment-reminder"} className="links">
              <MenuItem className="menu-item">
                <div className="sidebar-items">
                  <NotificationsActive className="sidebar-icon" />
                  <span className="menu-text">
                    {!collapsed && "Payment Reminder"}
                  </span>
                </div>
              </MenuItem>
            </Link>
            <Link to={"new-product"} className="links">
              <MenuItem className="menu-item">
                <div className="sidebar-items">
                  <NewReleases className="sidebar-icon" />
                  <span className="menu-text">
                    {!collapsed && "New Products"}
                  </span>
                </div>
              </MenuItem>
            </Link>
          </Menu>
        </Sidebar>
      </div>
      {!collapsed && <div className="overlay" onClick={handleToggle}></div>}
    </div>
  );
};

export default SidebarAdmin;
