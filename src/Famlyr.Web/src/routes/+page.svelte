<script lang="ts">
    import type { PageData } from "./$types";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>Famlyr - Family Tree</title>
</svelte:head>

<div class="space-y-8">
    <h1>Family Tree</h1>

    <div class="card">
        <h2 class="text-2xl">{data.tree.name}</h2>
        {#if data.tree.description}
            <p class="mt-3 text-neutral-600">{data.tree.description}</p>
        {/if}

        <div class="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {#each data.tree.persons as person}
                <article class="card-interactive">
                    <p class="font-medium text-neutral-900">
                        {person.firstName ?? "Unknown"}
                        {person.lastName ?? ""}
                    </p>
                    <p class="mt-1 text-sm text-neutral-500">{person.gender}</p>
                    {#if person.birthDate}
                        <p class="mt-1 text-sm text-neutral-500">
                            Born: {person.birthDate}
                            {#if person.deathDate}
                                - Died: {person.deathDate}
                            {/if}
                        </p>
                    {/if}
                </article>
            {/each}
        </div>
    </div>
</div>
