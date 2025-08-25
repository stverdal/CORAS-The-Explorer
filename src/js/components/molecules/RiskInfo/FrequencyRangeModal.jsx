// FrequencyRangeModal.jsx
import React, { useState } from 'react';
import { useSelector } from 'react-redux';


import './frequencyRangeModal.css'; // Assuming you have some basic styles for the modal

const timeUnits = ['day', 'week', 'month', 'year'];

export default function FrequencyRangeModal({ isOpen, onClose, onSubmit }) {
  const [mode, setMode] = useState('float');
  const [floatRange, setFloatRange] = useState({ min: '', max: '', minUnit: 'year', maxUnit: 'year' });
  const [dropdownRange, setDropdownRange] = useState({
    lower: { occurrences: 1, timeInstances: 1, timeFrame: 'year' },
    upper: { occurrences: 1, timeInstances: 1, timeFrame: 'year' }
  });

  const riskState = useSelector((state) => state.editor.risk);


  function normalizeFrequency(value, unit) {
    console.log("Normalizing frequency:", value, unit);
    console.log()
    var timeUnitToYearFactor = riskState.timeUnitToYearFactor || 1; // Default to 1 if not set
    console.log("Time unit to year factor:", timeUnitToYearFactor);
    return value * timeUnitToYearFactor[unit];
  }


  const normalizeRange = () => {
    var normalizedRange = {}
    if (mode === 'float') {
      let minInYears = normalizeFrequency(floatRange.min, floatRange.minUnit);
      let maxInYears = normalizeFrequency(floatRange.max, floatRange.maxUnit);

      normalizedRange = {
        min: minInYears,
        max: maxInYears
      };
      
      // Ensure min is less than or equal to max
      if (normalizedRange.min > normalizedRange.max) {
        normalizedRange.max = normalizedRange.min;
      }
    } else {
      let occurrencesLower = dropdownRange.lower.occurrences / dropdownRange.lower.timeInstances;
      let occurrencesUpper = dropdownRange.upper.occurrences / dropdownRange.upper.timeInstances;

      normalizedRange = {
        min: normalizeFrequency(occurrencesLower, dropdownRange.lower.timeFrame),
        max: normalizeFrequency(occurrencesUpper, dropdownRange.upper.timeFrame)  
      };
    }
    return normalizedRange;
  }

  const createRangeString = () => {
      let rangeString = '';
    if (mode === 'float') {
      rangeString = `${floatRange.min}-${floatRange.max} (${floatRange.minUnit}–${floatRange.maxUnit})`;
    } else {
      rangeString = `Lower: ${dropdownRange.lower.occurrences} times per ${dropdownRange.lower.timeInstances} ${dropdownRange.lower.timeFrame}(s) - Upper: ${dropdownRange.upper.occurrences} times per ${dropdownRange.upper.timeInstances} ${dropdownRange.upper.timeFrame}(s)`;
    }
    return rangeString;
  };

  const handleSubmit = () => {
    const rangeString = createRangeString();
    const normalizedRange = normalizeRange();
    onSubmit(rangeString, normalizedRange);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="freq_modal-overlay" onClick={onClose}>
      <div className='freq_modal' onClick={(e) => e.stopPropagation()}>
        <h3>Set Frequency Range</h3>

        <label>
          <input type='radio' name='mode' value='float' checked={mode === 'float'} onChange={() => setMode('float')} />
          Float Range Input
        </label>
        <label>
          <input type='radio' name='mode' value='dropdown' checked={mode === 'dropdown'} onChange={() => setMode('dropdown')} />
          Dropdown Input
        </label>

        {mode === 'float' ? (
          <div>
            <input
              type='number'
              placeholder='Min'
              value={floatRange.min}
              onChange={(e) => setFloatRange({ ...floatRange, min: e.target.value })}
            />
            <select
              value={floatRange.minUnit}
              onChange={(e) => setFloatRange({ ...floatRange, minUnit: e.target.value })}
            >
              {timeUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
            </select>
            <br />
            <input
              type='number'
              placeholder='Max'
              value={floatRange.max}
              onChange={(e) => setFloatRange({ ...floatRange, max: e.target.value })}
            />
            <select
              value={floatRange.maxUnit}
              onChange={(e) => setFloatRange({ ...floatRange, maxUnit: e.target.value })}
            >
              {timeUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </div>
        ) : (
          <div>
            <fieldset>
              <legend>Lower Limit</legend>
              <label>
                Occurrences:
                <select
                  value={dropdownRange.lower.occurrences}
                  onChange={(e) =>
                    setDropdownRange({
                      ...dropdownRange,
                      lower: { ...dropdownRange.lower, occurrences: e.target.value },
                    })
                  }
                >
                  {[...Array(11).keys()].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label>
                per
                <select
                  value={dropdownRange.lower.timeInstances}
                  onChange={(e) =>
                    setDropdownRange({
                      ...dropdownRange,
                      lower: { ...dropdownRange.lower, timeInstances: e.target.value },
                    })
                  }
                >
                  {[1, 2, 5, 10].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <select
                value={dropdownRange.lower.timeFrame}
                onChange={(e) =>
                  setDropdownRange({
                    ...dropdownRange,
                    lower: { ...dropdownRange.lower, timeFrame: e.target.value },
                  })
                }
              >
                {timeUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </fieldset>

            <fieldset>
              <legend>Upper Limit</legend>
              <label>
                Occurrences:
                <select
                  value={dropdownRange.upper.occurrences}
                  onChange={(e) =>
                    setDropdownRange({
                      ...dropdownRange,
                      upper: { ...dropdownRange.upper, occurrences: e.target.value },
                    })
                  }
                >
                  {[...Array(11).keys()].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <label>
                per
                <select
                  value={dropdownRange.upper.timeInstances}
                  onChange={(e) =>
                    setDropdownRange({
                      ...dropdownRange,
                      upper: { ...dropdownRange.upper, timeInstances: e.target.value },
                    })
                  }
                >
                  {[1, 2, 5, 10].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </label>
              <select
                value={dropdownRange.upper.timeFrame}
                onChange={(e) =>
                  setDropdownRange({
                    ...dropdownRange,
                    upper: { ...dropdownRange.upper, timeFrame: e.target.value },
                  })
                }
              >
                {timeUnits.map(unit => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </fieldset>
          </div>
        )}

        <button onClick={handleSubmit}>Submit</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
