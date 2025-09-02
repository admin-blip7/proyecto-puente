'use server';

/**
 * @fileOverview This file defines a Genkit flow for suggesting product compatibility tags using AI.
 *
 * - suggestProductTags - A function that suggests tags based on product details and existing tags.
 * - SuggestTagsInput - The input type for the function.
 * - SuggestTagsOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ExistingProductSchema = z.object({
  name: z.string(),
  tags: z.array(z.string()),
});

export const SuggestTagsInputSchema = z.object({
  productName: z.string().describe("The name of the product for which to suggest tags."),
  productDescription: z.string().optional().describe("The description of the product."),
  existingProducts: z.array(ExistingProductSchema).describe("A list of existing products with their current tags to provide context."),
});
export type SuggestTagsInput = z.infer<typeof SuggestTagsInputSchema>;

export const SuggestTagsOutputSchema = z.object({
  suggestedTags: z.array(z.string()).describe("An array of suggested compatibility tags. The tags should be short, in lowercase, and use hyphens instead of spaces (e.g., 'iphone-15-pro', 'carga-rapida', 'accesorios-samsung')."),
});
export type SuggestTagsOutput = z.infer<typeof SuggestTagsOutputSchema>;


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
