<script lang="ts">
    import type { NameStatItem } from '$lib/types/api';

    interface Props {
        firstNames: NameStatItem[];
        lastNames: NameStatItem[];
    }

    let { firstNames, lastNames }: Props = $props();
</script>

<div class="name-stats">
    <div class="name-table-container">
        <h3 class="table-title">Top First Names</h3>
        {#if firstNames.length === 0}
            <p class="empty-message">No data available</p>
        {:else}
            <table class="name-table">
                <thead>
                    <tr>
                        <th class="rank-col">#</th>
                        <th class="name-col">Name</th>
                        <th class="count-col">Count</th>
                    </tr>
                </thead>
                <tbody>
                    {#each firstNames as item, i}
                        <tr>
                            <td class="rank-col">{i + 1}</td>
                            <td class="name-col">{item.name}</td>
                            <td class="count-col">{item.count}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>

    <div class="name-table-container">
        <h3 class="table-title">Top Last Names</h3>
        {#if lastNames.length === 0}
            <p class="empty-message">No data available</p>
        {:else}
            <table class="name-table">
                <thead>
                    <tr>
                        <th class="rank-col">#</th>
                        <th class="name-col">Name</th>
                        <th class="count-col">Count</th>
                    </tr>
                </thead>
                <tbody>
                    {#each lastNames as item, i}
                        <tr>
                            <td class="rank-col">{i + 1}</td>
                            <td class="name-col">{item.name}</td>
                            <td class="count-col">{item.count}</td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        {/if}
    </div>
</div>

<style>
    .name-stats {
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
    }

    @media (min-width: 768px) {
        .name-stats {
            grid-template-columns: repeat(2, 1fr);
        }
    }

    .name-table-container {
        background: white;
        border: 1px solid var(--color-neutral-200);
        border-radius: 8px;
        padding: 16px;
    }

    .table-title {
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

    .name-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
    }

    .name-table th {
        text-align: left;
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-neutral-200);
        color: var(--color-neutral-600);
        font-weight: 500;
    }

    .name-table td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--color-neutral-100);
        color: var(--color-neutral-700);
    }

    .name-table tbody tr:last-child td {
        border-bottom: none;
    }

    .rank-col {
        width: 40px;
        color: var(--color-neutral-400);
    }

    .name-col {
        flex: 1;
    }

    .count-col {
        width: 60px;
        text-align: right;
        font-weight: 500;
    }
</style>
