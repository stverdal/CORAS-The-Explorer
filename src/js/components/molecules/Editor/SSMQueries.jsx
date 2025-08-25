import React, { useState, useEffect, InputGroup } from 'react';
import Form from 'react-bootstrap/Form'
import Button from "react-bootstrap/Button"
//import * as joint from "jointjs"
//import { breakText } from "jointjs/src/util"
import Modal from 'react-bootstrap/Modal';


//import cjmlShapes from "./cjmlshapes"#
//import ConsequenceModal from './consequenceModal';
//import iconInfo from "./iconinfo"

//import "../../styles/content/savebar.css"

const SpyderBar = ({ loadGraph, attachTools, constructGraph }) => {

    const [searchInput, setSearchInput] = useState('');
    const [currGraph, setCurrGraph] = useState('')

    const [data, setData] = useState('')
    const [ip, setIp] = useState('host.docker.internal')
    const [port, setPort] = useState('8089')
    const [id, setId] = useState('jinlq8dpt05rtjq5v9jm04btqs180o07gnssomu3ug2dd7c9lr2hjmst887sl1h7jhf96gti8n07l509aask26pub7o0jbo1a198fju')
    const [entity, setEntity] = useState('misbehaviourSets')
    const [path, setPath] = useState('');
    const [attackPathURI, setAttackPathURI] = useState('/threatgraph?riskMode=FUTURE&allPath=false&normalOperations=false&targetURIs=')
    const [misbehaviourSet, setMisbehaviourSet] = useState('')
    const [veryHighMisbehaviours, setVeryHighMisbehaviours] = useState({})
    const [threats, setThreats] = useState('')
    const [actors, setActors] = useState('');
    const [actorlabels, setActorLabels] = useState('');
    const [actorCoordinates, setActorCoordinates] = useState({})
    //ip = `https://${ip}/spyderisk/${modelId}`

    //http://host.docker.internal:8089/system-modeller/models/3i4imlneiveqkbqi18c9iv9rsfa8aa5nr2t51qsofomtqtodf31m9o1hjdh70kr6f4femmnvoi7a2arn2id7vg8c7o3i388ebvjg9eb/
    //const [misbehaviourURI, setMisbehaviourURI] = useState(`system%23MS-LossOfAuthenticity-c1af3e99`);
    const [misbehaviourURI, setMisbehaviourURI] = useState(``);

    const [show, setShow] = useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);


    const generateSwimlane = (actor, x, y, label) => {
        //pick actor based on type.
        var chosenActor;
        console.log(actor)
        var section = "actors"
        var subsection;
        switch (actor) {
            case "EndUser":
                chosenActor = "user_1"
                subsection = "user"
                break;
            case "Adversary":
                chosenActor = "attacker"
                subsection = "user"
                break;
            case "ServiceProvider":
                chosenActor = "service_provider_1"
                subsection = "tech"
                break;
            case "DB":
                chosenActor = "tech_1_database"
                subsection = "tech"
                break;
            case "Server":
                chosenActor = "tech_3_server"
                subsection = "tech"
                break;
            case "Workstation":
                chosenActor = "internet_via_pc_2"
                subsection = "tech"
                break;
            default:
                chosenActor = "user_1"
                subsection = "user"

        }
        var element = iconInfo["actors"][chosenActor];
        var svg = element["svg"];
        var swimlane = svg.shapeFn();
        swimlane.resize(svg["width"], svg["height"]);
        swimlane.position(x, y);
        swimlane.attr("icon/href", svg.icon);
        swimlane.attr('text/text', label);
        swimlane.attr("info/section", section);
        swimlane.attr("info/subsection", subsection);

        return swimlane;
    }


    const generateLink = (initiator, reciever, graph) => {
        //var link = new joint.shapes.standard.Link();
        var link = new joint.shapes.standard.Link({
            attrs: {
                line: {
                    strokeWidth: 2,
                    strokeDasharray: "10 5"
                }
            }
        })
        console.log("INIT", initiator)
        link.source(initiator, {
            selector: 'body'
        });
        link.target(reciever, {
            selector: 'body'
        });
        link.addTo(graph);

        initiator.attr({
            body: {
                fill: "#DBEEF4"
            },
            innerBody: {
                fill: "#DBEEF4"
            },
        });
        return link;
    }

    const generateTouchpoint = (description, x, y, last) => {
        //var { section, id } = state.newElement;
        var section = 'communication'
        var id = 'internet_globe'
        var item = iconInfo[section][id];
        var svg = item["svg"];
        var fontsize = 10;
        //var elem = state.newElement.element;
        //var svg = state.preparedElement.svg;

        //var item = iconInfo[state.preparedElement.section][state.preparedElement.id];
        //var svg = item["svg"];

        var element = svg.shapeFn(); //get from iconinfo
        //state.preparedElement.uid = elem.get("id");
        //console.log(elem);


        //elem.position(x, y);
        element.resize(svg["width"], svg["height"]); //could send as well.
        //var elem = svg.shapeFn(); //get from iconinfo
        //var elem = state.preparedElement.element;

        element.position(x, y);
        //elem.resize(svg["width"], svg["height"]);
        //elem.resize(state.newElement.width, state.newElement.height); //could send as well.
        //element.addTo(currGgraph);
        //get from iconinfo
        if (svg.attrs) {
            element.attr(svg.attrs) //TODO
        }
        element.attr("icon/href", svg.icon);
        element.attr("info/section", section);
        //element.attr("info/subsection", "test");
        element.attr('text/font-size', fontsize)
        //Remove backslash from description

        var wraptext = breakText(description.replace(/\\/g, ''), { width: 110 }, { 'font-size': fontsize })
        //console.log("FONT SERFPSDJFLKSDJF", wraptext)
        element.attr("text/text", wraptext)

        if (last) {
            //add unwanted incident decorator
            element.attr("decorator/href", iconInfo["supplemental"]["unwanted_incident"]["svg"]["icon"])
        }

        return element;
    }

    const parseAssets = (assets) => {
        var newGraph = new joint.dia.Graph();
        // //Store a start coordinate. Start at 0 for now.
        // //Add actors


        var x = 0;
        var y = 0;
        //create attacker
        //var datacentre = assets[0]
        //var assets = assets.slice(1)


        var attacker = {
            "label": "Attacker",
        }
        //.push(datacentre)
        //do not include attacker for now.
        // assets.push(attacker);
        //for the purpose of demonstration]


        var swimlanecords = {}
        for (let asset of assets) {
            // perform action on asset
            //console.log(asset.label);
            let actorType = 'ServiceProvider'
            console.log(asset.label.includes())

            if (asset.label.includes("Server")) {
                actorType = "Server"
            }
            else if (asset.label.includes("Data")) {
                //change 
                actorType = "DB"
            }
            else if (asset.label.includes("DB")) {
                actorType = "DB"
            }
            else if (asset.label.includes("Workstation")) {
                actorType = "Workstation"
            }
            else if (asset.label.includes("User") || asset.label.includes("Adult")) {
                actorType = "EndUser"
            }
            else if (asset.label.includes("Attacker") || asset.label.includes("Hacker") || asset.label.includes("Malicious") || asset.label.includes("Adversary")) {
                actorType = "Adversary"
            }
            swimlanecords[asset.label] = { x: x, y: y }
            var swimlane = generateSwimlane(actorType, x, y, asset.label)
            swimlane.addTo(newGraph);


            y = y + 200;
        }

        setActorCoordinates(swimlanecords)
        // var actorList = {};
        // var touchpointList = [];
        // for (let actor of journeyVars["Actors"]) {
        //     //console.log("actor",actor);
        //     var swimlane = generateSwimlane(actor, x, y);
        //     swimlane.addTo(newGraph); //might postpone?
        //     actorList[actor.refID] = swimlane;
        //     y = y + 200;
        // }
        // for (let tp of journeyVars["Touchpoint"]) {
        //     //Find actors involved.
        //     var retTouchpoint = generateTouchpoint(tp, actorList[tp["initiator"]["refID"]], actorList[tp["reciever"]["refID"]])
        //     for (let touchpoint in retTouchpoint) {
        //        touchpointList.push(touchpoint);
        //         //touchpoint.addTo(newGraph);
        //     }
        //     console.log("RetRouchpoints", retTouchpoint);
        //     //touchpointList.push(touchpoint);
        //     //touchpoint.addTo(newGraph);
        //     newGraph.addCell(retTouchpoint);
        // }
        setCurrGraph(newGraph)

        loadGraph(newGraph);

    }


    const parseAttackpath = async (attackpath) => {
        console.log("path", attackpath);
        const filteredDict = {};

        //could allow user input.
        var depth = 10;
        var min = 4;
        var i = 0
        console.log("ATTACK PATH", attackpath)

        /*
        const entries = Object.entries(attackpath.graphs[misbehaviourURI].threats);
        entries.sort((a, b) => a[1] - b[1]);

        for (const [key, value] of entries) {
            if (i <= min && value < depth && !Object.values(filteredDict).includes(value)) {
                filteredDict[key] = value;
                i = i + 1;
            }
        }   


        */
        //test n0028.1
        if (misbehaviourURI.includes("LossOfAuthenticity")) {

            for (const [key, value] of Object.entries(attackpath.graphs[misbehaviourURI].threats)) {
                if (i <= min && value < depth) {
                    console.log("VALUE", key, value)
                    if (value == 1 && key.includes('DS.Auth.HsACDS.1.2-MP-HsACDS')) {
                        filteredDict[key] = value;
                    } else if (value == 3 && key.includes('H.L.IoH.3-MP-IoH')) {
                        filteredDict[key] = value;
                    } else if (value == 5 && key.includes('P.L.SHACPmAC.1-MP-SHACPmAC_40b0004c_172d3651_8312715d_d2340795')) {
                        filteredDict[key] = value;
                    } else if (value == 7 && key.includes('H.M.IoH.7-MP-IoH')) {
                        filteredDict[key] = value;
                    } else if (value == 9 && key.includes('H.J.UHS.3-MP-UHS')) {
                        filteredDict[key] = value;
                    }else {
                        continue;
                    }
                    //else {
                    //    filteredDict[key] = value;
                    //}//

                    //filteredDict[key] = value;
                    i = i + 1;
                }
            }
        } else {
            for (const [key, value] of Object.entries(attackpath.graphs[misbehaviourURI].threats)) {
                if (i <= min && value < depth && !Object.values(filteredDict).includes(value)) {
                    console.log("VALUE", value)
                    filteredDict[key] = value;
                    i = i + 1;
                }
            }
        }
            console.log("Filtered Dictionary:", filteredDict);


        const sortedMap = new Map(
            Object.entries(filteredDict).sort((a, b) => b[1] - a[1])
        );

        console.log("Sorted and filted map", sortedMap)
        //const sortedDict = Object.fromEntries(
        //    Object.entries(filteredDict).sort((a, b) => b[1] - a[1])
        //);

        //console.log('Filtered and Sorted Dictionary:', sortedDict);

        var threats = {}
        var threatURIs = []

        for (let [key, value] of sortedMap) {
            console.log(key, value);
            try {
                const threat = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/entity/system/threats/${key.replace('#', '%23')}`, {
                    method: 'GET',
                    credentials: 'include'
                })).json()
                threats[key] = threat
                threatURIs.push(threat.uri)
            } catch (err) {
                console.log(err.message)
            }
        }
        //getting all threats as they cannot be queried by name from this endpoint.
        //can access pattern in threat and count each actors apperance as either fromassetlabel or toassetlabel. Tally and determine which way the relation goes.

        var threatarray = []
        try {
            //const parent = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/entity/system/threats/${value.parent.replace('#','%23')}`, {
            threatarray = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/threats`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            setThreats(threatarray)
            //threats[key] = threat
        } catch (err) {
            console.log(err.message)

        }

        //If needed to gather threat information 
        for (let threat of threatarray) {
            //console.log(threat.uri.split('/').slice(-1)[0])
            let uri = threat.uri.split('/').slice(-1)[0]
            if (threatURIs.includes(uri)) {
                console.log("YES", threat)
                //add info from this endpoint to existing list.
                threats[uri].links = threat.pattern.links
            }
            //console.log(threat.uri.split('#')[1])
        }

        console.log("threats", threats)


        //for (const [key, value] of Object.entries(threats)) {
        //    console.log("parent", value.parent);


        //}

        // Create touchpoints for each threat and add to currGraph\
        //TODO find order of actors and location on the map.
        //TODO identify which actors are involved in threat.
        //starting coordinates.
        var x = 200;
        var y = 10;
        var involvedActors = []
        var count = 0;
        for (const [key, threat] of Object.entries(threats)) {
            //split description?
            //extract actors involved by parsing description.
            var potentialActors = threat.description.split("\\");
            var assertedActors = []
            //TODO
            //if (threat.description.includes("attacker") || threat.description.includes("Attacker")) {
            ///     assertedActors.push("Attacker")
            //}
            console.log("queried actors", actors)
            for (let actor of potentialActors) {
                let a = actor.replace('"', '');
                if (actorlabels.includes(a) && !assertedActors.includes(a)) {
                    console.log("asserted", actor);
                    assertedActors.push(a)
                    if (!involvedActors.includes(a)) {
                        involvedActors.push(a)
                    }
                }
            }

            //Split text into sections. (not intelligently yet.)
            //console.log("actors ", actors, "asserterdactors", assertedActors)
            //parseAssets(assertedActors)
            var wordlist = threat.description.split(" ");
            var descriptions = []
            //inits array with empty strings
            for (let i = 0; i < assertedActors.length; i++) {
                descriptions[i] = ""
            }
            var i = 0
            console.log("ASSERTED ACTORES ", assertedActors)
            //Divides string
            for (let word of wordlist) {
                console.log("math", Math.floor((i / wordlist.length) * assertedActors.length))
                descriptions[Math.floor((i / wordlist.length) * assertedActors.length)] = descriptions[Math.floor((i / wordlist.length) * assertedActors.length)] + word + " ";
                i = i + 1
            }
            //Determine reciever and sender. (currently only if two)
            var actorCount = {}
            //init dict
            for (let actor of assertedActors) {
                actorCount[actor] = 0;
            }
            //count mentions of actors in links
            if (assertedActors.length == 2) {
                console.log("TRREAT LINKSSS ",threat)
                if (threat.label.includes('DS.Auth.HsACDS.1.2_HsACDS')) {
                    actorCount["HealthData"] = 0;
                    actorCount["Server"] = 1;
                } else {
                    for (let link of threat.links) {
                       if (actorlabels.includes(link.fromAssetLabel)) {
                            //tally up as initiator
                            actorCount[link.fromAssetLabel] = parseInt(actorCount[link.fromAssetLabel]) - 1;
                        } else if (actorlabels.includes(link.toAssetLabel)) {
                            //tally up as reciever
                            actorCount[link.toAssetLabel] = parseInt(actorCount[link.toAssetLabel]) + 1;
                        }
                    }
                }
                //TODO
                //if (actorCount["Attacker"]) {
                //    actorCount["Attacker"] = 10
                //}
            }
            //TODO
            //highest number is initiator.
            //forced
            // if (actorCount["Attacker"]) {
            //    actorCount["Attacker"] = 10
            // }

            console.log("actorcount", actorCount)

            console.log("Simwlanes sssss", actorCoordinates)
            console.log("descriptions", descriptions)
            var j = 0
            var touchpoints = []

            for (let label of assertedActors) {
                let actor = actors[label]
                console.log("label", label)
                var last = false
                if (count == Object.entries(threats).length - 1) {
                    last = true
                }

                const touchpoint = generateTouchpoint(descriptions[j], x, actorCoordinates[label].y + 15, last);
                touchpoints.push(touchpoint)
                touchpoint.addTo(currGraph);
                y = y + 200
                j = j + 1
            }
            //add link if applicable
            var link;
            console.log("ACTORCOUNT LENGTH", Object.keys(actorCount).length, actorCount)
            console.log("ASSETTERDE ACTORS", assertedActors)
            if (assertedActors.length == 2 && Object.values(actorCount)[0] != Object.values(actorCount)[1]) {
                //simple implementation
                if (Object.values(actorCount)[0] > Object.values(actorCount)[1]) {
                    //actor[0] initiates
                    link = generateLink(touchpoints[0], touchpoints[1], currGraph)
                    //link.addTo(currGraph)
                    //setCurrGraph(currGraph);
                    //create link
                } else {
                    //actor[1] inititates
                    link = generateLink(touchpoints[1], touchpoints[0], currGraph)
                    //link.addTo(currGraph)
                    //setCurrGraph(currGraph);
                }
            }
            count = count + 1
            x = x + 200;
            //Check threat for list of direct misbehaviours
            //check misbehaviour severity and place adequate risk symbol.
        }
        setCurrGraph(currGraph);
        loadGraph(currGraph);
    }

    const handleClick = async () => {
        console.log("entering")
        try {
            //fetch assets
            console.log(`http://${ip}:${port}/system-modeller/models/${id}/${attackPathURI}${misbehaviourURI}`)
            var misbehaviour = misbehaviourURI.replace('#', '%23')
            console.log(`http://${ip}:${port}/system-modeller/models/${id}/${attackPathURI}${misbehaviour}`)
            const attackPath = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/${attackPathURI}${misbehaviour}`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            console.log("attackpath", attackPath)
            parseAttackpath(attackPath)
            //filter asserted assets

        } catch (err) {
            console.log(err.message)
        }
    }

    const handleEntityClick = async () => {
        console.log("entering")
        try {
            const assets = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/assets/`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            var assetLabels = []
            const assertedAssets = assets.filter(asset => asset.asserted === true);
            const newArr = [];
            console.log("asserted assets", assertedAssets)

            //Order pretty for demo purposes
            for (let asset of [...assertedAssets]) {
                console.log("asset LABEL", asset.label)
                if (asset.label === "Internet") {
                    newArr[0] = asset;
                    assertedAssets.splice(assertedAssets.indexOf(asset), 1);
                }
                else if (asset.label === "HealthData") {
                    newArr[1] = asset;
                    assertedAssets.splice(assertedAssets.indexOf(asset), 1);

                }
                else if (asset.label === "Server") {
                    newArr[2] = asset;
                    assertedAssets.splice(assertedAssets.indexOf(asset), 1);

                }
                else if (asset.label === "DataCentre") {
                    newArr[3] = asset;
                    assertedAssets.splice(assertedAssets.indexOf(asset), 1);

                }
            }
            console.log("newdict", newArr)
            //const dataCentreItem = Object.values(newDict)[0];
           // console.log("Data Centre Item:", dataCentreItem);
           
           assertedAssets.push(...newArr);

            setActors(assertedAssets)
            console.log("ASSERTED ASSETS", assertedAssets)
            for (let asset of assertedAssets) {
                assetLabels.push(asset.label)
            }
            setActorLabels(assetLabels)
            //console.log(assertedAssets)

            //DO NOT PARSE ASSETS YET
            parseAssets(assertedAssets)
            //parseData()
        } catch (err) {
            console.log(err.message)
        }
        try {
            //const data = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/entity/system/${entity}`, {
            const data = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/entity/system/${entity}`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            let newDict = {}
            console.log("Misbehaviours ", data)
            for (const key in data) {
                console.log(`Key: ${key}, Value: ${data[key]}`);
                if (data[key].risk === "domain#RiskLevelVeryHigh") {
                    newDict[key] = data[key]
                }
            }

            //show all very high risks\
            const uris = Object.values(newDict).map(item => item.uri);
            setVeryHighMisbehaviours(uris)
            setShow(true)
            console.log("newdict", newDict)

            //const firstItem = Object.values(newDict)[0];
            //setMisbehaviourURI(firstItem.uri);

            //const criticalRisks = data.filter(asset => asset.risk === "domain#RiskLevelVeryHigh");
            //console.log(criticalRisks)
            setData(data)
            //parseData()
        } catch (err) {
            console.log(err.message)
        }
    }

    const handleIndicator = async () => {
        try {
            const assets = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/assets/`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            var assetLabels = []
            const assertedAssets = assets.filter(asset => asset.asserted === true);
            console.log("asserted assets", assertedAssets)  

        } catch (err) {
            console.log(err.message)
        }
    }


    //Fetching assets
    const handleApiClick = async () => {
        console.log("entering")
        try {
            const assets = await (await fetch(`http://${ip}:${port}/system-modeller/models/${id}/assets/`, {
                method: 'GET',
                credentials: 'include'
            })).json()
            var assetLabels = []
            const assertedAssets = assets.filter(asset => asset.asserted === true);
            setActors(assertedAssets)
            for (let asset of assertedAssets) {
                assetLabels.push(asset.label)
            }
            setActorLabels(assetLabels)
            //console.log(assertedAssets)

            //DO NOT PARSE ASSETS YET
            //parseAssets(assertedAssets)
            //parseData()
        } catch (err) {
            console.log(err.message)
        }
    }

    const selectConsequence = (misbehaviour) => {
        console.log("misbehaviour", misbehaviour)
        setMisbehaviourURI(misbehaviour)
    }

    return (
        <div className="editor-menu">
            <button className="editor-menu__button" onClick={handleIndicator}>Get suggestions from SSM</button>
        </div>
    )

    /*
    return (
        <div>
            <div>
                <br />
                <h4>Spyderisk Model ID</h4>
                <input className='model_id' required="required" placeholder='Spyderisk Model ID' value={id} onChange={e => setId(e.target.value)} />
                <br />
                <br />
                <Button variant="outline-primary" onClick={handleEntityClick}>
                    Fetch Assets and Consequences
                </Button>
                <br />
                <br />
                <Button variant='outline-primary' type="submit" onClick={handleClick} >Fetch attack path</Button>
                <br />
            </div>
            <div>
                <br />
                <p>
                    Selected incident: <br />
                    {misbehaviourURI}
                </p>

            </div>
            <ConsequenceModal showmodal={show} hidemodal={handleClose} consequences={veryHighMisbehaviours} selectConsequence={selectConsequence} />


        </div>
    );

    */
}

export default SpyderBar;

/*

            <InputGroup className="mb-3">
                <FormControl
                    placeholder="Target model ID"
                    aria-label="Target model ID"
                    aria-describedby="spyder-id"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                />
                <Button variant="outline-secondary" id="button-addon2">
                    Search
                </Button>
            </InputGroup>
            <Button variant="outline-primary" onClick={handleClick}>Fetch Spyderisk template</Button>



<input className='album_id' required="required" placeholder='Enter an ID' value={id} onChange={e => setId(e.target.value)} />
<button type="submit" onClick={handleClick} >Search</button>

const handleClick = async () => {
    try {
        const data = await (await fetch(`https://jsonplaceholder.typicode.com/albums/${id}`)).json()
        setData(data)
    } catch (err) {
        console.log(err.message)
    }
}


            <Modal show={show} onHide={handleClose} animation={false}>
                <Modal.Header closeButton>
                    <Modal.Title>Risks</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {false && Object.values(veryHighMisbehaviours).map((misbehaviour, index) => (
                        <div key={index}>
                            <p>
                                {misbehaviour.label}
                            </p>
                        </div>
                    ))}
                    test: {veryHighMisbehaviours.length}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                        Close
                    </Button>
                    <Button variant="primary" onClick={handleClose}>
                        Save Changes
                    </Button>
                </Modal.Footer>
            </Modal>


*/
