import { _testInternals } from '../layoutEngine';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';
import type { TreeLayout, TreeNode } from '$lib/types/tree';
export function printLayout(label: string, layout: TreeLayout): void {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${label}`);
    console.log('═'.repeat(70));

    const visible = Array.from(layout.nodes.values()).filter(n => n.isVisible);
    const byLayer = new Map<number, TreeNode[]>();
    for (const node of visible) {
        if (!byLayer.has(node.layer)) byLayer.set(node.layer, []);
        byLayer.get(node.layer)!.push(node);
    }

    const sortedLayers = Array.from(byLayer.keys()).sort((a, b) => a - b);

    for (const layer of sortedLayers) {
        const nodes = byLayer.get(layer)!.sort((a, b) => a.position.x - b.position.x);
        const nodeStrs = nodes.map(n => {
            const name = `${n.person.firstName}`;
            const rels = [];
            if (n.spouseIds.length > 0) rels.push(`S:${n.spouseIds.length}`);
            if (n.childIds.length > 0) rels.push(`C:${n.childIds.length}`);
            if (n.parentIds.length > 0) rels.push(`P:${n.parentIds.length}`);
            const relStr = rels.length > 0 ? ` [${rels.join(',')}]` : '';
            return `${name}(x=${n.position.x}, w=${n.width})${relStr}`;
        });
        console.log(`  Layer ${layer.toString().padStart(2)}: ${nodeStrs.join('  |  ')}`);
    }

    let overlapCount = 0;
    for (const [layer, nodes] of byLayer) {
        const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const gap = curr.position.x - (prev.position.x + prev.width);
            if (gap < -1) {
                console.log(`  ⚠️  OVERLAP layer ${layer}: "${prev.person.firstName}" ends at ${prev.position.x + prev.width}, "${curr.person.firstName}" starts at ${curr.position.x} (overlap: ${Math.abs(gap)}px)`);
                overlapCount++;
            }
        }
    }

    const maps = _testInternals.buildRelationshipMaps(
        layout.connections
            .filter(c => c.type === 'parent-child')
            .flatMap(c => c.toIds.map(childId => ({
                id: `r-${c.fromIds[0]}-${childId}`,
                type: 'Parent' as const,
                subjectId: childId,
                relativeId: c.fromIds[0],
            })))
    );
    const layerMap = new Map<string, number>();
    const visibleNodeIds = new Set<string>();
    const xPositions = new Map<string, number>();
    for (const node of visible) {
        layerMap.set(node.id, node.layer);
        visibleNodeIds.add(node.id);
        xPositions.set(node.id, node.position.x);
    }
    const crossings = _testInternals.countCrossings(xPositions, layerMap, maps, visibleNodeIds, DEFAULT_LAYOUT_CONFIG);

    const spouseConns = layout.connections.filter(c => c.type === 'spouse');
    const pcConns = layout.connections.filter(c => c.type === 'parent-child');
    const cpConns = layout.connections.filter(c => c.type === 'coparent');

    console.log(`  ─── Connections: ${pcConns.length} parent-child, ${spouseConns.length} spouse, ${cpConns.length} co-parent`);
    console.log(`  ─── Crossings: ${crossings}`);
    if (overlapCount === 0) {
        console.log(`  ✅ No overlaps`);
    } else {
        console.log(`  ❌ ${overlapCount} overlap(s)`);
    }
    console.log('');
}

/**
 * Wraps test assertions so the layout is printed on failure.
 * Use: assertWithDebug(layout, 'label', () => { expect(...) });
 */
export function assertWithDebug(layout: TreeLayout, label: string, fn: () => void): void {
    try {
        fn();
    } catch (e) {
        printLayout(label, layout);
        throw e;
    }
}
