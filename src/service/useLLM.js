import { ref } from 'vue';

const cleanJSONResponse = (response) => {
    // Remove any markdown code blocks
    let cleaned = response.replace(/```json\s*|\s*```/g, '');

    // Find the first occurrence of '{'
    const startIndex = cleaned.indexOf('{');
    if (startIndex === -1) return null;

    // Find the last occurrence of '}'
    const endIndex = cleaned.lastIndexOf('}');
    if (endIndex === -1) return null;

    // Extract just the JSON object
    cleaned = cleaned.substring(startIndex, endIndex + 1);

    return cleaned;
};

export function useChatCompletion() {
    const loading = ref(false);

    const generateContent = async (content, temperature = 0.7, model = 'gpt-4o') => {
        const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
        const BASE_URL = 'https://litellm.staging.klue.io/v1/chat/completions';

        loading.value = true;

        try {
            const myHeaders = new Headers();
            myHeaders.append('Authorization', `Bearer ${API_KEY}`);
            myHeaders.append('Content-Type', 'application/json');

            const raw = JSON.stringify({
                model,
                messages: [{ role: 'user', content }],
                temperature
            });

            const requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };

            const response = await fetch(BASE_URL, requestOptions);

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            let messageContent = result.choices[0].message.content;

            // Clean and parse JSON content
            messageContent = messageContent
                .replace(/```json/g, '')
                .replace(/```/g, '')
                .trim();

            return messageContent;
        } catch (error) {
            console.error('Error generating content:', error.message);
            throw error;
        } finally {
            loading.value = false;
        }
    };
    const generateContentSpecificModel = async ({ model, messages, temperature }) => {
        const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
        const BASE_URL = 'https://litellm.staging.klue.io/v1/chat/completions';

        loading.value = true;

        try {
            const myHeaders = new Headers();
            myHeaders.append('Authorization', `Bearer ${API_KEY}`);
            myHeaders.append('Content-Type', 'application/json');

            const raw = JSON.stringify({
                model,
                messages,
                temperature
            });

            const requestOptions = {
                method: 'POST',
                headers: myHeaders,
                body: raw,
                redirect: 'follow'
            };

            const response = await fetch(BASE_URL, requestOptions);

            if (!response.ok) {
                throw new Error(`Error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            let messageContent = result.choices[0].message.content;
            return cleanJSONResponse(messageContent);
        } catch (error) {
            console.error('Error generating content:', error.message);
            throw error;
        } finally {
            loading.value = false;
        }
    };

    return { loading, generateContent, generateContentSpecificModel };
}
