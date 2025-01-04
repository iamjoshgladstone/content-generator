<script setup>
import GenerationProgress from '@/components/GenerationProgress.vue';
import { useChatCompletion } from '@/service/useLLM';
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import Button from 'primevue/button';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { generateContentSpecificModel } = useChatCompletion();
const competitorUuid = route.params.competitor_uuid;
const isLoading = ref(true);
const stage = ref('facts');
const progress = ref(0);
const competitiveFacts = ref([]);
const battlecardData = ref(null);
const toast = useToast();

const getProspectName = async (prospectUrl) => {
    const prompt = `Given this URL: ${prospectUrl}, return ONLY the company name as a plain text string. No JSON, no explanation, just the name. Example: if given "www.salesforce.com" return "Salesforce"`;

    try {
        const response = await generateContentSpecificModel({
            model: 'claude-3.5-sonnet',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3
        });

        if (!response) {
            console.error('Empty response from LLM');
            return 'Unknown Company';
        }

        return response.trim();
    } catch (error) {
        console.error('Error getting prospect name:', error);
        return 'Unknown Company';
    }
};

const generateBattlecardContent = async (facts, competitorName, prospectUrl) => {
    console.log('Starting battlecard generation for:', competitorName);
    stage.value = 'customizing';
    progress.value = 50;

    // Get prospect name first
    console.log('Getting prospect name for:', prospectUrl);
    const prospectName = await getProspectName(prospectUrl);
    console.log('Retrieved prospect name:', prospectName);
    progress.value = 60;

    // Generate Overview
    console.log('Generating overview section');
    const overviewPrompt = `Create a competitive overview battlecard for ${competitorName}. Use the following facts: ${JSON.stringify(facts)}.
    Return a JSON object with:
    {
        "title": "Competitor Overview",
        "bodyHtml": "<h2>Overview of ${competitorName}</h2>...",
        "factsUsed": [array of fact_uuids used],
        "competitor": "${competitorName}",
        "topic": "Overview"
    }`;

    const overview = await generateContentSpecificModel({
        model: 'claude-3.5-sonnet',
        messages: [
            {
                role: 'system',
                content: 'You are a JSON API. Never include explanations or text outside the JSON object. Return only valid JSON.'
            },
            {
                role: 'user',
                content: overviewPrompt
            }
        ],
        temperature: 0.1
    });
    console.log('Raw overview response:', overview);

    progress.value = 70;

    // Generate Why We Win
    const strengthsPrompt = `Create a 'Why We Win' battlecard comparing ${userStore.userDetails.company_name} against ${competitorName} for prospect at ${prospectUrl}.
    Use the following competitor facts: ${JSON.stringify(facts)}.
    Return a JSON object with:
    {
        "title": "Why We Win",
        "bodyHtml": "<div class='win-section'>
            <h2><strong>🥊 [13-word summary of your strength vs their weakness]</strong></h2>
            <ul>
                <li><strong>Context:</strong> [Brief context explaining why this matters to ${prospectUrl}]</li>
            </ul>
        </div>",
        "factsUsed": [array of fact_uuids used],
        "competitor": "${competitorName}",
        "topic": "Strengths"
    }`;

    const strengths = await generateContentSpecificModel({
        model: 'claude-3.5-sonnet',
        messages: [{ role: 'user', content: strengthsPrompt }],
        temperature: 0.7
    });

    progress.value = 85;

    // Generate Counter Their Strengths
    const counterPrompt = `Create a 'Counter Their Strengths' battlecard for ${competitorName}.
    Use the following facts: ${JSON.stringify(facts)}.
    Return a JSON object with:
    {
        "title": "Areas to Address",
        "bodyHtml": "<div class='lose-section'>
            <h2><strong>🪨 [13-word summary of their strength vs our weakness]</strong></h2>
            <ul>
                <li><strong>Context:</strong> [Brief context explaining the competitive dynamic]</li>
            </ul>
        </div>",
        "factsUsed": [array of fact_uuids used],
        "competitor": "${competitorName}",
        "topic": "Counter"
    }`;

    const counter = await generateContentSpecificModel({
        model: 'claude-3.5-sonnet',
        messages: [{ role: 'user', content: counterPrompt }],
        temperature: 0.7
    });

    progress.value = 100;

    return {
        overview: validateAndParseJSON(overview),
        strengths: validateAndParseJSON(strengths),
        counter: validateAndParseJSON(counter)
    };
};

const saveBattlecard = async (battlecardData) => {
    const { data: newBattlecard, error } = await supabase
        .from('user_battlecards')
        .insert({
            battlecard_name: `vs. ${battlecardData.overview.competitor}`,
            prospect_uuid: userStore.prospectUuid,
            prospect_url: userStore.prospectUrl,
            user_uuid: userStore.userDetails.user_uuid,
            battlecard_json: battlecardData
        })
        .select()
        .single();

    if (error) throw error;
    return newBattlecard;
};

const validateAndParseJSON = (response) => {
    console.log('Validating JSON response:', response);
    if (!response) throw new Error('Empty response');

    try {
        const parsed = JSON.parse(response);
        console.log('Successfully parsed JSON:', parsed);
        return parsed;
    } catch (error) {
        console.error('JSON Parse Error:', error);
        console.log('Failed response content:', response);
        throw new Error('Invalid JSON response');
    }
};

