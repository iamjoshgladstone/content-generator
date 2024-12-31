<script setup>
console.log('hello');
import { supabase } from '../utils/supabase';

const { data, error } = await supabase.from('competitors').select('*');

console.log(data, error);
</script>

<template>
    <h1>Configure Competitors</h1>
</template>
