<script setup>
import { supabase } from '@/utils/supabase.js';
import { onMounted, ref } from 'vue';

const competitors = ref([]);
const error = ref(null);

onMounted(async () => {
    try {
        let { data, error: supabaseError } = await supabase.from('competitors').select('*');
        competitors.value = data;
        error.value = supabaseError;
    } catch (err) {
        console.error(err);
        error.value = err;
    }
});
</script>

<template>
    <h1>Configure Competitors</h1>
    <div v-if="error">
        <p>Error: {{ error }}</p>
    </div>
    <div v-else>
        <p>Competitors: {{ competitors }}</p>
    </div>
</template>
