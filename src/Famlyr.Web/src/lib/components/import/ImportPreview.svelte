<script lang="ts">
    import type { ImportRequest } from '$lib/types/api';

    interface Props {
        data: ImportRequest;
        fileName: string;
    }

    let { data, fileName }: Props = $props();

    const personCount = $derived(data.persons.length);
    const relationshipCount = $derived(data.relationships?.length ?? 0);

    const uniqueLastNames = $derived(() => {
        const names = new Set(
            data.persons
                .map(p => p.lastName)
                .filter((n): n is string => !!n)
        );
        return names.size;
    });

    const dateRange = $derived(() => {
        const years: number[] = [];
        for (const p of data.persons) {
            if (p.birthDate) {
                const year = parseInt(p.birthDate.substring(0, 4));
                if (!isNaN(year)) years.push(year);
            }
            if (p.deathDate) {
                const year = parseInt(p.deathDate.substring(0, 4));
                if (!isNaN(year)) years.push(year);
            }
        }
        if (years.length === 0) return null;
        return { min: Math.min(...years), max: Math.max(...years) };
    });

    const genderCounts = $derived(() => {
        const counts = { Male: 0, Female: 0, Other: 0, Unknown: 0 };
        for (const p of data.persons) {
            const gender = p.gender as keyof typeof counts;
            if (gender in counts) {
                counts[gender]++;
            } else {
                counts.Unknown++;
            }
        }
        return counts;
    });

    const parentRelationships = $derived(
        data.relationships?.filter(r => r.type === 'Parent').length ?? 0
    );

    const spouseRelationships = $derived(
        data.relationships?.filter(r => r.type === 'Spouse').length ?? 0
    );
</script>

<div class="preview-container">
    <div class="file-info">
        <span class="file-icon">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
        </span>
        <span class="file-name">{fileName}</span>
        <span class="badge badge-neutral">v{data.version}</span>
    </div>

    {#if data.metadata?.source}
        <p class="metadata-source">Source: {data.metadata.source}</p>
    {/if}

    <div class="stats-grid">
        <div class="stat-card">
            <span class="stat-value">{personCount}</span>
            <span class="stat-label">Persons</span>
        </div>

        <div class="stat-card">
            <span class="stat-value">{relationshipCount}</span>
            <span class="stat-label">Relationships</span>
        </div>

        <div class="stat-card">
            <span class="stat-value">{uniqueLastNames()}</span>
            <span class="stat-label">Family Names</span>
        </div>

        {#if dateRange()}
            <div class="stat-card">
                <span class="stat-value">{dateRange()?.min} - {dateRange()?.max}</span>
                <span class="stat-label">Date Range</span>
            </div>
        {/if}
    </div>

    <div class="detail-section">
        <h4>Gender Distribution</h4>
        <div class="badge-row">
            {#if genderCounts().Male > 0}
                <span class="badge badge-primary">{genderCounts().Male} Male</span>
            {/if}
            {#if genderCounts().Female > 0}
                <span class="badge badge-accent">{genderCounts().Female} Female</span>
            {/if}
            {#if genderCounts().Other > 0}
                <span class="badge badge-secondary">{genderCounts().Other} Other</span>
            {/if}
            {#if genderCounts().Unknown > 0}
                <span class="badge badge-neutral">{genderCounts().Unknown} Unknown</span>
            {/if}
        </div>
    </div>

    {#if relationshipCount > 0}
        <div class="detail-section">
            <h4>Relationship Types</h4>
            <div class="badge-row">
                {#if parentRelationships > 0}
                    <span class="badge badge-parent">{parentRelationships} Parent-Child</span>
                {/if}
                {#if spouseRelationships > 0}
                    <span class="badge badge-spouse">{spouseRelationships} Spouse</span>
                {/if}
            </div>
        </div>
    {/if}

    {#if data.tree}
        <div class="detail-section">
            <h4>Tree Info</h4>
            <p class="tree-name">{data.tree.name}</p>
            {#if data.tree.description}
                <p class="tree-description">{data.tree.description}</p>
            {/if}
        </div>
    {/if}
</div>

<style>
    .preview-container {
        padding: 1.5rem;
        background-color: white;
        border: 1px solid var(--color-neutral-200);
        border-radius: 0.75rem;
    }

    .file-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid var(--color-neutral-200);
    }

    .file-icon {
        color: var(--color-neutral-500);
    }

    .file-name {
        font-weight: 500;
        color: var(--color-neutral-800);
        flex: 1;
    }

    .metadata-source {
        font-size: 0.875rem;
        color: var(--color-neutral-600);
        margin: 0 0 1rem 0;
    }

    .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    .stat-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 1rem;
        background-color: var(--color-neutral-50);
        border-radius: 0.5rem;
    }

    .stat-value {
        font-size: 1.5rem;
        font-weight: 600;
        color: var(--color-primary-700);
    }

    .stat-label {
        font-size: 0.75rem;
        color: var(--color-neutral-500);
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .detail-section {
        margin-bottom: 1rem;
    }

    .detail-section h4 {
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--color-neutral-600);
        margin: 0 0 0.5rem 0;
    }

    .badge-row {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
    }

    .tree-name {
        font-weight: 500;
        color: var(--color-neutral-800);
        margin: 0;
    }

    .tree-description {
        font-size: 0.875rem;
        color: var(--color-neutral-600);
        margin: 0.25rem 0 0 0;
    }
</style>
