<script setup>
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import { ref } from 'vue';
import AppMenuItem from './AppMenuItem.vue';

// Menu model
const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Configure',
        items: [{ label: 'Competitors', icon: 'pi pi-fw pi-cog', to: '/configure' }]
    },
    {
        label: 'Generate'
    }
]);

// Dropdown and input data
const selectedCompetitor = ref(null);
const prospectUrl = ref('');
const competitors = ref([
    { label: 'Competitor 1', value: 'comp1' },
    { label: 'Competitor 2', value: 'comp2' }
    // Add more competitors here if needed
]);
</script>

<template>
    <ul class="layout-menu">
        <!-- Iterate through menu items -->
        <template v-for="(item, i) in model" :key="i">
            <app-menu-item v-if="!item.separator" :item="item" :index="i"></app-menu-item>
            <li v-if="item.separator" class="menu-separator"></li>
        </template>

        <!-- Generate Section -->
        <li class="layout-menuitem">
            <ul>
                <!-- Dropdown for selecting competitors -->
                <li>
                    <Dropdown v-model="selectedCompetitor" :options="competitors" optionLabel="label" optionValue="value" placeholder="Select Competitor" class="w-full mb-3" />
                </li>
                <!-- Input field for prospect URL -->
                <li>
                    <InputText v-model="prospectUrl" placeholder="Enter Prospect URL" class="w-full" />
                </li>
            </ul>
        </li>
    </ul>
</template>

<style lang="scss" scoped></style>
