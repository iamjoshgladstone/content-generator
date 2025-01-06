<script setup>
import { useChatCompletion } from '@/service/useLLM';
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';

const userStore = useUserStore();
const competitors = ref([]);
const error = ref(null);
const displayModal = ref(false);
const searchQuery = ref('');
const suggestions = ref([]);
const { generateContentSpecificModel } = useChatCompletion();
const toast = useToast();
const isSaving = ref(false);

// Fetch competitor details from Clearbit
const getCompanyDetails = async (domain) => {
    try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${domain}`);
        const data = await response.json();
        return data.length > 0
            ? {
                  name: data[0].name,
                  domain: data[0].domain,
                  logo: data[0].logo
              }
            : null;
    } catch (err) {
        console.error('Error fetching company details from Clearbit:', err);
        return null;
    }
};

// Generate competitors using LLM
const getCompetitorsFromLLM = async (companyName) => {
    const prompt = `Provide JSON only. No preamble. You are VP of Competitive Enablement for ${companyName}. What are the top 2-3 direct competitors of ${companyName}? Search all review sites to identify who commonly comes up against ${companyName} in competitive deals. The URL you retrieve must be precise - make sure you identify the correct between .co, .com, .io, and more. Respond with an array of website domains. Example: ["companya.com", "companyb.com"]`;

    try {
        const response = await generateContentSpecificModel({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
        });

        const domains = JSON.parse(response);
        const enrichedCompetitors = [];

        for (const domain of domains) {
            const companyDetails = await getCompanyDetails(domain);
            if (companyDetails) {
                enrichedCompetitors.push({
                    name: companyDetails.name,
                    website: companyDetails.domain,
                    logo_url: companyDetails.logo
                });
            }
        }

        return enrichedCompetitors;
    } catch (err) {
        console.error('Error generating competitors with LLM:', err);
        return [];
    }
};

// Search companies using Clearbit
const searchCompanies = async (query) => {
    if (query.length < 2) return;

    try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${query}`);
        const data = await response.json();
        suggestions.value = data.map((company) => ({
            name: `${company.name} [${company.domain}]`,
            domain: company.domain,
            logo: company.logo,
            originalName: company.name
        }));
    } catch (err) {
        console.error('Error fetching Clearbit suggestions:', err);
        suggestions.value = [];
    }
};

// Add competitor to the local list
const addCompetitor = async (company) => {
    try {
        const user_uuid = userStore.userDetails.user_uuid;

        // Check if company exists in companies table
        let company_uuid;
        const { data: existingCompany } = await supabase.from('companies').select('company_uuid').eq('company_domain', company.domain).single();

        if (existingCompany) {
            company_uuid = existingCompany.company_uuid;
        } else {
            // Insert new company
            const { data: newCompany, error: insertError } = await supabase
                .from('companies')
                .insert({
                    company_name: company.originalName,
                    company_logo: company.logo,
                    company_domain: company.domain
                })
                .select('company_uuid')
                .single();

            if (insertError) throw insertError;
            company_uuid = newCompany.company_uuid;
        }

        // Add relationship to user_competitors
        const { error: relationError } = await supabase.from('user_competitors').upsert(
            {
                user_uuid: user_uuid,
                competitor_uuid: company_uuid
            },
            {
                onConflict: 'user_uuid,competitor_uuid'
            }
        );

        if (relationError) throw relationError;

        // Update local state
        competitors.value.push({
            name: company.originalName,
            website: company.domain,
            logo_url: company.logo
        });

        displayModal.value = false;
        searchQuery.value = '';

        toast.add({
            severity: 'success',
            summary: 'Competitor Added',
            detail: 'New competitor has been added successfully',
            life: 3000
        });
    } catch (err) {
        console.error('Error adding competitor:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add competitor',
            life: 3000
        });
    }
};

// Add this function to handle deletion
const removeCompetitor = async (competitorToRemove) => {
    try {
        const user_uuid = userStore.userDetails.user_uuid;

        // Get the competitor_uuid from companies table
        const { data: company, error: companyError } = await supabase.from('companies').select('company_uuid').eq('company_domain', competitorToRemove.website).single();

        if (companyError) throw companyError;

        // Delete the relationship from user_competitors
        const { error: deleteError } = await supabase.from('user_competitors').delete().eq('user_uuid', user_uuid).eq('competitor_uuid', company.company_uuid);

        if (deleteError) throw deleteError;

        // Update local state
        competitors.value = competitors.value.filter((competitor) => competitor.name !== competitorToRemove.name);

        toast.add({
            severity: 'success',
            summary: 'Competitor Removed',
            detail: 'Competitor has been removed successfully',
            life: 3000
        });
    } catch (err) {
        console.error('Error removing competitor:', err);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to remove competitor',
            life: 3000
        });
    }
};

