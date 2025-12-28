import type { FamilyTreeModel, PersonModel, RelationshipModel } from '$lib/types/api';
import type { TreeLayout, TreeNode, TreeBounds, TreeConnection, LayoutConfig, Position } from '$lib/types/tree';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';

interface RelationshipMaps {
    parentOf: Map<string, string[]>;
    childOf: Map<string, string[]>;
    spouseOf: Map<string, string[]>;
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

function orderNodesInLayers(
    layerMap: Map<string, number>,
    persons: PersonModel[],
    maps: RelationshipMaps
): Map<number, PersonModel[]> {
    const layers = new Map<number, PersonModel[]>();

    for (const person of persons) {
        const layer = layerMap.get(person.id) ?? 0;
        if (!layers.has(layer)) layers.set(layer, []);
        layers.get(layer)!.push(person);
    }

    for (const [layer, layerPersons] of layers) {
        const processed = new Set<string>();
        const ordered: PersonModel[] = [];

        for (const person of layerPersons) {
            if (processed.has(person.id)) continue;

            ordered.push(person);
            processed.add(person.id);

            const spouses = maps.spouseOf.get(person.id) ?? [];
            for (const spouseId of spouses) {
                const spouse = layerPersons.find(p => p.id === spouseId);
                if (spouse && !processed.has(spouseId)) {
                    ordered.push(spouse);
                    processed.add(spouseId);
                }
            }
        }

        layers.set(layer, ordered);
    }

    return layers;
}

function calculatePositions(
    orderedLayers: Map<number, PersonModel[]>,
    maps: RelationshipMaps,
    config: LayoutConfig
): Map<string, Position> {
    const positions = new Map<string, Position>();
    const layerIndices = Array.from(orderedLayers.keys()).sort((a, b) => a - b);

    for (const layerIndex of layerIndices) {
        const persons = orderedLayers.get(layerIndex)!;
        const y = layerIndex * config.generationGap;
        let currentX = 0;

        for (let i = 0; i < persons.length; i++) {
            const person = persons[i];
            const spouses = maps.spouseOf.get(person.id) ?? [];
            const prevPerson = i > 0 ? persons[i - 1] : null;
            const isSpouseOfPrev = prevPerson && spouses.includes(prevPerson.id);

            if (isSpouseOfPrev) {
                currentX += config.spouseGap + config.nodeWidth;
            } else if (i > 0) {
                currentX += config.siblingGap;
            }

            positions.set(person.id, { x: currentX, y });
        }

        const layerWidth = currentX + config.nodeWidth;
        const layerOffset = layerWidth / 2;
        for (const person of persons) {
            const pos = positions.get(person.id)!;
            pos.x -= layerOffset;
        }
    }

    return positions;
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
    const orderedLayers = orderNodesInLayers(layerMap, tree.persons, maps);
    const positions = calculatePositions(orderedLayers, maps, config);

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
