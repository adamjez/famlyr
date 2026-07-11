import { describe, it, expect, beforeAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { calculateLayout } from '../layoutEngine';
import { FIXTURES, buildFixture } from './fixtures';
import { serializeLayout, renderSvg } from './layoutSnapshot';

const PREVIEW_DIR = join(process.cwd(), 'layout-preview');

describe('layout golden snapshots', () => {
    beforeAll(() => {
        rmSync(PREVIEW_DIR, { recursive: true, force: true });
        mkdirSync(PREVIEW_DIR, { recursive: true });
    });

    for (const fixture of FIXTURES) {
        it(`matches snapshot: ${fixture.name}`, () => {
            const tree = buildFixture(fixture);
            const expandAll = fixture.expandAll !== false
                ? new Set(tree.persons.map(p => p.id))
                : new Set<string>();

            const layout = calculateLayout(tree, fixture.focusPersonId ?? null, {
                expandedNodeIds: expandAll,
            });

            writeFileSync(join(PREVIEW_DIR, `${fixture.name}.svg`), renderSvg(layout, fixture.name));

            expect(serializeLayout(layout)).toMatchSnapshot();
        });
    }
});
