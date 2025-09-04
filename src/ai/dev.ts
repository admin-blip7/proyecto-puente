import { config } from 'dotenv';
config();

import '@/ai/flows/generate-sales-summary.ts';
import '@/ai/flows/forecast-demand.ts';
import '@/ai/flows/analyze-product-quality.ts';
import '@/ai/flows/suggest-product-tags.ts';
import '@/ai/flows/optimize-product-image.ts';
import '@/ai/flows/parse-stock-entry-command.ts';
