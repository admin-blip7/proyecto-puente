import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aaftjwktzpnyjwklroww.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZnRqd2t0enBueWp3a2xyb3d3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTk4MjE1NCwiZXhwIjoyMDc1NTU4MTU0fQ.cmciC1BWaWavlcLQpZ1mkKiaLLSXC1FD3JogmBCo3HU'

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

async function updateCategories() {
  console.log('Checking current categories...')
  
  // First, get current data
  const { data: currentData } = await supabase.from('product_categories').select('*')
  console.log('Current categories:', currentData?.length || 0)
  currentData?.forEach(c => console.log(`  - ${c.value}: ${c.label}`))
  
  console.log('\nDeleting old categories...')
  // Delete all existing
  for (const cat of (currentData || [])) {
    await supabase.from('product_categories').delete().eq('id', cat.id)
  }
  
  console.log('Inserting new categories...')
  
  const categories = [
    { value: 'accesorios', label: 'Accesorios' },
    { value: 'celulares', label: 'Celulares' },
    { value: 'audio', label: 'Audio' },
    { value: 'wearables', label: 'Wearables' },
    { value: 'camaras', label: 'Cámaras' },
    { value: 'audifonos', label: 'Audífonos' },
    { value: 'cargadores', label: 'Cargadores' },
    { value: 'cables', label: 'Cables' },
    { value: 'fundas', label: 'Fundas' },
    { value: 'telefonos-fijos', label: 'Teléfonos Fijos' },
    { value: 'celulares-nuevos', label: 'Celulares Nuevos' },
    { value: 'celulares-seminuevos', label: 'Celulares Seminuevos' },
    { value: 'audifonos-bluetooth', label: 'Audífonos Bluetooth' },
    { value: 'bocinas', label: 'Bocinas' },
    { value: 'smartwatch', label: 'Smartwatch' },
    { value: 'smartband', label: 'Smartband' },
    { value: 'camaras-digitales', label: 'Cámaras Digitales' },
    { value: 'camaras-accion', label: 'Cámaras de Acción' },
  ]

  // Insert one by one
  for (const cat of categories) {
    const { error } = await supabase.from('product_categories').insert(cat)
    if (error) {
      console.log(`  Error inserting ${cat.value}: ${error.message}`)
    } else {
      console.log(`  Inserted: ${cat.label}`)
    }
  }

  // Verify
  console.log('\nVerifying...')
  const { data } = await supabase.from('product_categories').select('*')
  console.log('Total categories:', data?.length)
  data?.forEach(c => console.log(`  - ${c.label}`))
  
  console.log('\nDone!')
}

updateCategories()
