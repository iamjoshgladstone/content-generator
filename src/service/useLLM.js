import { ref } from 'vue';

const cleanJSONResponse = (response) => {
    console.log('Cleaning JSON response:', response);

    // First, normalize line endings and remove any markdown
    let cleaned = response
        .replace(/\r?\n/g, '') // Remove line breaks
        .replace(/```json\s*|\s*```/g, '')
        .trim();

    // Find the JSON boundaries
    const startIndex = cleaned.indexOf('{');
    const endIndex = cleaned.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1) {
        console.error('No valid JSON object found in response');
        return null;
    }

    cleaned = cleaned.substring(startIndex, endIndex + 1);

    // Validate the JSON structure
    try {
        JSON.parse(cleaned); // Test if it's valid JSON
        return cleaned;
    } catch (error) {
        console.error('Invalid JSON structure:', error);
        return null;
    }
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
