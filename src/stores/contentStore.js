import { defineStore } from 'pinia';

export const useContentStore = defineStore('content', {
    state: () => ({
        competitiveFacts: [],
        battlecardData: null,
        competitorUuid: null,
        prospectUrl: null
    }),

    actions: {
        setCompetitiveFacts(facts) {
            this.competitiveFacts = facts;
        },

        setBattlecardData(data) {
            this.battlecardData = data;
        },

        setCompetitorUuid(uuid) {
            this.competitorUuid = uuid;
        },

        setProspectUrl(url) {
            this.prospectUrl = url;
        },

        clearContent() {
            this.competitiveFacts = [];
            this.battlecardData = null;
            this.competitorUuid = null;
            this.prospectUrl = null;
        }
    }
});
