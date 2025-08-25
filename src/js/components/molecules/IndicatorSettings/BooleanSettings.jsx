import React, { useState } from 'react';

import './indicator_settings.css'; // Assuming you have a CSS file for styling

const BooleanSettings = ({ settings, onChange }) => {
  console.log("Setting in booleanSettings",settings)
  const [trueValue, setTrueValue] = useState(settings.trueValue || 1.5);
  const [falseValue, setFalseValue] = useState(settings.falseValue || 0.5);

  const update = () => {
    onChange({ trueValue, falseValue });
  };

  return (
    <div className="boolean-settings">
      <h3>Boolean Settings Configuration</h3>
      <p>Configure the mapping of boolean values to numerical values below.</p>
      <label>True maps to:</label>
      <input
        type="number"
        step="0.01"
        value={trueValue}
        onChange={e => setTrueValue(parseFloat(e.target.value))}
      />
      <br />
      <label>False maps to:</label>
      <input
        type="number"
        step="0.01"
        value={falseValue}
        onChange={e => setFalseValue(parseFloat(e.target.value))}
      />
      <button onClick={update}>Apply</button>
    </div>
  );
};

export default BooleanSettings;