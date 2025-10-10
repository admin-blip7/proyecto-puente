/**
 * @fileOverview This file defines a Genkit flow for parsing a voice command for stock entry.
 *
 * - parseStockEntryCommand - A function that parses a voice command to extract product quantity and name.
 * - StockEntryCommandInput - The input type for the function.
 * - StockEntryCommandOutput - The return type for the function.
 */

'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  StockEntryCommandInputSchema,
  StockEntryCommandOutputSchema,
  StockEntryCommandInput,
  StockEntryCommandOutput,
} from './types';


export async function parseStockEntryCommand(
  input: StockEntryCommandInput
): Promise<StockEntryCommandOutput> {
  return parseStockEntryCommandFlow(input);
}


const prompt = ai.definePrompt({
  name: 'parseStockEntryCommandPrompt',
  input: { schema: StockEntryCommandInputSchema },
  output: { schema: StockEntryCommandOutputSchema },
  prompt: `You are an expert at parsing voice commands for a point of sale inventory management system.
Your task is to extract the quantity and product name from a transcribed voice command.
The command structure is typically "[Action] [Quantity] [Product Name]".
The action can be words like "Agregar", "Añade", "Pon", "Inserta", etc. You should ignore the action word.
Extract the number for the quantity and the rest of the text as the product name.

For example, if the user says "Agregar 5 micas de hidrogel para iPhone 15", you should extract:
- quantity: 5
- productName: "micas de hidrogel para iPhone 15"

If the user says "Añade 12 protectores para Moto G22", you should extract:
- quantity: 12
- productName: "protectores para Moto G22"

Here is the user's transcribed command: "{{{command}}}"

Extract the quantity and the product name.`,
});

const parseStockEntryCommandFlow = ai.defineFlow(
  {
    name: 'parseStockEntryCommandFlow',
    inputSchema: StockEntryCommandInputSchema,
    outputSchema: StockEntryCommandOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
