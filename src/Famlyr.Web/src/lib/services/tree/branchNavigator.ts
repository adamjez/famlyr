import type { PersonModel, RelationshipModel } from '$lib/types/api';

export interface Branch {
    id: string;
    label: string;
    count: number;
    representativeId: string;
}

function fullName(person: PersonModel): string {
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unknown name';
}

export function buildFamilyBranches(
    persons: PersonModel[],
    relationships: RelationshipModel[]
): Branch[] {
    const spouseOf = new Map<string, string[]>();
    const parentOf = new Map<string, string[]>();
    const hasParent = new Set<string>();

    for (const relationship of relationships) {
        if (relationship.type === 'Spouse') {
            const subjectSpouses = spouseOf.get(relationship.subjectId) ?? [];
            subjectSpouses.push(relationship.relativeId);
            spouseOf.set(relationship.subjectId, subjectSpouses);

            const relativeSpouses = spouseOf.get(relationship.relativeId) ?? [];
            relativeSpouses.push(relationship.subjectId);
            spouseOf.set(relationship.relativeId, relativeSpouses);
        } else if (relationship.type === 'Parent') {
            hasParent.add(relationship.subjectId);

            const children = parentOf.get(relationship.relativeId) ?? [];
            children.push(relationship.subjectId);
            parentOf.set(relationship.relativeId, children);
        }
    }

    const personById = new Map(persons.map(person => [person.id, person]));
    const rootIds = persons.filter(person => !hasParent.has(person.id)).map(person => person.id);
    const roots = rootIds.length > 0 ? rootIds : persons.map(person => person.id);
    const rootSet = new Set(roots);
    const visited = new Set<string>();
    const branches: Branch[] = [];

    for (const rootId of roots) {
        if (visited.has(rootId)) continue;

        const spouseIds = spouseOf.get(rootId) ?? [];
        const spouseId = spouseIds.find(id => rootSet.has(id));
        const memberIds = spouseId
            ? [rootId, spouseId].sort()
            : [rootId];

        for (const memberId of memberIds) visited.add(memberId);

        const memberSet = new Set<string>(memberIds);
        const queue = [...memberIds];
        for (let queueIndex = 0; queueIndex < queue.length; queueIndex++) {
            const personId = queue[queueIndex];

            for (const childId of parentOf.get(personId) ?? []) {
                if (!memberSet.has(childId)) {
                    memberSet.add(childId);
                    queue.push(childId);
                }
            }
            for (const spouseIdOfPerson of spouseOf.get(personId) ?? []) {
                if (!memberSet.has(spouseIdOfPerson)) {
                    memberSet.add(spouseIdOfPerson);
                    queue.push(spouseIdOfPerson);
                }
            }
        }

        const primary = personById.get(rootId);
        const spouse = spouseId ? personById.get(spouseId) : null;
        const label = spouse && primary
            ? `${fullName(primary)} & ${fullName(spouse)}`
            : primary
                ? fullName(primary)
                : 'Unknown family';

        branches.push({
            id: memberIds.join(':'),
            label,
            count: memberSet.size,
            representativeId: rootId
        });
    }

    return branches.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
