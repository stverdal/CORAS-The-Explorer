import joint from "jointjs";
import ToolDefinitions from "./ToolDefinitions";
import * as dagre from "dagre";
import * as graphlib from "graphlib";

const THREAT_SOURCES_TYPES = new Set([
  "human_threat_non_malicious",
  "human_threat_malicious",
  "non_human_threat",
]);
const RESIZE_ELEMENTS = new Set([
  "threat_scenario",
  "unwanted_incident",
  "treatment",
]);
const ELEMENT_TEXT_LINE_THRESHOLD = 25;

function createElementFromDAG(type, id, label, posX, posY) {
  if (type == "asset" || type == "impacted_asset") {
    type = "direct_asset";
  } else if (type == "non_human_threat") {
    type = "threat_non_human";
  } else if (type == "mitigation") {
    type = "treatment";
  } else if (type == "law") {
    type = "law";
  }

  // console.log("Looking for svg of " + type);
  const svg = ToolDefinitions.find((tool) => tool.id === type);
  if (svg == undefined) {
    console.log("Crashed on type: " + type);
    return null;
  }
  const shape = svg.shapeFn();
  // console.log(`SVG `, svg)

  if (svg.attrs) {
    Object.keys(svg.attrs).map((key, index) => shape.attr(key, svg.attrs[key]));
  }

  const formatted = formatElement(label);
  const styles = svg.perspectives[0];

  Object.keys(styles).forEach((ref) => shape.attr(ref, styles[ref]));

  if (type === "law") {
    let source = "";
    let norm = "";
    if (label.includes("\n")) {
      const parts = label.split("\n");
      source = parts[0].trim();
      norm = parts.slice(1).join(" ").trim();
    } else if (label.includes(":")) {
      const parts = label.split(":");
      source = parts[0].trim() + ":";
      norm = parts.slice(1).join(":").trim();
    } else {
      source = "Legal Source";
      norm = label;
    }

    const formattedSource = formatElement(source);
    const formattedNorm = formatElement(norm);

    shape.attr("topText/text", formattedSource.text);
    shape.attr("bottomText/text", formattedNorm.text);
    shape.attr("text/text", "");
  } else {
    shape.attr("text/text", formatted.text);
  }
  shape.attr("value/text", "");
  //shape.set('perspective', currentPerspective); // Unsure if needed
  shape.set("perspectives", svg.perspectives);
  shape.set("role", svg.role);
  shape.set("id", id);
  shape.set("valueType", svg.valueType); //maybe store info outside svg object instead?
  // a bit careful with these, some assumptions are made
  // set custom fill color in ellipse and rect
  if (svg.indicatorType) {
    shape.set("indicatorType", svg.indicatorType);
    shape.set("indicatorValue", 2);
    let fillColor = "#E5E7EB";

    if (
      typeof indicatorTypes !== "undefined" &&
      indicatorTypes[svg.indicatorType]
    ) {
      fillColor = indicatorTypes[svg.indicatorType];
    }

    shape.attr("body/fill", fillColor);
    shape.attr("innerBody/fill", fillColor);
  }
  // set magnet attribute, only used for vulnerabilities now.
  if (svg.magnet) {
    shape.attr("linkHandler/magnet", svg.magnet);
  }

  const width = RESIZE_ELEMENTS.has(type)
    ? svg.width + formatted.elementWidth
    : svg.width || 100;
  const height = RESIZE_ELEMENTS.has(type)
    ? svg.height + formatted.elementHeight
    : svg.height || 60;
  shape.resize(width, height);
  shape.position(posX, posY);

  return {
    element: shape,
    width: width,
    height: height,
  };
}

// Returns the node from list that matches nodeType, nodeText
// If the list does not contain such node, null is returned
function nodeFromList(nodeType, nodeText, list) {
  for (let node of list) {
    if (node.type != nodeType) continue;
    if (node.text != nodeText) continue;

    return node;
  }

  return null;
}

// Returns the edge from list that matches source, target
// If the list does not contain such edge, null is returned
function edgeFromList(source, target, list) {
  let i = -1;
  for (let edge of list) {
    i += 1;
    if (edge.source != source) continue;
    if (edge.target != target) continue;

    return {
      edge: edge,
      index: i,
    };
  }

  return null;
}

