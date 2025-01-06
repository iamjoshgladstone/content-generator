import { defineStore } from 'pinia';

export const useContentStore = defineStore('content', {
    state: () => ({
        competitiveFacts: [],
        battlecardData: null,
        competitorDetails: {
            name: '',
            domain: ''
        }
    }),
    actions: {
        setCompetitiveFacts(facts) {
            this.competitiveFacts = facts;
        },
        setBattlecardData(data) {
            this.battlecardData = data;
        },
        setCompetitorDetails(details) {
            this.competitorDetails = {
                name: details.name,
                domain: details.domain
            };
        },
        clearBattlecardData() {
            this.battlecardData = null;
        },
        clearCompetitiveFacts() {
            this.competitiveFacts = [];
        },
        clearCompetitorDetails() {
            this.competitorDetails = {
                name: '',
                domain: ''
            };
        }
    }
});
