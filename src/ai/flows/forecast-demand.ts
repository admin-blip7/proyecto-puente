'use server';

/**
 * @fileOverview This file defines a Genkit flow for forecasting product demand.
 *
 * - forecastDemand - A function that predicts future sales for a product.
 * - ForecastDemandInput - The input type for the forecastDemand function.
 * - ForecastDemandOutput - The return type for the forecastDemand function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SalesDataItemSchema = z.object({
    date: z.string().describe("The date of the sales data point (YYYY-MM-DD)."),
    quantitySold: z.number().describe("The total quantity sold on that date."),
});

const ForecastDemandInputSchema = z.object({
  productName: z.string().describe("The name of the product being analyzed."),
  historicalSales: z.array(SalesDataItemSchema).describe("An array of historical sales data for the product."),
});
export type ForecastDemandInput = z.infer<typeof ForecastDemandInputSchema>;


const ForecastedPointSchema = z.object({
    date: z.string().describe("The future date for the forecast (YYYY-MM-DD)."),
    predictedQuantity: z.number().describe("The predicted sales quantity for that date."),
});

const ForecastDemandOutputSchema = z.object({
  analysisSummary: z.string().describe("A brief, insightful text summary of the sales trend analysis and the forecast outlook."),
  forecast: z.array(ForecastedPointSchema).describe("An array of forecasted sales data points for the next 30 days."),
});
export type ForecastDemandOutput = z.infer<typeof ForecastDemandOutputSchema>;

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
