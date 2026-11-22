<script lang="ts">
    import TreeCanvas from './TreeCanvas.svelte';
    import TreeControls from './TreeControls.svelte';
    import TreeSearch from './TreeSearch.svelte';
    import TreeMiniMap from './TreeMiniMap.svelte';
    import TreeBranchNavigator from './TreeBranchNavigator.svelte';
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
    let showMiniMap = $state(true);
    let showMobileMiniMap = $state(false);
    let showMobileBranches = $state(false);


    function handleFocus(personId: string) {
        canvasRef?.setFocusPerson(personId);
    }

    function handleToggleFold(personId: string) {
        canvasRef?.toggleFold(personId);
    }

    function handleShowWholeTree() {
        canvasRef?.showWholeTree();
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

    <TreeBranchNavigator
        {tree}
        mobileOpen={showMobileBranches}
        onClose={() => (showMobileBranches = false)}
        onSelect={handleFocus}
    />

    <TreeControls onShowWholeTree={handleShowWholeTree} />

    {#if showMiniMap || showMobileMiniMap}
        <TreeMiniMap
            mobileOpen={showMobileMiniMap}
            onClose={() => {
                showMiniMap = false;
                showMobileMiniMap = false;
            }}
        />
    {/if}

    {#if !showMiniMap}
        <button
            class="mini-map-toggle"
            type="button"
            aria-label="Show mini-map"
            onclick={() => (showMiniMap = true)}
        >
            Map
        </button>
    {/if}

    {#if !showMobileMiniMap && !showMobileBranches}
        <div class="mobile-navigation-buttons">
            <button
                class="mobile-mini-map-toggle"
                type="button"
                aria-label="Show mini-map"
                aria-expanded={showMobileMiniMap}
                onclick={() => {
                    showMobileBranches = false;
                    showMobileMiniMap = true;
                }}
            >
                Map
            </button>
            <button
                class="mobile-branches-toggle"
                type="button"
                aria-label="Show family branches"
                aria-expanded={showMobileBranches}
                onclick={() => {
                    showMobileMiniMap = false;
                    showMobileBranches = true;
                }}
            >
                Branches
            </button>
        </div>
    {/if}

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

    .mini-map-toggle {
        position: absolute;
        right: 64px;
        bottom: 16px;
        z-index: 11;
        height: 40px;
        padding: 0 12px;
        border: 1px solid var(--color-neutral-300);
        border-radius: 8px;
        background: white;
        color: var(--color-neutral-700);
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
        cursor: pointer;
    }

    .mini-map-toggle:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
    }

    .mobile-mini-map-toggle {
        display: none;
    }

    .mobile-branches-toggle {
        display: none;
    }

    .mobile-navigation-buttons {
        display: none;
    }

    @media (max-width: 639px) {
        .mini-map-toggle {
            display: none;
        }

        .mobile-navigation-buttons {
            position: absolute;
            left: 16px;
            bottom: 16px;
            z-index: 12;
            display: flex;
            gap: 8px;
        }

        .mobile-mini-map-toggle,
        .mobile-branches-toggle {
            display: block;
            height: 40px;
            padding: 0 12px;
            border: 1px solid var(--color-neutral-300);
            border-radius: 8px;
            background: white;
            color: var(--color-neutral-700);
            box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
            cursor: pointer;
        }

        .mobile-mini-map-toggle:focus-visible {
            outline: 2px solid var(--color-primary-500);
            outline-offset: 2px;
        }

        .mobile-branches-toggle:focus-visible {
            outline: 2px solid var(--color-primary-500);
            outline-offset: 2px;
        }
    }
</style>
