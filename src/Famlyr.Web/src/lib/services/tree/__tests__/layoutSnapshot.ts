import type { TreeLayout, TreeNode } from '$lib/types/tree';
import { DEFAULT_LAYOUT_CONFIG } from '$lib/types/tree';
import { _testInternals } from '../layoutEngine';

function round(n: number): number {
    return Math.round(n);
}

function visible(layout: TreeLayout): TreeNode[] {
    return Array.from(layout.nodes.values()).filter(n => n.isVisible);
}

function crossingCount(layout: TreeLayout): number {
    const maps = _testInternals.buildRelationshipMaps(
        layout.connections
            .filter(c => c.type === 'parent-child')
            .flatMap(c => c.toIds.map(childId => ({
                id: `r-${c.fromIds[0]}-${childId}`,
                type: 'Parent' as const,
                subjectId: childId,
                relativeId: c.fromIds[0],
            })))
    );
    const layerMap = new Map<string, number>();
    const visibleNodeIds = new Set<string>();
    const xPositions = new Map<string, number>();
    for (const node of visible(layout)) {
        layerMap.set(node.id, node.layer);
        visibleNodeIds.add(node.id);
        xPositions.set(node.id, node.position.x);
    }
    return _testInternals.countCrossingsOptimized(
        layerMap, xPositions, maps, visibleNodeIds, DEFAULT_LAYOUT_CONFIG
    );
}

function avg(xs: number[]): number {
    return xs.reduce((a, b) => a + b, 0) / xs.length;
}

/**
 * True visual crossing count: crossings between family *units* as the renderer
 * actually draws them (parents → rail → children), not raw parent→child segments.
 * A crossing = two families in the same generation whose parents are ordered one
 * way but whose children are ordered the opposite way.
 */
export function countFamilyCrossings(layout: TreeLayout): number {
    const byGen = new Map<number, { p: number; c: number }[]>();

    for (const fam of layout.familyNodes.values()) {
        const parents = fam.parentIds
            .map(id => layout.nodes.get(id))
            .filter((n): n is TreeNode => !!n && n.isVisible);
        const children = fam.childIds
            .map(id => layout.nodes.get(id))
            .filter((n): n is TreeNode => !!n && n.isVisible);
        if (parents.length === 0 || children.length === 0) continue;

        const gen = parents[0].layer;
        if (!byGen.has(gen)) byGen.set(gen, []);
        byGen.get(gen)!.push({
            p: avg(parents.map(n => n.position.x + n.width / 2)),
            c: avg(children.map(n => n.position.x + n.width / 2)),
        });
    }

    let crossings = 0;
    for (const edges of byGen.values()) {
        const sorted = [...edges].sort((a, b) => a.p - b.p || a.c - b.c);
        for (let i = 0; i < sorted.length; i++) {
            for (let j = i + 1; j < sorted.length; j++) {
                if (sorted[i].c > sorted[j].c) crossings++;
            }
        }
    }
    return crossings;
}

/**
 * Counts bonded pairs (spouse / co-parent) that are NOT horizontally adjacent —
 * i.e. some other node on the same layer sits between the two partners. This is
 * the primary quality signal: couples must sit side by side.
 */
export function countAdjacencyViolations(layout: TreeLayout): { spouse: number; coparent: number } {
    const byLayer = new Map<number, TreeNode[]>();
    for (const n of visible(layout)) {
        if (!byLayer.has(n.layer)) byLayer.set(n.layer, []);
        byLayer.get(n.layer)!.push(n);
    }

    const result = { spouse: 0, coparent: 0 };
    for (const conn of layout.connections) {
        if (conn.type !== 'spouse' && conn.type !== 'coparent') continue;
        const a = layout.nodes.get(conn.fromIds[0]);
        const b = layout.nodes.get(conn.toIds[0]);
        if (!a || !b || !a.isVisible || !b.isVisible || a.layer !== b.layer) continue;

        const lo = Math.min(a.position.x, b.position.x);
        const hi = Math.max(a.position.x, b.position.x);
        const between = (byLayer.get(a.layer) ?? []).some(
            n => n.id !== a.id && n.id !== b.id && n.position.x > lo && n.position.x < hi
        );
        if (between) result[conn.type]++;
    }
    return result;
}

/**
 * Deterministic, human-readable serialization of a layout for golden snapshots.
 * Nodes are grouped by layer and sorted by x (then id) so the snapshot reads
 * left-to-right per generation. Coordinates are rounded to whole pixels.
 */
export function serializeLayout(layout: TreeLayout): string {
    const byLayer = new Map<number, TreeNode[]>();
    for (const node of visible(layout)) {
        if (!byLayer.has(node.layer)) byLayer.set(node.layer, []);
        byLayer.get(node.layer)!.push(node);
    }

    const adj = countAdjacencyViolations(layout);
    const lines: string[] = [];
    lines.push(`adjacency-violations: spouse=${adj.spouse} coparent=${adj.coparent}`);
    lines.push(`family-crossings: ${countFamilyCrossings(layout)}`);
    lines.push(`raw-crossings: ${crossingCount(layout)}`);
    lines.push(
        `bounds: x=[${round(layout.bounds.minX)}..${round(layout.bounds.maxX)}] ` +
        `w=${round(layout.bounds.width)} h=${round(layout.bounds.height)}`
    );

    for (const layer of Array.from(byLayer.keys()).sort((a, b) => a - b)) {
        const nodes = byLayer.get(layer)!.sort(
            (a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id)
        );
        const parts = nodes.map(n => `${n.person.firstName}@${round(n.position.x)}`);
        lines.push(`L${layer}: ${parts.join('  ')}`);
    }

    const familyNodes = Array.from(layout.familyNodes.values())
        .sort((a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id));
    if (familyNodes.length > 0) {
        lines.push(
            `family-nodes: ${familyNodes
                .map(f => `(${round(f.position.x)},${round(f.position.y)})`)
                .join(' ')}`
        );
    }

    return lines.join('\n');
}

