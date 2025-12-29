<script lang="ts">
    interface DataItem {
        label: string;
        value: number;
    }

    interface Props {
        data: DataItem[];
        title: string;
        emptyMessage?: string;
    }

    let { data, title, emptyMessage = 'No data available' }: Props = $props();

    const maxValue = $derived(Math.max(...data.map((d) => d.value), 1));
    const hasData = $derived(data.some((d) => d.value > 0));

    const barWidth = 32;
    const barGap = 8;
    const chartHeight = 160;
    const labelHeight = 24;
    const topPadding = 20;

    const chartWidth = $derived(data.length * (barWidth + barGap) - barGap + 40);
</script>

<div class="bar-chart">
    <h3 class="chart-title">{title}</h3>

    {#if !hasData}
        <p class="empty-message">{emptyMessage}</p>
    {:else}
        <div class="chart-container">
            <svg
                viewBox="0 0 {chartWidth} {chartHeight + labelHeight + topPadding}"
                role="img"
                aria-label={title}
                class="chart-svg"
            >
                {#each data as item, i}
                    {@const barHeight = (item.value / maxValue) * chartHeight}
                    {@const x = 20 + i * (barWidth + barGap)}
                    {@const y = topPadding + chartHeight - barHeight}

                    <rect
                        {x}
                        {y}
                        width={barWidth}
                        height={barHeight}
                        class="bar"
                        rx="4"
                    />

                    {#if item.value > 0}
                        <text
                            x={x + barWidth / 2}
                            y={y - 4}
                            class="value-label"
                            text-anchor="middle"
                        >
                            {item.value}
                        </text>
                    {/if}

                    <text
                        x={x + barWidth / 2}
                        y={topPadding + chartHeight + 16}
                        class="axis-label"
                        text-anchor="middle"
                    >
                        {item.label}
                    </text>
                {/each}
            </svg>
        </div>

        <div class="sr-only">
            {#each data as item}
                {item.label}: {item.value}.
            {/each}
        </div>
    {/if}
</div>

<style>
    .bar-chart {
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

    .chart-container {
        overflow-x: auto;
    }

    .chart-svg {
        display: block;
        min-width: 100%;
        height: auto;
    }

    .bar {
        fill: var(--color-primary-500);
    }

    .value-label {
        font-size: 11px;
        fill: var(--color-neutral-600);
    }

    .axis-label {
        font-size: 11px;
        fill: var(--color-neutral-500);
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
