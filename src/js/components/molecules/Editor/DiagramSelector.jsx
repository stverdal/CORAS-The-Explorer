import React from 'react';
import joint from 'jointjs';
import { connect } from 'react-redux';
import {
    ElementDoubleClicked,
    SetGraph,
    SetCurrGraph
} from '../../../store/Actions';


import "../../../../../node_modules/jointjs/dist/joint.css";
import './editor.css';
import './diagramselector.css';

import AddCorasShapes from './CORASShapes.js';

AddCorasShapes(joint);


const DiagramSelector = ({ graphs, currGraph, setGraph, changeGraph, selectedTab, diagramOptions }) => {

    const switchDiagram = diagramLabel => {
        //check if diagram exists
        // save current diagram
        console.log("SWITCH");
        if (diagramLabel === currGraph.label) {
            return;
        }

        var graph = new joint.dia.Graph(); //stupid hack
        if (graphs[diagramLabel] === null) {
            graph = new joint.dia.Graph();
            setGraph(diagramLabel, graph.toJSON());
        } else {
            graph.fromJSON(graphs[diagramLabel]);
        }

        console.log(graph);
        changeGraph(diagramLabel, graph);
    };

    return (
        <div className="diagram-tabrow">
            {diagramOptions.map((currElem, i) =>
                <a
                    onClick={() => switchDiagram(currElem)}
                    key={i}
                    className="diagram-tabrow__tablink">
                    <div
                        className={`diagram-tabrow__tab${currElem === selectedTab ? " diagram-tabrow__tab--selected" : ""}`}>{currElem}
                    </div>
                </a>
            )}
        </div>
    );
};

export default connect((state) => ({
    graphs: state.editor.graphs,
    currGraph: state.editor.currGraph,
    selectedTab: state.editor.currGraph.label,
    diagramOptions: state.editor.diagramTypes,
    paper: state.editor.paper
}), (dispatch) => ({
    elementDoubleClicked: (element, event) => dispatch(ElementDoubleClicked(element, event)),
    clearGraph: (label) => dispatch(ClearGraph(label)),
    setGraph: (label, graph) => dispatch(SetGraph(label, graph)),
    setCurrGraph: (label, graph) => dispatch(SetCurrGraph(label, graph)),
    setPaper: (paper) => dispatch(SetPaper(paper))
}))(DiagramSelector);
