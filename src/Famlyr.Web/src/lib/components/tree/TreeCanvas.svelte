<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { TreeRenderer } from '$lib/services/tree/treeRenderer';
    import { calculateLayout, getFocusLineageIds } from '$lib/services/tree/layoutEngine';
    import { treeViewState } from '$lib/stores/treeView.svelte';
    import { createGestureHandler } from '$lib/services/tree/gestureHandler';
    import type { FamilyTreeModel } from '$lib/types/api';

    interface Props {
        tree: FamilyTreeModel;
    }

    let { tree }: Props = $props();

    let canvasElement: HTMLCanvasElement;
    let containerElement: HTMLDivElement;
    let renderer: TreeRenderer | null = null;
    let resizeObserver: ResizeObserver | null = null;

    let isDragging = false;
    let lastPointerX = 0;
    let lastPointerY = 0;

    function recalculateLayout(newExpandedNodeIds?: Set<string>) {
        const currentTree = treeViewState.tree;
        const focusId = treeViewState.focusedPersonId;
        const expandedIds = newExpandedNodeIds ?? treeViewState.expandedNodeIds;

        if (!currentTree || !focusId || !renderer) {
            return;
        }

        const layout = calculateLayout(currentTree, focusId, {
            expandedNodeIds: expandedIds
        });

        treeViewState.setLayout(layout);
        renderer.render(layout);
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
        recalculateLayout(new Set());
        treeViewState.zoomToFocusedPerson();
    }

    export function toggleFold(nodeId: string) {
        handleFoldToggle(nodeId);
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

        treeViewState.setTree(tree);
        treeViewState.setViewport({ width, height });

        const focusId = treeViewState.focusedPersonId ?? tree.persons[0]?.id;
        if (focusId) {
            const focusLineageIds = getFocusLineageIds(tree, focusId);
            const initialExpandedSet = new Set(focusLineageIds);
            treeViewState.resetFoldState(focusLineageIds);

            const layout = calculateLayout(tree, focusId, {
                expandedNodeIds: initialExpandedSet
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

        await renderer.initialize(canvasElement, width, height);

        if (treeViewState.layout) {
            renderer.render(treeViewState.layout);
            treeViewState.fitToScreen();
            renderer.updateViewport(treeViewState.viewport);
        }

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
    });

    onDestroy(() => {
        resizeObserver?.disconnect();
        renderer?.destroy();
        renderer = null;
    });

    $effect(() => {
        const selectedId = treeViewState.selectedPersonId;
        renderer?.updateSelection(selectedId);
    });

    $effect(() => {
        const viewport = treeViewState.viewport;
        renderer?.updateViewport(viewport);
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

<div
    bind:this={containerElement}
    class="tree-canvas-container"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onclick={handleCanvasClick}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    ontouchcancel={handleTouchEnd}
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
