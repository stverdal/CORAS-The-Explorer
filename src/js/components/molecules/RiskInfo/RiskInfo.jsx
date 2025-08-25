import React, { useState, useEffect } from 'react';
import { useSelector,useDispatch } from 'react-redux';
import './RiskInfo.css';
import FrequencyRangeModal from './FrequencyRangeModal'
import { ModifyRisk } from '../../../store/Actions.js'



const timeUnits = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];


const RiskInfo = () => {
    const riskState = useSelector((state) => state.editor.risk);
    const dispatch = useDispatch();
    const [riskMatrix, setRiskMatrix] = useState([]);
    const [consequenceLevels, setConsequenceLevels] = useState(riskState.consequenceScales.default);
    const [likelihoodLevels, setLikelihoodLevels] = useState(riskState.likelihoodScales.default);

    
    const [modalIndex, setModalIndex] = useState(null);
    const openModal = (index) => setModalIndex(index);
    const closeModal = () => setModalIndex(null);


    // Grab the current graph tab from the redux store.
    const graph = useSelector(state => {
        console.log(state)
        if (state.editor.currGraph.graph && state.editor.currGraph.label === "threat" && state.editor.currGraph.graph.cells.length != 0) {
            console.log("Current graph found:", state.editor.currGraph.graph);  
            return state.editor.currGraph.graph;
            // If currGraph exists and its label is "threat", use it.
        } else {
            // Otherwise, if a graphs array exists, find the graph with label "threat".
            if (state.editor.graphs.threat.graph) {
                return state.editor.graphs.threat.graph
            }
        }
        return null;
    });

    if (graph === null) {
        console.log("No graph found");
    }

    useEffect(() => {
        const getColor = (value) => {
            if (value <= 5) return 'green';
            if (value <= 10) return 'yellow';
            if (value <= 15) return 'orange';
            if (value <= 20) return 'red';
            return 'darkred';
        };

        // Build the base risk matrix including an empty incidents array on each cell.
        const initialMatrix = consequenceLevels.map((risk) => {
            return likelihoodLevels.map((likelihood) => {
                const totalValue = risk.value * likelihood.value;
                return {
                    value: totalValue,
                    color: getColor(totalValue),
                    incidents: []
                };
            });
        });

        console.log("Initial risk matrix:", initialMatrix);
        console.log("Current graph tab:", graph);

        const risks = [];

        // If a current model is in the redux store, extract unwanted incidents.
        if (graph) {
            const unwantedIncidents = [];
            const impactsRelations = [];


            //etract unwanted incidents and impacts relations from the graph.
            graph.cells.forEach(cell => {
                if (cell.type === 'coras.rectElement') {
                    unwantedIncidents.push(cell);
                } else if (cell.type == 'coras.defaultLink') {
                    if (cell.relation == 'impacts') {
                        impactsRelations.push(cell);
                    }
                }
            });

            //Relate unwanted incidents to impacts to create risks.
            var i = 0
            impactsRelations.forEach(relation => {
                let risk = {
                    source: null,
                    target: null,
                    likelihood: null,
                    consequence: null,
                    riskname: null,
                }
                const source = graph.cells.find(cell => cell.id === relation.source.id);
                const target = graph.cells.find(cell => cell.id === relation.target.id);

                //console.log("Source:", source);
                //console.log("Target:", target);
                //console.log(relation)

                var hasLikelihood =  false
                var hasConsequence = false

                if (source.type === 'coras.rectElement' && target.type === 'coras.unboxedElement') {
                    risk.source = source;
                    risk.target = target;
                    if (source.attrs.value.text) {
                        risk.likelihood = source.attrs.value.text;
                        hasLikelihood = true
                    } if (relation.labels[1].attrs.text.text && relation.labels[1].attrs.text.text != "") {
                        risk.consequence = relation.labels[1].attrs.text.text;
                        hasConsequence = true
                    }
                    //create a reasonable name for the risk
                    console.log("Test",target)
                    if (source.attrs.text.text.split(':')[0] && target.attrs.text && target.attrs.text.text.split(':')[0]) {
                        risk.riskname = 'R_' + source.attrs.text.text.split(':')[0] + '_' + target.attrs.text.text.split(':')[0];
                    } else {
                        risk.riskname = 'R' + i
                    }
                }

                if (hasLikelihood && hasConsequence) {
                    risks.push(risk);
                }

            });
            // we now have the risks
            console.log("Processing unwanted incidents:", risks);
            risks.forEach(risk => {
                // Map the incident's consequence and likelihood to the row and column index.
                console.log("Consequence", risk.consequence)
                const cleanedConsequence = risk.consequence.replace(/[\[\]]/g, '');
                const cleanedLikelihood = risk.likelihood.replace(/[\[\]]/g, '');
                console.log("Cleaned Consequence:", cleanedConsequence, "Cleaned Likelihood:", cleanedLikelihood);
                const riskIndex = consequenceLevels.findIndex(level => level.name === cleanedConsequence);
                const likelihoodIndex = likelihoodLevels.findIndex(level => level.name === cleanedLikelihood);

                console.log("Risk:", risk, "mapped to indices:", { riskIndex, likelihoodIndex });
                
                //if (true) {
                if (riskIndex !== -1 && likelihoodIndex !== -1) {
                //if (likelihoodIndex !== -1) {
                    // Add the risk name and the symbol "⚠" for this incident.
                    initialMatrix[riskIndex][likelihoodIndex].incidents.push(`${risk.riskname} ⚠`);
                    console.log(`Added incident to cell [${riskIndex}][${likelihoodIndex}]:`, initialMatrix[riskIndex][likelihoodIndex]);
                }
            });
        }

        console.log("Final risk matrix with incidents:", initialMatrix);

        setRiskMatrix(initialMatrix);
    }, [consequenceLevels, likelihoodLevels, graph]);

    const handleCellClick = (riskIndex, likelihoodIndex) => {
        setRiskMatrix(prevMatrix => {
            const newMatrix = [...prevMatrix];
            const currentColor = newMatrix[riskIndex][likelihoodIndex].color;
            const newColor = getNextColor(currentColor);
            newMatrix[riskIndex][likelihoodIndex].color = newColor;
            return newMatrix;
        });
    };

    const getNextColor = (currentColor) => {
        const colors = ['green', 'yellow', 'orange', 'red', 'darkred'];
        const currentIndex = colors.indexOf(currentColor);
        return colors[(currentIndex + 1) % colors.length];
    };

    const handleConsequenceLevelChange = (index, field, value) => {
        const newConsequenceLevels = [...consequenceLevels];
        newConsequenceLevels[index][field] = value;
        setConsequenceLevels(newConsequenceLevels);
        dispatch(ModifyRisk(newConsequenceLevels, 'CONSEQUENCE_SCALE', 0));
    };

    const handleLikelihoodLevelChange = (index, field, value) => {
        const newLikelihoodLevels = [...likelihoodLevels];
        newLikelihoodLevels[index][field] = value;
        setLikelihoodLevels(newLikelihoodLevels);
        dispatch(ModifyRisk(newLikelihoodLevels, 'LIKELIHOOD_SCALE', 0));
    };


    const handleRangeSubmit = (rangeString, normalizedRange) => {
        console.log("Range submitted:", rangeString);
        const newLikelihoodLevels = [...likelihoodLevels];
        newLikelihoodLevels[modalIndex].rangeString = rangeString;
        newLikelihoodLevels[modalIndex].range = normalizedRange;
        setLikelihoodLevels(newLikelihoodLevels);
        //var type = 
        console.log("likelihoodLevelsasdffdafdfdsfdsa", newLikelihoodLevels)
        dispatch(ModifyRisk(newLikelihoodLevels, 'LIKELIHOOD_SCALE', 0));

        //handleLikelihoodLevelChange(modalIndex, 'range', rangeString);
    };


    return (
        <div className='riskinfo-wrapper'>
            <div className='riskinfo-header'>
                <h1>Risk Information</h1>
            </div>
            <div className='risk-matrix'>
                <table>
                    <thead>
                        <tr>
                            <th></th>
                            {likelihoodLevels.map((level, index) => (
                                <th key={index}>{level.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {riskMatrix.map((row, riskIndex) => (
                            <tr key={riskIndex}>
                                <td>{consequenceLevels[riskIndex].name}</td>
                                {row.map((cell, likelihoodIndex) => (
                                    <td
                                        key={likelihoodIndex}
                                        style={{
                                            backgroundColor: cell.color,
                                            width: '150px',
                                            height: '50px',
                                            cursor: 'pointer',
                                            textAlign: 'center',
                                            verticalAlign: 'middle'
                                        }}
                                        onClick={() => handleCellClick(riskIndex, likelihoodIndex)}
                                        title={`Risk: ${consequenceLevels[riskIndex].name}, Likelihood: ${likelihoodLevels[likelihoodIndex].name}, Value: ${cell.value}`}
                                    >
                                        {cell.incidents.length > 0 && (
                                            <span>{cell.incidents.join(', ')}</span>
                                        )}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className='scales'>
                <div className='risk-levels'>
                    <h2>Consequence Levels</h2>
                    {consequenceLevels.map((level, index) => (
                        <div key={index} className='scale-item'>
                            <input
                                type='text'
                                value={level.name}
                                onChange={(e) => handleConsequenceLevelChange(index, 'name', e.target.value)}
                                placeholder='Name'
                            />
                            <textarea
                                value={level.description}
                                onChange={(e) => handleConsequenceLevelChange(index, 'description', e.target.value)}
                                placeholder='Description'
                            />
                            <input
                                type='text'
                                value={level.rangeString}
                                onChange={(e) => handleConsequenceLevelChange(index, 'range', e.target.value)}
                                placeholder='Range'
                            />
                        </div>
                    ))}
                </div>
                <div className='likelihood-levels'>
                    <h2>Likelihood Levels</h2>
                    {likelihoodLevels.map((level, index) => (
                        <div key={index} className='scale-item'>
                            <input
                                type='text'
                                value={level.name}
                                onChange={(e) => handleLikelihoodLevelChange(index, 'name', e.target.value)}
                                placeholder='Name'
                            />
                            <textarea
                                value={level.description}
                                onChange={(e) => handleLikelihoodLevelChange(index, 'description', e.target.value)}
                                placeholder='Description'
                            />
                            <input
                                type='text'
                                value={level.rangeString}
                                readOnly
                                onClick={() => openModal(index)} // Prevent editing
                                //onChange={(e) => handleLikelihoodLevelChange(index, 'range', e.target.value)}
                                placeholder='Range'
                                style={{ cursor: 'pointer' }}
                            />
                        </div>
                    ))}

                    <FrequencyRangeModal
                        type="likelihood"
                        isOpen={modalIndex !== null}
                        onClose={closeModal}
                        onSubmit={handleRangeSubmit}
                    />

                </div>
            </div>
        </div>
    );
};

export default RiskInfo;
