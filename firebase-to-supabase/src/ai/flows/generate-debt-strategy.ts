'use server';
/**
 * @fileOverview An AI flow that analyzes a user's debts and generates payment strategies.
 * 
 * - generateDebtStrategy - Analyzes credit card debts and returns Snowball and Avalanche payment strategies.
 * - GenerateDebtStrategyInput - The input type for the flow.
 * - GenerateDebtStrategyOutput - The return type for the flow.
 */

import { ai } from '@/ai/genkit';
import {
    GenerateDebtStrategyInputSchema,
    GenerateDebtStrategyOutputSchema,
    GenerateDebtStrategyInput,
    GenerateDebtStrategyOutput
} from './types';

export async function generateDebtStrategy(input: GenerateDebtStrategyInput): Promise<GenerateDebtStrategyOutput> {
  return generateDebtStrategyFlow(input);
}

const prompt = ai.definePrompt({
    name: 'generateDebtStrategyPrompt',
    input: { schema: GenerateDebtStrategyInputSchema },
    output: { schema: GenerateDebtStrategyOutputSchema },
    prompt: `You are an expert financial advisor. Your task is to analyze a list of credit card debts and generate two popular payment strategies: the Snowball Method and the Avalanche Method.

    For each strategy, you must provide a clear name, a detailed description explaining how it works and its pros and cons, and a step-by-step action plan.
    
    Here is the list of credit card debts:
    {{#each creditCardDebts}}
    - Card: {{{creditorName}}}, Balance: {{{currentBalance}}}, Interest Rate: {{#if interestRate}}{{{interestRate}}}%{{else}}N/A{{/if}} (ID: {{{id}}})
    {{/each}}
    
    **Strategy 1: Snowball Method (Bola de Nieve)**
    - **Description:** Explain that this method focuses on paying off the smallest balances first to build momentum and motivation. It's great for quick wins. Mention that it might cost more in interest over time compared to the Avalanche method.
    - **Plan:** Create an ordered list of which card to pay off first, based on the lowest 'currentBalance'. For each step, explain the reason (e.g., "Pay off [Card Name] first because it has the smallest balance.").
    
    **Strategy 2: Avalanche Method (Avalancha)**
    - **Description:** Explain that this method focuses on paying off the debts with the highest interest rates first. Mention that this is the most cost-effective strategy, saving the most money on interest in the long run, but it might feel slower at the beginning.
    - **Plan:** Create an ordered list of which card to pay off first, based on the highest 'interestRate'. If some cards don't have an interest rate, they should be placed at the end of the list. For each step, explain the reason (e.g., "Pay off [Card Name] first because it has the highest interest rate, saving you money.").
    
    Generate the full response in the required JSON format.
    `,
});


const generateDebtStrategyFlow = ai.defineFlow(
    {
      name: 'generateDebtStrategyFlow',
      inputSchema: GenerateDebtStrategyInputSchema,
      outputSchema: GenerateDebtStrategyOutputSchema,
    },
    async (input) => {
      if (!input.creditCardDebts || input.creditCardDebts.length === 0) {
        throw new Error("No credit card debts provided to analyze.");
      }
      const { output } = await prompt(input);
      return output!;
    }
);
