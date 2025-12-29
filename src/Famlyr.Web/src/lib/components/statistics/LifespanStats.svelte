<script lang="ts">
    import type { LifespanStats } from '$lib/types/api';

    interface Props {
        stats: LifespanStats;
    }

    let { stats }: Props = $props();

    const hasData = $derived(stats.personsWithLifespan > 0);
</script>

<div class="lifespan-stats">
    <h3 class="chart-title">Lifespan Statistics</h3>

    {#if !hasData}
        <p class="empty-message">
            Insufficient data. Lifespan requires both birth and death dates.
        </p>
    {:else}
        <p class="data-note">Based on {stats.personsWithLifespan} persons with complete dates</p>

        <div class="stats-grid">
            <div class="stat-item">
                <div class="stat-icon average">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                    </svg>
                </div>
                <div class="stat-content">
                    <p class="stat-value">{stats.averageLifespanYears} years</p>
                    <p class="stat-label">Average Lifespan</p>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon oldest">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v20M17 7l-5-5-5 5" />
                    </svg>
                </div>
                <div class="stat-content">
                    <p class="stat-value">{stats.oldestDeathAge} years</p>
                    <p class="stat-label">Oldest</p>
                </div>
            </div>

            <div class="stat-item">
                <div class="stat-icon youngest">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 22V2M7 17l5 5 5-5" />
                    </svg>
                </div>
                <div class="stat-content">
                    <p class="stat-value">{stats.youngestDeathAge} years</p>
                    <p class="stat-label">Youngest</p>
                </div>
            </div>
        </div>
    {/if}
</div>

<style>
    .lifespan-stats {
        background: white;
        border: 1px solid var(--color-neutral-200);
        border-radius: 8px;
        padding: 16px;
    }

    .chart-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-neutral-700);
        margin: 0 0 12px 0;
    }

    .empty-message {
        color: var(--color-neutral-500);
        font-size: 14px;
        text-align: center;
        padding: 24px 0;
    }

    .data-note {
        font-size: 12px;
        color: var(--color-neutral-500);
        margin: 0 0 16px 0;
    }

    .stats-grid {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .stat-item {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .stat-icon {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .stat-icon.average {
        background-color: var(--color-amber-100);
        color: var(--color-amber-600);
    }

    .stat-icon.oldest {
        background-color: var(--color-green-100);
        color: var(--color-green-600);
    }

    .stat-icon.youngest {
        background-color: var(--color-red-100);
        color: var(--color-red-600);
    }

    .stat-content {
        flex: 1;
    }

    .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-neutral-800);
        margin: 0;
    }

    .stat-label {
        font-size: 12px;
        color: var(--color-neutral-500);
        margin: 2px 0 0 0;
    }
</style>
