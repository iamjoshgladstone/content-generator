<script setup>
import { useUserStore } from '@/stores/userStore';
import { useToast } from 'primevue/usetoast';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const userStore = useUserStore();
const router = useRouter();
const toast = useToast();

// Add this new ref to track edit states
const editStates = ref({
    firstName: false,
    lastName: false,
    companyName: false,
    segment: false
});

const userSettings = ref({
    firstName: '',
    lastName: '',
    companyName: '',
    segment: null
});

// Add this function to toggle edit state
const toggleEdit = (field) => {
    editStates.value[field] = !editStates.value[field];
};

const segments = ref([
    { label: 'Growth', value: 'growth' },
    { label: 'Mid Market', value: 'midmarket' },
    { label: 'Enterprise', value: 'enterprise' }
]);

// Initialize form with current user data
onMounted(() => {
    const currentUser = userStore.getUserDetails;
    userSettings.value = {
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        companyName: currentUser.company_name || '',
        segment: currentUser.sales_segment || null
    };
});

const handleSignOut = async () => {
    try {
        await userStore.signOut();
        router.push('/auth/login');
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to sign out. Please try again.',
            life: 3000
        });
    }
};

const saveSettings = async () => {
    try {
        // Map form fields to database fields
        const updatedDetails = {
            first_name: userSettings.value.firstName,
            last_name: userSettings.value.lastName,
            company_name: userSettings.value.companyName,
            sales_segment: userSettings.value.segment
        };

        await userStore.updateUserDetails(updatedDetails);

        // Reset all edit states to false
        Object.keys(editStates.value).forEach((key) => {
            editStates.value[key] = false;
        });

        toast.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Settings saved successfully',
            life: 3000
        });
    } catch (error) {
        toast.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to save settings. Please try again.',
            life: 3000
        });
    }
};
</script>

<template>
    <div class="card">
        <div class="flex justify-between items-center mb-6">
            <h1 class="text-3xl font-bold">Profile Settings</h1>
            <Button label="Sign Out" severity="danger" @click="handleSignOut" icon="pi pi-sign-out" />
        </div>

        <div class="grid grid-cols-12 gap-6">
            <div class="col-span-12 md:col-span-6">
                <div class="flex flex-col gap-6">
                    <div>
                        <label for="firstName" class="block font-medium mb-2">First Name</label>
                        <div class="flex items-center gap-2">
                            <InputText id="firstName" v-model="userSettings.firstName" class="w-full" placeholder="Enter your first name" :disabled="!editStates.firstName" />
                            <Button icon="pi pi-pencil" text @click="toggleEdit('firstName')" :class="{ 'text-primary': editStates.firstName }" aria-label="Edit first name" />
                        </div>
                    </div>

                    <div>
                        <label for="lastName" class="block font-medium mb-2">Last Name</label>
                        <div class="flex items-center gap-2">
                            <InputText id="lastName" v-model="userSettings.lastName" class="w-full" placeholder="Enter your last name" :disabled="!editStates.lastName" />
                            <Button icon="pi pi-pencil" text @click="toggleEdit('lastName')" :class="{ 'text-primary': editStates.lastName }" aria-label="Edit last name" />
                        </div>
                    </div>

                    <div>
                        <label for="companyName" class="block font-medium mb-2">Company Name</label>
                        <div class="flex items-center gap-2">
                            <InputText id="companyName" v-model="userSettings.companyName" class="w-full" placeholder="Enter your company name" :disabled="!editStates.companyName" />
                            <Button icon="pi pi-pencil" text @click="toggleEdit('companyName')" :class="{ 'text-primary': editStates.companyName }" aria-label="Edit company name" />
                        </div>
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
