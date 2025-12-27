<script lang="ts">
    import { browser } from '$app/environment';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let TreeViewer: typeof import('$lib/components/tree/TreeViewer.svelte').default | null = $state(null);

    $effect(() => {
        if (browser) {
            import('$lib/components/tree/TreeViewer.svelte').then((module) => {
                TreeViewer = module.default;
            });
        }
    });
</script>

<svelte:head>
    <title>{data.tree.name} - Family Tree | Famlyr</title>
</svelte:head>

<div class="space-y-6">
    <header class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-semibold text-neutral-900">{data.tree.name}</h1>
            {#if data.tree.description}
                <p class="mt-1 text-neutral-600">{data.tree.description}</p>
            {/if}
        </div>
        <a href="/" class="btn btn-secondary">Back to Home</a>
    </header>

    {#if TreeViewer}
        <TreeViewer tree={data.tree} />
    {:else}
        <div class="tree-loading">
            <p>Loading tree viewer...</p>
        </div>
    {/if}
</div>

<style>
    .tree-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 600px;
        background-color: var(--color-neutral-50);
        border: 1px solid var(--color-neutral-200);
        border-radius: 0.75rem;
        color: var(--color-neutral-500);
    }
</style>
