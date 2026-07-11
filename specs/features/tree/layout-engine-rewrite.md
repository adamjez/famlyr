# Feature: Layout Engine Pipeline Rewrite

> **Status:** Implemented (order-key approach)
> **Author:** Adam + Claude
> **Last Updated:** 2026-07-11

## Overview

The tree layout engine (`layoutEngine.ts`) positions family-tree nodes. The old
coordinate pipeline had grown into ~20 interleaved steps where Brandes-Köpf
overwrote earlier centering, spouse/co-parent adjacency was patched by nudge
heuristics, and `resolveLayerCollisions` ran ~10 times. Small edits caused
regressions elsewhere because there was **no single source of truth for node
order**.

This rewrite replaces the coordinate pipeline with an order-key tidy layout.

## What was actually built

The original plan kept Brandes-Köpf as the primary coordinate assigner. During
implementation we found the family graph is a **DAG** (marriages merge lineages;
people have multiple unions), and that the real defects were not edge crossings
at all — `family-crossings` was already 0 — but **couple-adjacency** (spouses
separated by other nodes) and centering. Brandes-Köpf does not model couples, so
it was dropped in favour of a simpler, deterministic approach.

### Pipeline (4 phases in `calculatePositions`)

1. **Structure** — `buildClusterTree` + `createFamilyNodes` (connector nodes).
2. **Ordering** — the source of truth:
   - `computeOrderKeys`: each node's key = mean of its children's keys; a leaf
     gets the next sequential slot; childless spouses inherit a partner's key.
     Couples share a key region; a multi-union parent lands between its partners.
   - `buildLayerOrder` + `orderComponentByBonds`: per layer, group nodes into
     bond components (spouse / co-parent), order each component so bonded pairs
     are adjacent (brute-forced for components ≤ 7), then sort components by key.
   - `minimizeOrderCrossings`: barycenter sweeps on integer order; components
     stay atomic so couple adjacency is never broken.
3. **Coordinates** — `packByOrder` then alternating `centerComponents('up'/'down')`
   passes. Every pass is order-preserving and moves bond components as rigid
   blocks, so couples stay centered and adjacent **by construction**. Positions
   are normalized so the left edge is at 0.
4. **Finalize** — `positionFamilyNodes` centers each connector over its
   **children** (straight drop lines); Y from layer number.

### Removed (~1347 lines)

`brandesKopfCoordinates` and helpers, `minimizeCrossingsImproved` /
`minimizeCrossingsBarycenter` / `localSwapOptimization` / `reorderLayerByHeuristic`
and their helpers, `assignClusterPositions`, `calculateClusterWidths`,
`centerChildrenUnderParents`, `ensureBondedAdjacent`, `resolveLayerCollisions`.

## Results

Across 10 fixtures (incl. the 33-person real tree): **0 couple-adjacency
violations, 0 family crossings.** `remarriage-with-grandkids` also got 18%
narrower. All 58 behavioural tests pass; engine shrank ~2670 → ~1320 lines.

## Test strategy

- `layoutEngine.test.ts` — 58 behavioural/structural tests (unchanged).
- `layoutSnapshot.test.ts` — golden snapshots + faithful SVG render (mirrors
  `treeRenderer.ts` family-node routing) written to `layout-preview/` for eyeballing.
- `layoutQuality.test.ts` — asserts adjacency violations = 0 and family
  crossings = 0 for every fixture. New quality metrics (`countFamilyCrossings`,
  `countAdjacencyViolations`) live in `layoutSnapshot.ts`; the raw parent-child
  crossing count is misleading because the renderer routes through family rails.

## Out of scope

Rendering changes, backend/API, alternative layouts (radial/force-directed).
