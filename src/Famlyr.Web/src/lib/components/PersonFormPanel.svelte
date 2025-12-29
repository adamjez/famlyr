<script lang="ts">
    import type { PersonDetailModel, PersonPhotoModel } from '$lib/types/api';
    import { createPerson, updatePerson, deletePhoto, setPrimaryPhoto } from '$lib/api/persons';

    interface Props {
        treeId: string;
        person?: PersonDetailModel;
        onClose: () => void;
        onSave: (person: PersonDetailModel) => void;
    }

    let { treeId, person, onClose, onSave }: Props = $props();

    const isEditMode = $derived(!!person);

    let firstName = $state(person?.firstName ?? '');
    let lastName = $state(person?.lastName ?? '');
    let gender = $state(person?.gender ?? 'Unknown');
    let birthDate = $state(person?.birthDate ?? '');
    let deathDate = $state(person?.deathDate ?? '');
    let notes = $state(person?.notes ?? '');
    let existingPhotos = $state<PersonPhotoModel[]>(person?.photos ?? []);
    let newPhotos = $state<File[]>([]);
    let isSubmitting = $state(false);
    let error = $state<string | null>(null);

    const genderOptions = ['Male', 'Female', 'Other', 'Unknown'];

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    function handleFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        if (input.files) {
            const files = Array.from(input.files);
            const totalPhotos = existingPhotos.length + newPhotos.length + files.length;
            if (totalPhotos > 20) {
                error = 'Cannot exceed 20 photos total';
                return;
            }
            newPhotos = [...newPhotos, ...files];
        }
    }

    function removeNewPhoto(index: number) {
        newPhotos = newPhotos.filter((_, i) => i !== index);
    }

    async function handleDeleteExistingPhoto(photoId: string) {
        if (!person) return;
        try {
            await deletePhoto(treeId, person.id, photoId);
            existingPhotos = existingPhotos.filter(p => p.id !== photoId);
        } catch (e) {
            error = 'Failed to delete photo';
        }
    }

    async function handleSetPrimary(photoId: string) {
        if (!person) return;
        try {
            await setPrimaryPhoto(treeId, person.id, photoId);
            existingPhotos = existingPhotos.map(p => ({
                ...p,
                isPrimary: p.id === photoId
            }));
        } catch (e) {
            error = 'Failed to set primary photo';
        }
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        error = null;
        isSubmitting = true;

        try {
            const data = {
                firstName: firstName || undefined,
                lastName: lastName || undefined,
                gender: gender,
                birthDate: birthDate || undefined,
                deathDate: deathDate || undefined,
                notes: notes || undefined,
                photos: newPhotos.length > 0 ? newPhotos : undefined
            };

            let result: PersonDetailModel;
            if (isEditMode && person) {
                result = await updatePerson(treeId, person.id, data);
            } else {
                result = await createPerson(treeId, data);
            }
            onSave(result);
        } catch (e) {
            error = e instanceof Error ? e.message : 'An error occurred';
        } finally {
            isSubmitting = false;
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<button
    class="panel-backdrop"
    onclick={onClose}
    aria-label="Close panel"
></button>

<aside class="form-panel" role="dialog" aria-label={isEditMode ? 'Edit person' : 'Add person'}>
    <header class="panel-header">
        <h3>{isEditMode ? 'Edit Person' : 'Add Person'}</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </header>

    <form class="panel-content" onsubmit={handleSubmit}>
        <div class="form-group">
            <label for="firstName">First Name</label>
            <input
                type="text"
                id="firstName"
                bind:value={firstName}
                maxlength={100}
                placeholder="Enter first name"
            />
        </div>

        <div class="form-group">
            <label for="lastName">Last Name</label>
            <input
                type="text"
                id="lastName"
                bind:value={lastName}
                maxlength={100}
                placeholder="Enter last name"
            />
        </div>

        <div class="form-group">
            <label for="gender">Gender</label>
            <select id="gender" bind:value={gender}>
                {#each genderOptions as option}
                    <option value={option}>{option}</option>
                {/each}
            </select>
        </div>

        <div class="form-group">
            <label for="birthDate">Birth Date</label>
            <input
                type="text"
                id="birthDate"
                bind:value={birthDate}
                placeholder="YYYY or YYYY-MM-DD"
            />
            <span class="helper-text">Enter year only (e.g., 1950) or full date (e.g., 1950-03-15)</span>
        </div>

        <div class="form-group">
            <label for="deathDate">Death Date</label>
            <input
                type="text"
                id="deathDate"
                bind:value={deathDate}
                placeholder="YYYY or YYYY-MM-DD"
            />
            <span class="helper-text">Leave empty if person is still living</span>
        </div>

        <div class="form-group">
            <label for="notes">Notes</label>
            <textarea
                id="notes"
                bind:value={notes}
                maxlength={10000}
                rows={4}
                placeholder="Add any additional notes..."
            ></textarea>
        </div>

        <div class="form-group">
            <label>Photos</label>
            {#if existingPhotos.length > 0}
                <div class="photo-grid">
                    {#each existingPhotos as photo}
                        <div class="photo-item">
                            <img src={photo.imageUrl} alt="Person photo" />
                            {#if photo.isPrimary}
                                <span class="primary-badge">Primary</span>
                            {/if}
                            <div class="photo-actions">
                                {#if !photo.isPrimary}
                                    <button
                                        type="button"
                                        class="photo-action-btn"
                                        onclick={() => handleSetPrimary(photo.id)}
                                        title="Set as primary"
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                        </svg>
                                    </button>
                                {/if}
                                <button
                                    type="button"
                                    class="photo-action-btn danger"
                                    onclick={() => handleDeleteExistingPhoto(photo.id)}
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
            {/if}

            {#if newPhotos.length > 0}
                <div class="new-photos">
                    <span class="new-photos-label">New photos to upload:</span>
                    <ul class="new-photos-list">
                        {#each newPhotos as file, index}
                            <li>
                                {file.name}
                                <button type="button" class="remove-btn" onclick={() => removeNewPhoto(index)}>×</button>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <input
                type="file"
                id="photos"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onchange={handleFileChange}
            />
            <span class="helper-text">JPEG, PNG, or WebP. Max 5MB each, max 20 total.</span>
        </div>

        {#if error}
            <div class="error-banner">{error}</div>
        {/if}

        <div class="form-actions">
            <button type="button" class="btn btn-secondary" onclick={onClose} disabled={isSubmitting}>
                Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={isSubmitting}>
                {#if isSubmitting}
                    Saving...
                {:else}
                    {isEditMode ? 'Save Changes' : 'Add Person'}
                {/if}
            </button>
        </div>
    </form>
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

    .form-panel {
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        max-width: 480px;
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
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
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
        gap: 20px;
    }

    .error-banner {
        padding: 12px 16px;
        background-color: var(--color-error-50, #fef2f2);
        border: 1px solid var(--color-error-200, #fecaca);
        border-radius: 8px;
        color: var(--color-error-700, #b91c1c);
        font-size: 0.875rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .form-group label {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-neutral-700);
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        padding: 10px 14px;
        border: 1px solid var(--color-neutral-300);
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 150ms, box-shadow 150ms;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .helper-text {
        font-size: 0.75rem;
        color: var(--color-neutral-500);
    }

    .photo-grid {
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
    }

    .photo-item img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .primary-badge {
        position: absolute;
        top: 4px;
        left: 4px;
        padding: 2px 6px;
        background-color: var(--color-primary-500);
        color: white;
        font-size: 0.625rem;
        font-weight: 600;
        border-radius: 4px;
        text-transform: uppercase;
    }

    .photo-actions {
        position: absolute;
        bottom: 4px;
        right: 4px;
        display: flex;
        gap: 4px;
    }

    .photo-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.9);
        color: var(--color-neutral-700);
        cursor: pointer;
        transition: all 150ms;
    }

    .photo-action-btn:hover {
        background-color: white;
    }

    .photo-action-btn.danger:hover {
        color: var(--color-error-600, #dc2626);
    }

    .new-photos {
        padding: 12px;
        background-color: var(--color-neutral-50);
        border-radius: 8px;
        margin-bottom: 12px;
    }

    .new-photos-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--color-neutral-600);
    }

    .new-photos-list {
        margin: 8px 0 0;
        padding: 0;
        list-style: none;
    }

    .new-photos-list li {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 0.875rem;
        color: var(--color-neutral-700);
    }

    .remove-btn {
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background-color: var(--color-neutral-200);
        color: var(--color-neutral-600);
        font-size: 14px;
        cursor: pointer;
        transition: all 150ms;
    }

    .remove-btn:hover {
        background-color: var(--color-error-100);
        color: var(--color-error-600);
    }

    .form-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: auto;
        padding-top: 24px;
        border-top: 1px solid var(--color-neutral-200);
    }
</style>