function escapeXml(s: string): string {
    return s.replace(/[<>&'"]/g, c =>
        ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]!)
    );
}

const GENDER_FILL: Record<string, string> = {
    Male: '#dbeafe',
    Female: '#fce7f3',
};

/** Render a layout to a standalone SVG string for eyeballing. */
export function renderSvg(layout: TreeLayout, title: string): string {
    const nodes = visible(layout);
    const { minX, minY, width, height } = layout.bounds;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const edges: string[] = [];
    const line = (x1: number, y1: number, x2: number, y2: number, color = '#64748b', dash = '') =>
        edges.push(
            `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ` +
            `stroke="${color}" stroke-width="2"${dash}/>`
        );

    const hasVisibleSharedChild = (aId: string, bId: string): boolean => {
        const a = nodeMap.get(aId);
        const b = nodeMap.get(bId);
        if (!a || !b) return false;
        return a.childIds.some(c => b.childIds.includes(c) && nodeMap.has(c));
    };

    // Parent-child routing via family connector nodes — mirrors treeRenderer.ts
    for (const familyNode of layout.familyNodes.values()) {
        const parentCenters = familyNode.parentIds
            .map(id => nodeMap.get(id))
            .filter((n): n is TreeNode => !!n)
            .map(n => ({ x: n.position.x + n.width / 2, y: n.position.y + n.height }));
        if (parentCenters.length === 0) continue;

        const familyX = familyNode.position.x;
        const familyY = familyNode.position.y;

        if (parentCenters.length === 2) {
            const [p1, p2] = parentCenters;
            const busY = p1.y + (familyY - p1.y) * 0.3;
            line(p1.x, p1.y, p1.x, busY);
            line(p2.x, p2.y, p2.x, busY);
            line(p1.x, busY, p2.x, busY);
            line((p1.x + p2.x) / 2, busY, familyX, familyY);
        } else {
            line(parentCenters[0].x, parentCenters[0].y, familyX, familyY);
        }

        const childCenters = familyNode.childIds
            .map(id => nodeMap.get(id))
            .filter((n): n is TreeNode => !!n)
            .map(n => ({ x: n.position.x + n.width / 2, y: n.position.y }));
        if (childCenters.length === 0) continue;

        const railMinX = Math.min(familyX, ...childCenters.map(c => c.x));
        const railMaxX = Math.max(familyX, ...childCenters.map(c => c.x));
        line(railMinX, familyY, railMaxX, familyY);
        for (const c of childCenters) line(c.x, familyY, c.x, c.y);
    }

    // spouse / co-parent bonds — only when no visible shared children (app hides otherwise)
    for (const conn of layout.connections) {
        if (conn.type !== 'spouse' && conn.type !== 'coparent') continue;
        const a = nodeMap.get(conn.fromIds[0]);
        const b = nodeMap.get(conn.toIds[0]);
        if (!a || !b) continue;
        if (hasVisibleSharedChild(a.id, b.id)) continue;
        const y = a.position.y + a.height / 2;
        const color = conn.type === 'spouse' ? '#e11d48' : '#a855f7';
        const dash = conn.type === 'coparent' ? ' stroke-dasharray="6 4"' : '';
        line(a.position.x + a.width, y, b.position.x, b.position.y + b.height / 2, color, dash);
    }

    const boxes = nodes.map(n => {
        const fill = GENDER_FILL[n.person.gender ?? ''] ?? '#f1f5f9';
        const label = escapeXml(n.person.firstName ?? '?');
        return (
            `<g>` +
            `<rect x="${n.position.x}" y="${n.position.y}" width="${n.width}" height="${n.height}" ` +
            `rx="8" fill="${fill}" stroke="#334155" stroke-width="1.5"/>` +
            `<text x="${n.position.x + n.width / 2}" y="${n.position.y + n.height / 2}" ` +
            `font-family="sans-serif" font-size="14" text-anchor="middle" ` +
            `dominant-baseline="middle" fill="#0f172a">${label}</text>` +
            `</g>`
        );
    });

    const dots = Array.from(layout.familyNodes.values()).map(
        f => `<circle cx="${f.position.x}" cy="${f.position.y}" r="4" fill="#0ea5e9"/>`
    );

    return (
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${minX} ${minY} ${width} ${height}" ` +
        `width="${Math.min(2400, Math.max(400, width))}" font-family="sans-serif">` +
        `<rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="#ffffff"/>` +
        `<text x="${minX + 16}" y="${minY + 28}" font-size="20" fill="#0f172a">${escapeXml(title)}</text>` +
        edges.join('') +
        boxes.join('') +
        dots.join('') +
        `</svg>`
    );
}
