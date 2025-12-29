<script lang="ts">
    import type { GenderStats } from '$lib/types/api';

    interface Props {
        stats: GenderStats;
    }

    let { stats }: Props = $props();

    const total = $derived(stats.male + stats.female + stats.other + stats.unknown);

    const segments = $derived([
        { label: 'Male', value: stats.male, color: 'var(--color-blue-500)' },
        { label: 'Female', value: stats.female, color: 'var(--color-pink-500)' },
        { label: 'Other', value: stats.other, color: 'var(--color-purple-500)' },
        { label: 'Unknown', value: stats.unknown, color: 'var(--color-neutral-400)' }
    ].filter((s) => s.value > 0));

    function getPercent(value: number): number {
        return total > 0 ? Math.round((value / total) * 100) : 0;
    }

    function getDonutPath(startAngle: number, endAngle: number, radius: number, innerRadius: number): string {
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        const x1 = 100 + radius * Math.cos(startRad);
        const y1 = 100 + radius * Math.sin(startRad);
        const x2 = 100 + radius * Math.cos(endRad);
        const y2 = 100 + radius * Math.sin(endRad);

        const x3 = 100 + innerRadius * Math.cos(endRad);
        const y3 = 100 + innerRadius * Math.sin(endRad);
        const x4 = 100 + innerRadius * Math.cos(startRad);
        const y4 = 100 + innerRadius * Math.sin(startRad);

        const largeArc = endAngle - startAngle > 180 ? 1 : 0;

        return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4} Z`;
    }

    const paths = $derived(() => {
        const result: { path: string; color: string; label: string; value: number }[] = [];
        let currentAngle = 0;

        for (const segment of segments) {
            const angle = total > 0 ? (segment.value / total) * 360 : 0;
            if (angle > 0) {
                const endAngle = currentAngle + angle;
                result.push({
                    path: getDonutPath(currentAngle, endAngle - 0.5, 80, 50),
                    color: segment.color,
                    label: segment.label,
                    value: segment.value
                });
                currentAngle = endAngle;
            }
        }

        return result;
    });
</script>

<div class="gender-chart">
    <h3 class="chart-title">Gender Distribution</h3>

    {#if total === 0}
        <p class="empty-message">No data available</p>
    {:else}
        <div class="chart-content">
            <svg viewBox="0 0 200 200" role="img" aria-label="Gender distribution chart" class="donut">
                {#each paths() as segment}
                    <path d={segment.path} fill={segment.color} />
                {/each}
                <text x="100" y="95" class="center-value" text-anchor="middle">{total}</text>
                <text x="100" y="115" class="center-label" text-anchor="middle">Total</text>
            </svg>

            <div class="legend">
                {#each segments as segment}
                    <div class="legend-item">
                        <span class="legend-color" style="background-color: {segment.color}"></span>
                        <span class="legend-label">{segment.label}</span>
                        <span class="legend-value">{segment.value} ({getPercent(segment.value)}%)</span>
                    </div>
                {/each}
            </div>
        </div>

        <div class="sr-only">
            {#each segments as segment}
                {segment.label}: {segment.value} ({getPercent(segment.value)}%).
            {/each}
        </div>
    {/if}
</div>

<style>
    .gender-chart {
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

    .chart-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
    }

    @media (min-width: 640px) {
        .chart-content {
            flex-direction: row;
            justify-content: center;
        }
    }

    .donut {
        width: 160px;
        height: 160px;
    }

    .center-value {
        font-size: 24px;
        font-weight: 700;
        fill: var(--color-neutral-800);
    }

    .center-label {
        font-size: 12px;
        fill: var(--color-neutral-500);
    }

    .legend {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
    }

    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
        flex-shrink: 0;
    }

    .legend-label {
        color: var(--color-neutral-700);
        min-width: 60px;
    }

    .legend-value {
        color: var(--color-neutral-500);
    }

    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    }
</style>
