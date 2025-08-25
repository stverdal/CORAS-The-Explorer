import React, { useState } from 'react';

import Draggable from 'react-draggable';
import './elementeditor.css';
import Modal from '../../atoms/Modal/Modal';
import ReactDOM from 'react-dom';

import IndicatorValueInput from './IndicatorValueInput';

import IndicatorSettingsModal from '../IndicatorSettings/IndicatorSettingsModal';



const ElementEditor = (props) => {

    const [position, setPosition] = useState(props.editorPosition);

    console.log("Elementeditor props -> ", props);
    const [deletePos, setDeletePos] = useState(position);

    const [minInnerSize, setMinInnerSize] = useState({ width: 90, height: 90 });

    const [size, setSize] = useState(() => {
        return props.isLink ? { width: null, height: null } : props.element.attributes.size
    });


    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [indicatorSettings, setIndicatorSettings] = useState({
        boolean: { trueValue: 1.5, falseValue: 0.5 },
        integer: {
            direction: 'lowIsGood',
            method: 'threshold',
            thresholds: [
                { min: 0, max: 5, value: 0.5 },
                { min: 6, max: 10, value: 1.0 },
                { min: 11, max: Infinity, value: 1.5 }
            ]
        },
        scale: { min: 1, max: 10, floatMin: 0.0, floatMax: 2.0 }
    });

    //used for stakeholder only
    const [innerSize, setInnerSize] = useState(() => {
        //some issues with retrieveing information from store.editor.elementEditor.data
        //gets sizeinfo from the element path instead.
        if (props.element.attributes.type === 'coras.roundRectElement') {
            var innerwidth = props.element.attributes.attrs.cornerBox.d.split(" ")[4];
            var innerheight = props.element.attributes.attrs.cornerBox.d.split(" ")[2];
            return { width: innerwidth, height: innerheight };
        } else {
            return { width: null, height: null };
        }
    });

    const [label, setLabel] = useState(() => {
        return props.isLink ?
            props.element.label(0).attrs.text.text :
            props.element.attr('text/text');
    });

    const [value, setValue] = useState(() => {
        return props.isLink ?
            props.element.label(1).attrs.text.text.replace(/[\[\]']+/g, '') :
            props.element.attr('value/text').replace(/[\[\]']+/g, '');
    });
    const [perspective, setPerspective] = useState(props.element.get('perspective'));
    const [indicatorType, setIndicatorType] = useState(props.element.get('indicatorType'));
    const [indicatorValue, setIndicatorValue] = useState(props.element.get('indicatorValue'));
    const [indicatorValueLabel, setIndicatorValueLabel] = useState(props.element.get('indicatorValueLabel'));

    console.log("Indicator Value Label: ", props.element.get('indicatorValueLabel'));

    const [inputType, setInputType] = useState("boolean");


    const [valType, setValType] = useState(() => {
        let val = "Value";
        if (props.isLink) {
            //console.log(this.props.element.attributes.valueType);
            return props.element.attributes.valueType;
        } else {
            //TODO
            switch (props.element.attributes.role) {
                case "unwanted_incident":
                case "threat_scenario":
                case "risk":
                    val = "Likelihood"
                    break;
                default:
                    break;
            }
        }
        return val;
    });

    const clean_value = (string) => {
        return string.replace(/[\[\]']+/g, '');
    }

    const handleOpenModal = (e) => {
        // Capture the mouse position relative to the viewport
        setMousePos({ x: e.clientX, y: e.clientY });
        setShowSettingsModal(true);
    };


    const onPositionChangeX = (e) => {
        props.xOnChange(e.target.value);
        //setState({ x: e.target.value });
        setPosition({ x: e.target.value, y: position.y });
    }

    const onPositionChangeY = (e) => {
        props.yOnChange(e.target.value);
        //setState({ y: e.target.value });
        setPosition({ x: position.x, y: e.target.value })
    }

    const onLabelChange = (e) => {
        props.labelOnChange(e.target.value);
        //setState({ label: e.target.value });
        setLabel(e.target.value);
    }

    const onValueChange = (e) => {
        //test
        props.valueOnChange(e.target.value);
        //setState({ value: e.target.value });
        //Wraps the displaystring in square brackets
        setValue(e.target.value);
    }

    const onPerspectiveChange = (e) => {
        props.perspectiveOnChange(parseInt(e.target.value));
        //setState({ perspective: parseInt(e.target.value) });
        setPerspective(parseInt(e.target.value));
    }

    const onIndicatorTypeChange = (e) => {
        console.log("value ", e.target.value);
        props.elementChangeIndicatorType(e.target.value); //Expects string
        setIndicatorType(e.target.value);
    }
    //TODO
    const onIndicatorValueChange = (value) => {
        console.log("value ",value);
        console.log("indicator settings", indicatorSettings);
        var trueValue = value;
        if (value === 'false') {
            trueValue = indicatorSettings.boolean.falseValue;
        } else if (value === 'true') {
            trueValue = indicatorSettings.boolean.trueValue;
        }
        props.elementChangeIndicatorValue(value, trueValue); //Expects string
        console.log("Setting indicator value to", value);
        setIndicatorValue(trueValue);
        setIndicatorValueLabel(value)
    }

    //Check for minimum width
    const onWidthChange = (e) => {
        var w = parseInt(e.target.value);

        //setState({ width: w });
        setSize({ width: w, height: size.height })

        if (!isNaN(w)) {
            props.widthChange(w);
            //console.log("Width")
        } else {
            props.widthChange(0); //smallest possible number, considering 0.
            //TODO change the bordercolor of the input box to red
        }
    }

    const onHeightChange = (e) => {
        var h = parseInt(e.target.value);

        //setState({ height: h });
        setSize({ width: size.width, height: h });

        if (!isNaN(h)) { //this check can be extended to include a minimum size for objects.
            props.heightChange(h);
            //console.log("Height", h);
            //console.log(`State`,state)
        } else {
            props.heightChange(0);
            //TODO change the bordercolor of the input box to red
        }
    }

    const onInnerHeightChange = (e) => {
        var h = parseInt(e.target.value);
        var newH = h;
        if (isNaN(h) || h < minInnerSize.height) {
            newH = minInnerSize.height;
        } else if (h > size.height - 10) {
            newH = size.height - 10; //-10 to avoid border overlap
        }
        var w = innerSize.width;
        var path = `M 0 ${newH} h ${w} v ${-newH} `;
        props.element.attr({
            cornerBox: { d: path }
        })
        console.log("Props -> ", props);
        //props.changeInnerSize({height: newH, width: props.data.innerSize.width});
        setInnerSize({ width: innerSize.width, height: h });
    }

    //consider centering stakeholder image here.
    const onInnerWidthChange = (e) => {
        var w = parseInt(e.target.value);
        var newW = w;
        if (isNaN(w) || w < minInnerSize.width) {
            newW = minInnerSize.width;
        } else if (w > size.width - 10) {
            newW = size.width - 10; //-10 to avoid border overlap
        }
        var h = innerSize.height;
        var path = `M 0 ${h} h ${newW} v ${-h} `;
        props.element.attr({
            cornerBox: { d: path }
        })
        console.log("Element -> ", props.element.attributes.attrs.cornerBox.d);
        //props.changeInnerSize({height: props.innerSize.height, width: newW});
        setInnerSize({ width: w, height: innerSize.height });
    }

    //TODO
    const onFontSizeChange = (e) => {
        var fs = parseInt(e.target.value);
        //setState({fontSize: fs});
        setFontSize(fs);
        //var fs = parseInt(e.target.value);
    }

    const reqVal = (e) => { //may store this in state instead.
        return props.element.attributes.valueType; //null is falsy, any other valuetype should be true.
    }

    const showLabel = () => {
        //console.log("relation ", props.element.attributes.relation)
        if (props.isLink) {
            if (props.element.attributes.relation === "impacts") {
                return true;
            } else {
                return false;
            }
        } else {
            return true;
        }
    }

    const deleteClicked = (e) => {

        console.log("EVENT: ", e);
        console.log("X:", e.clientX, " Y:", e.clientY);
        setDeletePos({ x: e.clientX, y: e.clientY });
        console.log("deletePos: ", deletePos)
        props.clearClicked(e);
        console.log("Delete Clicked");
        return
    }

    const saveChanges = () => {
        console.log("Save Changes");
        console.log("saving")
        props.save();
        props.setCurrGraph();
    }


    const computeRiskValue = (inputType, inputValue, settings) => {
        if (inputType === 'boolean') {
            return inputValue === 'true' ? settings.boolean.trueValue : settings.boolean.falseValue;
        }

        if (inputType === 'integer') {
            const { method, thresholds, linearRange, customFormula, direction } = settings.integer;
            const count = Number(inputValue);

            let value = 0;
            if (method === 'threshold') {
                const match = thresholds.find(t => count >= t.min && count <= t.max);
                value = match ? match.value : 0;
            } else if (method === 'linear') {
                const { min, max, floatMin, floatMax } = linearRange;
                const ratio = (count - min) / (max - min);
                value = floatMin + ratio * (floatMax - floatMin);
            } else if (method === 'logarithmic') {
                value = Math.log(count + 1) / Math.log(linearRange.max + 1);
            } else if (method === 'custom') {
                try {
                    value = eval(customFormula.replace(/count/g, count));
                } catch {
                    value = 0;
                }
            }

            return direction === 'highIsGood' ? 1 - value : value;
        }

        if (inputType === 'scale') {
            const { min, max, floatMin, floatMax } = settings.scale;
            const ratio = (inputValue - min) / (max - min);
            return floatMin + ratio * (floatMax - floatMin);
        }

        return 0;
    };


    return (
        <Draggable
            defaultPosition={position}
            cancel='textarea, input, select, button'
        >
            <form className="element-editor" >

                {showLabel() ? <div className="element-editor-section">
                    <label htmlFor="label" className="element-editor-section__label element-editor-section__label--full">Label</label>
                    <textarea
                        id="label"
                        className="element-editor-section__input element-editor-section__input--100"
                        type="text"
                        value={label}
                        onChange={onLabelChange}>
                    </textarea>
                </div> : null}
                {reqVal() ? < div className="element-editor-section">
                    <label htmlFor="label" className="element-editor-section__label element-editor-section__label--full">{valType}</label>
                    <textarea
                        id="value"
                        className="element-editor-section__input element-editor-section__input--100"
                        type="text"
                        value={value}
                        onChange={onValueChange}>
                    </textarea>
                </div> : null}
                {(!props.isLink && props.element.attributes.type !== 'coras.unboxedElement') ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Size</label>
                    <div className="element-editor-section__partitioner">
                        <input id="width" className="element-editor-section__input element-editor-section__input--75" type="number" value={size.width.toString()} onChange={onWidthChange} />
                        <label htmlFor="width" className="element-editor-section__label">Width</label>
                    </div>
                    <div className="element-editor-section__partitioner">
                        <input id="height" className="element-editor-section__input element-editor-section__input--75" type="number" value={size.height.toString()} onChange={onHeightChange} />
                        <label htmlFor="height" className="element-editor-section__label">Heigth</label>
                    </div>
                </div> : null}
                {(props.element.attributes.type === 'coras.roundRectElement') ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Inner size</label>
                    <div className="element-editor-section__partitioner">
                        <input id="width" className="element-editor-section__input element-editor-section__input--75" type="number" value={innerSize.width.toString()} onChange={onInnerWidthChange} />
                        <label htmlFor="width" className="element-editor-section__label">Width</label>
                    </div>
                    <div className="element-editor-section__partitioner">
                        <input id="height" className="element-editor-section__input element-editor-section__input--75" type="number" value={innerSize.height.toString()} onChange={onInnerHeightChange} />
                        <label htmlFor="height" className="element-editor-section__label">Heigth</label>
                    </div>
                </div> : null}
                {props.element.attributes.role === "indicator" && (

                    <div className="element-editor-section">
                        <div className="element-editor__header">
                            <button
                                className="element-editor__settings-button"
                                type="button"
                                onClick={handleOpenModal}
                            >
                                ⚙️
                            </button>
                        </div>

                        <div>
                            <label className="element-editor-section__label element-editor-section__label--full">
                                Indicator Type
                            </label>
                            <select value={indicatorType} onChange={onIndicatorTypeChange}>
                                <option value="businessConfiguration">Business Configuration</option>
                                <option value="testResult">Test Result</option>
                                <option value="networkMonitoring">Network-layer Monitoring</option>
                                <option value="applicationMonitoring">Application-layer Monitoring</option>
                            </select>
                        </div>

                        <br />

                        <div>
                            <label className="element-editor-section__label element-editor-section__label--full">
                                Input Type
                            </label>
                            <select value={inputType} onChange={e => setInputType(e.target.value)}>
                                <option value="boolean">Boolean</option>
                                <option value="integer">Integer</option>
                                <option value="scale">Scale (1–10)</option>
                            </select>
                        </div>

                        <br />

                        <IndicatorValueInput
                            inputType={inputType}
                            //value={indicatorValue}
                            //valueLabel={indicatorValueLabel}
                            value={props.element.get('indicatorValue')}
                            valueLabel={props.element.get('indicatorValueLabel')}
                            onChange={onIndicatorValueChange}
                        />
                        {showSettingsModal && ReactDOM.createPortal(
                            <div
                                style={{
                                    top: mousePos.y,
                                    left: mousePos.x
                                }}
                                className="element-editor__settings-modal">
                                <IndicatorSettingsModal
                                    style={{
                                        top: mousePos.y,
                                        left: mousePos.x
                                    }}
                                    className="element-editor__settings-modal"
                                    isOpen={showSettingsModal}
                                    onClose={() => setShowSettingsModal(false)}
                                    settings={indicatorSettings}
                                    onSave={setIndicatorSettings}
                                />
                            </div>,
                            document.body
                        )}

                    </div>
                )}

                <div className="element-editor-section">
                    <button className="element-editor-section__button element-editor-section__button--cta" type="button" onClick={saveChanges}>Save</button>
                    <button className="element-editor-section__button" type="button" onClick={props.cancel}>Cancel</button>
                    <button className="element-editor-section__button element-editor-section__button--danger" type="button" onClick={deleteClicked}>Delete</button>
                </div>
                <Modal isOpen={props.showClearModalElement} noBackground={true} position={deletePos}>
                    <div className="delete-warning-modal">
                        <div className="delete-warning-modal__description">Are you sure you want to delete the element?</div>
                        <button className="delete-warning-modal__button delete-warning-modal__button--danger" onClick={props.delete}>Yes, delete</button>
                        <button className="delete-warning-modal__button delete-warning-modal__button" onClick={deleteClicked}>No, cancel</button>
                    </div>
                </Modal>
            </form>
        </Draggable>
    );
}

const RadioButton = ({ name, value, checked, onChange, label }) =>
    <span>
        <input
            type="radio"
            name={name}
            value={value}
            checked={checked}
            onChange={onChange} />
        <label className="element-editor-section__label">{label}</label>
    </span>;

const RadioGroup = ({ name, values, currentValue, onChange }) =>
    <span>
        {values.map((value, index) => <RadioButton
            name={name}
            value={index}
            key={index}
            checked={index === currentValue}
            onChange={onChange}
            label={value} />)}
    </span>;

export default ElementEditor;



/*

            {(!props.isLink && !props.element.attributes.role === "indicator") ? <div className="element-editor-section">
                <label className="element-editor-section__label element-editor-section__label--full">Perspective</label>
                <RadioGroup name="symboltype" values={[ "Before", "Before-after", "After" ]} currentValue={perspective} onChange={onPerspectiveChange} />
            </div> : null}
            {props.element.attributes.role === "indicator" ?
            <div className="element-editor-section">
                <div>
                    <label className="element-editor-section__label element-editor-section__label--full">Indicator Type</label>
                    <select id = "myList" value={indicatorType} onChange={onIndicatorTypeChange} >
                        <option value="businessConfiguration"> Business Configuration </option>
                        <option value="testResult" > Test Result </option>
                        <option value="networkMonitoring"> Network-layer Monitoring </option>
                        <option value="applicationMonitoring"> Application-layer Monitoring </option>
                    </select>
                </div>
                <br />
                <div>
                    <label htmlFor="label" className="element-editor-section__label element-editor-section__label--full">Indicator Value</label>
                    <textarea
                        id="indicator_value"
                        className="element-editor-section__input element-editor-section__input--100"
                        type="int"
                        value={indicatorValue}
                        onChange={onIndicatorValueChange}>
                </textarea>
                </div>
            </div> : null}





{
    props.element.attributes.role === "indicator" ? (
        <div className="element-editor-section">
            <div>
                <label className="element-editor-section__label element-editor-section__label--full">
                    Indicator Type
                </label>
                <select id="myList" value={indicatorType} onChange={onIndicatorTypeChange}>
                    <option value="businessConfiguration">Business Configuration</option>
                    <option value="testResult">Test Result</option>
                    <option value="networkMonitoring">Network-layer Monitoring</option>
                    <option value="applicationMonitoring">Application-layer Monitoring</option>
                </select>
            </div>

            <br />

            <div>
                <label className="element-editor-section__label element-editor-section__label--full">
                    Input Type
                </label>
                <select value={inputType} onChange={e => setInputType(e.target.value)}>
                    <option value="boolean">Boolean</option>
                    <option value="integer">Integer</option>
                    <option value="scale">Scale (1–10)</option>
                </select>
            </div>

            <br />

            <div>
                <label className="element-editor-section__label element-editor-section__label--full">
                    Indicator Value
                </label>
                {inputType === "boolean" && (
                    <select value={indicatorValue} onChange={onIndicatorValueChange}>
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                )}
                {inputType === "integer" && (
                    <input
                        type="number"
                        value={indicatorValue}
                        onChange={onIndicatorValueChange}
                        className="element-editor-section__input element-editor-section__input--100"
                    />
                )}
                {inputType === "scale" && (
                    <input
                        type="range"
                        min="1"
                        max="10"
                        value={indicatorValue}
                        onChange={onIndicatorValueChange}
                        className="element-editor-section__input element-editor-section__input--100"
                    />
                )}
            </div>
        </div>
    ) : null
}






import IndicatorValueInput from './IndicatorValueInput';

...

const [inputType, setInputType] = useState("boolean");
const [indicatorValue, setIndicatorValue] = useState("true");

...

{props.element.attributes.role === "indicator" && (
  <div className="element-editor-section">
    <div>
      <label className="element-editor-section__label element-editor-section__label--full">
        Indicator Type
      </label>
      <select value={indicatorType} onChange={onIndicatorTypeChange}>
        <option value="businessConfiguration">Business Configuration</option>
        <option value="testResult">Test Result</option>
        <option value="networkMonitoring">Network-layer Monitoring</option>
        <option value="applicationMonitoring">Application-layer Monitoring</option>
      </select>
    </div>

    <br />

    <div>
      <label className="element-editor-section__label element-editor-section__label--full">
        Input Type
      </label>
      <select value={inputType} onChange={e => setInputType(e.target.value)}>
        <option value="boolean">Boolean</option>
        <option value="integer">Integer</option>
        <option value="scale">Scale (1–10)</option>
      </select>
    </div>

    <br />

    <IndicatorValueInput
      inputType={inputType}
      value={indicatorValue}
      onChange={setIndicatorValue}
    />
  </div>
)}


*/