<script lang="ts">
    import '../app.css';
    import Toast from '$lib/components/Toast.svelte';
    import { getLocale, setLocale, t } from '$lib/i18n.svelte';
    let { children } = $props();

    $effect(() => {
        document.documentElement.lang = getLocale();
    });
</script>

<div class="min-h-screen bg-neutral-50">
    <header class="bg-white border-b border-neutral-200">
        <nav class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="flex h-16 items-center justify-between">
                <div class="flex items-center gap-8">
                    <a href="/" class="flex items-center gap-2 text-xl font-semibold text-neutral-900 tracking-tight hover:text-primary-600 transition-colors">
                        <img src="/logo.svg" alt="" class="h-8 w-8" />
                        Famlyr
                    </a>
                    <a href="/" class="text-sm font-medium text-neutral-600 hover:text-primary-600 transition-colors">
                        {t('familyTrees')}
                    </a>
                    <a href="/import" class="text-sm font-medium text-neutral-600 hover:text-primary-600 transition-colors">
                        {t('import')}
                    </a>
                </div>
                <label class="flex items-center gap-2 text-sm text-neutral-600">
                    <span>{t('language')}</span>
                    <select
                        class="rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-800"
                        value={getLocale()}
                        onchange={(event) => setLocale(event.currentTarget.value as 'en' | 'cs')}
                        aria-label={t('language')}
                    >
                        <option value="en">{t('english')}</option>
                        <option value="cs">{t('czech')}</option>
                    </select>
                </label>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {@render children()}
    </main>
</div>

<Toast />
