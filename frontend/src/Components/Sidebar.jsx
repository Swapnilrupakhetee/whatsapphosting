import React, { useState } from "react";
import { Sidebar, Menu, MenuItem } from "react-pro-sidebar";
import { FaBars } from "react-icons/fa";
import { NotificationsActive, NewReleases } from "@mui/icons-material";
import { Link, useLocation } from "react-router-dom";
import { FaUserFriends } from "react-icons/fa";
import "../Styles/Sidebar.css";

const SidebarAdmin = () => {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation(); // To track the current path

  const handleToggle = () => {
    setCollapsed(!collapsed);
  };

  const isActive = (path) => location.pathname === path;

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
            <Link to="/payment-reminder" className="links">
              <MenuItem
                className={`menu-item ${isActive("/payment-reminder") ? "active" : ""}`}
              >
                <div className="sidebar-items">
                  <NotificationsActive
                    className="sidebar-icon"
                    style={{
                      color: isActive("/payment-reminder") ? "#4caf50" : "inherit",
                    }}
                  />
                  <span className="menu-text">
                    {!collapsed && "Payment Reminder"}
                  </span>
                </div>
              </MenuItem>
            </Link>
            <Link to="/new-product" className="links">
              <MenuItem
                className={`menu-item ${isActive("/new-product") ? "active" : ""}`}
              >
                <div className="sidebar-items">
                  <NewReleases
                    className="sidebar-icon"
                    style={{
                      color: isActive("/new-product") ? "#4caf50" : "inherit",
                    }}
                  />
                  <span className="menu-text">
                    {!collapsed && "New Products"}
                  </span>
                </div>
              </MenuItem>
            </Link>
            <Link to="/member" className="links">
              <MenuItem
                className={`menu-item ${isActive("/member") ? "active" : ""}`}
              >
                <div className="sidebar-items">
                <FaUserFriends
                    className="sidebar-icon"
                    style={{
                      color: isActive("/member") ? "#4caf50" : "inherit",
                    }}
                  />
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
