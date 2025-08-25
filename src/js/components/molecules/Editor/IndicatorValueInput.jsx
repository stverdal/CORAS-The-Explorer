import React, { useState, useEffect } from 'react';

const IndicatorValueInput = ({ inputType, value, valueLabel, onChange }) => {
  const [scaleMin, setScaleMin] = useState(1);
  const [scaleMax, setScaleMax] = useState(10);

  useEffect(() => {
    // Ensure value stays within bounds when scale changes
    if (inputType === 'scale') {
      if (value < scaleMin) onChange(scaleMin);
      if (value > scaleMax) onChange(scaleMax);
    }
  }, [scaleMin, scaleMax, value, inputType, onChange]);

  console.log("Current value:", value);

  return (
    <div>
      <label className="element-editor-section__label element-editor-section__label--full">
        Indicator Value
      </label>

      {inputType === 'boolean' && (
        <select value={valueLabel} onChange={e => onChange(e.target.value)}>
          <option value="true">True</option>
          <option value="false">False</option>
        </select>
      )}

      {inputType === 'integer' && (
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="element-editor-section__input element-editor-section__input--100"
        />
      )}

      {inputType === 'scale' && (
        <div>
          <div className="element-editor-section__partitioner">
            <label className="element-editor-section__label">Min</label>
            <input
              type="number"
              value={scaleMin}
              onChange={e => setScaleMin(Number(e.target.value))}
              className="element-editor-section__input element-editor-section__input--25"
            />
            <label className="element-editor-section__label">Max</label>
            <input
              type="number"
              value={scaleMax}
              onChange={e => setScaleMax(Number(e.target.value))}
              className="element-editor-section__input element-editor-section__input--25"
            />
          </div>

          <input
            type="range"
            min={scaleMin}
            max={scaleMax}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="element-editor-section__input element-editor-section__input--100"
          />

          <div className="element-editor-section__label">
            Selected Value: <strong>{value}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndicatorValueInput;
