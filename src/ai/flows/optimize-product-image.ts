'use server';
/**
 * @fileOverview An AI flow to optimize a product image for e-commerce.
 *
 * - optimizeProductImage - A function that takes an image and returns a version with a clean background.
 * - OptimizeImageInput - The input type for the function.
 * - OptimizeImageOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import {
    OptimizeProductImageInputSchema,
    OptimizeProductImageOutputSchema,
    OptimizeProductImageInput,
    OptimizeProductImageOutput
} from './types';

export async function optimizeProductImage(input: OptimizeProductImageInput): Promise<OptimizeProductImageOutput> {
    return optimizeProductImageFlow(input);
}


const optimizeProductImageFlow = ai.defineFlow(
  {
    name: 'optimizeProductImageFlow',
    inputSchema: OptimizeProductImageInputSchema,
    outputSchema: OptimizeProductImageOutputSchema,
    },
    async (input) => {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-image-preview',
            prompt: [
              { media: { url: input.imageUrl } },
              { text: "Toma el objeto principal de esta imagen, aísla perfectamente de su fondo original y colócalo sobre un fondo blanco puro (#FFFFFF). Genera una iluminación de estudio uniforme y añade una sutil sombra debajo del objeto para darle un aspecto realista y profesional." },
            ],
            config: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
        });

        if (!media?.url) {
            throw new Error('Image generation failed to return an image.');
        }
        
        return {
            optimizedImageUrl: media.url,
            originalSize: 0, // Placeholder - would need actual implementation
            optimizedSize: 0, // Placeholder - would need actual implementation
        };
    }
);
