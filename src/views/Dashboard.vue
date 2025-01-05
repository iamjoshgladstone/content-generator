<script setup>
import { useUserStore } from '@/stores/userStore';
import { supabase } from '@/utils/supabase';
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import { useToast } from 'primevue/usetoast';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const userStore = useUserStore();
const battlecards = ref([]);
const filterType = ref('all'); // 'all', 'prospect', 'competitor'
const deleteDialog = ref(false);
const selectedCard = ref(null);
const toast = useToast();

const getBattlecardPreviews = async () => {
    const { data, error } = await supabase
        .from('user_battlecards')
        .select(
            `
            battlecard_uuid,
            battlecard_name,
            prospect_uuid,
            battlecard_json,
            prospects (
                prospect_name,
                prospect_url
            )
        `
        )
        .eq('user_uuid', userStore.userDetails.user_uuid);

    if (error) throw error;

    // Map and handle potential null values
    return data.map((card) => ({
        ...card,
        competitor_domain: card.battlecard_json?.overview?.competitor || 'Unknown Competitor',
        prospect_name: card.prospects?.prospect_name || 'No prospect listed',
        prospect_url: card.prospects?.prospect_url || ''
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

const groupedBattlecards = computed(() => {
    if (filterType.value === 'all') {
        return { 'All Battlecards': battlecards.value };
    }

    return battlecards.value.reduce((groups, card) => {
        const key = filterType.value === 'prospect' ? card.prospect_name || 'No Prospect' : card.competitor_domain || 'Unknown Competitor';

        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(card);
        return groups;
    }, {});
});

const confirmDelete = (card, event) => {
    event.stopPropagation(); // Prevent card click navigation
    selectedCard.value = card;
    deleteDialog.value = true;
};

const deleteBattlecard = async () => {
    try {
        const { error } = await supabase.from('user_battlecards').delete().eq('battlecard_uuid', selectedCard.value.battlecard_uuid);

        if (error) throw error;

        // Remove from local state
        battlecards.value = battlecards.value.filter((card) => card.battlecard_uuid !== selectedCard.value.battlecard_uuid);

        // Close dialog and show success message
        deleteDialog.value = false;
        selectedCard.value = null;
        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Battlecard deleted successfully',
            life: 3000
        });
    } catch (error) {
        console.error('Error deleting battlecard:', error);
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete battlecard',
            life: 3000
        });
    }
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
    <div v-if="battlecards.length === 0" class="flex justify-center items-center h-screen">
        <p class="text-2xl font-bold">No battlecards found. Please create a new battlecard.</p>
    </div>
    <div v-else>
        <!-- Filter Buttons -->
        <div class="flex gap-4 p-6 pb-0">
            <Button :class="{ 'p-button-outlined': filterType !== 'all' }" @click="filterType = 'all'" label="All" />
            <Button :class="{ 'p-button-outlined': filterType !== 'prospect' }" @click="filterType = 'prospect'" label="Group by Prospect" />
            <Button :class="{ 'p-button-outlined': filterType !== 'competitor' }" @click="filterType = 'competitor'" label="Group by Competitor" />
        </div>

        <!-- Grouped Battlecards -->
        <div class="p-6">
            <div v-for="(cards, groupName) in groupedBattlecards" :key="groupName" class="mb-8">
                <h2 class="text-xl font-bold mb-4">{{ groupName }}</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div v-for="card in cards" :key="card.battlecard_uuid" @click="navigateToBattlecard(card.battlecard_uuid)" class="battlecard-preview relative">
                        <button @click="confirmDelete(card, $event)" class="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-md hover:bg-red-50 transition-colors" title="Delete battlecard">
                            <i class="pi pi-trash text-red-500"></i>
                        </button>
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
            </div>
        </div>
    </div>

    <Dialog v-model:visible="deleteDialog" modal header="Confirm Deletion" :style="{ width: '450px' }">
        <div class="flex items-center gap-4">
            <i class="pi pi-exclamation-triangle text-yellow-500 text-2xl" />
            <span>Are you sure you want to delete this battlecard?</span>
        </div>
        <template #footer>
            <Button label="No" icon="pi pi-times" @click="deleteDialog = false" class="p-button-text" />
            <Button label="Yes" icon="pi pi-check" @click="deleteBattlecard" severity="danger" />
        </template>
    </Dialog>
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

.battlecard-preview:hover .delete-button {
    @apply opacity-100;
}

.delete-button {
    @apply opacity-0 transition-opacity duration-200;
}
</style>
