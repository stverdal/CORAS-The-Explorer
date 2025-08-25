import React from 'react';
//import joint from 'jointjs';
import { dia, shapes, linkTools } from '@joint/core';
import { connect } from 'react-redux';
import _ from 'lodash';
import {
    ElementRightClicked,
    ElementDoubleClicked,
    ElementEditorCancel,
    ElementEditorSave,
    ElementEditorDelete,
    ElementLabelEdit,
    ElementValueEdit,
    ElementChangeX,
    ElementChangeY,
    ElementChangeHeight,
    ElementChangeWidth,
    ElementChangeSize,
    ElementChangePerspective,
    ElementChangeIndicatorType,
    ElementChangeIndicatorValue,
    ToolElementRelease,
    MenuClearClicked,
    MenuClearConfirmed,
    CellClicked,
    CellHandleClicked,
    CellHandleRelased,
    CellHandleMoved,
    SetGraph,
    SetCurrGraph,
    SetCellResizing,
    SetElementPosition,
    SetMovingLinks,
    ToggleInfoBox, SetEditorPosition, SetModalPosition, ChangeInnerSize,
    ToolElementClicked
} from '../../../store/Actions';

import ElementEditor from './ElementEditor';
import EditorTool from './EditorTool';
import DiagramSelector from './DiagramSelector';
import EditorMenu from './EditorMenu';
//import CellTool from './CellTool';

import "../../../../../node_modules/jointjs/dist/joint.css";
import './editor.css';

import AddCorasShapes from './CORASShapes.js';
import ToolDefinitions from './ToolDefinitions';
import InfoBox from '../../atoms/InfoBox/InfoBox';
import { getDAG } from '../utils/graphUtils.js';
import { unboxedElement, ellipseElement, rectElement, roundRectElement, indicatorElement, riskElement, defaultLink } from './CShapes.js';
import { handleVulnerabilityAttachment } from '../utils/eventHandlers.js';

//Feels like doubling up.
const namespace = { ...shapes, coras: { unboxedElement, ellipseElement, rectElement, roundRectElement, indicatorElement, riskElement, defaultLink } };
//Add to shapes.
Object.assign(shapes, { coras: { unboxedElement, ellipseElement, rectElement, roundRectElement, indicatorElement, riskElement, defaultLink } });

//console.log(dia)
//AddCorasShapes();
console.log(namespace)
console.log(shapes)

class EditorView extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        return (<div></div>);
    }
}

class Editor extends React.Component {
    constructor(props) {
        super(props);

        this.graph = new dia.Graph({}, { cellNamespace: namespace });

        this.saveToLocalStorage = this.saveToLocalStorage.bind(this);
        this.getFromLocalStorage = this.getFromLocalStorage.bind(this);

        this.handleScroll = this.handleScroll.bind(this);
        this.handleScrollBlank = this.handleScrollBlank.bind(this);
        this.beginMovePaper = this.beginMovePaper.bind(this);
        this.movePaper = this.movePaper.bind(this);
        this.endMovePaper = this.endMovePaper.bind(this);
        this.updatePaperSize = this.updatePaperSize.bind(this);
        this.removeLink = this.removeLink.bind(this);
        this.cellToolHandleMoved = this.cellToolHandleMoved.bind(this);
        this.unembedElement = this.unembedElement.bind(this);
        this.embedElement = this.embedElement.bind(this);
        this.resizeElement = this.resizeElement.bind(this);

        this.paperOnMouseUp = this.paperOnMouseUp.bind(this);

        this.saveGraphToFile = this.saveGraphToFile.bind(this);
        this.loadGraphFromFile = this.loadGraphFromFile.bind(this);
        this.clearGraph = this.clearGraph.bind(this);
        this.downloadSvg = this.downloadSvg.bind(this);
        this.changeGraph = this.changeGraph.bind(this);
        this.attachTools = this.attachTools.bind(this);
        this.attachCallbacks = this.attachCallbacks.bind(this);
        this.initGraph = this.initGraph.bind(this);
        this.visualizeRelation = this.visualizeRelation.bind(this);

        this.paperId = this.props.paperId || 'paper-holder';
        this.paperWrapperId = `${this.paperId}-wrapper`;

        this.loadRef = React.createRef();
        this.paperRef = React.createRef();

        this.testEvent = this.testEvent.bind(this);
        this.beginElementResize = this.beginElementResize.bind(this);
        this.onHover = this.onHover.bind(this);
        this.exitHover = this.exitHover.bind(this);
        this.toggleInfo = this.toggleInfo.bind(this);
        this.calculateRisk = this.calculateRisk.bind(this);
        this.setCurrGraph = this.setCurrGraph.bind(this);
        this.addElement = this.addElement.bind(this);
        //this.getDAG = this.getDAG.bind(this);
        this.createGraphFromDAG = this.createGraphFromDAG.bind(this);
        this.createElementFromDAG = this.createElementFromDAG.bind(this);
    }

    saveToLocalStorage() {
        // might want to update redux state here, or update store more frequently
        console.log(this.props.currGraph.label)
        window.localStorage.setItem(this.paperId + "graph_" + this.props.currGraph.label, JSON.stringify(this.graph.toJSON()));
        //console.log(this.props.currGraph.label);
        window.localStorage.setItem('currTab', this.props.currGraph.label);
    }

    getFromLocalStorage() {
        //console.log(this.props.currGraph.label);
        var currTab = 'asset'; //default choice
        //check if current tab is kept track of, if not set to the default; asset.
        if (window.localStorage.getItem('currTab') !== null) {
            currTab = window.localStorage.getItem('currTab');
        }
        var storedGraph = null;
        this.props.diagramTypes.map((type, i) => {
            storedGraph = window.localStorage.getItem(this.paperId + "graph_" + type);
            if (storedGraph) {
                //console.log(`Editor scale `, this.paper.scale())
                this.props.setGraph(type, JSON.parse(storedGraph), this.paper.scale(), this.paper.translate());
            } else {
                //var placeHolder = new joint.dia.Graph();
                //this.props.setGraph(type, placeHolder, this.paper.scale(), this.paper.translate());
            }
        });
        window.localStorage.removeItem(this.paperId + "graph_" + currTab); // use if graph contains critical bug.
        this.props.setCurrGraph(currTab, this.graph.toJSON()); //TODO
        console.log("SHOWING CURRENT LOADED GRAPH", this.graph)
        console.log("Showing sources", this.graph.getElements())
        return window.localStorage.getItem(this.paperId + "graph_" + currTab);
    }

    toggleInfo() {
        //console.log('????'); //check for editor underneath cursor here. set flag if true.
        if (this.props.infoBox.visible) {
            this.props.toggleInfoBox({ x: 0, y: 0 }, false, "", "");
        }
    }

