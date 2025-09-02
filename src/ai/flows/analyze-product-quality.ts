'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing product quality based on sales and warranty data.
 *
 * - analyzeProductQuality - A function that identifies problematic products.
 * - ProductQualityInput - The input type for the function.
 * - ProductQualityOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SaleDataItemSchema = z.object({
    productId: z.string(),
    quantity: z.number(),
});

const WarrantyDataItemSchema = z.object({
    productId: z.string(),
    reason: z.string(),
});

export const ProductQualityInputSchema = z.object({
  productName: z.string(),
  totalSold: z.number(),
  totalWarranties: z.number(),
  warrantyRate: z.number().describe("The percentage of sales that resulted in a warranty claim."),
  commonReasons: z.array(z.string()).describe("A list of the most common reasons cited for warranty claims."),
});
export type ProductQualityInput = z.infer<typeof ProductQualityInputSchema>;

export const ProductQualityOutputSchema = z.object({
  analysis: z.string().describe("A brief, insightful text analysis of the product's quality based on the provided data."),
  recommendation: z.string().describe("A clear, actionable recommendation for the business owner regarding this product (e.g., contact supplier, monitor, remove from sale)."),
});
export type ProductQualityOutput = z.infer<typeof ProductQualityOutputSchema>;


export async function analyzeProductQuality(input: ProductQualityInput): Promise<ProductQualityOutput> {
  return analyzeProductQualityFlow(input);
}


const analyzeProductQualityPrompt = ai.definePrompt({
  name: 'analyzeProductQualityPrompt',
  input: { schema: ProductQualityInputSchema },
  output: { schema: ProductQualityOutputSchema },
  prompt: `You are an expert AI business consultant specializing in retail product quality and inventory management.
  Your task is to analyze the quality and performance of a product based on its sales and warranty claim data.

  Analyze the following data for the product: {{{productName}}}
  - Total Units Sold: {{{totalSold}}}
  - Total Warranty Claims: {{{totalWarranties}}}
  - Warranty Claim Rate: {{{warrantyRate}}}%
  - Most Common Warranty Reasons: {{#each commonReasons}}- {{{this}}}{{/each}}

  Based on your analysis, provide a concise but insightful "Analysis" of the situation.
  Then, provide a clear and actionable "Recommendation" for the business owner.

  Consider the warranty rate in your analysis. A rate below 2% is generally good. A rate between 2% and 5% is concerning and should be monitored. A rate above 5% is a significant problem.

  Example Analysis: "This product shows a high warranty rate of 15%, which is significantly above the acceptable threshold. The recurring issue seems to be related to the 'battery not charging', suggesting a potential manufacturing defect."
  Example Recommendation: "Immediately contact the supplier to report the high defect rate and inquire about a batch review or recall. Consider pausing sales of this product to prevent further customer dissatisfaction and potential financial loss."
  `,
});

const analyzeProductQualityFlow = ai.defineFlow(
  {
    name: 'analyzeProductQualityFlow',
    inputSchema: ProductQualityInputSchema,
    outputSchema: ProductQualityOutputSchema,
  },
  async (input) => {
    const { output } = await analyzeProductQualityPrompt(input);
    return output!;
  }
);
