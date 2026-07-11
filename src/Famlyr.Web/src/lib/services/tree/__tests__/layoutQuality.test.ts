import { describe, it, expect, beforeEach } from 'vitest';
import { calculateLayout } from '../layoutEngine';
import { resetIds } from './treeBuilder';
import { FIXTURES, buildFixture } from './fixtures';
import { countAdjacencyViolations, countFamilyCrossings } from './layoutSnapshot';

beforeEach(() => resetIds());

describe('layout quality invariants', () => {
    for (const fixture of FIXTURES) {
        it(`keeps couples adjacent and crossing-free: ${fixture.name}`, () => {
            const tree = buildFixture(fixture);
            const layout = calculateLayout(tree, fixture.focusPersonId ?? null, {
                expandedNodeIds: new Set(tree.persons.map(p => p.id)),
            });

            const adj = countAdjacencyViolations(layout);
            expect(adj.spouse, `${fixture.name}: spouses must be adjacent`).toBe(0);
            expect(adj.coparent, `${fixture.name}: co-parents must be adjacent`).toBe(0);
            expect(countFamilyCrossings(layout), `${fixture.name}: family units must not cross`).toBe(0);
        });
    }
});