    calculateRisk() {
        //console.log("Cells",this.graph.getCells())
        //console.log("Elements",this.graph.getElements())
        //console.log("Links",this.graph.getLinks())
        //console.log("Sources",this.graph.getSources())
        //console.log("Sinks",this.graph.getSinks())
        var elements = this.graph.getElements();
        //Get inbound of all elements
        //for (let element of elements) {
        //    console.log("Element", element)
        //    console.log("Inbound links", this.graph.getConnectedLinks(element, {inbound: true}))
        //    console.log("Outbound links", this.graph.getConnectedLinks(element, {outbound: true}))
        //}
        //Kahns algorithm
        var L = [] //Empty list that will contain the sorted elements
        var S = []
        var roots = this.graph.getSources() //Set of all nodes with no incoming edges
        console.log("Roots", roots)
        //Remove indicators from source nodes, leaving only threat sources
        for (let node of roots) {
            console.log(node.attributes.role)
            if (node.attributes.role.startsWith('threat_source')) {
                S.push(node)
            }
        }
        console.log("Final Sources", S)
        //hack for now to set inDegree of all elements, excluding indicators.
        for (let element of this.graph.getElements()) {
            var inLinks = this.graph.getConnectedLinks(element, { inbound: true })
            var inboundCount = 0
            for (let link of inLinks) {
                if (link.getSourceElement().attributes.role === 'indicator') {
                    continue;
                }
                else {
                    inboundCount = inboundCount + 1
                }

            }
            element.set('inDegree', inboundCount)
        }
        while (S.length > 0) {
            var n = S.pop() //Remove a node n from S
            L.push(n) //Add n to the end of L

            var outbound = this.graph.getConnectedLinks(n, { outbound: true })
            for (let link of outbound) {
                var m = link.getTargetElement()
                console.log("M", m)
                //link.remove()
                m.set('inDegree', m.get('inDegree') - 1)
                //console.log("Connected links",graphCopy.getConnectedLinks(m, {inbound: true}))
                if (m.get('inDegree') == 0) {
                    S.push(m)
                }
            }
        }
        //Topographical sort complete
        console.log("L", L)

        console.log("Risk tables.", this.props.risk.likelihoodScales.currentScales[0])
        console.log("Risk tables.", this.props.risk.likelihoodScales.default)
        var likelihoodTable = this.props.risk.likelihoodScales.currentScales[0] || this.props.risk.likelihoodScales.default;

        //Dictionary which maps likelihood values to numerical values
        //get likelihoods from redux state.
        //var likelihoodTable = {
        //    'Rare': 5,
        //    'Unlikely': 25,
        //    'Possible': 50,
        //    'Likely': 100,
        //    //'Very Likely': > 100
        //};

        //const likelihoodEntries = Object.entries(likelihoodTable);
        //Get the key (label) of a frequency range 
        function getRangeAverage(range) {
            //console.log("Range _>>>>>>>>>>>>>>>>>", range)
            return (range.min + range.max) / 2;
        }

        function getLikelihoodKey(inputRange, table) {
            // inputRange is expected to be an array with two numbers: [min, max]
            // We compute the average of the range to determine the likelihood key.
            const average = getRangeAverage(inputRange);
            console.log("Range:", inputRange, "Average:", average);
            console.log("Likelihood table", table);

            // First, determine the highest max value and its corresponding key.
            let highestMax = -Infinity;
            let highestKey = null;
            for (const [name, tableRange] of Object.entries(table)) {
            if (tableRange.range.max > highestMax) {
                highestMax = tableRange.range.max;
                highestKey = tableRange.name;
            }
            }

            // Check each range to see if the average fits.
            for (const [name, tableRange] of Object.entries(table)) {
            console.log("Checking range for", name, ":", tableRange);
            if (average >= tableRange.range.min && average <= tableRange.range.max) {
                console.log("Matched:", name);
                return tableRange.name;
            }
            }
            
            // If average is higher than all defined ranges, return the highest.
            if (average > highestMax) {
            console.log("Average above all ranges. Returning highest:", highestKey);
            return highestKey;
            }
            
            console.log("No match found for average:", average);
            return 'NaN';
        }

        function getLikelihoodRange(key, table) {
            console.log("getLikelihood from label",key)

            for (const [name, tableRange] of Object.entries(table)) {
                console.log(name,key)
                if (key === tableRange.name) {
                    return tableRange.range;
                }
            }
            return 'NaN';
        }

        function addRanges(a, b) {
            // Convert a to a range if it's a number.
            const rangeA = Array.isArray(a) ? a : [a, a];
            return [rangeA[0] + b[0], rangeA[1] + b[1]];
        }
        /**
         * Multiplies the minimum and maximum values of a given range by the specified constant.
         *
         * @param {Object} range - The range object with "min" and "max" properties.
         * @param {number} constant - The constant to multiply both min and max values by.
         * @returns {Object} A new range object with the scaled "min" and "max" values.
         */
        function multiplyRangeWithConstant(range, constant) {
            console.log("Range, constant",range, constant)
            // Multiply the minimum value by the constant
            let newMin = range.min * constant;
            
            // Multiply the maximum value by the constant
            let newMax = range.max * constant;
            
            // Return the new scaled range
            return {min: newMin, max: newMax};
        }

        for (let element of L) {
            console.log("Element", element.id, element.attributes.role)
            //look at all inbound links
            //Sinks are leaf nodes. This includes assets and vulnerabilities.
            //Sources are root nodes. This includes threat sources and indicators.
            if (this.graph.isSink(element) || this.graph.isSource(element)) {
                continue;
            }
            var indicatorValues = []
            var likelihood = null //later maps to table. Numerical backend for now.
            var frequencyRanges = []



            //For all inbound links. 
            //Calculate source likelihood * conditional probability for base value.
            //Iterate over all connected vulnerabilites.
            //For each vulnerability, get all indicator values that has the vuln as target.
            //Modify base likelihood with the indicator values.
            for (let link of this.graph.getConnectedLinks(element, { inbound: true })) {
                var source = link.getSourceElement()
                var sourceLikelihoodValue;
                var baseConditionalProbability = null;
                var linkIndicatorValues = []
                var unmodifiedBaseLikelihood = null;
                //if link connected to source, set likelihood directly from link
                if (source.attributes.role === 'indicator') {
                    indicatorValues.push(source.attributes.indicatorValue)
                    continue;
                    //Should only be threat sources in a valid diagram.
                } else if (this.graph.isSource(source)) {
                    //Still, make sure
                    if (source.attributes.role.startsWith('threat_source')) {
                        //If source is threat source, we get likelihood from the link. This is converted to a value by the likelihoodTable.
                        //console.log("ROOT OR LEAF range for label", getLikelihoodRange(link.label(1).attrs.text.text.replace(/[\[\]']+/g, ''), likelihoodTable))
                        //We add the frequency range for this link to the array
                        sourceLikelihoodValue = getLikelihoodRange(link.label(1).attrs.text.text.replace(/[\[\]']+/g, ''), likelihoodTable)
                        unmodifiedBaseLikelihood = sourceLikelihoodValue;
                        //console.log("sourceLikelihoodValue first time around", sourceLikelihoodValue);
                        //frequencyRanges.push(getLikelihoodRange(link.label(1).attrs.text.text.replace(/[\[\]']+/g, ''), likelihoodTable))
                        //TODO add support for indicators.
                    }
                } else {
                    //The link source is not a root or leaf, but a threat scenario or unwanted incident. Normal rules apply.
                    //var sourceValue = parseInt(source.attributes.attrs.value.text.replace(/[\[\]']+/g, ''));
                    //console.log("lskdjflksdjf", source.attributes.attrs.value.text.replace(/[\[\]']+/g, ''))

                    //Get value from source attributes. Value is a frequency range. MAYBE add default if not defined.
                    //This has already been modified by the indicators
                    sourceLikelihoodValue = source.attributes.attrs.frequency;
                    unmodifiedBaseLikelihood = sourceLikelihoodValue;
                    //console.log(", NOT A ROOT OR LEAF Source likelihood value", sourceLikelihoodValue)


                    //var conditionalProbability
                    //var sourceValue = getLikelihoodRange(source.attributes.attrs.value.text.replace(/[\[\]']+/g, ''), likelihoodTable);
                    ///console.log("Source value", sourceValue)
                    baseConditionalProbability = parseFloat(link.label(1).attrs.text.text.replace(/[\[\]']+/g, ''))
                    //console.log("baseConditionalProbability", baseConditionalProbability)



                    //Modify the value based on indicators
                    //console.log("Conditional probability", conditionalProbability)
                    //likelihood = likelihood + (sourceLikelihoodValue * baseConditionalProbability)
                    //console.log("Likelihood", likelihood)
                }
                //console.log("sourceLikelihood second time around", sourceLikelihoodValue)

                //Check link for vulnerabilites and compute the values of their attached vulnerabilities.
                if (link.attributes.vulnerabilities && link.attributes.vulnerabilities.length) {
                    //Iterate over all vulnerabilities attached to the link
                    link.attributes.vulnerabilities.forEach(vulnId => {
                        const vulnCell = this.graph.getCell(vulnId);
                        //console.log("Vulnerability cell", vulnCell);
                        //For each vulnerability, get all indicators attached to it.
                        //check for all incoming links, if the source is an indicator, add the value to the indicatorValues array.
                        this.graph.getConnectedLinks(vulnCell, { inbound: true }).forEach(link => {
                        //vulnCell.getIncomingLinks().forEach(link => {
                            const source = link.getSourceElement();

                            if (source.attributes && source.attributes.role === 'indicator' && (source.attributes.indicatorValue !== undefined && source.attributes.indicatorValue !== null)) {
                                linkIndicatorValues.push(source.attributes.indicatorValue);
                                console.log("Source indicator", source);
                                console.log("Adding indicator value", source.attributes.indicatorValue, "for vulnerability", vulnCell.id);
                            }
                        });
                    });
                }
                console.log("------->>Link indicator values", linkIndicatorValues)
                //If the link is not an initiates relation, we apply the indicator values to the conditional probability.
                if (baseConditionalProbability) {
                    //console.log("BASECONDITIONAL", link)
                    for (let value of linkIndicatorValues) {
                        //console.log("ASADSADSADAS Applying indicator value", value, "to base conditional probability", baseConditionalProbability)
                        console.log("Multiplying base conditional probability", baseConditionalProbability, "with value", value)
                        baseConditionalProbability = baseConditionalProbability * value;
                    }
                    //console.log("sourceLikelihoodValue", sourceLikelihoodValue);
                    console.log("THere is a conditional probability", sourceLikelihoodValue, baseConditionalProbability)
                    frequencyRanges.push(multiplyRangeWithConstant(sourceLikelihoodValue, baseConditionalProbability));
                } else {
                    //If the link is an initiates relation, we apply the indicator values to the initial likelihood value, which is denoted on the link.
                    console.log("initiaties _>")
                    linkIndicatorValues.forEach(value => {
                        sourceLikelihoodValue = multiplyRangeWithConstant(sourceLikelihoodValue, value);
                        
                    });
                    //Confirm that sourcelikelihood is not greater than unmodifiedBaseLikelihood
                    if (unmodifiedBaseLikelihood && sourceLikelihoodValue.max > unmodifiedBaseLikelihood.max) {
                        sourceLikelihoodValue = unmodifiedBaseLikelihood;
                    }
                    frequencyRanges.push(sourceLikelihoodValue);
                }

            }

            //If the link is not an initiates relation, we apply the indicator values to the conditional probability.
            //combine the values for all incoming links to generate the final frequency range
            //add all frequency ranges together
            if (frequencyRanges.length === 0) {
                frequencyRanges.push([0, 0]);
            }
            //console.log("---------> Indicator values", indicatorValues)
            console.log("Frequency Ranges",frequencyRanges)
            if (frequencyRanges.length === 1) {
                likelihood = frequencyRanges[0];
            } else {
                likelihood = frequencyRanges.reduce((acc, range) => (
                    //console.log("Combining frequency ranges", acc, range),
                    {
                        min: acc.min + range.min,
                        max: acc.max + range.max
                    }
                ), { min: 0, max: 0 });
            }
            console.log("Combined Likelihood", likelihood)

            //apply indicators
            for (let value of indicatorValues) {
                console.log("Applying indicator value", value, "to likelihood", likelihood)
                likelihood = multiplyRangeWithConstant(likelihood, value);
            }
            console.log("Likelihood after modification with indicators", likelihood)
            //console.log("Element", element)
            //console.log("dgfgororoO|OOOOOOO", getLikelihoodKey(likelihood, likelihoodTable))
            element.attributes.attrs.frequency = likelihood ;
            element.attr('value/text', '[' + getLikelihoodKey(likelihood, likelihoodTable) + ']')
        }

        /*  //TODO: CHANGE
           //This is a loop to translate the numeric likelihood values to a string representing the likeliood value
           //to demonstrate what the final product will look like.
           for (let element of L) {
               //element.attr('value/text', '[' + likelihood + ']')
               for (let link of this.graph.getConnectedLinks(element, {inbound: true})) {
                   var source = link.getSourceElement()
                   if (this.graph.isSource(source)) {
                       let linkLikelihood = parseInt(link.label(1).attrs.text.text.replace(/[\[\]']+/g, ''))
                       let initValue = 'Rare'
                       if (linkLikelihood > 10 && likelihood < 30) {
                           initValue = 'Minor'
   
                       } else if (linkLikelihood> 30 && likelihood < 50) {
                           initValue = 'Moderate'
                       } else if (linkLikelihood > 50) {  
                           initValue = 'Major'
                       } else if (linkLikelihood > 70) {
                           initValue = 'Critical'
                       }
                       link.label(1).attrs.text.text = initValue
                   }
   
               }
               let scenarioLikelihood = parseInt(element.attr('value/text'))
               let initValue = 'Rare'
               if (scenarioLikelihood > 10 && likelihood < 30) {
                   initValue = 'Minor'
   
               } else if (scenarioLikelihood > 30 && likelihood < 50) {
                   initValue = 'Moderate'
               } else if (scenarioLikelihood > 50) {
                   initValue = 'Major'
               } else if (scenarioLikelihood > 70) {
                   initValue = 'Critical'
               }
               element.attr('value/text', initValue)  
           }*/

    }

    componentDidMount() {
        const arrowheadShape = 'M 10 0 L 0 5 L 10 10 z';

        var graph = new dia.Graph({}, { cellNamespace: namespace });

        //this allows the addition of vertices on link dbl click.
        var customLinkView = dia.LinkView.extend({
            pointerdown: function (evt, x, y) {
                if (evt.which === 3 || evt.button === 2) {
                    evt.preventDefault();
                    return;
                }
                this.addVertex(x, y);
            }
        });

        //console.log(`Linkview: `, customLinkView)
        //console.log(`joint.dia.linkview `, joint.dia.LinkView), 
        //customLinkView.addTools(customToolsView)



        console.log("NAMESPACE", namespace)
        this.paper = new dia.Paper({
            el: document.getElementById(this.paperId),
            model: this.graph, // change
            width: document.getElementById(this.paperWrapperId).offsetWidth - 10,
            height: document.getElementById(this.paperWrapperId).offsetHeight - 10,
            gridSize: 1,
            background: {
                color: 'rgba(255, 255, 255, 1)',
            },
            cellViewNamespace: namespace,
            interactive: this.props.interactive === undefined ? true : this.props.interactive,
            //defaultLink: new joint.shapes.devs.Link({
            defaultLink: new shapes.coras.defaultLink({
                attrs: {
                    '.marker-target': {
                        d: arrowheadShape
                    }
                }
            }),
            linkView: customLinkView,
            interactive: { vertexAdd: false },
        });
        console.log("Is present?", shapes.coras.defaultLink)
        //console.log("DEFAULT LINK",this.paper.defaultLink)

        // Load graph from localStorage if it exists,  upgrade efficiency
        if (this.props.currGraph && this.props.currGraph.graph) {
            this.graph.fromJSON(this.props.currGraph.graph);
            this.initGraph();
        } else if (this.getFromLocalStorage()) {
            this.graph.fromJSON(JSON.parse(this.getFromLocalStorage()));
            this.initGraph();
        }

        ////
        //Evaluate risk value of graph
        //this.calculateRisk();

        ////



        // Save in localStorage on change (or rather, every second currently)
        this.periodicalSave = setInterval(this.saveToLocalStorage, 1000);

        window.addEventListener('resize', this.updatePaperSize);
        window.addEventListener("mousedown", this.toggleInfo);
        window.addEventListener("pointermove", this.moveItem);

        if (this.props.interactive === undefined ? true : this.props.interactive) {
            this.paper.on('cell:contextmenu', (elementView, e) => {
                e.preventDefault();
                this.props.elementDoubleClicked(elementView.model, e);
            });
            //this.paper.on('cell:pointerdblclick', (elementView, e, x, y) => this.props.elementDoubleClicked(elementView.model, e));
            this.paper.on('element:pointerdblclick', (elementView, e, x, y) => {
                e.preventDefault();
                this.props.elementDoubleClicked(elementView.model, e);
            });
            this.paper.on('cell:pointerup', this.embedElement);
            this.paper.on('cell:pointerdown', this.unembedElement);
            this.paper.on('element:pointermove', this.resizeElement);
            this.paper.on('element:mouseenter', this.onHover);
            this.paper.on('element:mouseleave', this.exitHover);

            this.paper.on('link:mouseenter', function (linkView) {
                //console.log(`Showtools `,linkView.showTools())
                linkView.showTools();
            });

            this.paper.on('link:mouseleave', function (linkView) {
                linkView.hideTools();
            });

            this.paper.on('cell:mousewheel', this.handleScroll);
            this.paper.on('blank:mousewheel', this.handleScrollBlank);

            this.paper.on('blank:pointerdown', this.beginMovePaper);
            this.paper.on('blank:pointermove', this.movePaper);
            this.paper.on('blank:pointerup', this.endMovePaper);
            this.paper.on('element:sizeSelector:pointerdown', this.beginElementResize);
        }
    }
    //TODO, understand this better.
    //This function attaches the toolView containing linkTools to the link provided.
    attachCallbacks(link) {
        //identify all vulnerabilities attached to the link

        console.log("Attaching callbacks to link", link.id, link.attributes.vulnerabilities);
        // for each vulnerability, attach a callback to the position change of the source and target elements.
        if (link.attributes.vulnerabilities) {
            link.attributes.vulnerabilities.forEach((vulnerabilityId) => {
                const cell = this.graph.getCell(vulnerabilityId);
                if (cell) {
                    let sourceCell = link.getSourceElement();
                    let targetCell = link.getTargetElement();
                    console.log(`Attaching callback for vulnerability ${vulnerabilityId} to link ${link.id}`);
                    const callback = () => handleVulnerabilityAttachment(cell, link);

                    if (!cell._vulnPositionCallbacks) {
                        cell._vulnPositionCallbacks = {};
                    }
                    cell._vulnPositionCallbacks[link.id] = callback;

                    [sourceCell, targetCell].forEach(cellModel => {
                        cellModel.on('change:position', callback);
                    });

                    //this.attachVulnerabilityCallback(cell, link);
                } else {
                    console.warn(`Vulnerability with ID ${vulnerabilityId} not found in graph.`);
                }
            });
        }
    }
    //TODO, understand this better.
    //This function attaches the toolView containing linkTools to the link provided.
    attachTools(link) {
        //Create tools for link
        var linkView = link.findView(this.paper);
        // console.log(`AttachTools Linkview `, linkView);

        //combine tools in a view
        var verticesTool = new linkTools.Vertices({
            vertexAdding: false
        });
        var segmentsTool = new linkTools.Segments();
        var boundaryTool = new linkTools.Boundary();
        var removeButton = new linkTools.Remove();

        var customToolsView = new dia.ToolsView({
            tools: [
                verticesTool,
                segmentsTool,
                boundaryTool,
                removeButton
            ]
        });

        //add toolview to the linkview that is attached to link
        linkView.addTools(customToolsView);
        linkView.hideTools();
    }

    //Unsure if this is required, or just a sideeffect of my hacky implementation... probably the latter.
    //this attached the toolview to all links in the graph. Called on when graph is loaded from storage.
    initGraph() {
        console.log("Initializing graph tools");
        this.graph.attributes.cells.models.map((model) => {
            console.log("Model", model);
            if (model.attributes.type === 'coras.defaultLink') {
                console.log("Attaching tools to link", model.id);
                this.attachTools(model);
                this.attachCallbacks(model);
            }
        })
        //attach callbacks to vulnerabilities
    }

    testEvent(cellView, e, x, y) {
        //console.log("Event triggered");
        //console.log(cellView);
        //console.log(e);
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updatePaperSize);
        window.removeEventListener('mousedown', this.toggleInfo);
        clearInterval(this.periodicalSave);
        //console.log("Unmounting editor, removing paper");
        this.setCurrGraph();
        //console.log("Current graph stored in state:", this.props.currGraph);
    }

    visualizeRelation(link, relation) {
        //console.log('visualize ', relation)
        var arrowheadShape = 'M 10 -5 L -2 0 L 10 5 z';
        var fill = 'black';
        var strokeWidth = 10;

        switch (relation) {
            case 'initiates':
                console.log("Initiates link");
                arrowheadShape = 'M 10 -5 L -2 0 L 10 5';
                fill = 'none';
                strokeWidth = 1;
                //TODO
                break;
            case 'leads_to':
                //default settings
                break;
            case 'impacts':
                arrowheadShape = 'M 8 -5 L -2 0 L 8 5 M -2 0 L 18 0 M 18 -5 L 8 0 L 18 5';
                fill = 'none';
                break;
            case 'treats':
                link.attr('line/strokeDasharray', '10 5');
                arrowheadShape = "M 0 0 a 5 5 0 1 1 10 0 a 5 5 0 1 1 -10 0 ";
                fill = 'white';
                break;
            case 'indicates':
                link.attr('line/strokeDasharray', '4 2');
        }
        link.attr('line/targetMarker', {
            d: arrowheadShape,
            stroke: 'black',
            fill: fill,
            strokeWidth: 1
        });
        return link;
    }

    handleScroll(cellView, e, x, y, delta) {
        e.preventDefault();
        const scaleFactor = 1.03;
        const currentScale = this.paper.scale();

        if (delta > 0) {
            const newX = currentScale.sx * scaleFactor > 5 ? currentScale.sx : currentScale.sx * scaleFactor;
            const newY = currentScale.sy * scaleFactor > 5 ? currentScale.sy : currentScale.sy * scaleFactor;
            this.paper.scale(newX, newY);
        } else if (delta < 0) {
            const newX = currentScale.sx / scaleFactor < 0.52 ? currentScale.sx : currentScale.sx / scaleFactor;
            const newY = currentScale.sy / scaleFactor < 0.52 ? currentScale.sy : currentScale.sy / scaleFactor;
            this.paper.scale(newX, newY);
        }
    }

    handleScrollBlank(e, x, y, delta) {
        this.handleScroll(null, e, x, y, delta);
    }

    unembedElement(cellView, evt, x, y) {
        var cell = cellView.model;
        //if link return, no need to prepare for embedding
        if (cell.attributes.type === 'coras.defaultLink') {
            return;
        }

        //console.log('unembedElement')

        //If cell is a vulnerability, remove it from the link
        console.log("UNEMBEDDING", cell);
        if (cell.attributes.role === 'vulnerability') {
            let linkId = cell.attributes.linkedTo
            console.log("Link to remove from", linkId);
            //Find the link by id
            let link = this.graph.getCell(linkId);
            if (link) {
                const sourceCell = link.getSourceElement();
                const targetCell = link.getTargetElement();

                //Get event handler reference and remove it
                const callback = cell._vulnPositionCallbacks && cell._vulnPositionCallbacks[link.id];
                if (callback) {
                    [sourceCell, targetCell].forEach(cellModel => {
                        cellModel.off('change:position', callback);
                    });
                    delete cell._vulnPositionCallbacks[link.id];
                }

                //[sourceCell, targetCell].forEach(cellModel => {
                ///    cellModel.off('change:position', () => handleVulnerabilityAttachment(cell, linkModel));
                //});
                console.log("Found link", link);
                //Remove the vulnerability from the link
                let vulnerabilities = link.get('vulnerabilities') || [];
                console.log("Current vulnerabilities", vulnerabilities);
                vulnerabilities = vulnerabilities.filter(vulnId => vulnId !== cell.id);
                link.set('vulnerabilities', vulnerabilities);
                console.log("Updated vulnerabilities", vulnerabilities);
                //Remove the link from the vulnerability
                cell.set('linkedTo', null);
            }
        }


        this.setState({ elementPosition: cell.attributes.position });

        if (!cell.get('embeds') || cell.get('embeds').length === 0) {
            cell.toFront();
        } else {
            // is a parent cell,  store related links
            if (!this.state.movingLinks) {
                var arr = [];
                _.each(cellView.model.getEmbeddedCells(), child => {
                    // find connected links and add them to array
                    var temp = this.graph.getConnectedLinks(child);

                    for (let i = 0; i < temp.length; i++) {
                        if (arr.findIndex(element => element.cid === temp[i].cid) === -1) {
                            arr.push(temp[i]);
                        }
                    }
                });

                this.setState({ movingLinks: arr });
            }
        }

        if (cell.get('parent')) {
            this.graph.getCell(cell.get('parent')).unembed(cell);
        }
    }

    embedElement(cellView) {
        var cell = cellView.model;
        if (cell.attributes.type === 'coras.defaultLink') {
            console.log("Link clicked, not embedding", cell);
            console.log("LINKK", cellView.getConnection());
            cell.on('change', function () { console.log('the link changed') })
            //removes selftargeting
            if (cell.getTargetElement() === null || cell.getSourceElement().cid === cell.getTargetElement().cid) {
                cell.remove();
                return;
            }
            console.log('Check for list of relations ', cell);
            var source = cell.getSourceElement().attributes.role;
            if (source && source.startsWith('threat_source')) {
                source = 'threat_source';
            }
            var target;
            if (cell.getTargetElement()) {
                target = cell.getTargetElement().attributes.role;
            }
            var result = 'no_relation';
            var valType = 'NA';
            var reversed = false;

            switch (source) {
                case "threat_source":
                    switch (target) {
                        case "threat_scenario":
                        case "unwanted_incident":
                        case "risk":
                            result = "initiates";
                            valType = "Likelihood";
                            break;
                        default:
                            cell.remove();
                    }
                    break;
                case "threat_scenario":
                    switch (target) {
                        case "threat_scenario":
                        case "unwanted_incident":
                        case "risk":
                            result = "leads_to";
                            valType = "Conditional probability";
                            break;
                        case "threat_source":
                            result = "initiates";
                            valType = "Likelihood";
                            reversed = true;
                            break;
                        default:
                            cell.remove();
                            break;
                    }
                    break;
                case "unwanted_incident":
                    switch (target) {
                        case "threat_scenario":
                        case "unwanted_incident":
                            result = "leads_to";
                            valType = "Conditional probability";
                            break;
                        case "direct_asset":
                            result = "impacts";
                            valType = "Consequence";
                            break;
                        case "threat_source":
                            result = "initiates";
                            valType = "Likelihood";
                            reversed = true;
                            break;
                        default:
                            cell.remove();
                            break;
                    }
                    break;
                case "direct_asset":
                    switch (target) {
                        case 'unwanted_incident':
                        case 'risk':
                            result = "impacts";
                            valType = "Consequence";
                            reversed = true;
                            break;
                        case "direct_asset":
                        case "indirect_asset":
                            result = "impacts";
                            valType = "Consequence";
                            break;
                        default:
                            cell.remove();

                    }
                    break;
                case "indirect_asset":
                    switch (target) {
                        case 'risk':
                            result = "impacts";
                            valType = "Consequence";
                            reversed = true;
                            break;
                        case "direct_asset":
                        case "indirect_asset":
                            result = "impacts";
                            valType = "Consequence";
                            break;
                        default:
                            cell.remove();

                    }
                    break;
                case "treatment":
                    switch (target) {
                        case "vulnerability":
                        case "threat_source":
                        case "risk":
                        case "threat_scenario":
                        case "direct_asset":
                        case "indirect_asset":
                        case "unwanted_incident":
                            result = "treats";
                            break;
                        default:
                            cell.remove();

                    }
                    break;
                case "risk":
                    switch (target) {
                        case "direct_asset":
                        case "indirect_asset":
                        case "risk":
                            result = "impacts";
                            valType = "Consequence";
                            break;
                        default:
                            cell.remove();
                    }
                    break;
                case "indicator":
                    switch (target) {
                        case "vulnerability":
                        case "threat_scenario":
                        case "unwanted_incident":
                        case "risk":
                            result = 'indicates';
                            break;
                        default:
                            cell.remove();
                    }
                    break;
                default:
                    cell.remove();
            }

            //switch target and source
            if (reversed) {
                let temp = cell.source();
                cell.source(cell.target());
                cell.target(temp);
            }

            if (result !== "no_relation") {
                this.visualizeRelation(cell, result);
                this.attachTools(cell); //attach a toolview to the cell.
                cell.attributes.relation = result;
            }

            //Pad label array if necessary
            if (!cell.label(0)) {
                cell.label(0, {
                    attrs: {
                        text: {
                            text: ''
                        }
                    },
                    position: {
                        offset: -10
                    }
                });
            }
            //console.log("breakpoint")
            //console.log("Valtype ", valType)
            if (valType != "NA" && !cell.label(1)) {
                cell.label(1, {
                    attrs: {
                        text: {
                            text: ''
                        }
                    },
                    position: {
                        offset: 10
                    }
                });
                cell.attributes.valueType = valType;
            } else if (!cell.label(1)) { // first attempt
                cell.label(1, {
                    attrs: {
                        text: {
                            text: ''
                        }
                    },
                    position: {
                        offset: 10
                    }
                });
            }
            cell.attributes.relation = result;
            return;
        }

        this.setState({ movingLinks: null });

        // May need more guards, but for now just check for non falsy selectedCellView
        if (this.props.cellResizing) {
            cellView.options.interactive = true;
            this.props.setCellResizing(false);
            cellView.unhighlight();
            return;
        }

        //var cellViewsBelow = this.paper.findCellViewsAtPoint(cell.getBBox().center());
        var cellViewsBelow = this.paper.findCellViewsInArea(cell.getBBox(), { buffer: 1000 });
        //console.log(cellViewsBelow);
        //embed vulnerabilites on link
        if (cell.attributes.role === 'vulnerability') {

            //this.paper.showTools();//REMOVE

            console.log("CELLS BELOW", cellViewsBelow)
            if (cellViewsBelow.length) {
                var cellViewBelow = _.find(cellViewsBelow, function (c) { return c.model.id !== cell.id });
                console.log("CELL BELOW is", cellViewBelow)
                if (cellViewBelow && cellViewBelow.model.get('parent') !== cell.id && cellViewBelow.model.attributes.type == "coras.defaultLink") {
                    console.log("OIJSDFLKSDJFLKj")
                    //cellViewBelow.model.embed(cell);
                    const linkModel = cellViewBelow.model;

                    // Create an empty "vulnerabilities" list attribute on the link if it doesn't exist
                    let vulnerabilities = linkModel.get('vulnerabilities');
                    if (!vulnerabilities) {
                        vulnerabilities = [];
                        linkModel.set('vulnerabilities', vulnerabilities);
                    }

                    // Add the vulnerability ID (from cell) to this list if not already added
                    if (!vulnerabilities.includes(cell.id)) {
                        vulnerabilities.push(cell.id);
                        linkModel.set('vulnerabilities', vulnerabilities);
                    }

                    // Add the link ID to the vulnerability as an attribute
                    cell.set('linkedTo', linkModel.id);


                    let vulnIndex = vulnerabilities.length - 1;
                    //let vulnOffset = 0;
                    let vulnDistance = 0;
                    //Get point of vuln center
                    let cellCenter = cell.getBBox().center()
                    const vertices = linkModel.get('vertices') || [];


                    // Suppose you have a method to get current scale from the paper.
                    const currentScale = this.paper.scale(); // assuming uniform scaling here
                    console.log("Current scale:", currentScale);
                    // Now, adjust source and target points
                    const adjustForZoom = (point) => ({ x: point.x * currentScale.sx, y: point.y * currentScale.sy });
                    // Build complete list of points: source, vertices, target.
                    const sourceView = linkModel.getSourceElement().findView(this.paper);
                    const targetView = linkModel.getTargetElement().findView(this.paper);
                    const sourcePoint = sourceView ? sourceView.getBBox().center() : linkModel.get('source');
                    const targetPoint = targetView ? targetView.getBBox().center() : linkModel.get('target');
                    /*
                    const sourcePoint = sourceView
                        ? adjustForZoom(sourceView.getBBox().center())
                        : adjustForZoom(linkModel.get('source'));
                    const targetPoint = targetView
                        ? adjustForZoom(targetView.getBBox().center())
                        : adjustForZoom(linkModel.get('target'));
                    */

                    console.log("linkmodels source and target", linkModel.get('source'), linkModel.get('target'));
                    //const sourcePoint = sourceView.getBBox().center()
                    //const targetPoint = targetView.getBBox().center()

                    const points = [sourcePoint, ...vertices, targetPoint];


                    // Compute total length of the polyline.
                    let totalLength = 0;
                    const segments = [];
                    for (let i = 0; i < points.length - 1; i++) {
                        const dx = points[i + 1].x - points[i].x;
                        const dy = points[i + 1].y - points[i].y;
                        const segLength = Math.hypot(dx, dy);
                        segments.push(segLength);
                        totalLength += segLength;
                    }

                    console.log("Total length of polyline:", totalLength);
                    // Find the closest segment to cellCenter by projecting cellCenter onto each segment.
                    let closestSegmentIndex = 0;
                    let localT = 0;
                    let minDistance = Infinity;
                    for (let i = 0; i < points.length - 1; i++) {
                        const p1 = points[i];
                        const p2 = points[i + 1];
                        console.log("Segment points:", p1, p2);
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const segLengthSq = dx * dx + dy * dy;
                        let t = 0;
                        console.log("Segment length squared:", segLengthSq);
                        if (segLengthSq !== 0) {
                            console.log("cellcenter", cellCenter);
                            t = ((cellCenter.x - p1.x) * dx + (cellCenter.y - p1.y) * dy) / segLengthSq;
                            console.log("Projection t value:", t);
                            t = Math.max(0, Math.min(1, t));
                            console.log("Clamped t value:", t);
                        }
                        const projX = p1.x + t * dx;
                        const projY = p1.y + t * dy;
                        const distance = Math.hypot(cellCenter.x - projX, cellCenter.y - projY);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestSegmentIndex = i;
                            localT = t;
                        }
                    }

                    console.log("Closest segment index:", closestSegmentIndex, "Local T:", localT);

                    // Calculate cumulative length up to the closest segment.
                    const lengthBefore = segments
                        .slice(0, closestSegmentIndex)
                        .reduce((sum, seg) => sum + seg, 0);
                    console.log("Length before closest segment:", closestSegmentIndex, lengthBefore);
                    // vulOffset is a number between 0 and 1 indicating the placement along the entire link.
                    let vulnOffset = totalLength > 0
                        ? (lengthBefore + localT * segments[closestSegmentIndex]) / totalLength
                        : 0.5;

                    // Compute the signed distance from the cell center to the segment.
                    const segP1 = points[closestSegmentIndex];
                    const segP2 = points[closestSegmentIndex + 1];
                    const vX = segP2.x - segP1.x;
                    const vY = segP2.y - segP1.y;
                    const wX = cellCenter.x - segP1.x;
                    const wY = cellCenter.y - segP1.y;
                    const cross = vX * wY - vY * wX;
                    const vLength = Math.hypot(vX, vY);
                    const signedDistance = vLength ? cross / vLength : 0;
                    console.log("Signed distance from cell center to segment:", signedDistance);

                    console.log("Vulnerability offset:", vulnOffset);
                    console.log("Distance from polyline to cell center:", minDistance);

                    // Store the computed relative location in the cell's attributes
                    cell.set('originalOffset', { 'x': vulnOffset, 'y': signedDistance });
                    console.log("Cell original offset set to:", cell.get('originalOffset'));

                    //cell.set('originalOffset', signedDistance);

                    /*

                    // Create a label on the link at its center if not already present
                    //not needed?
                    if (!linkModel.label(vulnIndex)) {
                        linkModel.label(vulnIndex, {
                            attrs: {
                                text: { text: vulnIndex }
                            },
                            position: {
                                offset: vulnOffset,
                                distance: signedDistance  // center the label along the link
                            }
                        });
                    }
                    // Set the label text to indicate the vulnerability association and signed distance
                    const currentLabel = linkModel.label(vulnIndex);
                    currentLabel.attrs.text.text = `Vuln: ${cell.id} (sd: ${signedDistance.toFixed(2)})`;
                    linkModel.label(vulnIndex, currentLabel);

                    */

                    // Create a callback that moves the vulnerability when the label is moved.
                    // This example listens for changes in the link's vertices and repositions
                    // the vulnerability cell to the midpoint of the link.
                    linkModel.on('change:vertices', () => {
                        // Compute the center (bounding box) of the link.
                        const bbox = linkModel.getBBox();
                        const center = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };
                        console.log("Updated cell position based on link's center", cell);
                        cell.position(center.x, center.y);
                    });
                    // Listen for changes in position of source and target cells.
                    const sourceCell = linkModel.getSourceElement();
                    const targetCell = linkModel.getTargetElement();



                    // Listen for position changes on the source and target cells
                    // This ensures that the vulnerability cell moves with the link if the source or target changes position.
                    const callback = () => handleVulnerabilityAttachment(cell, linkModel);

                    if (!cell._vulnPositionCallbacks) {
                        cell._vulnPositionCallbacks = {};
                    }
                    cell._vulnPositionCallbacks[linkModel.id] = callback;


                    // Attach the callback to the source and target cells
                    [sourceCell, targetCell].forEach(cellModel => {
                        cellModel.on('change:position', callback);
                    });

                    /*
                    [sourceCell, targetCell].forEach(cellModel => {
                        cellModel.on('change:position', () => {
                            // Recalculate the cell’s position so that it remains at the same relative location on the link
                            // Retrieve vulnerability label position which holds the relative offset and distance
                            //const sourceCell = linkModel.getSourceElement();

                            //const targetCell = linkModel.getTargetElement();

                            // Check if the vulnerability is attached to the link.
                            // We're assuming 'cell' here represents the vulnerability.
                            // Adjust property names as needed:
                            const vulnerabilityId = cell.get('id');
                            const linkedTo = cell.get('linkedTo');
                            const attachedVulnerabilities = linkModel.get('attachedVulnerabilities') || [];

                            // Only trigger if the vulnerability is attached:
                            if(linkedTo === null || attachedVulnerabilities.includes(vulnerabilityId)) {
                                return;
                            }
                            //const targetCell = linkModel.getTargetElement();
                            const sourceCenter = sourceCell ? sourceCell.getBBox().center() : linkModel.get('source');
                            const targetCenter = targetCell ? targetCell.getBBox().center() : linkModel.get('target');
                            const newX = (sourceCenter.x + targetCenter.x) / 2;
                            const newY = (sourceCenter.y + targetCenter.y) / 2;
                            const bb = cell.getBBox();

                            // If no original offset is stored, compute and store it (difference between cell’s current center and current link center)
                            const offset = cell.get('originalOffset');
                            console.log("OFFSET", offset)
                            //const sourceCenter = sourceCell ? sourceCell.getBBox().center() : linkModel.get('source');
                            //const targetCenter = targetCell ? targetCell.getBBox().center() : linkModel.get('target');

                            // Use offset.x as a ratio to interpolate between the segment’s start and end.
                            const interpX = sourceCenter.x + offset.x * (targetCenter.x - sourceCenter.x);
                            const interpY = sourceCenter.y + offset.x * (targetCenter.y - sourceCenter.y);

                            // Compute the normalized perpendicular vector to the segment.
                            const dx = targetCenter.x - sourceCenter.x;
                            const dy = targetCenter.y - sourceCenter.y;
                            const segLength = Math.sqrt(dx * dx + dy * dy) || 1;
                            const perpX = -dy / segLength;
                            const perpY = dx / segLength;

                            // Use offset.y (in pixels) along the perpendicular direction.
                            cell.position(
                                interpX - bb.width / 2 + perpX * offset.y,
                                interpY - bb.height / 2 + perpY * offset.y
                            );
                            
                        });
                    });
                    */
                }
            }

        } else if (cellViewsBelow.length) {
            var cellViewBelow = _.find(cellViewsBelow, function (c) { return c.model.id !== cell.id });
            if (cellViewBelow && cellViewBelow.model.get('parent') !== cell.id && cellViewBelow.model.attributes.role == "stakeholder") {
                cellViewBelow.model.embed(cell);
            }
        }
    }

    beginElementResize(cellView, e, x, y) {
        cellView.options.interactive = false;
        this.props.setCellResizing(true);

        // store minimum values of X and Y in state
        // to avoid parent visually excluding child.
        // get pos and size of all children
        var currPos = cellView.model.attributes.position;
        var currSize = cellView.model.attributes.size;

        //var minWidth = 100 + currPos.x;
        //var minHeight = 100 + currPos.y;

        //maybe init as null or 0 or falsy instead
        var maxULX = currPos.x + currSize.width; //max Upper Left X
        var maxULY = currPos.y + currSize.height; //max Upper Left Y

        var minLRX = currPos.x; //min Lower Right X
        var minLRY = currPos.y; //min Lower Right Y

        _.each(cellView.model.getEmbeddedCells(), child => {
            //console.log(child);
            let childPosX = child.attributes.position.x;
            let childPosY = child.attributes.position.y;

            if (childPosX < maxULX) {
                maxULX = childPosX;
            }
            if (childPosY < maxULY) {
                maxULY = childPosY;
            }

            let cX = child.attributes.position.x + child.attributes.size.width;
            let cY = child.attributes.position.y + child.attributes.size.height;

            if (cX > minLRX) {
                minLRX = cX;
            }
            if (cY > minLRY) {
                minLRY = cY;
            }
        });

        let marginOfError = 20;

        this.setState({
            maxULX: maxULX,
            maxULY: maxULY,
            minLRX: minLRX,
            minLRY: minLRY,
            changeXPos: x < cellView.model.attributes.position.x + marginOfError,
            changeYPos: y < cellView.model.attributes.position.y + marginOfError
        });
    }

    resizeElement(cellView, e, x, y) {
        if (!this.props.cellResizing) {

            // if not parent return. 
            if (!cellView.model.get('embeds') || !cellView.model.get('embeds').length) {
                return;
            }

            // If no links or vertices return
            if (!this.state.movingLinks) {
                //console.log('test');
                return;
            }

            var currPos = cellView.model.attributes.position;

            var prevPos = this.state.elementPosition;

            this.setState({ elementPosition: currPos });
            var dx = currPos.x - prevPos.x;
            var dy = currPos.y - prevPos.y;

            var arr = this.state.movingLinks;

            for (let i = 0; i < arr.length; i++) {
                var vertices = arr[i].get('vertices');
                if (vertices && vertices.length) {
                    var newVertices = [];

                    for (let j = 0; j < vertices.length; j++) {
                        newVertices.push({ x: vertices[j].x + dx, y: vertices[j].y + dy });
                    }
                    arr[i].set('vertices', newVertices);
                }
            }
            return;
        }
        //resize cell

        var pos = cellView.model.attributes.position;
        var size = cellView.model.attributes.size;

        let newPosX = pos.x;
        let newPosY = pos.y;

        let minSize = 100;

        let newWidth = x - pos.x;
        let newHeight = y - pos.y;

        //console.log(this.state.maxULX + "  " + pos.x);

        if (this.state.changeXPos) {
            // needs fix
            if (x > this.state.maxULX) {
                newPosX = this.state.maxULX;
                newWidth = size.width - (this.state.maxULX - pos.x);
            } else {
                newPosX = x;
                newWidth = size.width - (x - pos.x);
            }
        } else {
            if (x < this.state.minLRX) {
                newWidth = this.state.minLRX - pos.x;
            }
        }
        if (this.state.changeYPos) {
            if (y > this.state.maxULY) {
                newPosY = this.state.maxULY
                newHeight = size.height + (pos.y - this.state.maxULY);
            } else {
                newPosY = y;
                newHeight = size.height + (pos.y - y);
            }
        } else {
            if (y < this.state.minLRY) {
                newHeight = this.state.minLRY - pos.y;

            }
        }

        newWidth = (newWidth < minSize) ? minSize : newWidth;
        newHeight = (newHeight < minSize) ? minSize : newHeight;

        //console.log(newWidth + "  " + newHeight);
        //console.log('cellview.model: ', cellView.model);
        //set this as part of state?
        cellView.model.set({
            position: { x: newPosX, y: newPosY },
            size: { width: newWidth, height: newHeight }
        });
        //cellView.model.attr({
        //    cornerBox: {d: 'M 0 120 H 120 120 V 120 0'}
        //})

        // To make the highlight follow the actual border
        cellView.unhighlight();
        cellView.highlight();
    }

    beginMovePaper(e, x, y) {
        console.log('HELLO');
        this.setState({ paperMove: { moving: true, x, y } });
    }

    movePaper(e, x, y) {
        if (this.state.paperMove.moving) {
            const { tx, ty } = this.paper.translate();
            this.paper.translate(tx + (x - this.state.paperMove.x), ty + (y - this.state.paperMove.y));
        }
    }

    endMovePaper(e, x, y) {
        if (this.state.paperMove.moving) {
            this.setState({ paperMove: { moving: false } })
        }
    }

    onHover(cellView, evt) {
        //console.log(cellView);
        if (cellView.model.attributes.type === 'coras.roundRectElement' || cellView.model.attributes.type === 'coras.riskElement') { //WIP    
            var cell = cellView.model;

            cellView.highlight();
            // show subelement of rect
            //cell.attr('corners/visibility', 'visible');
            //groupselector not working for some reason
            cell.attr({
                sizeSelectorUL: { visibility: 'visible' },
                sizeSelectorUR: { visibility: 'visible' },
                sizeSelectorLL: { visibility: 'visible' },
                sizeSelectorLR: { visibility: 'visible' }
            });
        } else {
            cellView.showTools();
        }
    }

    exitHover(cellView, evt) {
        //var cell = cellView.model;
        if (cellView.model.attributes.type === 'coras.roundRectElement' || cellView.model.attributes.type === 'coras.riskElement') { //WIP    
            var cell = cellView.model;

            cellView.unhighlight();
            //cell.attr('corners/visibility', 'hidden');
            cell.attr({
                sizeSelectorUL: { visibility: 'hidden' },
                sizeSelectorUR: { visibility: 'hidden' },
                sizeSelectorLL: { visibility: 'hidden' },
                sizeSelectorLR: { visibility: 'hidden' }
            });
        } else {
            cellView.hideTools();
        }
    }

    updatePaperSize() {
        this.paper.setDimensions(
            document.getElementById(this.paperWrapperId).offsetWidth - 10,
            document.getElementById(this.paperWrapperId).offsetHeight - 10);
    }

    removeLink(elementView, e, x, y) {
        if (!this.state.linkToRemove) this.setState({ linkToRemove: elementView });
        else if (this.state.linkToRemove === elementView) {
            this.setState({ linkToRemove: null });
            elementView.model.remove();
        } else this.setState({ linkToRemove: null });
    }

    paperOnMouseUp(e) {
        e.preventDefault();
        console.log("Checking dropping");
        const localPoint = this.paper.pageToLocalPoint(e.pageX, e.pageY);
        this.props.elementDropped(this.paper.model, localPoint.x, localPoint.y);
        var cellView = this.paper.findViewByModel(this.props.newElement);
        //console.log(cellView);
        this.embedElement(cellView);
    }

    //Only used for adding elements via external API calls. TODO
    addElement(element) {
        //const localPoint = this.paper.pageToLocalPoint(e.pageX, e.pageY);
        let testX = 1500
        let testY = -300

        var newElement = this.props.newElement
        console.log("new element", this.props.newElement)
        this.props.elementDropped(this.paper.model, testX, testY);
        var cellView = this.paper.findViewByModel(element);
        console.log("CELLVIEW", cellView);
        this.embedElement(cellView);
    }

    saveGraphToFile(fileName) {
        const a = document.createElement('a');
        const graphContent = new Blob([JSON.stringify(this.graph.toJSON(), null, 2)], { type: 'text/plain' });
        a.href = URL.createObjectURL(graphContent);
        //a.download = "CORASDiagram.json";
        a.download = fileName + ".json";
        var dag = getDAG(this.graph);
        a.click();
        a.remove();

        const newGraphContent = new Blob([JSON.stringify(dag, null, 2)], { type: 'text/plain' });
        a.href = URL.createObjectURL(newGraphContent);
        a.download = fileName + "_DAG.json";
        a.click();
        a.remove();




    }


    createElementFromDAG(type, id, label, posX, posY) {
        const svg = ToolDefinitions.find(tool => tool.role === type);
        const shape = svg.shapeFn();
        //console.log(`SVG `, svg)

        var elementString = label

        if (svg.attrs)
            Object.keys(svg.attrs).map((key, index) => shape.attr(key, svg.attrs[key]));

        const styles = svg.perspectives[0];
        //console.log(`STYLES `, styles)
        Object.keys(styles).forEach((ref) => shape.attr(ref, styles[ref]));
        //shape.attr("text/text", svg.text);
        shape.attr("text/text", elementString);
        shape.attr("value/text", "");
        //shape.set('perspective', currentPerspective); // Unsure if needed
        shape.set('perspectives', svg.perspectives);
        shape.set('role', svg.role);
        shape.set('id', id);
        shape.set('valueType', svg.valueType); //maybe store info outside svg object instead?
        // a bit careful with these, some assumptions are made
        // set custom fill color in ellipse and rect
        if (svg.indicatorType) {
            shape.set('indicatorType', svg.indicatorType);
            shape.set('indicatorValue', 2); //sets indicator value to 1.0 by default
            shape.attr("body/fill", indicatorTypes[svg.indicatorType]);
            shape.attr("innerBody/fill", indicatorTypes[svg.indicatorType]);
        }
        // set magnet attribute, only used for vulnerabilities now.
        if (svg.magnet) {
            shape.attr("linkHandler/magnet", svg.magnet);
        }
        shape.resize(svg.width || 100, svg.height || 60);
        shape.position(posX, posY);
        return shape;
    }

    createGraphFromDAG(content) {
        // Create a new JointJS graph from the DAG content using iterative layout.
        const graph = new dia.Graph({}, { cellNamespace: namespace });

        //Log occupied positions on the canvas
        const occupiedPositions = {};

        // Create a map for quick node lookup.
        const nodeMap = {};
        content.nodes.forEach(node => {
            nodeMap[node.id] = node;
        });

        // Build mapping for outgoing edges: source id -> array of target ids.
        const outgoing = {};
        content.edges.forEach(edge => {
            if (!outgoing[edge.source]) {
                outgoing[edge.source] = [];
            }
            outgoing[edge.source].push(edge.target);
        });
        console.log("Outgoing", outgoing);
        // Determine levels via BFS.
        // Level 0: all threat sources placed at X = 0.
        const nodeLevels = {};
        const queue = [];
        content.nodes.forEach(node => {
            if (node.type.startsWith('threat_source')) {
                nodeLevels[node.id] = 0;
                queue.push(node.id);
            }
        });
        while (queue.length) {
            const currId = queue.shift();
            const currLevel = nodeLevels[currId];
            const targets = outgoing[currId] || [];
            targets.forEach(targetId => {
                if (nodeLevels[targetId] === undefined || nodeLevels[targetId] > currLevel + 1) {
                    nodeLevels[targetId] = currLevel + 1;
                    queue.push(targetId);
                }
            });
        }

        // Group nodes by level.
        const levels = {};
        Object.keys(nodeLevels).forEach(nodeId => {
            const level = nodeLevels[nodeId];
            if (!levels[level]) levels[level] = [];
            levels[level].push(nodeMap[nodeId]);
        });

        // Create elements level by level.
        // For each level, X is level * 500.
        // Y positions: nodes are spaced 400 apart and centered (middle element near y=0).
        Object.keys(levels).forEach(levelKey => {
            const level = parseInt(levelKey, 10);
            const nodesInLevel = levels[level];
            // Sort nodes to get deterministic ordering.
            nodesInLevel.sort((a, b) => a.id.localeCompare(b.id));
            const count = nodesInLevel.length;
            const yOffset = ((count - 1) / 2) * 400;
            nodesInLevel.forEach((node, index) => {
                const posX = level * 500;
                const posY = index * 400 - yOffset;
                const element = this.createElementFromDAG(node.type, node.id, node.label, posX, posY);
                console.log("element", element);
                //new joint.shapes.basic.Rect({
                //    id: node.id,
                //    position: { x: posX, y: posY },
                //    size: { width: node.width || 100, height: node.height || 60 },
                //    attrs: { text: { text: node.label } }
                //});
                graph.addCell(element);
            });
        });

        // Add edges.
        content.edges.forEach(edge => {
            const link = new shapes.coras.defaultLink();
            link.source({ id: edge.source });
            link.target({ id: edge.target });
            graph.addCell(link);


            console.log("Link found for edge", edge);
            // Get source and target elements from the graph
            const sourceCell = graph.getCell(edge.source);
            const targetCell = graph.getCell(edge.target);
            if (sourceCell && targetCell) {
                // Compute center positions of the source and target elements
                const sourcePos = sourceCell.get('position');
                const sourceSize = sourceCell.get('size');
                const targetPos = targetCell.get('position');
                const targetSize = targetCell.get('size');
                const sourceCenter = {
                    x: sourcePos.x + sourceSize.width / 2,
                    y: sourcePos.y + sourceSize.height / 2
                };
                const targetCenter = {
                    x: targetPos.x + targetSize.width / 2,
                    y: targetPos.y + targetSize.height / 2
                };
                // Calculate midpoint and perpendicular vector for offsetting vulnerabilities
                const midPoint = {
                    x: (sourceCenter.x + targetCenter.x) / 2,
                    y: (sourceCenter.y + targetCenter.y) / 2
                };
                const dx = targetCenter.x - sourceCenter.x;
                const dy = targetCenter.y - sourceCenter.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const perp = { x: -dy / len, y: dx / len };
                const vulnCount = edge.vulnerabilities.length;
                const offsetDistance = 30; // distance in pixels between vulnerabilities
                // Place each vulnerability along a line perpendicular to the edge at its midpoint
                edge.vulnerabilities.forEach((vulnId, index) => {
                    //let vulnCell = graph.getCell(vulnId);
                    //console.log("Vulnerability cell", vulnCell);

                    // If the vulnerability element does not exist, create and add it to the graph
                    /*
                    if (!vulnCell) {
                        vulnCell = new shapes.coras.riskElement({
                            id: vulnId,
                            attrs: { text: { text: 'Vulnerability' } }
                        });
                        vulnCell.set('role', 'vulnerability');
                        // Set a temporary position; it will be updated below
                        vulnCell.position(midPoint.x, midPoint.y);
                        graph.addCell(vulnCell);
                    }*/
                    // Distribute vulnerabilities evenly: center aligned if multiple exist
                    // Place vulnerabilities as follows:
                    // First one: near the source and "under" (offset downward)
                    // Subsequent ones: near the target – alternating above and under.
                    const t = (index + 1) / (vulnCount + 1);
                    const basePoint = {
                        x: sourceCenter.x + t * (targetCenter.x - sourceCenter.x),
                        y: sourceCenter.y + t * (targetCenter.y - sourceCenter.y),
                    };
                    const newPos = basePoint;
                    //vulnCell.position(newPos.x, newPos.y);

                    const vulnObj = content.nodes.find(node => node.id === vulnId);
                    if (vulnObj) {
                        // Example: extract id, label, and type from the found object
                        const { id, label, type } = vulnObj;
                        // Use vulnObj as needed, e.g., logging or creating a diagram element
                        console.log('Found vulnerability object:', vulnObj);
                        let vulnCell = this.createElementFromDAG(type, id, label, newPos.x, newPos.y)
                        graph.addCell(vulnCell);
                        // Update the link's vulnerabilities list (create or append)
                        vulnCell.set('linkedTo', link.id);
                        let linkedVulns = link.get('vulnerabilities') || [];
                        if (!linkedVulns.includes(vulnId)) {
                            linkedVulns.push(vulnId);
                            link.set('vulnerabilities', linkedVulns);
                        }
                    }


                });
            }
        });

        // Set the graph's attributes
        // Set the new graph on the paper.
        //this.paper.model = graph;
        this.graph.fromJSON(graph.toJSON());

    }

    loadGraphFromFile(e) {
        const filePath = e.target;
        const reader = new FileReader();
        if (filePath.files && filePath.files[0]) {
            reader.addEventListener('load', (e) => {
                const content = JSON.parse(e.target.result);
                // Check if the first JSON property is 'nodes'
                if (content && content.nodes) {
                    console.log("Loading as DAG JSON");
                    // Call external function to create a graph from the DAG JSON
                    this.createGraphFromDAG(content);
                } else {
                    // Load as a standard JointJS graph
                    this.graph.fromJSON(content);
                }
                this.initGraph();
            }, { once: true });
            reader.readAsText(filePath.files[0]);
            filePath.value = "";
        }
    }

    clearGraph(e) {
        this.graph.clear();
        window.localStorage.removeItem(this.paperId + "graph_" + this.props.currGraph.label);
        if (this.props.initialDiagram) this.graph.fromJSON(this.props.initialDiagram);
        this.props.clearConfirmed();
    }

    downloadSvg(fileName) {
        let svgElement = this.paper.svg;
        const toolElems = svgElement.getElementsByClassName("link-tools");
        const arrowElems = svgElement.getElementsByClassName("marker-arrowhead");

        const toolArray = Array.from(toolElems);
        const arrowArray = Array.from(arrowElems);

        toolArray.forEach((elem) => elem.remove());
        arrowArray.forEach((elem) => elem.remove());

        // Add other standard font
        //svgElement.style.fontFamily = "Oswald, sans-serif";

        //get svg source.
        let serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);

        //add name spaces.
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        // Fix svg size
        let search = /(<svg xmlns="\S*" xmlns:xlink="\S*" version="\S*" id="\S*" width=)\S*( height=)\S*(>)/gm;
        let replace = `$1"${this.paperRef.current.offsetWidth}px"$2"${this.paperRef.current.offsetHeight}px"$3`
        source = source.replace(search, replace);

        //add xml declaration
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

        //convert svg source to URI data scheme.
        let url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

        let a = document.createElement('a');
        a.href = url;
        a.download = fileName + ".svg";
        a.click();
        a.remove();
    }

    cellToolHandleMoved(e) {
        //console.log('Celltoolhandlemoved');
        const { pageX, pageY } = e;

        const newHeight = pageY - (this.props.cellTool.position.y + this.props.cellToolHeight) + this.props.cellToolHeight;

        if (this.props.cellTool.handleHeld) this.props.cellHandleMoved(this.props.cellToolWidth, newHeight);
    }

    // not sure how to do through redux
    changeGraph(label) {
        var graph = new dia.Graph({}, { cellNamespace: namespace }); //stupid hack
        if (this.props.graphs[label].graph === null) {
            this.props.setGraph(label, graph.toJSON(), this.paper.scale(), this.paper.translate());
        } else {
            graph.fromJSON(this.props.graphs[label].graph);
        }

        //assume that graph is JSONgraph
        this.props.setGraph(this.props.currGraph.label, this.graph.toJSON(), this.paper.scale(), this.paper.translate());
        this.props.setCurrGraph(label, graph.toJSON());
        //this.paper.model = graph; 
        this.graph.fromJSON(graph.toJSON());
        let { sx, sy } = this.props.graphs[label].scale;
        let { tx, ty } = this.props.graphs[label].position;
        this.paper.scale(sx, sy);
        this.paper.translate(tx, ty);
        this.initGraph();
    }

    setCurrGraph() {
        this.props.setCurrGraph(this.props.currGraph.label, this.graph.toJSON());
    }


    render() {
        return (
            <div className="editor-wrapper">
                <EditorMenu
                    loadStartFn={() => this.loadRef.current.click()}
                    loadFn={this.loadGraphFromFile}
                    loadRef={this.loadRef}
                    saveFn={this.saveGraphToFile}
                    clearFn={this.clearGraph}
                    showClearModal={this.props.showClearModal}
                    clearPosition={this.props.clearPosition}
                    clearClicked={this.props.clearClicked}
                    downloadFn={this.downloadSvg}
                    currDiagram={this.props.currGraph.label}
                    setModalPosition={this.props.setModalPosition}
                    calculateRisk={this.calculateRisk}
                    toolElementClicked={this.props.toolElementClicked}
                    indicatorTypes={this.props.indicatorTypes}
                    addElement={this.addElement}
                />
                <DiagramSelector
                    isInteractive={this.props.interactive}
                    handleScroll={this.handleScroll}
                    handleScrollBlank={this.handleScrollBlank}
                    beginMovePaper={this.beginMovePaper}
                    movePaper={this.movePaper}
                    endMovePaper={this.endMovePaper}
                    updatePaperSize={this.updatePaperSize}
                    changeGraph={this.changeGraph}
                />
                {this.props.elementEditor.visible ? <ElementEditor
                    {...this.props.elementEditor.data}
                    cancel={this.props.elementEditorCancel}
                    save={this.props.elementEditorSave}
                    setCurrGraph={this.setCurrGraph}
                    delete={this.props.elementEditorDelete}
                    labelOnChange={this.props.elementEditorLabelEdit}
                    valueOnChange={this.props.elementEditorValueEdit}
                    xOnChange={this.props.elementEditorChangeX}
                    yOnChange={this.props.elementEditorChangeY}
                    heightChange={this.props.elementEditorChangeHeight}
                    widthChange={this.props.elementEditorChangeWidth}
                    sizeChange={this.props.elementEditorChangeSize}
                    showClearModalElement={this.props.showClearModalElement}//
                    clearPosition={this.props.clearPosition}//
                    clearClicked={this.props.clearClicked}//
                    elementChangeIndicatorType={this.props.elementChangeIndicatorType}
                    elementChangeIndicatorValue={this.props.elementChangeIndicatorValue}
                    perspectiveOnChange={this.props.elementEditorChangePerspective} /> : null}
                {this.props.infoBox.visible ?
                    <InfoBox />
                    : null}
                <div
                    id={this.paperWrapperId}
                    className="editor-paper"
                    onDragEnter={(e) => e.preventDefault()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={this.paperOnMouseUp}
                    style={{ width: `${this.props.width}px`, height: `${this.props.height}px` }}
                    ref={this.paperRef} >
                    <div id={this.paperId}></div>
                </div>
                {this.props.interactive || this.props.interactive === undefined ?
                    <EditorTool toolDefinitions={ToolDefinitions} paper={this.paper} /> : null}
            </div>);
    }
}

export default connect((state) => ({
    elementEditor: state.editor.elementEditor,
    showClearModal: state.editor.editorMenu.showClearModal,
    showClearModalElement: state.editor.editorMenu.showClearModalElement,
    clearPosition: state.editor.editorMenu.clearPosition,
    cellTool: state.editor.cellTool,
    cellToolWidth: state.editor.cellTool.size.width,
    cellToolHeight: state.editor.cellTool.size.height,
    graphs: state.editor.graphs,
    currGraph: state.editor.currGraph,
    diagramTypes: state.editor.diagramTypes,
    cellResizing: state.editor.cellResizing,
    elementPosition: state.editor.elementPosition,
    movingLinks: state.editor.movingLinks,
    newElement: state.editor.movement.element,
    infoBox: state.editor.infoBox,
    indicatorTypes: state.editor.indicatorTypes,
    risk: state.editor.risk

}), (dispatch) => ({
    elementRightClicked: (element, graph) => dispatch(ElementRightClicked(element, graph)),
    elementDoubleClicked: (element, event) => dispatch(ElementDoubleClicked(element, event)),
    elementEditorCancel: () => dispatch(ElementEditorCancel()),
    elementEditorSave: () => dispatch(ElementEditorSave()),
    elementEditorDelete: () => dispatch(ElementEditorDelete()),
    elementEditorLabelEdit: (label) => dispatch(ElementLabelEdit(label)),
    elementEditorValueEdit: (value) => dispatch(ElementValueEdit(value)),
    elementEditorChangeX: (x) => dispatch(ElementChangeX(x)),
    elementEditorChangeY: (y) => dispatch(ElementChangeY(y)),
    elementEditorChangeHeight: (height) => dispatch(ElementChangeHeight(height)),
    elementEditorChangeWidth: (width) => dispatch(ElementChangeWidth(width)),
    elementEditorChangeSize: (size) => dispatch(ElementChangeSize(size)),
    elementEditorChangePerspective: (perspective) => dispatch(ElementChangePerspective(perspective)),
    elementDropped: (graph, pageX, pageY) => dispatch(ToolElementRelease(graph, pageX, pageY)),
    clearClicked: (e) => dispatch(MenuClearClicked(e)),
    clearConfirmed: () => dispatch(MenuClearConfirmed()),
    cellClicked: (x, y, width, height) => dispatch(CellClicked(x, y, width, height)),
    cellHandleClicked: (handle) => dispatch(CellHandleClicked(handle)),
    cellHandleReleased: () => dispatch(CellHandleRelased()),
    cellHandleMoved: (width, height) => dispatch(CellHandleMoved(width, height)),
    clearGraph: (label) => dispatch(ClearGraph(label)),
    setGraph: (label, graph, scale, position) => dispatch(SetGraph(label, graph, scale, position)),
    setCurrGraph: (label, graph) => dispatch(SetCurrGraph(label, graph)),
    setCellResizing: (boolean) => dispatch(SetCellResizing(boolean)),
    setElementPosition: (pos) => dispatch(SetElementPosition(pos)),
    setMovingLinks: (arr) => dispatch(SetMovingLinks(arr)),
    toggleInfoBox: (pos, bool, category, id) => dispatch(ToggleInfoBox(pos, bool, category, id)),
    setEditorPosition: (pos) => dispatch(SetEditorPosition(pos)),
    setModalPosition: (pos) => dispatch(SetModalPosition(pos)),
    elementChangeIndicatorType: (indicatorType) => dispatch(ElementChangeIndicatorType(indicatorType)),
    elementChangeIndicatorValue: (indicatorValueLabel, indicatorValue) => dispatch(ElementChangeIndicatorValue(indicatorValueLabel, indicatorValue)),
    toolElementClicked: (element, width, height) => dispatch(ToolElementClicked(element, width, height)),
}))(Editor);
