<script lang="ts">
    interface Props {
        title: string;
        message: string;
        confirmText?: string;
        confirmVariant?: 'danger' | 'primary';
        isLoading?: boolean;
        onConfirm: () => void;
        onCancel: () => void;
    }

    let {
        title,
        message,
        confirmText = 'Delete',
        confirmVariant = 'danger',
        isLoading = false,
        onConfirm,
        onCancel
    }: Props = $props();

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape' && !isLoading) {
            onCancel();
        }
    }

    function handleBackdropClick() {
        if (!isLoading) {
            onCancel();
        }
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="dialog-backdrop" onclick={handleBackdropClick} role="presentation"></div>

<div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="dialog-title" aria-describedby="dialog-message">
    <h3 id="dialog-title">{title}</h3>
    <p id="dialog-message">{message}</p>

    <div class="dialog-actions">
        <button
            type="button"
            class="btn btn-secondary"
            onclick={onCancel}
            disabled={isLoading}
        >
            Cancel
        </button>
        <button
            type="button"
            class="btn {confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}"
            onclick={onConfirm}
            disabled={isLoading}
        >
            {#if isLoading}
                Deleting...
            {:else}
                {confirmText}
            {/if}
        </button>
    </div>
</div>

<style>
    .dialog-backdrop {
        position: fixed;
        inset: 0;
        background-color: rgb(0 0 0 / 0.5);
        z-index: 50;
        animation: fadeIn 150ms ease-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }

    .dialog {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 90%;
        max-width: 420px;
        background-color: white;
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
        z-index: 51;
        padding: 24px;
        animation: scaleIn 150ms ease-out;
    }

    @keyframes scaleIn {
        from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
        }
        to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
    }

    .dialog h3 {
        margin: 0 0 12px;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--color-neutral-900);
    }

    .dialog p {
        margin: 0 0 24px;
        font-size: 0.875rem;
        color: var(--color-neutral-600);
        line-height: 1.5;
    }

    .dialog-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }

    .btn-danger {
        background-color: var(--color-error-600, #dc2626);
        color: white;
    }

    .btn-danger:hover:not(:disabled) {
        background-color: var(--color-error-700, #b91c1c);
    }

    .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>
