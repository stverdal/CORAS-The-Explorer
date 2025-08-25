import React, { useState } from 'react';
import Modal from './Modal';
import Tabs from './Tabs';
import BooleanSettings from './BooleanSettings';

import './indicator_settings.css';

import IntegerSettings from './IntegerSettings';
import ScaleSettings from './ScaleSettings';

const IndicatorSettingsModal = ({ isOpen, onClose, settings, onSave }) => {
  const [activeTab, setActiveTab] = useState('Boolean');
  const [localSettings, setLocalSettings] = useState(settings);

  const updateTabSettings = (tab, newSettings) => {
    setLocalSettings(prev => ({ ...prev, [tab.toLowerCase()]: newSettings }));
  };

  const saveSettings = () => {
    onSave(localSettings);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="settings-modal">
        <Tabs activeTab={activeTab} onTabChange={setActiveTab} tabs={['Boolean', 'Integer', 'Scale']} />

        {activeTab === 'Boolean' && (
          <BooleanSettings settings={localSettings.boolean || {}} onChange={s => updateTabSettings('Boolean', s)} />
        )}
        {activeTab === 'Integer' && (
          <IntegerSettings settings={localSettings.integer || {}} onChange={s => updateTabSettings('Integer', s)} />
        )}
        {activeTab === 'Scale' && (
          <ScaleSettings settings={localSettings.scale || {}} onChange={s => updateTabSettings('Scale', s)} />
        )}

        <div className="settings-modal__footer">
          <button className="element-editor-section__button element-editor-section__button--cta" onClick={saveSettings}>Save</button>
          <button className="element-editor-section__button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
};

export default IndicatorSettingsModal;