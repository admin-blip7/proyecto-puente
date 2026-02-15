"use server";

import { z } from "zod";
import { addRepairOrder } from "@/lib/services/repairService";
import { redirect } from "next/navigation";

const formSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido."),
  customerPhone: z.string().min(1, "El teléfono es requerido."),
  deviceBrand: z.string().min(1, "La marca es requerida."),
  deviceModel: z.string().min(1, "El modelo es requerido."),
  deviceSerialIMEI: z.string().optional().or(z.literal('')),
  reportedIssue: z.string().min(1, "La descripción del problema es requerida."),
  technicianNotes: z.string().optional(),
  partsUsed: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number(),
    cost: z.number(),
    quantity: z.number(),
  })).optional(),
  totalPrice: z.number(),
  laborCost: z.number(),
  totalCost: z.number(),
  profit: z.number(),
  deposit: z.number().optional(),
  devicePassword: z.string().optional(),
});

export async function createRepairOrder(formData: FormData) {
  try {
    // Extract form data
    const rawData = {
      customerName: formData.get('customerName'),
      customerPhone: formData.get('customerPhone'),
      deviceBrand: formData.get('deviceBrand'),
      deviceModel: formData.get('deviceModel'),
      deviceSerialIMEI: formData.get('deviceSerialIMEI') || '',
      reportedIssue: formData.get('reportedIssue') || '',
      technicianNotes: formData.get('technicianNotes') || '',
      partsUsed: JSON.parse(formData.get('partsUsed') as string || '[]'),
      totalPrice: parseFloat(formData.get('totalPrice') as string || '0'),
      laborCost: parseFloat(formData.get('laborCost') as string || '0'),
      totalCost: parseFloat(formData.get('totalCost') as string || '0'),
      profit: parseFloat(formData.get('profit') as string || '0'),
      deposit: parseFloat(formData.get('deposit') as string || '0'),
      devicePassword: formData.get('devicePassword') as string || '',
    };

    console.log('Raw form data:', rawData);

    // Validate form data
    const validatedData = formSchema.parse(rawData);

    // Create the repair order
    // Create the repair order
    const newOrder = await addRepairOrder({
      ...validatedData,
      deviceSerialIMEI: validatedData.deviceSerialIMEI || '',
      partsUsed: validatedData.partsUsed || [],
      deposit: validatedData.deposit || 0,
      devicePassword: validatedData.devicePassword || ''
    });

    // Return success response with order data
    return {
      success: true,
      order: newOrder,
      message: `Orden #${newOrder.orderId} creada exitosamente`
    };

  } catch (error) {
    console.error('Error creating repair order:', error);

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation error',
        details: error.errors
      };
    }

    return {
      success: false,
      error: 'Failed to create repair order',
      message: 'No se pudo crear la orden de reparación.'
    };
  }
}