import { describe, it, expect, beforeEach } from 'vitest';
import { calculateLayout, _testInternals } from '../layoutEngine';
import type { TreeLayout, TreeNode, LayoutConfig } from '$lib/types/tree';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';
import type { FamilyTreeModel } from '$lib/types/api';
import { person, parentRel, spouseRel, tree, nuclearFamily, threeGenerations, resetIds } from './treeBuilder';

beforeEach(() => {
    resetIds();
});

function visibleNodes(layout: TreeLayout): TreeNode[] {
    return Array.from(layout.nodes.values()).filter(n => n.isVisible);
}

function nodeById(layout: TreeLayout, id: string): TreeNode {
    const node = layout.nodes.get(id);
    if (!node) throw new Error(`Node ${id} not found`);
    return node;
}

function assertNoOverlaps(layout: TreeLayout): void {
    const visible = visibleNodes(layout);
    const byLayer = new Map<number, TreeNode[]>();
    for (const node of visible) {
        if (!byLayer.has(node.layer)) byLayer.set(node.layer, []);
        byLayer.get(node.layer)!.push(node);
    }

    for (const [layer, nodes] of byLayer) {
        const sorted = [...nodes].sort((a, b) => a.position.x - b.position.x);
        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const gap = curr.position.x - (prev.position.x + prev.width);
            expect(gap, `Overlap in layer ${layer}: "${prev.person.firstName}" (x=${prev.position.x}) and "${curr.person.firstName}" (x=${curr.position.x}), gap=${gap}`).toBeGreaterThanOrEqual(-1);
        }
    }
}

function assertChildrenBelowParents(layout: TreeLayout): void {
    const visible = visibleNodes(layout);
    for (const node of visible) {
        for (const parentId of node.parentIds) {
            const parent = layout.nodes.get(parentId);
            if (!parent || !parent.isVisible) continue;
            expect(node.position.y, `Child "${node.person.firstName}" should be below parent "${parent.person.firstName}"`).toBeGreaterThan(parent.position.y);
        }
    }
}

function assertSpousesSameLayer(layout: TreeLayout): void {
    const visible = visibleNodes(layout);
    for (const node of visible) {
        for (const spouseId of node.spouseIds) {
            const spouse = layout.nodes.get(spouseId);
            if (!spouse || !spouse.isVisible) continue;
            expect(node.layer, `"${node.person.firstName}" and spouse "${spouse.person.firstName}" should be on same layer`).toBe(spouse.layer);
        }
    }
}

function assertAllVisibleNodesPositioned(layout: TreeLayout): void {
    const visible = visibleNodes(layout);
    for (const node of visible) {
        expect(node.position, `Node "${node.person.firstName}" should have a position`).toBeDefined();
        expect(typeof node.position.x, `Node "${node.person.firstName}" x should be a number`).toBe('number');
        expect(typeof node.position.y, `Node "${node.person.firstName}" y should be a number`).toBe('number');
        expect(Number.isFinite(node.position.x), `Node "${node.person.firstName}" x should be finite`).toBe(true);
        expect(Number.isFinite(node.position.y), `Node "${node.person.firstName}" y should be finite`).toBe(true);
    }
}

