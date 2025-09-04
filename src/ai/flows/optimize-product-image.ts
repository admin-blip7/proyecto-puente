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
    OptimizeImageInputSchema,
    OptimizeImageOutputSchema,
    OptimizeImageInput,
    OptimizeImageOutput
} from './types';

export async function optimizeProductImage(input: OptimizeImageInput): Promise<OptimizeImageOutput> {
    return optimizeProductImageFlow(input);
}


const optimizeProductImageFlow = ai.defineFlow(
    {
      name: 'optimizeProductImageFlow',
      inputSchema: OptimizeImageInputSchema,
      outputSchema: OptimizeImageOutputSchema,
    },
    async (input) => {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-image-preview',
            prompt: [
              { media: { url: input.photoDataUri } },
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
            optimizedImageUri: media.url,
        };
    }
);
