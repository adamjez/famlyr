<script lang="ts">
    import '../app.css';
    let { children } = $props();
</script>

<div class="min-h-screen bg-neutral-50">
    <header class="bg-white border-b border-neutral-200">
        <nav class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="flex h-16 items-center justify-between">
                <div class="flex items-center">
                    <a href="/" class="text-xl font-semibold text-neutral-900 tracking-tight hover:text-primary-600 transition-colors">
                        Famlyr
                    </a>
                </div>
            </div>
        </nav>
    </header>

    <main class="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {@render children()}
    </main>
</div>
