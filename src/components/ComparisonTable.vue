<script setup>
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import { computed } from 'vue';

const props = defineProps({
    type: {
        type: String,
        required: true,
        validator: (value) => ['strength', 'counter'].includes(value)
    },
    data: {
        type: Object,
        required: true,
        validator: (value) => {
            return typeof value === 'object' && value !== null;
        }
    }
});

const tableData = computed(() => [
    {
        column1: props.type === 'strength' ? props.data.ourStrength : props.data.theirStrength,
        column2: props.type === 'strength' ? props.data.theirWeakness : props.data.ourGap
    }
]);

const columns = computed(() => {
    if (props.type === 'strength') {
        return [
            { field: 'column1', header: 'Our Strength' },
            { field: 'column2', header: 'Their Weakness' }
        ];
    } else {
        return [
            { field: 'column1', header: 'Their Strength' },
            { field: 'column2', header: 'Our Gap' }
        ];
    }
});

const strategyText = computed(() => {
    return props.type === 'strength' ? props.data.prospectStrategy : props.data.defenseStrategy;
});
</script>

<template>
    <div class="my-4">
        <DataTable :value="tableData" class="p-datatable-sm" responsiveLayout="scroll">
            <Column v-for="col in columns" :key="col.field" :field="col.field" :header="col.header" class="p-2">
                <template #body="slotProps">
                    <div class="whitespace-pre-wrap">{{ slotProps.data[col.field] }}</div>
                </template>
            </Column>
        </DataTable>
        <div class="strategy-section">
            <h4 class="strategy-header">{{ type === 'strength' ? 'How to Win' : 'How to Defend' }}</h4>
            <p class="strategy-text">{{ strategyText }}</p>
        </div>
    </div>
</template>

<style scoped>
:deep(.p-datatable) {
    @apply border rounded-lg shadow-sm;
}

:deep(.p-datatable-header) {
    @apply bg-gray-50 font-semibold;
}

:deep(.p-column-header-content) {
    @apply font-semibold text-gray-700;
}

:deep(.p-datatable-tbody > tr > td) {
    @apply p-4 align-top;
}

.strategy-section {
    @apply mt-4 p-4 bg-gray-50 rounded-lg;
}

.strategy-header {
    @apply text-sm font-semibold text-gray-700 mb-2;
}

.strategy-text {
    @apply text-gray-600 whitespace-pre-wrap;
}
</style>
