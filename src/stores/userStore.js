import supabase from '@/utils/supabase';
import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
    state: () => ({
        isAuthenticated: false,
        userDetails: {
            user_id: null,
            created_at: null,
            user_uuid: null,
            company_name: null,
            user_email: null,
            first_name: null,
            last_name: null,
            sales_segment: null
        },
        competitors: [],
        loading: false,
        error: null,
        prospectUrl: null,
        prospectUuid: null
    }),

    getters: {
        isLoggedIn: (state) => state.isAuthenticated,
        getUserDetails: (state) => state.userDetails,
        getFullName: (state) => {
            if (state.userDetails.first_name && state.userDetails.last_name) {
                return `${state.userDetails.first_name} ${state.userDetails.last_name}`;
            }
            return null;
        }
    },

    actions: {
        async initializeUserState() {
            try {
                this.loading = true;
                const {
                    data: { user },
                    error
                } = await supabase.auth.getUser();

                if (error) throw error;

                if (user) {
                    this.isAuthenticated = true;
                    await this.fetchUserDetails(user);
                    console.log(user);
                }
            } catch (error) {
                this.error = error.message;
                console.error('Error initializing user state:', error);
            } finally {
                this.loading = false;
            }
        },

        async fetchUserDetails(user) {
            try {
                // First try to get existing user details
                const { data: existingUser, error: fetchError } = await supabase.from('user_storage').select('*').eq('user_email', user.email).single();

                if (fetchError && fetchError.code !== 'PGRST116') {
                    throw fetchError;
                }

                if (existingUser) {
                    // Update user details if found
                    this.userDetails = {
                        user_id: existingUser.user_id,
                        created_at: existingUser.created_at,
                        user_uuid: existingUser.user_uuid || user.id,
                        company_name: existingUser.company_name,
                        user_email: existingUser.user_email,
                        first_name: existingUser.first_name,
                        last_name: existingUser.last_name,
                        sales_segment: existingUser.sales_segment
                    };

                    // Update user_uuid if it's null
                    if (!existingUser.user_uuid) {
                        await this.updateUserUUID(existingUser.user_id, user.id);
                    }

                    await this.fetchUserCompetitors();
                } else {
                    // Create new user record if not found
                    const { data: newUser, error: insertError } = await supabase
                        .from('user_storage')
                        .insert([
                            {
                                user_email: user.email,
                                user_uuid: user.id
                            }
                        ])
                        .select()
                        .single();

                    if (insertError) throw insertError;

                    this.userDetails = {
                        user_id: newUser.user_id,
                        created_at: newUser.created_at,
                        user_uuid: newUser.user_uuid,
                        company_name: null,
                        user_email: newUser.user_email,
                        first_name: null,
                        last_name: null,
                        sales_segment: null
                    };
                }
            } catch (error) {
                this.error = error.message;
                console.error('Error fetching user details:', error);
            }
        },

        async updateUserUUID(userId, uuid) {
            try {
                const { error } = await supabase.from('user_storage').update({ user_uuid: uuid }).eq('user_id', userId);

                if (error) throw error;
            } catch (error) {
                console.error('Error updating user UUID:', error);
            }
        },

        async updateUserDetails(details) {
            try {
                const { error } = await supabase.from('user_storage').update(details).eq('user_id', this.userDetails.user_id);

                if (error) throw error;

                this.userDetails = {
                    ...this.userDetails,
                    ...details
                };
            } catch (error) {
                this.error = error.message;
                console.error('Error updating user details:', error);
            }
        },

        clearUserState() {
            this.isAuthenticated = false;
            this.userDetails = {
                user_id: null,
                created_at: null,
                user_uuid: null,
                company_name: null,
                user_email: null,
                first_name: null,
                last_name: null,
                sales_segment: null
            };
            this.error = null;
        },

        async signOut() {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;

                this.clearUserState();
            } catch (error) {
                console.error('Error signing out:', error);
                throw error;
            }
        },

        async fetchUserCompetitors() {
            try {
                // Step 1: Get all competitor_uuids for this user
                const { data: userCompetitors, error: userCompetitorsError } = await supabase.from('user_competitors').select('competitor_uuid').eq('user_uuid', this.userDetails.user_uuid);

                if (userCompetitorsError) throw userCompetitorsError;

                if (!userCompetitors.length) return [];

                // Step 2: Get company details for each competitor_uuid
                const { data: companies, error: companiesError } = await supabase
                    .from('companies')
                    .select('company_name, company_logo, company_domain')
                    .in(
                        'company_uuid',
                        userCompetitors.map((uc) => uc.competitor_uuid)
                    );

                if (companiesError) throw companiesError;

                // Map the companies data to the expected format
                return companies.map((company) => ({
                    name: company.company_name,
                    logo_url: company.company_logo,
                    website: company.company_domain
                }));
            } catch (error) {
                console.error('Error fetching user competitors:', error);
                return [];
            }
        },

        async updateCompetitors(competitors) {
            try {
                // Update the store's competitors array
                this.competitors = competitors;
                return true;
            } catch (error) {
                console.error('Error updating competitors in store:', error);
                return false;
            }
        },

        async updateCompanyDetails() {
            try {
                if (!this.userDetails.company_name) return;

                // Try to get company logo from Clearbit
                const response = await fetch(`https://autocomplete.clearbit.com/v1/companies/suggest?query=${this.userDetails.company_name}`);
                const data = await response.json();
                const companyLogo = data.length > 0 ? data[0].logo : null;

                // Update user details in database with company logo
                const { error } = await supabase.from('user_storage').update({ company_logo: companyLogo }).eq('user_uuid', this.userDetails.user_uuid);

                if (error) throw error;

                // Update local state
                this.userDetails = {
                    ...this.userDetails,
                    company_logo: companyLogo
                };
            } catch (error) {
                console.error('Error updating company details:', error);
                throw error;
            }
        },

        setProspectUrl(url) {
            this.prospectUrl = url;
        },

        setProspectUuid(uuid) {
            this.prospectUuid = uuid;
        }
    }
});
