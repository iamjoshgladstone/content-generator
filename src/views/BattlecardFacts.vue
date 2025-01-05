<script setup>
import { useContentStore } from '@/stores/contentStore';
import { supabase } from '@/utils/supabase';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const contentStore = useContentStore();
const competitorUuid = route.params.competitor_uuid;
const facts = ref([]);

const loadFacts = async () => {
    const { data, error } = await supabase.from('competitor_facts').select('*').eq('competitor_uuid', competitorUuid).eq('fact_deleted', 0).order('fact_upvote', { ascending: false });

    if (error) {
        console.error('Error fetching facts:', error);
        return;
    }
    facts.value = data;
};

const handleUpvote = async (factUuid) => {
    const { error } = await supabase
        .from('competitor_facts')
        .update({ fact_upvote: facts.value.find((f) => f.fact_uuid === factUuid).fact_upvote + 1 })
        .eq('fact_uuid', factUuid);

    if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to upvote fact' });
        return;
    }
    await loadFacts();
};

const handleDelete = async (factUuid) => {
    const { error } = await supabase
        .from('competitor_facts')
        .update({
            fact_deleted: facts.value.find((f) => f.fact_uuid === factUuid).fact_deleted + 1
        })
        .eq('fact_uuid', factUuid);

    if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete fact' });
        return;
    }
    await loadFacts();
};

const handleRegenerate = async (factUuid) => {
    const { error } = await supabase
        .from('competitor_facts')
        .update({
            fact_regenerated: facts.value.find((f) => f.fact_uuid === factUuid).fact_regenerated + 1
        })
        .eq('fact_uuid', factUuid);

    if (error) {
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to mark fact for regeneration' });
        return;
    }
    await loadFacts();
};

const regenerateBattlecard = async () => {
    // Get the most upvoted facts
    const upvotedFacts = facts.value.filter((f) => f.fact_upvote > 0).sort((a, b) => b.fact_upvote - a.fact_upvote);

    // Navigate to battlecard generation with upvoted facts context
    contentStore.setCompetitiveFacts(upvotedFacts);
    router.push(`/${route.params.user_id}/${competitorUuid}`);
};

onMounted(loadFacts);
</script>

<template>
    <div class="facts-page">
        <div class="header-actions">
            <Button @click="goBack" icon="pi pi-arrow-left" severity="secondary" text />
            <Button label="Regenerate Battlecard" icon="pi pi-refresh" @click="regenerateBattlecard" severity="primary" />
        </div>

        <div class="facts-list">
            <div v-for="fact in facts" :key="fact.fact_uuid" class="fact-card">
                <div class="fact-content">
                    <div class="fact-type">{{ fact.fact_type }}</div>
                    <div class="fact-text">{{ fact.fact_content }}</div>
                    <div class="fact-meta">
                        <a :href="fact.fact_source" target="_blank" class="source-link">Source</a>
                        <span class="fact-date">{{ new Date(fact.fact_date).toLocaleDateString() }}</span>
                    </div>
                </div>
                <div class="fact-actions">
                    <Button icon="pi pi-thumbs-up" @click="handleUpvote(fact.fact_uuid)" :badge="fact.fact_upvote || ''" severity="success" text />
                    <Button icon="pi pi-refresh" @click="handleRegenerate(fact.fact_uuid)" :badge="fact.fact_regenerated || ''" severity="info" text />
                    <Button icon="pi pi-trash" @click="handleDelete(fact.fact_uuid)" severity="danger" text />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.facts-page {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.header-actions {
    display: flex;
    justify-content: space-between;
    margin-bottom: 2rem;
}

.fact-card {
    @apply bg-white rounded-lg shadow-sm border p-4 mb-4 flex justify-between items-start;
}

.fact-content {
    flex: 1;
}

.fact-type {
    @apply text-sm font-semibold text-gray-600 mb-2;
}

.fact-text {
    @apply text-gray-800 mb-2;
}

.fact-meta {
    @apply text-sm text-gray-500 flex gap-4;
}

.fact-actions {
    @apply flex gap-2;
}

.source-link {
    @apply text-blue-600 hover:text-blue-800 underline;
}
</style>
