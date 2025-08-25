import React from 'react';
import { Link } from 'react-router-dom';

import "./header.css";

const Header = ({ location }) =>
    <header className="main-header">
        <div className="main-header-wrapper">
            <div className="header-logo"><Link to='/'>CORAS</Link></div>
            <nav className="main-menu-container">
                <ul className="main-menu">
                    <li className={"main-menu main-menu__item" + (window.location.pathname === '/about' ? " main-menu__item--selected" : "")}><Link to={"/about"}>About</Link></li>
                    <li className={"main-menu main-menu__item" + (window.location.pathname === '/try-it' ? " main-menu__item--selected" : "")}><Link to={"/try-it"}>Editor</Link></li>
                    <li className={"main-menu main-menu__item" + (window.location.pathname === '/riskinfo' ? " main-menu__item--selected" : "")}><Link to={"/riskinfo"}>Risk Info</Link></li>
                </ul>
            </nav>
        </div>
    </header>;

export default Header;
