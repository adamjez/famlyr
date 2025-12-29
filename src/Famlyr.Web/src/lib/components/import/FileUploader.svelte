<script lang="ts">
    import type { ImportRequest } from '$lib/types/api';

    interface Props {
        onFileLoaded: (data: ImportRequest, fileName: string) => void;
        onError: (message: string) => void;
    }

    let { onFileLoaded, onError }: Props = $props();

    let isDragging = $state(false);
    let fileInput: HTMLInputElement;

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        isDragging = true;
    }

    function handleDragLeave(e: DragEvent) {
        e.preventDefault();
        isDragging = false;
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        isDragging = false;

        const file = e.dataTransfer?.files[0];
        if (file) {
            processFile(file);
        }
    }

    function handleFileSelect(e: Event) {
        const input = e.target as HTMLInputElement;
        const file = input.files?.[0];
        if (file) {
            processFile(file);
        }
    }

    function processFile(file: File) {
        if (!file.name.endsWith('.json')) {
            onError('Please select a JSON file');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            onError('File size exceeds 50MB limit');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content) as ImportRequest;

                if (!data.version) {
                    onError('Invalid import file: missing version field');
                    return;
                }

                if (!data.persons || !Array.isArray(data.persons)) {
                    onError('Invalid import file: missing persons array');
                    return;
                }

                onFileLoaded(data, file.name);
            } catch {
                onError('Invalid JSON file');
            }
        };
        reader.onerror = () => {
            onError('Failed to read file');
        };
        reader.readAsText(file);
    }

    function openFilePicker() {
        fileInput.click();
    }
</script>

<div
    class="upload-zone"
    class:dragging={isDragging}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
    role="button"
    tabindex="0"
    onclick={openFilePicker}
    onkeydown={(e) => e.key === 'Enter' && openFilePicker()}
>
    <input
        type="file"
        accept=".json"
        bind:this={fileInput}
        onchange={handleFileSelect}
        class="hidden-input"
    />

    <div class="upload-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="48" height="48">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
    </div>

    <p class="upload-title">
        {#if isDragging}
            Drop your file here
        {:else}
            Drag and drop a JSON file here
        {/if}
    </p>
    <p class="upload-subtitle">or click to browse</p>
    <p class="upload-hint">Max file size: 50MB</p>
</div>

<style>
    .upload-zone {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 2rem;
        border: 2px dashed var(--color-neutral-300);
        border-radius: 0.75rem;
        background-color: var(--color-neutral-50);
        cursor: pointer;
        transition: all 200ms;
    }

    .upload-zone:hover {
        border-color: var(--color-primary-400);
        background-color: var(--color-primary-50);
    }

    .upload-zone.dragging {
        border-color: var(--color-primary-500);
        background-color: var(--color-primary-100);
    }

    .hidden-input {
        display: none;
    }

    .upload-icon {
        color: var(--color-neutral-400);
        margin-bottom: 1rem;
    }

    .upload-zone:hover .upload-icon,
    .upload-zone.dragging .upload-icon {
        color: var(--color-primary-500);
    }

    .upload-title {
        font-size: 1.125rem;
        font-weight: 500;
        color: var(--color-neutral-700);
        margin: 0 0 0.25rem 0;
    }

    .upload-subtitle {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
        margin: 0 0 1rem 0;
    }

    .upload-hint {
        font-size: 0.75rem;
        color: var(--color-neutral-400);
        margin: 0;
    }
</style>
