<script lang="ts">
    import { invalidateAll } from "$app/navigation";
    import type { PageData } from "./$types";
    import type { PersonModel, PersonDetailModel } from "$lib/types/api";
    import { getPerson } from "$lib/api/persons";
    import { showToast } from "$lib/stores/toast.svelte";
    import PersonDetailPanel from "$lib/components/PersonDetailPanel.svelte";
    import PersonFormPanel from "$lib/components/PersonFormPanel.svelte";

    let { data }: { data: PageData } = $props();

    let selectedPerson: PersonModel | null = $state(null);
    let editingPerson: PersonDetailModel | null = $state(null);
    let showAddPerson = $state(false);

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
</script>

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
            <div>
                <h1>{data.tree.name}</h1>
                {#if data.tree.description}
                    <p class="mt-2 text-neutral-600">{data.tree.description}</p>
                {/if}
            </div>
            <div class="flex gap-3">
                <button class="btn btn-secondary" onclick={openAddPerson}>Add Person</button>
                <a href="/trees/{data.tree.id}/statistics" class="btn btn-secondary">Statistics</a>
                <a href="/tree/{data.tree.id}" class="btn btn-primary">View Tree</a>
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
        <h2 class="text-xl font-semibold">Persons</h2>

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
                        <p class="font-medium text-neutral-900">{formatPersonName(person)}</p>
                        <p class="mt-1 text-sm text-neutral-500">{getPersonYears(person)}</p>
                        <span class="mt-2 inline-block text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                            {person.gender}
                        </span>
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
