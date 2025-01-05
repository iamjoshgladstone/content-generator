<script setup>
import { useContentStore } from '@/stores/contentStore';
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import InputText from 'primevue/inputtext';
import { useToast } from 'primevue/usetoast';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppMenuItem from './AppMenuItem.vue';

const userStore = useUserStore();
const router = useRouter();
const contentStore = useContentStore();
const toast = useToast();

const getProspectName = async (url) => {
    try {
        const urlWithProtocol = url.startsWith('http') ? url : `https://${url}`;
        const domain = new URL(urlWithProtocol).hostname.replace('www.', '');
        return domain.split('.')[0];
    } catch (error) {
        console.error('Error parsing URL:', error);
        return null;
    }
};

// Menu model
const model = ref([
    {
        label: 'Home',
        items: [{ label: 'Dashboard', icon: 'pi pi-fw pi-home', to: '/' }]
    },
    {
        label: 'Configure',
        items: [{ label: 'Competitors', icon: 'pi pi-fw pi-cog', to: `/${userStore.userDetails?.user_id}/configure` }]
    },
    {
        label: 'Generate'
    }
]);

// Dropdown and input data
const selectedCompetitor = ref(null);
const prospectUrl = ref('');
const competitors = computed(() => {
    return userStore.competitors.map((competitor) => ({
        label: competitor.name,
        value: competitor.website
    }));
});

const handleGenerateBattlecard = async () => {
    if (!selectedCompetitor.value || !prospectUrl.value) {
        console.error('Please select a competitor and enter a prospect URL');
        return;
    }

    try {
        // Clear the content store first
        contentStore.clearBattlecardData();
        contentStore.clearCompetitiveFacts();

        // Get prospect name first
        const prospectName = await getProspectName(prospectUrl.value);

        if (!prospectName) {
            throw new Error('Could not determine prospect name from URL');
        }

        // Check if prospect exists by name or URL
        const { data: existingProspect, error: searchError } = await supabase.from('prospects').select('prospect_uuid, prospect_name, prospect_url').or(`prospect_name.ilike.${prospectName},prospect_url.ilike.%${prospectUrl.value}%`).single();

        let prospectUuid;

        if (searchError && searchError.code !== 'PGRST116') {
            throw searchError;
        }

        if (!existingProspect) {
            // Create new prospect with both name and URL
            const { data: newProspect, error: createError } = await supabase
                .from('prospects')
                .insert([
                    {
                        prospect_url: prospectUrl.value,
                        prospect_name: prospectName
                    }
                ])
                .select('prospect_uuid')
                .single();

            if (createError) throw createError;
            prospectUuid = newProspect.prospect_uuid;
        } else {
            prospectUuid = existingProspect.prospect_uuid;
            // Update existing prospect if name is missing
            if (!existingProspect.prospect_name) {
                await supabase.from('prospects').update({ prospect_name: prospectName }).eq('prospect_uuid', prospectUuid);
            }
        }

        // Store the prospect URL and UUID in userStore
        userStore.setProspectUrl(prospectUrl.value);
        userStore.setProspectUuid(prospectUuid);

        // Get competitor UUID from companies table
        const { data: company, error: companyError } = await supabase.from('companies').select('company_uuid').eq('company_domain', selectedCompetitor.value).single();

        if (companyError) throw companyError;

        // Route to generate page
        router.push(`/${userStore.userDetails.user_id}/${company.company_uuid}`);
    } catch (error) {
        console.error('Error handling battlecard generation:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to initialize battlecard generation',
            life: 3000
        });
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
