import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/services/productService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const altoCm = parseFloat(searchParams.get('alto') || '0');
    const anchoCm = parseFloat(searchParams.get('ancho') || '0');

    if (!altoCm || !anchoCm) {
      return NextResponse.json(
        { error: 'Se requieren alto y ancho en centímetros' },
        { status: 400 }
      );
    }

    // Obtener todos los productos
    const products = await getProducts();

    // Filtrar productos que sean micas (categoría "Mica" o que tenga atributos de medidas)
    const micas = products.filter(
      (p) =>
        p.category === 'Mica' ||
        (p.attributes?.alto && p.attributes?.ancho)
    );

    // Función para determinar el nivel de compatibilidad
    const getCompatibilityLevel = (micaAltoCm: number, micaAnchoCm: number) => {
      const tolerancia = 0.2; // 2mm en centímetros
      
      // Compatible: dentro del rango de tolerancia (0 a -2mm)
      const altoCompatible = micaAltoCm >= (altoCm - tolerancia) && micaAltoCm <= altoCm;
      const anchoCompatible = micaAnchoCm >= (anchoCm - tolerancia) && micaAnchoCm <= anchoCm;
      
      if (altoCompatible && anchoCompatible) {
        return 'Compatible';
      }
      
      // Posiblemente compatible: hasta 0.5cm de diferencia (5mm)
      const toleranciaPosible = 0.5;
      const altoPosible = Math.abs(micaAltoCm - altoCm) <= toleranciaPosible;
      const anchoPosible = Math.abs(micaAnchoCm - anchoCm) <= toleranciaPosible;
      
      if (altoPosible && anchoPosible) {
        return 'Posiblemente compatible';
      }
      
      return 'No compatible';
    };

    // Agregar información de compatibilidad a todas las micas
    const micasConCompatibilidad = micas.map((mica) => {
      // Convertir medidas de la mica de mm a cm si están en mm
      let micaAltoCm = parseFloat(mica.attributes?.alto || '0');
      let micaAnchoCm = parseFloat(mica.attributes?.ancho || '0');
      
      // Si las medidas son muy grandes, probablemente están en mm, convertir a cm
      if (micaAltoCm > 50 || micaAnchoCm > 50) {
        micaAltoCm = micaAltoCm / 10;
        micaAnchoCm = micaAnchoCm / 10;
      }

      const compatibilityLevel = getCompatibilityLevel(micaAltoCm, micaAnchoCm);
      
      return {
        ...mica,
        compatibility: {
          level: compatibilityLevel,
          micaAltoCm,
          micaAnchoCm,
          requestedAltoCm: altoCm,
          requestedAnchoCm: anchoCm
        }
      };
    });

    // Ordenar por nivel de compatibilidad y luego por exactitud
    micasConCompatibilidad.sort((a, b) => {
      // Orden de prioridad: Compatible > Posiblemente compatible > No compatible
      const priorityOrder = {
        'Compatible': 1,
        'Posiblemente compatible': 2,
        'No compatible': 3
      };
      
      const priorityA = priorityOrder[a.compatibility.level as keyof typeof priorityOrder];
      const priorityB = priorityOrder[b.compatibility.level as keyof typeof priorityOrder];
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Si tienen el mismo nivel de compatibilidad, ordenar por exactitud
      const diffA = Math.abs(a.compatibility.micaAltoCm - altoCm) + Math.abs(a.compatibility.micaAnchoCm - anchoCm);
      const diffB = Math.abs(b.compatibility.micaAltoCm - altoCm) + Math.abs(b.compatibility.micaAnchoCm - anchoCm);
      
      return diffA - diffB;
    });

    return NextResponse.json(micasConCompatibilidad);
  } catch (error) {
    console.error('Error buscando micas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}