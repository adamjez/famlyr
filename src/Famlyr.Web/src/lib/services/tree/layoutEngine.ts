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

const BOND_PRIORITY: Record<BondType, number> = {
    spouse: 3,
    coparent: 2,
    sibling: 1,
};

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

function gapForBond(bond: BondType | null, config: LayoutConfig): number {
    switch (bond) {
        case 'spouse': return config.spouseGap;
        case 'coparent': return config.coParentGap;
        case 'sibling': return config.siblingGap;
        default: return config.siblingGap;
    }
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

function findSharedChildren(parent1Id: string, parent2Id: string | null, maps: RelationshipMaps): string[] {
    const children1 = maps.parentOf.get(parent1Id) ?? [];
    if (!parent2Id) return children1;

    const children2 = maps.parentOf.get(parent2Id) ?? [];
    return children1.filter(c => children2.includes(c));
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

        const centerX = parentXs.reduce((a, b) => a + b, 0) / parentXs.length
            + config.nodeWidth / 2;

        const parentLayer = familyNode.layer;
        const parentBottomY = parentLayer * config.generationGap + config.nodeHeight;
        const childTopY = (parentLayer + 1) * config.generationGap;
        const familyNodeY = (parentBottomY + childTopY) / 2;

        familyNode.position = { x: centerX, y: familyNodeY };
    }
}

function calculateClusterWidths(
    clusterTree: ClusterTree,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const calculated = new Set<string>();

    function calculateWidth(cluster: FamilyCluster): number {
        if (calculated.has(cluster.id)) {
            return cluster.width;
        }

        const parentWidth = cluster.parentIds.length === 2
            ? (config.nodeWidth * 2 + config.spouseGap)
            : config.nodeWidth;

        if (cluster.childClusters.length === 0) {
            let childrenWidth = 0;
            for (let i = 0; i < cluster.childIds.length; i++) {
                const childId = cluster.childIds[i];
                const childSpouses = (maps.spouseOf.get(childId) ?? []).filter(s => visibleNodeIds.has(s));
                const childWidth = childSpouses.length > 0
                    ? (config.nodeWidth * 2 + config.spouseGap)
                    : config.nodeWidth;

                if (i > 0) childrenWidth += config.siblingGap;
                childrenWidth += childWidth;
            }

            cluster.width = Math.max(parentWidth, childrenWidth);
            calculated.add(cluster.id);
            return cluster.width;
        }

        let childClusterTotalWidth = 0;
        for (let i = 0; i < cluster.childClusters.length; i++) {
            const childCluster = cluster.childClusters[i];
            calculateWidth(childCluster);

            if (i > 0) childClusterTotalWidth += config.branchGap;
            childClusterTotalWidth += childCluster.width;
        }

        const leafChildren = cluster.childIds.filter(childId =>
            !cluster.childClusters.some(cc => cc.parentIds.includes(childId))
        );

        let leafChildrenWidth = 0;
        for (let i = 0; i < leafChildren.length; i++) {
            const childId = leafChildren[i];
            const childSpouses = (maps.spouseOf.get(childId) ?? []).filter(s => visibleNodeIds.has(s));
            const childWidth = childSpouses.length > 0
                ? (config.nodeWidth * 2 + config.spouseGap)
                : config.nodeWidth;

            if (leafChildrenWidth > 0 || childClusterTotalWidth > 0) {
                leafChildrenWidth += config.siblingGap;
            }
            leafChildrenWidth += childWidth;
        }

        const totalChildWidth = childClusterTotalWidth + leafChildrenWidth;
        cluster.width = Math.max(parentWidth, totalChildWidth);
        calculated.add(cluster.id);
        return cluster.width;
    }

    for (const root of clusterTree.roots) {
        calculateWidth(root);
    }
}

