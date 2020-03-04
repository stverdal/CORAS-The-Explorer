import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { ToolElementClicked, ToolTabSelected } from '../../../store/Actions';
import './editortool.css';

const EditorToolBar = ({ beginMoveElement, svgs }) =>
    <div className="editor-toolbox">
        {svgs ?
            svgs.map((svg, i) =>
                <div className="editor-toolbox__element"
                draggable
                onDragStart={(e) => {
                    const shape = svg.shapeFn();
                    if(svg.attrs)
                        Object.keys(svg.attrs).map((key, index) => shape.attr(key, svg.attrs[key]));

                    const styles = svg.typeStyles[svg.corasType];
                    Object.keys(styles).forEach((ref) => shape.attr(ref, styles[ref]));
                    shape.attr("text/text", svg.text);
                    shape.set('corasType', svg.corasType);
                    shape.set('typeStyles', svg.typeStyles);
                    shape.set('role', svg.role);
                    // a bit careful with these, some assumptions are made
                    // set custom fill color in ellipse and rect
                    if (svg.fill) {
                        shape.attr("body/fill", svg.fill);
                        shape.attr("innerBody/fill", svg.fill);
                    }
                    // set magnet attribute, only used for vulnerabilities now.
                    if (svg.magnet) { 
                        shape.attr("linkHandler/magnet", svg.magnet);
                    }

                    beginMoveElement(shape, svg.width, svg.height)
                }}
                key={i} >
                    <img src={svg.typeStyles[svg.corasType]["icon/href"]} height={svg.iconHeight || 40} className="editor-toolbox__icon" />
                    <div>{svg.text}</div>
                </div>) :
            null}
    </div>;

const EditorTool = ({ beginMoveElement, toolDefinitions, selectedTab, selectTab, currentShapes }) => {


    return (
        <div className="editor-tools">
            <div className="editor-tabrow">
                {toolDefinitions.map((toolDefinition, i) =>
                    <a onClick={() => selectTab(i)} key={i} className="editor-tabrow__tablink">
                        <div className={`editor-tabrow__tab${i === selectedTab ? " editor-tabrow__tab--selected" : ""}`}>{toolDefinition.name}</div>
                    </a>)}
            </div>
            <EditorToolBar beginMoveElement={beginMoveElement} svgs={currentShapes} />
        </div>
    );
};

export default connect((state) => ({
    selectedTab: state.editor.editorToolSection,
    currGraph: state.editor.currGraph,
    currentShapes: state.editor.currentShapes
}), (dispatch) => ({
    beginMoveElement: (element, width, height) => dispatch(ToolElementClicked(element, width, height)),
    selectTab: (tabNo) => dispatch(ToolTabSelected(tabNo))
}))(EditorTool);
