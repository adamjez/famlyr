<script lang="ts">
    import type { FamilyTreeDetailModel } from '$lib/types/api';
    import { createFamilyTree, updateFamilyTree } from '$lib/api/familyTree';

    interface Props {
        tree?: FamilyTreeDetailModel;
        onClose: () => void;
        onSave: (tree: FamilyTreeDetailModel) => void;
    }

    let { tree, onClose, onSave }: Props = $props();

    const isEditMode = $derived(!!tree);

    let name = $state(tree?.name ?? '');
    let description = $state(tree?.description ?? '');
    let isSubmitting = $state(false);
    let error = $state<string | null>(null);

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            onClose();
        }
    }

    async function handleSubmit(event: Event) {
        event.preventDefault();
        error = null;

        const trimmedName = name.trim();
        if (!trimmedName) {
            error = 'Name is required';
            return;
        }

        if (trimmedName.length > 200) {
            error = 'Name must not exceed 200 characters';
            return;
        }

        if (description && description.length > 2000) {
            error = 'Description must not exceed 2000 characters';
            return;
        }

        isSubmitting = true;

        try {
            const data = {
                name: trimmedName,
                description: description.trim() || undefined
            };

            let result: FamilyTreeDetailModel;
            if (isEditMode && tree) {
                result = await updateFamilyTree(tree.id, data);
            } else {
                result = await createFamilyTree(data);
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

<div class="form-panel" role="dialog" aria-modal="true" aria-label={isEditMode ? 'Edit tree' : 'Create tree'}>
    <header class="panel-header">
        <h3>{isEditMode ? 'Edit Tree' : 'Create Tree'}</h3>
        <button class="close-btn" onclick={onClose} aria-label="Close panel">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
        </button>
    </header>

    <form class="panel-content" onsubmit={handleSubmit}>
        <div class="form-group">
            <label for="name">Name <span class="required">*</span></label>
            <input
                type="text"
                id="name"
                bind:value={name}
                maxlength={200}
                placeholder="Enter tree name"
                required
            />
            <span class="helper-text">Required. Maximum 200 characters.</span>
        </div>

        <div class="form-group">
            <label for="description">Description</label>
            <textarea
                id="description"
                bind:value={description}
                maxlength={2000}
                rows={4}
                placeholder="Add a description for your family tree..."
            ></textarea>
            <span class="helper-text">Optional. Maximum 2000 characters.</span>
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
                    {isEditMode ? 'Save Changes' : 'Create Tree'}
                {/if}
            </button>
        </div>
    </form>
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

    .required {
        color: var(--color-error-600, #dc2626);
    }

    .form-group input,
    .form-group textarea {
        padding: 10px 14px;
        border: 1px solid var(--color-neutral-300);
        border-radius: 8px;
        font-size: 0.875rem;
        transition: border-color 150ms, box-shadow 150ms;
    }

    .form-group input:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: var(--color-primary-500);
        box-shadow: 0 0 0 3px var(--color-primary-100);
    }

    .helper-text {
        font-size: 0.75rem;
        color: var(--color-neutral-500);
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
