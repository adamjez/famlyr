import type { FamilyTreeModel, PersonModel, RelationshipModel } from '$lib/types/api';
import type { TreeLayout, TreeNode, TreeBounds, TreeConnection, LayoutConfig, Position, LODLevel, FamilyNode } from '$lib/types/tree';
import { DEFAULT_LAYOUT_CONFIG, LOD_CONFIGS } from '$lib/types/tree';

interface RelationshipMaps {
    parentOf: Map<string, string[]>;
    childOf: Map<string, string[]>;
    spouseOf: Map<string, string[]>;
}

interface FamilyCluster {
    id: string;
    parentIds: string[];
    childIds: string[];
    layer: number;
    childClusters: FamilyCluster[];
    width: number;
    centerX: number;
}

interface ClusterTree {
    roots: FamilyCluster[];
    clusterByChildId: Map<string, FamilyCluster>;
    personToOwnClusters: Map<string, FamilyCluster[]>;
}

type BondType = 'spouse' | 'coparent' | 'sibling';

function getBondType(
    a: string,
    b: string,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): BondType | null {
    if ((maps.spouseOf.get(a) ?? []).includes(b)) return 'spouse';

    const childrenA = maps.parentOf.get(a) ?? [];
    const childrenB = maps.parentOf.get(b) ?? [];
    if (childrenA.some(c => visibleNodeIds.has(c) && childrenB.includes(c))) return 'coparent';

    const parentsA = maps.childOf.get(a) ?? [];
    const parentsB = maps.childOf.get(b) ?? [];
    if (parentsA.some(p => visibleNodeIds.has(p) && parentsB.includes(p))) return 'sibling';

    return null;
}

function buildRelationshipMaps(relationships: RelationshipModel[]): RelationshipMaps {
    const parentOf = new Map<string, string[]>();
    const childOf = new Map<string, string[]>();
    const spouseOf = new Map<string, string[]>();

    for (const rel of relationships) {
        if (rel.type === 'Parent') {
            const childId = rel.subjectId;
            const parentId = rel.relativeId;

            if (!parentOf.has(parentId)) parentOf.set(parentId, []);
            parentOf.get(parentId)!.push(childId);

            if (!childOf.has(childId)) childOf.set(childId, []);
            childOf.get(childId)!.push(parentId);

        } else if (rel.type === 'Spouse') {
            if (!spouseOf.has(rel.subjectId)) spouseOf.set(rel.subjectId, []);
            if (!spouseOf.has(rel.relativeId)) spouseOf.set(rel.relativeId, []);
            spouseOf.get(rel.subjectId)!.push(rel.relativeId);
            spouseOf.get(rel.relativeId)!.push(rel.subjectId);
        }
    }

    return { parentOf, childOf, spouseOf };
}

