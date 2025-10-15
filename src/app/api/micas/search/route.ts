import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/services/productService';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alto = parseFloat(searchParams.get('alto') || '0');
    const ancho = parseFloat(searchParams.get('ancho') || '0');

    if (!alto || !ancho) {
      return NextResponse.json(
        { error: 'Se requieren alto y ancho' },
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

    // Filtrar por compatibilidad
    const compatibles = micas.filter((mica) => {
      const micaAlto = parseFloat(mica.attributes?.alto || '0');
      const micaAncho = parseFloat(mica.attributes?.ancho || '0');

      // La mica debe ser exacta o más pequeña, nunca más grande
      // Siendo más pequeña, cubre perfectamente la pantalla
      return (
        micaAlto <= alto &&
        micaAncho <= ancho
      );
    });

    // Ordenar por cercanía a las medidas buscadas
    compatibles.sort((a, b) => {
      const diffA =
        Math.abs(parseFloat(a.attributes?.alto || '0') - alto) +
        Math.abs(parseFloat(a.attributes?.ancho || '0') - ancho);
      const diffB =
        Math.abs(parseFloat(b.attributes?.alto || '0') - alto) +
        Math.abs(parseFloat(b.attributes?.ancho || '0') - ancho);
      return diffA - diffB;
    });

    return NextResponse.json(compatibles);
  } catch (error) {
    console.error('Error buscando micas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}