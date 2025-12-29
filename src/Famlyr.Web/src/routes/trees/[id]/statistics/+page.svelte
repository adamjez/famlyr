<script lang="ts">
    import type { PageData } from "./$types";
    import SummaryCards from "$lib/components/statistics/SummaryCards.svelte";
    import NameStatsSection from "$lib/components/statistics/NameStatsSection.svelte";
    import BarChart from "$lib/components/statistics/BarChart.svelte";
    import GenderChart from "$lib/components/statistics/GenderChart.svelte";
    import LifespanStats from "$lib/components/statistics/LifespanStats.svelte";

    let { data }: { data: PageData } = $props();

    const weekdayData = $derived(
        data.statistics.birthWeekdayStats.map((s) => ({
            label: s.label.substring(0, 3),
            value: s.count
        }))
    );

    const monthData = $derived(
        data.statistics.birthMonthStats.map((s) => ({
            label: s.label.substring(0, 3),
            value: s.count
        }))
    );

    const dayOfMonthData = $derived(
        data.statistics.birthDayOfMonthStats.map((s) => ({
            label: String(s.day),
            value: s.count
        }))
    );

    const decadeData = $derived(
        data.statistics.birthDecadeStats.map((s) => ({
            label: String(s.decade) + 's',
            value: s.count
        }))
    );

    const fullBirthDatesCount = $derived(
        data.statistics.birthWeekdayStats.reduce((sum, s) => sum + s.count, 0)
    );

    const monthDatesCount = $derived(
        data.statistics.birthMonthStats.reduce((sum, s) => sum + s.count, 0)
    );
</script>

<svelte:head>
    <title>Statistics - {data.tree.name} - Famlyr</title>
</svelte:head>

<div class="space-y-8">
    <!-- Breadcrumb -->
    <nav class="flex items-center gap-2 text-sm text-neutral-500">
        <a href="/" class="hover:text-primary-600 transition-colors">Family Trees</a>
        <span>/</span>
        <a href="/trees/{data.tree.id}" class="hover:text-primary-600 transition-colors"
            >{data.tree.name}</a
        >
        <span>/</span>
        <span class="text-neutral-900">Statistics</span>
    </nav>

    <!-- Header -->
    <div class="flex items-center justify-between">
        <div>
            <h1>Statistics</h1>
            <p class="mt-1 text-neutral-600">{data.tree.name}</p>
        </div>
        <a href="/trees/{data.tree.id}" class="btn btn-secondary">Back to Tree</a>
    </div>

    <!-- Summary Cards -->
    <section>
        <h2 class="section-title">Overview</h2>
        <SummaryCards summary={data.statistics.summary} />
    </section>

    <!-- Gender & Lifespan -->
    <section>
        <h2 class="section-title">Demographics</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GenderChart stats={data.statistics.genderStats} />
            <LifespanStats stats={data.statistics.lifespanStats} />
        </div>
    </section>

    <!-- Name Statistics -->
    <section>
        <h2 class="section-title">Name Analysis</h2>
        <NameStatsSection
            firstNames={data.statistics.firstNameStats}
            lastNames={data.statistics.lastNameStats}
        />
    </section>

    <!-- Birth Date Charts -->
    <section>
        <h2 class="section-title">Birth Date Patterns</h2>
        {#if fullBirthDatesCount > 0}
            <p class="text-sm text-neutral-500 mb-4">
                Based on {fullBirthDatesCount} persons with complete birth dates
            </p>
        {/if}
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BarChart
                data={weekdayData}
                title="Births by Weekday"
                emptyMessage="No complete birth dates recorded"
            />
            <BarChart
                data={monthData}
                title="Births by Month"
                emptyMessage="No birth months recorded"
            />
        </div>
        <div class="mt-4">
            <BarChart
                data={dayOfMonthData}
                title="Births by Day of Month"
                emptyMessage="No complete birth dates recorded"
            />
        </div>
    </section>

    <!-- Decade Distribution -->
    <section>
        <h2 class="section-title">Generational Distribution</h2>
        <BarChart
            data={decadeData}
            title="Births by Decade"
            emptyMessage="No birth years recorded"
        />
    </section>
</div>

<style>
    .section-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-neutral-800);
        margin-bottom: 16px;
    }

    section {
        margin-bottom: 32px;
    }
</style>