function assignLayers(
    focusPersonId: string | null,
    persons: PersonModel[],
    maps: RelationshipMaps
): Map<string, number> {
    const layers = new Map<string, number>();
    const visited = new Set<string>();

    // When no focus, start from root persons (those without parents)
    let startPersonId = focusPersonId;
    if (!startPersonId && persons.length > 0) {
        const rootPerson = persons.find(p => {
            const parents = maps.childOf.get(p.id) ?? [];
            return parents.length === 0;
        });
        startPersonId = rootPerson?.id ?? persons[0].id;
    }

    if (!startPersonId) {
        return layers;
    }

    const queue: { id: string; layer: number }[] = [{ id: startPersonId, layer: 0 }];

    while (true) {
        while (queue.length > 0) {
            const { id, layer } = queue.shift()!;

            if (visited.has(id)) continue;
            visited.add(id);
            layers.set(id, layer);

            const parents = maps.childOf.get(id) ?? [];
            for (const parentId of parents) {
                if (!visited.has(parentId)) {
                    queue.push({ id: parentId, layer: layer - 1 });
                }
            }

            const children = maps.parentOf.get(id) ?? [];
            for (const childId of children) {
                if (!visited.has(childId)) {
                    queue.push({ id: childId, layer: layer + 1 });
                }
            }

            const spouses = maps.spouseOf.get(id) ?? [];
            for (const spouseId of spouses) {
                if (!visited.has(spouseId)) {
                    queue.push({ id: spouseId, layer: layer });
                }
            }

            for (const childId of children) {
                const childParents = maps.childOf.get(childId) ?? [];
                for (const coParentId of childParents) {
                    if (!visited.has(coParentId)) {
                        queue.push({ id: coParentId, layer: layer });
                    }
                }
            }
        }

        // Find next disconnected component root
        let found = false;
        for (const person of persons) {
            if (!visited.has(person.id)) {
                const parents = maps.childOf.get(person.id) ?? [];
                if (parents.length === 0) {
                    queue.push({ id: person.id, layer: 0 });
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            for (const person of persons) {
                if (!visited.has(person.id)) {
                    queue.push({ id: person.id, layer: 0 });
                    found = true;
                    break;
                }
            }
        }
        if (!found) break;
    }

    for (const person of persons) {
        if (!layers.has(person.id)) {
            layers.set(person.id, 0);
        }
    }

    return layers;
}

function findCoParents(personId: string, maps: RelationshipMaps): Map<string, string[]> {
    const coParents = new Map<string, string[]>();
    const spouses = new Set(maps.spouseOf.get(personId) ?? []);
    const children = maps.parentOf.get(personId) ?? [];

    for (const childId of children) {
        const childParents = maps.childOf.get(childId) ?? [];
        for (const otherParentId of childParents) {
            if (otherParentId === personId) continue;
            if (spouses.has(otherParentId)) continue;

            if (!coParents.has(otherParentId)) {
                coParents.set(otherParentId, []);
            }
            coParents.get(otherParentId)!.push(childId);
        }
    }

    return coParents;
}

function buildClusterTree(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    focusPersonId: string | null
): ClusterTree {
    const allClusters = new Map<string, FamilyCluster>();
    const clusterByChildId = new Map<string, FamilyCluster>();
    const personToOwnClusters = new Map<string, FamilyCluster[]>();
    const processedPairs = new Set<string>();

    const visiblePersons = persons.filter(p => visibleNodeIds.has(p.id));

    for (const person of visiblePersons) {
        const personId = person.id;
        const layer = layerMap.get(personId) ?? 0;
        const allChildren = (maps.parentOf.get(personId) ?? []).filter(c => visibleNodeIds.has(c));

        if (allChildren.length === 0) continue;

        const spouses = (maps.spouseOf.get(personId) ?? []).filter(s => visibleNodeIds.has(s));
        const childrenByPartner = new Map<string | null, string[]>();

        for (const childId of allChildren) {
            const childParents = maps.childOf.get(childId) ?? [];
            const otherParent = childParents.find(p => p !== personId && visibleNodeIds.has(p));

            if (otherParent) {
                if (!childrenByPartner.has(otherParent)) {
                    childrenByPartner.set(otherParent, []);
                }
                childrenByPartner.get(otherParent)!.push(childId);
            } else {
                if (!childrenByPartner.has(null)) {
                    childrenByPartner.set(null, []);
                }
                childrenByPartner.get(null)!.push(childId);
            }
        }

        for (const [partnerId, children] of childrenByPartner) {
            let clusterId: string;
            let parentIds: string[];

            if (partnerId) {
                const pairKey = [personId, partnerId].sort().join('-');
                if (processedPairs.has(pairKey)) continue;
                processedPairs.add(pairKey);

                clusterId = `cluster-${pairKey}`;
                parentIds = [personId, partnerId].sort();
            } else {
                clusterId = `cluster-single-${personId}`;
                parentIds = [personId];
            }

            const cluster: FamilyCluster = {
                id: clusterId,
                parentIds,
                childIds: children,
                layer,
                childClusters: [],
                width: 0,
                centerX: 0
            };

            allClusters.set(clusterId, cluster);

            for (const pid of parentIds) {
                if (!personToOwnClusters.has(pid)) {
                    personToOwnClusters.set(pid, []);
                }
                personToOwnClusters.get(pid)!.push(cluster);
            }

            for (const childId of children) {
                clusterByChildId.set(childId, cluster);
            }
        }
    }

    for (const cluster of allClusters.values()) {
        for (const childId of cluster.childIds) {
            const childClusters = personToOwnClusters.get(childId) ?? [];
            cluster.childClusters.push(...childClusters);
        }
    }

    const roots: FamilyCluster[] = [];
    const clustersWithParents = new Set<string>();

    for (const cluster of allClusters.values()) {
        for (const childCluster of cluster.childClusters) {
            clustersWithParents.add(childCluster.id);
        }
    }

    for (const cluster of allClusters.values()) {
        if (!clustersWithParents.has(cluster.id)) {
            roots.push(cluster);
        }
    }

    if (roots.length === 0 && focusPersonId && visibleNodeIds.has(focusPersonId)) {
        const focusCluster: FamilyCluster = {
            id: `cluster-focus-${focusPersonId}`,
            parentIds: [focusPersonId],
            childIds: [],
            layer: layerMap.get(focusPersonId) ?? 0,
            childClusters: [],
            width: 0,
            centerX: 0
        };
        roots.push(focusCluster);
        personToOwnClusters.set(focusPersonId, [focusCluster]);
    }

    return { roots, clusterByChildId, personToOwnClusters };
}

function createFamilyNodes(
    clusterTree: ClusterTree,
    layerMap: Map<string, number>,
    visibleNodeIds: Set<string>
): Map<string, FamilyNode> {
    const familyNodes = new Map<string, FamilyNode>();

    function processCluster(cluster: FamilyCluster): void {
        if (cluster.childIds.length === 0) return;

        const visibleChildren = cluster.childIds.filter(id => visibleNodeIds.has(id));
        if (visibleChildren.length === 0) return;

        const familyNodeId = cluster.parentIds.length === 2
            ? `family-${cluster.parentIds.sort().join('-')}`
            : `family-single-${cluster.parentIds[0]}`;

        if (!familyNodes.has(familyNodeId)) {
            familyNodes.set(familyNodeId, {
                id: familyNodeId,
                parentIds: cluster.parentIds,
                childIds: visibleChildren,
                layer: cluster.layer,
                position: { x: 0, y: 0 }
            });
        }

        for (const childCluster of cluster.childClusters) {
            processCluster(childCluster);
        }
    }

    for (const root of clusterTree.roots) {
        processCluster(root);
    }

    return familyNodes;
}

function positionFamilyNodes(
    familyNodes: Map<string, FamilyNode>,
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    config: LayoutConfig
): void {
    for (const familyNode of familyNodes.values()) {
        const parentXs = familyNode.parentIds
            .map(id => xPositions.get(id))
            .filter((x): x is number => x !== undefined);

        if (parentXs.length === 0) continue;

        // Centre the connector node over the CHILDREN so drop lines fall straight;
        // fall back to the parents when children aren't positioned.
        const childXs = familyNode.childIds
            .map(id => xPositions.get(id))
            .filter((x): x is number => x !== undefined);
        const anchorXs = childXs.length > 0 ? childXs : parentXs;

        const centerX = anchorXs.reduce((a, b) => a + b, 0) / anchorXs.length
            + config.nodeWidth / 2;

        const parentLayer = familyNode.layer;
        const parentBottomY = parentLayer * config.generationGap + config.nodeHeight;
        const childTopY = (parentLayer + 1) * config.generationGap;
        const familyNodeY = (parentBottomY + childTopY) / 2;

        familyNode.position = { x: centerX, y: familyNodeY };
    }
}

interface LineSegment {
    parentId: string;
    childId: string;
    parentX: number;
    childX: number;
}

function doLinesIntersect(line1: LineSegment, line2: LineSegment): boolean {
    if (line1.parentId === line2.parentId || line1.childId === line2.childId) {
        return false;
    }
    const left1 = Math.min(line1.parentX, line1.childX);
    const right1 = Math.max(line1.parentX, line1.childX);
    const left2 = Math.min(line2.parentX, line2.childX);
    const right2 = Math.max(line2.parentX, line2.childX);

    if (right1 < left2 || right2 < left1) {
        return false;
    }

    return (line1.parentX - line2.parentX) * (line1.childX - line2.childX) < 0;
}

function countCrossings(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): number {
    const lines: LineSegment[] = [];

    for (const [parentId, children] of maps.parentOf) {
        if (!visibleNodeIds.has(parentId)) continue;
        const parentX = xPositions.get(parentId);
        if (parentX === undefined) continue;

        for (const childId of children) {
            if (!visibleNodeIds.has(childId)) continue;
            const childX = xPositions.get(childId);
            if (childX === undefined) continue;

            lines.push({
                parentId,
                childId,
                parentX: parentX + config.nodeWidth / 2,
                childX: childX + config.nodeWidth / 2
            });
        }
    }

    let crossings = 0;
    for (let i = 0; i < lines.length; i++) {
        for (let j = i + 1; j < lines.length; j++) {
            if (doLinesIntersect(lines[i], lines[j])) {
                crossings++;
            }
        }
    }

    return crossings;
}

function countInversions(arr: number[]): number {
    if (arr.length <= 1) return 0;

    const mid = Math.floor(arr.length / 2);
    const left = arr.slice(0, mid);
    const right = arr.slice(mid);

    let inversions = countInversions(left) + countInversions(right);

    let i = 0, j = 0, k = 0;
    while (i < left.length && j < right.length) {
        if (left[i] <= right[j]) {
            arr[k++] = left[i++];
        } else {
            arr[k++] = right[j++];
            inversions += left.length - i;
        }
    }

    while (i < left.length) arr[k++] = left[i++];
    while (j < right.length) arr[k++] = right[j++];

    return inversions;
}

function countCrossingsOptimized(
    layerMap: Map<string, number>,
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): number {
    const layerPairEdges = new Map<string, Array<{ fromX: number; toX: number }>>();

    for (const [parentId, children] of maps.parentOf) {
        if (!visibleNodeIds.has(parentId)) continue;
        const parentLayer = layerMap.get(parentId);
        const parentX = xPositions.get(parentId);
        if (parentLayer === undefined || parentX === undefined) continue;

        for (const childId of children) {
            if (!visibleNodeIds.has(childId)) continue;
            const childLayer = layerMap.get(childId);
            const childX = xPositions.get(childId);
            if (childLayer === undefined || childX === undefined) continue;

            const key = `${parentLayer}-${childLayer}`;
            if (!layerPairEdges.has(key)) layerPairEdges.set(key, []);
            layerPairEdges.get(key)!.push({
                fromX: parentX + config.nodeWidth / 2,
                toX: childX + config.nodeWidth / 2
            });
        }
    }

    let totalCrossings = 0;
    for (const edges of layerPairEdges.values()) {
        if (edges.length <= 1) continue;
        const sorted = [...edges].sort((a, b) => a.fromX - b.fromX);
        const toXs = sorted.map(e => e.toX);
        totalCrossings += countInversions(toXs);
    }

    return totalCrossings;
}

// ─────────────────────────────────────────────────────────────────────
// Order-key layout (Phase 2 + 3 rewrite)
//
// Each node's order key = mean of its children's keys; a leaf gets the next
// sequential slot. This makes couples share a key region (they share children)
// and multi-union parents land between their partners — no crossing heuristics.
// ─────────────────────────────────────────────────────────────────────

function computeOrderKeys(
    persons: PersonModel[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): Map<string, number> {
    const key = new Map<string, number>();
    const visiting = new Set<string>();
    let nextSlot = 0;

    function visit(id: string): number {
        const existing = key.get(id);
        if (existing !== undefined) return existing;
        if (visiting.has(id)) return nextSlot; // guard against relationship cycles
        visiting.add(id);

        const children = (maps.parentOf.get(id) ?? []).filter(c => visibleNodeIds.has(c));
        let k: number;
        if (children.length === 0) {
            k = nextSlot++;
        } else {
            let sum = 0;
            for (const child of children) sum += visit(child);
            k = sum / children.length;
        }
        key.set(id, k);
        visiting.delete(id);
        return k;
    }

    // Drive from lineage tops (no visible parents) that actually have children,
    // so slots are assigned left-to-right down each lineage. Childless tops are
    // left for the fallback below, so a married-in spouse takes its partner's key
    // instead of an unrelated slot — keeping the couple together.
    const tops = persons.filter(p => {
        if (!visibleNodeIds.has(p.id)) return false;
        const hasParent = (maps.childOf.get(p.id) ?? []).some(pa => visibleNodeIds.has(pa));
        const hasChild = (maps.parentOf.get(p.id) ?? []).some(c => visibleNodeIds.has(c));
        return !hasParent && hasChild;
    });
    for (const top of tops) visit(top.id);

    // Anyone still unkeyed (childless): inherit a bonded partner's key so couples
    // stay adjacent; otherwise take a fresh slot. Iterate until stable so chains
    // of childless nodes all resolve.
    let changed = true;
    while (changed) {
        changed = false;
        for (const person of persons) {
            if (!visibleNodeIds.has(person.id) || key.has(person.id)) continue;
            const partners = [
                ...(maps.spouseOf.get(person.id) ?? []),
                ...findCoParents(person.id, maps).keys(),
            ];
            const partnerKey = partners.map(s => key.get(s)).find((v): v is number => v !== undefined);
            if (partnerKey !== undefined) {
                key.set(person.id, partnerKey);
                changed = true;
            }
        }
    }
    for (const person of persons) {
        if (visibleNodeIds.has(person.id) && !key.has(person.id)) key.set(person.id, nextSlot++);
    }

    return key;
}

/** Maximal groups of same-layer nodes connected by spouse or co-parent bonds. */
function bondComponents(
    nodesInLayer: string[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): string[][] {
    const inLayer = new Set(nodesInLayer);
    const seen = new Set<string>();
    const components: string[][] = [];

    const bondedNeighbors = (id: string): string[] => {
        const out: string[] = [];
        for (const s of maps.spouseOf.get(id) ?? []) {
            if (inLayer.has(s)) out.push(s);
        }
        for (const child of (maps.parentOf.get(id) ?? []).filter(c => visibleNodeIds.has(c))) {
            for (const coParent of maps.childOf.get(child) ?? []) {
                if (coParent !== id && inLayer.has(coParent)) out.push(coParent);
            }
        }
        return out;
    };

    for (const start of nodesInLayer) {
        if (seen.has(start)) continue;
        const component: string[] = [];
        const queue = [start];
        while (queue.length > 0) {
            const cur = queue.pop()!;
            if (seen.has(cur)) continue;
            seen.add(cur);
            component.push(cur);
            for (const n of bondedNeighbors(cur)) {
                if (!seen.has(n)) queue.push(n);
            }
        }
        components.push(component);
    }
    return components;
}

function permutations<T>(items: T[]): T[][] {
    if (items.length <= 1) return [items.slice()];
    const result: T[][] = [];
    const arr = items.slice();
    const generate = (n: number) => {
        if (n === 1) {
            result.push(arr.slice());
            return;
        }
        for (let i = 0; i < n; i++) {
            generate(n - 1);
            const j = n % 2 === 0 ? i : 0;
            [arr[j], arr[n - 1]] = [arr[n - 1], arr[j]];
        }
    };
    generate(arr.length);
    return result;
}

/**
 * Order the members of one bond component left-to-right so that bonded pairs sit
 * adjacent (a couple's two partners, a chain like coparent–hub–coparent–spouse,
 * or a star with the shared parent in the middle). Components are tiny, so we
 * brute-force the best linear arrangement; large ones fall back to key order.
 */
function orderComponentByBonds(
    comp: string[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    keyOf: (id: string) => number
): string[] {
    if (comp.length <= 1) return comp;

    const byKey = [...comp].sort((a, b) => keyOf(a) - keyOf(b) || a.localeCompare(b));
    if (comp.length > 7) return byKey;

    const pairs: [string, string][] = [];
    for (let i = 0; i < comp.length; i++) {
        for (let j = i + 1; j < comp.length; j++) {
            if (getBondType(comp[i], comp[j], maps, visibleNodeIds) !== null) {
                pairs.push([comp[i], comp[j]]);
            }
        }
    }

    let best = byKey;
    let bestCost = Infinity;
    for (const perm of permutations(comp)) {
        const index = new Map(perm.map((id, i) => [id, i]));
        let nonAdjacent = 0;
        let span = 0;
        for (const [a, b] of pairs) {
            const d = Math.abs(index.get(a)! - index.get(b)!);
            if (d > 1) nonAdjacent++;
            span += d;
        }
        let keyInversions = 0;
        for (let i = 0; i < perm.length; i++) {
            for (let j = i + 1; j < perm.length; j++) {
                if (keyOf(perm[i]) > keyOf(perm[j])) keyInversions++;
            }
        }
        const cost = nonAdjacent * 1e6 + span * 1e3 + keyInversions;
        if (cost < bestCost) {
            bestCost = cost;
            best = perm;
        }
    }
    return best;
}

/** Split an already-ordered layer into contiguous runs of the same bond component. */
function bondComponentsInOrder(
    nodes: string[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): string[][] {
    const comps = bondComponents(nodes, maps, visibleNodeIds);
    const compId = new Map<string, number>();
    comps.forEach((c, i) => c.forEach(id => compId.set(id, i)));

    const result: string[][] = [];
    let current: string[] = [];
    let currentId = -1;
    for (const id of nodes) {
        const cid = compId.get(id) ?? -1;
        if (cid !== currentId && current.length > 0) {
            result.push(current);
            current = [];
        }
        currentId = cid;
        current.push(id);
    }
    if (current.length > 0) result.push(current);
    return result;
}

function buildLayerOrder(
    key: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): Map<number, string[]> {
    const byLayer = new Map<number, string[]>();
    for (const id of visibleNodeIds) {
        const layer = layerMap.get(id) ?? 0;
        if (!byLayer.has(layer)) byLayer.set(layer, []);
        byLayer.get(layer)!.push(id);
    }

    const keyOf = (id: string) => key.get(id) ?? 0;
    const order = new Map<number, string[]>();

    for (const [layer, nodes] of byLayer) {
        const components = bondComponents(nodes, maps, visibleNodeIds)
            .map(comp => orderComponentByBonds(comp, maps, visibleNodeIds, keyOf));

        const compKey = (comp: string[]) => comp.reduce((s, id) => s + keyOf(id), 0) / comp.length;
        components.sort((a, b) => compKey(a) - compKey(b) || a[0].localeCompare(b[0]));

        order.set(layer, components.flat());
    }
    return order;
}

/**
 * Barycenter crossing reduction on the ORDER (integer indices, not pixels).
 * Reorders whole bond components within each layer by the average index of their
 * neighbours in the adjacent layer. Components stay atomic, so couple adjacency
 * is never broken. Fixes crossings that key-order ties leave behind.
 */
function minimizeOrderCrossings(
    order: Map<number, string[]>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    iterations = 4
): void {
    const layers = Array.from(order.keys()).sort((a, b) => a - b);

    for (let iter = 0; iter < iterations; iter++) {
        const goingDown = iter % 2 === 0;
        const sweep = goingDown ? layers.slice(1) : layers.slice(0, -1).reverse();

        for (const layer of sweep) {
            const adjacent = order.get(layer + (goingDown ? -1 : 1)) ?? [];
            const adjIndex = new Map(adjacent.map((id, i) => [id, i]));
            const neighborsOf = (id: string) =>
                (goingDown ? maps.childOf.get(id) : maps.parentOf.get(id)) ?? [];

            const components = bondComponentsInOrder(order.get(layer) ?? [], maps, visibleNodeIds);
            const bary = new Map<string[], number>();
            components.forEach((comp, idx) => {
                const indices: number[] = [];
                for (const member of comp) {
                    for (const nb of neighborsOf(member)) {
                        const ai = adjIndex.get(nb);
                        if (ai !== undefined) indices.push(ai);
                    }
                }
                bary.set(comp, indices.length > 0
                    ? indices.reduce((a, b) => a + b, 0) / indices.length
                    : idx); // no neighbours: keep current position
            });

            const reordered = [...components]
                .map((comp, idx) => ({ comp, idx }))
                .sort((a, b) => (bary.get(a.comp)! - bary.get(b.comp)!) || (a.idx - b.idx))
                .map(x => x.comp);

            order.set(layer, reordered.flat());
        }
    }
}

function gapBetween(
    a: string,
    b: string,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): number {
    switch (getBondType(a, b, maps, visibleNodeIds)) {
        case 'spouse': return config.spouseGap;
        case 'coparent': return config.coParentGap;
        case 'sibling': return config.siblingGap;
        default: return config.branchGap;
    }
}

/** Initial left-to-right packing per layer, honouring the order and bond-aware gaps. */
function packByOrder(
    order: Map<number, string[]>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): Map<string, number> {
    const x = new Map<string, number>();
    for (const nodes of order.values()) {
        let cursor = 0;
        for (let i = 0; i < nodes.length; i++) {
            if (i > 0) cursor += config.nodeWidth + gapBetween(nodes[i - 1], nodes[i], maps, visibleNodeIds, config);
            x.set(nodes[i], cursor);
        }
    }
    return x;
}

/**
 * One centering sweep, operating on bond components as rigid blocks so couples
 * stay centered (not each spouse individually) and stay contiguous.
 *
 *   dir='up'   — align each block over its children  (sweep deep → shallow)
 *   dir='down' — align each block under its parents   (sweep shallow → deep)
 *
 * Blocks are processed left-to-right and clamped against the previous block, so
 * the per-layer order is always preserved.
 */
function centerComponents(
    layersAsc: number[],
    componentsByLayer: Map<number, string[][]>,
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig,
    dir: 'up' | 'down'
): void {
    const sweep = dir === 'up' ? [...layersAsc].reverse() : layersAsc;
    const neighborsOf = (id: string) =>
        (dir === 'up' ? maps.parentOf.get(id) : maps.childOf.get(id) ?? [])
            ?? [];

    for (const layer of sweep) {
        const components = componentsByLayer.get(layer) ?? [];
        let prevRight = -Infinity;
        let prevLast: string | null = null;

        for (const comp of components) {
            const neighborCenters: number[] = [];
            for (const member of comp) {
                for (const nb of neighborsOf(member)) {
                    if (!visibleNodeIds.has(nb)) continue;
                    const nx = xPositions.get(nb);
                    if (nx !== undefined) neighborCenters.push(nx + config.nodeWidth / 2);
                }
            }

            const xs = comp.map(id => xPositions.get(id) ?? 0);
            const compLeft = Math.min(...xs);
            const compRight = Math.max(...xs) + config.nodeWidth;
            const compCenter = (compLeft + compRight) / 2;

            let shift = 0;
            if (neighborCenters.length > 0) {
                const target = neighborCenters.reduce((a, b) => a + b, 0) / neighborCenters.length;
                shift = target - compCenter;
            }

            const minLeft = prevLast === null
                ? -Infinity
                : prevRight + gapBetween(prevLast, comp[0], maps, visibleNodeIds, config);
            if (compLeft + shift < minLeft) shift = minLeft - compLeft;

            for (const id of comp) xPositions.set(id, (xPositions.get(id) ?? 0) + shift);

            prevRight = Math.max(...comp.map(id => xPositions.get(id) ?? 0)) + config.nodeWidth;
            prevLast = comp[comp.length - 1];
        }
    }
}

interface CalculatePositionsResult {
    positions: Map<string, Position>;
    familyNodes: Map<string, FamilyNode>;
}

function calculatePositions(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    focusPersonId: string | null,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): CalculatePositionsResult {
    // Phase 1: Structure — family clusters give us the connector (family) nodes
    const clusterTree = buildClusterTree(persons, layerMap, maps, visibleNodeIds, focusPersonId);
    const familyNodes = createFamilyNodes(clusterTree, layerMap, visibleNodeIds);

    // Phase 2: Ordering — order keys fix a stable left-to-right order per layer,
    // keeping couples adjacent and multi-union parents between their partners.
    const orderKeys = computeOrderKeys(persons, maps, visibleNodeIds);
    const order = buildLayerOrder(orderKeys, layerMap, maps, visibleNodeIds);
    minimizeOrderCrossings(order, maps, visibleNodeIds);

    // Phase 3: Coordinates — pack by order, then alternate centering passes over
    // bond components (couples move as one block). Every pass preserves the layer
    // order, so couples stay adjacent by construction. No Brandes-Köpf, no nudges.
    const layersAsc = Array.from(order.keys()).sort((a, b) => a - b);
    const componentsByLayer = new Map<number, string[][]>();
    for (const [layer, nodes] of order) {
        componentsByLayer.set(layer, bondComponentsInOrder(nodes, maps, visibleNodeIds));
    }

    const xPositions = packByOrder(order, maps, visibleNodeIds, config);
    for (let pass = 0; pass < 4; pass++) {
        centerComponents(layersAsc, componentsByLayer, xPositions, maps, visibleNodeIds, config, 'up');
        centerComponents(layersAsc, componentsByLayer, xPositions, maps, visibleNodeIds, config, 'down');
    }
    centerComponents(layersAsc, componentsByLayer, xPositions, maps, visibleNodeIds, config, 'up');

    // Normalize so the left edge sits at 0 (centering passes drift rightward).
    const allX = Array.from(xPositions.values());
    if (allX.length > 0) {
        const minX = Math.min(...allX);
        for (const [id, x] of xPositions) xPositions.set(id, x - minX);
    }

    // Phase 4: Finalize — position family connector nodes and compute Y
    positionFamilyNodes(familyNodes, xPositions, layerMap, config);

    const positions = new Map<string, Position>();

    for (const person of persons) {
        const layer = layerMap.get(person.id) ?? 0;
        const x = xPositions.get(person.id) ?? 0;
        const y = layer * config.generationGap;

        positions.set(person.id, { x, y });
    }

    return { positions, familyNodes };
}

function orderNodesInLayers(
    layerMap: Map<string, number>,
    persons: PersonModel[],
    positions: Map<string, Position>,
    maps: RelationshipMaps
): Map<number, PersonModel[]> {
    const layers = new Map<number, PersonModel[]>();

    for (const person of persons) {
        const layer = layerMap.get(person.id) ?? 0;
        if (!layers.has(layer)) layers.set(layer, []);
        layers.get(layer)!.push(person);
    }

    for (const [layer, layerPersons] of layers) {
        layerPersons.sort((a, b) => {
            const posA = positions.get(a.id)?.x ?? 0;
            const posB = positions.get(b.id)?.x ?? 0;
            return posA - posB;
        });
        layers.set(layer, layerPersons);
    }

    return layers;
}

function buildConnections(
    persons: PersonModel[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): TreeConnection[] {
    const connections: TreeConnection[] = [];
    const processedSpouses = new Set<string>();

    for (const person of persons) {
        if (!visibleNodeIds.has(person.id)) continue;

        const children = maps.parentOf.get(person.id) ?? [];
        const visibleChildren = children.filter(c => visibleNodeIds.has(c));
        if (visibleChildren.length > 0) {
            connections.push({
                type: 'parent-child',
                fromIds: [person.id],
                toIds: visibleChildren
            });
        }

        const spouses = maps.spouseOf.get(person.id) ?? [];
        for (const spouseId of spouses) {
            if (!visibleNodeIds.has(spouseId)) continue;
            const pairKey = [person.id, spouseId].sort().join('-');
            if (!processedSpouses.has(pairKey)) {
                processedSpouses.add(pairKey);
                connections.push({
                    type: 'spouse',
                    fromIds: [person.id],
                    toIds: [spouseId]
                });
            }
        }

        const coParents = findCoParents(person.id, maps);
        for (const coParentId of coParents.keys()) {
            if (!visibleNodeIds.has(coParentId)) continue;
            const pairKey = [person.id, coParentId].sort().join('-coparent-');
            if (!processedSpouses.has(pairKey)) {
                processedSpouses.add(pairKey);
                connections.push({
                    type: 'coparent',
                    fromIds: [person.id],
                    toIds: [coParentId]
                });
            }
        }
    }

    return connections;
}

function calculateDescendantCounts(
    persons: PersonModel[],
    maps: RelationshipMaps
): Map<string, number> {
    const counts = new Map<string, number>();
    const visited = new Set<string>();

    function countDescendants(personId: string): number {
        if (counts.has(personId)) {
            return counts.get(personId)!;
        }

        if (visited.has(personId)) {
            return 0;
        }
        visited.add(personId);

        const children = maps.parentOf.get(personId) ?? [];
        let total = children.length;

        for (const childId of children) {
            total += countDescendants(childId);
        }

        counts.set(personId, total);
        visited.delete(personId);
        return total;
    }

    for (const person of persons) {
        if (!counts.has(person.id)) {
            countDescendants(person.id);
        }
    }

    return counts;
}

function markFocusLineage(
    focusPersonId: string | null,
    maps: RelationshipMaps
): Set<string> {
    if (!focusPersonId) {
        return new Set<string>();
    }

    const lineage = new Set<string>();
    const visited = new Set<string>();

    function markAncestors(personId: string) {
        if (visited.has(personId)) return;
        visited.add(personId);
        lineage.add(personId);

        const parents = maps.childOf.get(personId) ?? [];
        for (const parentId of parents) {
            markAncestors(parentId);
        }
    }

    function markDescendants(personId: string) {
        if (visited.has(personId)) return;
        visited.add(personId);
        lineage.add(personId);

        const children = maps.parentOf.get(personId) ?? [];
        for (const childId of children) {
            markDescendants(childId);
        }
    }

    markAncestors(focusPersonId);
    visited.clear();
    markDescendants(focusPersonId);

    const spouses = maps.spouseOf.get(focusPersonId) ?? [];
    for (const spouseId of spouses) {
        lineage.add(spouseId);
    }

    return lineage;
}

function determineVisibleNodes(
    persons: PersonModel[],
    focusPersonId: string | null,
    expandedNodeIds: Set<string>,
    maps: RelationshipMaps
): Set<string> {
    // If no focus, show everyone
    if (!focusPersonId) {
        return new Set(persons.map(p => p.id));
    }

    const visible = new Set<string>();
    const ancestorsProcessed = new Set<string>();

    // 1. Add focus person and their spouses
    visible.add(focusPersonId);
    const focusSpouses = maps.spouseOf.get(focusPersonId) ?? [];
    for (const spouseId of focusSpouses) {
        visible.add(spouseId);
    }

    // 2. Add all ancestors of focus person (up to root)
    // Use separate tracking to ensure we process all ancestor branches
    function addAncestors(personId: string) {
        if (ancestorsProcessed.has(personId)) return;
        ancestorsProcessed.add(personId);

        const parents = maps.childOf.get(personId) ?? [];
        for (const parentId of parents) {
            visible.add(parentId);
            // Add ancestor's spouses
            const spouses = maps.spouseOf.get(parentId) ?? [];
            for (const spouseId of spouses) {
                visible.add(spouseId);
            }
            // Always recurse to get this parent's ancestors
            addAncestors(parentId);
        }
    }
    addAncestors(focusPersonId);

    // 3. Add direct children of focus person
    const focusChildren = maps.parentOf.get(focusPersonId) ?? [];
    for (const childId of focusChildren) {
        visible.add(childId);
        // Add child's spouses
        const childSpouses = maps.spouseOf.get(childId) ?? [];
        for (const spouseId of childSpouses) {
            visible.add(spouseId);
        }
    }

    // 4. Handle manually expanded nodes - show their children recursively
    function addExpandedDescendants(personId: string) {
        if (!expandedNodeIds.has(personId)) return;

        const children = maps.parentOf.get(personId) ?? [];
        for (const childId of children) {
            if (!visible.has(childId)) {
                visible.add(childId);
                // Add child's spouses
                const childSpouses = maps.spouseOf.get(childId) ?? [];
                for (const spouseId of childSpouses) {
                    visible.add(spouseId);
                }
            }
            // Always check if this child is expanded (even if already visible)
            addExpandedDescendants(childId);
        }
    }

    // Check all visible nodes for expansion
    for (const personId of Array.from(visible)) {
        addExpandedDescendants(personId);
    }

    return visible;
}

export interface LayoutOptions {
    config?: LayoutConfig;
    expandedNodeIds?: Set<string>;
    lod?: LODLevel;
}

export function calculateLayout(
    tree: FamilyTreeModel,
    focusPersonId: string | null,
    options: LayoutOptions = {}
): TreeLayout {
    const lod = options.lod ?? 3;
    const lodConfig = LOD_CONFIGS[lod];
    const baseConfig = options.config ?? DEFAULT_LAYOUT_CONFIG;
    const config: LayoutConfig = {
        ...baseConfig,
        nodeWidth: lodConfig.nodeWidth,
        nodeHeight: lodConfig.nodeHeight,
        siblingGap: Math.max(20, baseConfig.siblingGap * (lodConfig.nodeWidth / DEFAULT_LAYOUT_CONFIG.nodeWidth)),
        generationGap: Math.max(30, baseConfig.generationGap * (lodConfig.nodeHeight / DEFAULT_LAYOUT_CONFIG.nodeHeight)),
        spouseGap: Math.max(10, baseConfig.spouseGap * (lodConfig.nodeWidth / DEFAULT_LAYOUT_CONFIG.nodeWidth)),
        branchGap: Math.max(20, baseConfig.branchGap * (lodConfig.nodeWidth / DEFAULT_LAYOUT_CONFIG.nodeWidth))
    };
    const expandedNodeIds = options.expandedNodeIds ?? new Set<string>();

    const maps = buildRelationshipMaps(tree.relationships);
    const descendantCounts = calculateDescendantCounts(tree.persons, maps);
    const focusLineage = markFocusLineage(focusPersonId, maps);
    const visibleNodeIds = determineVisibleNodes(tree.persons, focusPersonId, expandedNodeIds, maps);

    const visiblePersons = tree.persons.filter(p => visibleNodeIds.has(p.id));

    const layerMap = assignLayers(focusPersonId, visiblePersons, maps);
    const { positions, familyNodes } = calculatePositions(visiblePersons, layerMap, maps, focusPersonId, visibleNodeIds, config);
    const orderedLayers = orderNodesInLayers(layerMap, visiblePersons, positions, maps);

    const nodes = new Map<string, TreeNode>();
    for (const person of tree.persons) {
        const isVisible = visibleNodeIds.has(person.id);
        const position = positions.get(person.id) ?? { x: 0, y: 0 };
        const layer = layerMap.get(person.id) ?? 0;
        const descendantCount = descendantCounts.get(person.id) ?? 0;
        const isFocusLineage = focusLineage.has(person.id);
        const isCollapsed = descendantCount > 0 && !expandedNodeIds.has(person.id);

        nodes.set(person.id, {
            id: person.id,
            person,
            position,
            layer,
            spouseIds: maps.spouseOf.get(person.id) ?? [],
            childIds: maps.parentOf.get(person.id) ?? [],
            parentIds: maps.childOf.get(person.id) ?? [],
            isSelected: false,
            width: config.nodeWidth,
            height: config.nodeHeight,
            isCollapsed,
            descendantCount,
            isFocusLineage,
            isVisible
        });
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const node of nodes.values()) {
        if (!node.isVisible) continue;
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x + node.width);
        minY = Math.min(minY, node.position.y);
        maxY = Math.max(maxY, node.position.y + node.height);
    }

    if (minX === Infinity) {
        minX = 0;
        maxX = config.nodeWidth;
        minY = 0;
        maxY = config.nodeHeight;
    }

    const bounds: TreeBounds = {
        minX: minX - config.padding,
        maxX: maxX + config.padding,
        minY: minY - config.padding,
        maxY: maxY + config.padding,
        width: maxX - minX + 2 * config.padding,
        height: maxY - minY + 2 * config.padding
    };

    const layers = new Map<number, TreeNode[]>();
    for (const [layerIdx, persons] of orderedLayers) {
        layers.set(layerIdx, persons.map(p => nodes.get(p.id)!).filter(n => n.isVisible));
    }

    const connections = buildConnections(tree.persons, maps, visibleNodeIds);

    return { nodes, bounds, layers, connections, familyNodes };
}

export function getFocusLineageIds(
    tree: FamilyTreeModel,
    focusPersonId: string
): string[] {
    const maps = buildRelationshipMaps(tree.relationships);
    const lineage = markFocusLineage(focusPersonId, maps);
    return Array.from(lineage);
}

export const _testInternals = {
    buildRelationshipMaps,
    assignLayers,
    buildClusterTree,
    getBondType,
    determineVisibleNodes,
    buildConnections,
    calculateDescendantCounts,
    findCoParents,
    countCrossings,
    countCrossingsOptimized,
    calculatePositions,
    markFocusLineage,
    computeOrderKeys,
    bondComponents,
    buildLayerOrder,
};
