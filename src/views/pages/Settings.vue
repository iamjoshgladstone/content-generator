<script setup>
import { ref } from 'vue';

const userSettings = ref({
    firstName: '',
    lastName: '',
    companyName: '',
    segment: null
});

const segments = ref([
    { label: 'Growth', value: 'growth' },
    { label: 'Mid Market', value: 'midmarket' },
    { label: 'Enterprise', value: 'enterprise' }
]);

const saveSettings = () => {
    // TODO: Implement save functionality
    // This would typically involve calling your backend API
    console.log('Saving settings:', userSettings.value);
};
</script>

<template>
    <div class="card">
        <h1 class="text-3xl font-bold mb-6">Profile Settings</h1>

        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6">
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="firstName" class="block font-medium mb-2">First Name</label>
                        <InputText id="firstName" v-model="userSettings.firstName" class="w-full" placeholder="Enter your first name" />
                    </div>

                    <div>
                        <label for="lastName" class="block font-medium mb-2">Last Name</label>
                        <InputText id="lastName" v-model="userSettings.lastName" class="w-full" placeholder="Enter your last name" />
                    </div>

                    <div>
                        <label for="companyName" class="block font-medium mb-2">Company Name</label>
                        <InputText id="companyName" v-model="userSettings.companyName" class="w-full" placeholder="Enter your company name" />
                    </div>

                    <div>
                        <label for="segment" class="block font-medium mb-2">Segment</label>
                        <Dropdown id="segment" v-model="userSettings.segment" :options="segments" optionLabel="label" optionValue="value" placeholder="Select your segment" class="w-full" />
                    </div>

                    <div>
                        <Button label="Save Changes" @click="saveSettings" class="w-full md:w-auto" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
