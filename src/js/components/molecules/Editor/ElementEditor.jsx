import React from 'react';

import './elementeditor.css';
import AddCorasShapes from './CORASShapes';

class ElementEditor extends React.Component {
    constructor(props) {
        super(props);

        this.onLabelChange = this.onLabelChange.bind(this);
        this.onValueChange = this.onValueChange.bind(this);
        this.onPositionChangeX = this.onPositionChangeX.bind(this);
        this.onPositionChangeY = this.onPositionChangeY.bind(this);
        this.onPerspectiveChange = this.onPerspectiveChange.bind(this);
        this.onWidthChange = this.onWidthChange.bind(this);
        this.onHeightChange = this.onHeightChange.bind(this);
        this.onFontSizeChange = this.onFontSizeChange.bind(this);
        this.valueType = this.valueType.bind(this);
        this.reqVal = this.reqVal.bind(this); //check if elementeditor requires valuefield.

        const { x, y } = this.props.isLink ? { x: null, y: null } : this.props.element.position();
        //testing this method
        const { width, height } = this.props.isLink ? {width:null, height:null} : this.props.element.attributes.size
        //const fontSize = this.props.element.attr('text') // TODO later
        //console.log(`Element: `, this.props.element);

        this.state = {
            label: this.props.isLink ?
                this.props.element.label(0).attrs.text.text :
                this.props.element.attr('text/text'),
            value: this.props.isLink ?
                this.props.element.label(1).attrs.text.text :
                this.props.element.attr('value/text'),
            x,
            y,
            width, 
            height,
            perspective: this.props.element.get('perspective'),
            valueType : this.valueType(),
        }
    }
    
    onPositionChangeX(e) {
        this.props.xOnChange(e.target.value);
        this.setState({ x: e.target.value });
    }
    
    onPositionChangeY(e) {
        this.props.yOnChange(e.target.value);
        this.setState({ y: e.target.value });
    }

    onLabelChange(e) {
        this.props.labelOnChange(e.target.value);
        this.setState({ label: e.target.value });
    }

    onValueChange(e) {
        //test
        this.props.valueOnChange(e.target.value);
        this.setState({ value: e.target.value });
    }

    onPerspectiveChange(e) {
        this.props.perspectiveOnChange(parseInt(e.target.value));
        this.setState({ perspective: parseInt(e.target.value) });
    }

    onWidthChange(e) {
        var w = parseInt(e.target.value); //I guess the compiler would optimize it anyway 

        this.setState({ width: w });
        if (!isNaN(w)) {
            this.props.widthChange(w);
            console.log("Width")
        } else {
            this.props.widthChange(0); //smallest possible number, considering 0.
            //TODO change the bordercolor of the input box to red
        }
    }

    onHeightChange(e) {
        var h = parseInt(e.target.value); //I guess the compiler would optimize it anyway 
        this.setState({ height: h });
        if (!isNaN(h)) { //this check can be extended to include a minimum size for objects.
            this.props.heightChange(h);
            console.log("Height", h);
            console.log(`State`,this.state)
        } else {
            this.props.heightChange(0);
            //TODO change the bordercolor of the input box to red
        }
    }

    onFontSizeChange (e) {
        var fs = parseInt(e.target.value);
        this.setState({fontSize: fs});
        //var fs = parseInt(e.target.value);
    }
    
    //TODO
    valueType(e) {
        //console.log(this.props.element);
        let val = "Value";

        if (this.props.isLink) {
            //console.log(this.props.element.attributes.valueType);
            return this.props.element.attributes.valueType;
        } else {
            //TODO
            switch(this.props.element.attributes.role) {
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
    }

    reqVal(e) { //may store this in state instead.
        return this.props.element.attributes.valueType; //null is falsy, any other valuetype should be true.
    }


    /*
                {!this.props.isLink ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Position</label>
                    <div className="element-editor-section__partitioner">
                        <input id="x" className="element-editor-section__input element-editor-section__input--75" type="number" value={this.state.x} onChange={this.onPositionChangeX} />
                        <label htmlFor="x" className="element-editor-section__label">x</label>
                    </div>
                    <div className="element-editor-section__partitioner">
                        <input id="y" className="element-editor-section__input element-editor-section__input--75" type="number" value={this.state.y} onChange={this.onPositionChangeY} />
                        <label htmlFor="y" className="element-editor-section__label">y</label>
                    </div>
                </div> : null}



                {!this.props.isLink ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Font size</label>
                    <div className="element-editor-section__partitioner">
                        <input id="fontsize" className="element-editor-section__input element-editor-section__input--75" type="number" value={this.state.fontSize} onChange={this.onFontSizeChange} />
                        <label htmlFor="fontsize" className="element-editor-section__label">Font size</label>
                    </div>
                </div>: null}
    */


    render() {
        return (
            <form className="element-editor" style={{ left: this.props.editorPosition.left, top: this.props.editorPosition.top }}>
                <div className="element-editor-section">
                    <label htmlFor="label" className="element-editor-section__label element-editor-section__label--full">Label</label>
                    <textarea
                        id="label"
                        className="element-editor-section__input element-editor-section__input--100"
                        type="text"
                        value={this.state.label}
                        onChange={this.onLabelChange}>
                    </textarea>
                </div>
                {this.reqVal() ? < div className="element-editor-section">
                    <label htmlFor="label" className="element-editor-section__label element-editor-section__label--full">{this.state.valueType}</label>
                    <textarea
                        id="value"
                        className="element-editor-section__input element-editor-section__input--100"
                        type="text"
                        value={this.state.value}
                        onChange={this.onValueChange}>
                    </textarea>
                </div>: null}
                {(!this.props.isLink && this.props.element.attributes.type !== 'coras.unboxedElement') ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Size</label>
                    <div className="element-editor-section__partitioner">
                        <input id="width" className="element-editor-section__input element-editor-section__input--75" type="number" value={this.state.width} onChange={this.onWidthChange} />
                        <label htmlFor="width" className="element-editor-section__label">Width</label>
                    </div>
                    <div className="element-editor-section__partitioner">
                        <input id="height" className="element-editor-section__input element-editor-section__input--75" type="number" value={this.state.height} onChange={this.onHeightChange} />
                        <label htmlFor="height" className="element-editor-section__label">Heigth</label>
                    </div>
                </div> : null}
                {!this.props.isLink ? <div className="element-editor-section">
                    <label className="element-editor-section__label element-editor-section__label--full">Element Type</label>
                    <RadioGroup name="symboltype" values={[ "Before", "Before-after", "After" ]} currentValue={this.state.perspective} onChange={this.onPerspectiveChange} />
                </div> : null}
                <div className="element-editor-section">
                    <button className="element-editor-section__button element-editor-section__button--cta" type="button" onClick={this.props.save}>Save</button>
                    <button className="element-editor-section__button" type="button" onClick={this.props.cancel}>Cancel</button>
                    <button className="element-editor-section__button element-editor-section__button--danger" type="button" onClick={this.props.delete}>Delete</button>
                </div>
            </form>
        );
    }
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
