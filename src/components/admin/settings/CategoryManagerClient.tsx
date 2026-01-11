"use client";

import { useState } from "react";
import { ProductCategory, createProductCategory, deleteProductCategory } from "@/lib/services/categoryService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Loader2, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface CategoryManagerClientProps {
    initialCategories: ProductCategory[];
}

export default function CategoryManagerClient({ initialCategories }: CategoryManagerClientProps) {
    const [categories, setCategories] = useState<ProductCategory[]>(initialCategories);
    const [newCategoryLabel, setNewCategoryLabel] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const { toast } = useToast();

    const handleCreate = async () => {
        if (!newCategoryLabel.trim()) return;

        setIsCreating(true);
        try {
            const newCategory = await createProductCategory(newCategoryLabel);
            setCategories([...categories, newCategory]);
            setNewCategoryLabel("");
            toast({
                title: "Categoría creada",
                description: `La categoría "${newCategory.label}" se ha creado correctamente.`
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo crear la categoría."
            });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta categoría? Esto podría afectar la visualización de productos existentes asociados a ella.")) return;

        setIsDeleting(id);
        try {
            await deleteProductCategory(id);
            setCategories(categories.filter(c => c.id !== id));
            toast({
                title: "Categoría eliminada",
                description: "La categoría ha sido eliminada."
            });
        } catch (error) {
            console.error(error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo eliminar la categoría."
            });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <Card className="h-full border-none shadow-none">
            <CardHeader className="px-0">
                <CardTitle>Categorías de Productos</CardTitle>
                <CardDescription>
                    Gestiona las categorías disponibles para clasificar tus productos.
                </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                {/* Formulario de Creación */}
                <div className="flex gap-4 items-end bg-muted/30 p-4 rounded-lg border">
                    <div className="flex-1 space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Nueva Categoría
                        </label>
                        <Input
                            placeholder="Ej. Accesorios, Cables, Audífonos..."
                            value={newCategoryLabel}
                            onChange={(e) => setNewCategoryLabel(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                    <Button
                        onClick={handleCreate}
                        disabled={isCreating || !newCategoryLabel.trim()}
                    >
                        {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        Agregar
                    </Button>
                </div>

                {/* Lista de Categorías */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Slug (Identificador)</TableHead>
                                <TableHead className="w-[100px] text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center h-24 text-muted-foreground">
                                        No hay categorías registradas.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                categories.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Tag className="h-4 w-4 text-muted-foreground" />
                                                {category.label}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary" className="font-mono text-xs">
                                                {category.value}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDelete(category.id)}
                                                disabled={isDeleting === category.id}
                                            >
                                                {isDeleting === category.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
