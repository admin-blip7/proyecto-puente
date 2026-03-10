import { getSeminuevoModels } from "@/lib/services/productService";
import SeminuevosClient from "./SeminuevosClient";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "iPhones Seminuevos - 22 Electronic",
    description: "Encuentra iPhones seminuevos con diagnóstico detallado y garantía.",
};

export const revalidate = 0; // Para que muestre siempre stock real, o usar 60 si preferimos caché

export default async function SeminuevosPage() {
    const models = await getSeminuevoModels();

    return (
        <div className="min-h-screen bg-gray-50/50">
            <SeminuevosClient initialModels={models} />
        </div>
    );
}
