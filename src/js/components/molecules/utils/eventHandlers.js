/**
 * Utility functions for handling events on diagram elements.
 */

function handleVulnerabilityAttachment(cell, linkModel){
    // Get id and linkedTo information from the cell
    const vulnerabilityId = cell.get('id');
    const linkedTo = cell.get('linkedTo');
    const attachedVulnerabilities = linkModel.get('attachedVulnerabilities') || [];

    // If cell is not linked or vulnerability is already attached, exit.
    if (linkedTo === null || attachedVulnerabilities.includes(vulnerabilityId)) {
        return;
    }
    //console.log("ATTACHING VULNERABILITY", vulnerabilityId, "TO", linkedTo);

    // Get the target element from the linkModel.
    const sourceCell = linkModel.getSourceElement();
    const targetCell = linkModel.getTargetElement();

    // Compute centers for source and target.
    const sourceCenter = sourceCell
        ? sourceCell.getBBox().center()
        : linkModel.get('source');
    const targetCenter = targetCell
        ? targetCell.getBBox().center()
        : linkModel.get('target');

    // Retrieve cell's bounding box.
    const bb = cell.getBBox();
    console.log("BB", bb);

    // Retrieve or compute the original offset if not stored.
    let offset = cell.get('originalOffset');
    if (!offset) {
        // Compute current centers:
        const currentCenter = bb.center();
        // For link center, use the average of the source and target center positions.
        const currentLinkCenter = {
            x: (sourceCenter.x + targetCenter.x) / 2,
            y: (sourceCenter.y + targetCenter.y) / 2
        };
        // Difference between the centers.
        offset = {
            x: currentCenter.x - currentLinkCenter.x,
            y: currentCenter.y - currentLinkCenter.y
        };
        cell.set('originalOffset', offset);
    }
    console.log("OFFSET", offset);

    // Recompute centers if needed (demonstrated in snippet, though they are already computed).
    // Use offset.x as a ratio to interpolate between the segment’s start and end.
    const interpX = sourceCenter.x + offset.x * (targetCenter.x - sourceCenter.x);
    const interpY = sourceCenter.y + offset.x * (targetCenter.y - sourceCenter.y);

    // Compute the normalized perpendicular vector to the segment.
    const dx = targetCenter.x - sourceCenter.x;
    const dy = targetCenter.y - sourceCenter.y;
    const segLength = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / segLength;
    const perpY = dx / segLength;

    // Set the new position for the cell using the perpendicular offset.
    cell.position(
        interpX - bb.width / 2 + perpX * offset.y,
        interpY - bb.height / 2 + perpY * offset.y
    );
}

// Export the event handlers for use in other modules.
export { handleVulnerabilityAttachment };