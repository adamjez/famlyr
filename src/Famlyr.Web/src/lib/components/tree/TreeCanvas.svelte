<script lang="ts">
    import { onMount, onDestroy, untrack } from 'svelte';
    import { TreeRenderer } from '$lib/services/tree/treeRenderer';
    import {
        calculateLayout,
        createTreeGraphIndex,
        createTreeOverviewLayout,
        getFocusLineageIds,
        type TreeGraphIndex
    } from '$lib/services/tree/layoutEngine';
    import { treeViewState } from '$lib/stores/treeView.svelte';
    import { createGestureHandler } from '$lib/services/tree/gestureHandler';
    import { getLODLevel, type LODLevel } from '$lib/types/tree';
    import type { FamilyTreeModel } from '$lib/types/api';
    import type { TreeLayout } from '$lib/types/tree';

    interface Props {
        tree: FamilyTreeModel;
        initialFocusPersonId?: string | null;
    }

    let { tree, initialFocusPersonId = null }: Props = $props();

    let canvasElement: HTMLCanvasElement;
    let containerElement: HTMLDivElement;
    let renderer: TreeRenderer | null = null;
    let graphIndex: TreeGraphIndex | null = null;
    let resizeObserver: ResizeObserver | null = null;

    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let currentLOD: LODLevel = 3;
    const COARSE_FULL_TREE_LIMIT = 1_000;

    function findViewportCenterNodeId(layout: TreeLayout, x: number, y: number, zoom: number): string | null {
        const centerX = -x / zoom;
        const centerY = -y / zoom;
        let closestId: string | null = null;
        let closestDistance = Infinity;

        for (const node of layout.nodes.values()) {
            if (!node.isVisible) continue;

            const distance = Math.hypot(
                node.position.x + node.width / 2 - centerX,
                node.position.y + node.height / 2 - centerY
            );
            if (distance < closestDistance) {
                closestId = node.id;
                closestDistance = distance;
            }
        }

        return closestId;
    }

    function recalculateLayout(newExpandedNodeIds?: Set<string>, forceRecalc = false) {
        const currentTree = treeViewState.tree;
        const focusId = treeViewState.focusedPersonId;
        const expandedIds = newExpandedNodeIds ?? treeViewState.expandedNodeIds;
        const currentGraphIndex = graphIndex;
        const newLOD = getLODLevel(treeViewState.viewport.zoom);

        if (!currentTree || !renderer || !currentGraphIndex) {
            return;
        }

        // Only recalculate if LOD changed or forced
        if (newLOD !== currentLOD || forceRecalc || newExpandedNodeIds) {
            const nextIsCompactOverview = !focusId
                && currentTree.persons.length > COARSE_FULL_TREE_LIMIT
                && newLOD === 1;
            const viewport = treeViewState.viewport;
            const anchorId = newLOD !== currentLOD && treeViewState.layout
                ? untrack(() => findViewportCenterNodeId(
                    treeViewState.layout!,
                    viewport.x,
                    viewport.y,
                    viewport.zoom
                ))
                : null;
            currentLOD = newLOD;

            const layout = untrack(() => {
                const calculatedLayout = calculateLayout(currentTree, focusId, {
                    expandedNodeIds: expandedIds,
                    lod: currentLOD,
                    graphIndex: currentGraphIndex
                });
                return nextIsCompactOverview
                    ? createTreeOverviewLayout(calculatedLayout)
                    : calculatedLayout;
            });

            treeViewState.setLayout(layout);
            const anchor = anchorId ? layout.nodes.get(anchorId) : null;
            if (anchor?.isVisible) {
                treeViewState.setViewport({
                    x: -(anchor.position.x + anchor.width / 2) * viewport.zoom,
                    y: -(anchor.position.y + anchor.height / 2) * viewport.zoom
                });
            }
            renderer.setLOD(currentLOD);
            renderer.render(layout, treeViewState.viewport);
        }

        renderer.updateViewport(treeViewState.viewport);
    }

    function handleFoldToggle(nodeId: string) {
        const currentIds = Array.from(treeViewState.expandedNodeIds);
        const wasExpanded = currentIds.includes(nodeId);

        let newIds: string[];
        if (wasExpanded) {
            newIds = currentIds.filter(id => id !== nodeId);
        } else {
            newIds = [...currentIds, nodeId];
        }

        const newSet = new Set(newIds);
        treeViewState.resetFoldState(newIds);
        recalculateLayout(newSet);
    }

    export function setFocusPerson(personId: string) {
        treeViewState.setFocusPerson(personId);
        recalculateLayout(new Set(), true);
        treeViewState.zoomToFocusedPerson();
    }

    export function toggleFold(nodeId: string) {
        handleFoldToggle(nodeId);
    }

    export function showWholeTree() {
        treeViewState.setFocusPerson(null);
        treeViewState.selectPerson(null);
        treeViewState.resetFoldState([]);
        recalculateLayout(new Set(), true);
        treeViewState.fitToScreen();
        renderer?.updateViewport(treeViewState.viewport);
    }

    const gestureHandler = createGestureHandler({
        onPan: (deltaX, deltaY) => {
            treeViewState.pan(deltaX, deltaY);
        },
        onZoom: (newZoom, centerX, centerY) => {
            treeViewState.zoom(newZoom, centerX, centerY);
        }
    });

    onMount(async () => {
        if (!canvasElement || !containerElement) return;

        const width = containerElement.clientWidth;
        const height = containerElement.clientHeight;

        treeViewState.setViewport({ width, height });
        graphIndex = createTreeGraphIndex(tree);

        // Only set focus if explicitly provided via URL parameter
        if (initialFocusPersonId) {
            treeViewState.setFocusPerson(initialFocusPersonId);
        }
        treeViewState.setTree(tree);

        // Calculate initial layout (focusId may be null to show all persons)
        const focusLineageIds = initialFocusPersonId
            ? getFocusLineageIds(tree, initialFocusPersonId, graphIndex)
            : [];
        const initialExpandedSet = new Set(focusLineageIds);
        treeViewState.resetFoldState(focusLineageIds);
        currentLOD = !initialFocusPersonId && tree.persons.length > COARSE_FULL_TREE_LIMIT
            ? 1
            : getLODLevel(treeViewState.viewport.zoom);

        const useCompactOverview = !initialFocusPersonId
            && tree.persons.length > COARSE_FULL_TREE_LIMIT
            && currentLOD === 1;
        let layout = calculateLayout(tree, initialFocusPersonId ?? null, {
            expandedNodeIds: initialExpandedSet,
            lod: currentLOD,
            graphIndex
        });
        if (useCompactOverview) {
            layout = createTreeOverviewLayout(layout);
        }
        treeViewState.setLayout(layout);
        treeViewState.fitToScreen();

        const fittedLOD = getLODLevel(treeViewState.viewport.zoom);
        if (fittedLOD !== currentLOD) {
            currentLOD = fittedLOD;
            layout = calculateLayout(tree, initialFocusPersonId ?? null, {
                expandedNodeIds: initialExpandedSet,
                lod: currentLOD,
                graphIndex
            });
            treeViewState.setLayout(layout);
        }

        renderer = new TreeRenderer({
            onNodeClick: (nodeId) => {
                treeViewState.selectPerson(nodeId);
            },
            onFoldToggle: (nodeId) => {
                handleFoldToggle(nodeId);
            }
        });
        renderer.setLOD(currentLOD);

        await renderer.initialize(canvasElement, width, height);

        renderer.render(layout, treeViewState.viewport);

        resizeObserver = new ResizeObserver((entries) => {
            const entry = entries[0];
            if (entry) {
                const { width, height } = entry.contentRect;
                treeViewState.setViewport({ width, height });
                renderer?.resize(width, height);
                renderer?.updateViewport(treeViewState.viewport);
            }
        });
        resizeObserver.observe(containerElement);

        // Register touch events with passive: false to allow preventDefault()
        containerElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        containerElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        containerElement.addEventListener('touchend', handleTouchEnd);
        containerElement.addEventListener('touchcancel', handleTouchEnd);
    });

    onDestroy(() => {
        resizeObserver?.disconnect();
        containerElement?.removeEventListener('touchstart', handleTouchStart);
        containerElement?.removeEventListener('touchmove', handleTouchMove);
        containerElement?.removeEventListener('touchend', handleTouchEnd);
        containerElement?.removeEventListener('touchcancel', handleTouchEnd);
        renderer?.destroy();
        renderer = null;
    });

    $effect(() => {
        const selectedId = treeViewState.selectedPersonId;
        renderer?.updateSelection(selectedId);
    });

    $effect(() => {
        const viewport = treeViewState.viewport;
        const newLOD = getLODLevel(viewport.zoom);

        // Check if LOD changed and needs recalculation
        if (newLOD !== currentLOD && renderer) {
            recalculateLayout(undefined, false);
        } else {
            renderer?.updateViewport(viewport);
        }
    });

    function handleWheel(event: WheelEvent) {
        event.preventDefault();

        const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = treeViewState.viewport.zoom * zoomDelta;

        const rect = containerElement.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;

        treeViewState.zoom(newZoom, cursorX, cursorY);
    }

    function handlePointerDown(event: PointerEvent) {
        if (event.target === canvasElement) {
            isDragging = true;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            containerElement.setPointerCapture(event.pointerId);
        }
    }

    function handlePointerMove(event: PointerEvent) {
        if (!isDragging) return;

        const deltaX = event.clientX - lastPointerX;
        const deltaY = event.clientY - lastPointerY;

        treeViewState.pan(deltaX, deltaY);

        lastPointerX = event.clientX;
        lastPointerY = event.clientY;
    }

    function handlePointerUp(event: PointerEvent) {
        if (isDragging) {
            isDragging = false;
            containerElement.releasePointerCapture(event.pointerId);
        }
    }

    function handleCanvasClick(event: MouseEvent) {
        if (event.target === canvasElement) {
            treeViewState.selectPerson(null);
        }
    }

    function handleTouchStart(event: TouchEvent) {
        if (event.touches.length >= 2) {
            event.preventDefault();
        }
        const rect = containerElement.getBoundingClientRect();
        gestureHandler.handleTouchStart(event, treeViewState.viewport.zoom, rect);
    }

    function handleTouchMove(event: TouchEvent) {
        event.preventDefault();
        const rect = containerElement.getBoundingClientRect();
        gestureHandler.handleTouchMove(event, rect);
    }

    function handleTouchEnd(event: TouchEvent) {
        gestureHandler.handleTouchEnd(event, treeViewState.viewport.zoom);
    }

    function handleKeyDown(event: KeyboardEvent) {
        const selectedId = treeViewState.selectedPersonId;
        const selectedNode = treeViewState.selectedNode;

        switch (event.key) {
            case ' ':
                event.preventDefault();
                if (selectedId && selectedNode?.descendantCount && selectedNode.descendantCount > 0) {
                    handleFoldToggle(selectedId);
                }
                break;
            case 'e':
            case 'E':
                if (selectedNode) {
                    treeViewState.expandAllAtLayer(selectedNode.layer);
                    recalculateLayout(treeViewState.expandedNodeIds);
                }
                break;
            case 'c':
            case 'C':
                if (selectedNode) {
                    treeViewState.collapseAllAtLayer(selectedNode.layer);
                    recalculateLayout(treeViewState.expandedNodeIds);
                }
                break;
            case 'f':
            case 'F':
                if (selectedId) {
                    setFocusPerson(selectedId);
                }
                break;
        }
    }
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
    bind:this={containerElement}
    class="tree-canvas-container"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onclick={handleCanvasClick}
    onkeydown={handleKeyDown}
    tabindex="0"
    role="application"
    aria-label="Family tree viewer"
>
    <canvas
        bind:this={canvasElement}
        onwheel={handleWheel}
    ></canvas>
</div>

<style>
    .tree-canvas-container {
        width: 100%;
        height: 100%;
        position: relative;
        overflow: hidden;
        touch-action: none;
        cursor: grab;
    }

    .tree-canvas-container:active {
        cursor: grabbing;
    }

    .tree-canvas-container:focus {
        outline: 2px solid #4a90d9;
        outline-offset: -2px;
    }

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
