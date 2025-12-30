<script lang="ts">
    import { browser } from '$app/environment';
    import { page } from '$app/stores';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let TreeViewer: typeof import('$lib/components/tree/TreeViewer.svelte').default | null = $state(null);

    const focusPersonId = $derived($page.url.searchParams.get('focus'));

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
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-neutral-500">
        <a href="/" class="hover:text-primary-600 transition-colors">Family Trees</a>
        <span>/</span>
        <a href="/trees/{data.tree.id}" class="hover:text-primary-600 transition-colors">{data.tree.name}</a>
        <span>/</span>
        <span class="text-neutral-900">Tree View</span>
    </nav>

    <header class="flex items-center justify-between">
        <div>
            <h1 class="text-2xl font-semibold text-neutral-900">{data.tree.name}</h1>
            {#if data.tree.description}
                <p class="mt-1 text-neutral-600">{data.tree.description}</p>
            {/if}
        </div>
        <a href="/trees/{data.tree.id}" class="btn btn-secondary">Back to Details</a>
    </header>

    {#if TreeViewer}
        <TreeViewer tree={data.tree} initialFocusPersonId={focusPersonId} />
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
