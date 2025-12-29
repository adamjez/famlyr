<script lang="ts">
    import type { PersonSearchResultModel } from '$lib/types/api';
    import { searchPersons } from '$lib/api/persons';

    interface Props {
        treeId: string;
        excludePersonId?: string;
        onSelect: (person: PersonSearchResultModel) => void;
        placeholder?: string;
    }

    let { treeId, excludePersonId, onSelect, placeholder = 'Search for person...' }: Props = $props();

    let query = $state('');
    let results = $state<PersonSearchResultModel[]>([]);
    let isSearching = $state(false);
    let showDropdown = $state(false);
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    function formatName(person: PersonSearchResultModel): string {
        const first = person.firstName ?? 'Unknown';
        const last = person.lastName ?? '';
        return `${first} ${last}`.trim();
    }

    function formatYears(person: PersonSearchResultModel): string {
        const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
        const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
        if (death) {
            return `(${birth}-${death})`;
        }
        return `(${birth}-)`;
    }

    async function performSearch() {
        if (query.trim().length < 2) {
            results = [];
            isSearching = false;
            return;
        }
        try {
            const response = await searchPersons(treeId, query, { excludePersonId });
            results = response.persons;
        } catch {
            results = [];
        } finally {
            isSearching = false;
        }
    }

    function handleInput() {
        showDropdown = true;
        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        if (query.trim().length >= 2) {
            isSearching = true;
        }
        debounceTimer = setTimeout(performSearch, 300);
    }

    function handleSelect(person: PersonSearchResultModel) {
        query = '';
        results = [];
        showDropdown = false;
        onSelect(person);
    }

    function handleBlur() {
        setTimeout(() => {
            showDropdown = false;
        }, 200);
    }

    function handleFocus() {
        if (results.length > 0 || query.trim().length >= 2) {
            showDropdown = true;
        }
    }
</script>

<div class="person-search">
    <input
        type="text"
        bind:value={query}
        oninput={handleInput}
        onblur={handleBlur}
        onfocus={handleFocus}
        {placeholder}
        class="search-input"
    />

    {#if showDropdown && (results.length > 0 || isSearching || query.trim().length >= 2)}
        <div class="search-dropdown">
            {#if isSearching}
                <div class="search-status">Searching...</div>
            {:else if results.length === 0 && query.trim().length >= 2}
                <div class="search-status">No results found</div>
            {:else}
                {#each results as person}
                    <button
                        type="button"
                        class="search-result"
                        onclick={() => handleSelect(person)}
                    >
                        <span class="result-name">{formatName(person)}</span>
                        <span class="result-years">{formatYears(person)}</span>
                    </button>
                {/each}
            {/if}
        </div>
    {/if}
</div>

<style>
    .person-search {
        position: relative;
    }

    .search-input {
        width: 100%;
        padding: 10px 14px;
        border: 1px solid var(--color-neutral-300);
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 150ms, box-shadow 150ms;
    }

    .search-input:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .search-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        margin-top: 4px;
        background: white;
        border: 1px solid var(--color-neutral-200);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
        z-index: 10;
        max-height: 200px;
        overflow-y: auto;
    }

    .search-status {
        padding: 12px 14px;
        font-size: 0.875rem;
        color: var(--color-neutral-500);
        text-align: center;
    }

    .search-result {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 10px 14px;
        border: none;
        background: transparent;
        text-align: left;
        cursor: pointer;
        transition: background-color 150ms;
    }

    .search-result:hover {
        background-color: var(--color-neutral-100);
    }

    .search-result:first-child {
        border-radius: 8px 8px 0 0;
    }

    .search-result:last-child {
        border-radius: 0 0 8px 8px;
    }

    .search-result:only-child {
        border-radius: 8px;
    }

    .result-name {
        font-size: 0.875rem;
        color: var(--color-neutral-900);
    }

    .result-years {
        font-size: 0.75rem;
        color: var(--color-neutral-500);
    }
</style>
