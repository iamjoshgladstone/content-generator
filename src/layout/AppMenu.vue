<script setup>
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppMenuItem from './AppMenuItem.vue';

const userStore = useUserStore();
const router = useRouter();

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
const competitors = ref([]);

// Initialize competitors on mount
onMounted(async () => {
    try {
        const userCompetitors = await userStore.fetchUserCompetitors();
        competitors.value = userCompetitors.map((competitor) => ({
            label: competitor.name,
            value: competitor.website
        }));
    } catch (error) {
        console.error('Error loading competitors:', error);
    }
});

const handleGenerateBattlecard = async () => {
    if (!selectedCompetitor.value || !prospectUrl.value) {
        console.error('Please select a competitor and enter a prospect URL');
        return;
    }

    try {
        // Store the prospect URL in userStore
        userStore.setProspectUrl(prospectUrl.value);

        // Get competitor UUID from companies table
        const { data: company, error: companyError } = await supabase.from('companies').select('company_uuid').eq('company_domain', selectedCompetitor.value).single();

        if (companyError) throw companyError;

        // Check if prospect exists
        const { data: existingProspect, error: searchError } = await supabase.from('prospects').select('prospect_uuid').ilike('prospect_url', `%${prospectUrl.value}%`).single();

        let prospectUuid;

        if (searchError && searchError.code !== 'PGRST116') {
            throw searchError;
        }

        if (!existingProspect) {
            const { data: newProspect, error: createError } = await supabase
                .from('prospects')
                .insert([{ prospect_url: prospectUrl.value }])
                .select('prospect_uuid')
                .single();

            if (createError) throw createError;
            prospectUuid = newProspect.prospect_uuid;
        } else {
            prospectUuid = existingProspect.prospect_uuid;
        }

        // Route to generate page with user_id and competitor_uuid
        router.push(`/${userStore.userDetails.user_id}/${company.company_uuid}`);
    } catch (error) {
        console.error('Error handling battlecard generation:', error);
    }
};
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
                <li>
                    <Button label="Generate Battlecard" @click="handleGenerateBattlecard" class="w-full mt-3" :disabled="!selectedCompetitor || !prospectUrl" />
                </li>
            </ul>
        </li>
    </ul>
</template>

<style lang="scss" scoped></style>
