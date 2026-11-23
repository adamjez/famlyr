<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import { untrack } from "svelte";
    import type { PageData } from "./$types";
    import type { FamilyTreeDetailModel } from "$lib/types/api";
    import { showToast } from "$lib/stores/toast.svelte";
    import TreeFormPanel from "$lib/components/TreeFormPanel.svelte";
    import { t } from "$lib/i18n.svelte";
    import { FAMILY_TREE_PAGE_SIZE, getFamilyTrees } from "$lib/api/familyTree";

    let { data }: { data: PageData } = $props();

    let showCreateTree = $state(false);
    let trees = $state(untrack(() => data.trees));
    let hasMore = $state(untrack(() => data.hasMore));
    let nextSkip = $state(untrack(() => data.trees.length));
    let loadingMore = $state(false);
    let loadError = $state(false);
    let sentinel = $state<HTMLDivElement | undefined>(undefined);

    $effect(() => {
        if (!hasMore || loadingMore || loadError || !sentinel) {
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((entry) => entry.isIntersecting)) {
                    void loadMoreTrees();
                }
            },
            { rootMargin: "300px" }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    });

    async function loadMoreTrees() {
        if (loadingMore || !hasMore) {
            return;
        }

        loadingMore = true;
        loadError = false;
        try {
            const response = await getFamilyTrees(nextSkip, FAMILY_TREE_PAGE_SIZE);
            const existingIds = new Set(trees.map((tree) => tree.id));
            trees = [...trees, ...response.trees.filter((tree) => !existingIds.has(tree.id))];
            nextSkip += response.trees.length;
            hasMore = response.hasMore;
        } catch {
            loadError = true;
        } finally {
            loadingMore = false;
        }
    }

    async function handleTreeCreated(tree: FamilyTreeDetailModel) {
        showCreateTree = false;
        showToast(t('treeCreated'));
        goto(`/trees/${tree.id}`);
    }
</script>

<svelte:head>
    <title>{t('familyTrees')} - Famlyr</title>
</svelte:head>

<div class="space-y-8">
    <div class="flex items-center justify-between">
        <h1>{t('familyTrees')}</h1>
        <button class="btn btn-primary" onclick={() => showCreateTree = true}>
            {t('createTree')}
        </button>
    </div>

    {#if trees.length === 0}
        <div class="card text-center py-12">
            <p class="text-neutral-500">{t('noFamilyTrees')}</p>
            <button class="btn btn-primary mt-4" onclick={() => showCreateTree = true}>
                {t('createYourFirstTree')}
            </button>
        </div>
    {:else}
        <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each trees as tree (tree.id)}
                <a href="/trees/{tree.id}" class="card-interactive block">
                    <h2 class="text-lg font-semibold text-neutral-900">{tree.name}</h2>
                    {#if tree.description}
                        <p class="mt-2 text-sm text-neutral-600 line-clamp-2">{tree.description}</p>
                    {/if}
                    <p class="mt-3 text-sm text-neutral-500">
                        {tree.personCount} {tree.personCount === 1 ? t('person') : t('persons')}
                    </p>
                </a>
            {/each}
        </div>

        {#if hasMore}
            <div class="py-4 text-center">
                {#if loadError}
                    <p class="mb-3 text-sm text-red-600" role="alert">{t('failedToLoadTrees')}</p>
                    <button class="btn btn-secondary" onclick={loadMoreTrees}>{t('retry')}</button>
                {:else if loadingMore}
                    <p class="text-sm text-neutral-500" role="status">{t('loadingMoreTrees')}</p>
                {:else}
                    <button class="btn btn-secondary" onclick={loadMoreTrees}>{t('loadMoreTrees')}</button>
                {/if}
                <div bind:this={sentinel} aria-hidden="true" class="h-px"></div>
            </div>
        {/if}
    {/if}
</div>

<!-- Tree Form Panel (Create) -->
{#if showCreateTree}
    <TreeFormPanel
        onClose={() => showCreateTree = false}
        onSave={handleTreeCreated}
    />
{/if}
