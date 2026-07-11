import type { FamilyTreeModel } from '$lib/types/api';
import {
    person,
    parentRel,
    spouseRel,
    tree,
    nuclearFamily,
    threeGenerations,
    resetIds,
} from './treeBuilder';
import realTreeData from './realTreeData.json';

export interface LayoutFixture {
    name: string;
    /** Builds the tree. resetIds() is called before this runs so ids are deterministic. */
    build: () => FamilyTreeModel;
    focusPersonId?: string | null;
    /** If true, expand every person (show full tree). Defaults to true. */
    expandAll?: boolean;
}

function halfSiblings(): FamilyTreeModel {
    // One father, two different mothers, children from each union.
    const father = person({ id: 'dad', firstName: 'Father', gender: 'Male' });
    const momA = person({ id: 'momA', firstName: 'MotherA', gender: 'Female' });
    const momB = person({ id: 'momB', firstName: 'MotherB', gender: 'Female' });
    const childA1 = person({ id: 'a1', firstName: 'ChildA1' });
    const childA2 = person({ id: 'a2', firstName: 'ChildA2' });
    const childB1 = person({ id: 'b1', firstName: 'ChildB1' });

    return tree(
        [father, momA, momB, childA1, childA2, childB1],
        [
            spouseRel(father.id, momA.id),
            spouseRel(father.id, momB.id),
            parentRel(childA1.id, father.id),
            parentRel(childA1.id, momA.id),
            parentRel(childA2.id, father.id),
            parentRel(childA2.id, momA.id),
            parentRel(childB1.id, father.id),
            parentRel(childB1.id, momB.id),
        ]
    );
}

function remarriageWithGrandkids(): FamilyTreeModel {
    // Grandparents -> father, father remarries, children from both unions,
    // one child has kids of their own.
    const gpa = person({ id: 'gpa', firstName: 'Grandpa', gender: 'Male' });
    const gma = person({ id: 'gma', firstName: 'Grandma', gender: 'Female' });
    const father = person({ id: 'father', firstName: 'Father', gender: 'Male' });
    const wife1 = person({ id: 'wife1', firstName: 'Wife1', gender: 'Female' });
    const wife2 = person({ id: 'wife2', firstName: 'Wife2', gender: 'Female' });
    const son = person({ id: 'son', firstName: 'Son', gender: 'Male' });
    const daughter = person({ id: 'daughter', firstName: 'Daughter', gender: 'Female' });
    const sonWife = person({ id: 'sonWife', firstName: 'SonWife', gender: 'Female' });
    const gk1 = person({ id: 'gk1', firstName: 'Grandkid1' });
    const gk2 = person({ id: 'gk2', firstName: 'Grandkid2' });

    return tree(
        [gpa, gma, father, wife1, wife2, son, daughter, sonWife, gk1, gk2],
        [
            spouseRel(gpa.id, gma.id),
            parentRel(father.id, gpa.id),
            parentRel(father.id, gma.id),
            spouseRel(father.id, wife1.id),
            spouseRel(father.id, wife2.id),
            parentRel(son.id, father.id),
            parentRel(son.id, wife1.id),
            parentRel(daughter.id, father.id),
            parentRel(daughter.id, wife2.id),
            spouseRel(son.id, sonWife.id),
            parentRel(gk1.id, son.id),
            parentRel(gk1.id, sonWife.id),
            parentRel(gk2.id, son.id),
            parentRel(gk2.id, sonWife.id),
        ]
    );
}

function fourGenerations(): FamilyTreeModel {
    // Linear lineage with a spouse at each generation and a couple of siblings.
    const g1a = person({ id: 'g1a', firstName: 'G1a', gender: 'Male' });
    const g1b = person({ id: 'g1b', firstName: 'G1b', gender: 'Female' });
    const g2a = person({ id: 'g2a', firstName: 'G2a', gender: 'Male' });
    const g2b = person({ id: 'g2b', firstName: 'G2b', gender: 'Female' });
    const g2sib = person({ id: 'g2sib', firstName: 'G2sib', gender: 'Female' });
    const g3a = person({ id: 'g3a', firstName: 'G3a', gender: 'Male' });
    const g3b = person({ id: 'g3b', firstName: 'G3b', gender: 'Female' });
    const g4a = person({ id: 'g4a', firstName: 'G4a' });
    const g4b = person({ id: 'g4b', firstName: 'G4b' });

    return tree(
        [g1a, g1b, g2a, g2b, g2sib, g3a, g3b, g4a, g4b],
        [
            spouseRel(g1a.id, g1b.id),
            parentRel(g2a.id, g1a.id),
            parentRel(g2a.id, g1b.id),
            parentRel(g2sib.id, g1a.id),
            parentRel(g2sib.id, g1b.id),
            spouseRel(g2a.id, g2b.id),
            parentRel(g3a.id, g2a.id),
            parentRel(g3a.id, g2b.id),
            spouseRel(g3a.id, g3b.id),
            parentRel(g4a.id, g3a.id),
            parentRel(g4a.id, g3b.id),
            parentRel(g4b.id, g3a.id),
            parentRel(g4b.id, g3b.id),
        ]
    );
}

function twoUnrelatedFamilies(): FamilyTreeModel {
    const dad = person({ id: 'dad', firstName: 'Dad', gender: 'Male' });
    const mom = person({ id: 'mom', firstName: 'Mom', gender: 'Female' });
    const child1 = person({ id: 'child1', firstName: 'Child1' });
    const dad2 = person({ id: 'dad2', firstName: 'Dad2', gender: 'Male' });
    const mom2 = person({ id: 'mom2', firstName: 'Mom2', gender: 'Female' });
    const child2 = person({ id: 'child2', firstName: 'Child2' });

    return tree(
        [dad, mom, child1, dad2, mom2, child2],
        [
            spouseRel(dad.id, mom.id),
            parentRel(child1.id, dad.id),
            parentRel(child1.id, mom.id),
            spouseRel(dad2.id, mom2.id),
            parentRel(child2.id, dad2.id),
            parentRel(child2.id, mom2.id),
        ]
    );
}

export const FIXTURES: LayoutFixture[] = [
    { name: 'single', build: () => tree([person({ id: 'solo', firstName: 'Solo' })]) },
    {
        name: 'couple',
        build: () => {
            const h = person({ id: 'h', firstName: 'Husband', gender: 'Male' });
            const w = person({ id: 'w', firstName: 'Wife', gender: 'Female' });
            return tree([h, w], [spouseRel(h.id, w.id)]);
        },
    },
    {
        name: 'nuclear-2',
        build: () => {
            const f = nuclearFamily(2);
            return tree([f.father, f.mother, ...f.children], f.relationships);
        },
    },
    {
        name: 'nuclear-5',
        build: () => {
            const f = nuclearFamily(5);
            return tree([f.father, f.mother, ...f.children], f.relationships);
        },
    },
    {
        name: 'three-generations',
        build: () => {
            const f = threeGenerations();
            return tree(f.allPersons, f.relationships);
        },
    },
    { name: 'half-siblings', build: halfSiblings },
    { name: 'remarriage-with-grandkids', build: remarriageWithGrandkids },
    { name: 'four-generations', build: fourGenerations },
    { name: 'two-unrelated-families', build: twoUnrelatedFamilies },
    { name: 'real-tree-33', build: () => realTreeData as FamilyTreeModel },
];

/** Reset ids and build a fixture's tree deterministically. */
export function buildFixture(fixture: LayoutFixture): FamilyTreeModel {
    resetIds();
    return fixture.build();
}
