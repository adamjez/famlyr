<script lang="ts">
    import type { ImportError, ImportWarning } from '$lib/types/api';

    interface Props {
        errors?: ImportError[];
        warnings?: ImportWarning[];
    }

    let { errors = [], warnings = [] }: Props = $props();

    const hasErrors = $derived((errors?.length ?? 0) > 0);
    const hasWarnings = $derived((warnings?.length ?? 0) > 0);
</script>

{#if hasErrors || hasWarnings}
    <div class="validation-results">
        {#if hasErrors}
            <div class="error-section">
                <div class="section-header error-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                    </svg>
                    <span>{errors?.length} Error{(errors?.length ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <ul class="error-list">
                    {#each errors ?? [] as error}
                        <li class="error-item">
                            <span class="error-type">{error.type}</span>
                            {#if error.tempId}
                                <span class="error-context">({error.tempId})</span>
                            {:else if error.index !== undefined}
                                <span class="error-context">(index {error.index})</span>
                            {/if}
                            <span class="error-message">{error.message}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}

        {#if hasWarnings}
            <div class="warning-section">
                <div class="section-header warning-header">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span>{warnings?.length} Warning{(warnings?.length ?? 0) !== 1 ? 's' : ''}</span>
                </div>
                <ul class="warning-list">
                    {#each warnings ?? [] as warning}
                        <li class="warning-item">
                            {#if warning.tempId}
                                <span class="warning-context">{warning.tempId}:</span>
                            {/if}
                            <span class="warning-message">{warning.message}</span>
                        </li>
                    {/each}
                </ul>
            </div>
        {/if}
    </div>
{/if}

<style>
    .validation-results {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .error-section {
        background-color: var(--color-error-50);
        border: 1px solid var(--color-error-100);
        border-radius: 0.75rem;
        overflow: hidden;
    }

    .warning-section {
        background-color: var(--color-warning-50);
        border: 1px solid var(--color-warning-100);
        border-radius: 0.75rem;
        overflow: hidden;
    }

    .section-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        font-weight: 500;
        font-size: 0.875rem;
    }

    .error-header {
        color: var(--color-error-700);
        background-color: var(--color-error-100);
    }

    .warning-header {
        color: var(--color-warning-700);
        background-color: var(--color-warning-100);
    }

    .error-list,
    .warning-list {
        list-style: none;
        margin: 0;
        padding: 0.75rem 1rem;
        max-height: 200px;
        overflow-y: auto;
    }

    .error-item,
    .warning-item {
        padding: 0.5rem 0;
        font-size: 0.875rem;
        border-bottom: 1px solid rgb(0 0 0 / 0.05);
    }

    .error-item:last-child,
    .warning-item:last-child {
        border-bottom: none;
    }

    .error-type {
        display: inline-block;
        font-family: var(--font-mono);
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--color-error-600);
        background-color: var(--color-error-100);
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        margin-right: 0.5rem;
    }

    .error-context,
    .warning-context {
        color: var(--color-neutral-500);
        font-size: 0.75rem;
        margin-right: 0.5rem;
    }

    .error-message {
        color: var(--color-error-700);
    }

    .warning-message {
        color: var(--color-warning-700);
    }
</style>