function contentWithoutDuplicates(content) {
  let oldNodeToNewNode = {};
  let newContent = {
    vertices: [],
    edges: [],
  };

  // Remove duplicate nodes
  for (let node of content.vertices) {
    let existingNode = nodeFromList(node.type, node.text, newContent.vertices);
    if (existingNode == null) {
      newContent.vertices.push(node);
      oldNodeToNewNode[node.id] = node.id;
    } else {
      oldNodeToNewNode[node.id] = existingNode.id;
    }
  }

  // Add edges and vulnerabilites between new nodes
  for (let edge of content.edges) {
    let newSource = oldNodeToNewNode[edge.source];
    let newTarget = oldNodeToNewNode[edge.target];

    let existingEdge = edgeFromList(newSource, newTarget, newContent.edges);
    if (existingEdge == null) {
      newContent.edges.push({
        source: newSource,
        target: newTarget,
        vulnerabilities: edge.hasOwnProperty("vulnerabilities")
          ? edge.vulnerabilities
          : [],
      });
    } else {
      if (!edge.hasOwnProperty("vulnerabilities")) continue;

      for (let vulnerability of edge.vulnerabilities) {
        newContent.edges[existingEdge.index].vulnerabilities.push(
          vulnerability,
        );
      }
    }
  }

  // Remove potential duplicate vulnerabilities on a single edge
  for (let edge of newContent.edges) {
    let vulnerabilities = [...new Set(edge.vulnerabilities)];
    edge.vulnerabilities = vulnerabilities;
  }

  return newContent;
}

function contentWithoutMitigation(content) {
  let prunedContent = {
    vertices: [],
    edges: [],
  };

  let mitigationIDs = [];

  // Remove mitigation nodes
  for (const node of content.vertices) {
    if (node.type === "mitigation") {
      mitigationIDs.push(node.id);
      continue;
    }
    prunedContent.vertices.push(node);
  }

  // Remove links from/to mitigations
  for (const edge of content.edges) {
    if (
      mitigationIDs.includes(edge.source) ||
      mitigationIDs.includes(edge.target)
    ) {
      continue;
    }
    prunedContent.edges.push(edge);
  }

  return prunedContent;
}

// export function createGraphFromDAG(content) {
//   // Create a new JointJS graph from the DAG content using iterative layout.
//   const graph = new joint.dia.Graph(); //stupid hack
//   if (!content.hasOwnProperty("vertices") || !content.hasOwnProperty("edges")) {
//     return graph;
//   }
//   // Log occupied positions on the canvas
//   const occupiedPositions = {};

//   // Content with unique nodes (the LLM can generate multiple times the same element)
//   let prunedContent = contentWithoutDuplicates(content);
//   if (prunedContent != null) {
//     content = prunedContent;
//   }
//   const fullContent = content;
//   console.log("Content with unique nodes: ", content);

//   // Remove mitigations
//   prunedContent = contentWithoutMitigation(content);
//   if (prunedContent != null) {
//     content = prunedContent;
//   }
//   console.log("Content without mitigation: ", content);

//   // Create a map (node_id -> node) for quick node lookup.
//   const nodeMap = {};
//   content.vertices.forEach((node) => {
//     nodeMap[node.id] = node;
//   });
//   const nodePositions = {};

//   // Build mapping for outgoing edges: source id -> array of target ids.
//   const outgoing = {};
//   content.edges.forEach((edge) => {
//     if (!outgoing[edge.source]) {
//       outgoing[edge.source] = [];
//     }
//     outgoing[edge.source].push(edge.target);
//   });
//   // console.log("Outgoing", outgoing);
//   // Determine levels via BFS.
//   // Level 0: all threat sources placed at X = 0.
//   const nodeLevels = {};
//   const queue = [];
//   content.vertices.forEach((node) => {
//     if (THREAT_SOURCES_TYPES.has(node.type)) {
//       nodeLevels[node.id] = 0;
//       queue.push(node.id);
//     }
//   });
//   while (queue.length) {
//     const currId = queue.shift();
//     const currLevel = nodeLevels[currId];
//     const targets = outgoing[currId] || [];
//     targets.forEach((targetId) => {
//       if (
//         nodeLevels[targetId] === undefined ||
//         nodeLevels[targetId] > currLevel + 1
//       ) {
//         nodeLevels[targetId] = currLevel + 1;
//         queue.push(targetId);
//       }
//     });
//   }

