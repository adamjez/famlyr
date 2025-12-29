<script lang="ts">
    import type { PersonModel, PersonRelationshipsResponse, PersonSearchResultModel, Gender } from '$lib/types/api';
    import { getRelationships, addRelationship, removeRelationship } from '$lib/api/persons';
    import { showToast } from '$lib/stores/toast.svelte';
    import PersonSearch from './PersonSearch.svelte';

    interface Props {
        person: PersonModel;
        treeId: string;
        onClose: () => void;
        onSelectPerson: (person: PersonModel) => void;
        onEdit?: () => void;
        onRelationshipChange?: () => void;
    }

    let { person, treeId, onClose, onSelectPerson, onEdit, onRelationshipChange }: Props = $props();

    let relationships = $state<PersonRelationshipsResponse | null>(null);
    let isLoadingRelationships = $state(true);
    let isAddingRelationship = $state(false);
    let selectedRelationType = $state<'Parent' | 'Child' | 'Spouse'>('Parent');
    let isSubmitting = $state(false);
    let deletingRelationshipId = $state<string | null>(null);

    const excludePersonIds = $derived(() => {
        if (!relationships) return [person.id];
        const relatedIds = [
            ...relationships.parents.map(r => r.person.id),
            ...relationships.children.map(r => r.person.id),
            ...relationships.spouses.map(r => r.person.id)
        ];
        return [person.id, ...relatedIds];
    });

    $effect(() => {
        loadRelationships();
    });

    async function loadRelationships() {
        isLoadingRelationships = true;
        try {
            relationships = await getRelationships(treeId, person.id);
        } catch {
            showToast('Failed to load relationships', 'error');
        } finally {
            isLoadingRelationships = false;
        }
    }

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
            if (isAddingRelationship) {
                isAddingRelationship = false;
            } else {
                onClose();
            }
        }
    }

    async function handleDeleteRelationship(relationshipId: string) {
        deletingRelationshipId = relationshipId;
        try {
            await removeRelationship(treeId, person.id, relationshipId);
            showToast('Relationship removed');
            await loadRelationships();
            onRelationshipChange?.();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to remove relationship', 'error');
        } finally {
            deletingRelationshipId = null;
        }
    }

    async function handleAddRelationship(selectedPerson: PersonSearchResultModel) {
        isSubmitting = true;
        try {
            await addRelationship(treeId, person.id, {
                relatedPersonId: selectedPerson.id,
                type: selectedRelationType
            });
            showToast('Relationship added');
            isAddingRelationship = false;
            await loadRelationships();
            onRelationshipChange?.();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to add relationship', 'error');
        } finally {
            isSubmitting = false;
        }
    }

    function handleSelectRelatedPerson(relatedPerson: { id: string; firstName: string | null; lastName: string | null; gender: Gender }) {
        onSelectPerson({
            id: relatedPerson.id,
            firstName: relatedPerson.firstName,
            lastName: relatedPerson.lastName,
            gender: relatedPerson.gender,
            birthDate: null,
            deathDate: null
        });
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<button
    class="panel-backdrop"
    onclick={onClose}
    aria-label="Close panel"
></button>

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

            {#if isLoadingRelationships}
                <div class="info-item">
                    <dd class="loading-text">Loading relationships...</dd>
                </div>
            {:else if relationships}
                {#if relationships.parents.length > 0}
                    <div class="info-item">
                        <dt>Parents</dt>
                        <dd>
                            <ul class="relation-list">
                                {#each relationships.parents as rel}
                                    <li class="relation-item">
                                        <button
                                            class="relation-link relation-parent"
                                            onclick={() => handleSelectRelatedPerson(rel.person)}
                                        >
                                            {formatName(rel.person.firstName, rel.person.lastName)}
                                        </button>
                                        <button
                                            class="delete-btn"
                                            onclick={() => handleDeleteRelationship(rel.relationshipId)}
                                            disabled={deletingRelationshipId === rel.relationshipId}
                                            aria-label="Remove relationship"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        </dd>
                    </div>
                {/if}

                {#if relationships.spouses.length > 0}
                    <div class="info-item">
                        <dt>{relationships.spouses.length === 1 ? 'Spouse' : 'Spouses'}</dt>
                        <dd>
                            <ul class="relation-list">
                                {#each relationships.spouses as rel}
                                    <li class="relation-item">
                                        <button
                                            class="relation-link relation-spouse"
                                            onclick={() => handleSelectRelatedPerson(rel.person)}
                                        >
                                            {formatName(rel.person.firstName, rel.person.lastName)}
                                        </button>
                                        <button
                                            class="delete-btn"
                                            onclick={() => handleDeleteRelationship(rel.relationshipId)}
                                            disabled={deletingRelationshipId === rel.relationshipId}
                                            aria-label="Remove relationship"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        </dd>
                    </div>
                {/if}

                {#if relationships.children.length > 0}
                    <div class="info-item">
                        <dt>Children</dt>
                        <dd>
                            <ul class="relation-list">
                                {#each relationships.children as rel}
                                    <li class="relation-item">
                                        <button
                                            class="relation-link relation-child"
                                            onclick={() => handleSelectRelatedPerson(rel.person)}
                                        >
                                            {formatName(rel.person.firstName, rel.person.lastName)}
                                        </button>
                                        <button
                                            class="delete-btn"
                                            onclick={() => handleDeleteRelationship(rel.relationshipId)}
                                            disabled={deletingRelationshipId === rel.relationshipId}
                                            aria-label="Remove relationship"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </li>
                                {/each}
                            </ul>
                        </dd>
                    </div>
                {/if}

                <div class="info-item">
                    {#if isAddingRelationship}
                        <div class="add-relationship-form">
                            <div class="relationship-type-selector">
                                <label class="type-option">
                                    <input type="radio" bind:group={selectedRelationType} value="Parent" />
                                    <span>Parent</span>
                                </label>
                                <label class="type-option">
                                    <input type="radio" bind:group={selectedRelationType} value="Child" />
                                    <span>Child</span>
                                </label>
                                <label class="type-option">
                                    <input type="radio" bind:group={selectedRelationType} value="Spouse" />
                                    <span>Spouse</span>
                                </label>
                            </div>
                            <PersonSearch
                                {treeId}
                                excludePersonId={person.id}
                                onSelect={handleAddRelationship}
                                placeholder="Search for person..."
                            />
                            {#if isSubmitting}
                                <p class="submitting-text">Adding relationship...</p>
                            {/if}
                            <button
                                type="button"
                                class="cancel-add-btn"
                                onclick={() => isAddingRelationship = false}
                            >
                                Cancel
                            </button>
                        </div>
                    {:else}
                        <button
                            type="button"
                            class="add-relationship-btn"
                            onclick={() => isAddingRelationship = true}
                        >
                            + Add Relationship
                        </button>
                    {/if}
                </div>
            {/if}
        </dl>

        <div class="panel-actions">
            {#if onEdit}
                <button class="btn btn-secondary w-full" onclick={onEdit}>
                    Edit Person
                </button>
            {/if}
            <a href="/tree/{treeId}?focus={person.id}" class="btn btn-primary w-full">
                View in Tree
            </a>
        </div>
    </div>
</div>

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

    .loading-text {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
    }

    .relation-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .relation-item {
        display: flex;
        gap: 8px;
        align-items: stretch;
    }

    .relation-link {
        flex: 1;
        display: block;
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

    .delete-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        border: none;
        border-radius: 8px;
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-500);
        cursor: pointer;
        transition: all 150ms;
    }

    .delete-btn:hover:not(:disabled) {
        background-color: #fef2f2;
        color: #dc2626;
    }

    .delete-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .add-relationship-btn {
        width: 100%;
        padding: 10px 14px;
        border: 2px dashed var(--color-neutral-300);
        border-radius: 8px;
        background: transparent;
        color: var(--color-neutral-600);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 150ms;
    }

    .add-relationship-btn:hover {
        border-color: var(--color-primary-500);
        color: var(--color-primary-600);
    }

    .add-relationship-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
        background-color: var(--color-neutral-50);
        border-radius: 8px;
    }

    .relationship-type-selector {
        display: flex;
        gap: 12px;
    }

    .type-option {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.875rem;
        color: var(--color-neutral-700);
        cursor: pointer;
    }

    .type-option input {
        accent-color: var(--color-primary-500);
    }

    .submitting-text {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
        margin: 0;
    }

    .cancel-add-btn {
        padding: 8px 14px;
        border: none;
        border-radius: 6px;
        background-color: var(--color-neutral-200);
        color: var(--color-neutral-700);
        font-size: 0.875rem;
        cursor: pointer;
        transition: all 150ms;
    }

    .cancel-add-btn:hover {
        background-color: var(--color-neutral-300);
    }

    .panel-actions {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid var(--color-neutral-200);
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .w-full {
        width: 100%;
        text-align: center;
    }
</style>
