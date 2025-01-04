<script setup>
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const userStore = useUserStore();
const battlecards = ref([]);

const getBattlecardPreviews = async () => {
    const { data, error } = await supabase
        .from('user_battlecards')
        .select(
            `
            battlecard_uuid,
            battlecard_name,
            prospect_uuid,
            battlecard_json,
            prospects (prospect_url)
        `
        )
        .eq('user_uuid', userStore.userDetails.user_uuid);

    if (error) throw error;

    // Map and handle potential null values
    return data.map((card) => ({
        ...card,
        competitor_domain: card.battlecard_json?.overview?.competitor || 'Unknown Competitor',
        prospect_url: card.prospects?.prospect_url || 'No prospect URL'
    }));
};

const getCompanyLogo = async (domain) => {
    if (!domain) return null;
    try {
        const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${domain}`);
        const data = await response.json();
        return data.length > 0 ? data[0].logo : null;
    } catch (error) {
        console.error('Error fetching logo:', error);
        return null;
    }
};

const navigateToBattlecard = (battlecardUuid) => {
    router.push(`/${userStore.userDetails.user_id}/battlecard/${battlecardUuid}`);
};

onMounted(async () => {
    try {
        // If we don't have company details, get them first
        if (!userStore.userDetails.company_logo && userStore.userDetails.company_name) {
            await userStore.updateCompanyDetails();
        }

        const data = await getBattlecardPreviews();

        // Enhance battlecards with logos
        battlecards.value = await Promise.all(
            data.map(async (card) => {
                const competitorLogo = await getCompanyLogo(card.competitor_domain);

                return {
                    ...card,
                    competitorLogo,
                    ourLogo: userStore.userDetails.company_logo
                };
            })
        );
    } catch (error) {
        console.error('Error loading battlecards:', error);
    }
});
</script>

<template>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        <div v-for="card in battlecards" :key="card.battlecard_uuid" @click="navigateToBattlecard(card.battlecard_uuid)" class="battlecard-preview">
            <div class="logos-container">
                <img v-if="card.ourLogo" :src="card.ourLogo" alt="Our company" class="company-logo" />
                <div v-else class="company-logo-placeholder">Our Logo</div>
                <span class="vs-text">vs</span>
                <img v-if="card.competitorLogo" :src="card.competitorLogo" alt="Competitor" class="company-logo" />
                <div v-else class="company-logo-placeholder">Competitor Logo</div>
            </div>
            <h3 class="card-title">{{ card.battlecard_name }}</h3>
            <p class="prospect-url">Prospect: {{ card.prospect_url }}</p>
        </div>
    </div>
</template>

<style scoped>
.battlecard-preview {
    @apply bg-white rounded-lg shadow-md p-6 cursor-pointer transition-transform hover:scale-105;
}

.logos-container {
    @apply flex items-center justify-center space-x-4 mb-4;
}

.company-logo {
    @apply w-12 h-12 object-contain;
}

.vs-text {
    @apply text-lg font-semibold text-gray-500;
}

.card-title {
    @apply text-xl font-bold text-center mb-2;
}

.prospect-url {
    @apply text-sm text-gray-600 text-center;
}

.company-logo-placeholder {
    @apply w-12 h-12 bg-gray-200 flex items-center justify-center text-sm text-gray-500 rounded;
}
</style>
