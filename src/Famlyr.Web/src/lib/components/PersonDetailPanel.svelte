<script lang="ts">
    import type { PersonModel, RelationshipModel } from '$lib/types/api';

    interface Props {
        person: PersonModel;
        persons: PersonModel[];
        relationships: RelationshipModel[];
        treeId: string;
        onClose: () => void;
        onSelectPerson: (person: PersonModel) => void;
    }

    let { person, persons, relationships, treeId, onClose, onSelectPerson }: Props = $props();

    // Parent relationship: subjectId = child, relativeId = parent
    const parents = $derived(
        relationships
            .filter(r => r.type === 'Parent' && r.subjectId === person.id)
            .map(r => persons.find(p => p.id === r.relativeId))
            .filter((p): p is PersonModel => p !== undefined)
    );

    const children = $derived(
        relationships
            .filter(r => r.type === 'Parent' && r.relativeId === person.id)
            .map(r => persons.find(p => p.id === r.subjectId))
            .filter((p): p is PersonModel => p !== undefined)
    );

    // Spouse relationship: bidirectional - person can be in either position
    const spouses = $derived(
        relationships
            .filter(r => r.type === 'Spouse' && (r.subjectId === person.id || r.relativeId === person.id))
            .map(r => {
                const spouseId = r.subjectId === person.id ? r.relativeId : r.subjectId;
                return persons.find(p => p.id === spouseId);
            })
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
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Backdrop -->
<button
    class="panel-backdrop"
    onclick={onClose}
    aria-label="Close panel"
></button>

<!-- Panel -->
<aside class="detail-panel" role="dialog" aria-label="Person details">
    <header class="panel-header">
        <h3>{formatName(person.firstName, person.lastName)}</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </header>

    <div class="panel-content">
        <dl class="info-list">
            <div class="info-item">
                <dt>Gender</dt>
                <dd>
                    <span class="badge">{person.gender}</span>
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
                                        onclick={() => onSelectPerson(parent)}
                                    >
                                        {formatName(parent.firstName, parent.lastName)}
                                    </button>
                                </li>
                            {/each}
                        </ul>
                    </dd>
                </div>
            {/if}

            {#if spouses.length > 0}
                <div class="info-item">
                    <dt>{spouses.length === 1 ? 'Spouse' : 'Spouses'}</dt>
                    <dd>
                        <ul class="relation-list">
                            {#each spouses as spouse}
                                <li>
                                    <button
                                        class="relation-link relation-spouse"
                                        onclick={() => onSelectPerson(spouse)}
                                    >
                                        {formatName(spouse.firstName, spouse.lastName)}
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
                                        onclick={() => onSelectPerson(child)}
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

        <div class="panel-actions">
            <a href="/tree/{treeId}?focus={person.id}" class="btn btn-primary w-full">
                View in Tree
            </a>
        </div>
    </div>
</aside>

<style>
    .panel-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgb(0 0 0 / 0.3);
        z-index: 40;
        border: none;
        cursor: default;
        animation: fadeIn 200ms ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .detail-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 400px;
        height: 100%;
        background-color: white;
        border-left: 1px solid var(--color-neutral-200);
        box-shadow: -4px 0 6px -1px rgb(0 0 0 / 0.1);
        z-index: 50;
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
        padding: 20px 24px;
        border-bottom: 1px solid var(--color-neutral-200);
    }

    .panel-header h3 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--color-neutral-900);
    }

    .close-btn {
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

    .close-btn:hover {
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-700);
    }

    .panel-content {
        flex: 1;
        padding: 24px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .info-list {
        display: flex;
        flex-direction: column;
        gap: 20px;
        flex: 1;
    }

    .info-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .info-item dt {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--color-neutral-500);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .info-item dd {
        margin: 0;
        font-size: 1rem;
        color: var(--color-neutral-900);
    }

    .badge {
        display: inline-block;
        padding: 4px 12px;
        font-size: 0.875rem;
        font-weight: 500;
        border-radius: 9999px;
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-700);
    }

    .relation-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .relation-link {
        display: block;
        width: 100%;
        padding: 10px 14px;
        border: none;
        border-radius: 8px;
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

    .relation-spouse {
        border-left: 3px solid #9333ea;
    }

    .relation-child {
        border-left: 3px solid #c96b2e;
    }

    .panel-actions {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--color-neutral-200);
    }

    .w-full {
        width: 100%;
        text-align: center;
    }
</style>
