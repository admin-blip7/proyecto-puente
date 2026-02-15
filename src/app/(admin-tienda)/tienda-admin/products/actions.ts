'use server'

import { supabase } from '@/lib/supabaseClient'
import { revalidatePath } from 'next/cache'

interface ProductAttribute {
    color?: string
    capacity?: string
    grade?: string
    battery_health?: string
}

interface GroupProductsParams {
    name: string
    description?: string
    price: number
    category?: string
    imageUrl?: string
    childIds: string[]
    attributesMap: Record<string, ProductAttribute>
}

export async function groupProducts(params: GroupProductsParams) {
    if (!supabase) {
        return { success: false, message: 'Supabase client not initialized' }
    }

    const { name, description, price, category, imageUrl, childIds, attributesMap } = params

    try {
        // 1. Create Parent Product
        const { data: parentProduct, error: createError } = await supabase
            .from('products')
            .insert({
                name,
                description,
                price, // Display price (from, or lowest)
                cost: 0, // Parent doesn't have cost, children do
                stock: 0, // Parent doesn't have stock, children do
                type: 'Venta',
                category, // Same category as children
                sku: `GRP-${Date.now()}`, // Auto-generated SKU for grouper
                image_urls: imageUrl ? [imageUrl] : [],
                parent_id: null // Ensure it's a root
            })
            .select()
            .single()

        if (createError) {
            console.error('Error creating parent product:', createError)
            return { success: false, message: 'Failed to create parent product' }
        }

        if (!parentProduct) {
            return { success: false, message: 'Parent product created but not returned' }
        }

        const parentId = parentProduct.id

        // 2. Update Children
        // We do this in a loop or parallel promises because each child has different attributes to update
        const updatePromises = childIds.map(async (childId) => {
            const attrs = attributesMap[childId] || {}

            // Update child with parent_id AND new attributes
            // Note: We merge new attributes with existing ones or overwrite? Overwrite is safer for consistency.
            if (!supabase) throw new Error('Supabase client lost')

            const { error: updateError } = await supabase
                .from('products')
                .update({
                    parent_id: parentId,
                    attributes: attrs // Save the structured attributes (Color, Capacity, Battery, etc)
                })
                .eq('id', childId)

            if (updateError) {
                console.error(`Error updating child ${childId}:`, updateError)
                throw new Error(`Failed to update child ${childId}`)
            }
        })

        await Promise.all(updatePromises)

        revalidatePath('/(admin-tienda)/tienda-admin/products')
        revalidatePath('/(tienda)/producto/[id]', 'page')

        return { success: true, message: 'Products grouped successfully', parentId }

    } catch (error) {
        console.error('Error in groupProducts:', error)
        return { success: false, message: 'Internal server error during grouping' }
    }
}

export async function searchProductsForGrouping(query: string) {
    if (!supabase) return []

    // Create a base query
    let dbQuery = supabase
        .from('products')
        .select('id, name, sku, price, stock, category, image_urls')
        .is('parent_id', null) // Only show standalone products or existing parents
        .limit(20)

    if (query) {
        dbQuery = dbQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%`)
    } else {
        dbQuery = dbQuery.order('created_at', { ascending: false }) // Default to recent
    }

    const { data, error } = await dbQuery

    if (error) {
        console.error('Error searching products:', error)
        return []
    }

    return data || []
}