function assignClusterPositions(
    clusterTree: ClusterTree,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    focusPersonId: string | null,
    config: LayoutConfig
): Map<string, number> {
    const xPositions = new Map<string, number>();
    const positioned = new Set<string>();

    function positionCluster(cluster: FamilyCluster, centerX: number): void {
        cluster.centerX = centerX;

        if (cluster.parentIds.length === 2) {
            const coupleWidth = config.nodeWidth * 2 + config.spouseGap;
            const leftX = centerX - coupleWidth / 2;

            if (!positioned.has(cluster.parentIds[0]) && !positioned.has(cluster.parentIds[1])) {
                xPositions.set(cluster.parentIds[0], leftX);
                xPositions.set(cluster.parentIds[1], leftX + config.nodeWidth + config.spouseGap);
                positioned.add(cluster.parentIds[0]);
                positioned.add(cluster.parentIds[1]);
            } else if (!positioned.has(cluster.parentIds[0])) {
                const existingX = xPositions.get(cluster.parentIds[1])!;
                xPositions.set(cluster.parentIds[0], existingX - config.nodeWidth - config.spouseGap);
                positioned.add(cluster.parentIds[0]);
            } else if (!positioned.has(cluster.parentIds[1])) {
                const existingX = xPositions.get(cluster.parentIds[0])!;
                xPositions.set(cluster.parentIds[1], existingX + config.nodeWidth + config.spouseGap);
                positioned.add(cluster.parentIds[1]);
            }
        } else if (cluster.parentIds.length === 1) {
            if (!positioned.has(cluster.parentIds[0])) {
                const parentId = cluster.parentIds[0];
                const spouses = (maps.spouseOf.get(parentId) ?? []).filter(s => visibleNodeIds.has(s));
                const visibleSpouse = spouses.find(s => positioned.has(s));

                if (visibleSpouse) {
                    const spouseX = xPositions.get(visibleSpouse)!;
                    xPositions.set(parentId, spouseX + config.nodeWidth + config.spouseGap);
                } else {
                    xPositions.set(parentId, centerX - config.nodeWidth / 2);
                }
                positioned.add(parentId);
            }
        }

        if (cluster.childIds.length === 0) return;

        const leafChildren = cluster.childIds.filter(childId =>
            !cluster.childClusters.some(cc => cc.parentIds.includes(childId))
        );

        let totalChildWidth = 0;
        for (let i = 0; i < cluster.childClusters.length; i++) {
            if (i > 0) totalChildWidth += config.branchGap;
            totalChildWidth += cluster.childClusters[i].width;
        }

        for (let i = 0; i < leafChildren.length; i++) {
            const childId = leafChildren[i];
            const childSpouses = (maps.spouseOf.get(childId) ?? []).filter(s => visibleNodeIds.has(s));
            const childWidth = childSpouses.length > 0
                ? (config.nodeWidth * 2 + config.spouseGap)
                : config.nodeWidth;

            if (totalChildWidth > 0 || i > 0) {
                totalChildWidth += config.siblingGap;
            }
            totalChildWidth += childWidth;
        }

        let currentX = centerX - totalChildWidth / 2;

        for (const childCluster of cluster.childClusters) {
            const childCenterX = currentX + childCluster.width / 2;
            positionCluster(childCluster, childCenterX);
            currentX += childCluster.width + config.branchGap;
        }

        for (const childId of leafChildren) {
            if (positioned.has(childId)) continue;

            const childSpouses = (maps.spouseOf.get(childId) ?? []).filter(s => visibleNodeIds.has(s));
            const hasSpouse = childSpouses.length > 0;
            const childWidth = hasSpouse
                ? (config.nodeWidth * 2 + config.spouseGap)
                : config.nodeWidth;

            xPositions.set(childId, currentX);
            positioned.add(childId);

            if (hasSpouse) {
                const spouseId = childSpouses[0];
                xPositions.set(spouseId, currentX + config.nodeWidth + config.spouseGap);
                positioned.add(spouseId);
            }

            currentX += childWidth + config.siblingGap;
        }
    }

    let focusRootCluster: FamilyCluster | null = null;
    const otherRoots: FamilyCluster[] = [];

    for (const root of clusterTree.roots) {
        if (focusPersonId && root.parentIds.includes(focusPersonId)) {
            focusRootCluster = root;
        } else if (focusPersonId) {
            const containsFocus = (cluster: FamilyCluster): boolean => {
                if (cluster.childIds.includes(focusPersonId)) return true;
                return cluster.childClusters.some(containsFocus);
            };
            if (containsFocus(root)) {
                focusRootCluster = root;
            } else {
                otherRoots.push(root);
            }
        } else {
            otherRoots.push(root);
        }
    }

    if (!focusRootCluster && clusterTree.roots.length > 0) {
        focusRootCluster = clusterTree.roots[0];
        otherRoots.length = 0;
        for (let i = 1; i < clusterTree.roots.length; i++) {
            otherRoots.push(clusterTree.roots[i]);
        }
    }

    if (focusRootCluster) {
        positionCluster(focusRootCluster, 0);
    }

    let rightEdge = focusRootCluster ? focusRootCluster.width / 2 + config.branchGap : 0;
    let leftEdge = focusRootCluster ? -focusRootCluster.width / 2 - config.branchGap : 0;

    for (let i = 0; i < otherRoots.length; i++) {
        const root = otherRoots[i];
        if (i % 2 === 0) {
            const centerX = rightEdge + root.width / 2;
            positionCluster(root, centerX);
            rightEdge = centerX + root.width / 2 + config.branchGap;
        } else {
            const centerX = leftEdge - root.width / 2;
            positionCluster(root, centerX);
            leftEdge = centerX - root.width / 2 - config.branchGap;
        }
    }

    for (const personId of visibleNodeIds) {
        if (positioned.has(personId)) continue;

        const spouses = (maps.spouseOf.get(personId) ?? []).filter(s => visibleNodeIds.has(s));
        const positionedSpouse = spouses.find(s => positioned.has(s));

        if (positionedSpouse) {
            const spouseX = xPositions.get(positionedSpouse)!;
            xPositions.set(personId, spouseX + config.nodeWidth + config.spouseGap);
            positioned.add(personId);
        } else {
            const parents = (maps.childOf.get(personId) ?? []).filter(p => visibleNodeIds.has(p));
            const positionedParent = parents.find(p => positioned.has(p));

            if (positionedParent) {
                const parentX = xPositions.get(positionedParent)!;
                xPositions.set(personId, parentX);
                positioned.add(personId);
            }
        }
    }

    return xPositions;
}

function resolveLayerCollisions(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    visibleNodeIds: Set<string>,
    config: LayoutConfig,
    maps?: RelationshipMaps
): void {
    const layerNodes = new Map<number, string[]>();
    for (const [personId, layer] of layerMap) {
        if (!visibleNodeIds.has(personId)) continue;
        if (!xPositions.has(personId)) continue;
        if (!layerNodes.has(layer)) layerNodes.set(layer, []);
        layerNodes.get(layer)!.push(personId);
    }

    for (const [_layer, nodeIds] of layerNodes) {
        const nodes = nodeIds
            .map(id => ({ id, x: xPositions.get(id)! }))
            .sort((a, b) => a.x - b.x);

        for (let i = 1; i < nodes.length; i++) {
            const prev = nodes[i - 1];
            const curr = nodes[i];
            const gap = maps
                ? gapForBond(getBondType(prev.id, curr.id, maps, visibleNodeIds), config)
                : config.siblingGap;
            const minX = prev.x + config.nodeWidth + gap;

            if (curr.x < minX) {
                const shift = minX - curr.x;
                for (let j = i; j < nodes.length; j++) {
                    nodes[j].x += shift;
                    xPositions.set(nodes[j].id, nodes[j].x);
                }
            }
        }
    }
}

