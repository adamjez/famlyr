<script lang="ts">
    import type { PersonModel, FamilyTreeModel } from '$lib/types/api';
    import type { TreeNode } from '$lib/types/tree';
    import { treeViewState } from '$lib/stores/treeView.svelte';

    interface Props {
        person: PersonModel;
        node: TreeNode;
        tree: FamilyTreeModel;
        onClose: () => void;
        onFocus: (personId: string) => void;
        onToggleFold: (personId: string) => void;
    }

    let { person, node, tree, onClose, onFocus, onToggleFold }: Props = $props();

    const isFocused = $derived(treeViewState.focusedPersonId === person.id);
    const isExpanded = $derived(treeViewState.expandedNodeIds.has(person.id));
    const hasDescendants = $derived(node.descendantCount > 0);

    const parents = $derived(
        node.parentIds
            .map(id => tree.persons.find(p => p.id === id))
            .filter((p): p is PersonModel => p !== undefined)
    );

    const children = $derived(
        node.childIds
            .map(id => tree.persons.find(p => p.id === id))
            .filter((p): p is PersonModel => p !== undefined)
    );

    function formatName(firstName: string | null, lastName: string | null): string {
        if (!firstName && !lastName) return 'Unknown Person';
        return [firstName, lastName].filter(Boolean).join(' ');
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return 'Unknown';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    function selectPerson(personId: string) {
        treeViewState.selectPerson(personId);
    }

    function handleFocus() {
        onFocus(person.id);
    }

    function handleToggleFold() {
        onToggleFold(person.id);
    }

    function formatDescendantCount(count: number): string {
        if (count >= 100) return '99+';
        return count.toString();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="detail-panel" role="dialog" aria-modal="true" aria-label="Person details">
    <header class="panel-header">
        <h3>{formatName(person.firstName, person.lastName)}</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </header>

    <div class="panel-actions">
        <button
            class="action-btn"
            class:action-btn-active={isFocused}
            onclick={handleFocus}
            disabled={isFocused}
        >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
            </svg>
            {isFocused ? 'Focused' : 'Focus on this person'}
        </button>

        {#if hasDescendants}
            <button class="action-btn" onclick={handleToggleFold}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    {#if isExpanded}
                        <polyline points="6 9 12 15 18 9" />
                    {:else}
                        <polyline points="9 18 15 12 9 6" />
                    {/if}
                </svg>
                {isExpanded ? 'Collapse descendants' : `Expand descendants (${formatDescendantCount(node.descendantCount)})`}
            </button>
        {/if}
    </div>

    <div class="panel-content">
        <dl class="info-list">
            <div class="info-item">
                <dt>Gender</dt>
                <dd>
                    <span class="badge badge-neutral">{person.gender}</span>
                </dd>
            </div>

            <div class="info-item">
                <dt>Birth Date</dt>
                <dd>{formatDate(person.birthDate)}</dd>
            </div>

            {#if person.deathDate}
                <div class="info-item">
                    <dt>Death Date</dt>
                    <dd>{formatDate(person.deathDate)}</dd>
                </div>
            {/if}

            {#if parents.length > 0}
                <div class="info-item">
                    <dt>Parents</dt>
                    <dd>
                        <ul class="relation-list">
                            {#each parents as parent}
                                <li>
                                    <button
                                        class="relation-link relation-parent"
                                        onclick={() => selectPerson(parent.id)}
                                    >
                                        {formatName(parent.firstName, parent.lastName)}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </dd>
                </div>
            {/if}

            {#if children.length > 0}
                <div class="info-item">
                    <dt>Children</dt>
                    <dd>
                        <ul class="relation-list">
                            {#each children as child}
                                <li>
                                    <button
                                        class="relation-link relation-child"
                                        onclick={() => selectPerson(child.id)}
                                    >
                                        {formatName(child.firstName, child.lastName)}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </dd>
                </div>
            {/if}
        </dl>
    </div>
</div>

<style>
    .detail-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 320px;
        height: 100%;
        background-color: white;
        border-left: 1px solid var(--color-neutral-200);
        box-shadow: -4px 0 6px -1px rgb(0 0 0 / 0.1);
        z-index: 20;
        display: flex;
        flex-direction: column;
        animation: slideIn 200ms ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
        }
        to {
            transform: translateX(0);
        }
    }

    .panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid var(--color-neutral-200);
    }

    .panel-header h3 {
        margin: 0;
        font-size: 1.125rem;
    }

    .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: none;
        background-color: transparent;
        color: var(--color-neutral-500);
        cursor: pointer;
        transition: all 150ms;
    }

    .close-btn:hover {
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-700);
    }

    .panel-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--color-neutral-200);
    }

    .action-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        padding: 10px 12px;
        border: 1px solid var(--color-neutral-300);
        border-radius: 6px;
        background-color: white;
        color: var(--color-neutral-700);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 150ms;
    }

    .action-btn:hover:not(:disabled) {
        background-color: var(--color-neutral-50);
        border-color: var(--color-neutral-400);
    }

    .action-btn:disabled {
        cursor: default;
        opacity: 0.7;
    }

    .action-btn-active {
        background-color: var(--color-primary-50, #eff6ff);
        border-color: var(--color-primary-300, #93c5fd);
        color: var(--color-primary-700, #1d4ed8);
    }

    .action-btn svg {
        flex-shrink: 0;
    }

    .panel-content {
        flex: 1;
        padding: 16px;
        overflow-y: auto;
    }

    .info-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .info-item dt {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--color-neutral-500);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .info-item dd {
        margin: 0;
        color: var(--color-neutral-900);
    }

    .relation-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .relation-link {
        display: block;
        width: 100%;
        padding: 8px 12px;
        border: none;
        border-radius: 6px;
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-800);
        font-size: 0.875rem;
        text-align: left;
        cursor: pointer;
        transition: all 150ms;
    }

    .relation-link:hover {
        background-color: var(--color-neutral-200);
    }

    .relation-parent {
        border-left: 3px solid #2d9a5d;
    }

    .relation-child {
        border-left: 3px solid #c96b2e;
    }
</style>
