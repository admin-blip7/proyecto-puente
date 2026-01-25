'use client';

import { useState } from 'react';
import { generateLabelPdf } from '@/lib/printing/labelPdfGenerator';
import { LabelPrintItem, LabelSettings } from '@/types';

export default function TestLabelsPage() {
    const [status, setStatus] = useState<string>('Ready');

    const runTest = async () => {
        setStatus('Generating...');
        try {
            const mockItems: LabelPrintItem[] = [
                {
                    product: {
                        id: '1',
                        name: 'Producto de Prueba',
                        sku: 'TEST-SKU-123',
                        price: 150.50,
                        stock: 10,
                        category: 'General',
                        attributes: {
                            color: 'Rojo',
                            size: 'M'
                        }
                    },
                    quantity: 1
                },
                {
                    product: {
                        id: '2',
                        name: 'Otro Producto',
                        sku: 'TEST-SKU-456',
                        price: 299.99,
                        stock: 5,
                        category: 'Accesorios'
                    },
                    quantity: 1
                }
            ];

            const mockSettings: LabelSettings = {
                content: {
                    showProductName: true,
                    showSku: true,
                    showPrice: true,
                    showStoreName: true
                },
                orientation: 'horizontal',
                width: 50,
                height: 30,
                fontSize: 12,
                barcodeHeight: 10,
                includeLogo: false,
                storeName: 'Mi Tienda',
                visualLayout: JSON.stringify({
                    elements: [
                        {
                            id: '1',
                            type: 'placeholder',
                            placeholderKey: 'productName',
                            x: 2,
                            y: 2,
                            width: 46,
                            height: 5,
                            fontSize: 10,
                            textAlign: 'center',
                            fontWeight: 700
                        },
                        {
                            id: '2',
                            type: 'placeholder',
                            placeholderKey: 'price',
                            x: 2,
                            y: 8,
                            width: 46,
                            height: 5,
                            fontSize: 12,
                            textAlign: 'center',
                            fontWeight: 700
                        },
                        {
                            id: '3',
                            type: 'placeholder',
                            placeholderKey: 'barcode',
                            x: 5,
                            y: 15,
                            width: 40,
                            height: 10,
                            barcodeFormat: 'code128'
                        }
                    ]
                })
            };

            await generateLabelPdf(mockItems, mockSettings);
            setStatus('Success! PDF should download.');
        } catch (error) {
            console.error(error);
            setStatus(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Verificación de Etiquetas</h1>
            <div className="mb-4">
                <p>Estado: {status}</p>
            </div>
            <button
                onClick={runTest}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
                Generar PDF de Prueba
            </button>
        </div>
    );
}