function centerChildrenUnderParents(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const layerNodes = new Map<number, string[]>();
    for (const [personId, layer] of layerMap) {
        if (!visibleNodeIds.has(personId)) continue;
        if (!xPositions.has(personId)) continue;
        if (!layerNodes.has(layer)) layerNodes.set(layer, []);
        layerNodes.get(layer)!.push(personId);
    }

    const sortedLayers = Array.from(layerNodes.keys()).sort((a, b) => a - b);

    for (const layer of sortedLayers) {
        if (layer <= 0) continue;

        const nodesInLayer = layerNodes.get(layer) ?? [];
        if (nodesInLayer.length === 0) continue;

        const childrenByParents = new Map<string, string[]>();

        for (const childId of nodesInLayer) {
            const parents = (maps.childOf.get(childId) ?? []).filter(p => visibleNodeIds.has(p));
            if (parents.length === 0) continue;

            const parentKey = parents.sort().join('|');
            if (!childrenByParents.has(parentKey)) {
                childrenByParents.set(parentKey, []);
            }
            childrenByParents.get(parentKey)!.push(childId);
        }

        const centeredChildren = new Set<string>();
        for (const [, children] of childrenByParents) {
            for (const c of children) centeredChildren.add(c);
        }
        const layerSet = new Set(nodesInLayer);

        for (const [parentKey, children] of childrenByParents) {
            const parentIds = parentKey.split('|');
            const parentXs = parentIds
                .map(p => xPositions.get(p))
                .filter((x): x is number => x !== undefined);

            if (parentXs.length === 0) continue;

            const parentMinX = Math.min(...parentXs);
            const parentMaxX = Math.max(...parentXs) + config.nodeWidth;
            const parentCenterX = (parentMinX + parentMaxX) / 2;

            const childXs = children.map(c => xPositions.get(c)!);
            const childMinX = Math.min(...childXs);
            const childMaxX = Math.max(...childXs) + config.nodeWidth;
            const childCenterX = (childMinX + childMaxX) / 2;

            const shift = parentCenterX - childCenterX;

            // Drag bonded partners (spouses/co-parents) that have no parents of their own
            const shiftSet = new Set(children);
            for (const childId of children) {
                for (const spouse of (maps.spouseOf.get(childId) ?? [])) {
                    if (visibleNodeIds.has(spouse) && layerSet.has(spouse) && !centeredChildren.has(spouse)) {
                        shiftSet.add(spouse);
                    }
                }
                for (const gc of (maps.parentOf.get(childId) ?? []).filter(c => visibleNodeIds.has(c))) {
                    for (const otherParent of (maps.childOf.get(gc) ?? [])) {
                        if (otherParent !== childId && visibleNodeIds.has(otherParent) && layerSet.has(otherParent) && !centeredChildren.has(otherParent)) {
                            shiftSet.add(otherParent);
                        }
                    }
                }
            }

            for (const nodeId of shiftSet) {
                xPositions.set(nodeId, xPositions.get(nodeId)! + shift);
            }
        }

        resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
    }

    // Bottom-up: center co-parent groups over their children
    for (let i = sortedLayers.length - 1; i >= 0; i--) {
        const layer = sortedLayers[i];
        const nodesInLayer = layerNodes.get(layer) ?? [];
        if (nodesInLayer.length === 0) continue;

        // Build co-parent groups using BFS over spouse + shared-children edges
        const processed = new Set<string>();
        const groups: string[][] = [];

        for (const personId of nodesInLayer) {
            if (processed.has(personId)) continue;

            const children = (maps.parentOf.get(personId) ?? []).filter(c => visibleNodeIds.has(c));
            if (children.length === 0) {
                processed.add(personId);
                continue;
            }

            // BFS to find all connected co-parents on this layer
            const group: string[] = [];
            const queue = [personId];
            while (queue.length > 0) {
                const current = queue.pop()!;
                if (processed.has(current)) continue;
                if (layerMap.get(current) !== layer) continue;
                processed.add(current);
                group.push(current);

                // Add spouses on same layer
                for (const spouse of (maps.spouseOf.get(current) ?? [])) {
                    if (!processed.has(spouse) && visibleNodeIds.has(spouse) && layerMap.get(spouse) === layer) {
                        queue.push(spouse);
                    }
                }

                // Add co-parents (other parents of my children) on same layer
                for (const child of (maps.parentOf.get(current) ?? []).filter(c => visibleNodeIds.has(c))) {
                    for (const otherParent of (maps.childOf.get(child) ?? [])) {
                        if (!processed.has(otherParent) && visibleNodeIds.has(otherParent) && layerMap.get(otherParent) === layer) {
                            queue.push(otherParent);
                        }
                    }
                }
            }

            if (group.length > 0) {
                groups.push(group);
            }
        }

        let shifted = false;
        for (const group of groups) {
            const allChildren = new Set<string>();
            for (const pid of group) {
                for (const c of (maps.parentOf.get(pid) ?? []).filter(c => visibleNodeIds.has(c))) {
                    allChildren.add(c);
                }
            }
            const childXs = Array.from(allChildren)
                .map(c => xPositions.get(c))
                .filter((x): x is number => x !== undefined);
            if (childXs.length === 0) continue;

            const childMinX = Math.min(...childXs);
            const childMaxX = Math.max(...childXs) + config.nodeWidth;
            const childCenterX = (childMinX + childMaxX) / 2;

            const groupXs = group.map(p => xPositions.get(p)!);
            const groupMinX = Math.min(...groupXs);
            const groupMaxX = Math.max(...groupXs) + config.nodeWidth;
            const groupCenterX = (groupMinX + groupMaxX) / 2;

            const shift = childCenterX - groupCenterX;
            if (Math.abs(shift) < 1) continue;

            for (const pid of group) {
                xPositions.set(pid, xPositions.get(pid)! + shift);
            }
            shifted = true;
        }

        if (shifted) {
            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
        }
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

function calculateMedianPosition(
    nodeId: string,
    adjacentNodes: string[],
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    direction: 'up' | 'down',
    config: LayoutConfig
): number | null {
    const neighbors: number[] = [];

    if (direction === 'up') {
        const parents = maps.childOf.get(nodeId) ?? [];
        for (const parentId of parents) {
            const x = xPositions.get(parentId);
            if (x !== undefined && adjacentNodes.includes(parentId)) {
                neighbors.push(x + config.nodeWidth / 2);
            }
        }
    } else {
        const children = maps.parentOf.get(nodeId) ?? [];
        for (const childId of children) {
            const x = xPositions.get(childId);
            if (x !== undefined && adjacentNodes.includes(childId)) {
                neighbors.push(x + config.nodeWidth / 2);
            }
        }
    }

    if (neighbors.length === 0) return null;

    neighbors.sort((a, b) => a - b);
    const mid = Math.floor(neighbors.length / 2);

    if (neighbors.length % 2 === 0) {
        return (neighbors[mid - 1] + neighbors[mid]) / 2;
    }
    return neighbors[mid];
}

function calculateBarycenterPosition(
    nodeId: string,
    adjacentNodes: string[],
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    direction: 'up' | 'down',
    config: LayoutConfig
): number | null {
    const neighbors: number[] = [];

    if (direction === 'up') {
        const parents = maps.childOf.get(nodeId) ?? [];
        for (const parentId of parents) {
            const x = xPositions.get(parentId);
            if (x !== undefined && adjacentNodes.includes(parentId)) {
                neighbors.push(x + config.nodeWidth / 2);
            }
        }
    } else {
        const children = maps.parentOf.get(nodeId) ?? [];
        for (const childId of children) {
            const x = xPositions.get(childId);
            if (x !== undefined && adjacentNodes.includes(childId)) {
                neighbors.push(x + config.nodeWidth / 2);
            }
        }
    }

    if (neighbors.length === 0) return null;
    return neighbors.reduce((a, b) => a + b, 0) / neighbors.length;
}

function calculateAdaptiveIterations(
    initialCrossings: number,
    nodeCount: number,
    edgeCount: number
): { maxIterations: number; earlyStopThreshold: number } {
    if (initialCrossings === 0) {
        return { maxIterations: 0, earlyStopThreshold: 0 };
    }

    const complexity = Math.sqrt(nodeCount * edgeCount);
    const crossingDensity = initialCrossings / Math.max(1, edgeCount);

    let maxIterations: number;
    if (crossingDensity > 0.5) {
        maxIterations = Math.min(30, Math.ceil(10 + complexity / 50));
    } else if (crossingDensity > 0.1) {
        maxIterations = Math.min(20, Math.ceil(8 + complexity / 100));
    } else {
        maxIterations = Math.min(10, Math.ceil(4 + complexity / 200));
    }

    const earlyStopThreshold = Math.max(1, Math.floor(initialCrossings * 0.02));

    return { maxIterations, earlyStopThreshold };
}

function countEdges(maps: RelationshipMaps, visibleNodeIds: Set<string>): number {
    let count = 0;
    for (const [parentId, children] of maps.parentOf) {
        if (!visibleNodeIds.has(parentId)) continue;
        for (const childId of children) {
            if (visibleNodeIds.has(childId)) count++;
        }
    }
    return count;
}

function getSpouseGroups(
    nodesInLayer: string[],
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>
): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    const assigned = new Set<string>();

    for (const nodeId of nodesInLayer) {
        if (assigned.has(nodeId)) continue;

        const spouses = (maps.spouseOf.get(nodeId) ?? []).filter(s =>
            visibleNodeIds.has(s) && nodesInLayer.includes(s)
        );

        if (spouses.length > 0) {
            const group = [nodeId, ...spouses];
            const groupId = group.sort().join('-');
            groups.set(groupId, group);
            for (const id of group) {
                assigned.add(id);
            }
        } else {
            groups.set(nodeId, [nodeId]);
            assigned.add(nodeId);
        }
    }

    return groups;
}

function minimizeCrossingsBarycenter(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const layerNodes = new Map<number, string[]>();
    for (const [personId, layer] of layerMap) {
        if (!visibleNodeIds.has(personId)) continue;
        if (!xPositions.has(personId)) continue;
        if (!layerNodes.has(layer)) layerNodes.set(layer, []);
        layerNodes.get(layer)!.push(personId);
    }

    const sortedLayers = Array.from(layerNodes.keys()).sort((a, b) => a - b);
    const maxIterations = 4;

    for (let iter = 0; iter < maxIterations; iter++) {
        const initialCrossings = countCrossings(xPositions, layerMap, maps, visibleNodeIds, config);
        if (initialCrossings === 0) break;

        for (const layer of sortedLayers) {
            const nodesInLayer = layerNodes.get(layer) ?? [];
            if (nodesInLayer.length <= 1) continue;

            const spouseGroups = getSpouseGroups(nodesInLayer, maps, visibleNodeIds);
            const groupBarycenters = new Map<string, number>();

            for (const [groupId, members] of spouseGroups) {
                const connectedXs: number[] = [];

                for (const nodeId of members) {
                    const parents = (maps.childOf.get(nodeId) ?? []).filter(p => visibleNodeIds.has(p));
                    for (const parentId of parents) {
                        const px = xPositions.get(parentId);
                        if (px !== undefined) connectedXs.push(px);
                    }

                    const children = (maps.parentOf.get(nodeId) ?? []).filter(c => visibleNodeIds.has(c));
                    for (const childId of children) {
                        const cx = xPositions.get(childId);
                        if (cx !== undefined) connectedXs.push(cx);
                    }
                }

                if (connectedXs.length > 0) {
                    groupBarycenters.set(groupId, connectedXs.reduce((a, b) => a + b, 0) / connectedXs.length);
                } else {
                    const memberXs = members.map(m => xPositions.get(m) ?? 0);
                    groupBarycenters.set(groupId, memberXs.reduce((a, b) => a + b, 0) / memberXs.length);
                }
            }

            const sortedGroups = Array.from(spouseGroups.entries()).sort((a, b) =>
                (groupBarycenters.get(a[0]) ?? 0) - (groupBarycenters.get(b[0]) ?? 0)
            );

            const currentGroupOrder = Array.from(spouseGroups.entries()).sort((a, b) => {
                const minXa = Math.min(...a[1].map(m => xPositions.get(m) ?? 0));
                const minXb = Math.min(...b[1].map(m => xPositions.get(m) ?? 0));
                return minXa - minXb;
            });

            for (let i = 0; i < sortedGroups.length; i++) {
                const [, targetMembers] = currentGroupOrder[i];
                const [, membersToMove] = sortedGroups[i];

                if (membersToMove.length === targetMembers.length) {
                    const targetXs = targetMembers.map(m => xPositions.get(m)!).sort((a, b) => a - b);
                    const membersToMoveSorted = [...membersToMove].sort((a, b) =>
                        (xPositions.get(a) ?? 0) - (xPositions.get(b) ?? 0)
                    );

                    for (let j = 0; j < membersToMoveSorted.length; j++) {
                        xPositions.set(membersToMoveSorted[j], targetXs[j]);
                    }
                }
            }

            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
        }

        for (let i = sortedLayers.length - 1; i >= 0; i--) {
            const layer = sortedLayers[i];
            const nodesInLayer = layerNodes.get(layer) ?? [];
            if (nodesInLayer.length <= 1) continue;

            const spouseGroups = getSpouseGroups(nodesInLayer, maps, visibleNodeIds);
            const groupBarycenters = new Map<string, number>();

            for (const [groupId, members] of spouseGroups) {
                const connectedXs: number[] = [];

                for (const nodeId of members) {
                    const parents = (maps.childOf.get(nodeId) ?? []).filter(p => visibleNodeIds.has(p));
                    for (const parentId of parents) {
                        const px = xPositions.get(parentId);
                        if (px !== undefined) connectedXs.push(px);
                    }

                    const children = (maps.parentOf.get(nodeId) ?? []).filter(c => visibleNodeIds.has(c));
                    for (const childId of children) {
                        const cx = xPositions.get(childId);
                        if (cx !== undefined) connectedXs.push(cx);
                    }
                }

                if (connectedXs.length > 0) {
                    groupBarycenters.set(groupId, connectedXs.reduce((a, b) => a + b, 0) / connectedXs.length);
                } else {
                    const memberXs = members.map(m => xPositions.get(m) ?? 0);
                    groupBarycenters.set(groupId, memberXs.reduce((a, b) => a + b, 0) / memberXs.length);
                }
            }

            const sortedGroups = Array.from(spouseGroups.entries()).sort((a, b) =>
                (groupBarycenters.get(a[0]) ?? 0) - (groupBarycenters.get(b[0]) ?? 0)
            );

            const currentGroupOrder = Array.from(spouseGroups.entries()).sort((a, b) => {
                const minXa = Math.min(...a[1].map(m => xPositions.get(m) ?? 0));
                const minXb = Math.min(...b[1].map(m => xPositions.get(m) ?? 0));
                return minXa - minXb;
            });

            for (let i = 0; i < sortedGroups.length; i++) {
                const [, targetMembers] = currentGroupOrder[i];
                const [, membersToMove] = sortedGroups[i];

                if (membersToMove.length === targetMembers.length) {
                    const targetXs = targetMembers.map(m => xPositions.get(m)!).sort((a, b) => a - b);
                    const membersToMoveSorted = [...membersToMove].sort((a, b) =>
                        (xPositions.get(a) ?? 0) - (xPositions.get(b) ?? 0)
                    );

                    for (let j = 0; j < membersToMoveSorted.length; j++) {
                        xPositions.set(membersToMoveSorted[j], targetXs[j]);
                    }
                }
            }

            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
        }

        const finalCrossings = countCrossings(xPositions, layerMap, maps, visibleNodeIds, config);
        if (finalCrossings >= initialCrossings) break;
    }
}

function localSwapOptimization(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const layerNodes = new Map<number, string[]>();
    for (const [personId, layer] of layerMap) {
        if (!visibleNodeIds.has(personId)) continue;
        if (!xPositions.has(personId)) continue;
        if (!layerNodes.has(layer)) layerNodes.set(layer, []);
        layerNodes.get(layer)!.push(personId);
    }

    let improved = true;
    let iterations = 0;
    const maxIterations = 10;

    while (improved && iterations < maxIterations) {
        improved = false;
        iterations++;

        for (const [_layer, nodes] of layerNodes) {
            const spouseGroups = getSpouseGroups(nodes, maps, visibleNodeIds);
            const groupList = Array.from(spouseGroups.entries());

            groupList.sort((a, b) => {
                const minXa = Math.min(...a[1].map(m => xPositions.get(m) ?? 0));
                const minXb = Math.min(...b[1].map(m => xPositions.get(m) ?? 0));
                return minXa - minXb;
            });

            for (let i = 0; i < groupList.length - 1; i++) {
                const currentCrossings = countCrossings(xPositions, layerMap, maps, visibleNodeIds, config);
                if (currentCrossings === 0) break;

                const group1 = groupList[i][1];
                const group2 = groupList[i + 1][1];

                const group1Xs = group1.map(m => xPositions.get(m)!);
                const group2Xs = group2.map(m => xPositions.get(m)!);

                const group1Min = Math.min(...group1Xs);
                const group2Min = Math.min(...group2Xs);
                const gap = group2Min - Math.max(...group1Xs) - config.nodeWidth;

                for (let j = 0; j < group1.length; j++) {
                    xPositions.set(group1[j], group2Min + (group1Xs[j] - group1Min));
                }
                for (let j = 0; j < group2.length; j++) {
                    xPositions.set(group2[j], group1Min + (group2Xs[j] - group2Min) - gap);
                }

                resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);

                const newCrossings = countCrossings(xPositions, layerMap, maps, visibleNodeIds, config);

                if (newCrossings >= currentCrossings) {
                    for (let j = 0; j < group1.length; j++) {
                        xPositions.set(group1[j], group1Xs[j]);
                    }
                    for (let j = 0; j < group2.length; j++) {
                        xPositions.set(group2[j], group2Xs[j]);
                    }
                } else {
                    improved = true;
                    groupList[i] = [groupList[i][0], group2];
                    groupList[i + 1] = [groupList[i + 1][0], group1];
                }
            }
        }
    }
}