//   // Group nodes by level.
//   const levels = {};
//   Object.keys(nodeLevels).forEach((nodeId) => {
//     const level = nodeLevels[nodeId];
//     if (!levels[level]) levels[level] = [];
//     levels[level].push(nodeMap[nodeId]);
//   });

//   // Create elements level by level.
//   // For each level, X is level * 500.
//   // Y positions: nodes are spaced 400 apart and centered (middle element near y=0).
//   Object.keys(levels).forEach((levelKey) => {
//     const level = parseInt(levelKey, 10);
//     const nodesInLevel = levels[level];
//     // Sort nodes to get deterministic ordering.
//     nodesInLevel.sort((a, b) => a.id.localeCompare(b.id));
//     const count = nodesInLevel.length;
//     const yOffset = ((count - 1) / 2) * 400;
//     nodesInLevel.forEach((node, index) => {
//       const posX = level * 500;
//       const posY = index * 400 - yOffset;
//       if (node == undefined) {
//         console.log("Skipped undefined node");
//         return;
//       }
//       const result = createElementFromDAG(
//         node.type,
//         node.id,
//         node.text,
//         posX,
//         posY,
//       );
//       if (!result) return;
//       nodePositions[node.id] = {
//         x: posX,
//         y: posY,
//         width: result.width,
//         height: result.height,
//       };
//       // console.log("element", result.element);
//       //new joint.shapes.basic.Rect({
//       //    id: node.id,
//       //    position: { x: posX, y: posY },
//       //    size: { width: node.width || 100, height: node.height || 60 },
//       //    attrs: { text: { text: node.label } }
//       //});
//       graph.addCell(result.element);
//     });
//   });

//   // Add edges and vulnerabilities
//   content.edges.forEach((edge) => {
//     const link = new joint.shapes.coras.defaultLink();
//     link.source({ id: edge.source, magnet: "body" });
//     link.target({ id: edge.target, magnet: "body" });
//     graph.addCell(link);

//     if (edge.vulnerabilities && edge.vulnerabilities.length > 0) {
//       edge.vulnerabilities.forEach((vulnerabilityText, index) => {
//         const vId = `vulnerability-${generateUUID()}`;

//         const result = createElementFromDAG(
//           "vulnerability",
//           vId,
//           vulnerabilityText,
//           0,
//           0,
//         );

//         if (result) {
//           result.element.set("associatedLink", link.id);
//           result.element.set("vulnerabilityIndex", index);
//           result.element.set(
//             "totalVulnerabilities",
//             edge.vulnerabilities.length,
//           );
//           result.element.set("role", "vulnerability");
//           result.element.set("isManual", false);

//           graph.addCell(result.element);
//         }
//       });
//     }
//   });

//   updateGraphVulnerabilities(graph);

//   let graphCopy = new joint.dia.Graph();
//   graphCopy.fromJSON(graph.toJSON());
//   const fullGraph = insertMitigations(graphCopy, nodePositions, fullContent);

//   return {
//     threat: graph,
//     treatment: fullGraph,
//   };
// }

