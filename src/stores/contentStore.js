import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useContentStore = defineStore('content', () => {
    const battlecardData = ref(null);
    const competitiveFacts = ref([]);
    const competitorUuid = ref(null);

    const setBattlecardData = (data) => {
        battlecardData.value = data;
    };

    const setCompetitiveFacts = (facts) => {
        competitiveFacts.value = facts;
    };

    const setCompetitorUuid = (uuid) => {
        competitorUuid.value = uuid;
    };

    const clearBattlecardData = () => {
        battlecardData.value = null;
    };

    const clearCompetitiveFacts = () => {
        competitiveFacts.value = [];
    };

    return {
        battlecardData,
        competitiveFacts,
        competitorUuid,
        setBattlecardData,
        setCompetitiveFacts,
        setCompetitorUuid,
        clearBattlecardData,
        clearCompetitiveFacts
    };
});
