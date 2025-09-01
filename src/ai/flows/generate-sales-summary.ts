'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating a sales summary.
 *
 * - generateSalesSummary - A function that generates a sales summary.
 * - GenerateSalesSummaryInput - The input type for the generateSalesSummary function.
 * - GenerateSalesSummaryOutput - The return type for the generateSalesSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateSalesSummaryInputSchema = z.object({
  items: z.array(
    z.object({
      productId: z.string(),
      name: z.string(),
      quantity: z.number(),
      priceAtSale: z.number(),
    })
  ).describe('A list of the products sold, including productId, name, quantity and priceAtSale.'),
  totalAmount: z.number().describe('The total amount of the sale.'),
  paymentMethod: z.string().describe('The payment method used for the sale (e.g., "Cash", "Credit Card").'),
  cashierId: z.string().describe('The UID of the user who processed the sale.'),
  customerName: z.string().optional().describe('The name of the customer.'),
  customerPhone: z.string().optional().describe('The phone number of the customer.'),
});
export type GenerateSalesSummaryInput = z.infer<typeof GenerateSalesSummaryInputSchema>;

const GenerateSalesSummaryOutputSchema = z.object({
  summary: z.string().describe('A printable summary of the sale including items purchased, total amount, and applicable sales tax information, based on the current jurisdiction\'s tax laws.'),
});
export type GenerateSalesSummaryOutput = z.infer<typeof GenerateSalesSummaryOutputSchema>;

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
