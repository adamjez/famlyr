import type { FamilyTreeModel, PersonModel, RelationshipModel } from '$lib/types/api';
import type { TreeLayout, TreeNode, TreeBounds, TreeConnection, LayoutConfig, Position } from '$lib/types/tree';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';

interface RelationshipMaps {
    parentOf: Map<string, string[]>;
    childOf: Map<string, string[]>;
    spouseOf: Map<string, string[]>;
}

interface FamilyUnit {
    id: string;
    parentIds: string[];
    childIds: string[];
    layer: number;
    subtreeWidth: number;
    centerX: number;
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
    focusPersonId: string,
    persons: PersonModel[],
    maps: RelationshipMaps
): Map<string, number> {
    const layers = new Map<string, number>();
    const visited = new Set<string>();
    const queue: { id: string; layer: number }[] = [{ id: focusPersonId, layer: 0 }];

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

function buildFamilyUnits(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps
): Map<string, FamilyUnit> {
    const familyUnits = new Map<string, FamilyUnit>();
    const processedCouples = new Set<string>();

    for (const person of persons) {
        const personId = person.id;
        const layer = layerMap.get(personId) ?? 0;
        const spouses = maps.spouseOf.get(personId) ?? [];
        const allChildren = maps.parentOf.get(personId) ?? [];

        if (spouses.length > 0) {
            for (const spouseId of spouses) {
                const coupleKey = [personId, spouseId].sort().join('-');
                if (processedCouples.has(coupleKey)) continue;
                processedCouples.add(coupleKey);

                const sharedChildren = findSharedChildren(personId, spouseId, maps);
                if (sharedChildren.length > 0) {
                    familyUnits.set(coupleKey, {
                        id: coupleKey,
                        parentIds: [personId, spouseId].sort(),
                        childIds: sharedChildren,
                        layer,
                        subtreeWidth: 0,
                        centerX: 0
                    });
                }
            }

            const childrenWithoutCoParent = allChildren.filter(childId => {
                const childParents = maps.childOf.get(childId) ?? [];
                return childParents.length === 1 || !childParents.some(p => spouses.includes(p));
            });

            if (childrenWithoutCoParent.length > 0) {
                const singleParentKey = `single-${personId}`;
                familyUnits.set(singleParentKey, {
                    id: singleParentKey,
                    parentIds: [personId],
                    childIds: childrenWithoutCoParent,
                    layer,
                    subtreeWidth: 0,
                    centerX: 0
                });
            }
        } else if (allChildren.length > 0) {
            const singleParentKey = `single-${personId}`;
            familyUnits.set(singleParentKey, {
                id: singleParentKey,
                parentIds: [personId],
                childIds: allChildren,
                layer,
                subtreeWidth: 0,
                centerX: 0
            });
        }
    }

    return familyUnits;
}

function getPersonSubtreeWidth(
    personId: string,
    subtreeWidths: Map<string, number>,
    maps: RelationshipMaps,
    layerMap: Map<string, number>,
    config: LayoutConfig
): number {
    if (subtreeWidths.has(personId)) {
        return subtreeWidths.get(personId)!;
    }

    const children = maps.parentOf.get(personId) ?? [];
    const spouses = maps.spouseOf.get(personId) ?? [];
    const personLayer = layerMap.get(personId) ?? 0;

    let selfWidth = config.nodeWidth;
    for (const spouseId of spouses) {
        if (layerMap.get(spouseId) === personLayer) {
            selfWidth = config.nodeWidth * 2 + config.spouseGap;
            break;
        }
    }

    if (children.length === 0) {
        subtreeWidths.set(personId, selfWidth);
        return selfWidth;
    }

    let childrenWidth = 0;
    const processedChildren = new Set<string>();

    for (const childId of children) {
        if (processedChildren.has(childId)) continue;
        processedChildren.add(childId);

        const childWidth = getPersonSubtreeWidth(childId, subtreeWidths, maps, layerMap, config);
        if (childrenWidth > 0) {
            childrenWidth += config.siblingGap;
        }
        childrenWidth += childWidth;
    }

    const totalWidth = Math.max(selfWidth, childrenWidth);
    subtreeWidths.set(personId, totalWidth);
    return totalWidth;
}

function calculateSubtreeWidths(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    config: LayoutConfig
): Map<string, number> {
    const subtreeWidths = new Map<string, number>();

    const sortedPersons = [...persons].sort((a, b) => {
        const layerA = layerMap.get(a.id) ?? 0;
        const layerB = layerMap.get(b.id) ?? 0;
        return layerB - layerA;
    });

    for (const person of sortedPersons) {
        getPersonSubtreeWidth(person.id, subtreeWidths, maps, layerMap, config);
    }

    return subtreeWidths;
}

function assignXPositions(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    subtreeWidths: Map<string, number>,
    focusPersonId: string,
    config: LayoutConfig
): Map<string, number> {
    const xPositions = new Map<string, number>();
    const positioned = new Set<string>();

    const focusLayer = layerMap.get(focusPersonId) ?? 0;
    const focusSpouses = maps.spouseOf.get(focusPersonId) ?? [];
    const focusSpouseInLayer = focusSpouses.find(s => layerMap.get(s) === focusLayer);

    if (focusSpouseInLayer) {
        const coupleWidth = config.nodeWidth * 2 + config.spouseGap;
        xPositions.set(focusPersonId, -coupleWidth / 2);
        xPositions.set(focusSpouseInLayer, -coupleWidth / 2 + config.nodeWidth + config.spouseGap);
        positioned.add(focusPersonId);
        positioned.add(focusSpouseInLayer);
    } else {
        xPositions.set(focusPersonId, -config.nodeWidth / 2);
        positioned.add(focusPersonId);
    }

    const layerIndices = Array.from(new Set(layerMap.values())).sort((a, b) => a - b);

    for (const layerIndex of layerIndices) {
        const layerPersons = persons.filter(p => layerMap.get(p.id) === layerIndex);

        for (const person of layerPersons) {
            if (positioned.has(person.id)) continue;

            const parents = maps.childOf.get(person.id) ?? [];
            const positionedParents = parents.filter(p => positioned.has(p));

            if (positionedParents.length > 0) {
                let parentCenterX: number;

                if (positionedParents.length >= 2) {
                    const p1x = xPositions.get(positionedParents[0])!;
                    const p2x = xPositions.get(positionedParents[1])!;
                    parentCenterX = (p1x + p2x + config.nodeWidth) / 2;
                } else {
                    parentCenterX = xPositions.get(positionedParents[0])! + config.nodeWidth / 2;
                }

                const siblings = getSiblingsFromSameParents(person.id, maps);
                const unpositionedSiblings = siblings.filter(s => !positioned.has(s));

                if (unpositionedSiblings.length > 0) {
                    let totalWidth = 0;
                    for (let i = 0; i < unpositionedSiblings.length; i++) {
                        const sibId = unpositionedSiblings[i];
                        const sibWidth = subtreeWidths.get(sibId) ?? config.nodeWidth;
                        if (i > 0) totalWidth += config.siblingGap;
                        totalWidth += sibWidth;
                    }

                    let currentX = parentCenterX - totalWidth / 2;

                    for (const sibId of unpositionedSiblings) {
                        const sibWidth = subtreeWidths.get(sibId) ?? config.nodeWidth;
                        const sibSpouses = maps.spouseOf.get(sibId) ?? [];
                        const spouseInLayer = sibSpouses.find(s => layerMap.get(s) === layerIndex && !positioned.has(s));
                        const coupleWidth = spouseInLayer ? (config.nodeWidth * 2 + config.spouseGap) : config.nodeWidth;

                        const sibX = currentX + (sibWidth - coupleWidth) / 2;
                        xPositions.set(sibId, sibX);
                        positioned.add(sibId);

                        if (spouseInLayer) {
                            xPositions.set(spouseInLayer, sibX + config.nodeWidth + config.spouseGap);
                            positioned.add(spouseInLayer);
                        }

                        currentX += sibWidth + config.siblingGap;
                    }
                }
            }
        }
    }

    const reversedLayers = [...layerIndices].reverse();
    for (const layerIndex of reversedLayers) {
        const layerPersons = persons.filter(p => layerMap.get(p.id) === layerIndex);

        for (const person of layerPersons) {
            if (positioned.has(person.id)) continue;

            const children = maps.parentOf.get(person.id) ?? [];
            const positionedChildren = children.filter(c => positioned.has(c));

            if (positionedChildren.length > 0) {
                const childXs = positionedChildren.map(c => xPositions.get(c)! + config.nodeWidth / 2);
                const childrenCenterX = childXs.reduce((a, b) => a + b, 0) / childXs.length;

                const spouses = maps.spouseOf.get(person.id) ?? [];
                const spouseInLayer = spouses.find(s => !positioned.has(s) && layerMap.get(s) === layerIndex);

                if (spouseInLayer) {
                    const coupleWidth = config.nodeWidth * 2 + config.spouseGap;
                    const personX = childrenCenterX - coupleWidth / 2;
                    xPositions.set(person.id, personX);
                    positioned.add(person.id);
                    xPositions.set(spouseInLayer, personX + config.nodeWidth + config.spouseGap);
                    positioned.add(spouseInLayer);
                } else {
                    xPositions.set(person.id, childrenCenterX - config.nodeWidth / 2);
                    positioned.add(person.id);
                }
            }
        }
    }

    for (const person of persons) {
        if (!positioned.has(person.id)) {
            const unpositionedX = findUnoccupiedX(xPositions, config);
            xPositions.set(person.id, unpositionedX);
            positioned.add(person.id);
        }
    }

    return xPositions;
}

function getSiblingsFromSameParents(personId: string, maps: RelationshipMaps): string[] {
    const parents = maps.childOf.get(personId) ?? [];
    if (parents.length === 0) return [personId];

    const siblings = new Set<string>();
    siblings.add(personId);

    for (const parentId of parents) {
        const parentChildren = maps.parentOf.get(parentId) ?? [];
        for (const childId of parentChildren) {
            const childParents = maps.childOf.get(childId) ?? [];
            const sameParents = parents.every(p => childParents.includes(p));
            if (sameParents) {
                siblings.add(childId);
            }
        }
    }

    return Array.from(siblings);
}

function findUnoccupiedX(xPositions: Map<string, number>, config: LayoutConfig): number {
    if (xPositions.size === 0) return 0;

    const maxX = Math.max(...Array.from(xPositions.values()));
    return maxX + config.nodeWidth + config.branchGap;
}

function calculatePositions(
    persons: PersonModel[],
    layerMap: Map<string, number>,
    maps: RelationshipMaps,
    focusPersonId: string,
    config: LayoutConfig
): Map<string, Position> {
    const subtreeWidths = calculateSubtreeWidths(persons, layerMap, maps, config);
    const xPositions = assignXPositions(persons, layerMap, maps, subtreeWidths, focusPersonId, config);

    const positions = new Map<string, Position>();

    for (const person of persons) {
        const layer = layerMap.get(person.id) ?? 0;
        const x = xPositions.get(person.id) ?? 0;
        const y = layer * config.generationGap;

        positions.set(person.id, { x, y });
    }

    return positions;
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
    maps: RelationshipMaps
): TreeConnection[] {
    const connections: TreeConnection[] = [];
    const processedSpouses = new Set<string>();

    for (const person of persons) {
        const children = maps.parentOf.get(person.id) ?? [];
        if (children.length > 0) {
            connections.push({
                type: 'parent-child',
                fromIds: [person.id],
                toIds: children
            });
        }

        const spouses = maps.spouseOf.get(person.id) ?? [];
        for (const spouseId of spouses) {
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
    }

    return connections;
}

export function calculateLayout(
    tree: FamilyTreeModel,
    focusPersonId: string,
    config: LayoutConfig = DEFAULT_LAYOUT_CONFIG
): TreeLayout {
    const maps = buildRelationshipMaps(tree.relationships);
    const layerMap = assignLayers(focusPersonId, tree.persons, maps);
    const positions = calculatePositions(tree.persons, layerMap, maps, focusPersonId, config);
    const orderedLayers = orderNodesInLayers(layerMap, tree.persons, positions, maps);

    const nodes = new Map<string, TreeNode>();
    for (const person of tree.persons) {
        const position = positions.get(person.id) ?? { x: 0, y: 0 };
        const layer = layerMap.get(person.id) ?? 0;

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
            height: config.nodeHeight
        });
    }

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const node of nodes.values()) {
        minX = Math.min(minX, node.position.x);
        maxX = Math.max(maxX, node.position.x + node.width);
        minY = Math.min(minY, node.position.y);
        maxY = Math.max(maxY, node.position.y + node.height);
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
        layers.set(layerIdx, persons.map(p => nodes.get(p.id)!));
    }

    const connections = buildConnections(tree.persons, maps);

    return { nodes, bounds, layers, connections };
}