export function createGraphFromDAG(content) {
  const graph = new joint.dia.Graph();
  if (!content.hasOwnProperty("vertices") || !content.hasOwnProperty("edges")) {
    return graph;
  }

  let prunedContent = contentWithoutDuplicates(content);
  if (prunedContent != null) {
    content = prunedContent;
  }
  const fullContent = content;

  prunedContent = contentWithoutMitigation(content);
  if (prunedContent != null) {
    content = prunedContent;
  }

  content.vertices.forEach((node) => {
    const result = createElementFromDAG(node.type, node.id, node.text, 0, 0);
    if (result) {
      graph.addCell(result.element);
    }
  });

  content.edges.forEach((edge) => {
    const link = new joint.shapes.coras.defaultLink();
    link.source({ id: edge.source, magnet: "body" });
    link.target({ id: edge.target, magnet: "body" });
    graph.addCell(link);

    if (edge.vulnerabilities && edge.vulnerabilities.length > 0) {
      edge.vulnerabilities.forEach((vulnerabilityText, index) => {
        const vId = `vulnerability-${generateUUID()}`;
        const result = createElementFromDAG(
          "vulnerability",
          vId,
          vulnerabilityText,
          0,
          0,
        );
        if (result) {
          result.element.set("role", "vulnerability");
          result.element.set("associatedLink", link.id);
          result.element.set("vulnerabilityIndex", index);
          result.element.set(
            "totalVulnerabilities",
            edge.vulnerabilities.length,
          );
          result.element.set("isManual", false);
          graph.addCell(result.element);
        }
      });
    }
  });

  joint.layout.DirectedGraph.layout(graph, {
    dagre: dagre,
    graphlib: graphlib,
    rankDir: "LR",
    nodeSep: 80,
    rankSep: 250,
    resizeCluster: true,
  });

  const nodePositions = {};
  graph.getElements().forEach((element) => {
    if (element.get("role") !== "vulnerability") {
      const pos = element.position();
      const size = element.size();
      nodePositions[element.id] = {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
      };
    }
  });

  let graphCopy = new joint.dia.Graph();
  graphCopy.fromJSON(graph.toJSON());
  const fullGraph = insertMitigations(graphCopy, nodePositions, fullContent);

  updateGraphVulnerabilities(graph);
  updateGraphVulnerabilities(fullGraph);

  return {
    threat: graph,
    treatment: fullGraph,
  };
}

/*************************** Vulnerabilities ***************************/

function pointToSegmentDistance(p, a, b) {
  const A = p.x - a.x;
  const B = p.y - a.y;
  const C = b.x - a.x;
  const D = b.y - a.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;
  if (param < 0) {
    xx = a.x;
    yy = a.y;
  } else if (param > 1) {
    xx = b.x;
    yy = b.y;
  } else {
    xx = a.x + param * C;
    yy = a.y + param * D;
  }

  const dx = p.x - xx;
  const dy = p.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findClosestLink(vuln, graph, threshold = 60) {
  const p = vuln.getBBox().center();
  const links = graph.getLinks();
  let minDistance = Infinity;
  let closestLink = null;

  links.forEach((link) => {
    const sourceElem = graph.getCell(link.source().id);
    const targetElem = graph.getCell(link.target().id);
    if (!sourceElem || !targetElem) return;

    const x0 = sourceElem.getBBox().center().x;
    const y0 = sourceElem.getBBox().center().y;
    const x1 = targetElem.getBBox().center().x;
    const y1 = targetElem.getBBox().center().y;

    const vertices = link.get("vertices") || [];
    const points = [{ x: x0, y: y0 }, ...vertices, { x: x1, y: y1 }];

    for (let i = 0; i < points.length - 1; i++) {
      const dist = pointToSegmentDistance(p, points[i], points[i + 1]);
      if (dist < minDistance) {
        minDistance = dist;
        closestLink = link;
      }
    }
  });

  return minDistance <= threshold ? closestLink : null;
}

export function recalculateVulnerabilityIndices(graph) {
  const cells = graph.getCells();
  const links = graph.getLinks();
  const vulnerabilities = cells.filter(
    (cell) =>
      cell.get("role") === "vulnerability" ||
      cell.id.toString().includes("vulnerability"),
  );

  links.forEach((link) => {
    const attached = vulnerabilities.filter(
      (v) => v.get("associatedLink") === link.id && !v.get("isManual"),
    );

    attached.sort((a, b) => a.getBBox().center().x - b.getBBox().center().x);

    attached.forEach((v, index) => {
      v.set("vulnerabilityIndex", index);
      v.set("totalVulnerabilities", attached.length);
    });
  });
}

export function updateGraphVulnerabilities(graph) {
  const cells = graph.getCells();
  const vulnerabilities = cells.filter(
    (cell) =>
      cell.get("associatedLink") !== undefined && cell.get("isManual") !== true,
  );

  vulnerabilities.forEach((vuln) => {
    const linkId = vuln.get("associatedLink");
    const index = vuln.get("vulnerabilityIndex");
    const total = vuln.get("totalVulnerabilities");
    const link = graph.getCell(linkId);

    if (!link) return;

    const sourceElem = graph.getCell(link.source().id);
    const targetElem = graph.getCell(link.target().id);
    if (!sourceElem || !targetElem) return;

    const x0 = sourceElem.getBBox().center().x;
    const y0 = sourceElem.getBBox().center().y;
    const x1 = targetElem.getBBox().center().x;
    const y1 = targetElem.getBBox().center().y;

    const vertices = link.get("vertices") || [];
    const points = [{ x: x0, y: y0 }, ...vertices, { x: x1, y: y1 }];

    let totalLength = 0;
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      segments.push({ p1: points[i], p2: points[i + 1], length: len });
      totalLength += len;
    }

    const ratio = (index + 1) / (total + 1);
    const targetLength = totalLength * ratio;

    let currentLength = 0;
    let targetPoint = { x: x0, y: y0 };

    for (const seg of segments) {
      if (
        currentLength + seg.length >= targetLength ||
        seg === segments[segments.length - 1]
      ) {
        const remaining = targetLength - currentLength;
        const segRatio = seg.length > 0 ? remaining / seg.length : 0;
        targetPoint.x = seg.p1.x + (seg.p2.x - seg.p1.x) * segRatio;
        targetPoint.y = seg.p1.y + (seg.p2.y - seg.p1.y) * segRatio;
        break;
      }
      currentLength += seg.length;
    }

    const vulnSize = vuln.get("size") || { width: 32, height: 30 };

    vuln.position(
      targetPoint.x - vulnSize.width / 2,
      targetPoint.y - vulnSize.height / 2,
      { autoUpdate: true },
    );
  });
}

