# Feature: View Family Tree

> **Status:** Phase 1 Implemented
> **GitHub Issue:** #TBD
> **Author:** Adam Jež
> **Last Updated:** 2025-12-28

## Overview

The family tree viewer is the core visualization component of Famlyr. It renders an interactive, zoomable family tree using Canvas/WebGL (Pixi.js) for optimal performance with up to 10,000 persons. The viewer supports mobile-first touch gestures, level-of-detail rendering based on zoom level, configurable focus mode, and provides navigation aids including a toggleable mini-map and person search.

To handle large families efficiently, the viewer implements a **sibling folding system**: when siblings are displayed next to each other, their descendants (children, grandchildren, etc.) are collapsed by default. Users can expand/unfold individual sibling branches to explore deeper lineages on demand.

## User Stories

- As a user, I want to view my family tree visually so that I can understand the lineage at a glance
- As a user, I want to zoom and pan the tree so that I can navigate large family structures
- As a user, I want to pinch-to-zoom on mobile so that the tree feels natural to navigate on touch devices
- As a user, I want to select any person as the "focus" so that I see their ancestors above and descendants below
- As a user, I want to see parent connections where children branch from the line between parents so that I understand family units
- As a user, I want to see less detail when zoomed out and more detail when zoomed in for readability
- As a user, I want to see century/decade indicators when fully zoomed out so that I understand the time span
- As a user, I want a mini-map to see where I am in a large tree
- As a user, I want to search for a person by name so that I can quickly navigate to them
- As a user, I want the tree to load quickly even with 10,000 persons
- As a user, I want sibling descendants to be collapsed by default so that I can see all siblings at once without visual clutter
- As a user, I want to expand/unfold a sibling's descendants so that I can explore their branch of the family tree
- As a user, I want to collapse a sibling's descendants back so that I can focus on other parts of the tree

## Requirements

### Functional

#### Rendering
- [ ] Render family tree on Canvas/WebGL using Pixi.js for 60fps performance
- [ ] Display person nodes with content based on current zoom level
- [ ] Render parent-child connections: vertical line from midpoint between parents down to children
- [x] Render spouse connections as horizontal line ONLY when couple has no children
- [ ] When parents have children: the horizontal parent connection and vertical child line form a "T" or inverted "Y" shape
- [ ] Support trees with up to 10,000 persons
- [ ] Color-code nodes by gender (configurable colors)

#### Sibling Folding
- [ ] When multiple siblings are displayed, their descendants are collapsed by default
- [ ] Show fold indicator on sibling nodes that have descendants (e.g., "▶ 12 descendants")
- [ ] Click fold indicator to expand/unfold that sibling's descendants
- [ ] Click again to collapse descendants back
- [ ] Expanded state persists during pan/zoom within the session
- [ ] Only the focused person's direct lineage (ancestors and descendants) is fully expanded by default
- [ ] Animate expand/collapse transitions (300ms)

#### Navigation
- [x] Zoom in/out with mouse wheel or trackpad
- [x] Pan the tree by clicking and dragging
- [ ] Pinch-to-zoom gesture on touch devices
- [ ] Two-finger pan gesture on touch devices
- [x] Smooth animated transitions between zoom levels (300ms)
- [ ] Double-click/tap on person to center and zoom to them
- [x] Zoom limits: minimum fit-to-screen, maximum 3.0x
- [x] Initial view fits entire tree on screen
- [x] Reset button returns to fit-to-screen view

#### Focus Mode
- [ ] User can select any person as the focus
- [ ] Focused person appears at vertical center
- [ ] Ancestors render above the focus person
- [ ] Descendants render below the focus person (fully expanded by default)
- [ ] Siblings visible at the same level with their descendants collapsed
- [ ] Visual indicator (highlight ring) for currently focused person
- [ ] When focus changes, reset fold states: new focus's lineage expanded, siblings collapsed

