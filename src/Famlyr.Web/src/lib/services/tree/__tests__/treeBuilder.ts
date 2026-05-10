import type { PersonModel, RelationshipModel, FamilyTreeModel, Gender } from '$lib/types/api';

let idCounter = 0;

function nextId(): string {
    return `person-${++idCounter}`;
}

export function resetIds(): void {
    idCounter = 0;
}

export function person(overrides: Partial<PersonModel> & { id?: string } = {}): PersonModel {
    const id = overrides.id ?? nextId();
    return {
        id,
        firstName: overrides.firstName ?? `Person`,
        lastName: overrides.lastName ?? id,
        gender: overrides.gender ?? 'Male',
        birthDate: overrides.birthDate ?? null,
        deathDate: overrides.deathDate ?? null,
        primaryPhotoUrl: overrides.primaryPhotoUrl ?? null,
    };
}

export function parentRel(childId: string, parentId: string, relId?: string): RelationshipModel {
    return {
        id: relId ?? `rel-${parentId}-${childId}`,
        type: 'Parent',
        subjectId: childId,
        relativeId: parentId,
    };
}

export function spouseRel(person1Id: string, person2Id: string, relId?: string): RelationshipModel {
    return {
        id: relId ?? `rel-spouse-${person1Id}-${person2Id}`,
        type: 'Spouse',
        subjectId: person1Id,
        relativeId: person2Id,
    };
}

export function tree(persons: PersonModel[], relationships: RelationshipModel[] = []): FamilyTreeModel {
    return {
        id: 'tree-1',
        name: 'Test Tree',
        description: null,
        ownerId: 'owner-1',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z',
        persons,
        relationships,
    };
}

export interface NuclearFamily {
    father: PersonModel;
    mother: PersonModel;
    children: PersonModel[];
    relationships: RelationshipModel[];
}

export function nuclearFamily(childCount: number, overrides?: {
    fatherGender?: Gender;
    motherGender?: Gender;
}): NuclearFamily {
    const father = person({ gender: overrides?.fatherGender ?? 'Male', firstName: 'Father' });
    const mother = person({ gender: overrides?.motherGender ?? 'Female', firstName: 'Mother' });
    const children: PersonModel[] = [];
    const relationships: RelationshipModel[] = [spouseRel(father.id, mother.id)];

    for (let i = 0; i < childCount; i++) {
        const child = person({ firstName: `Child${i + 1}` });
        children.push(child);
        relationships.push(parentRel(child.id, father.id));
        relationships.push(parentRel(child.id, mother.id));
    }

    return { father, mother, children, relationships };
}

export interface ThreeGenFamily {
    grandpa: PersonModel;
    grandma: PersonModel;
    father: PersonModel;
    mother: PersonModel;
    uncle: PersonModel;
    children: PersonModel[];
    allPersons: PersonModel[];
    relationships: RelationshipModel[];
}

export function threeGenerations(): ThreeGenFamily {
    const grandpa = person({ id: 'grandpa', firstName: 'Grandpa', gender: 'Male' });
    const grandma = person({ id: 'grandma', firstName: 'Grandma', gender: 'Female' });
    const father = person({ id: 'father', firstName: 'Father', gender: 'Male' });
    const mother = person({ id: 'mother', firstName: 'Mother', gender: 'Female' });
    const uncle = person({ id: 'uncle', firstName: 'Uncle', gender: 'Male' });
    const child1 = person({ id: 'child1', firstName: 'Child1', gender: 'Male' });
    const child2 = person({ id: 'child2', firstName: 'Child2', gender: 'Female' });

    const relationships: RelationshipModel[] = [
        spouseRel(grandpa.id, grandma.id),
        parentRel(father.id, grandpa.id),
        parentRel(father.id, grandma.id),
        parentRel(uncle.id, grandpa.id),
        parentRel(uncle.id, grandma.id),
        spouseRel(father.id, mother.id),
        parentRel(child1.id, father.id),
        parentRel(child1.id, mother.id),
        parentRel(child2.id, father.id),
        parentRel(child2.id, mother.id),
    ];

    const allPersons = [grandpa, grandma, father, mother, uncle, child1, child2];

    return {
        grandpa, grandma, father, mother, uncle,
        children: [child1, child2],
        allPersons,
        relationships,
    };
}
