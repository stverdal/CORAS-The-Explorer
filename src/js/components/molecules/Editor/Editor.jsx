import React from 'react';
import joint from 'jointjs';

import ElementEditor from './ElementEditor';
import EditorTool from './EditorTool';

import "../../../../../node_modules/jointjs/dist/joint.css";
import './editor.css';

import AddCorasShapes from './CORASShapes.js';

AddCorasShapes(joint);

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

        this.graph = new joint.dia.Graph();
        this.toolGraph = new joint.dia.Graph();

        this.initializeEditorHandlers = this.initializeEditorHandlers.bind(this);
        this.handleScroll = this.handleScroll.bind(this);
        this.handleScrollBlank = this.handleScrollBlank.bind(this);
        this.beginMovePaper = this.beginMovePaper.bind(this);
        this.movePaper = this.movePaper.bind(this);
        this.endMovePaper = this.endMovePaper.bind(this);
        this.updatePaperSize = this.updatePaperSize.bind(this);
        this.addLink = this.addLink.bind(this);
        this.removeLink = this.removeLink.bind(this);
        this.edit = this.edit.bind(this);

        this.closeElementEditor = this.closeElementEditor.bind(this);

        this.getPaperOffset = this.getPaperOffset.bind(this);
        this.getPaperHeight = this.getPaperHeight.bind(this);
        this.getPaperWidth = this.getPaperWidth.bind(this);
        this.getPaperTranslation = this.getPaperTranslation.bind(this);

        this.paperId = this.props.paperId || 'paper-holder';
        this.paperWrapperId = `${this.paperId}-wrapper`;

        this.state = {
            currentLink: null,
            elementEditor: {
                visible: false,
                data: {
                    isLink: false,
                    position: {
                        left: 0,
                        top: 0
                    },
                    elementView: null,
                    e: null,
                    x: null,
                    y: null,
                    graph: null,
                    paper: null,

                }
            }
        }
    }

    componentDidMount() {
        this.initializeEditorHandlers();
    }

    componentWillUnmount() {
        window.removeEventListener('resize', this.updatePaperSize);
    }

    closeElementEditor() {
        this.setState((prevstate) => {
            prevstate.elementEditor.visible = false;
            return prevstate;
        });
    }

    initializeEditorHandlers() {
        this.paper = new joint.dia.Paper({
            el: document.getElementById(this.paperId),
            model: this.graph,
            width: document.getElementById(this.paperWrapperId).offsetWidth - 10,
            height: document.getElementById(this.paperWrapperId).offsetHeight - 10,
            gridSize: 1,
            background: {
                color: 'rgba(255, 255, 255, 1)',
            },
            interactive: this.props.interactive === undefined ? true : this.props.interactive
        });

        if (this.props.initialDiagram) {
            // We have an initial diagram
            this.graph.fromJSON(this.props.initialDiagram);
        }

        window.addEventListener('resize', this.updatePaperSize);

        window.paper = this.paper;

        if (this.props.interactive === undefined ? true : this.props.interactive) {
            this.paper.on('element:contextmenu', this.addLink);
            this.paper.on('link:contextmenu', this.removeLink);
            this.paper.on('cell:pointerdblclick', this.edit);

            this.paper.on('cell:mousewheel', this.handleScroll);
            this.paper.on('blank:mousewheel', this.handleScrollBlank);

            this.paper.on('blank:pointerdown', this.beginMovePaper);
            this.paper.on('blank:pointermove', this.movePaper);
            this.paper.on('blank:pointerup', this.endMovePaper);
        }
    }

    handleScroll(cellView, e, x, y, delta) {
        const scaleFactor = 1.1;
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

    beginMovePaper(e, x, y) {
        this.setState({ paperMove: { moving: true, x, y } });
    }

    movePaper(e, x, y) {
        if (this.state.paperMove.moving) {
            const { tx, ty } = this.paper.translate();
            this.paper.translate(tx + (x - this.state.paperMove.x), ty + (y - this.state.paperMove.y));
        }
    }

    endMovePaper(e, x, y) {
        this.setState({ paperMove: { moving: false } })
    }

    updatePaperSize() {
        this.paper.setDimensions(
            document.getElementById(this.paperWrapperId).offsetWidth - 10,
            document.getElementById(this.paperWrapperId).offsetHeight - 10);
    }

    addLink(elementView, e, x, y) {
        if (!this.state.link) {
            this.setState({ sourceElem: elementView });
            // Start of link creation
            this.setState({ link: new joint.shapes.standard.Link() });
            this.state.link.source(elementView.model);
        } else {
            // End of link creation
            if (this.state.sourceElem !== elementView) {
                this.state.link.target(elementView.model);
                this.state.link.addTo(this.graph);
            } else elementView.model.remove();
            this.setState({ sourceElem: null });
            this.setState({ link: null });
        }
    }

    removeLink(elementView, e, x, y) {
        if (!this.state.linkToRemove) this.setState({ linkToRemove: elementView });
        else if (this.state.linkToRemove === elementView) {
            this.setState({ linkToRemove: null });
            elementView.model.remove();
        } else this.setState({ linkToRemove: null });
    }

    edit(elementView, e, x, y) {
        this.setState({
            elementEditor: {
                visible: true,
                data: {
                    isLink: elementView.model.isLink(),
                    position: {
                        left: e.pageX,
                        top: e.pageY
                    },
                    elementView,
                    e,
                    x,
                    y
                }
            }
        })
    }

    getPaperOffset() {
        return this.paper.$el.offset();
    }

    getPaperHeight() {
        return this.paper.$el.height();
    }

    getPaperWidth() {
        return this.paper.$el.width();
    }

    getPaperTranslation() {
        return this.paper.translate();
    }

    render() {
        return (
            <div>
                {this.state.elementEditor.visible ? <ElementEditor {...this.state.elementEditor.data} closeFn={this.closeElementEditor} /> : null}
                <div id={this.paperWrapperId} className="editor-paper" style={{ width: `${this.props.width}px`, height: `${this.props.height}px` }}>
                    <div id={this.paperId}></div>
                </div>
                {this.props.interactive || this.props.interactive === undefined ?
                     <EditorTool
                        offset={this.getPaperOffset}
                        height={this.getPaperHeight}
                        width={this.getPaperWidth}
                        translate={this.getPaperTranslation}
                        graph={this.graph} /> : null}
            </div>);
    }
}

export default Editor;