/***************************** Mitigations *****************************/

function insertMitigations(graph, nodePositions, content) {
  const mitigationsMap = getMitigations(content);

  for (const [nodeID, mitigations] of Object.entries(mitigationsMap)) {
    const node = nodePositions[nodeID];
    if (node === undefined) continue;

    let mitigationProperties = getMitigationsProperties(
      node.x,
      node.y,
      mitigations,
    );

    for (const m of mitigationProperties) {
      const result = createElementFromDAG("treatment", m.id, m.text, m.x, m.y);
      graph.addCell(result.element);

      const link = new joint.shapes.coras.defaultLink();
      link.source({ id: m.id, magnet: "body" });
      link.target({ id: nodeID, magnet: "body" });
      graph.addCell(link);
    }
  }

  return graph;
}

function getMitigations(content) {
  let mitigations = {};
  let mitigationIDs = [];

  for (const node of content.vertices) {
    if (node.type === "mitigation") {
      mitigationIDs.push(node.id);
    } else {
      mitigations[node.id] = [];
    }
  }

  for (const edge of content.edges) {
    if (
      mitigationIDs.includes(edge.source) &&
      !mitigationIDs.includes(edge.target) &&
      mitigations.hasOwnProperty(edge.target)
    ) {
      mitigations[edge.target].push({
        id: edge.source,
        text: getTextOfNode(edge.source, content),
      });
    } else if (
      mitigationIDs.includes(edge.target) &&
      !mitigationIDs.includes(edge.source) &&
      mitigations.hasOwnProperty(edge.source)
    ) {
      mitigations[edge.source].push({
        id: edge.target,
        text: getTextOfNode(edge.target, content),
      });
    }
  }

  return mitigations;
}

function getMitigationsProperties(x, y, mitigations) {
  let mitigationProperties = [];
  let n = mitigations.length;
  let delta = (2 * Math.PI) / n;
  const r = 225;

  let i = 0;
  for (const mitigation of mitigations) {
    let theta = delta * i + Math.PI / 3;
    mitigationProperties.push({
      id: mitigation.id,
      text: mitigation.text,
      x: r * Math.cos(theta) + x,
      y: r * Math.sin(theta) + y,
    });
    i += 1;
  }

  return mitigationProperties;
}

