'use server';
/**
 * @fileOverview An AI flow to generate a product image for e-commerce.
 *
 * - generateProductImage - A function that takes a product name and returns a generated image.
 * - GenerateProductImageInput - The input type for the function.
 * - GenerateProductImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { 
    GenerateProductImageInputSchema,
    GenerateProductImageOutputSchema,
    GenerateProductImageInput,
    GenerateProductImageOutput
} from './types';

export async function generateProductImage(input: GenerateProductImageInput): Promise<GenerateProductImageOutput> {
    return generateProductImageFlow(input);
}

const generateProductImageFlow = ai.defineFlow(
    {
      name: 'generateProductImageFlow',
      inputSchema: GenerateProductImageInputSchema,
      outputSchema: GenerateProductImageOutputSchema,
    },
    async (input) => {
        const { media } = await ai.generate({
            model: 'googleai/imagen-4.0-fast-generate-001',
            prompt: `Professional e-commerce product photo of a "${input.productName}", studio lighting, clean white background, centered`,
            config: {
              responseModalities: ['IMAGE'],
            },
        });

        if (!media?.url) {
            throw new Error('Image generation failed to return an image.');
        }
        
        return {
            imageUrl: media.url,
        };
    }
);
