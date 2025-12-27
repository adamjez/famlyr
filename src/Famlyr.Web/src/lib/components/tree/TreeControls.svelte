<script lang="ts">
    import { treeViewState } from '$lib/stores/treeView.svelte';

    let controlsElement: HTMLDivElement;
    let isFullscreen = $state(false);

    function zoomIn() {
        const current = treeViewState.viewport.zoom;
        treeViewState.zoom(current * 1.2);
    }

    function zoomOut() {
        const current = treeViewState.viewport.zoom;
        treeViewState.zoom(current / 1.2);
    }

    function resetView() {
        treeViewState.resetViewport();
    }

    async function toggleFullscreen() {
        const viewer = controlsElement?.closest('.tree-viewer');
        if (!viewer) return;

        if (!document.fullscreenElement) {
            await viewer.requestFullscreen();
            isFullscreen = true;
        } else {
            await document.exitFullscreen();
            isFullscreen = false;
        }
    }

    function handleFullscreenChange() {
        isFullscreen = !!document.fullscreenElement;
    }
</script>

<svelte:document onfullscreenchange={handleFullscreenChange} />

<div class="tree-controls" bind:this={controlsElement}>
    <button class="control-btn" onclick={zoomIn} aria-label="Zoom in">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    </button>

    <button class="control-btn" onclick={zoomOut} aria-label="Zoom out">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
        </svg>
    </button>

    <button class="control-btn" onclick={resetView} aria-label="Reset view">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
        </svg>
    </button>

    <button class="control-btn" onclick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
        {#if isFullscreen}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3v3a2 2 0 0 1-2 2H3" />
                <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
                <path d="M3 16h3a2 2 0 0 1 2 2v3" />
                <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
            </svg>
        {:else}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M8 3H5a2 2 0 0 0-2 2v3" />
                <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
                <path d="M3 16v3a2 2 0 0 0 2 2h3" />
                <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
        {/if}
    </button>
</div>

<style>
    .tree-controls {
        position: absolute;
        bottom: 16px;
        right: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 10;
    }

    .control-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: 8px;
        background-color: white;
        border: 1px solid var(--color-neutral-300);
        color: var(--color-neutral-700);
        cursor: pointer;
        transition: all 150ms;
        box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    }

    .control-btn:hover {
        background-color: var(--color-neutral-50);
        border-color: var(--color-primary-300);
        color: var(--color-primary-600);
    }

    .control-btn:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
    }
</style>
