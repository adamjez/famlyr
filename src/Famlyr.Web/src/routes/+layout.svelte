<script lang="ts">
    import '../app.css';
    let { children } = $props();
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
                        Family Trees
                    </a>
                    <a href="/import" class="text-sm font-medium text-neutral-600 hover:text-primary-600 transition-colors">
                        Import
                    </a>
                </div>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {@render children()}
    </main>
</div>