function buildLayerNodeMap(
    layerMap: Map<string, number>,
    visibleNodeIds: Set<string>,
    xPositions: Map<string, number>
): Map<number, string[]> {
    const layerNodes = new Map<number, string[]>();
    for (const [personId, layer] of layerMap) {
        if (!visibleNodeIds.has(personId)) continue;
        if (!xPositions.has(personId)) continue;
        if (!layerNodes.has(layer)) layerNodes.set(layer, []);
        layerNodes.get(layer)!.push(personId);
    }
    return layerNodes;
}

function reorderLayerByHeuristic(
    layer: number,
    adjacentLayer: number,
    layerNodes: Map<number, string[]>,
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig,
    useMedian: boolean,
    direction: 'up' | 'down'
): void {
    const nodesInLayer = layerNodes.get(layer) ?? [];
    const adjacentNodes = layerNodes.get(adjacentLayer) ?? [];

    if (nodesInLayer.length <= 1) return;

    const spouseGroups = getSpouseGroups(nodesInLayer, maps, visibleNodeIds);
    const groupPositions = new Map<string, number>();

    for (const [groupId, members] of spouseGroups) {
        const positions: number[] = [];

        for (const nodeId of members) {
            const pos = useMedian
                ? calculateMedianPosition(nodeId, adjacentNodes, xPositions, maps, direction, config)
                : calculateBarycenterPosition(nodeId, adjacentNodes, xPositions, maps, direction, config);

            if (pos !== null) positions.push(pos);
        }

        if (positions.length > 0) {
            groupPositions.set(groupId, positions.reduce((a, b) => a + b, 0) / positions.length);
        } else {
            const memberXs = members.map(m => xPositions.get(m) ?? 0);
            groupPositions.set(groupId, memberXs.reduce((a, b) => a + b, 0) / memberXs.length);
        }
    }

    const sortedGroups = Array.from(spouseGroups.entries())
        .sort((a, b) => (groupPositions.get(a[0]) ?? 0) - (groupPositions.get(b[0]) ?? 0));

    const currentGroupOrder = Array.from(spouseGroups.entries()).sort((a, b) => {
        const minXa = Math.min(...a[1].map(m => xPositions.get(m) ?? 0));
        const minXb = Math.min(...b[1].map(m => xPositions.get(m) ?? 0));
        return minXa - minXb;
    });

    for (let i = 0; i < sortedGroups.length; i++) {
        const [, targetMembers] = currentGroupOrder[i];
        const [, membersToMove] = sortedGroups[i];

        if (membersToMove.length === targetMembers.length) {
            const targetXs = targetMembers.map(m => xPositions.get(m)!).sort((a, b) => a - b);
            const membersToMoveSorted = [...membersToMove].sort((a, b) =>
                (xPositions.get(a) ?? 0) - (xPositions.get(b) ?? 0)
            );

            for (let j = 0; j < membersToMoveSorted.length; j++) {
                xPositions.set(membersToMoveSorted[j], targetXs[j]);
            }
        }
    }
}

