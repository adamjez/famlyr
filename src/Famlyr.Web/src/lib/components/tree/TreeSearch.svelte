<script lang="ts">
	import type { PersonModel } from '$lib/types/api';
	import { searchPersons, type SearchResult } from '$lib/services/tree/treeSearch';

	interface Props {
		persons: PersonModel[];
		onSelect: (person: PersonModel) => void;
		placeholder?: string;
		inline?: boolean;
	}

	let {
		persons,
		onSelect,
		placeholder = 'Search persons... (/)',
		inline = false
	}: Props = $props();

	let query = $state('');
	let results = $state<SearchResult[]>([]);
	let showDropdown = $state(false);
	let highlightedIndex = $state(-1);
	let inputElement: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout> | null = null;

	function handleInput() {
		showDropdown = true;
		highlightedIndex = -1;

		if (debounceTimer) clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			if (query.trim().length >= 1) {
				results = searchPersons(persons, query, 10);
			} else {
				results = [];
			}
		}, 50);
	}

	function handleSelect(result: SearchResult) {
		query = '';
		results = [];
		showDropdown = false;
		highlightedIndex = -1;
		onSelect(result.person);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showDropdown || results.length === 0) {
			if (event.key === 'Escape') {
				showDropdown = false;
				inputElement?.blur();
			}
			return;
		}

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				highlightedIndex = Math.min(highlightedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				highlightedIndex = Math.max(highlightedIndex - 1, -1);
				break;
			case 'Enter':
				event.preventDefault();
				if (highlightedIndex >= 0 && highlightedIndex < results.length) {
					handleSelect(results[highlightedIndex]);
				}
				break;
			case 'Escape':
				showDropdown = false;
				highlightedIndex = -1;
				inputElement?.blur();
				break;
		}
	}

	function handleBlur() {
		setTimeout(() => {
			showDropdown = false;
			highlightedIndex = -1;
		}, 150);
	}

	function handleFocus() {
		if (query.trim().length >= 1 && results.length > 0) {
			showDropdown = true;
		}
	}

	export function focus() {
		inputElement?.focus();
	}

	function formatName(person: PersonModel): string {
		const first = person.firstName ?? 'Unknown';
		const last = person.lastName ?? '';
		return `${first} ${last}`.trim();
	}

	function formatYears(person: PersonModel): string {
		const birth = person.birthDate ? new Date(person.birthDate).getFullYear() : '?';
		const death = person.deathDate ? new Date(person.deathDate).getFullYear() : null;
		if (death) {
			return `(${birth}-${death})`;
		}
		return `(${birth}-)`;
	}
</script>

<div class="tree-search" class:tree-search-inline={inline}>
	<div class="search-input-wrapper">
		<svg
			class="search-icon"
			width="16"
			height="16"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
		>
			<circle cx="11" cy="11" r="8" />
			<line x1="21" y1="21" x2="16.65" y2="16.65" />
		</svg>
		<input
			bind:this={inputElement}
			type="text"
			bind:value={query}
			oninput={handleInput}
			onkeydown={handleKeydown}
			onblur={handleBlur}
			onfocus={handleFocus}
			{placeholder}
			class="search-input"
			aria-label="Search persons"
			aria-expanded={showDropdown && results.length > 0}
			aria-controls="search-results"
			role="combobox"
			autocomplete="off"
		/>
		<kbd class="shortcut-hint">/</kbd>
	</div>

	{#if showDropdown && (results.length > 0 || query.trim().length >= 1)}
		<ul id="search-results" class="search-dropdown" role="listbox">
			{#if results.length === 0 && query.trim().length >= 1}
				<li class="search-status">No persons found</li>
			{:else}
				{#each results as result, index}
					<li role="option" aria-selected={highlightedIndex === index}>
						<button
							type="button"
							class="search-result"
							class:highlighted={highlightedIndex === index}
							onclick={() => handleSelect(result)}
							onmouseenter={() => (highlightedIndex = index)}
						>
							<span class="result-name">{formatName(result.person)}</span>
							<span class="result-years">{formatYears(result.person)}</span>
						</button>
					</li>
				{/each}
			{/if}
		</ul>
	{/if}
</div>

<style>
	.tree-search {
		position: absolute;
		top: 16px;
		left: 16px;
		width: 280px;
		z-index: 10;
	}

	.tree-search-inline {
		position: relative;
		top: auto;
		left: auto;
	}

	.search-input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 12px;
		color: var(--color-neutral-400);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 10px 40px 10px 36px;
		border: 1px solid var(--color-neutral-300);
		border-radius: 8px;
		font-size: 0.875rem;
		background: white;
		box-shadow: 0 1px 2px rgb(0 0 0 / 0.05);
		transition:
			border-color 150ms,
			box-shadow 150ms;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-primary-500);
		box-shadow: 0 0 0 3px var(--color-primary-100);
	}

	.shortcut-hint {
		position: absolute;
		right: 10px;
		padding: 2px 6px;
		font-size: 0.75rem;
		font-family: monospace;
		background: var(--color-neutral-100);
		border: 1px solid var(--color-neutral-300);
		border-radius: 4px;
		color: var(--color-neutral-500);
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
		max-height: 320px;
		overflow-y: auto;
		list-style: none;
		padding: 0;
		margin: 0;
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
		transition: background-color 100ms;
	}

	.search-result:hover,
	.search-result.highlighted {
		background-color: var(--color-neutral-100);
	}

	.result-name {
		font-size: 0.875rem;
		color: var(--color-neutral-900);
	}

	.result-years {
		font-size: 0.75rem;
		color: var(--color-neutral-500);
	}

	li {
		list-style: none;
	}

	li:first-child .search-result {
		border-radius: 8px 8px 0 0;
	}

	li:last-child .search-result {
		border-radius: 0 0 8px 8px;
	}

	li:only-child .search-result {
		border-radius: 8px;
	}
</style>
