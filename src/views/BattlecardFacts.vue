<script setup>
import { useContentStore } from '@/stores/contentStore';
import { supabase } from '@/utils/supabase';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const contentStore = useContentStore();
const competitorUuid = route.params.competitor_uuid;
const facts = ref([]);

onMounted(async () => {
    // Get all facts used in the battlecard
    const usedFactUuids = new Set([
        ...(contentStore.battlecardData?.overview?.factsUsed || []),
        ...(contentStore.battlecardData?.strengths?.sections?.flatMap((s) => s.factsUsed) || []),
        ...(contentStore.battlecardData?.counter?.sections?.flatMap((s) => s.factsUsed) || [])
    ]);

    // Fetch all facts for this competitor
    const { data, error } = await supabase.from('competitor_facts').select('*').eq('competitor_uuid', competitorUuid);

    if (error) {
        console.error('Error fetching facts:', error);
        return;
    }

    // Filter facts to only include those used in the battlecard
    facts.value = data.filter((fact) => usedFactUuids.has(fact.fact_uuid));
});

const formatDate = (date) => {
    return new Date(date).toLocaleDateString();
};

const goBack = () => {
    router.back();
};
</script>

<template>
    <Button @click="goBack" icon="pi pi-arrow-left" severity="secondary" text="Back" />
    <div class="facts-container">
        <div class="facts-grid">
            <!-- Our Strengths -->
            <div class="fact-table">
                <h2>Our Strengths</h2>
                <DataTable :value="facts.filter((f) => f.fact_type === 'Strength')" stripedRows>
                    <Column field="fact_content" header="Fact"></Column>
                    <Column field="fact_source" header="Source">
                        <template #body="slotProps">
                            <a :href="slotProps.data.fact_source" target="_blank" class="source-link"> Source </a>
                        </template>
                    </Column>
                    <Column field="created_at" header="Date">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.created_at) }}
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Competitor Strengths -->
            <div class="fact-table">
                <h2>Competitor Strengths</h2>
                <DataTable :value="facts.filter((f) => f.fact_type === 'CompetitorStrength')" stripedRows>
                    <Column field="fact_content" header="Fact"></Column>
                    <Column field="fact_source" header="Source">
                        <template #body="slotProps">
                            <a :href="slotProps.data.fact_source" target="_blank" class="source-link"> Source </a>
                        </template>
                    </Column>
                    <Column field="created_at" header="Date">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.created_at) }}
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Our Weaknesses -->
            <div class="fact-table">
                <h2>Our Weaknesses</h2>
                <DataTable :value="facts.filter((f) => f.fact_type === 'Weakness')" stripedRows>
                    <Column field="fact_content" header="Fact"></Column>
                    <Column field="fact_source" header="Source">
                        <template #body="slotProps">
                            <a :href="slotProps.data.fact_source" target="_blank" class="source-link"> Source </a>
                        </template>
                    </Column>
                    <Column field="created_at" header="Date">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.created_at) }}
                        </template>
                    </Column>
                </DataTable>
            </div>

            <!-- Competitor Weaknesses -->
            <div class="fact-table">
                <h2>Competitor Weaknesses</h2>
                <DataTable :value="facts.filter((f) => f.fact_type === 'CompetitorWeakness')" stripedRows>
                    <Column field="fact_content" header="Fact"></Column>
                    <Column field="fact_source" header="Source">
                        <template #body="slotProps">
                            <a :href="slotProps.data.fact_source" target="_blank" class="source-link"> Source </a>
                        </template>
                    </Column>
                    <Column field="created_at" header="Date">
                        <template #body="slotProps">
                            {{ formatDate(slotProps.data.created_at) }}
                        </template>
                    </Column>
                </DataTable>
            </div>
        </div>
    </div>
</template>

<style scoped>
.facts-container {
    padding: 2rem;
    max-width: 1400px;
    margin: 0 auto;
}

.facts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
}

.fact-table {
    @apply p-4 rounded-lg shadow-sm border;
}

.fact-table h2 {
    @apply text-xl font-bold mb-4;
}

.source-link {
    @apply text-blue-600 hover:text-blue-800 underline;
}
</style>
