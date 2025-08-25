// graphUtils.js
// Utility functions for graph operations.

//Get a directed acyclic graph in JSON from the current graph, 
// removing all library specific detail. Used for ingestion in other tools.
export function getDAG(graph) {
    var dag = {
        nodes: [],
        edges: []
    };
    graph.getElements().forEach(element => {
        console.log('Element:', element);
        dag.nodes.push({
            id: element.id,
            label: element.attributes.attrs.text.text,
            type: element.attributes.role,
            value: element.attributes.attrs.value.text
        });
    });
    graph.getLinks().forEach(link => {
        console.log("Link:", link);
        dag.edges.push({
            source: link.getSourceElement().id,
            sourceLabel: link.getSourceElement().attributes.attrs.text.text,
            target: link.getTargetElement().id,
            targetLabel: link.getTargetElement().attributes.attrs.text.text,
            label: link.label(1).attrs.text.text,
            relation: link.attributes.relation,
            vulnerabilities: link.attributes.vulnerabilities || [],
            uid: link.attributes.uid || link.id // Use uid if available, otherwise fallback to id
        });
    });
    //Could sort the nodes to avoid the need for a UID.
    console.log(graph.getLinks())
    console.log(dag);
    return dag;
}