const generateAndStoreFacts = async (competitorName, companyName, competitorUuid) => {
    console.log('Starting fact generation for:', competitorName);
    const prompt = `You are a JSON API endpoint. Return a valid JSON object containing researched facts about ${competitorName} as a competitor to ${companyName}.

The response must be a single JSON object with this exact structure:
{
    "facts": [
        {
            "type": "Strength",
            "fact": "A specific strength fact",
            "source": "A valid URL"
        },
        {
            "type": "Weakness",
            "fact": "A specific weakness fact",
            "source": "A valid URL"
        }
    ]
}`;

    try {
        console.log('Sending fact generation prompt:', prompt);
        const response = await generateContentSpecificModel({
            model: 'claude-3.5-sonnet',
            messages: [
                {
                    role: 'system',
                    content: 'You are a JSON API endpoint. Only return valid JSON. No markdown, no explanations, no additional text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.1
        });
        console.log('Raw fact generation response:', response);

        const parsedResponse = validateAndParseJSON(response);
        console.log('Parsed facts:', parsedResponse);

        // Store each fact in the database
        for (const fact of parsedResponse.facts) {
            const { data: newFact, error } = await supabase
                .from('competitor_facts')
                .insert({
                    competitor_uuid: competitorUuid,
                    fact_type: fact.type,
                    fact_text: fact.fact,
                    fact_source: fact.source
                })
                .select('*')
                .single();

            if (error) throw error;
            competitiveFacts.value.push(newFact);
        }

        // After facts are generated, create the battlecard content
        battlecardData.value = await generateBattlecardContent(competitiveFacts.value, competitorName, userStore.prospectUrl);
    } catch (error) {
        console.error('Error in generateAndStoreFacts:', error);
        throw error;
    } finally {
        isLoading.value = false;
    }
};

const handleSaveBattlecard = async () => {
    try {
        await saveBattlecard(battlecardData.value);
        // Add toast notification for success
        toast.add({ severity: 'success', summary: 'Success', detail: 'Battlecard saved successfully', life: 3000 });
        router.push('/');
    } catch (error) {
        console.error('Error saving battlecard:', error);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save battlecard', life: 3000 });
    }
};

const getFreshFacts = async (competitorUuid) => {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

    // Query existing facts
    const { data: existingFacts, error } = await supabase.from('competitor_facts').select('*').eq('competitor_uuid', competitorUuid).gte('created_at', fourteenDaysAgo.toISOString());

    if (error) throw error;

    if (existingFacts && existingFacts.length > 0) {
        console.log('Using existing fresh facts');
        return existingFacts;
    }

    // If no fresh facts exist, regenerate them
    console.log('Generating new facts');
    const { data: competitor } = await supabase.from('companies').select('company_name, company_domain').eq('company_uuid', competitorUuid).single();

    if (!competitor) throw new Error('Competitor not found');

    const newFacts = await generateAndStoreFacts(competitor.company_name, userStore.userDetails.company_name, competitorUuid);

    // Upsert the new facts
    const { error: upsertError } = await supabase.from('competitor_facts').upsert(
        newFacts.map((fact) => ({
            competitor_uuid: competitorUuid,
            fact_type: fact.type,
            fact_content: fact.fact,
            fact_source: fact.source,
            created_at: new Date().toISOString()
        }))
    );

    if (upsertError) throw upsertError;

    return newFacts;
};

onMounted(async () => {
    try {
        const facts = await getFreshFacts(competitorUuid);
        competitiveFacts.value = facts;

        // Get company details using the competitor_uuid directly
        const { data: company, error: companyError } = await supabase.from('companies').select('company_uuid, company_name').eq('company_uuid', competitorUuid).single();

        if (companyError) throw companyError;

        // After facts are generated, create the battlecard content
        battlecardData.value = await generateBattlecardContent(competitiveFacts.value, company.company_name, userStore.prospectUrl);
    } catch (error) {
        console.error('Error generating facts:', error);
    } finally {
        isLoading.value = false;
    }
});
</script>

<template>
    <div class="card">
        <div v-if="isLoading">
            <GenerationProgress :stage="stage" :progress="progress" />
        </div>

        <div v-else class="battlecard-container">
            <!-- Save Button -->
            <Button label="Save Battlecard" icon="pi pi-save" @click="handleSaveBattlecard" class="save-button" severity="primary" />

            <!-- Overview Section -->
            <div class="section overview-section" v-if="battlecardData?.overview">
                <h1 class="section-title">{{ battlecardData.overview.title }}</h1>
                <div class="content" v-html="battlecardData.overview.bodyHtml"></div>
            </div>

            <!-- Strengths Section -->
            <div class="section strengths-section" v-if="battlecardData?.strengths">
                <div class="prospect-url">for {{ userStore.prospectUrl }}</div>
                <div class="content win-content" v-html="battlecardData.strengths.bodyHtml"></div>
                <div class="sources-container">
                    <span class="sources-label">Sources:</span>
                    <div class="sources-grid">
                        <a v-for="(source, index) in battlecardData.strengths.factsUsed" :key="source" :href="competitiveFacts.find((f) => f.fact_uuid === source)?.fact_source" target="_blank" class="source-link strength">
                            {{ index + 1 }}
                        </a>
                    </div>
                </div>
            </div>

            <!-- Counter Section -->
            <div class="section counter-section" v-if="battlecardData?.counter">
                <div class="content lose-content" v-html="battlecardData.counter.bodyHtml"></div>
                <div class="sources-container">
                    <span class="sources-label">Sources:</span>
                    <div class="sources-grid">
                        <a v-for="(source, index) in battlecardData.counter.factsUsed" :key="source" :href="competitiveFacts.find((f) => f.fact_uuid === source)?.fact_source" target="_blank" class="source-link counter">
                            {{ index + 1 }}
                        </a>
                    </div>
                </div>
            </div>
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
