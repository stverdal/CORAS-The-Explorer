import { flip, set } from 'lodash';
import React, { useState } from 'react';
import { propTypes } from 'react-bootstrap/esm/Image';
//import { connect } from 'react-redux';
import Modal from '../../atoms/Modal/Modal';
import SpyderBar from './SSMQueries';
import regeneratorRuntime from "regenerator-runtime";
import ToolDefinitions from './ToolDefinitions';



const EditorMenu = ({ loadStartFn, loadRef, loadFn, saveFn, clearFn, showClearModal, clearClicked, clearPosition, downloadFn, currDiagram, setModalPosition, calculateRisk, toolElementClicked, indicatorTypes, addElement }) => {

    const [fileModalBool, setFileModalBool] = useState(false);
    const [svgModalBool, setSvgModalBool] = useState(false);
    const [fileName, setFileName] = useState('My diagram');
    const [svgName, setSvgName] = useState('My diagram svg');

    ////////////////

    const [data, setData] = useState('')
    const [ip, setIp] = useState('host.docker.internal')
    const [port, setPort] = useState('8089')
    const [id, setId] = useState('dvbmgmah3ube0sgoio16viu7omc5pckku2v5td1708s0t8rvv0i6dsh2a8d95g7uh0f2hendf9djuhtbdpa7dnh7uqnksomptsd2sj')
    const [entity, setEntity] = useState('misbehaviourSets')
    const [path, setPath] = useState('');
    const [attackPathURI, setAttackPathURI] = useState('/threatgraph?riskMode=FUTURE&allPath=false&normalOperations=false&targetURIs=')
    const [misbehaviourSet, setMisbehaviourSet] = useState('')
    const [veryHighMisbehaviours, setVeryHighMisbehaviours] = useState({})
    const [threats, setThreats] = useState('')
    const [actors, setActors] = useState('');
    const [actorlabels, setActorLabels] = useState('');
    const [actorCoordinates, setActorCoordinates] = useState({})
    const [currThreats, setCurrThreats] = useState([])
    const [showthreats, setShowThreats] = useState(false)
    const [detailsModal, setDetailsModal] = useState(false)
    const [selectedThreat, setSelectedThreat] = useState(null)
    const [currAsset, setCurrAsset] = useState(null)
    const [searchString, setSearchString] = useState('')
    const [fetchModalBool, setFetchModalBool] = useState(false)
    const [fetchInput, setFetchInput] = useState('')

    ////////////////////

    const onFileNameChange = (e) => {
        setFileName(e.target.value);
    }

    const onSvgNameChange = (e) => {
        setSvgName(e.target.value);
    }

    const saveFile = (e) => {
        e.preventDefault();
        saveFn(fileName);
        //flipFileBool();
        setFileModalBool(false);
    }

    const saveSVG = (e) => {
        e.preventDefault();
        downloadFn(svgName);
        //flipSvgModalBool();
        setSvgModalBool(false); //force
    }

    const flipFileBool = (e) => {
        setPosition(e);
        setFileModalBool(!fileModalBool);
    }

    const flipSvgModalBool = (e) => {
        setPosition(e);
        setSvgModalBool(!svgModalBool);
    }

    const setPosition = (e) => {
        setModalPosition({ top: `${e.pageY}px`, left: `${e.pageX}px` });
    }


    const createElement = (elementType, threat = null) => {
        console.log(ToolDefinitions)
        const svg = ToolDefinitions.find(tool => tool.role === elementType);
        const shape = svg.shapeFn();
        console.log("svg", svg)

        var elementString = svg.name
        if (threat !== null && currThreats.length > 0) {
            //Get from consequence scales
            var threatLevels = {
                "Very High": 0,
                "High": 0,
                "Medium": 0,
                "Low": 0,
                "Very Low": 0
            }
            for (let threat of currThreats) {
                threatLevels[threat.riskLevel.label] += 1
            }
            if (threatLevels["Very High"] > 0) {
                //shape.attr("body/fill", "#FF0000");
                //shape.attr("innerBody/fill", "#FF0000");
                elementString = threatLevels["Very High"] + " Very High risk \nthreats detected \ntargeting asset\n"+ currAsset.label 
            } else if (threatLevels["High"] > 1) {
                elementString = threatLevels["High"] + " High risk \nthreats detected \ntargeting asset\n"+ currAsset.label
            }
            //elementString = threat.description

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

            toolElementClicked(shape, svg.width, svg.height)
            addElement(shape)
        }
    }

    const fetchApi = async () => {
        var mainAsset = {}
        var mainAssetId = ''
        var mainThreats = []



        console.log("API")
        try {
            const result = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/assets/`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            var assetLabels = []
            const assertedAssets = result.filter(asset => asset.asserted === true);
            console.log("Api result", assertedAssets)
            //let searchString = 'HealthData'
            let searchString = fetchInput
            for (let asset of assertedAssets) {
                //console.log(asset)
                if (asset.label && asset.label.includes(searchString)) {
                    //setMainAsset(asset)
                    //setMainAssetId(asset.id)
                    mainAsset = asset
                    mainAssetId = asset.ids
                    setCurrAsset(asset)
                    console.log("Main asset", asset)
                }
            }

        } catch (err) {
            console.log(err.message)
        }
        try {
            const result = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/threats/`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            var assetLabels = []
            //const assertedAssets = assets.filter(asset => asset.asserted === true);

            for (let threat of result) {
                //console.log(threat)
                if (threat.threatensAssets === mainAsset.uri) {
                    mainThreats.push(threat)
                    //console.log("Main threat", threat)
                    //console.log("ThreatensAssets",threat.threatensAssets)
                }
            }

        } catch (err) {
            console.log(err.message)
        }

        for (let threat of mainThreats) {
            console.log("Main threats", threat)
        }

        setCurrThreats(mainThreats)
        setShowThreats(true)
    }



    return (
        <div className="editor-menu">
            <button className="editor-menu__button" onClick={loadStartFn}>Load</button>
            <input type="file" name="loadFile" label="Load" className="editor-menu__hidden" onChange={loadFn} ref={loadRef} />
            <button className="editor-menu__button" onClick={flipFileBool}>Save</button>
            <Modal isOpen={fileModalBool} noBackground={true} position={clearPosition}>
                <div className="editor-clear-modal">
                    <div className="editor-clear-modal__description">
                        Download the {currDiagram} diagram?
                    </div>
                    <input id="fileName-input" className="element-menu-input" type="string" value={fileName} onChange={onFileNameChange} />
                    <button className="editor-clear-modal__button editor-clear-modal__button--danger" onClick={saveFile}>
                        Save
                    </button>
                    <button className="editor-clear-modal__button editor-clear-modal__button" onClick={flipFileBool}>
                        No, cancel
                    </button>
                </div>
            </Modal>
            <button className="editor-menu__button" onClick={clearClicked}>Clear</button>
            <Modal isOpen={showClearModal} noBackground={true} position={clearPosition}>
                <div className="editor-clear-modal">
                    <div className="editor-clear-modal__description">
                        Are you sure you want to clear the {currDiagram} diagram?
                    </div>
                    <button className="editor-clear-modal__button editor-clear-modal__button--danger" onClick={clearFn}>
                        Yes, clear
                    </button>
                    <button className="editor-clear-modal__button editor-clear-modal__button" onClick={clearClicked}>
                        No, cancel
                    </button>
                </div>
            </Modal>
            <button className="editor-menu__button" onClick={flipSvgModalBool}>Download (SVG)</button>
            <Modal isOpen={svgModalBool} noBackground={true} position={clearPosition}>
                <div className="editor-clear-modal">
                    <div className="editor-clear-modal__description">
                        Download the {currDiagram} diagram?
                    </div>
                    <input id="fileName-input" className="element-menu-input" type="string" value={svgName} onChange={onSvgNameChange} />
                    <button className="editor-clear-modal__button editor-clear-modal__button--danger" onClick={saveSVG}>
                        Save
                    </button>
                    <button className="editor-clear-modal__button editor-clear-modal__button" onClick={flipSvgModalBool}>
                        No, cancel
                    </button>
                </div>
            </Modal>
            <button className="editor-menu__button" onClick={calculateRisk}>Recalculate</button>
            <button className="editor-menu__button" onClick={() => setFetchModalBool(true)}>
                Get suggestions from the SSM
            </button>

            {/* New modal for text input before running fetchApi */}
            <Modal
                isOpen={fetchModalBool}
                noBackground={true}
                position={{ top: "6%", left: "42%", transform: "translate(-25%, -25%)" }}
            >
                <div className="editor-fetch-modal">
                    <div className="editor-fetch-modal__description">
                        Enter parameter before fetching:
                    </div>
                    <input
                        className="element-menu-input"
                        type="text"
                        value={fetchInput}
                        onChange={(e) => setFetchInput(e.target.value)}
                    />
                    <button
                        className="editor-fetch-modal__button editor-fetch-modal__button--danger"
                        onClick={() => {
                            // Optionally use fetchInput here before running fetchApi
                            fetchApi();
                            setFetchModalBool(false);
                        }}
                    >
                        Fetch
                    </button>
                    <button
                        className="editor-fetch-modal__button"
                        onClick={() => setFetchModalBool(false)}
                    >
                        Cancel
                    </button>
                </div>
            </Modal>

            <Modal
                isOpen={showthreats}
                noBackground={true}
                position={{ top: "25%", left: "25%", transform: "translate(-25%, -25%)" }}
            >
                <div className="editor-threats-modal">
                    <div className="editor-threats-modal__description">
                        {currDiagram} Threats
                    </div>
                    {currThreats && currThreats.length ? (
                        <table
                            className="editor-threats-table"
                            style={{ borderCollapse: 'collapse', width: '100%' }}
                        >
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #000', padding: '5px' }}>
                                        Risk Level
                                    </th>
                                    <th style={{ border: '1px solid #000', padding: '5px' }}>
                                        Name
                                    </th>
                                    <th style={{ border: '1px solid #000', padding: '5px' }}>
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {currThreats.map((threat, index) => (
                                    <tr key={index}>
                                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                                            {threat.riskLevel.label}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                                            {threat.description}
                                        </td>
                                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                                            <button
                                                className="editor-threat-button"
                                                onClick={() => {
                                                    setSelectedThreat(threat);
                                                    createElement('indicator', threat)
                                                    setShowThreats(false);
                                                }}
                                            >
                                            Select
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div>No threats available.</div>
                    )}
                    <button
                        className="editor-threats-modal__button"
                        onClick={() => setShowThreats(false)}
                    >
                        Close
                    </button>
                </div>
            </Modal>
            {detailsModal && (
                <Modal
                    isOpen={detailsModal}
                    noBackground={true}
                    position={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
                >
                    <div className="editor-threat-details-modal">
                        <div className="editor-threat-details-modal__description">
                            Threat Details
                        </div>
                        <pre>{JSON.stringify(selectedThreat, null, 2)}</pre>
                        <button
                            className="editor-threat-details-modal__button"
                            onClick={() => setDetailsModal(false)}
                        >
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default EditorMenu;
/*export default connect((state) => ({
    showClearModal: state.editor.editorMenu.showClearModal,
}), (dispatch) => ({
    clearClicked: (e) => dispatch(MenuClearClicked(e)),
}))(EditorMenu); */