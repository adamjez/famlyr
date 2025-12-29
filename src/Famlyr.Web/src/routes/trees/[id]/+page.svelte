<script lang="ts">
    import { goto, invalidateAll } from "$app/navigation";
    import type { PageData } from "./$types";
    import type { PersonModel, PersonDetailModel } from "$lib/types/api";
    import { getPerson } from "$lib/api/persons";
    import { deleteFamilyTree } from "$lib/api/familyTree";
    import { showToast } from "$lib/stores/toast.svelte";
    import PersonDetailPanel from "$lib/components/PersonDetailPanel.svelte";
    import PersonFormPanel from "$lib/components/PersonFormPanel.svelte";
    import TreeFormPanel from "$lib/components/TreeFormPanel.svelte";
    import ConfirmDialog from "$lib/components/ConfirmDialog.svelte";
    import TreeSearch from "$lib/components/tree/TreeSearch.svelte";

    let { data }: { data: PageData } = $props();

    let selectedPerson: PersonModel | null = $state(null);
    let editingPerson: PersonDetailModel | null = $state(null);
    let showAddPerson = $state(false);
    let showEditTree = $state(false);
    let showDeleteConfirm = $state(false);
    let isDeleting = $state(false);
    let searchRef: TreeSearch | null = $state(null);

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
        });
    }

    function formatYearRange(): string {
        if (!data.tree.yearRange) return "Unknown";
        const { start, end } = data.tree.yearRange;
        return start === end ? `${start}` : `${start} - ${end}`;
    }

    function formatPersonName(person: PersonModel): string {
        const first = person.firstName ?? "Unknown";
        const last = person.lastName ?? "";
        return `${first} ${last}`.trim();
    }

    function getPersonYears(person: PersonModel): string {
        const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : "?";
        const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
        if (death) {
            return `${birth} - ${death}`;
        }
        return `b. ${birth}`;
    }

    function getInitials(person: PersonModel): string {
        const first = person.firstName?.[0] ?? '';
        const last = person.lastName?.[0] ?? '';
        return (first + last).toUpperCase() || '?';
    }

    function selectPerson(person: PersonModel) {
        selectedPerson = person;
    }

    function closePanel() {
        selectedPerson = null;
    }

    function openAddPerson() {
        showAddPerson = true;
    }

    function closeFormPanel() {
        showAddPerson = false;
        editingPerson = null;
    }

    async function openEditPerson() {
        if (!selectedPerson) return;
        const personDetail = await getPerson(data.tree.id, selectedPerson.id);
        editingPerson = personDetail;
        selectedPerson = null;
    }

    async function handlePersonSaved() {
        const isEdit = !!editingPerson;
        closeFormPanel();
        await invalidateAll();
        showToast(isEdit ? 'Person updated successfully' : 'Person added successfully');
    }

    function handleSearchSelect(person: PersonModel) {
        selectedPerson = person;
    }

    async function handleTreeSaved() {
        showEditTree = false;
        await invalidateAll();
        showToast('Tree updated successfully');
    }

    async function handleDeleteTree() {
        isDeleting = true;
        try {
            await deleteFamilyTree(data.tree.id);
            showToast('Tree deleted successfully');
            goto('/');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to delete tree', 'error');
            showDeleteConfirm = false;
        } finally {
            isDeleting = false;
        }
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

<svelte:head>
    <title>{data.tree.name} - Famlyr</title>
</svelte:head>

<div class="space-y-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-neutral-500">
        <a href="/" class="hover:text-primary-600 transition-colors">Family Trees</a>
        <span>/</span>
        <span class="text-neutral-900">{data.tree.name}</span>
    </nav>

    <!-- Header Section -->
    <div>
        <div class="flex items-start justify-between">
            <div class="flex items-start gap-3">
                <div>
                    <h1>{data.tree.name}</h1>
                    {#if data.tree.description}
                        <p class="mt-2 text-neutral-600">{data.tree.description}</p>
                    {/if}
                </div>
                <div class="flex gap-1 flex-shrink-0">
                    <button
                        class="icon-btn"
                        onclick={() => showEditTree = true}
                        title="Edit tree"
                        aria-label="Edit tree"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                    </button>
                    <button
                        class="icon-btn icon-btn-danger"
                        onclick={() => showDeleteConfirm = true}
                        title="Delete tree"
                        aria-label="Delete tree"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                    </button>
                </div>
            </div>
            <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-shrink-0">
                <button class="btn btn-secondary whitespace-nowrap" onclick={openAddPerson}>Add Person</button>
                <a href="/trees/{data.tree.id}/statistics" class="btn btn-secondary whitespace-nowrap">Statistics</a>
                <a href="/tree/{data.tree.id}" class="btn btn-primary whitespace-nowrap">View Tree</a>
            </div>
        </div>
        <div class="mt-4 flex gap-6 text-sm text-neutral-500">
            <span>Created: {formatDate(data.tree.createdAt)}</span>
            <span>Updated: {formatDate(data.tree.updatedAt)}</span>
        </div>
    </div>

    <!-- Statistics Section -->
    <div class="flex gap-6">
        <div class="card flex-1 text-center">
            <p class="text-3xl font-bold text-primary-600">{data.tree.personCount}</p>
            <p class="mt-1 text-sm text-neutral-500">
                {data.tree.personCount === 1 ? "Person" : "Persons"}
            </p>
        </div>
        <div class="card flex-1 text-center">
            <p class="text-3xl font-bold text-primary-600">{formatYearRange()}</p>
            <p class="mt-1 text-sm text-neutral-500">Year Range</p>
        </div>
    </div>

    <!-- Persons List Section -->
    <div>
        <div class="flex items-center justify-between gap-4">
            <h2 class="text-xl font-semibold">Persons</h2>
            {#if data.tree.persons.length > 0}
                <div class="w-72">
                    <TreeSearch
                        bind:this={searchRef}
                        persons={data.tree.persons}
                        onSelect={handleSearchSelect}
                        inline={true}
                    />
                </div>
            {/if}
        </div>

        {#if data.tree.persons.length === 0}
            <div class="card mt-4 text-center py-8">
                <p class="text-neutral-500">No persons in this tree yet.</p>
            </div>
        {:else}
            <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {#each data.tree.persons as person}
                    <button
                        class="card-interactive text-left"
                        onclick={() => selectPerson(person)}
                    >
                        <div class="person-card-content">
                            {#if person.primaryPhotoUrl}
                                <img
                                    src={person.primaryPhotoUrl}
                                    alt=""
                                    class="person-card-photo"
                                />
                            {:else}
                                <div class="person-card-avatar" data-gender={person.gender}>
                                    {getInitials(person)}
                                </div>
                            {/if}
                            <div class="person-card-info">
                                <p class="font-medium text-neutral-900">{formatPersonName(person)}</p>
                                <p class="mt-1 text-sm text-neutral-500">{getPersonYears(person)}</p>
                                <span class="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                                    {person.gender}
                                </span>
                            </div>
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>

<!-- Person Detail Panel -->
{#if selectedPerson}
    <PersonDetailPanel
        person={selectedPerson}
        treeId={data.tree.id}
        onClose={closePanel}
        onSelectPerson={selectPerson}
        onEdit={openEditPerson}
        onRelationshipChange={() => invalidateAll()}
    />
{/if}

<!-- Person Form Panel (Add/Edit) -->
{#if showAddPerson}
    <PersonFormPanel
        treeId={data.tree.id}
        onClose={closeFormPanel}
        onSave={handlePersonSaved}
    />
{:else if editingPerson}
    <PersonFormPanel
        treeId={data.tree.id}
        person={editingPerson}
        onClose={closeFormPanel}
        onSave={handlePersonSaved}
    />
{/if}

<!-- Tree Form Panel (Edit) -->
{#if showEditTree}
    <TreeFormPanel
        tree={data.tree}
        onClose={() => showEditTree = false}
        onSave={handleTreeSaved}
    />
{/if}

<!-- Delete Confirmation Dialog -->
{#if showDeleteConfirm}
    <ConfirmDialog
        title="Delete Tree"
        message="Are you sure you want to delete '{data.tree.name}'? This will permanently remove all {data.tree.personCount} persons and their data. This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteTree}
        onCancel={() => showDeleteConfirm = false}
    />
{/if}

<style>
    .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 8px;
        border: none;
        background-color: transparent;
        color: var(--color-neutral-500);
        cursor: pointer;
        transition: all 150ms;
    }

    .icon-btn:hover {
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-700);
    }

    .icon-btn-danger:hover {
        background-color: var(--color-error-50, #fef2f2);
        color: var(--color-error-600, #dc2626);
    }

    .person-card-content {
        display: flex;
        gap: 12px;
        align-items: flex-start;
    }

    .person-card-photo {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .person-card-avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 1rem;
        color: white;
        flex-shrink: 0;
    }

    .person-card-avatar[data-gender="Male"] { background-color: #525f80; }
    .person-card-avatar[data-gender="Female"] { background-color: #9a8a6c; }
    .person-card-avatar[data-gender="Other"] { background-color: #317876; }
    .person-card-avatar[data-gender="Unknown"] { background-color: #868e96; }

    .person-card-info {
        flex: 1;
        min-width: 0;
    }
</style>
