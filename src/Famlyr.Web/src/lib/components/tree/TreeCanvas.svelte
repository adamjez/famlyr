<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { TreeRenderer } from '$lib/services/tree/treeRenderer';
    import { calculateLayout } from '$lib/services/tree/layoutEngine';
    import { treeViewState } from '$lib/stores/treeView.svelte';
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

    onMount(async () => {
        if (!canvasElement || !containerElement) return;

        const width = containerElement.clientWidth;
        const height = containerElement.clientHeight;

        treeViewState.setTree(tree);
        treeViewState.setViewport({ width, height });

        const focusId = treeViewState.focusedPersonId ?? tree.persons[0]?.id;
        if (focusId) {
            const layout = calculateLayout(tree, focusId);
            treeViewState.setLayout(layout);
        }

        renderer = new TreeRenderer({
            onNodeClick: (nodeId) => {
                treeViewState.selectPerson(nodeId);
            }
        });

        await renderer.initialize(canvasElement, width, height);

        if (treeViewState.layout) {
            renderer.render(treeViewState.layout);
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
</script>

<div
    bind:this={containerElement}
    class="tree-canvas-container"
    onpointerdown={handlePointerDown}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onclick={handleCanvasClick}
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

    canvas {
        display: block;
        width: 100%;
        height: 100%;
    }
</style>
