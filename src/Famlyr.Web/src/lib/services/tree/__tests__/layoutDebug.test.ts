import { calculateLayout, _testInternals } from '../layoutEngine.js';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';
import type { TreeLayout, TreeNode } from '$lib/types/tree';
import { person, parentRel, spouseRel, tree, nuclearFamily, threeGenerations, resetIds } from './treeBuilder.js';
import { describe, it } from 'vitest';

function printLayout(label: string, layout: TreeLayout): void {
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

    // Check overlaps
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

    // Check crossings
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

    // Connections summary
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

describe('layout debug output', () => {
    it('prints all scenarios', () => {
        resetIds();

        // 1. Single person
        const solo = person({ id: 'solo', firstName: 'Solo' });
        printLayout('Single Person', calculateLayout(tree([solo]), null));

        // 2. Couple (no children)
        resetIds();
        const h = person({ id: 'h', firstName: 'Husband', gender: 'Male' });
        const w = person({ id: 'w', firstName: 'Wife', gender: 'Female' });
        printLayout('Couple (no children)', calculateLayout(tree([h, w], [spouseRel('h', 'w')]), null));

        // 3. Nuclear family (2 children)
        resetIds();
        const fam = nuclearFamily(3);
        printLayout('Nuclear Family (3 children)',
            calculateLayout(tree([fam.father, fam.mother, ...fam.children], fam.relationships), null));

        // 4. Three generations
        resetIds();
        const fam3 = threeGenerations();
        printLayout('Three Generations',
            calculateLayout(tree(fam3.allPersons, fam3.relationships), null));

        // 5. Three generations - focused on child1
        printLayout('Three Generations (focused on child1)',
            calculateLayout(tree(fam3.allPersons, fam3.relationships), 'child1'));

        // 6. Half-siblings
        resetIds();
        const dad = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
        const mom1 = person({ id: 'mom1', firstName: 'Mom1', gender: 'Female' });
        const mom2 = person({ id: 'mom2', firstName: 'Mom2', gender: 'Female' });
        const hc1 = person({ id: 'hc1', firstName: 'HalfChild1' });
        const hc2 = person({ id: 'hc2', firstName: 'HalfChild2' });
        printLayout('Half-Siblings (Dad + 2 wives)',
            calculateLayout(tree([dad, mom1, mom2, hc1, hc2], [
                spouseRel('dad', 'mom1'),
                spouseRel('dad', 'mom2'),
                parentRel('hc1', 'dad'), parentRel('hc1', 'mom1'),
                parentRel('hc2', 'dad'), parentRel('hc2', 'mom2'),
            ]), null));

        // 7. Multiple spouses (3 spouses with children each)
        resetIds();
        const central = person({ id: 'p', firstName: 'Central', gender: 'Male' });
        const sp1 = person({ id: 's1', firstName: 'Spouse1', gender: 'Female' });
        const sp2 = person({ id: 's2', firstName: 'Spouse2', gender: 'Female' });
        const sp3 = person({ id: 's3', firstName: 'Spouse3', gender: 'Female' });
        const mc1 = person({ id: 'mc1', firstName: 'Child1' });
        const mc2 = person({ id: 'mc2', firstName: 'Child2' });
        const mc3 = person({ id: 'mc3', firstName: 'Child3' });
        printLayout('Multiple Spouses (3 spouses + children)',
            calculateLayout(tree([central, sp1, sp2, sp3, mc1, mc2, mc3], [
                spouseRel('p', 's1'), spouseRel('p', 's2'), spouseRel('p', 's3'),
                parentRel('mc1', 'p'), parentRel('mc1', 's1'),
                parentRel('mc2', 'p'), parentRel('mc2', 's2'),
                parentRel('mc3', 'p'), parentRel('mc3', 's3'),
            ]), null));

        // 8. Co-parents (unmarried)
        resetIds();
        const cpDad = person({ id: 'cpd', firstName: 'Dad', gender: 'Male' });
        const cpMom = person({ id: 'cpm', firstName: 'Mom', gender: 'Female' });
        const cpChild = person({ id: 'cpc', firstName: 'Child' });
        printLayout('Co-Parents (unmarried)',
            calculateLayout(tree([cpDad, cpMom, cpChild], [
                parentRel('cpc', 'cpd'), parentRel('cpc', 'cpm'),
            ]), null));

        // 9. Single parent with 3 children
        resetIds();
        const sp = person({ id: 'sp', firstName: 'SingleParent' });
        const spc1 = person({ id: 'spc1', firstName: 'Kid1' });
        const spc2 = person({ id: 'spc2', firstName: 'Kid2' });
        const spc3 = person({ id: 'spc3', firstName: 'Kid3' });
        printLayout('Single Parent (3 children)',
            calculateLayout(tree([sp, spc1, spc2, spc3], [
                parentRel('spc1', 'sp'), parentRel('spc2', 'sp'), parentRel('spc3', 'sp'),
            ]), null));
    });
});
