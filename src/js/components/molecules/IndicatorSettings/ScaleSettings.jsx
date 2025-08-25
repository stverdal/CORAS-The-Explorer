import React, { useState } from 'react';
import './indicator_settings.css';

const ScaleSettings = ({ settings, onChange }) => {
  const [min, setMin] = useState(settings.min || 1);
  const [max, setMax] = useState(settings.max || 10);
  const [floatMin, setFloatMin] = useState(settings.floatMin || 0.0);
  const [floatMax, setFloatMax] = useState(settings.floatMax || 1.0);

  const containerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  };

  const labelStyle = {
    flex: '0 0 40%',
    textAlign: 'left'
  };

  const inputStyle = {
    flex: '0 0 15%', // narrowed by lowering the flex basis from 55% to 35%
    textAlign: 'right'
  };

  const headerStyle = {
    marginBottom: '20px'
  };

  const update = () => {
    onChange({ min, max, floatMin, floatMax });
  };

  return (
    <div className="scale-settings">
      <div className="scale-settings-header" style={headerStyle}>
        <h3>Scale Settings</h3>
        <p>
          The scale represents a translation of integers to a float range. The scale is linear.
        </p>
        <ul>
          <li>
            <strong>Scale Min</strong>: The minimum value of the scale range.
          </li>
          <li>
            <strong>Scale Max</strong>: The maximum value of the scale range.
          </li>
          <li>
            <strong>Float Min</strong>: The minimum float value which corresponds to the scale minimum.
          </li>
          <li>
            <strong>Float Max</strong>: The maximum float value which corresponds to the scale maximum.
          </li>
        </ul>
      </div>
      <div style={containerStyle}>
        <label style={labelStyle}>Scale Min</label>
        <input
          style={inputStyle}
          type="number"
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
        />
      </div>
      <div style={containerStyle}>
        <label style={labelStyle}>Scale Max</label>
        <input
          style={inputStyle}
          type="number"
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
        />
      </div>
      <span>Translates to</span>
      <br />
      <div style={containerStyle}>
        <label style={labelStyle}>Float Min</label>
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          value={floatMin}
          onChange={(e) => setFloatMin(parseFloat(e.target.value))}
        />
      </div>
      <div style={containerStyle}>
        <label style={labelStyle}>Float Max</label>
        <input
          style={inputStyle}
          type="number"
          step="0.01"
          value={floatMax}
          onChange={(e) => setFloatMax(parseFloat(e.target.value))}
        />
      </div>
      <button onClick={update}>Apply</button>
    </div>
  );
};

export default ScaleSettings;