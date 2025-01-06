<script setup>
import ProgressBar from 'primevue/progressbar';
import Skeleton from 'primevue/skeleton';
import { ref, watch } from 'vue';

const props = defineProps({
    stage: {
        type: String,
        required: true
    },
    progress: {
        type: Number,
        required: true
    }
});

const stageText = ref('');
const detailText = ref('');

watch(
    [() => props.stage, () => props.progress],
    ([newStage, newProgress]) => {
        switch (newStage) {
            case 'facts':
                stageText.value = 'Researching Competitive Intelligence';
                if (newProgress < 30) {
                    detailText.value = 'Scanning recent news articles and press releases...';
                } else if (newProgress < 60) {
                    detailText.value = 'Analyzing social media and company announcements...';
                } else {
                    detailText.value = 'Validating sources and extracting key facts...';
                }
                break;
            case 'customizing':
                stageText.value = 'Customizing Battlecard';
                if (newProgress < 70) {
                    detailText.value = 'Generating competitive overview...';
                } else if (newProgress < 85) {
                    detailText.value = 'Creating winning strategies...';
                } else {
                    detailText.value = 'Finalizing competitive positioning...';
                }
                break;
            case 'error':
                stageText.value = 'Error Generating Battlecard';
                detailText.value = 'Please try again or contact support if the issue persists.';
                break;
            default:
                stageText.value = '';
                detailText.value = '';
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="flex flex-col items-center justify-center p-8 space-y-6">
        <div class="text-center space-y-2">
            <h3 class="text-xl font-semibold">{{ stageText }}</h3>
            <p class="text-gray-600">{{ detailText }}</p>
        </div>

        <ProgressBar :value="progress" class="w-full" />

        <!-- Skeleton Loading Template -->
        <div v-if="progress < 100" class="w-full max-w-4xl space-y-8 mt-8">
            <div class="space-y-4">
                <Skeleton width="60%" height="2rem" />
                <Skeleton width="100%" height="8rem" />
            </div>

            <div class="space-y-4">
                <Skeleton width="40%" height="2rem" />
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton width="100%" height="6rem" />
                    <Skeleton width="100%" height="6rem" />
                </div>
            </div>

            <div class="space-y-4">
                <Skeleton width="50%" height="2rem" />
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton width="100%" height="10rem" />
                    <Skeleton width="100%" height="10rem" />
                    <Skeleton width="100%" height="10rem" />
                </div>
            </div>
        </div>
    </div>
</template>
