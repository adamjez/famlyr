<script lang="ts">
    import { treeViewState } from '$lib/stores/treeView.svelte';

    interface Props {
        onClose: () => void;
        mobileOpen?: boolean;
    }

    let { onClose, mobileOpen = false }: Props = $props();

    let svgElement: SVGSVGElement | undefined = $state();

    const layout = $derived(treeViewState.layout);
    const viewport = $derived(treeViewState.viewport);
    const bounds = $derived(layout?.bounds);
    const focusedPersonId = $derived(treeViewState.focusedPersonId);
    const connectionSegments = $derived.by(() => {
        if (!layout) return [];

        const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];

        for (const familyNode of layout.familyNodes.values()) {
            for (const parentId of familyNode.parentIds) {
                const parent = layout.nodes.get(parentId);
                if (!parent?.isVisible) continue;

                segments.push({
                    x1: parent.position.x + parent.width / 2,
                    y1: parent.position.y + parent.height,
                    x2: familyNode.position.x,
                    y2: familyNode.position.y
                });
            }

            for (const childId of familyNode.childIds) {
                const child = layout.nodes.get(childId);
                if (!child?.isVisible) continue;

                segments.push({
                    x1: familyNode.position.x,
                    y1: familyNode.position.y,
                    x2: child.position.x + child.width / 2,
                    y2: child.position.y
                });
            }
        }

        for (const connection of layout.connections) {
            if (connection.type !== 'spouse') continue;

            const from = layout.nodes.get(connection.fromIds[0]);
            const to = layout.nodes.get(connection.toIds[0]);
            if (!from?.isVisible || !to?.isVisible) continue;

            segments.push({
                x1: from.position.x + from.width,
                y1: from.position.y + from.height / 2,
                x2: to.position.x,
                y2: to.position.y + to.height / 2
            });
        }

        return segments;
    });

    const viewportRect = $derived.by(() => {
        if (!bounds || !viewport.width || !viewport.height) return null;

        return {
            x: -(viewport.width / 2 + viewport.x) / viewport.zoom,
            y: -(viewport.height / 2 + viewport.y) / viewport.zoom,
            width: viewport.width / viewport.zoom,
            height: viewport.height / viewport.zoom
        };
    });

    function handleNavigate(event: MouseEvent) {
        if (!bounds || !svgElement) return;

        const screenMatrix = svgElement.getScreenCTM();
        if (!screenMatrix) return;

        const point = new DOMPoint(event.clientX, event.clientY)
            .matrixTransform(screenMatrix.inverse());

        treeViewState.centerViewport(point.x, point.y);
        if (mobileOpen) onClose();
    }

    function handleKeyboardNavigate(event: KeyboardEvent) {
        if ((event.key !== 'Enter' && event.key !== ' ') || !bounds) return;

        event.preventDefault();
        treeViewState.centerViewport(
            (bounds.minX + bounds.maxX) / 2,
            (bounds.minY + bounds.maxY) / 2
        );
        if (mobileOpen) onClose();
    }
</script>

<aside class="mini-map" class:mini-map-mobile-open={mobileOpen} aria-label="Tree overview">
    <div class="mini-map-header">
        <span>Overview</span>
        <button type="button" class="close-button" aria-label="Hide mini-map" onclick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>

    {#if layout && bounds}
        <svg
            bind:this={svgElement}
            class="mini-map-canvas"
            viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
            role="button"
            tabindex="0"
            aria-label="Navigate to a tree location"
            onclick={handleNavigate}
            onkeydown={handleKeyboardNavigate}
        >
            {#each connectionSegments as segment}
                <line
                    class="mini-map-link"
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                />
            {/each}

            {#each [...layout.nodes.values()].filter(node => node.isVisible) as node}
                <rect
                    class:focused-node={focusedPersonId === node.id}
                    x={node.position.x}
                    y={node.position.y}
                    width={node.width}
                    height={node.height}
                    rx={Math.min(node.height * 0.15, 5)}
                />
            {/each}

            {#if viewportRect}
                <rect
                    class="viewport-indicator"
                    x={viewportRect.x}
                    y={viewportRect.y}
                    width={viewportRect.width}
                    height={viewportRect.height}
                    rx="8"
                />
            {/if}
        </svg>
    {:else}
        <div class="empty-map">Tree overview unavailable</div>
    {/if}
</aside>

<style>
    .mini-map {
        position: absolute;
        left: 16px;
        bottom: 16px;
        z-index: 11;
        width: 180px;
        overflow: hidden;
        border: 1px solid var(--color-neutral-300);
        border-radius: 10px;
        background: rgb(255 255 255 / 0.96);
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
    }

    .mini-map-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 32px;
        padding: 0 6px 0 10px;
        border-bottom: 1px solid var(--color-neutral-200);
        color: var(--color-neutral-700);
        font-size: 12px;
        font-weight: 700;
    }

    .close-button {
        display: grid;
        width: 26px;
        height: 26px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-neutral-500);
        place-items: center;
        cursor: pointer;
    }

    .close-button:hover {
        background: var(--color-neutral-100);
        color: var(--color-neutral-800);
    }

    .close-button:focus-visible,
    .mini-map-canvas:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: -2px;
    }

    .mini-map-canvas {
        display: block;
        width: 180px;
        height: 120px;
        background: var(--color-neutral-50);
        cursor: crosshair;
    }

    rect {
        fill: var(--color-primary-300);
        opacity: 0.75;
    }

    .mini-map-link {
        stroke: var(--color-neutral-400);
        stroke-width: 2;
        vector-effect: non-scaling-stroke;
        opacity: 0.8;
    }

    rect.focused-node {
        fill: var(--color-primary-600);
        opacity: 1;
        stroke: var(--color-primary-900);
        stroke-width: 3;
    }

    rect.viewport-indicator {
        fill: none;
        stroke: var(--color-primary-600);
        stroke-width: 6;
        vector-effect: non-scaling-stroke;
        opacity: 0.9;
        pointer-events: none;
    }

    .empty-map {
        display: grid;
        height: 120px;
        color: var(--color-neutral-500);
        font-size: 12px;
        place-items: center;
    }

    @media (max-width: 639px) {
        .mini-map {
            display: none;
        }

        .mini-map.mini-map-mobile-open {
            inset: 8px;
            display: flex;
            width: auto;
            height: auto;
            flex-direction: column;
            z-index: 20;
        }

        .mini-map-mobile-open .mini-map-canvas {
            width: 100%;
            height: 100%;
            min-height: 0;
            flex: 1;
            touch-action: manipulation;
        }
    }

    @media (prefers-reduced-motion: reduce) {
        .mini-map {
            transition: none;
        }
    }
</style>
