# Feature: Large Tree Navigation

> **Status:** Implemented
> **GitHub Issue:** #TBD
> **Author:** Adam Jež
> **Last Updated:** 2026-11-22

## Overview

Improve orientation and navigation in family trees with thousands of persons by adding a compact
overview of the complete layout and making the currently visible area and focused person easy to understand.

## User Stories

- As a user, I want an overview of the whole tree so that I know where I am in a large lineage.
- As a user, I want to click or tap a place in the overview so that I can jump to that part quickly.
- As a user, I want to switch between surname branches and root family branches so that I can navigate the tree in the context that makes sense.
- As a user, I want the overview to be unobtrusive on mobile devices so that it does not cover tree controls.
- As a user, I want keyboard and screen-reader users to have an equivalent way to navigate and search.

## Requirements

### Functional

- [x] Show a mini-map for desktop tree viewers.
- [x] Render all visible layout nodes in the mini-map.
- [x] Highlight the focused person when focus mode is active.
- [x] Draw a live viewport rectangle showing the visible tree area.
- [x] Click or tap in the mini-map to center the main viewport on that location.
- [x] Allow the mini-map to be closed and reopened.
- [x] Provide a surname branch navigator that groups persons by last name.
- [x] Provide a family-root navigator that identifies root persons and their spouse pairs.
- [x] Focus a representative person when a surname or family branch is selected.
- [x] Hide the mini-map by default on screens narrower than 640px and provide a floating button to open it as an overlay.
- [x] On mobile, close the mini-map overlay after selecting a location and center the main tree on the tapped point.
- [x] On mobile, open surname and root-family branch navigation as an overlay from a floating button.
- [x] On mobile, close the branch overlay after selecting a branch and focus that branch.
- [x] Preserve existing search, focus, folding, and zoom behavior.
- [x] Provide an explicit whole-tree action that exits focus mode and fits the complete layout.

### Non-functional

- [x] The mini-map must update from the existing layout without extra API requests.
- [x] The mini-map must use viewport culling state only as a navigation aid and must not alter the layout.
- [x] Node rendering in the mini-map should remain lightweight for trees up to 10,000 persons.
- [ ] Full keyboard navigation between every rendered person remains a future enhancement.

## Edge Cases

- Trees with no layout or no persons show an empty mini-map state.
- Mini-map clicks after viewport resize use the current layout bounds.
- Closing the mini-map does not change the main tree viewport.
- Mobile layout does not reserve permanent space for the mini-map.

## Security Considerations

- No new network requests or data exposure.
- Person names are not rendered in the mini-map.

## Out of Scope

- Timeline century bands.
- Server-side pagination for tree visualization.
- Editing person data from the mini-map.

## Open Questions

- None.

## Related

- Related: `view-tree.md`
- Related: `TreeViewer.svelte`, `TreeCanvas.svelte`, `treeView.svelte.ts`