#### Levels of Detail (LOD)
- [ ] **LOD 1 (Zoom < 0.2)**: Tree shape only - small colored rectangles by gender, century/decade row indicators
- [ ] **LOD 2 (Zoom 0.2-0.5)**: Medium detail - person names (truncated), birth/death years
- [ ] **LOD 3 (Zoom > 0.5)**: Full details - primary photo (circular crop, ~40px), full name, dates, birthplace, gender icon
  - Photo displayed in top-left or top portion of node
  - Show placeholder avatar if no photo (gender-based icon or initials)
  - See `person-photos.md` spec for photo data model

#### Timeline Indicators
- [ ] Group persons into horizontal bands by birth century/decade
- [ ] Display timeline labels on the left edge (e.g., "1800s", "1920s")
- [ ] Handle persons with unknown birth dates gracefully (separate "Unknown" band)

#### Mini-map
- [ ] Show overview of entire tree structure in corner
- [ ] Highlight current viewport position as a rectangle
- [ ] Click on mini-map to navigate to that area
- [ ] Toggle mini-map visibility with button (default: hidden on mobile, visible on desktop)

#### Search
- [ ] Search bar to find persons by first name or last name
- [ ] Case-insensitive fuzzy matching
- [ ] Display up to 10 matching results in dropdown
- [ ] Click result to navigate and focus on that person
- [ ] Keyboard shortcut: `/` to focus search bar

#### Person Selection
- [x] Click/tap on person node to select
- [x] Display detail panel (slide-in from right) for selected person
- [x] Highlight selected node with distinct border
- [ ] Close panel with X button or clicking outside
- [x] Zoom to selected person and their direct relatives (parents, children, spouses)

### Non-functional

#### Performance
- [ ] Initial render < 500ms for 1000 persons, < 2000ms for 10,000 persons
- [ ] Maintain 60fps during pan/zoom with 10,000 persons (with folding)
- [ ] Viewport culling: only render visible nodes + buffer zone
- [ ] Memory usage < 100MB for 1000 persons, < 500MB for 10,000 persons
- [ ] Search response < 100ms after keystroke for 10,000 persons
- [ ] Expand/collapse animation completes in < 300ms

#### Accessibility
- [ ] Keyboard navigation between nodes (arrow keys)
- [ ] Screen reader support with ARIA labels
- [ ] High contrast mode support
- [ ] Respect `prefers-reduced-motion` (disable animations)
- [ ] Focus indicators for keyboard navigation
- [ ] Provide list view alternative for full accessibility

#### Responsiveness
- [ ] Mobile-first design approach
- [ ] Breakpoints: mobile (<640px), tablet (640-1024px), desktop (>1024px)
- [ ] Touch-optimized hit targets (minimum 44x44px)
- [ ] Mini-map auto-hide on mobile by default

## Technical Specification

### Rendering Library

**Pixi.js** (recommended)

Rationale:
- WebGL-based with automatic Canvas 2D fallback
- Excellent performance for 1000+ interactive objects
- Built-in interaction system (click, hover, drag)
- Active community and full TypeScript support
- Scene graph model fits tree structure naturally

### Layout Algorithm

**Layered Tree Layout (Sugiyama-style)**

1. **Generation Assignment**: Assign each person to a horizontal layer based on parent-child relationships
   - Focus person = layer 0
   - Parents = layer -1, -2, etc. (rendered above)
   - Children = layer +1, +2, etc. (rendered below)
   - Spouses share the same layer

2. **Node Ordering**: Order nodes within each layer to minimize edge crossings

3. **Spouse Positioning**: Render spouses horizontally adjacent
   - Multiple spouses (remarriage) render side-by-side
   - Children centered below the couple unit
   - **Connection logic:**
     - If couple has children: horizontal line connects parents, vertical line drops from midpoint to children (T-shape)
     - If couple has no children: simple horizontal connector line between spouses
     - Single parent: vertical line directly from parent to children

