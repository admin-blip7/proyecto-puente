'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting product compatibility tags using AI.
 *
 * - suggestProductTags - A function that suggests tags based on product details and existing tags.
 * - SuggestTagsInput - The input type for the function.
 * - SuggestTagsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import {
    SuggestTagsInputSchema,
    SuggestTagsOutputSchema,
    SuggestTagsInput,
    SuggestTagsOutput
} from './types';


export async function suggestProductTags(input: SuggestTagsInput): Promise<SuggestTagsOutput> {
  return suggestTagsFlow(input);
}


const suggestTagsPrompt = ai.definePrompt({
  name: 'suggestTagsPrompt',
  input: { schema: SuggestTagsInputSchema },
  output: { schema: SuggestTagsOutputSchema },
  prompt: `You are an expert product catalog manager. Your task is to suggest relevant compatibility tags for a new product based on its name, description, and the tags of existing products in the store.

The tags should be short, in lowercase, and use hyphens instead of spaces (e.g., 'iphone-15-pro', 'carga-rapida', 'accesorios-samsung').

Analyze the following new product:
- Name: {{{productName}}}
- Description: {{{productDescription}}}

Here is a list of existing products and their tags for context and consistency. Find similar products and learn from their tags to suggest relevant ones for the new product.

Existing Products:
{{#each existingProducts}}
- {{name}}: [{{#each tags}}'{{this}}'{{#unless @last}}, {{/unless}}{{/each}}]
{{/each}}

Based on this analysis, provide a list of suggested tags for the new product. Do not suggest more than 5 tags.
  `,
});

const suggestTagsFlow = ai.defineFlow(
  {
    name: 'suggestTagsFlow',
    inputSchema: SuggestTagsInputSchema,
    outputSchema: SuggestTagsOutputSchema,
  },
  async (input) => {
    const { output } = await suggestTagsPrompt(input);
    return output!;
  }
);
