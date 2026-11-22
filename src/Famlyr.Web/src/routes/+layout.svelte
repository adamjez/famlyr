<script lang="ts">
    import '../app.css';
    import Toast from '$lib/components/Toast.svelte';
    import { getLocale, setLocale, t, type Locale } from '$lib/i18n.svelte';
    let { children } = $props();
    let languageMenu: HTMLDetailsElement;

    function chooseLocale(nextLocale: Locale) {
        setLocale(nextLocale);
        languageMenu.open = false;
    }

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
                <details class="language-menu" bind:this={languageMenu}>
                    <summary class="language-trigger" aria-label={t('language')}>
                        <img
                            src={getLocale() === 'en' ? '/flags/gb.svg' : '/flags/cz.svg'}
                            alt=""
                            class="language-flag"
                        />
                        <span>{getLocale() === 'en' ? t('english') : t('czech')}</span>
                        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path d="m5 7.5 5 5 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </summary>
                    <div class="language-options" role="group" aria-label={t('language')}>
                        <button
                            type="button"
                            class="language-option"
                            aria-pressed={getLocale() === 'en'}
                            onclick={() => chooseLocale('en')}
                        >
                            <img src="/flags/gb.svg" alt="" class="language-flag" />
                            <span>{t('english')}</span>
                        </button>
                        <button
                            type="button"
                            class="language-option"
                            aria-pressed={getLocale() === 'cs'}
                            onclick={() => chooseLocale('cs')}
                        >
                            <img src="/flags/cz.svg" alt="" class="language-flag" />
                            <span>{t('czech')}</span>
                        </button>
                    </div>
                </details>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {@render children()}
    </main>
</div>

<Toast />

<style>
    .language-menu {
        position: relative;
        color: var(--color-neutral-700);
        font-size: 0.875rem;
    }

    .language-trigger {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-height: 2.25rem;
        padding: 0.375rem 0.625rem;
        border: 1px solid var(--color-neutral-300);
        border-radius: 0.5rem;
        background: white;
        cursor: pointer;
        list-style: none;
    }

    .language-trigger::-webkit-details-marker {
        display: none;
    }

    .language-trigger svg {
        width: 1rem;
        height: 1rem;
        color: var(--color-neutral-500);
    }

    .language-flag {
        display: block;
        width: 1.5rem;
        height: 1rem;
        flex: none;
        border: 1px solid rgb(0 0 0 / 0.1);
        border-radius: 0.125rem;
        object-fit: cover;
    }

    .language-options {
        position: absolute;
        top: calc(100% + 0.375rem);
        right: 0;
        z-index: 20;
        min-width: 10rem;
        padding: 0.25rem;
        border: 1px solid var(--color-neutral-200);
        border-radius: 0.5rem;
        background: white;
        box-shadow: 0 8px 20px rgb(0 0 0 / 0.12);
    }

    .language-option {
        display: flex;
        align-items: center;
        gap: 0.625rem;
        width: 100%;
        padding: 0.5rem;
        border: 0;
        border-radius: 0.375rem;
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
    }

    .language-option:hover,
    .language-option[aria-pressed='true'] {
        background: var(--color-neutral-100);
    }
</style>
