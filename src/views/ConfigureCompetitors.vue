<script setup>
import { useChatCompletion } from '@/service/useLLM';
import { supabase } from '@/utils/supabase.js';
import AutoComplete from 'primevue/autocomplete';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { onMounted, ref } from 'vue';

const competitors = ref([]);
const error = ref(null);
const displayModal = ref(false);
const searchQuery = ref('');
const suggestions = ref([]);
const { generateContentSpecificModel } = useChatCompletion();

// Function to get company details from Clearbit using domain
const getCompanyDetails = async (domain) => {
    console.log('Fetching Clearbit details for:', domain);
    try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${domain}`);
        const data = await response.json();
        console.log('Clearbit Response:', data);

        // Return the first matching company or null
        return data.length > 0
            ? {
                  name: data[0].name,
                  domain: data[0].domain,
                  logo: data[0].logo
              }
            : null;
    } catch (err) {
        console.error('Error fetching from Clearbit:', err);
        return null;
    }
};

// Function to get initial competitors using LLM
const getInitialCompetitors = async (companyName) => {
    console.log('Fetching initial competitors for:', companyName);
    const content = `Provide JSON only. No preamble. What are the top 2-3 direct competitors of ${companyName}? Respond with array of website domains only. Example: ["companya.com", "companyb.com"]`;

    try {
        const response = await generateContentSpecificModel({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [{ role: 'user', content }],
            temperature: 0.7
        });

        const websites = JSON.parse(response);
        console.log('LLM Response (websites):', websites);

        // Get company details for each website
        const competitors = [];
        for (const website of websites) {
            const companyDetails = await getCompanyDetails(website);
            if (companyDetails) {
                competitors.push(companyDetails);
            }
        }

        console.log('Enriched competitors:', competitors);
        return competitors;
    } catch (err) {
        console.error('Error getting competitors from LLM:', err);
        return [];
    }
};

// Function to search companies using Clearbit
const searchCompanies = async (query) => {
    if (query.length < 2) return;
    console.log('Searching Clearbit for:', query);

    try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${query}`);
        const data = await response.json();
        console.log('Clearbit Search Response:', data);

        suggestions.value = data.map((company) => ({
            name: company.name,
            domain: company.domain,
            logo: company.logo
        }));
    } catch (err) {
        console.error('Error searching Clearbit:', err);
        suggestions.value = [];
    }
};

// Function to add competitor to database
const addCompetitor = async (company) => {
    console.log('Adding competitor:', company);
    try {
        const competitorData = {
            name: company.name,
            website: company.domain,
            logo_url: company.logo
        };

        const { error: supabaseError } = await supabase.from('competitors').insert([competitorData]);

        if (supabaseError) throw supabaseError;

        competitors.value.push(competitorData);
        console.log('Updated competitors list:', competitors.value);

        displayModal.value = false;
        searchQuery.value = '';
    } catch (err) {
        console.error('Error adding competitor to database:', err);
        error.value = err;
    }
};

// Load initial data
onMounted(async () => {
    try {
        // Fetch existing competitors from database
        const { data, error: supabaseError } = await supabase.from('competitors').select('*');

        if (supabaseError) throw supabaseError;

        competitors.value = data || [];
        console.log('Loaded competitors from database:', competitors.value);

        // If no competitors exist, get initial suggestions
        if (!competitors.value.length) {
            console.log('No existing competitors found, fetching initial suggestions');
            const initialCompetitors = await getInitialCompetitors('Your Company Name');

            if (initialCompetitors.length) {
                for (const competitor of initialCompetitors) {
                    await addCompetitor(competitor);
                }
            }
        }
    } catch (err) {
        console.error('Error during initialization:', err);
        error.value = err;
    }
});
</script>

<template>
    <div class="card">
        <h1 class="text-3xl mb-4">Configure Competitors</h1>

        <div v-if="error" class="p-4 bg-red-100 text-red-700 rounded">
            <p>Error: {{ error }}</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Competitor Cards -->
            <div v-for="competitor in competitors" :key="competitor.name" class="p-4 border rounded-lg shadow-sm flex flex-col items-center">
                <img v-if="competitor.logo_url" :src="competitor.logo_url" :alt="competitor.name" class="w-16 h-16 object-contain mb-2" />
                <h3 class="text-lg font-semibold">{{ competitor.name }}</h3>
                <a :href="'https://' + competitor.website" class="text-blue-600 hover:text-blue-800" target="_blank">{{ competitor.website }}</a>
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
                <AutoComplete v-model="searchQuery" :suggestions="suggestions" @complete="searchCompanies($event.query)" @item-select="addCompetitor($event.value)" field="name" placeholder="Search for a company">
                    <template #item="slotProps">
                        <div class="flex items-center p-2">
                            <img :src="slotProps.item.logo" :alt="slotProps.item.name" class="w-8 h-8 mr-2" />
                            <div>
                                <div>{{ slotProps.item.name }}</div>
                                <div class="text-sm text-gray-500">{{ slotProps.item.domain }}</div>
                            </div>
                        </div>
                    </template>
                </AutoComplete>
            </div>

            <template #footer>
                <Button label="Cancel" icon="pi pi-times" @click="displayModal = false" class="p-button-text" />
            </template>
        </Dialog>
    </div>
</template>

<style scoped>
.card {
    margin: auto;
    max-width: 800px;
}
</style>
