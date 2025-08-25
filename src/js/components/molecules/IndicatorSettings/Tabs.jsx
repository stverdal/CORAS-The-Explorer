import React from 'react';
import './indicator_settings.css';

const Tabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className="tabs">
      {tabs.map(tab => (
        <button
          key={tab}
          className={tab === activeTab ? 'tab active' : 'tab'}
          onClick={() => onTabChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default Tabs;