function minimizeCrossingsImproved(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const layerNodes = buildLayerNodeMap(layerMap, visibleNodeIds, xPositions);
    const sortedLayers = Array.from(layerNodes.keys()).sort((a, b) => a - b);

    const initialCrossings = countCrossingsOptimized(layerMap, xPositions, maps, visibleNodeIds, config);
    const edgeCount = countEdges(maps, visibleNodeIds);
    const nodeCount = visibleNodeIds.size;

    const { maxIterations, earlyStopThreshold } = calculateAdaptiveIterations(
        initialCrossings, nodeCount, edgeCount
    );

    if (maxIterations === 0) return;

    let previousCrossings = initialCrossings;
    let stagnantIterations = 0;

    for (let iter = 0; iter < maxIterations; iter++) {
        const useMedian = iter % 2 === 1;

        // Down sweep (top to bottom)
        for (let i = 1; i < sortedLayers.length; i++) {
            const layer = sortedLayers[i];
            const prevLayer = sortedLayers[i - 1];
            reorderLayerByHeuristic(
                layer, prevLayer, layerNodes, xPositions, maps,
                visibleNodeIds, config, useMedian, 'up'
            );
            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
        }

        // Up sweep (bottom to top)
        for (let i = sortedLayers.length - 2; i >= 0; i--) {
            const layer = sortedLayers[i];
            const nextLayer = sortedLayers[i + 1];
            reorderLayerByHeuristic(
                layer, nextLayer, layerNodes, xPositions, maps,
                visibleNodeIds, config, useMedian, 'down'
            );
            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
        }

        // Local swap optimization after each full sweep
        localSwapOptimization(xPositions, layerMap, maps, visibleNodeIds, config);

        const currentCrossings = countCrossingsOptimized(layerMap, xPositions, maps, visibleNodeIds, config);

        if (currentCrossings === 0) break;

        const improvement = previousCrossings - currentCrossings;
        if (improvement <= earlyStopThreshold) {
            stagnantIterations++;
            if (stagnantIterations >= 3) break;
        } else {
            stagnantIterations = 0;
        }

        previousCrossings = currentCrossings;
    }
}

