import { getSeminuevoUnits, getProductById } from "@/lib/services/productService";
import ModelUnitsClient from "./ModelUnitsClient";
import { Metadata } from "next";

export async function generateMetadata({ params }: { params: { modelId: string } }): Promise<Metadata> {
    const parent = await getProductById(params.modelId);
    return {
        title: `${parent?.name || "Modelo"} - Unidades Disponibles | 22 Electronic`,
        description: `Explora todas las unidades disponibles para ${parent?.name || "este modelo"}.`,
    };
}

export const revalidate = 0;

export default async function ModelUnitsPage({ params }: { params: { modelId: string } }) {
    const [parent, units] = await Promise.all([
        getProductById(params.modelId),
        getSeminuevoUnits(params.modelId)
    ]);

    if (!parent) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <h1 className="text-2xl font-bold">Modelo no encontrado</h1>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50/50">
            <ModelUnitsClient parentModel={parent} initialUnits={units} />
        </div>
    );
}