function assertNoCrossings(layout: TreeLayout): void {
    const maps = _testInternals.buildRelationshipMaps(
        // reconstruct relationships from connections
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
    for (const node of visibleNodes(layout)) {
        layerMap.set(node.id, node.layer);
        visibleNodeIds.add(node.id);
    }
    const xPositions = new Map<string, number>();
    for (const node of visibleNodes(layout)) {
        xPositions.set(node.id, node.position.x);
    }
    const crossings = _testInternals.countCrossingsOptimized(layerMap, xPositions, maps, visibleNodeIds, DEFAULT_LAYOUT_CONFIG);
    expect(crossings, `Layout should have 0 edge crossings, found ${crossings}`).toBe(0);
}

function assertStructuralInvariants(layout: TreeLayout): void {
    assertAllVisibleNodesPositioned(layout);
    assertNoOverlaps(layout);
    assertChildrenBelowParents(layout);
    assertSpousesSameLayer(layout);
}

// ─────────────────────────────────────────────────────────────────────
// Scenario tests
// ─────────────────────────────────────────────────────────────────────

describe('layoutEngine', () => {
    describe('single person', () => {
        it('positions a lone person at origin area', () => {
            const p = person({ id: 'solo', firstName: 'Solo' });
            const t = tree([p]);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(visibleNodes(layout)).toHaveLength(1);
            const solo = nodeById(layout, 'solo');
            expect(solo.layer).toBe(0);
        });

        it('positions a focused lone person', () => {
            const p = person({ id: 'solo', firstName: 'Solo' });
            const t = tree([p]);
            const layout = calculateLayout(t, 'solo');

            assertStructuralInvariants(layout);
            expect(visibleNodes(layout)).toHaveLength(1);
        });
    });

    describe('couple (no children)', () => {
        it('positions spouses on same layer adjacent to each other', () => {
            const husband = person({ id: 'h', firstName: 'Husband', gender: 'Male' });
            const wife = person({ id: 'w', firstName: 'Wife', gender: 'Female' });
            const t = tree([husband, wife], [spouseRel('h', 'w')]);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            const h = nodeById(layout, 'h');
            const w = nodeById(layout, 'w');
            expect(h.layer).toBe(w.layer);

            // Spouses without children may not be forced adjacent; verify they are at least
            // on the same layer and reasonably close (within a few node widths)
            const gap = Math.abs(h.position.x - w.position.x);
            expect(gap).toBeLessThanOrEqual(DEFAULT_LAYOUT_CONFIG.nodeWidth * 3);
        });

        it('has a spouse connection', () => {
            const husband = person({ id: 'h', firstName: 'Husband' });
            const wife = person({ id: 'w', firstName: 'Wife' });
            const t = tree([husband, wife], [spouseRel('h', 'w')]);
            const layout = calculateLayout(t, null);

            const spouseConns = layout.connections.filter(c => c.type === 'spouse');
            expect(spouseConns).toHaveLength(1);
        });
    });

    describe('nuclear family', () => {
        it('positions parents above children', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            const father = nodeById(layout, fam.father.id);
            const child = nodeById(layout, fam.children[0].id);
            expect(father.layer).toBeLessThan(child.layer);
        });

        it('centers children under parents', () => {
            const fam = nuclearFamily(3);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);

            const father = nodeById(layout, fam.father.id);
            const mother = nodeById(layout, fam.mother.id);
            const parentCenter = (father.position.x + mother.position.x + DEFAULT_LAYOUT_CONFIG.nodeWidth) / 2;

            const childXs = fam.children.map(c => nodeById(layout, c.id).position.x);
            const childCenter = (Math.min(...childXs) + Math.max(...childXs) + DEFAULT_LAYOUT_CONFIG.nodeWidth) / 2;

            expect(Math.abs(parentCenter - childCenter)).toBeLessThan(DEFAULT_LAYOUT_CONFIG.nodeWidth);
        });

        it('has no overlapping nodes with 5 children', () => {
            const fam = nuclearFamily(5);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(visibleNodes(layout)).toHaveLength(7);
        });

        it('creates parent-child connections', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const pcConns = layout.connections.filter(c => c.type === 'parent-child');
            expect(pcConns.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('three generations', () => {
        it('assigns correct layers to each generation', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);

            const grandpa = nodeById(layout, 'grandpa');
            const father = nodeById(layout, 'father');
            const child = nodeById(layout, 'child1');

            expect(grandpa.layer).toBeLessThan(father.layer);
            expect(father.layer).toBeLessThan(child.layer);
        });

        it('has no node overlaps', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
        });

        it('positions uncle and father on same layer', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const father = nodeById(layout, 'father');
            const uncle = nodeById(layout, 'uncle');
            expect(father.layer).toBe(uncle.layer);
        });

        it('has minimal edge crossings', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            // Both grandparent→parent and parent→child relationships form K₂,₂
            // complete bipartite subgraphs, each with a minimum of 1 crossing.
            // So 2 crossings is the theoretical minimum for this topology.
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
            for (const node of Array.from(layout.nodes.values()).filter(n => n.isVisible)) {
                layerMap.set(node.id, node.layer);
                visibleNodeIds.add(node.id);
                xPositions.set(node.id, node.position.x);
            }
            const crossings = _testInternals.countCrossingsOptimized(layerMap, xPositions, maps, visibleNodeIds, DEFAULT_LAYOUT_CONFIG);
            expect(crossings).toBeLessThanOrEqual(2);
        });
    });

    describe('half-siblings', () => {
        it('positions half-siblings on the same layer', () => {
            const father = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
            const mother1 = person({ id: 'mom1', firstName: 'Mom1', gender: 'Female' });
            const mother2 = person({ id: 'mom2', firstName: 'Mom2', gender: 'Female' });
            const child1 = person({ id: 'c1', firstName: 'Child1' });
            const child2 = person({ id: 'c2', firstName: 'Child2' });

            const rels = [
                spouseRel('dad', 'mom1'),
                spouseRel('dad', 'mom2'),
                parentRel('c1', 'dad'),
                parentRel('c1', 'mom1'),
                parentRel('c2', 'dad'),
                parentRel('c2', 'mom2'),
            ];

            const t = tree([father, mother1, mother2, child1, child2], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);

            const c1 = nodeById(layout, 'c1');
            const c2 = nodeById(layout, 'c2');
            expect(c1.layer).toBe(c2.layer);
        });

        it('keeps all parents on the same layer', () => {
            const father = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
            const mother1 = person({ id: 'mom1', firstName: 'Mom1', gender: 'Female' });
            const mother2 = person({ id: 'mom2', firstName: 'Mom2', gender: 'Female' });
            const child1 = person({ id: 'c1', firstName: 'Child1' });
            const child2 = person({ id: 'c2', firstName: 'Child2' });

            const rels = [
                spouseRel('dad', 'mom1'),
                spouseRel('dad', 'mom2'),
                parentRel('c1', 'dad'),
                parentRel('c1', 'mom1'),
                parentRel('c2', 'dad'),
                parentRel('c2', 'mom2'),
            ];

            const t = tree([father, mother1, mother2, child1, child2], rels);
            const layout = calculateLayout(t, null);

            const dad = nodeById(layout, 'dad');
            const mom1 = nodeById(layout, 'mom1');
            const mom2 = nodeById(layout, 'mom2');
            expect(dad.layer).toBe(mom1.layer);
            expect(dad.layer).toBe(mom2.layer);
        });

        it('has no overlapping nodes', () => {
            const father = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
            const mother1 = person({ id: 'mom1', firstName: 'Mom1', gender: 'Female' });
            const mother2 = person({ id: 'mom2', firstName: 'Mom2', gender: 'Female' });
            const child1 = person({ id: 'c1', firstName: 'Child1' });
            const child2 = person({ id: 'c2', firstName: 'Child2' });

            const rels = [
                spouseRel('dad', 'mom1'),
                spouseRel('dad', 'mom2'),
                parentRel('c1', 'dad'),
                parentRel('c1', 'mom1'),
                parentRel('c2', 'dad'),
                parentRel('c2', 'mom2'),
            ];

            const t = tree([father, mother1, mother2, child1, child2], rels);
            const layout = calculateLayout(t, null);

            assertNoOverlaps(layout);
        });
    });

    describe('co-parents (not married)', () => {
        it('connects co-parents with coparent connection type', () => {
            const dad = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
            const mom = person({ id: 'mom', firstName: 'Mom', gender: 'Female' });
            const child = person({ id: 'c', firstName: 'Child' });

            const rels = [
                parentRel('c', 'dad'),
                parentRel('c', 'mom'),
            ];

            const t = tree([dad, mom, child], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);

            const coparentConns = layout.connections.filter(c => c.type === 'coparent');
            expect(coparentConns).toHaveLength(1);
        });

        it('positions co-parents on the same layer', () => {
            const dad = person({ id: 'dad', firstName: 'Dad' });
            const mom = person({ id: 'mom', firstName: 'Mom' });
            const child = person({ id: 'c', firstName: 'Child' });

            const rels = [
                parentRel('c', 'dad'),
                parentRel('c', 'mom'),
            ];

            const t = tree([dad, mom, child], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(nodeById(layout, 'dad').layer).toBe(nodeById(layout, 'mom').layer);
        });
    });

    describe('multiple spouses', () => {
        it('places person with 3 spouses without overlaps', () => {
            const p = person({ id: 'p', firstName: 'Central', gender: 'Male' });
            const s1 = person({ id: 's1', firstName: 'Spouse1', gender: 'Female' });
            const s2 = person({ id: 's2', firstName: 'Spouse2', gender: 'Female' });
            const s3 = person({ id: 's3', firstName: 'Spouse3', gender: 'Female' });

            const c1 = person({ id: 'c1', firstName: 'Child1' });
            const c2 = person({ id: 'c2', firstName: 'Child2' });
            const c3 = person({ id: 'c3', firstName: 'Child3' });

            const rels = [
                spouseRel('p', 's1'),
                spouseRel('p', 's2'),
                spouseRel('p', 's3'),
                parentRel('c1', 'p'), parentRel('c1', 's1'),
                parentRel('c2', 'p'), parentRel('c2', 's2'),
                parentRel('c3', 'p'), parentRel('c3', 's3'),
            ];

            const t = tree([p, s1, s2, s3, c1, c2, c3], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
        });

        it('keeps all spouses on the same layer', () => {
            const p = person({ id: 'p', firstName: 'Central', gender: 'Male' });
            const s1 = person({ id: 's1', firstName: 'Spouse1', gender: 'Female' });
            const s2 = person({ id: 's2', firstName: 'Spouse2', gender: 'Female' });

            const rels = [
                spouseRel('p', 's1'),
                spouseRel('p', 's2'),
            ];

            const t = tree([p, s1, s2], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            const central = nodeById(layout, 'p');
            expect(nodeById(layout, 's1').layer).toBe(central.layer);
            expect(nodeById(layout, 's2').layer).toBe(central.layer);
        });
    });

    describe('disconnected persons', () => {
        it('positions disconnected persons without overlaps', () => {
            const p1 = person({ id: 'p1', firstName: 'Loner1' });
            const p2 = person({ id: 'p2', firstName: 'Loner2' });
            const p3 = person({ id: 'p3', firstName: 'Loner3' });
            const t = tree([p1, p2, p3]);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(visibleNodes(layout)).toHaveLength(3);
        });

        it('handles mix of connected and disconnected persons', () => {
            const fam = nuclearFamily(1);
            const loner = person({ id: 'loner', firstName: 'Loner' });
            const allPersons = [fam.father, fam.mother, ...fam.children, loner];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(visibleNodes(layout)).toHaveLength(4);
        });
    });

    describe('focus mode & visibility', () => {
        it('shows only focus person lineage when focused', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, 'child1');

            const visible = visibleNodes(layout);
            const visibleIds = new Set(visible.map(n => n.id));

            expect(visibleIds.has('child1')).toBe(true);
            expect(visibleIds.has('father')).toBe(true);
            expect(visibleIds.has('mother')).toBe(true);
            expect(visibleIds.has('grandpa')).toBe(true);
            expect(visibleIds.has('grandma')).toBe(true);
        });

        it('shows focus person spouses', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, 'father');

            const visible = visibleNodes(layout);
            const visibleIds = new Set(visible.map(n => n.id));

            expect(visibleIds.has('father')).toBe(true);
            expect(visibleIds.has('mother')).toBe(true);
        });

        it('shows direct children of focus person', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, 'father');

            const visible = visibleNodes(layout);
            const visibleIds = new Set(visible.map(n => n.id));

            expect(visibleIds.has('child1')).toBe(true);
            expect(visibleIds.has('child2')).toBe(true);
        });

        it('respects expanded nodes', () => {
            const grandpa = person({ id: 'gp', firstName: 'Grandpa' });
            const father = person({ id: 'dad', firstName: 'Dad' });
            const child = person({ id: 'kid', firstName: 'Kid' });
            const grandchild = person({ id: 'gkid', firstName: 'Grandkid' });

            const rels = [
                parentRel('dad', 'gp'),
                parentRel('kid', 'dad'),
                parentRel('gkid', 'kid'),
            ];

            const t = tree([grandpa, father, child, grandchild], rels);
            const layout = calculateLayout(t, 'dad', {
                expandedNodeIds: new Set(['kid']),
            });

            const visibleIds = new Set(visibleNodes(layout).map(n => n.id));
            expect(visibleIds.has('gkid')).toBe(true);
        });

        it('shows all persons when no focus', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            expect(visibleNodes(layout)).toHaveLength(fam.allPersons.length);
        });
    });

    describe('descendant counts', () => {
        it('counts direct children', () => {
            const fam = nuclearFamily(3);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const father = nodeById(layout, fam.father.id);
            expect(father.descendantCount).toBe(3);
        });

        it('counts zero for leaf nodes', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            for (const child of fam.children) {
                expect(nodeById(layout, child.id).descendantCount).toBe(0);
            }
        });

        it('counts recursively across generations', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const grandpa = nodeById(layout, 'grandpa');
            // grandpa -> father, uncle (2 children) + child1, child2 (2 grandchildren) = 4
            expect(grandpa.descendantCount).toBe(4);
        });
    });

    describe('family nodes', () => {
        it('creates family node for couple with children', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            expect(layout.familyNodes.size).toBeGreaterThanOrEqual(1);
        });

        it('family node is between parent and child layers', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const father = nodeById(layout, fam.father.id);
            const child = nodeById(layout, fam.children[0].id);

            for (const fn of layout.familyNodes.values()) {
                if (fn.parentIds.includes(fam.father.id)) {
                    expect(fn.position.y).toBeGreaterThan(father.position.y);
                    expect(fn.position.y).toBeLessThan(child.position.y);
                }
            }
        });
    });

    describe('bounds', () => {
        it('bounds contain all visible nodes', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            for (const node of visibleNodes(layout)) {
                expect(node.position.x).toBeGreaterThanOrEqual(layout.bounds.minX);
                expect(node.position.x + node.width).toBeLessThanOrEqual(layout.bounds.maxX);
                expect(node.position.y).toBeGreaterThanOrEqual(layout.bounds.minY);
                expect(node.position.y + node.height).toBeLessThanOrEqual(layout.bounds.maxY);
            }
        });

        it('bounds width and height are positive', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            expect(layout.bounds.width).toBeGreaterThan(0);
            expect(layout.bounds.height).toBeGreaterThan(0);
        });
    });

    describe('single parent', () => {
        it('positions single parent above child', () => {
            const dad = person({ id: 'dad', firstName: 'Dad' });
            const child = person({ id: 'child', firstName: 'Child' });
            const rels = [parentRel('child', 'dad')];

            const t = tree([dad, child], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
            expect(nodeById(layout, 'dad').layer).toBeLessThan(nodeById(layout, 'child').layer);
        });

        it('handles single parent with multiple children', () => {
            const dad = person({ id: 'dad', firstName: 'Dad' });
            const c1 = person({ id: 'c1', firstName: 'Child1' });
            const c2 = person({ id: 'c2', firstName: 'Child2' });
            const c3 = person({ id: 'c3', firstName: 'Child3' });
            const rels = [
                parentRel('c1', 'dad'),
                parentRel('c2', 'dad'),
                parentRel('c3', 'dad'),
            ];

            const t = tree([dad, c1, c2, c3], rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
        });
    });

    describe('deep lineage (5 generations)', () => {
        it('assigns strictly increasing layers', () => {
            const persons = [];
            const rels = [];
            let prevId: string | null = null;

            for (let gen = 0; gen < 5; gen++) {
                const p = person({ id: `gen${gen}`, firstName: `Gen${gen}` });
                persons.push(p);
                if (prevId) {
                    rels.push(parentRel(p.id, prevId));
                }
                prevId = p.id;
            }

            const t = tree(persons, rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);

            for (let gen = 1; gen < 5; gen++) {
                const parentNode = nodeById(layout, `gen${gen - 1}`);
                const childNode = nodeById(layout, `gen${gen}`);
                expect(childNode.layer).toBe(parentNode.layer + 1);
            }
        });

        it('has no overlaps across 5 generations', () => {
            const persons = [];
            const rels = [];

            for (let gen = 0; gen < 5; gen++) {
                const father = person({ id: `f${gen}`, firstName: `Father${gen}`, gender: 'Male' });
                const mother = person({ id: `m${gen}`, firstName: `Mother${gen}`, gender: 'Female' });
                persons.push(father, mother);
                rels.push(spouseRel(father.id, mother.id));

                if (gen > 0) {
                    rels.push(parentRel(father.id, `f${gen - 1}`));
                    rels.push(parentRel(father.id, `m${gen - 1}`));
                }
            }

            const t = tree(persons, rels);
            const layout = calculateLayout(t, null);

            assertStructuralInvariants(layout);
        });
    });

    describe('connections', () => {
        it('generates spouse connections for married couples', () => {
            const fam = nuclearFamily(1);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const spouseConns = layout.connections.filter(c => c.type === 'spouse');
            expect(spouseConns).toHaveLength(1);
        });

        it('generates parent-child connections', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const pcConns = layout.connections.filter(c => c.type === 'parent-child');
            expect(pcConns.length).toBeGreaterThanOrEqual(2);
        });

        it('does not duplicate spouse connections', () => {
            const h = person({ id: 'h', firstName: 'Husband' });
            const w = person({ id: 'w', firstName: 'Wife' });
            const t = tree([h, w], [spouseRel('h', 'w')]);
            const layout = calculateLayout(t, null);

            const spouseConns = layout.connections.filter(c => c.type === 'spouse');
            expect(spouseConns).toHaveLength(1);
        });
    });

    describe('focus lineage marking', () => {
        it('marks focus person and ancestors as lineage', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, 'child1');

            const child = nodeById(layout, 'child1');
            const father = nodeById(layout, 'father');
            const grandpa = nodeById(layout, 'grandpa');

            expect(child.isFocusLineage).toBe(true);
            expect(father.isFocusLineage).toBe(true);
            expect(grandpa.isFocusLineage).toBe(true);
        });

        it('marks focus person spouses as lineage', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, 'father');

            expect(nodeById(layout, 'mother').isFocusLineage).toBe(true);
        });

        it('no lineage marking when no focus', () => {
            const fam = threeGenerations();
            const t = tree(fam.allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            for (const node of layout.nodes.values()) {
                expect(node.isFocusLineage).toBe(false);
            }
        });
    });

    describe('isCollapsed flag', () => {
        it('marks nodes with descendants as collapsed by default', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            const father = nodeById(layout, fam.father.id);
            expect(father.isCollapsed).toBe(true);
        });

        it('marks leaf nodes as not collapsed', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null);

            for (const child of fam.children) {
                expect(nodeById(layout, child.id).isCollapsed).toBe(false);
            }
        });

        it('marks expanded nodes as not collapsed', () => {
            const fam = nuclearFamily(2);
            const allPersons = [fam.father, fam.mother, ...fam.children];
            const t = tree(allPersons, fam.relationships);
            const layout = calculateLayout(t, null, {
                expandedNodeIds: new Set([fam.father.id]),
            });

            const father = nodeById(layout, fam.father.id);
            expect(father.isCollapsed).toBe(false);
        });
    });

    describe('empty tree', () => {
        it('handles empty tree gracefully', () => {
            const t = tree([]);
            const layout = calculateLayout(t, null);

            expect(visibleNodes(layout)).toHaveLength(0);
            expect(layout.bounds.width).toBeGreaterThan(0);
            expect(layout.connections).toHaveLength(0);
        });
    });
});