type AlignmentDirection = 'leftUp' | 'leftDown' | 'rightUp' | 'rightDown';

interface BlockAssignment {
    root: Map<string, string>;
    align: Map<string, string>;
}

function getUpperNeighbors(
    nodeId: string,
    adjacentNodes: string[],
    maps: RelationshipMaps,
    isUp: boolean
): string[] {
    const neighbors: string[] = [];

    if (isUp) {
        const parents = maps.childOf.get(nodeId) ?? [];
        for (const parentId of parents) {
            if (adjacentNodes.includes(parentId)) {
                neighbors.push(parentId);
            }
        }
    } else {
        const children = maps.parentOf.get(nodeId) ?? [];
        for (const childId of children) {
            if (adjacentNodes.includes(childId)) {
                neighbors.push(childId);
            }
        }
    }

    return neighbors;
}

function computeVerticalAlignment(
    layers: Map<number, string[]>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    xPositions: Map<string, number>,
    direction: AlignmentDirection
): BlockAssignment {
    const root = new Map<string, string>();
    const align = new Map<string, string>();

    for (const nodeId of visibleNodeIds) {
        root.set(nodeId, nodeId);
        align.set(nodeId, nodeId);
    }

    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);
    const isUp = direction.includes('Up');
    const isLeft = direction.includes('left');

    const layerOrder = isUp
        ? sortedLayers.slice().reverse()
        : sortedLayers;

    for (let i = 1; i < layerOrder.length; i++) {
        const layer = layerOrder[i];
        const prevLayer = layerOrder[i - 1];
        const nodesInLayer = layers.get(layer) ?? [];
        const prevNodes = layers.get(prevLayer) ?? [];

        const sortedNodes = [...nodesInLayer].sort((a, b) => {
            const xa = xPositions.get(a) ?? 0;
            const xb = xPositions.get(b) ?? 0;
            return isLeft ? xa - xb : xb - xa;
        });

        let r = isLeft ? -1 : prevNodes.length;

        for (const v of sortedNodes) {
            const neighbors = getUpperNeighbors(v, prevNodes, maps, isUp);
            if (neighbors.length === 0) continue;

            const sortedNeighbors = [...neighbors].sort((a, b) => {
                const posA = prevNodes.indexOf(a);
                const posB = prevNodes.indexOf(b);
                return isLeft ? posA - posB : posB - posA;
            });

            const mid = Math.floor((sortedNeighbors.length - 1) / 2);
            const medianNeighbors = sortedNeighbors.length % 2 === 0
                ? [sortedNeighbors[mid], sortedNeighbors[mid + 1]]
                : [sortedNeighbors[mid]];

            for (const m of medianNeighbors) {
                if (align.get(v) === v) {
                    const mPos = prevNodes.indexOf(m);
                    const rCondition = isLeft ? mPos > r : mPos < r;

                    if (rCondition) {
                        align.set(m, v);
                        root.set(v, root.get(m)!);
                        align.set(v, root.get(v)!);
                        r = mPos;
                    }
                }
            }
        }
    }

    return { root, align };
}