// Add this function after removeCompetitor
const saveCompetitors = async () => {
    if (isSaving.value) return;
    isSaving.value = true;

    try {
        const user_uuid = userStore.userDetails.user_uuid;

        // Step 1: Get current competitor_uuids from database and their company details
        const { data: existingPairs, error: fetchError } = await supabase.from('user_competitors').select('competitor_uuid');

        if (fetchError) throw fetchError;

        // Get company details for existing pairs
        const { data: existingCompanies, error: companiesError } = await supabase
            .from('companies')
            .select('company_uuid, company_domain')
            .in(
                'company_uuid',
                existingPairs.map((p) => p.competitor_uuid)
            );

        if (companiesError) throw companiesError;

        // Step 2: Process current competitors (add new ones)
        const companyPromises = competitors.value.map(async (competitor) => {
            // First check if company already exists
            const { data: existingCompany } = await supabase.from('companies').select('company_uuid').eq('company_domain', competitor.website).single();

            if (existingCompany) {
                return existingCompany.company_uuid;
            }

            // If company doesn't exist, insert it
            const { data: newCompany, error: companyError } = await supabase
                .from('companies')
                .insert({
                    company_name: competitor.name,
                    company_logo: competitor.logo_url,
                    company_domain: competitor.website
                })
                .select('company_uuid')
                .single();

            if (companyError) throw companyError;
            return newCompany.company_uuid;
        });

        const competitor_uuids = await Promise.all(companyPromises);

        // Step 3: Find pairs to delete
        const currentDomains = competitors.value.map((c) => c.website);
        const pairsToDelete = existingCompanies.filter((company) => !currentDomains.includes(company.company_domain));

        // Step 4: Delete removed pairs
        if (pairsToDelete.length > 0) {
            const { error: deleteError } = await supabase
                .from('user_competitors')
                .delete()
                .eq('user_uuid', user_uuid)
                .in(
                    'competitor_uuid',
                    pairsToDelete.map((p) => p.company_uuid)
                );

            if (deleteError) throw deleteError;
        }

        // Step 5: Add new pairs
        const relationshipPromises = competitor_uuids.map(async (competitor_uuid) => {
            const { error: relationError } = await supabase.from('user_competitors').upsert(
                {
                    user_uuid: user_uuid,
                    competitor_uuid: competitor_uuid
                },
                {
                    onConflict: 'user_uuid,competitor_uuid'
                }
            );

            if (relationError) throw relationError;
        });

        await Promise.all(relationshipPromises);

        // Step 6: Update the userStore with the new competitor list
        const pairs = competitors.value.map((competitor) => ({
            name: competitor.name,
            logo_url: competitor.logo_url,
            website: competitor.website
        }));
        await userStore.updateCompetitors(pairs);

        toast.add({
            severity: 'success',
            summary: 'Competitors Saved',
            detail: 'Your competitors have been successfully updated.',
            life: 3000
        });
    } catch (err) {
        console.error('Error saving competitors:', err);
        error.value = 'Failed to save competitors. Please try again.';
        toast.add({
            severity: 'error',
            summary: 'Save Failed',
            detail: 'There was an error updating your competitors.',
            life: 3000
        });
    } finally {
        isSaving.value = false;
    }
};

// Initialize competitors on mount
onMounted(async () => {
    try {
        // First try to load existing competitors
        const storedCompetitors = await userStore.fetchUserCompetitors();

        if (storedCompetitors.length > 0) {
            competitors.value = storedCompetitors;
            return;
        }

        // If no stored competitors, generate them with LLM
        const companyName = userStore.userDetails.company_name;
        if (!companyName) {
            throw new Error('Company name not found in user details.');
        }

        const initialCompetitors = await getCompetitorsFromLLM(companyName);
        competitors.value = initialCompetitors;
    } catch (err) {
        error.value = 'Failed to load competitors. Please try again.';
        console.error(err);
    }
});
</script>

<template>
    <div class="card">
        <h1 class="text-3xl mb-4">Competitor Overview</h1>

        <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
            <p>{{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Competitor Cards -->
            <div v-for="competitor in competitors" :key="competitor.name" class="p-4 border rounded-lg shadow-sm flex flex-col items-center relative">
                <button @click="removeCompetitor(competitor)" class="absolute top-2 right-2 text-gray-400 hover:text-red-500 transition-colors" title="Remove competitor">
                    <i class="pi pi-trash"></i>
                </button>
                <img v-if="competitor.logo_url" :src="competitor.logo_url" :alt="competitor.name" class="w-16 h-16 object-contain mb-2" />
                <h3 class="text-lg font-semibold">{{ competitor.name }}</h3>
                <a :href="'https://' + competitor.website" class="text-blue-600 hover:text-blue-800" target="_blank">
                    {{ competitor.website }}
                </a>
            </div>

            <!-- Add Competitor Card -->
            <div @click="displayModal = true" class="p-4 border rounded-lg shadow-sm flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50">
                <i class="pi pi-plus text-4xl text-gray-400"></i>
                <span class="mt-2 text-gray-600">Add Competitor</span>
            </div>
        </div>

        <!-- Add Competitor Modal -->
        <Dialog v-model:visible="displayModal" modal header="Add Competitor" :style="{ width: '450px' }" class="p-fluid">
            <div class="mb-4">
                <AutoComplete
                    v-model="searchQuery"
                    :suggestions="suggestions.map((s) => s.name)"
                    :field="'name'"
                    @complete="searchCompanies($event.query)"
                    @item-select="(e) => addCompetitor(suggestions.find((s) => s.name === e.value))"
                    placeholder="Search for a company"
                >
                    <template #item="slotProps">
                        <div class="flex items-center p-2">
                            <span>{{ slotProps.item }}</span>
                        </div>
                    </template>
                </AutoComplete>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="displayModal = false" class="p-button-text" />
            </template>
        </Dialog>

        <div class="mt-6 flex justify-end">
            <Button label="Save Competitors" icon="pi pi-save" @click="saveCompetitors" :loading="isSaving" severity="primary" />
        </div>
    </div>
</template>

<style scoped>
.card {
    margin: auto;
    max-width: 800px;
}
</style>
