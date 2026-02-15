import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aaftjwktzpnyjwklroww.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZnRqd2t0enBueWp3a2xyb3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4MjE1NCwiZXhwIjoyMDc1NTU4MTU0fQ.cmciC1BWaWavlcLQpZ1mkKiaLLSXC1FD3JogmBCo3HU'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function setupCategories() {
  // Get all existing
  const { data: existing } = await supabase.from('product_categories').select('id')
  console.log('Existing categories:', existing?.length)
  
  // Delete each
  for (const item of (existing || [])) {
    await supabase.from('product_categories').delete().eq('id', item.id)
    console.log('Deleted:', item.id)
  }
  
  // Define the category structure
  const categories = [
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'celulares', label: 'Celulares' },
    { value: 'audio', label: 'Audio' },
    { value: 'electrodomesticos', label: 'Electrodomésticos' },
  ]
  
  console.log('\nInserting main categories...')
  for (const cat of categories) {
    const { error } = await supabase.from('product_categories').insert(cat)
    if (error) console.log('Error:', cat.value, error.message)
    else console.log('Inserted:', cat.label)
  }
  
  console.log('\nInserting subcategories...')
  const subcategories = [
    { value: 'audifonos', label: 'Audífonos', parent: 'accesorios' },
    { value: 'cargadores', label: 'Cargadores', parent: 'accesorios' },
    { value: 'cables', label: 'Cables', parent: 'accesorios' },
    { value: 'memorias', label: 'Memorias', parent: 'accesorios' },
    { value: 'mica', label: 'Mica Protectora', parent: 'accesorios' },
    { value: 'celulares-nuevos', label: 'Celulares Nuevos', parent: 'celulares' },
    { value: 'celular-seminuevo', label: 'Celular Seminuevo', parent: 'celulares' },
    { value: 'equipos-de-sonido', label: 'Equipos de Sonido', parent: 'audio' },
  ]
  
  for (const cat of subcategories) {
    const { error } = await supabase.from('product_categories').insert(cat)
    if (error) console.log('Error:', cat.value, error.message)
    else console.log('Inserted:', cat.label)
  }
  
  // Verify
  const { data: remaining } = await supabase
    .from('product_categories')
    .select('*')
    .order('label')
  
  console.log('\n=== FINAL CATEGORIES ===')
  console.log('Count:', remaining?.length)
  remaining?.forEach(c => console.log(`  - ${c.label}`))
}

setupCategories()
