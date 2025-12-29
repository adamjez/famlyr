<script lang="ts">
    import type { SummaryStats } from '$lib/types/api';

    interface Props {
        summary: SummaryStats;
    }

    let { summary }: Props = $props();

    const birthDatePercent = $derived(
        summary.totalPersons > 0
            ? Math.round((summary.personsWithBirthDate / summary.totalPersons) * 100)
            : 0
    );

    const deathDatePercent = $derived(
        summary.totalPersons > 0
            ? Math.round((summary.personsWithDeathDate / summary.totalPersons) * 100)
            : 0
    );
</script>

<div class="summary-cards">
    <div class="card">
        <p class="card-value">{summary.totalPersons}</p>
        <p class="card-label">Total Persons</p>
    </div>

    <div class="card">
        <p class="card-value">{summary.livingPersons}</p>
        <p class="card-label">Living</p>
        <p class="card-note">without death date</p>
    </div>

    <div class="card">
        <p class="card-value">{birthDatePercent}%</p>
        <p class="card-label">Birth Dates</p>
        <p class="card-note">{summary.personsWithBirthDate} of {summary.totalPersons}</p>
    </div>

    <div class="card">
        <p class="card-value">{deathDatePercent}%</p>
        <p class="card-label">Death Dates</p>
        <p class="card-note">{summary.personsWithDeathDate} of {summary.totalPersons}</p>
    </div>
</div>

<style>
    .summary-cards {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
    }

    @media (min-width: 768px) {
        .summary-cards {
            grid-template-columns: repeat(4, 1fr);
        }
    }

    .card {
        background: white;
        border: 1px solid var(--color-neutral-200);
        border-radius: 8px;
        padding: 16px;
        text-align: center;
    }

    .card-value {
        font-size: 28px;
        font-weight: 700;
        color: var(--color-primary-600);
        margin: 0;
    }

    .card-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--color-neutral-700);
        margin: 4px 0 0 0;
    }

    .card-note {
        font-size: 12px;
        color: var(--color-neutral-500);
        margin: 2px 0 0 0;
    }
</style>
