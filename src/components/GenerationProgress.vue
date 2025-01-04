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

watch(
    () => props.stage,
    (newStage) => {
        switch (newStage) {
            case 'facts':
                stageText.value = 'Generating Facts';
                break;
            case 'customizing':
                stageText.value = 'Customizing Battlecard to Your Prospect';
                break;
            default:
                stageText.value = '';
        }
    },
    { immediate: true }
);
</script>

<template>
    <div class="flex flex-col items-center justify-center p-8">
        <h3 class="text-xl mb-4">{{ stageText }}</h3>
        <ProgressBar :value="progress" class="w-full" />
    </div>
</template>
