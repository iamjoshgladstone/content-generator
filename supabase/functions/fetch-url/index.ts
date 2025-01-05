import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400'
};

serve(async (req) => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders,
            status: 200
        });
    }

    try {
        const { url } = await req.json();

        if (!url) {
            return new Response(JSON.stringify({ success: false, error: 'URL is required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400
            });
        }

        // Fetch the URL with appropriate headers
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Failed to fetch URL: ${response.status} ${response.statusText}`
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('text/html')) {
            return new Response(
                JSON.stringify({
                    success: false,
                    error: `Invalid content type: ${contentType}`
                }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        const html = await response.text();

        // Basic HTML cleaning (remove scripts, styles, etc.)
        const cleanContent = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        return new Response(
            JSON.stringify({
                success: true,
                content: cleanContent,
                contentType
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({
                success: false,
                error: error.message
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        );
    }
});
