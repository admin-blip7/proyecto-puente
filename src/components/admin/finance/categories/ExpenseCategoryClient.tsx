"use client"

import { useState, useEffect } from "react";
import { ExpenseCategory } from "@/types";
import { getExpenseCategories, addExpenseCategory, updateExpenseCategory } from "@/lib/services/expenseCategoryService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PlusCircle, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function ExpenseCategoryClient() {
    const [categories, setCategories] = useState<ExpenseCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [editCategory, setEditCategory] = useState<ExpenseCategory | null>(null);
    const [newCategoryName, setNewCategoryName] = useState("");
    const { toast } = useToast();

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setIsLoading(true);
        try {
            const fetchedCategories = await getExpenseCategories();
            setCategories(fetchedCategories);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudieron cargar las categorías." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleAddNewCategory = async () => {
        if (!newCategoryName.trim()) {
            toast({ variant: "destructive", title: "Error", description: "El nombre no puede estar vacío." });
            return;
        }
        setIsSaving(true);
        try {
            const newCategory = await addExpenseCategory({ name: newCategoryName, isActive: true });
            setCategories(prev => [...prev, newCategory].sort((a,b) => a.name.localeCompare(b.name)));
            setNewCategoryName("");
            toast({ title: "Categoría Agregada" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo agregar la categoría." });
        } finally {
            setIsSaving(false);
        }
    }

    const handleUpdateCategory = async () => {
        if (!editCategory) return;
        setIsSaving(true);
        try {
            await updateExpenseCategory(editCategory.id, { name: editCategory.name, isActive: editCategory.isActive });
            setCategories(prev => prev.map(c => c.id === editCategory.id ? editCategory : c));
            setEditCategory(null);
            toast({ title: "Categoría Actualizada" });
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "No se pudo actualizar la categoría." });
        } finally {
            setIsSaving(false);
        }
    }


    return (
        <>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Categorías de Gastos</h1>
                    <p className="text-muted-foreground">Administra las categorías para organizar tus gastos operativos.</p>
                </div>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Nueva Categoría</CardTitle>
                    <CardDescription>Añade una nueva categoría para usarla en el registro de gastos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex w-full max-w-sm items-center space-x-2">
                        <Input 
                            value={newCategoryName}
                            onChange={(e) => setNewCategoryName(e.target.value)}
                            placeholder="Ej: Viáticos" 
                        />
                        <Button type="button" onClick={handleAddNewCategory} disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : <PlusCircle />}
                            <span className="ml-2 hidden sm:inline">Agregar</span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Categorías Existentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="relative w-full overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="text-center">Estado</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24">Cargando categorías...</TableCell></TableRow>
                                ) : (
                                    categories.map((cat) => (
                                        <TableRow key={cat.id}>
                                            <TableCell className="font-medium">{cat.name}</TableCell>
                                            <TableCell className="text-center">{cat.isActive ? "Activa" : "Inactiva"}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => setEditCategory(cat)}>
                                                    <Edit className="h-4 w-4" />
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

            <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Categoría</DialogTitle>
                    </DialogHeader>
                    {editCategory && (
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nombre</Label>
                                <Input
                                id="name"
                                value={editCategory.name}
                                onChange={(e) => setEditCategory({...editCategory, name: e.target.value})}
                                className="col-span-3"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="status" className="text-right">Estado</Label>
                                <Switch
                                    id="status"
                                    checked={editCategory.isActive}
                                    onCheckedChange={(checked) => setEditCategory({...editCategory, isActive: checked})}
                                />
                                <span className="col-span-2 text-sm text-muted-foreground">{editCategory.isActive ? "Activa" : "Inactiva"}</span>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancelar</Button>
                        </DialogClose>
                        <Button onClick={handleUpdateCategory} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
