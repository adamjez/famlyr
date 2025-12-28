<script lang="ts">
    import TreeCanvas from './TreeCanvas.svelte';
    import TreeControls from './TreeControls.svelte';
    import PersonDetailPanel from './PersonDetailPanel.svelte';
    import { treeViewState } from '$lib/stores/treeView.svelte';
    import type { FamilyTreeModel } from '$lib/types/api';

    interface Props {
        tree: FamilyTreeModel;
        focusPersonId?: string | null;
    }

    let { tree, focusPersonId = null }: Props = $props();

    let hasInitialFocus = $state(false);

    $effect(() => {
        if (focusPersonId && treeViewState.layout && !hasInitialFocus) {
            hasInitialFocus = true;
            // Use setTimeout to ensure the layout is fully rendered
            setTimeout(() => {
                treeViewState.selectPerson(focusPersonId);
            }, 100);
        }
    });
</script>

<div class="tree-viewer">
    <div class="tree-viewport">
        <TreeCanvas {tree} />
    </div>

    <TreeControls />

    {#if treeViewState.selectedPerson && treeViewState.selectedNode}
        <PersonDetailPanel
            person={treeViewState.selectedPerson}
            node={treeViewState.selectedNode}
            {tree}
            onClose={() => treeViewState.selectPerson(null)}
        />
    {/if}
</div>

<style>
    .tree-viewer {
        position: relative;
        width: 100%;
        height: 600px;
        border-radius: 0.75rem;
        overflow: hidden;
        border: 1px solid var(--color-neutral-200);
        background-color: var(--color-neutral-50);
    }

    .tree-viewer:fullscreen {
        height: 100vh;
        width: 100vw;
        border-radius: 0;
        border: none;
    }

    .tree-viewport {
        width: 100%;
        height: 100%;
    }
</style>
