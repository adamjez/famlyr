<script lang="ts">
    import type { ImportRequest, ImportResponse, FamilyTreeSummaryModel } from '$lib/types/api';
    import { goto } from '$app/navigation';
    import FileUploader from '$lib/components/import/FileUploader.svelte';
    import ImportPreview from '$lib/components/import/ImportPreview.svelte';
    import ValidationResults from '$lib/components/import/ValidationResults.svelte';
    import { importIntoExistingTree, importWithNewTree } from '$lib/api/import';
    import { getFamilyTrees } from '$lib/api/familyTree';

    type ImportMode = 'new' | 'existing';
    type Step = 'upload' | 'configure' | 'review' | 'complete';

    let step = $state<Step>('upload');
    let importData = $state<ImportRequest | null>(null);
    let fileName = $state('');
    let parseError = $state('');

    let importMode = $state<ImportMode>('new');
    let selectedTreeId = $state('');
    let treeName = $state('');
    let treeDescription = $state('');

    let existingTrees = $state<FamilyTreeSummaryModel[]>([]);
    let isLoadingTrees = $state(false);

    let validationResult = $state<ImportResponse | null>(null);
    let isValidating = $state(false);

    let importResult = $state<ImportResponse | null>(null);
    let isImporting = $state(false);
    let importError = $state('');

    function handleFileLoaded(data: ImportRequest, name: string) {
        importData = data;
        fileName = name;
        parseError = '';

        if (data.tree) {
            treeName = data.tree.name;
            treeDescription = data.tree.description ?? '';
        }

        step = 'configure';
        loadExistingTrees();
    }

    function handleFileError(message: string) {
        parseError = message;
        importData = null;
    }

    async function loadExistingTrees() {
        isLoadingTrees = true;
        try {
            const response = await getFamilyTrees();
            existingTrees = response.trees;
        } catch {
            existingTrees = [];
        } finally {
            isLoadingTrees = false;
        }
    }

    async function validateImport() {
        if (!importData) return;

        isValidating = true;
        validationResult = null;

        try {
            const request = prepareRequest();

            if (importMode === 'existing' && selectedTreeId) {
                validationResult = await importIntoExistingTree(selectedTreeId, request, true);
            } else {
                validationResult = await importWithNewTree(request, true);
            }

            if (validationResult.success) {
                step = 'review';
            }
        } catch (err) {
            validationResult = {
                success: false,
                dryRun: true,
                errors: [{ type: 'NETWORK_ERROR', message: 'Failed to validate import. Please try again.' }]
            };
        } finally {
            isValidating = false;
        }
    }

    async function executeImport() {
        if (!importData) return;

        isImporting = true;
        importError = '';

        try {
            const request = prepareRequest();

            if (importMode === 'existing' && selectedTreeId) {
                importResult = await importIntoExistingTree(selectedTreeId, request, false);
            } else {
                importResult = await importWithNewTree(request, false);
            }

            if (importResult.success) {
                step = 'complete';
            } else {
                importError = 'Import failed. Please check the errors below.';
            }
        } catch (err) {
            importError = 'Failed to import. Please try again.';
        } finally {
            isImporting = false;
        }
    }

    function prepareRequest(): ImportRequest {
        const request: ImportRequest = {
            version: importData!.version,
            metadata: importData!.metadata,
            persons: importData!.persons,
            relationships: importData!.relationships
        };

        if (importMode === 'new') {
            request.tree = {
                name: treeName,
                description: treeDescription || undefined
            };
        }

        return request;
    }

    function reset() {
        step = 'upload';
        importData = null;
        fileName = '';
        parseError = '';
        importMode = 'new';
        selectedTreeId = '';
        treeName = '';
        treeDescription = '';
        validationResult = null;
        importResult = null;
        importError = '';
    }

    function goToTree() {
        const treeId = importResult?.treeId ?? selectedTreeId;
        if (treeId) {
            goto(`/trees/${treeId}`);
        } else {
            goto('/');
        }
    }

    const canValidate = $derived(
        importData &&
        (importMode === 'existing' ? selectedTreeId !== '' : treeName.trim() !== '')
    );
</script>

<svelte:head>
    <title>Import Family Tree - Famlyr</title>
</svelte:head>

