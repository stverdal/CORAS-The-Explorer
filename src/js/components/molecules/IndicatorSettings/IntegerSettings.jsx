import React, { useState } from 'react';
import './indicator_settings.css';

const IntegerSettings = ({ settings, onChange }) => {
  const [direction, setDirection] = useState(settings.direction || 'lowIsGood');
  const [method, setMethod] = useState(settings.method || 'threshold');
  const [thresholds, setThresholds] = useState(settings.thresholds || [
    { min: 0, max: 5, value: 0.2 },
    { min: 6, max: 10, value: 0.5 },
    { min: 11, max: Infinity, value: 1.0 }
  ]);
  const [linearRange, setLinearRange] = useState(settings.linearRange || { min: 0, max: 100, floatMin: 0.0, floatMax: 2.0 });
  const [customFormula, setCustomFormula] = useState(settings.customFormula || '0.1 * count + 0.5');

  const updateSettings = () => {
    onChange({
      direction,
      method,
      thresholds,
      linearRange,
      customFormula
    });
  };

  const sectionStyle = { marginBottom: '1rem' };
  const inputStyle = { marginRight: '0.5rem' };

  return (
    <div className="integer-settings">
      <div style={sectionStyle}>
        <label>Interpretation:</label>
        <select value={direction} onChange={e => setDirection(e.target.value)}>
          <option value="lowIsGood">Low is good</option>
          <option value="highIsGood">High is good</option>
        </select>
      </div>

      <div style={sectionStyle}>
        <label>Mapping Method:</label>
        <select value={method} onChange={e => setMethod(e.target.value)}>
          <option value="threshold">Threshold</option>
          <option value="linear">Linear</option>
          <option value="logarithmic">Logarithmic</option>
          <option value="custom">Custom Formula</option>
        </select>
      </div>

      {method === 'threshold' && (
        <div style={sectionStyle}>
          <h4>Thresholds</h4>
          {thresholds.map((t, i) => (
            <div key={i} style={sectionStyle}>
              <input
                style={inputStyle}
                type="number"
                value={t.min}
                onChange={e => {
                  const newT = [...thresholds];
                  newT[i].min = Number(e.target.value);
                  setThresholds(newT);
                }}
              />
              <span> to </span>
              <input
                style={inputStyle}
                type="number"
                value={t.max}
                onChange={e => {
                  const newT = [...thresholds];
                  newT[i].max = Number(e.target.value);
                  setThresholds(newT);
                }}
              />
              <span> = </span>
              <input
                style={inputStyle}
                type="number"
                step="0.01"
                value={t.value}
                onChange={e => {
                  const newT = [...thresholds];
                  newT[i].value = parseFloat(e.target.value);
                  setThresholds(newT);
                }}
              />
            </div>
          ))}
        </div>
      )}

      {method === 'linear' && (
        <div style={sectionStyle}>
          <div style={sectionStyle}>
            <label>Min Count</label>
            <input
              style={inputStyle}
              type="number"
              value={linearRange.min}
              onChange={e => setLinearRange({ ...linearRange, min: Number(e.target.value) })}
            />
          </div>
          <div style={sectionStyle}>
            <label>Max Count</label>
            <input
              style={inputStyle}
              type="number"
              value={linearRange.max}
              onChange={e => setLinearRange({ ...linearRange, max: Number(e.target.value) })}
            />
          </div>
          <div style={sectionStyle}>
            <label>Float Min</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={linearRange.floatMin}
              onChange={e => setLinearRange({ ...linearRange, floatMin: parseFloat(e.target.value) })}
            />
          </div>
          <div style={sectionStyle}>
            <label>Float Max</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              value={linearRange.floatMax}
              onChange={e => setLinearRange({ ...linearRange, floatMax: parseFloat(e.target.value) })}
            />
          </div>
        </div>
      )}

      {method === 'custom' && (
        <div style={sectionStyle}>
          <label>Custom Formula (use `count` as variable)</label>
          <input type="text" value={customFormula} onChange={e => setCustomFormula(e.target.value)} />
        </div>
      )}

      <button onClick={updateSettings}>Apply</button>
    </div>
  );
};

export default IntegerSettings;