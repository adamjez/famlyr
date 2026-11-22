<script lang="ts">
    import { buildFamilyBranches, type Branch } from '$lib/services/tree/branchNavigator';
    import type { FamilyTreeModel, PersonModel } from '$lib/types/api';

    interface Props {
        tree: FamilyTreeModel;
        onSelect: (personId: string) => void;
        onClose: () => void;
        mobileOpen?: boolean;
    }

    let { tree, onSelect, onClose, mobileOpen = false }: Props = $props();
    let mode = $state<'surname' | 'family'>('surname');

    function buildSurnameBranches(persons: PersonModel[]): Branch[] {
        const groups = new Map<string, PersonModel[]>();

        for (const person of persons) {
            const normalizedName = person.lastName?.trim().toLocaleLowerCase();
            const key = normalizedName || '__unknown__';
            const group = groups.get(key) ?? [];
            group.push(person);
            groups.set(key, group);
        }

        return [...groups.entries()]
            .map(([key, members]) => {
                const first = members
                    .slice()
                    .sort((a, b) => (a.birthDate ?? '').localeCompare(b.birthDate ?? ''))[0];
                const label = key === '__unknown__'
                    ? 'Unknown surname'
                    : members[0].lastName?.trim() || 'Unknown surname';

                return {
                    id: key,
                    label,
                    count: members.length,
                    representativeId: first.id
                };
            })
            .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
    }

    const branches = $derived.by(() => {
        if (mode === 'surname') {
            return buildSurnameBranches(tree.persons);
        }

        return buildFamilyBranches(tree.persons, tree.relationships);
    });

    function selectBranch(branch: Branch) {
        onSelect(branch.representativeId);
        if (mobileOpen) onClose();
    }
</script>

<aside class="branch-navigator" class:branch-navigator-mobile-open={mobileOpen} aria-label="Tree branches">
    <div class="branch-header">
        <span>Branches</span>
        <div class="branch-modes" aria-label="Branch grouping">
            <button
                type="button"
                class:active={mode === 'surname'}
                aria-pressed={mode === 'surname'}
                onclick={() => (mode = 'surname')}
            >
                Surnames
            </button>
            <button
                type="button"
                class:active={mode === 'family'}
                aria-pressed={mode === 'family'}
                onclick={() => (mode = 'family')}
            >
                Root families
            </button>
        </div>
        <button
            type="button"
            class="close-button"
            aria-label="Hide family branches"
            onclick={onClose}
        >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
        </button>
    </div>

    <div class="branch-list">
        {#each branches.slice(0, 8) as branch}
            <button
                type="button"
                class="branch-item"
                onclick={() => selectBranch(branch)}
            >
                <span class="branch-name">{branch.label}</span>
                <span class="branch-count">{branch.count}</span>
            </button>
        {/each}
    </div>
</aside>

<style>
    .branch-navigator {
        position: absolute;
        top: 68px;
        right: 16px;
        z-index: 12;
        width: 260px;
        overflow: hidden;
        border: 1px solid var(--color-neutral-300);
        border-radius: 10px;
        background: rgb(255 255 255 / 0.96);
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.12);
    }

    .branch-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 40px;
        padding: 6px 8px 6px 10px;
        border-bottom: 1px solid var(--color-neutral-200);
        color: var(--color-neutral-800);
        font-size: 12px;
        font-weight: 700;
    }

    .close-button {
        display: none;
        width: 28px;
        height: 28px;
        padding: 0;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-neutral-500);
        place-items: center;
        cursor: pointer;
    }

    .close-button:hover {
        background: var(--color-neutral-100);
        color: var(--color-neutral-800);
    }

    .branch-modes {
        display: flex;
        gap: 3px;
    }

    .branch-modes button {
        height: 28px;
        padding: 0 7px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--color-neutral-600);
        font-size: 11px;
        cursor: pointer;
    }

    .branch-modes button.active {
        background: var(--color-primary-100);
        color: var(--color-primary-700);
    }

    .branch-modes button:focus-visible,
    .branch-item:focus-visible,
    .close-button:focus-visible {
        outline: 2px solid var(--color-primary-500);
        outline-offset: 2px;
    }

    .branch-list {
        max-height: 280px;
        overflow-y: auto;
        padding: 4px;
    }

    .branch-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        min-height: 36px;
        padding: 6px 8px;
        border: 0;
        border-radius: 7px;
        background: transparent;
        color: var(--color-neutral-700);
        text-align: left;
        cursor: pointer;
    }

    .branch-item:hover {
        background: var(--color-neutral-100);
    }

    .branch-name {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .branch-count {
        flex: 0 0 auto;
        margin-left: 8px;
        color: var(--color-neutral-500);
        font-variant-numeric: tablining-nums;
    }

    @media (max-width: 639px) {
        .branch-navigator {
            display: none;
        }

        .branch-navigator.branch-navigator-mobile-open {
            inset: 8px;
            z-index: 20;
            display: flex;
            width: auto;
            height: auto;
            flex-direction: column;
        }

        .branch-navigator-mobile-open .branch-header {
            flex: 0 0 auto;
            gap: 8px;
        }

        .branch-navigator-mobile-open .branch-header > span {
            margin-right: auto;
        }

        .branch-navigator-mobile-open .close-button {
            display: grid;
            flex: 0 0 auto;
        }

        .branch-navigator-mobile-open .branch-list {
            flex: 1;
            max-height: none;
            overflow-y: auto;
            padding: 8px;
        }

        .branch-navigator-mobile-open .branch-item {
            min-height: 48px;
        }
    }
</style>