<div class="import-page">
    <div class="header">
        <a href="/" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back
        </a>
        <h1>Import Family Tree</h1>
    </div>

    <div class="steps">
        <div class="step" class:active={step === 'upload'} class:completed={step !== 'upload'}>
            <span class="step-number">1</span>
            <span class="step-label">Upload</span>
        </div>
        <div class="step-connector"></div>
        <div class="step" class:active={step === 'configure'} class:completed={step === 'review' || step === 'complete'}>
            <span class="step-number">2</span>
            <span class="step-label">Configure</span>
        </div>
        <div class="step-connector"></div>
        <div class="step" class:active={step === 'review'} class:completed={step === 'complete'}>
            <span class="step-number">3</span>
            <span class="step-label">Review</span>
        </div>
        <div class="step-connector"></div>
        <div class="step" class:active={step === 'complete'}>
            <span class="step-number">4</span>
            <span class="step-label">Complete</span>
        </div>
    </div>

    <div class="content">
        {#if step === 'upload'}
            <div class="card">
                <h2>Upload JSON File</h2>
                <p class="description">
                    Upload a JSON file containing family tree data. The file should follow the
                    Famlyr import schema with persons and relationships.
                </p>

                <FileUploader onFileLoaded={handleFileLoaded} onError={handleFileError} />

                {#if parseError}
                    <p class="error-text mt-4">{parseError}</p>
                {/if}
            </div>

        {:else if step === 'configure'}
            <div class="two-column">
                <div class="card">
                    <h2>Import Configuration</h2>

                    <div class="form-section">
                        <label class="label">Import Mode</label>
                        <div class="radio-group">
                            <label class="radio-option">
                                <input type="radio" bind:group={importMode} value="new" />
                                <span class="radio-label">
                                    <strong>Create New Tree</strong>
                                    <span class="radio-description">Import data into a new family tree</span>
                                </span>
                            </label>
                            <label class="radio-option">
                                <input type="radio" bind:group={importMode} value="existing" />
                                <span class="radio-label">
                                    <strong>Add to Existing Tree</strong>
                                    <span class="radio-description">Import data into an existing family tree</span>
                                </span>
                            </label>
                        </div>
                    </div>

                    {#if importMode === 'new'}
                        <div class="form-section">
                            <label class="label" for="tree-name">Tree Name</label>
                            <input
                                type="text"
                                id="tree-name"
                                class="input"
                                bind:value={treeName}
                                placeholder="Enter tree name"
                                maxlength="100"
                            />
                        </div>

                        <div class="form-section">
                            <label class="label" for="tree-description">Description (optional)</label>
                            <textarea
                                id="tree-description"
                                class="input"
                                bind:value={treeDescription}
                                placeholder="Enter description"
                                rows="3"
                                maxlength="500"
                            ></textarea>
                        </div>
                    {:else}
                        <div class="form-section">
                            <label class="label" for="tree-select">Select Tree</label>
                            {#if isLoadingTrees}
                                <p class="helper-text">Loading trees...</p>
                            {:else if existingTrees.length === 0}
                                <p class="helper-text">No existing trees found. Create a new tree instead.</p>
                            {:else}
                                <select
                                    id="tree-select"
                                    class="input"
                                    bind:value={selectedTreeId}
                                >
                                    <option value="">Select a tree...</option>
                                    {#each existingTrees as tree}
                                        <option value={tree.id}>
                                            {tree.name} ({tree.personCount} persons)
                                        </option>
                                    {/each}
                                </select>
                            {/if}
                        </div>
                    {/if}

                    {#if validationResult && !validationResult.success}
                        <div class="mt-4">
                            <ValidationResults errors={validationResult.errors} />
                        </div>
                    {/if}

                    <div class="button-row">
                        <button class="btn btn-secondary" onclick={() => step = 'upload'}>
                            Back
                        </button>
                        <button
                            class="btn btn-primary"
                            onclick={validateImport}
                            disabled={!canValidate || isValidating}
                        >
                            {isValidating ? 'Validating...' : 'Validate & Continue'}
                        </button>
                    </div>
                </div>

                <div>
                    {#if importData}
                        <ImportPreview data={importData} {fileName} />
                    {/if}
                </div>
            </div>

        {:else if step === 'review'}
            <div class="card">
                <h2>Review Import</h2>

                <div class="success-banner">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="24" height="24">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <div>
                        <strong>Validation Passed</strong>
                        <p>Your import file is valid and ready to import.</p>
                    </div>
                </div>

                {#if validationResult?.summary}
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span class="summary-value">{validationResult.summary.personsCreated}</span>
                            <span class="summary-label">Persons to Create</span>
                        </div>
                        <div class="summary-item">
                            <span class="summary-value">{validationResult.summary.relationshipsCreated}</span>
                            <span class="summary-label">Relationships to Create</span>
                        </div>
                    </div>

                    {#if validationResult.summary.warnings.length > 0}
                        <ValidationResults warnings={validationResult.summary.warnings} />
                    {/if}
                {/if}

                {#if importError}
                    <p class="error-text mt-4">{importError}</p>
                {/if}

                {#if importResult && !importResult.success}
                    <div class="mt-4">
                        <ValidationResults errors={importResult.errors} />
                    </div>
                {/if}

                <div class="button-row">
                    <button class="btn btn-secondary" onclick={() => step = 'configure'}>
                        Back
                    </button>
                    <button
                        class="btn btn-primary"
                        onclick={executeImport}
                        disabled={isImporting}
                    >
                        {isImporting ? 'Importing...' : 'Import Now'}
                    </button>
                </div>
            </div>

        {:else if step === 'complete'}
            <div class="card text-center">
                <div class="success-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="64" height="64">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                </div>

                <h2>Import Complete!</h2>

                {#if importResult?.summary}
                    <p class="complete-summary">
                        Successfully imported <strong>{importResult.summary.personsCreated} persons</strong>
                        and <strong>{importResult.summary.relationshipsCreated} relationships</strong>.
                    </p>
                {/if}

                <div class="button-row justify-center">
                    <button class="btn btn-secondary" onclick={reset}>
                        Import Another
                    </button>
                    <button class="btn btn-primary" onclick={goToTree}>
                        View Tree
                    </button>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .import-page {
        max-width: 1000px;
        margin: 0 auto;
        padding: 2rem 1rem;
    }

    .header {
        margin-bottom: 2rem;
    }

    .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--color-neutral-600);
        font-size: 0.875rem;
        margin-bottom: 0.5rem;
    }

    .back-link:hover {
        color: var(--color-primary-600);
    }

    .header h1 {
        margin: 0;
    }

    .steps {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        margin-bottom: 2rem;
    }

    .step {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        border-radius: 9999px;
        background-color: var(--color-neutral-100);
        color: var(--color-neutral-500);
        font-size: 0.875rem;
        transition: all 200ms;
    }

    .step.active {
        background-color: var(--color-primary-600);
        color: white;
    }

    .step.completed {
        background-color: var(--color-success-100);
        color: var(--color-success-700);
    }

    .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 9999px;
        background-color: currentColor;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
    }

    .step.active .step-number,
    .step.completed .step-number {
        background-color: white;
        color: var(--color-primary-600);
    }

    .step.completed .step-number {
        color: var(--color-success-700);
    }

    .step-connector {
        width: 2rem;
        height: 2px;
        background-color: var(--color-neutral-200);
    }

    .step-label {
        display: none;
    }

    @media (min-width: 640px) {
        .step-label {
            display: inline;
        }
    }

    .content h2 {
        margin: 0 0 0.5rem 0;
        font-size: 1.25rem;
    }

    .description {
        color: var(--color-neutral-600);
        margin: 0 0 1.5rem 0;
    }

    .two-column {
        display: grid;
        gap: 1.5rem;
    }

    @media (min-width: 768px) {
        .two-column {
            grid-template-columns: 1fr 1fr;
        }
    }

    .form-section {
        margin-bottom: 1.5rem;
    }

    .form-section .label {
        margin-bottom: 0.5rem;
    }

    .radio-group {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
    }

    .radio-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 1rem;
        border: 1px solid var(--color-neutral-200);
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 150ms;
    }

    .radio-option:hover {
        border-color: var(--color-primary-300);
    }

    .radio-option:has(input:checked) {
        border-color: var(--color-primary-500);
        background-color: var(--color-primary-50);
    }

    .radio-option input {
        margin-top: 0.25rem;
    }

    .radio-label {
        display: flex;
        flex-direction: column;
    }

    .radio-label strong {
        color: var(--color-neutral-800);
    }

    .radio-description {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
    }

    .button-row {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .justify-center {
        justify-content: center;
    }

    .success-banner {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        padding: 1rem;
        background-color: var(--color-success-50);
        border: 1px solid var(--color-success-100);
        border-radius: 0.5rem;
        margin-bottom: 1.5rem;
        color: var(--color-success-700);
    }

    .success-banner strong {
        display: block;
        color: var(--color-success-800);
    }

    .success-banner p {
        margin: 0.25rem 0 0 0;
        font-size: 0.875rem;
    }

    .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .summary-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background-color: var(--color-neutral-50);
        border-radius: 0.5rem;
    }

    .summary-value {
        font-size: 2rem;
        font-weight: 600;
        color: var(--color-primary-700);
    }

    .summary-label {
        font-size: 0.875rem;
        color: var(--color-neutral-500);
    }

    .success-icon {
        display: flex;
        justify-content: center;
        margin-bottom: 1rem;
        color: var(--color-success-500);
    }

    .text-center {
        text-align: center;
    }

    .complete-summary {
        color: var(--color-neutral-600);
        margin-bottom: 1.5rem;
    }

    .mt-4 {
        margin-top: 1rem;
    }

    textarea.input {
        resize: vertical;
        min-height: 5rem;
    }
</style>
