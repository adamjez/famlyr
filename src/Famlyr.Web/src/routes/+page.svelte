<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import type { PageData } from "./$types";
    import type { FamilyTreeDetailModel } from "$lib/types/api";
    import { showToast } from "$lib/stores/toast.svelte";
    import TreeFormPanel from "$lib/components/TreeFormPanel.svelte";

    let { data }: { data: PageData } = $props();

    let showCreateTree = $state(false);

    async function handleTreeCreated(tree: FamilyTreeDetailModel) {
        showCreateTree = false;
        showToast('Tree created successfully');
        goto(`/trees/${tree.id}`);
    }
</script>

<svelte:head>
    <title>Family Trees - Famlyr</title>
</svelte:head>

<div class="space-y-8">
    <div class="flex items-center justify-between">
        <h1>Family Trees</h1>
        <button class="btn btn-primary" onclick={() => showCreateTree = true}>
            Create Tree
        </button>
    </div>

    {#if data.trees.length === 0}
        <div class="card text-center py-12">
            <p class="text-neutral-500">No family trees yet.</p>
            <button class="btn btn-primary mt-4" onclick={() => showCreateTree = true}>
                Create Your First Tree
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each data.trees as tree}
                <a href="/trees/{tree.id}" class="card-interactive block">
                    <h2 class="text-lg font-semibold text-neutral-900">{tree.name}</h2>
                    {#if tree.description}
                        <p class="mt-2 text-sm text-neutral-600 line-clamp-2">{tree.description}</p>
                    {/if}
                    <p class="mt-3 text-sm text-neutral-500">
                        {tree.personCount} {tree.personCount === 1 ? 'person' : 'persons'}
                    </p>
                </a>
            {/each}
        </div>
    {/if}
</div>

<!-- Tree Form Panel (Create) -->
{#if showCreateTree}
    <TreeFormPanel
        onClose={() => showCreateTree = false}
        onSave={handleTreeCreated}
    />
{/if}