function computeHorizontalCompaction(
    layers: Map<number, string[]>,
    root: Map<string, string>,
    xPositions: Map<string, number>,
    config: LayoutConfig,
    isLeft: boolean
): Map<string, number> {
    const x = new Map<string, number>();
    const placed = new Set<string>();

    const sortedLayers = Array.from(layers.keys()).sort((a, b) => a - b);

    for (const layer of sortedLayers) {
        const nodesInLayer = layers.get(layer) ?? [];
        const sortedNodes = [...nodesInLayer].sort((a, b) => {
            const xa = xPositions.get(a) ?? 0;
            const xb = xPositions.get(b) ?? 0;
            return isLeft ? xa - xb : xb - xa;
        });

        for (const v of sortedNodes) {
            const rootV = root.get(v)!;

            if (!placed.has(rootV)) {
                x.set(rootV, xPositions.get(rootV) ?? 0);
                placed.add(rootV);
            }

            if (rootV !== v) {
                x.set(v, x.get(rootV)!);
            }
        }
    }

    for (const layer of sortedLayers) {
        const nodesInLayer = layers.get(layer) ?? [];
        const sortedNodes = [...nodesInLayer].sort((a, b) => {
            const xa = x.get(a) ?? xPositions.get(a) ?? 0;
            const xb = x.get(b) ?? xPositions.get(b) ?? 0;
            return xa - xb;
        });

        for (let i = 1; i < sortedNodes.length; i++) {
            const prev = sortedNodes[i - 1];
            const curr = sortedNodes[i];
            const prevX = x.get(prev) ?? xPositions.get(prev) ?? 0;
            const currX = x.get(curr) ?? xPositions.get(curr) ?? 0;
            const minX = prevX + config.nodeWidth + config.siblingGap;

            if (currX < minX) {
                const rootCurr = root.get(curr)!;
                const shift = minX - currX;

                for (const [nodeId, nodeRoot] of root) {
                    if (nodeRoot === rootCurr) {
                        x.set(nodeId, (x.get(nodeId) ?? xPositions.get(nodeId) ?? 0) + shift);
                    }
                }
            }
        }
    }

    return x;
}

function brandesKopfCoordinates(
    layerMap: Map<string, number>,
    xPositions: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): Map<string, number> {
    const layers = buildLayerNodeMap(layerMap, visibleNodeIds, xPositions);

    const directions: AlignmentDirection[] = ['leftUp', 'leftDown', 'rightUp', 'rightDown'];
    const allCoordinates: Map<string, number>[] = [];

    for (const direction of directions) {
        const { root } = computeVerticalAlignment(
            layers, layerMap, maps, visibleNodeIds, xPositions, direction
        );

        const isLeft = direction.includes('left');
        const coords = computeHorizontalCompaction(layers, root, xPositions, config, isLeft);
        allCoordinates.push(coords);
    }

    const aligned = allCoordinates.map(coords => {
        const values = Array.from(coords.values());
        const min = values.length > 0 ? Math.min(...values) : 0;
        const alignedCoords = new Map<string, number>();
        for (const [id, x] of coords) {
            alignedCoords.set(id, x - min);
        }
        return alignedCoords;
    });

    const finalX = new Map<string, number>();
    for (const nodeId of visibleNodeIds) {
        const xs = aligned.map(c => c.get(nodeId) ?? xPositions.get(nodeId) ?? 0).sort((a, b) => a - b);
        finalX.set(nodeId, (xs[1] + xs[2]) / 2);
    }

    compactHorizontally(finalX, layers, config);

    return finalX;
}

