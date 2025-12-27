<script lang="ts">
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Famlyr - Family Tree</title>
</svelte:head>

<div class="space-y-6">
    <h1 class="text-3xl font-bold text-gray-900">Family Tree</h1>

    <div class="rounded-lg bg-white p-6 shadow">
        <h2 class="text-xl font-semibold text-gray-800">{data.tree.name}</h2>
        {#if data.tree.description}
            <p class="mt-2 text-gray-600">{data.tree.description}</p>
        {/if}

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {#each data.tree.persons as person}
                <div class="rounded border border-gray-200 p-4">
                    <p class="font-medium text-gray-900">
                        {person.firstName ?? "Unknown"}
                        {person.lastName ?? ""}
                    </p>
                    <p class="text-sm text-gray-500">{person.gender}</p>
                    {#if person.birthDate}
                        <p class="text-sm text-gray-500">
                            Born: {person.birthDate}
                            {#if person.deathDate}
                                - Died: {person.deathDate}
                            {/if}
                        </p>
                    {/if}
                </div>
            {/each}
        </div>
    </div>
</div>
