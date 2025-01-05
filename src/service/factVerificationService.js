import { useChatCompletion } from './useLLM';

class FactVerificationService {
    constructor(llmService) {
        this.llmService = llmService;
    }

    async verifyFact(fact, sources) {
        try {
            // First validate the sources
            const validatedSources = await this.validateUrls(sources);
            if (validatedSources.length < 2) {
                return {
                    isValid: false,
                    reason: 'Insufficient valid sources',
                    validSources: validatedSources
                };
            }

            // Verify the fact's content and context
            const semanticVerification = await this.performSemanticVerification(fact, sources);
            if (!semanticVerification.isValid) {
                return {
                    isValid: false,
                    reason: semanticVerification.reason,
                    validSources: validatedSources,
                    verificationDetails: { semantic: semanticVerification }
                };
            }

            // Cross-reference the fact with sources
            const crossReference = await this.crossReferenceFactWithSources(fact, sources);
            if (!crossReference.isValid) {
                return {
                    isValid: false,
                    reason: crossReference.reason,
                    validSources: validatedSources,
                    verificationDetails: {
                        semantic: semanticVerification,
                        crossReference
                    }
                };
            }

            // Verify dates
            const dateVerification = await this.verifyDates(sources);
            if (!dateVerification.isValid) {
                return {
                    isValid: false,
                    reason: dateVerification.reason,
                    validSources: validatedSources,
                    verificationDetails: {
                        semantic: semanticVerification,
                        crossReference,
                        dates: dateVerification
                    }
                };
            }

            return {
                isValid: true,
                reason: 'Fact verified successfully',
                validSources: validatedSources,
                verificationDetails: {
                    semantic: semanticVerification,
                    crossReference,
                    dates: dateVerification
                }
            };
        } catch (error) {
            console.error('Fact verification error:', error);
            return {
                isValid: false,
                reason: 'Verification process failed',
                error: error.message
            };
        }
    }

    async validateUrls(sources) {
        const validSources = [];

        for (const source of sources) {
            try {
                if (!this.isValidUrlFormat(source.url)) {
                    console.log(`Invalid URL format: ${source.url}`);
                    continue;
                }

                const prompt = `Analyze this URL for credibility: ${source.url}

                Return a JSON object with this exact structure:
                {
                    "isValid": true or false,
                    "credibilityScore": number between 0 and 1,
                    "sourceType": one of ["news", "press-release", "research", "official-document", "blog"],
                    "analysis": "your detailed explanation",
                    "date": "YYYY-MM-DD"
                }`;

                const response = await this.llmService.generateContentSpecificModel({
                    model: 'claude-3.5-sonnet',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a URL validation expert. You must return only valid JSON matching the exact structure requested.'
                        },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0
                });

                let result;
                try {
                    const cleanResponse = response.trim().replace(/```json\n?|\n?```/g, '');
                    result = JSON.parse(cleanResponse);
                } catch (parseError) {
                    console.error(`JSON parse error for ${source.url}:`, parseError);
                    console.log('Raw response:', response);
                    continue;
                }

                if (result.isValid && result.credibilityScore >= 0.7) {
                    validSources.push({
                        ...source,
                        credibilityScore: result.credibilityScore,
                        sourceType: result.sourceType,
                        analysis: result.analysis,
                        date: result.date
                    });
                } else {
                    console.log(`URL validation failed for ${source.url}: ${result.analysis}`);
                }
            } catch (error) {
                console.error(`URL validation error for ${source.url}:`, error);
            }
        }

        return validSources;
    }

    async crossReferenceFactWithSources(fact, sources) {
        const prompt = `Verify if this fact is likely accurate based on the provided sources:

        Fact: "${fact}"
        Sources: ${JSON.stringify(sources.map((s) => ({ url: s.url, type: s.sourceType })))}

        Requirements:
        1. Assess if these sources would likely contain this information
        2. Check if the fact aligns with typical content from these sources
        3. Verify if the combination of sources provides sufficient validation

        Return a JSON response:
        {
            "isSupported": boolean,
            "confidence": number (0-1),
            "analysis": "detailed explanation of verification",
            "likelyQuotes": ["potential quotes that would support this fact"]
        }`;

        const response = await this.llmService.generateContentSpecificModel({
            model: 'claude-3.5-sonnet',
            messages: [
                {
                    role: 'system',
                    content: 'You are a fact verification expert. Analyze if sources would reasonably support the given fact based on your knowledge of these sources and their typical content.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        });

        const result = JSON.parse(response);

        return {
            isValid: result.isSupported && result.confidence > 0.8,
            reason: result.analysis,
            verificationResults: [result]
        };
    }

    async performSemanticVerification(fact, sources) {
        const prompt = `Perform a semantic analysis of this fact and its claimed sources:

        Fact: "${fact}"
        Sources: ${JSON.stringify(sources.map((s) => ({ url: s.url, type: s.sourceType })))}

        Verify:
        1. Logical consistency of the fact
        2. Plausibility given the sources
        3. Temporal consistency
        4. Statistical reasonableness
        5. Attribution accuracy

        Return a JSON response:
        {
            "isValid": boolean,
            "confidence": number (0-1),
            "issues": [array of potential issues],
            "analysis": "detailed semantic analysis"
        }`;

        const response = await this.llmService.generateContentSpecificModel({
            model: 'claude-3.5-sonnet',
            messages: [
                {
                    role: 'system',
                    content: 'You are a semantic analysis expert. Verify the logical consistency and plausibility of facts based on claimed sources.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        });

        const result = JSON.parse(response);
        return {
            isValid: result.isValid && result.confidence > 0.8,
            reason: result.analysis,
            details: result
        };
    }

    isValidUrlFormat(url) {
        try {
            const parsedUrl = new URL(url);
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.length > 0 && /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/.test(parsedUrl.hostname);
        } catch {
            return false;
        }
    }

    async verifyDates(sources) {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

        // Use LLM to verify if the sources are likely recent
        const prompt = `Analyze these source URLs to determine if they are likely recent (within the last 3 months):

        Sources: ${JSON.stringify(sources.map((s) => s.url))}

        Consider:
        1. URL patterns that might indicate dates
        2. Types of content (news articles, press releases, etc.)
        3. Typical update frequencies for these sources

        Return a JSON response:
        {
            "areRecent": boolean,
            "confidence": number (0-1),
            "analysis": "explanation of date assessment"
        }`;

        const response = await this.llmService.generateContentSpecificModel({
            model: 'claude-3.5-sonnet',
            messages: [
                {
                    role: 'system',
                    content: 'You are a source dating expert. Analyze URLs and source types to assess their likely publication dates.'
                },
                { role: 'user', content: prompt }
            ],
            temperature: 0.1
        });

        const result = JSON.parse(response);

        return {
            isValid: result.areRecent && result.confidence > 0.8,
            reason: result.analysis,
            threshold: threeMonthsAgo.toISOString()
        };
    }
}

export const factVerificationService = new FactVerificationService(useChatCompletion());
