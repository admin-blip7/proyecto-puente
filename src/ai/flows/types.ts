import { z } from 'zod';

// Types for: analyze-product-quality
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


// Types for: forecast-demand
const SalesDataItemSchema = z.object({
    date: z.string().describe("The date of the sales data point (YYYY-MM-DD)."),
    quantitySold: z.number().describe("The total quantity sold on that date."),
});

export const ForecastDemandInputSchema = z.object({
  productName: z.string().describe("The name of the product being analyzed."),
  historicalSales: z.array(SalesDataItemSchema).describe("An array of historical sales data for the product."),
});
export type ForecastDemandInput = z.infer<typeof ForecastDemandInputSchema>;

const ForecastedPointSchema = z.object({
    date: z.string().describe("The future date for the forecast (YYYY-MM-DD)."),
    predictedQuantity: z.number().describe("The predicted sales quantity for that date."),
});

export const ForecastDemandOutputSchema = z.object({
  analysisSummary: z.string().describe("A brief, insightful text summary of the sales trend analysis and the forecast outlook."),
  forecast: z.array(ForecastedPointSchema).describe("An array of forecasted sales data points for the next 30 days."),
});
export type ForecastDemandOutput = z.infer<typeof ForecastDemandOutputSchema>;

// Types for: generate-sales-summary
export const GenerateSalesSummaryInputSchema = z.object({
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

export const GenerateSalesSummaryOutputSchema = z.object({
  summary: z.string().describe('A printable summary of the sale including items purchased, total amount, and applicable sales tax information, based on the current jurisdiction\'s tax laws.'),
});
export type GenerateSalesSummaryOutput = z.infer<typeof GenerateSalesSummaryOutputSchema>;

// Types for: optimize-product-image
export const OptimizeImageInputSchema = z.object({
    photoDataUri: z
      .string()
      .describe(
        "A photo of a product, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
      ),
});
export type OptimizeImageInput = z.infer<typeof OptimizeImageInputSchema>;

export const OptimizeImageOutputSchema = z.object({
    optimizedImageUri: z.string().describe("The generated e-commerce-ready image of the product as a data URI."),
});
export type OptimizeImageOutput = z.infer<typeof OptimizeImageOutputSchema>;

// Types for: suggest-product-tags
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

// Types for: parse-stock-entry-command
export const StockEntryCommandInputSchema = z.object({
  command: z.string().describe('The transcribed voice command from the user.'),
});
export type StockEntryCommandInput = z.infer<typeof StockEntryCommandInputSchema>;

export const StockEntryCommandOutputSchema = z.object({
  quantity: z.number().describe('The extracted quantity of the product.'),
  productName: z.string().describe('The extracted name of the product.'),
});
export type StockEntryCommandOutput = z.infer<typeof StockEntryCommandOutputSchema>;

// Types for: generate-debt-strategy
const DebtSchema = z.object({
  id: z.string(),
  creditorName: z.string().describe("Name of the creditor, e.g., the bank or card issuer."),
  currentBalance: z.number().describe("The current outstanding balance on the card."),
  interestRate: z.number().optional().describe("The annual interest rate (APR) of the card as a percentage."),
});

export const GenerateDebtStrategyInputSchema = z.object({
  creditCardDebts: z.array(DebtSchema).describe("An array of credit card debt objects to analyze."),
});
export type GenerateDebtStrategyInput = z.infer<typeof GenerateDebtStrategyInputSchema>;

const StrategyActionSchema = z.object({
  debtId: z.string().describe("The ID of the debt to prioritize."),
  creditorName: z.string().describe("The name of the creditor for this debt."),
  reason: z.string().describe("A brief explanation of why this debt is prioritized in this step."),
});

const StrategySchema = z.object({
  name: z.string().describe("The name of the strategy (e.g., 'Método Bola de Nieve')."),
  description: z.string().describe("A detailed explanation of the strategy, its pros, and cons."),
  plan: z.array(StrategyActionSchema).describe("An ordered list of actions to take for this strategy."),
});

export const GenerateDebtStrategyOutputSchema = z.object({
  snowball: StrategySchema.describe("The Snowball Method strategy, focusing on paying off the smallest debts first for psychological wins."),
  avalanche: StrategySchema.describe("The Avalanche Method strategy, focusing on paying off the highest-interest debts first to save money."),
});
export type GenerateDebtStrategyOutput = z.infer<typeof GenerateDebtStrategyOutputSchema>;

// Types for: generate-product-image
export const GenerateProductImageInputSchema = z.object({
    productName: z.string().describe("The name of the product to generate an image for."),
});
export type GenerateProductImageInput = z.infer<typeof GenerateProductImageInputSchema>;

export const GenerateProductImageOutputSchema = z.object({
    imageUrl: z.string().describe("The generated e-commerce-ready image of the product as a data URI."),
});
export type GenerateProductImageOutput = z.infer<typeof GenerateProductImageOutputSchema>;