4. **Coordinate Calculation**: Position nodes with consistent spacing
   - Horizontal: 200px between siblings
   - Vertical: 150px between generations
   - Couple gap: 50px between spouses

5. **Sibling Folding**: For scalability with large families
   - By default, only the focused person's direct lineage is expanded
   - Siblings of the focused person are shown but their descendants are collapsed
   - Each sibling node shows a fold indicator: "▶ 12" (collapsed) or "▼" (expanded)
   - Click the fold indicator to toggle expand/collapse for that sibling's branch
   - Descendant count includes all generations (children + grandchildren + ...)
   - Collapsed siblings still show their spouse(s) on the same layer
   - When a sibling is expanded, their children appear with their own fold indicators

6. **Wide Tree Handling**: When siblings exceed viewport width
   - Collapse distant siblings into "+N siblings" indicator
   - Expand on click to reveal

### Level of Detail Configuration

| Zoom Range | Node Size | Rendered Content | Timeline |
|------------|-----------|------------------|----------|
| < 0.2 | 20x20px | Colored rectangle (gender-based) | Century labels |
| 0.2 - 0.5 | 80x50px | Name (truncated to 15 chars), birth year | Decade labels |
| > 0.5 | 200x140px | Primary photo (circular, ~40px), full name, birth/death dates, birthplace | None |

> **Photo Display at LOD 3:** Primary photo is displayed as a circular crop in the top portion of the node. If no photo exists, show a placeholder (gender-based colored circle with initials or icon).

### Component Architecture

```
src/Famlyr.Web/src/lib/
├── components/
│   └── tree/
│       ├── TreeViewer.svelte         # Main container, orchestrates sub-components
│       ├── TreeCanvas.svelte         # Pixi.js canvas wrapper and rendering
│       ├── TreeMinimap.svelte        # Toggleable mini-map overlay
│       ├── TreeSearch.svelte         # Search bar with results dropdown
│       ├── PersonDetailPanel.svelte  # Slide-in panel for selected person
│       ├── TimelineIndicator.svelte  # Century/decade labels on left edge
│       └── TreeControls.svelte       # Zoom +/- buttons, reset, mini-map toggle
├── services/
│   └── tree/
│       ├── layoutEngine.ts           # Tree layout algorithm
│       ├── treeRenderer.ts           # Pixi.js sprite creation and updates
│       ├── gestureHandler.ts         # Pointer event processing for touch/mouse
│       ├── lodManager.ts             # Level of detail calculations
│       └── treeSearch.ts             # Fuzzy search implementation
├── stores/
│   └── treeView.svelte.ts            # Reactive state using Svelte 5 runes
└── types/
    └── tree.ts                       # Tree viewer type definitions
```

### State Management

```typescript
// src/lib/stores/treeView.svelte.ts
interface TreeViewState {
  tree: FamilyTreeModel | null;
  viewport: {
    x: number;
    y: number;
    zoom: number;
    width: number;
    height: number;
  };
  focusedPersonId: string | null;
  selectedPersonId: string | null;
  searchQuery: string;
  searchResults: PersonModel[];
  isMinimapVisible: boolean;
  currentLOD: 1 | 2 | 3;
  expandedNodeIds: Set<string>;  // IDs of nodes whose descendants are visible
}
```

### Type Definitions

```typescript
// src/lib/types/tree.ts
interface TreeNode {
  id: string;
  person: PersonModel;
  position: { x: number; y: number };
  layer: number;
  spouse?: TreeNode;
  children: TreeNode[];
  parents: TreeNode[];
  isCollapsed: boolean;          // Whether this node's descendants are hidden
  descendantCount: number;       // Total count of all descendants (for fold indicator)
  isFocusLineage: boolean;       // Whether this node is in the focused person's direct lineage
}

interface TreeLayout {
  nodes: Map<string, TreeNode>;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  layers: Map<number, TreeNode[]>;
  timelineMarkers: TimelineMarker[];
}

interface TimelineMarker {
  year: number;
  label: string;
  y: number;
}

interface LODConfig {
  zoomThresholds: {
    minimal: number;   // 0.2
    medium: number;    // 0.5
    detailed: number;  // 1.0
  };
  nodeSize: {
    minimal: { width: number; height: number };
    medium: { width: number; height: number };
    detailed: { width: number; height: number };
  };
}
```

