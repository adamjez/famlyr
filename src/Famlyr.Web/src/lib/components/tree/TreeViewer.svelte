<script lang="ts">
    import TreeCanvas from './TreeCanvas.svelte';
    import TreeControls from './TreeControls.svelte';
    import TreeSearch from './TreeSearch.svelte';
    import PersonDetailPanel from './PersonDetailPanel.svelte';
    import { treeViewState } from '$lib/stores/treeView.svelte';
    import type { FamilyTreeModel, PersonModel } from '$lib/types/api';

    interface Props {
        tree: FamilyTreeModel;
        initialFocusPersonId?: string | null;
    }

    let { tree, initialFocusPersonId = null }: Props = $props();

    let canvasRef: TreeCanvas | null = $state(null);
    let searchRef: TreeSearch | null = $state(null);


    function handleFocus(personId: string) {
        canvasRef?.setFocusPerson(personId);
    }

    function handleToggleFold(personId: string) {
        canvasRef?.toggleFold(personId);
    }

    function handleSearchSelect(person: PersonModel) {
        canvasRef?.setFocusPerson(person.id);
        treeViewState.selectPerson(person.id);
    }

    function handleGlobalKeydown(event: KeyboardEvent) {
        if (
            event.target instanceof HTMLInputElement ||
            event.target instanceof HTMLTextAreaElement
        ) {
            return;
        }

        if (event.key === '/') {
            event.preventDefault();
            searchRef?.focus();
        }
    }
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="tree-viewer">
    <div class="tree-viewport">
        <TreeCanvas bind:this={canvasRef} {tree} {initialFocusPersonId} />
    </div>

    <TreeSearch
        bind:this={searchRef}
        persons={tree.persons}
        onSelect={handleSearchSelect}
    />

    <TreeControls />

    {#if treeViewState.selectedPerson && treeViewState.selectedNode}
        <PersonDetailPanel
            person={treeViewState.selectedPerson}
            node={treeViewState.selectedNode}
            {tree}
            onClose={() => treeViewState.selectPerson(null)}
            onFocus={handleFocus}
            onToggleFold={handleToggleFold}
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
