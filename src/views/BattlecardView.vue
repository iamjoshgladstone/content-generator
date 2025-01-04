<script setup>
import { supabase } from '@/utils/supabase';
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const battlecard = ref(null);

onMounted(async () => {
    const { data, error } = await supabase.from('user_battlecards').select('*').eq('battlecard_uuid', route.params.battlecard_uuid).single();

    if (error) {
        console.error('Error loading battlecard:', error);
        return;
    }

    battlecard.value = data.battlecard_json;
});
</script>

<template>
    <div v-if="battlecard" class="card">
        <!-- Overview Section -->
        <div class="section overview-section">
            <h1 class="section-title">{{ battlecard.overview.title }}</h1>
            <div class="content" v-html="battlecard.overview.bodyHtml"></div>
        </div>

        <!-- Strengths Section -->
        <div class="section strengths-section">
            <div class="content win-content" v-html="battlecard.strengths.bodyHtml"></div>
        </div>

        <!-- Counter Section -->
        <div class="section counter-section">
            <div class="content lose-content" v-html="battlecard.counter.bodyHtml"></div>
        </div>
    </div>
</template>

<style scoped>
.card {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.battlecard-container {
    position: relative;
    padding-top: 3rem;
}

.save-button {
    position: absolute;
    top: 0;
    right: 0;
}

.section {
    @apply mb-8 p-6 border rounded-lg shadow-sm;
}

.section-title {
    @apply text-2xl font-bold mb-4;
}

.overview-section {
    @apply bg-white;
}

.strengths-section {
    @apply bg-green-50;
}

.counter-section {
    @apply bg-red-50;
}

.prospect-url {
    @apply text-sm text-gray-600 mb-2;
}

.sources-container {
    @apply mt-4;
}

.sources-label {
    @apply text-sm font-semibold mb-2 block;
}

.sources-grid {
    @apply flex flex-wrap gap-2;
}

.source-link {
    @apply inline-flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm transition-colors;
}

.source-link.strength {
    @apply bg-green-200 text-green-800 hover:bg-green-300;
}

.source-link.counter {
    @apply bg-red-200 text-red-800 hover:bg-red-300;
}

:deep(h2) {
    @apply text-xl font-semibold mb-4;
}

:deep(h3) {
    @apply text-lg font-semibold mb-3 mt-6;
}

:deep(p) {
    @apply mb-4;
}

:deep(ul) {
    @apply list-disc pl-6 mb-4;
}

:deep(li) {
    @apply mb-2;
}

:deep(.win-summary),
:deep(.lose-summary) {
    @apply font-bold text-lg mb-4;
}

:deep(.context) {
    @apply text-gray-700;
}

:deep(.win-section),
:deep(.lose-section) {
    @apply mb-6;
}

:deep(.win-section h2),
:deep(.lose-section h2) {
    @apply text-xl font-bold mb-4;
}

:deep(.win-section ul),
:deep(.lose-section ul) {
    @apply list-none p-0;
}

:deep(.win-section li),
:deep(.lose-section li) {
    @apply mb-3;
}

.win-content {
    @apply text-green-800;
}

.lose-content {
    @apply text-red-800;
}
</style>
