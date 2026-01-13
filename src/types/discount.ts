import { z } from "zod";

// Schema for a single discount configuration
export const DiscountSettingSchema = z.object({
    id: z.string(),
    discountCode: z.string().min(1, "El código es requerido"),
    discountPercentage: z.number().min(0.01, "El porcentaje debe ser mayor a 0").max(100, "El porcentaje no puede ser mayor a 100"),
    isActive: z.boolean().default(true),
    validFrom: z.string(), // ISO date string
    validTo: z.string(),   // ISO date string
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});

export type DiscountSetting = z.infer<typeof DiscountSettingSchema>;

// Schema for the entire discount settings configuration (array of discounts)
export const DiscountSettingsSchema = z.object({
    discounts: z.array(DiscountSettingSchema).default([]),
});

export type DiscountSettings = z.infer<typeof DiscountSettingsSchema>;

// Helper function to validate if a discount code is valid for use
export function isDiscountValid(discount: DiscountSetting): boolean {
    if (!discount.isActive) return false;

    const now = new Date();
    const validFrom = new Date(discount.validFrom);
    const validTo = new Date(discount.validTo);

    // Set validTo to end of day for inclusive comparison
    validTo.setHours(23, 59, 59, 999);

    return now >= validFrom && now <= validTo;
}

// Result of discount code validation
export interface DiscountValidationResult {
    valid: boolean;
    discount?: DiscountSetting;
    error?: string;
}
