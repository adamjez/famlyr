<script lang="ts">
    import { getToasts, dismissToast } from '$lib/stores/toast.svelte';

    const toasts = $derived(getToasts());
</script>

{#if toasts.length > 0}
    <div class="toast-container">
        {#each toasts as toast (toast.id)}
            <div class="toast toast-{toast.type}">
                <span>{toast.message}</span>
                <button class="toast-close" onclick={() => dismissToast(toast.id)} aria-label="Dismiss">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
        {/each}
    </div>
{/if}

<style>
    .toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 100;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 18px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgb(0 0 0 / 0.15);
        font-size: 0.875rem;
        font-weight: 500;
        animation: slideIn 200ms ease-out;
    }

    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }

    .toast-success {
        background-color: #ecfdf5;
        border: 1px solid #a7f3d0;
        color: #065f46;
    }

    .toast-error {
        background-color: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
    }

    .toast-info {
        background-color: #eff6ff;
        border: 1px solid #bfdbfe;
        color: #1e40af;
    }

    .toast-close {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border: none;
        border-radius: 4px;
        background: transparent;
        color: inherit;
        opacity: 0.6;
        cursor: pointer;
        transition: opacity 150ms;
    }

    .toast-close:hover {
        opacity: 1;
    }
</style>
