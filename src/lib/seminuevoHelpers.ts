import type { ConditionGrade } from '@/types';

export function suggestConditionGrade(batteryHealth: number | null): ConditionGrade {
    if (!batteryHealth) return 'B';
    if (batteryHealth >= 85) return 'A';
    if (batteryHealth >= 70) return 'B';
    return 'C';
}

export function buildUnitName(model: string, storageGb: number | null, color: string | null): string {
    const parts = [model];
    if (storageGb) parts.push(`${storageGb}GB`);
    if (color) parts.push(color);
    return parts.join(' ');
}

/** Extrae "iPhone 14 Pro" de "iPhone 14 Pro 256GB Negro" */
export function extractModelLine(modelName: string): string {
    // Remueve storage y color dejando solo el modelo base
    return modelName.replace(/\s+\d+GB.*$/, '').trim();
}
