'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Smartphone, Package, History, ChevronRight } from 'lucide-react';
import { Product } from '@/types';

interface ProductWithCompatibility extends Product {
  compatibility?: {
    level: 'Compatible' | 'Posiblemente compatible' | 'No compatible';
    micaAltoCm: number;
    micaAnchoCm: number;
    requestedAltoCm: number;
    requestedAnchoCm: number;
  };
}

interface Compatibilidad {
  id: string;
  modelo_celular: string;
  alto: number;
  ancho: number;
  mica_id: string;
  contador: number;
  creado_at: string;
  product?: Product;
}

interface BuscadorCompatibilidadProps {
  onClose?: () => void;
  onAddToCart?: (product: Product, quantity?: number) => void;
}

export default function BuscadorCompatibilidad({ onClose, onAddToCart }: BuscadorCompatibilidadProps) {
  const [modelo, setModelo] = useState('');
  const [alto, setAlto] = useState('');
  const [ancho, setAncho] = useState('');
  const [resultados, setResultados] = useState<ProductWithCompatibility[]>([]);
  const [historial, setHistorial] = useState<Compatibilidad[]>([]);
  const [cargando, setCargando] = useState(false);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [modelosSugeridos, setModelosSugeridos] = useState<string[]>([]);

  // Obtener modelos únicos para autocompletar
  useEffect(() => {
    const cargarModelos = async () => {
      try {
        const response = await fetch('/api/compatibilidad/modelos');
        if (response.ok) {
          const modelos = await response.json();
          setModelosSugeridos(modelos);
        }
      } catch (error) {
        console.error('Error cargando modelos:', error);
      }
    };
    cargarModelos();
  }, []);

  // Buscar micas compatibles
  const buscarMicasCompatibles = useCallback(async () => {
    if (!alto || !ancho) return;

    setCargando(true);
    try {
      const response = await fetch(
        `/api/micas/search?alto=${parseFloat(alto)}&ancho=${parseFloat(ancho)}`
      );
      if (response.ok) {
        const data = await response.json();
        setResultados(data);
      }
    } catch (error) {
      console.error('Error buscando micas:', error);
    } finally {
      setCargando(false);
    }
  }, [alto, ancho]);

  // Cargar historial de compatibilidades
  const cargarHistorial = useCallback(async () => {
    try {
      const response = await fetch('/api/compatibilidad/historial?limit=20');
      if (response.ok) {
        const data = await response.json();
        setHistorial(data);
      }
    } catch (error) {
      console.error('Error cargando historial:', error);
    }
  }, []);

  // Registrar compatibilidad y agregar al carrito
  const registrarCompatibilidad = async (mica: ProductWithCompatibility) => {
    if (!modelo.trim()) {
      alert('Por favor ingresa el modelo del celular para registrar la compatibilidad');
      return;
    }

    try {
      // Primero registrar la compatibilidad
      const response = await fetch('/api/compatibilidad/registrar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modelo: modelo.trim(),
          alto: parseFloat(alto),
          ancho: parseFloat(ancho),
          micaId: mica.id,
          compatibilityLevel: mica.compatibility?.level || 'No compatible',
        }),
      });

      if (response.ok) {
        // Si se registró exitosamente, agregar al carrito
        if (onAddToCart) {
          onAddToCart(mica, 1);
          alert(`Compatibilidad registrada y mica "${mica.name}" agregada al carrito`);
        } else {
          alert('Compatibilidad registrada exitosamente');
        }
        cargarHistorial(); // Actualizar historial
      } else {
        alert('Error al registrar compatibilidad');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al registrar compatibilidad');
    }
  };

  // Auto-buscar al cambiar medidas
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (alto && ancho) {
        buscarMicasCompatibles();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [alto, ancho, buscarMicasCompatibles]);

  // Cargar historial al montar
  useEffect(() => {
    if (mostrarHistorial) {
      cargarHistorial();
    }
  }, [mostrarHistorial, cargarHistorial]);

  // Función para obtener el color de la etiqueta de compatibilidad
  const getCompatibilityBadgeColor = (level: string) => {
    switch (level) {
      case 'Compatible':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Posiblemente compatible':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'No compatible':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Función para obtener el ícono de compatibilidad
  const getCompatibilityIcon = (level: string) => {
    switch (level) {
      case 'Compatible':
        return '✓';
      case 'Posiblemente compatible':
        return '?';
      case 'No compatible':
        return '✗';
      default:
        return '';
    }
  };

  // Filtrar modelos sugeridos
  const modelosFiltrados = modelosSugeridos.filter((m) =>
    m.toLowerCase().includes(modelo.toLowerCase())
  );

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Search className="w-5 h-5" />
            Buscador de Compatibilidad
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Campos de búsqueda */}
        <div className="space-y-3">
          {/* Modelo con autocompletar */}
          <div className="relative">
            <label htmlFor="modeloCelular" className="block text-xs font-medium mb-1 opacity-90">
              Modelo del Celular
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-70" />
              <input
                id="modeloCelular"
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="iPhone 13, Galaxy S21, etc."
                className="w-full pl-10 pr-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:bg-white/30"
              />
            </div>
            {/* Sugerencias de autocompletar */}
            {modelo && modelosFiltrados.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto z-10">
                {modelosFiltrados.slice(0, 5).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModelo(m)}
                    className="w-full px-3 py-2 text-left text-gray-700 hover:bg-gray-100 text-sm"
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Medidas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="altoMedida" className="block text-xs font-medium mb-1 opacity-90">
                Alto (cm)
              </label>
              <input
                id="altoMedida"
                type="number"
                step="0.1"
                value={alto}
                onChange={(e) => setAlto(e.target.value)}
                placeholder="15.0"
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:bg-white/30"
              />
            </div>
            <div>
              <label htmlFor="anchoMedida" className="block text-xs font-medium mb-1 opacity-90">
                Ancho (cm)
              </label>
              <input
                id="anchoMedida"
                type="number"
                step="0.1"
                value={ancho}
                onChange={(e) => setAncho(e.target.value)}
                placeholder="7.5"
                className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/70 focus:outline-none focus:bg-white/30"
              />
            </div>
          </div>

          <button
            onClick={buscarMicasCompatibles}
            disabled={!alto || !ancho || cargando}
            className="w-full py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cargando ? 'Buscando...' : 'Buscar Micas'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setMostrarHistorial(false)}
          className={`flex-1 py-2 px-4 font-medium text-sm transition-colors ${!mostrarHistorial
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <Package className="w-4 h-4 inline mr-1" />
          Resultados ({resultados.length})
        </button>
        <button
          onClick={() => setMostrarHistorial(true)}
          className={`flex-1 py-2 px-4 font-medium text-sm transition-colors ${mostrarHistorial
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          <History className="w-4 h-4 inline mr-1" />
          Historial
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!mostrarHistorial ? (
          /* Resultados de búsqueda */
          <div className="space-y-2">
            {resultados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {alto && ancho
                    ? 'Mostrando todas las micas disponibles con su nivel de compatibilidad'
                    : 'Ingresa las medidas para buscar micas compatibles'}
                </p>
                {alto && ancho && (
                  <p className="text-xs mt-1">
                    Tolerancia: 0 a -2mm (la mica nunca puede ser más grande que el dispositivo)
                  </p>
                )}
              </div>
            ) : (
              resultados.map((mica) => (
                <div
                  key={mica.id}
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">{mica.name}</h3>
                        {mica.compatibility && (
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getCompatibilityBadgeColor(
                              mica.compatibility.level
                            )}`}
                          >
                            {getCompatibilityIcon(mica.compatibility.level)} {mica.compatibility.level}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">SKU: {mica.sku}</p>
                      <div className="mt-1 flex items-center gap-4 text-xs text-gray-600">
                        <span>Stock: {mica.stock}</span>
                        <span>Precio: ${mica.price.toFixed(2)}</span>
                      </div>
                      {mica.attributes?.alto && mica.attributes?.ancho && (
                        <div className="mt-1 text-xs text-blue-600">
                          Medidas: {(parseFloat(mica.attributes.alto) > 50 ? parseFloat(mica.attributes.alto) / 10 : parseFloat(mica.attributes.alto)).toFixed(1)}×{(parseFloat(mica.attributes.ancho) > 50 ? parseFloat(mica.attributes.ancho) / 10 : parseFloat(mica.attributes.ancho)).toFixed(1)}cm
                        </div>
                      )}
                      {mica.compatibility && (
                        <div className="mt-1 text-xs text-gray-500">
                          Diferencia: {Math.abs(mica.compatibility.micaAltoCm - mica.compatibility.requestedAltoCm).toFixed(1)}×{Math.abs(mica.compatibility.micaAnchoCm - mica.compatibility.requestedAnchoCm).toFixed(1)}cm
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => registrarCompatibilidad(mica)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                    >
                      Registrar y Agregar <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Historial de compatibilidades */
          <div className="space-y-2">
            {historial.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay compatibilidades registradas</p>
              </div>
            ) : (
              historial.map((item) => (
                <div
                  key={item.id}
                  className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {item.modelo_celular}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Medidas: {item.alto}×{item.ancho}cm
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Usado {item.contador} vez{item.contador !== 1 ? 'es' : ''}
                      </p>
                    </div>
                    {item.product && (
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.product.name}</p>
                        <p className="text-xs text-gray-500">
                          ${item.product.price.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer info */}
      <div className="p-3 bg-gray-50 border-t">
        <p className="text-xs text-gray-500 text-center">
          Sistema de tolerancia: <span className="text-green-600 font-medium">Compatible</span> (0 a -2mm),
          <span className="text-yellow-600 font-medium"> Posiblemente compatible</span> (hasta 5mm),
          <span className="text-red-600 font-medium"> No compatible</span> (más de 5mm)
        </p>
      </div>
    </div>
  );
}