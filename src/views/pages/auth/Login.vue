<script setup>
import supabase from '@/utils/supabase';
import { useToast } from 'primevue/usetoast';
import { ref } from 'vue';

const toast = useToast();
const email = ref('');
const isSubmitting = ref(false);
const isSuccess = ref(false);

const handleUserStorage = async (userEmail) => {
    try {
        // Check if the user already exists
        const { data: existingUser, error } = await supabase.from('user_storage').select('user_email').eq('user_email', userEmail).single();

        if (error && error.code !== 'PGRST116') {
            throw error; // Handle unexpected errors
        }

        if (!existingUser) {
            // Generate random 8 digit number for user_id
            const userId = Math.floor(10000000 + Math.random() * 90000000);
            // Insert the new user
            const { error: insertError } = await supabase.from('user_storage').insert([
                {
                    user_email: userEmail,
                    user_id: userId
                }
            ]);

            if (insertError) throw insertError;
        }
    } catch (error) {
        console.error('Error handling user storage:', error);
    }
};

const sendMagicLink = async () => {
    if (!email.value) {
        toast.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Please enter a valid email address.',
            life: 3000
        });
        return;
    }

    isSubmitting.value = true;

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email: email.value,
            options: {
                emailRedirectTo: window.location.origin
            }
        });

        if (error) {
            console.error('Supabase OTP Error:', error);
            toast.add({
                severity: 'error',
                summary: 'Authentication Error',
                detail: error.message || 'Failed to send magic link. Please try again.',
                life: 5000
            });
        } else {
            // Store the email in the user_storage table
            await handleUserStorage(email.value);

            toast.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Magic link sent! Please check your email.',
                life: 5000
            });
            isSuccess.value = true;
        }
    } catch (err) {
        console.error('Unexpected error during OTP:', err);
        toast.add({
            severity: 'error',
            summary: 'System Error',
            detail: 'An unexpected error occurred. Please try again later.',
            life: 5000
        });
    } finally {
        isSubmitting.value = false;
    }
};
</script>

<template>
    <div class="bg-surface-50 dark:bg-surface-950 flex items-center justify-center min-h-screen min-w-[100vw] overflow-hidden">
        <Toast />
        <!-- Add Toast component to the template -->
        <div class="flex flex-col items-center justify-center">
            <div style="border-radius: 56px; padding: 0.3rem; background: linear-gradient(180deg, var(--primary-color) 10%, rgba(33, 150, 243, 0) 30%)">
                <div class="w-full bg-surface-0 dark:bg-surface-900 py-20 px-8 sm:px-20" style="border-radius: 53px">
                    <div class="text-center mb-8">
                        <img src="/klue_logo.ico" alt="Klue Logo" class="mb-8 w-16 shrink-0 mx-auto" />
                        <div class="text-surface-900 dark:text-surface-0 text-3xl font-medium mb-4">Welcome to Klue Content Generator!</div>
                        <span class="text-muted-color font-medium">Enter your email below to sign in.</span>
                    </div>
                    <!-- Email + Link -->
                    <div v-if="!isSuccess">
                        <label for="email1" class="block text-surface-900 dark:text-surface-0 text-xl font-medium mb-2">Email</label>
                        <InputText id="email1" type="text" placeholder="Email address" class="w-full mb-8" v-model="email" />

                        <Button label="Send Magic Link" class="w-full" :disabled="isSubmitting" @click="sendMagicLink">
                            <template #default>
                                <span v-if="isSubmitting">Sending...</span>
                                <span v-else>Send Magic Link</span>
                            </template>
                        </Button>
                    </div>
                    <!-- Success Message -->
                    <Transition name="fade">
                        <div v-if="isSuccess" class="text-center">
                            <i class="pi pi-check-circle text-green-500 text-5xl mb-4"></i>
                            <div class="text-surface-900 dark:text-surface-0 text-2xl font-medium mb-2">Magic Link Sent!</div>
                            <p class="text-muted-color">Please check your email for the login link.</p>
                        </div>
                    </Transition>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.pi-eye {
    transform: scale(1.6);
    margin-right: 1rem;
}

.pi-eye-slash {
    transform: scale(1.6);
    margin-right: 1rem;
}
</style>
