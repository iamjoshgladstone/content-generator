<script setup>
import ProgressBar from 'primevue/progressbar';
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
const subTask = ref('');

watch(
    () => props.stage,
    (newStage) => {
        switch (newStage) {
            case 'facts':
                stageText.value = 'Gathering Competitive Intelligence';
                break;
            case 'customizing':
                stageText.value = 'Crafting Your Battlecard';
                break;
            default:
                stageText.value = '';
        }
    },
    { immediate: true }
);

watch(
    () => props.progress,
    (newProgress) => {
        if (props.stage === 'facts') {
            if (newProgress < 25) {
                subTask.value = 'Researching competitor strengths...';
            } else if (newProgress < 50) {
                subTask.value = 'Analyzing competitive weaknesses...';
            }
        } else if (props.stage === 'customizing') {
            if (newProgress < 60) {
                subTask.value = 'Analyzing prospect needs...';
            } else if (newProgress < 70) {
                subTask.value = 'Writing competitive overview...';
            } else if (newProgress < 85) {
                subTask.value = 'Identifying key competitive advantages...';
            } else if (newProgress < 100) {
                subTask.value = 'Preparing defensive strategies...';
            } else {
                subTask.value = 'Finalizing battlecard...';
            }
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="flex flex-col items-center justify-center p-8">
        <h2 class="text-2xl font-bold mb-2">{{ stageText }}</h2>
        <p class="text-gray-600 mb-4">{{ subTask }}</p>
        <ProgressBar :value="progress" class="w-full" :class="{ 'animate-pulse': progress < 100 }" />
        <p class="text-sm text-gray-500 mt-2">{{ progress }}% Complete</p>
    </div>
</template>

<style scoped>
.animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
    0%,
    100% {
        opacity: 1;
    }
    50% {
        opacity: 0.7;
    }
}
</style>
