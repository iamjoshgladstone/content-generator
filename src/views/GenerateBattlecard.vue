<script setup>
import ComparisonTable from '@/components/ComparisonTable.vue';
import GenerationProgress from '@/components/GenerationProgress.vue';
import { useChatCompletion } from '@/service/useLLM';
import { useContentStore } from '@/stores/contentStore';
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
const toast = useToast();
const contentStore = useContentStore();

const companyDomain = ref('');
const getCompanyDomain = async () => {
    const { data, error } = await supabase.from('companies').select('company_domain').eq('company_uuid', competitorUuid).single();

    if (error) {
        console.error('Error fetching company domain:', error);
        return '';
    }

    companyDomain.value = data.company_domain;
    return data.company_domain;
};

onMounted(async () => {
    await getCompanyDomain();
});

const getProspectName = async (prospectUrl) => {
    const prompt = `Given this URL: ${prospectUrl}, return ONLY the company name as a plain text string. No JSON, no explanation, just the name. If the URL is not a valid company website, extract the company name from the domain. Example responses:
    - "www.salesforce.com" -> "Salesforce"
    - "app.hubspot.com" -> "HubSpot"
    - "login.oracle.com/portal" -> "Oracle"
    - "www.acme-corp.co.uk/products" -> "Acme Corp"`;

    try {
        const response = await generateContentSpecificModel({
            model: 'llama-3.1-sonar-small-128k-online',
            messages: [
                {
                    role: 'system',
                    content: 'You are a URL parser that extracts company names. Only return the company name, nothing else.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3
        });

        if (!response) {
            console.error('Empty response from LLM');
            return null;
        }

        return response.trim();
    } catch (error) {
        console.error('Error getting prospect name:', error);
        return null;
    }
};

const generateBattlecardContent = async (facts, competitorName, prospectUrl, companyDomain) => {
    console.log('Starting battlecard generation for:', competitorName);
    stage.value = 'facts';
    progress.value = 0;

    // Start slow progress simulation to 40%
    const factProgressInterval = simulateProgress(0, 40);

    // Get prospect name first
    console.log('Getting prospect name for:', prospectUrl);
    const prospectName = await getProspectName(prospectUrl);
    console.log('Retrieved prospect name:', prospectName);

    clearInterval(factProgressInterval);

    // Move to customization phase
    stage.value = 'customizing';

    // Get all facts for this competitor
    const { data: allFacts, error: factsError } = await supabase.from('competitor_facts').select('*').eq('competitor_uuid', competitorUuid).eq('fact_deleted', 0).order('created_at', { ascending: false });

    if (factsError) throw factsError;

    // Prioritize facts: upvoted first, then by date
    const prioritizedFacts = allFacts.sort((a, b) => {
        if (a.fact_upvote !== b.fact_upvote) {
            return b.fact_upvote - a.fact_upvote;
        }
        return new Date(b.fact_date) - new Date(a.fact_date);
    });

    // Generate Overview with all facts
    console.log('Generating overview section with all facts');
    const overviewPrompt = `Create a competitive overview battlecard for ${competitorName} at ${companyDomain}.
    Use these facts, prioritizing the most recent and highly rated ones: ${JSON.stringify(prioritizedFacts)}.
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
            { role: 'user', content: overviewPrompt }
        ],
        temperature: 0.7
    });

    progress.value = 70;

    // Generate Why We Win with all facts
    const strengthsPrompt = `Create a 'Why We Win' battlecard comparing ${userStore.userDetails.company_name} against ${competitorName} at ${companyDomain} for prospect at ${prospectUrl}.
    Use these facts for analysis: ${JSON.stringify(prioritizedFacts)}.
    Return a JSON object with EXACTLY 3-6 comparison sections:
    {
        "title": "Why We Win",
        "sections": [
            {
                "summary": "🥊 [13-word summary]",
                "comparisonTable": {
                    "ourStrength": "[Specific strength of ${userStore.userDetails.company_name}]",
                    "theirWeakness": "[Specific weakness of ${competitorName}]",
                    "prospectStrategy": "[How to position this for ${prospectUrl}]"
                },
                "factsUsed": [array of fact_uuids used]
            }
        ],
        "competitor": "${competitorName}",
        "topic": "Strengths"
    }`;

    const strengths = await generateContentSpecificModel({
        model: 'claude-3.5-sonnet',
        messages: [{ role: 'user', content: strengthsPrompt }],
        temperature: 0.7
    });

    progress.value = 85;

    // Generate Counter Their Strengths with all facts
    const counterPrompt = `Create a 'Counter Their Strengths' card for ${competitorName} at ${companyDomain}.
    Use these facts for analysis: ${JSON.stringify(prioritizedFacts)}.
    Return a JSON object with EXACTLY 3-6 comparison sections:
    {
        "title": "Areas to Address",
        "sections": [
            {
                "summary": "🪨 [13-word summary]",
                "comparisonTable": {
                    "theirStrength": "[Specific strength of ${competitorName}]",
                    "ourGap": "[${userStore.userDetails.company_name}'s gap or challenge]",
                    "defenseStrategy": "[How to defend against this for ${prospectUrl}]"
                },
                "factsUsed": [array of fact_uuids used]
            }
        ],
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

const generateAndStoreFacts = async (competitorName, companyName, competitorUuid, prospectUrl, companyDomain) => {
    console.log('Starting fact generation for:', competitorName);
    const prompt = `You are a competitive intelligence researcher. Return a valid JSON object containing thoroughly researched facts about three entities: ${competitorName} at ${companyDomain} (competitor), ${companyName} (our company), and the prospect company at ${prospectUrl}.

    Critical Requirements:
    You must only use sources that are validated. You may not hallucinate any sources.
    1. Find a minimum of 10 different, high-quality sources including:
       - Recent news articles (last 3 months)
       - Social media posts (LinkedIn, Twitter) from company executives
       - Press releases and company announcements
       - Financial reports and SEC filings
       - Industry analyst reports
       - Product review sites
       - Company blogs and technical documentation
    2. Every fact must include:
       - Publication date in ISO format (YYYY-MM-DD)
       - Direct quote or specific metric when possible
       - URL to the source
    3. Facts should cover:
       - Product updates and roadmap
       - Market positioning and strategy
       - Customer wins and losses
       - Executive changes
       - Partnerships and integrations
       - Performance metrics and growth
       - Pricing changes
       - Industry recognition

    Return JSON with this exact structure:
    {
        "facts": [
            {
                "type": "Strength | Weakness | Neutral",
                "company": "Competitor | Our Company | Prospect",
                "fact": "Specific fact with metrics and direct quotes when available",
                "sources": [
                    {
                        "url": "URL to source",
                        "date": "YYYY-MM-DD",
                        "type": "News | Social | Press Release | Filing | Review | Blog"
                    }
                ]
            }
        ]
    }`;

    try {
        console.log('Sending fact generation prompt:', prompt);
        const response = await generateContentSpecificModel({
            model: 'llama-3.1-sonar-large-128k-online',
            messages: [
                {
                    role: 'system',
                    content: 'You are a competitive intelligence researcher focused on finding concrete, well-sourced facts. Only return valid JSON. No markdown, no explanations, no additional text.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 1
        });

        const parsedResponse = validateAndParseJSON(response);
        console.log('Parsed facts:', parsedResponse);

        const storedFacts = [];

        // Store each fact with multiple sources
        for (const fact of parsedResponse.facts) {
            const { data: newFact, error } = await supabase
                .from('competitor_facts')
                .insert({
                    competitor_uuid: competitorUuid,
                    fact_type: fact.type,
                    fact_content: fact.fact,
                    fact_source: fact.sources[0].url,
                    fact_source_type: fact.sources[0].type,
                    fact_date: validateAndFormatDate(fact.sources[0].date),
                    fact_company: fact.company,
                    fact_upvote: 0,
                    fact_regenerated: 0,
                    fact_deleted: 0,
                    created_at: new Date().toISOString()
                })
                .select('*')
                .single();

            if (error) throw error;

            // Store additional sources
            for (let i = 1; i < fact.sources.length; i++) {
                await supabase.from('competitor_facts').insert({
                    competitor_uuid: competitorUuid,
                    fact_type: fact.type,
                    fact_content: fact.fact,
                    fact_source: fact.sources[i].url,
                    fact_date: validateAndFormatDate(fact.sources[i].date),
                    fact_upvote: 0,
                    fact_regenerated: 0,
                    fact_deleted: 0,
                    created_at: new Date().toISOString()
                });
            }

            storedFacts.push(newFact);
        }

        return storedFacts;
    } catch (error) {
        console.error('Error in generateAndStoreFacts:', error);
        throw error;
    }
};

const handleSaveBattlecard = async () => {
    try {
        await saveBattlecard(contentStore.battlecardData);
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

const handleViewRawFacts = () => {
    router.push(`/${userStore.userDetails.user_id}/battlecard/${competitorUuid}/facts`);
};

const regenerateSection = async (section) => {
    isLoading.value = true;
    try {
        let newContent;
        const company = await supabase.from('companies').select('company_name').eq('company_uuid', contentStore.competitorUuid).single();

        switch (section) {
            case 'overview':
                newContent = await generateBattlecardContent(contentStore.competitiveFacts, company.data.company_name, userStore.prospectUrl);
                contentStore.setBattlecardData({
                    ...contentStore.battlecardData,
                    overview: newContent.overview
                });
                break;
            case 'strengths':
                newContent = await generateBattlecardContent(contentStore.competitiveFacts, company.data.company_name, userStore.prospectUrl);
                contentStore.setBattlecardData({
                    ...contentStore.battlecardData,
                    strengths: newContent.strengths
                });
                break;
            case 'counter':
                newContent = await generateBattlecardContent(contentStore.competitiveFacts, company.data.company_name, userStore.prospectUrl);
                contentStore.setBattlecardData({
                    ...contentStore.battlecardData,
                    counter: newContent.counter
                });
                break;
        }
        toast.add({ severity: 'success', summary: 'Success', detail: `${section} section regenerated`, life: 3000 });
    } catch (error) {
        console.error(`Error regenerating ${section} section:`, error);
        toast.add({ severity: 'error', summary: 'Error', detail: `Failed to regenerate ${section} section`, life: 3000 });
    } finally {
        isLoading.value = false;
    }
};

const simulateProgress = (initialValue = 0, targetValue = 95) => {
    progress.value = initialValue;
    const progressInterval = setInterval(() => {
        if (progress.value < targetValue) {
            const remaining = targetValue - progress.value;
            const increment = Math.max(0.2, remaining * 0.03);
            progress.value = Math.min(targetValue, progress.value + increment);
        }
    }, 100);
    return progressInterval;
};

const validateAndFormatDate = (dateStr) => {
    try {
        // Handle just year format
        if (dateStr.length === 4) {
            return `${dateStr}-01-01`;
        }

        // Parse the date string and format it as YYYY-MM-DD
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
            return new Date().toISOString().split('T')[0]; // Fallback to today if invalid
        }
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Date parsing error:', error);
        return new Date().toISOString().split('T')[0]; // Fallback to today
    }
};

onMounted(async () => {
    try {
        progress.value = 0;
        stage.value = 'facts';
        const progressInterval = simulateProgress();

        // Check if we already have facts
        if (!contentStore.competitiveFacts.length) {
            try {
                const facts = await getFreshFacts(competitorUuid);
                contentStore.setCompetitiveFacts(facts);
            } catch (error) {
                console.error('Error generating facts:', error);
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate facts', life: 3000 });
                throw error; // Re-throw to trigger the final error state
            }
        }

        // Check if we already have battlecard data
        if (!contentStore.battlecardData) {
            stage.value = 'customizing';
            progress.value = 50;

            const { data: company, error: companyError } = await supabase.from('companies').select('company_uuid, company_name').eq('company_uuid', competitorUuid).single();

            if (companyError) throw companyError;

            try {
                const newBattlecardData = await generateBattlecardContent(contentStore.competitiveFacts, contentStore.competitorDetails.name, userStore.prospectUrl, contentStore.competitorDetails.domain);
                contentStore.setBattlecardData(newBattlecardData);
                progress.value = 100;
            } catch (error) {
                console.error('Error generating battlecard:', error);
                toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate battlecard', life: 3000 });
                throw error;
            }
        }

        clearInterval(progressInterval);
    } catch (error) {
        console.error('Error in generation process:', error);
        // Keep the progress bar visible but show error state
        progress.value = 100;
        stage.value = 'error';
    } finally {
        // Don't set isLoading to false if there was an error
        if (contentStore.battlecardData) {
            isLoading.value = false;
        }
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
            <div class="button-group">
                <Button label="Save Battlecard" icon="pi pi-save" @click="handleSaveBattlecard" class="save-button" severity="primary" />
                <Button label="View Raw Facts" icon="pi pi-table" @click="handleViewRawFacts" class="view-facts-button" severity="secondary" />
            </div>

            <!-- Overview Section -->
            <div class="section overview-section" v-if="contentStore.battlecardData?.overview">
                <div class="section-header">
                    <h1 class="section-title">{{ contentStore.battlecardData.overview.title }}</h1>
                    <Button icon="pi pi-refresh" @click="regenerateSection('overview')" class="regenerate-button" severity="secondary" text />
                </div>
                <div class="content" v-html="contentStore.battlecardData.overview.bodyHtml"></div>
            </div>

            <!-- Competitive Sections Container -->
            <div class="competitive-sections">
                <!-- Strengths Section -->
                <div class="section strengths-section" v-if="contentStore.battlecardData?.strengths">
                    <div class="section-header">
                        <h2 class="section-title">{{ contentStore.battlecardData.strengths.title }}</h2>
                        <Button icon="pi pi-refresh" @click="regenerateSection('strengths')" class="regenerate-button" severity="secondary" text />
                    </div>
                    <div class="prospect-url">for {{ userStore.prospectUrl }}</div>
                    <div class="content win-content">
                        <div v-for="(section, index) in contentStore.battlecardData.strengths.sections" :key="index" class="win-section">
                            <h2>
                                <strong>{{ section.summary }}</strong>
                            </h2>
                            <ComparisonTable :data="section.comparisonTable" type="strength" />
                            <ul>
                                <li><strong>Context:</strong> {{ section.context }}</li>
                            </ul>
                            <div class="fact-sources">
                                <span class="text-sm text-gray-600">Sources:</span>
                                <div class="source-links">
                                    <a v-for="(factId, idx) in section.factsUsed" :key="factId" :href="contentStore.competitiveFacts.find((f) => f.fact_uuid === factId)?.fact_source" target="_blank" class="source-link strength"> [{{ idx + 1 }}] </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Counter Section -->
                <div class="section counter-section" v-if="contentStore.battlecardData?.counter">
                    <div class="section-header">
                        <h2 class="section-title">{{ contentStore.battlecardData.counter.title }}</h2>
                        <Button icon="pi pi-refresh" @click="regenerateSection('counter')" class="regenerate-button" severity="secondary" text />
                    </div>
                    <div class="content lose-content">
                        <div v-for="(section, index) in contentStore.battlecardData.counter.sections" :key="index" class="lose-section">
                            <h2>
                                <strong>{{ section.summary }}</strong>
                            </h2>
                            <ComparisonTable :data="section.comparisonTable" type="counter" />
                            <ul>
                                <li><strong>Context:</strong> {{ section.context }}</li>
                            </ul>
                            <div class="fact-sources">
                                <span class="text-sm text-gray-600">Sources:</span>
                                <div class="source-links">
                                    <a v-for="(factId, idx) in section.factsUsed" :key="factId" :href="contentStore.competitiveFacts.find((f) => f.fact_uuid === factId)?.fact_source" target="_blank" class="source-link counter"> [{{ idx + 1 }}] </a>
                                </div>
                            </div>
                        </div>
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

.button-group {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    gap: 1rem;
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

.competitive-sections {
    @apply flex gap-6 mt-6;
}

.strengths-section,
.counter-section {
    @apply flex-1 flex flex-col;
    min-width: 45%;
}

.win-section,
.lose-section {
    @apply border-b border-gray-200 last:border-b-0 py-4 first:pt-0 last:pb-0;
}

.fact-sources {
    @apply mt-2 pt-2 border-t border-gray-200;
}

.source-links {
    @apply mt-1 flex flex-wrap gap-2;
}

.section-header {
    @apply flex justify-between items-center mb-4;
}

.regenerate-button {
    @apply ml-2;
}
</style>
