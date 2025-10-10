'use server';
/**
 * @fileOverview This file defines a Genkit flow for forecasting product demand.
 *
 * - forecastDemand - A function that predicts future sales for a product.
 * - ForecastDemandInput - The input type for the forecastDemand function.
 * - ForecastDemandOutput - The return type for the forecastDemand function.
 */

import { ai } from '@/ai/genkit';
import {
    ForecastDemandInputSchema,
    ForecastDemandOutputSchema,
    ForecastDemandInput,
    ForecastDemandOutput
} from './types';


export async function forecastDemand(input: ForecastDemandInput): Promise<ForecastDemandOutput> {
  return forecastDemandFlow(input);
}

const forecastDemandPrompt = ai.definePrompt({
  name: 'forecastDemandPrompt',
  input: { schema: ForecastDemandInputSchema },
  output: { schema: ForecastDemandOutputSchema },
  prompt: `You are a world-class supply chain analyst AI, specializing in demand forecasting for retail products.
  Your task is to analyze the provided historical sales data for a product and generate a 30-day sales forecast.

  Analyze the following data for the product: {{{productName}}}
  Historical Sales:
  {{#each historicalSales}}
  - Date: {{{date}}}, Quantity Sold: {{{quantitySold}}}
  {{/each}}

  Based on your analysis of the data, identify any trends, seasonality, or patterns. Then, generate a day-by-day sales forecast for the next 30 days.

  Finally, provide a concise, insightful summary of your analysis. Explain the key patterns you found (e.g., "Sales peak on weekends," "There is a slight upward trend," "Sales are sporadic") and state your forecast outlook. The summary should be easy for a business owner to understand.
  `,
});

const forecastDemandFlow = ai.defineFlow(
  {
    name: 'forecastDemandFlow',
    inputSchema: ForecastDemandInputSchema,
    outputSchema: ForecastDemandOutputSchema,
  },
  async (input) => {
    // If there's no sales data, return a default empty forecast
    if (input.historicalSales.length === 0) {
        return {
            analysisSummary: `No hay datos históricos de ventas para "${input.productName}". No se puede generar un pronóstico.`,
            forecast: [],
        };
    }

    const { output } = await forecastDemandPrompt(input);
    return output!;
  }
);
