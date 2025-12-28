<script lang="ts">
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Family Trees - Famlyr</title>
</svelte:head>

<div class="space-y-8">
    <h1>Family Trees</h1>

    {#if data.trees.length === 0}
        <div class="card text-center py-12">
            <p class="text-neutral-500">No family trees yet.</p>
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