## API Specification

### `GET /api/familytree/{id}`

**Description:** Fetch complete family tree with all persons and relationships (existing endpoint)

**Authentication:** None (v0.1) / Required in v0.3

**Response (200 OK):**
```json
{
  "id": "019400a0-7b1a-7abc-8def-0123456789ab",
  "name": "Smith Family Tree",
  "description": "Our family history",
  "ownerId": "00000000-0000-0000-0000-000000000000",
  "createdAt": "2025-12-27T10:30:00Z",
  "updatedAt": "2025-12-27T10:30:00Z",
  "persons": [
    {
      "id": "019400a0-7b1a-7abc-8def-111111111111",
      "firstName": "John",
      "lastName": "Smith",
      "gender": "Male",
      "birthDate": "1940-05-15",
      "deathDate": "2015-03-22"
    }
  ],
  "relationships": [
    {
      "id": "019400a0-7b1a-7abc-8def-222222222222",
      "type": "Parent",
      "subjectId": "019400a0-7b1a-7abc-8def-111111111111",
      "relativeId": "019400a0-7b1a-7abc-8def-333333333333"
    }
  ]
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 404 | NOT_FOUND | Family tree not found |

### `GET /api/trees/{id}/view` (New - Optimized)

**Description:** Fetch optimized tree data for visualization with reduced payload

**Authentication:** None (v0.1) / Required in v0.3

**Response (200 OK):**
```json
{
  "id": "019400a0-7b1a-7abc-8def-0123456789ab",
  "name": "Smith Family Tree",
  "persons": [
    {
      "id": "019400a0-7b1a-7abc-8def-111111111111",
      "firstName": "John",
      "lastName": "Smith",
      "gender": "Male",
      "birthYear": 1940,
      "deathYear": 2015,
      "primaryPhotoUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ],
  "relationships": [
    {
      "type": "Parent",
      "subjectId": "019400a0-7b1a-7abc-8def-111111111111",
      "relativeId": "019400a0-7b1a-7abc-8def-333333333333"
    }
  ]
}
```

**Notes:**
- `birthYear`/`deathYear` instead of full dates (smaller payload)
- Relationship IDs omitted (not needed for rendering)
- `primaryPhotoUrl` is base64 data URL of primary photo (null if no photos)

### `GET /api/trees/{treeId}/persons/{personId}` (New - On Demand)

**Description:** Fetch full person details when zoomed in or for detail panel

**Authentication:** None (v0.1) / Required in v0.3

**Response (200 OK):**
```json
{
  "id": "019400a0-7b1a-7abc-8def-111111111111",
  "firstName": "John",
  "lastName": "Smith",
  "gender": "Male",
  "birthDate": "1940-05-15",
  "deathDate": "2015-03-22",
  "birthPlace": "New York, NY",
  "primaryPhotoUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
  "photos": [
    {
      "id": "019400a0-7b1a-7abc-8def-444444444444",
      "isPrimary": true,
      "createdAt": "2025-01-15T10:30:00Z",
      "order": 0,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    },
    {
      "id": "019400a0-7b1a-7abc-8def-555555555555",
      "isPrimary": false,
      "createdAt": "2025-01-16T14:22:00Z",
      "order": 1,
      "imageUrl": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ],
  "notes": "Served in WWII"
}
```

**Notes:**
- `primaryPhotoUrl` is the primary photo for quick display
- `photos` array contains all photos for the gallery in detail panel
- See `person-photos.md` spec for photo management APIs

## Data Model Extensions

### Person Entity (Future Extensions)

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| BirthPlace | string? | Max 200 chars | City, State/Country |
| Notes | string? | Max 2000 chars | Trivia, biography |

> BirthPlace and Notes will be added in a future iteration.

### PersonPhoto Entity

Photos are stored via the `PersonPhoto` entity. See `person-photos.md` spec for full data model.

| Field | Type | Description |
|-------|------|-------------|
| Id | Guid | UUIDv7 identifier |
| PersonId | Guid | FK to Person |
| ImageData | byte[] | Photo binary (TEMPORARY - migrate to blob storage before production) |
| IsPrimary | bool | Is this the primary display photo |
| CreatedAt | DateTime | Upload timestamp |
| Order | int | Gallery display order |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow Up | Move selection to parent (first parent if two) |
| Arrow Down | Move selection to first child (expands if collapsed) |
| Arrow Left | Move to previous sibling or spouse |
| Arrow Right | Move to next sibling or spouse |
| Enter | Open detail panel for selected person |
| Escape | Close detail panel / clear selection |
| + | Zoom in |
| - | Zoom out |
| 0 | Reset zoom to fit entire tree |
| / | Focus search bar |
| F | Set selected person as focus |
| Space | Toggle expand/collapse descendants of selected person |
| E | Expand all siblings at current level |
| C | Collapse all siblings at current level |

## Edge Cases

| Scenario | Expected Behavior |
|----------|-------------------|
| Person with no relationships | Render as isolated node at appropriate generation |
| Couple with children | Horizontal line between parents, vertical line from midpoint to children |
| Couple without children | Simple horizontal connector line between spouses |
| Single parent with children | Vertical line directly from parent to child(ren) |
| Multiple spouses (remarriage) | Render all spouses horizontally adjacent, each couple-unit has own child connections |
| Child with two known parents | Line goes up to midpoint between both parents |
| Child with one known parent | Line goes directly to the known parent |
| Circular relationship (data error) | Detect cycle, log warning, break at detected point |
| Person with null firstName AND lastName | Display "Unknown Person" |
| Person with null birthDate | Show "Unknown" for year, exclude from timeline grouping |
| Very deep tree (20+ generations) | Virtual scrolling, collapse distant generations, fold indicators show deep counts |
| Very wide tree (50+ siblings) | Collapse with "+N more" indicator, expand on click |
| Large tree (10,000 persons) | Most branches collapsed by default, only focused lineage expanded |
| Sibling with 0 descendants | No fold indicator shown, node appears as leaf |
| Sibling with 500+ descendants | Show count as "500+" to avoid layout shifts |
| Expanding multiple siblings | Each expands independently, layout recalculates smoothly |
| All siblings expanded at once | May cause horizontal overflow, show scroll hint |
| Focused person is deeply nested | Auto-expand ancestor path to show focus clearly |
| Empty tree (no persons) | Show empty state with "Add first person" CTA |
| Single person tree | Render centered with "Add family member" prompt |
| Slow network | Show loading skeleton, progressive rendering |
| Touch and mouse simultaneously | Prioritize most recent input type |
| Zoom beyond limits | Clamp to min/max with subtle bounce animation |
| Browser without WebGL | Fall back to Canvas 2D (Pixi.js handles automatically) |
| Search with no results | Display "No persons found" message |
| Very long person name | Truncate with ellipsis based on LOD |
| Person with no photos | Show placeholder avatar (gender-based color with initials) |
| Primary photo loading slow | Show placeholder while loading, fade in when ready |
| Many persons with photos | Lazy load photos as nodes come into view |

## Accessibility Considerations

### Screen Reader Support
- Main canvas has `role="application"` with `aria-label="Family tree viewer"`
- On node focus, announce: "[Name], born [year], died [year], has [N] children"
- Live region announces search result count
- Provide alternative list view toggle for full screen reader accessibility

### Reduced Motion
```typescript
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const animationDuration = prefersReducedMotion ? 0 : 300;
```

### Color Contrast
- All text meets WCAG AA contrast ratio (4.5:1)
- Gender colors have sufficient contrast against backgrounds
- Selected/focused states use borders, not just color changes

## Security Considerations

- All person names displayed are HTML-escaped to prevent XSS
- Photo URLs validated as proper URLs before rendering
- Search input sanitized before processing
- No sensitive data exposed in client-side state

## Performance Optimization Strategies

1. **Sibling Folding**: Primary strategy for 10,000 person trees - most descendants hidden by default
2. **Viewport Culling**: Only create Pixi sprites for nodes in viewport + 200px buffer
3. **Object Pooling**: Reuse sprite objects when nodes enter/leave viewport
4. **Texture Atlasing**: Single sprite sheet for node backgrounds and icons
5. **Debounced Layout**: Recalculate layout only on zoom end, not during gesture
6. **Web Worker**: Calculate layout in worker thread for trees > 500 persons
7. **Request Animation Frame**: All rendering updates batched to 60fps
8. **Lazy Descendant Counting**: Calculate descendant counts only when needed (on first expand attempt)
9. **Incremental Layout**: When expanding a branch, only recalculate affected subtree positions

## Out of Scope

- Printing/export to PDF
- Real-time collaboration (multi-user editing)
- Custom theme colors
- Drag-and-drop to reorder/reparent persons
- Undo/redo for changes
- Offline support / PWA
- Birthplace geocoding and map view
- Timeline view (horizontal time-based layout)
- DNA/genetic relationship visualization
- Import from GEDCOM format
- Animated tree growth visualization
- Photo cropping/editing in tree view (done in detail panel)

## Open Questions

- [ ] Should focus mode and expanded node states persist in URL for shareable links?
- [ ] How to display half-siblings (same one parent, different other parent)?
- [ ] Should we support landscape orientation lock on mobile for better viewing?
- [ ] Is fuzzy search sufficient or do we need phonetic matching (Soundex) for names?
- [ ] Should there be a "fit to screen" button that auto-zooms to show all persons?
- [ ] Should fold state be persisted across sessions (localStorage)?
- [ ] What's the ideal animation for expanding/collapsing branches?
- [ ] Should there be a "expand all" / "collapse all" global toggle?

## Implementation Phases

### Phase 1: Core Rendering (MVP) ✅ DONE
- [x] Set up Pixi.js in TreeCanvas component
- [x] Implement basic layered layout algorithm (Sugiyama-style)
- [x] Render nodes with names and gender colors
- [x] Mouse pan (drag) and zoom (scroll wheel)
- [x] Click to select person with detail panel
- [x] Relationship highlighting (parents green, children orange)
- [x] Zoom controls (+, -, reset)
- [x] Fullscreen mode
- [x] Clickable parent/child lists in detail panel

### Phase 2: Mobile & Touch
- Pinch-to-zoom gesture
- Two-finger pan gesture
- Touch-optimized node sizes
- Responsive container sizing

### Phase 2.5: Sibling Folding (Large Tree Support)
- Descendant counting for each node
- Fold indicator rendering (▶/▼ with count)
- Click handler for expand/collapse toggle
- Animated transitions for fold state changes
- State management for expanded nodes
- Automatic expansion of focused lineage
- Keyboard shortcuts (Space, E, C)

### Phase 3: Level of Detail
- LOD manager based on zoom thresholds
- Three detail levels implemented
- Century/decade timeline indicators
- Performance optimization (culling)

### Phase 4: Navigation Features
- Mini-map component (toggleable)
- Search bar with fuzzy matching
- Focus mode implementation
- Keyboard navigation

### Phase 5: Polish & Accessibility
- ARIA labels and screen reader support
- Animation and smooth transitions
- Reduced motion support
- Performance profiling and final optimization
- List view alternative

## Related

- **Depends on:** Create Tree (#6), Domain Entities (#3), PersonPhoto entity
- **Blocks:** Edit Person (inline from detail panel), Add Relationship
- **See also:** v0.1 Implementation Plan, `person-photos.md` spec for photo management APIs