/*************************** Util functions ****************************/

function formatElement(text) {
  let length = 0;
  let formattedText = "";
  let lines = 1;
  let maxLength = 0;

  for (const word of text.split(" ")) {
    formattedText += (length == 0 ? "" : " ") + word;
    length += word.length;
    if (length > ELEMENT_TEXT_LINE_THRESHOLD) {
      formattedText += "\n";
      lines += 1;
      maxLength = length > maxLength ? length : maxLength;
      length = 0;
    }
  }

  return {
    text: formattedText,
    elementWidth: Math.floor(maxLength * 3.5),
    elementHeight: lines * 10,
  };
}

function getTextOfNode(nodeID, content) {
  for (const node of content.vertices) {
    if (node.id === nodeID) {
      return node.text;
    }
  }
  return "";
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/************** CORAS JSON -> Natural Language CORAS Semantics *********/

export function naturalLanguageFromThreatModel(content) {
  let links = [];
  let elements = {};
  let text = "";
  let element_text = "";

  for (const cell of content.cells) {
    if (cell.type === "coras.defaultLink") {
      links.push(cell);
    }

    if (cell.role === "direct_asset") {
      element_text = cell.attrs.text.text.replaceAll("\n", " ");
      text += "'" + element_text + "' is an asset.\n";
    } else if (cell.role === "unwanted_incident") {
      element_text = cell.attrs.text.text.replaceAll("\n", " ");
      text += "'" + element_text + "' is an unwanted incident.\n";
    } else if (cell.role === "threat_scenario") {
      element_text = cell.attrs.text.text.replaceAll("\n", " ");
      text += "'" + element_text + "' is a threat scenario.\n";
    } else if (cell.role === "threat_source") {
      element_text = cell.attrs.text.text.replaceAll("\n", " ");
      text += threatInNaturalLanguage(cell, element_text);
    } else if (cell.role === "law") {
      element_text = cell.attrs.text.text.replaceAll("\n", " ");
      text += "'" + element_text + "' is a compliance regulation or law.\n";
    } else {
      console.log("Unknown cell role: " + cell.role);
      continue;
    }
    elements[cell.id] = {
      role: cell.role,
      text: element_text,
    };
  }

  for (const link of links) {
    if (
      !elements.hasOwnProperty(link.source.id) ||
      !elements.hasOwnProperty(link.target.id)
    ) {
      console.log("Link with unknown element id");
      continue;
    }

    const source = elements[link.source.id];
    const target = elements[link.target.id];
    if (source.role == "threat_source") {
      text += "'" + source.text + "' initiates '" + target.text + "'.\n";
    } else if (source.role == "threat_scenario") {
      text += "'" + source.text + "' leads to '" + target.text + "'.\n";
    } else if (target.role == "direct_asset") {
      text += "'" + source.text + "' impacts '" + target.text + "'.\n";
    } else if (target.role == "law") {
      text += "'" + source.text + "' breaches '" + target.text + "'.\n";
    } else {
      console.log("Unknown link");
      continue;
    }
  }

  return text;
}

function threatInNaturalLanguage(cell, element_text) {
  if (
    cell.attrs.icon.href.includes(
      ".504-0.488%2C1.76-0.931c0%2C1.252%2C0%2C13.475%2C0%2C13.482c0%2C0.146%2C0.026%2C1.263%2C0.78%2C2.03c0.46%2C0.468%2C1.092%2C0.705",
    )
  ) {
    return "'" + element_text + "' is a deliberate human threat.\n";
  } else if (
    cell.attrs.icon.href.includes(
      "%09%09%09%09%3Cpath%20d%3D%22M19.5%2C9.7v0.6c-0.2-0.2-0.4-0.4-0.7-0.6H19.5z%22%2F%3E%09%09%0",
    )
  ) {
    return "'" + element_text + "' is an accidental human threat.\n";
  } else {
    return "'" + element_text + "' is a non-human threat.\n";
  }
}