function compactHorizontally(
    xPositions: Map<string, number>,
    layers: Map<number, string[]>,
    config: LayoutConfig
): void {
    const minGap = config.nodeWidth + config.siblingGap;

    for (const [, nodesInLayer] of layers) {
        if (nodesInLayer.length <= 1) continue;

        const sorted = [...nodesInLayer].sort((a, b) =>
            (xPositions.get(a) ?? 0) - (xPositions.get(b) ?? 0)
        );

        for (let i = 1; i < sorted.length; i++) {
            const prev = sorted[i - 1];
            const curr = sorted[i];
            const prevX = xPositions.get(prev) ?? 0;
            const currX = xPositions.get(curr) ?? 0;
            const gap = currX - prevX;

            if (gap > minGap * 3) {
                const shift = gap - minGap;
                for (let j = i; j < sorted.length; j++) {
                    const nodeX = xPositions.get(sorted[j]) ?? 0;
                    xPositions.set(sorted[j], nodeX - shift);
                }
            }
        }
    }
}

function ensureBondedAdjacent(
    xPositions: Map<string, number>,
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    visibleNodeIds: Set<string>,
    config: LayoutConfig
): void {
    const layerNodes = buildLayerNodeMap(layerMap, visibleNodeIds, xPositions);

    // Process from lowest to highest priority so higher-priority bonds override
    const bondTypes: { type: BondType; findNeighbors: (id: string, layer: string[]) => string[] }[] = [
        {
            type: 'sibling',
            findNeighbors: (id, layer) => {
                const parents = (maps.childOf.get(id) ?? []).filter(p => visibleNodeIds.has(p));
                const siblings = new Set<string>();
                for (const parent of parents) {
                    for (const child of (maps.parentOf.get(parent) ?? [])) {
                        if (child !== id && visibleNodeIds.has(child) && layer.includes(child)
                            && getBondType(id, child, maps, visibleNodeIds) === 'sibling') {
                            siblings.add(child);
                        }
                    }
                }
                return Array.from(siblings);
            },
        },
        {
            type: 'coparent',
            findNeighbors: (id, layer) => {
                const children = (maps.parentOf.get(id) ?? []).filter(c => visibleNodeIds.has(c));
                const coparents = new Set<string>();
                for (const child of children) {
                    for (const parent of (maps.childOf.get(child) ?? [])) {
                        if (parent !== id && visibleNodeIds.has(parent) && layer.includes(parent)
                            && getBondType(id, parent, maps, visibleNodeIds) === 'coparent') {
                            coparents.add(parent);
                        }
                    }
                }
                return Array.from(coparents);
            },
        },
        {
            type: 'spouse',
            findNeighbors: (id, layer) =>
                (maps.spouseOf.get(id) ?? []).filter(s => visibleNodeIds.has(s) && layer.includes(s)),
        },
    ];

    for (const { type, findNeighbors } of bondTypes) {
        const gap = gapForBond(type, config);

        for (const [, nodesInLayer] of layerNodes) {
            if (nodesInLayer.length <= 1) continue;

            const processed = new Set<string>();

            for (const nodeId of nodesInLayer) {
                if (processed.has(nodeId)) continue;

                // BFS to find all transitively connected nodes via this bond type
                const group: string[] = [];
                const queue = [nodeId];
                while (queue.length > 0) {
                    const current = queue.pop()!;
                    if (processed.has(current)) continue;
                    processed.add(current);
                    group.push(current);

                    const neighbors = findNeighbors(current, nodesInLayer)
                        .filter(n => !processed.has(n));
                    queue.push(...neighbors);
                }

                if (group.length <= 1) continue;

                group.sort((a, b) => (xPositions.get(a) ?? 0) - (xPositions.get(b) ?? 0));

                const xs = group.map(id => xPositions.get(id) ?? 0);
                const totalSpan = xs[xs.length - 1] - xs[0];
                const expectedSpan = (group.length - 1) * (config.nodeWidth + gap);

                if (totalSpan <= expectedSpan) continue;

                const centerX = xs.reduce((a, b) => a + b, 0) / xs.length;
                const startX = centerX - expectedSpan / 2;

                for (let i = 0; i < group.length; i++) {
                    xPositions.set(group[i], startX + i * (config.nodeWidth + gap));
                }
            }

            resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
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
    // Phase 1: Structure — build family clusters and compute widths
    const clusterTree = buildClusterTree(persons, layerMap, maps, visibleNodeIds, focusPersonId);
    const familyNodes = createFamilyNodes(clusterTree, layerMap, visibleNodeIds);
    calculateClusterWidths(clusterTree, maps, visibleNodeIds, config);

    // Phase 2: Ordering — initial positions from cluster tree + crossing minimization
    const xPositions = assignClusterPositions(clusterTree, maps, visibleNodeIds, focusPersonId, config);
    resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
    minimizeCrossingsImproved(xPositions, layerMap, maps, visibleNodeIds, config);

    // Phase 3: Coordinates — Brandes-Köpf as primary coordinate assignment
    const refinedX = brandesKopfCoordinates(layerMap, xPositions, maps, visibleNodeIds, config);
    for (const [nodeId, x] of refinedX) {
        xPositions.set(nodeId, x);
    }
    resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
    ensureBondedAdjacent(xPositions, layerMap, maps, visibleNodeIds, config);
    resolveLayerCollisions(xPositions, layerMap, visibleNodeIds, config, maps);
    centerChildrenUnderParents(xPositions, layerMap, maps, visibleNodeIds, config);

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
    calculateClusterWidths,
    assignClusterPositions,
    resolveLayerCollisions,
    centerChildrenUnderParents,
    minimizeCrossingsImproved,
    ensureBondedAdjacent,
    getBondType,
    gapForBond,
    determineVisibleNodes,
    buildConnections,
    calculateDescendantCounts,
    findCoParents,
    countCrossings,
    countCrossingsOptimized,
    calculatePositions,
    markFocusLineage,
    BOND_PRIORITY,
};
