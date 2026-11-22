import { describe, expect, it } from 'vitest';
import { buildFamilyBranches } from '../branchNavigator';
import { parentRel, person, spouseRel, threeGenerations } from './treeBuilder';

describe('buildFamilyBranches', () => {
    it('groups a root couple with all descendants and spouses', () => {
        const family = threeGenerations();

        const branches = buildFamilyBranches(family.allPersons, family.relationships);
        const rootBranch = branches.find(branch => branch.representativeId === family.grandpa.id);

        expect(rootBranch).toMatchObject({
            label: 'Grandpa grandpa & Grandma grandma',
            count: family.allPersons.length,
            representativeId: family.grandpa.id
        });
    });

    it('uses all persons as roots when there are no parent relationships', () => {
        const first = person({ id: 'first', firstName: 'First' });
        const second = person({ id: 'second', firstName: 'Second' });

        const branches = buildFamilyBranches([first, second], [spouseRel(first.id, second.id)]);

        expect(branches).toHaveLength(1);
        expect(branches[0]).toMatchObject({
            count: 2,
            representativeId: first.id
        });
    });

    it('traverses a large family and counts every member once', () => {
        const parent = person({ id: 'parent', firstName: 'Parent' });
        const spouse = person({ id: 'spouse', firstName: 'Spouse' });
        const children = Array.from({ length: 5_000 }, (_, index) =>
            person({ id: `child-${index}`, firstName: `Child ${index}` })
        );
        const relationships = [
            spouseRel(parent.id, spouse.id),
            ...children.map(child => parentRel(child.id, parent.id))
        ];

        const branches = buildFamilyBranches([parent, spouse, ...children], relationships);

        expect(branches).toHaveLength(1);
        expect(branches[0].count).toBe(children.length + 2);
    });
});
