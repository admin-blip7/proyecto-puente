'use server';

const DEAPI_BASE_URL = 'https://api.deapi.ai/api/v1/client';
const DEAPI_API_KEY = process.env.DEAPI_API_KEY;

if (!DEAPI_API_KEY) {
    console.warn("Missing DEAPI_API_KEY environment variable");
}

interface DeapiResponse {
    data: {
        request_id: string;
        status: 'PENDING' | 'COMPLETED' | 'FAILED';
    }
}

interface DeapiResult {
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    result?: {
        output_url: string;
    };
    error?: string;
}

async function pollRequest(requestId: string, maxWait = 120): Promise<string> {
    const startTime = Date.now();

    while ((Date.now() - startTime) / 1000 < maxWait) {
        const response = await fetch(`${DEAPI_BASE_URL}/request-status/${requestId}`, {
            headers: {
                'Authorization': `Bearer ${DEAPI_API_KEY}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            throw new Error(`Polling failed: ${response.statusText}`);
        }

        const data: DeapiResult = await response.json();

        // Handle potential nested data structure
        const resultData = (data as any).data || data;

        if ((resultData.status === 'done' || resultData.status === 'COMPLETED') && resultData.result_url) {
            return resultData.result_url;
        }

        // Fallback for previous structure if API changes back
        if (resultData.status === 'COMPLETED' && resultData.result?.output_url) {
            return resultData.result.output_url;
        }

        if (resultData.status === 'FAILED' || resultData.status === 'error') {
            throw new Error(resultData.error || 'Image generation failed');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error('Timeout waiting for image generation');
}

export async function generateProductImage(productName: string, category?: string): Promise<string> {
    const prompt = `Professional e-commerce product photo of ${productName}${category ? `, ${category}` : ''}, studio lighting, clean white background, centered, high quality`;

    const response = await fetch(`${DEAPI_BASE_URL}/txt2img`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEAPI_API_KEY}`
        },
        body: JSON.stringify({
            prompt,
            model: "ZImageTurbo_INT8",
            width: 768,
            height: 768,
            steps: 8,
            seed: Math.floor(Math.random() * 1000000),
            negative_prompt: ""
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("DEAPI Generate Error:", errorText);
        throw new Error(`Failed to start generation: ${errorText}`);
    }

    const data: DeapiResponse = await response.json();

    if (!data.data?.request_id) {
        throw new Error("No request_id received from API");
    }

    // Wait 1 second before first poll to allow propagation
    await new Promise(resolve => setTimeout(resolve, 1000));

    return pollRequest(data.data.request_id);
}

// Function to optimize image (remove background)
export async function optimizeProductImage(formData: FormData): Promise<string> {
    const imageFile = formData.get('image') as File;
    if (!imageFile) throw new Error("No image file provided");

    const prompt = "Professional product photography, clean pure white background (#FFFFFF), studio lighting, subtle shadow beneath object for realism";

    const apiFormData = new FormData();
    apiFormData.append('image', imageFile);
    apiFormData.append('prompt', prompt);
    apiFormData.append('model', "QwenImageEdit_Plus_NF4");
    // Qwen does not support guidance
    apiFormData.append('steps', '40');
    apiFormData.append('seed', String(Math.floor(Math.random() * 1000000)));
    apiFormData.append('negative_prompt', 'blur, darkness, noise');

    const response = await fetch(`${DEAPI_BASE_URL}/img2img`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${DEAPI_API_KEY}`,
            // auto content-type with boundary when passing formData
        },
        body: apiFormData
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start optimization: ${errorText}`);
    }

    const data: DeapiResponse = await response.json();
    return pollRequest(data.data.request_id);
}
