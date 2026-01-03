<script lang="ts">
    import type { PersonModel, PersonRelationshipsResponse, PersonSearchResultModel, PersonDetailModel, Gender } from '$lib/types/api';
    import { getRelationships, addRelationship, removeRelationship, getPerson, deletePhoto, setPrimaryPhoto, updatePerson, deletePerson } from '$lib/api/persons';
    import { showToast } from '$lib/stores/toast.svelte';
    import PersonSearch from './PersonSearch.svelte';
    import ConfirmDialog from './ConfirmDialog.svelte';

    interface Props {
        person: PersonModel;
        treeId: string;
        onClose: () => void;
        onSelectPerson: (person: PersonModel) => void;
        onEdit?: () => void;
        onRelationshipChange?: () => void;
        onDelete?: () => void;
    }

    let { person, treeId, onClose, onSelectPerson, onEdit, onRelationshipChange, onDelete }: Props = $props();

    let relationships = $state<PersonRelationshipsResponse | null>(null);
    let isLoadingRelationships = $state(true);
    let isAddingRelationship = $state(false);
    let selectedRelationType = $state<'Parent' | 'Child' | 'Spouse'>('Parent');
    let isSubmitting = $state(false);
    let deletingRelationshipId = $state<string | null>(null);
    let personDetail = $state<PersonDetailModel | null>(null);
    let isUploadingPhoto = $state(false);
    let deletingPhotoId = $state<string | null>(null);
    let settingPrimaryPhotoId = $state<string | null>(null);
    let fileInput: HTMLInputElement | null = $state(null);
    let showDeleteConfirm = $state(false);
    let isDeleting = $state(false);

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
        loadPersonDetail();
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

    async function loadPersonDetail() {
        try {
            personDetail = await getPerson(treeId, person.id);
        } catch {
            // Silently fail - photos just won't show
        }
    }

    async function handleSetPrimaryPhoto(photoId: string) {
        settingPrimaryPhotoId = photoId;
        try {
            await setPrimaryPhoto(treeId, person.id, photoId);
            personDetail = await getPerson(treeId, person.id);
            showToast('Primary photo updated');
        } catch {
            showToast('Failed to set primary photo', 'error');
        } finally {
            settingPrimaryPhotoId = null;
        }
    }

    async function handleDeletePhoto(photoId: string) {
        deletingPhotoId = photoId;
        try {
            await deletePhoto(treeId, person.id, photoId);
            personDetail = await getPerson(treeId, person.id);
            showToast('Photo deleted');
        } catch {
            showToast('Failed to delete photo', 'error');
        } finally {
            deletingPhotoId = null;
        }
    }

    async function handleFileUpload(event: Event) {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;

        isUploadingPhoto = true;
        try {
            const files = Array.from(input.files);
            await updatePerson(treeId, person.id, { photos: files });
            personDetail = await getPerson(treeId, person.id);
            showToast('Photos uploaded');
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to upload photos', 'error');
        } finally {
            isUploadingPhoto = false;
            input.value = '';
        }
    }

    function getInitials(firstName: string | null, lastName: string | null): string {
        const first = firstName?.[0] ?? '';
        const last = lastName?.[0] ?? '';
        return (first + last).toUpperCase() || '?';
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

    function handleSelectRelatedPerson(relatedPerson: { id: string; firstName: string | null; lastName: string | null; gender: string }) {
        onSelectPerson({
            id: relatedPerson.id,
            firstName: relatedPerson.firstName,
            lastName: relatedPerson.lastName,
            gender: relatedPerson.gender as Gender,
            birthDate: null,
            deathDate: null,
            primaryPhotoUrl: null
        });
    }

    async function handleDeletePerson() {
        isDeleting = true;
        try {
            await deletePerson(treeId, person.id);
            showToast('Person deleted successfully');
            showDeleteConfirm = false;
            onDelete?.();
        } catch (e) {
            showToast(e instanceof Error ? e.message : 'Failed to delete person', 'error');
        } finally {
            isDeleting = false;
        }
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
        <div class="header-content">
            {#if person.primaryPhotoUrl}
                <img src={person.primaryPhotoUrl} alt="" class="header-photo" />
            {:else}
                <div class="header-avatar" data-gender={person.gender}>
                    {getInitials(person.firstName, person.lastName)}
                </div>
            {/if}
            <h3>{formatName(person.firstName, person.lastName)}</h3>
        </div>
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

            {#if personDetail?.birthName}
                <div class="info-item">
                    <dt>Birth Name</dt>
                    <dd>{personDetail.birthName}</dd>
                </div>
            {/if}

            <!-- Photo Gallery -->
            <div class="info-item">
                <dt>Photos</dt>
                <dd>
                    {#if personDetail?.photos && personDetail.photos.length > 0}
                        <div class="photo-gallery">
                            {#each personDetail.photos as photo}
                                <div class="photo-item">
                                    <img src={photo.imageUrl} alt="" class="photo-image" />
                                    {#if photo.isPrimary}
                                        <span class="primary-badge">Primary</span>
                                    {/if}
                                    <div class="photo-actions">
                                        {#if !photo.isPrimary}
                                            <button
                                                class="photo-action-btn"
                                                onclick={() => handleSetPrimaryPhoto(photo.id)}
                                                disabled={settingPrimaryPhotoId === photo.id}
                                                title="Set as primary"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                            </button>
                                        {/if}
                                        <button
                                            class="photo-action-btn photo-action-delete"
                                            onclick={() => handleDeletePhoto(photo.id)}
                                            disabled={deletingPhotoId === photo.id}
                                            title="Delete photo"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                                <polyline points="3 6 5 6 21 6" />
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="empty-photos">No photos yet</p>
                    {/if}
                    <button
                        class="upload-btn"
                        onclick={() => fileInput?.click()}
                        disabled={isUploadingPhoto}
                    >
                        {isUploadingPhoto ? 'Uploading...' : '+ Upload Photo'}
                    </button>
                    <input
                        bind:this={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        onchange={handleFileUpload}
                        class="hidden-input"
                    />
                </dd>
            </div>

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
            {#if onDelete}
                <button class="btn btn-danger w-full" onclick={() => showDeleteConfirm = true}>
                    Delete Person
                </button>
            {/if}
        </div>
    </div>
</div>

{#if showDeleteConfirm}
    <ConfirmDialog
        title="Delete Person"
        message="Are you sure you want to delete {formatName(person.firstName, person.lastName)}? All photos and relationships for this person will be permanently removed. This action cannot be undone."
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeletePerson}
        onCancel={() => showDeleteConfirm = false}
    />
{/if}

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

    .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .header-photo {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
    }

    .header-avatar {
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

    .header-avatar[data-gender="Male"] { background-color: #525f80; }
    .header-avatar[data-gender="Female"] { background-color: #9a8a6c; }
    .header-avatar[data-gender="Other"] { background-color: #317876; }
    .header-avatar[data-gender="Unknown"] { background-color: #868e96; }

    .photo-gallery {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 12px;
    }

    .photo-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 8px;
        overflow: hidden;
        background-color: var(--color-neutral-100);
    }

    .photo-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .primary-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        padding: 2px 6px;
        font-size: 0.625rem;
        font-weight: 600;
        color: white;
        background-color: var(--color-primary-600, #2563eb);
        border-radius: 4px;
    }

    .photo-actions {
        position: absolute;
        bottom: 4px;
        right: 4px;
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 150ms;
    }

    .photo-item:hover .photo-actions {
        opacity: 1;
    }

    .photo-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background-color: white;
        color: var(--color-neutral-600);
        cursor: pointer;
        transition: all 150ms;
    }

    .photo-action-btn:hover:not(:disabled) {
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-800);
    }

    .photo-action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .photo-action-delete:hover:not(:disabled) {
        background-color: #fef2f2;
        color: #dc2626;
    }

    .empty-photos {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
        margin: 0 0 12px 0;
    }

    .upload-btn {
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

    .upload-btn:hover:not(:disabled) {
        border-color: var(--color-primary-500);
        color: var(--color-primary-600);
    }

    .upload-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .hidden-input {
        display: none;
    }
</style>
