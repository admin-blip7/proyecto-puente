'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating a sales summary.
 *
 * - generateSalesSummary - A function that generates a sales summary.
 * - GenerateSalesSummaryInput - The input type for the generateSalesSummary function.
 * - GenerateSalesSummaryOutput - The return type for the generateSalesSummary function.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateSalesSummaryInputSchema,
    GenerateSalesSummaryOutputSchema,
    GenerateSalesSummaryInput,
    GenerateSalesSummaryOutput
} from './types';

export async function generateSalesSummary(input: GenerateSalesSummaryInput): Promise<GenerateSalesSummaryOutput> {
  return generateSalesSummaryFlow(input);
}

const generateSalesSummaryPrompt = ai.definePrompt({
  name: 'generateSalesSummaryPrompt',
  input: {schema: GenerateSalesSummaryInputSchema},
  output: {schema: GenerateSalesSummaryOutputSchema},
  prompt: `You are an AI assistant designed to generate sales summaries for a point of sale system.

  Generate a concise and printable summary of the sale, including:
  - A list of the items purchased with their names, quantities, and prices.
  - The total amount of the sale.
  - Information about applicable sales tax, based on the current jurisdiction's tax laws. If sales tax should be applied, make sure to list the applicable sales tax rate and the total amount of sales tax that was added to the sale.
  - Payment method
  - Customer information if provided.

  Make sure to follow all applicable tax laws in the jurisdiction where the sale occurred.

  Sale Details:
  Items: {{#each items}}{{{name}}} (Quantity: {{{quantity}}}, Price: {{{priceAtSale}}}) {{/each}}
  Total Amount: {{{totalAmount}}}
  Payment Method: {{{paymentMethod}}}
  Cashier ID: {{{cashierId}}}
  {{#if customerName}}Customer Name: {{{customerName}}}{{/if}}
  {{#if customerPhone}}Customer Phone: {{{customerPhone}}}{{/if}}
  `,
});

const generateSalesSummaryFlow = ai.defineFlow(
  {
    name: 'generateSalesSummaryFlow',
    inputSchema: GenerateSalesSummaryInputSchema,
    outputSchema: GenerateSalesSummaryOutputSchema,
  },
  async input => {
    const {output} = await generateSalesSummaryPrompt(input);
    return output!;
  }
);
