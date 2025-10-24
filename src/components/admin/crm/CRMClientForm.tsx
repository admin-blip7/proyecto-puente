"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CRMClient, IdentificationType, ClientType, CRMClientStatus } from "@/types";
import { createCRMClient, updateCRMClient, getCRMTags } from "@/lib/services/crmClientService";

interface CRMClientFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    client?: CRMClient | null;
    onClientSaved?: (client: CRMClient) => void;
}

export default function CRMClientForm({ isOpen, onOpenChange, client, onClientSaved }: CRMClientFormProps) {
    const [loading, setLoading] = useState(false);
    const [tags, setTags] = useState<string[]>([]);
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState("");
    const { toast } = useToast();

    const [formData, setFormData] = useState({
        identificationType: "cedula" as IdentificationType,
        identificationNumber: "",
        firstName: "",
        lastName: "",
        companyName: "",
        email: "",
        phone: "",
        secondaryPhone: "",
        address: "",
        city: "",
        province: "",
        clientType: "particular" as ClientType,
        clientStatus: "active" as CRMClientStatus,
        creditLimit: 0,
        notes: "",
    });

    // Load available tags
    useEffect(() => {
        const loadTags = async () => {
            try {
                const crmTags = await getCRMTags();
                setAvailableTags(crmTags.map(t => t.name));
            } catch (error) {
                console.error("Error loading tags:", error);
            }
        };
        loadTags();
    }, []);

    // Load client data for editing
    useEffect(() => {
        if (client) {
            setFormData({
                identificationType: client.identificationType,
                identificationNumber: client.identificationNumber,
                firstName: client.firstName,
                lastName: client.lastName,
                companyName: client.companyName || "",
                email: client.email || "",
                phone: client.phone || "",
                secondaryPhone: client.secondaryPhone || "",
                address: client.address || "",
                city: client.city || "",
                province: client.province || "",
                clientType: client.clientType,
                clientStatus: client.clientStatus,
                creditLimit: client.creditLimit,
                notes: client.notes || "",
            });
            setTags(client.tags || []);
        } else {
            // Reset form for new client
            setFormData({
                identificationType: "cedula",
                identificationNumber: "",
                firstName: "",
                lastName: "",
                companyName: "",
                email: "",
                phone: "",
                secondaryPhone: "",
                address: "",
                city: "",
                province: "",
                clientType: "particular",
                clientStatus: "active",
                creditLimit: 0,
                notes: "",
            });
            setTags([]);
        }
    }, [client, isOpen]);

    const handleInputChange = (field: string, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags(prev => [...prev, newTag.trim()]);
            setNewTag("");
        }
    };

    const handleRemoveTag = (tagToRemove: string) => {
        setTags(prev => prev.filter(tag => tag !== tagToRemove));
    };

    const handleSelectAvailableTag = (tag: string) => {
        if (!tags.includes(tag)) {
            setTags(prev => [...prev, tag]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const clientData = {
                ...formData,
                registrationDate: client?.registrationDate || new Date(),
                lastContactDate: client?.lastContactDate,
                totalPurchases: client?.totalPurchases || 0,
                outstandingBalance: client?.outstandingBalance || 0,
                tags,
            };

            let savedClient: CRMClient;

            if (client) {
                // Update existing client
                savedClient = await updateCRMClient(client.id, clientData);
                toast({
                    title: "Cliente actualizado",
                    description: "El cliente ha sido actualizado correctamente."
                });
            } else {
                // Create new client
                savedClient = await createCRMClient(clientData);
                toast({
                    title: "Cliente creado",
                    description: "El cliente ha sido creado correctamente."
                });
            }

            onClientSaved?.(savedClient);
            onOpenChange(false);
        } catch (error) {
            console.error("Error saving client:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "No se pudo guardar el cliente."
            });
        } finally {
            setLoading(false);
        }
    };

    const isFormValid = () => {
        return formData.identificationNumber.trim() !== "" &&
               formData.firstName.trim() !== "" &&
               formData.lastName.trim() !== "";
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {client ? "Editar Cliente" : "Nuevo Cliente"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información de Identificación */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Información de Identificación</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="identificationType">Tipo de Identificación</Label>
                                <Select
                                    value={formData.identificationType}
                                    onValueChange={(value: IdentificationType) => handleInputChange('identificationType', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cedula">Cédula</SelectItem>
                                        <SelectItem value="ruc">RUC</SelectItem>
                                        <SelectItem value="pasaporte">Pasaporte</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="identificationNumber">Número de Identificación</Label>
                                <Input
                                    id="identificationNumber"
                                    value={formData.identificationNumber}
                                    onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Información Personal */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Información Personal</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="firstName">Nombre</Label>
                                <Input
                                    id="firstName"
                                    value={formData.firstName}
                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <Label htmlFor="lastName">Apellido</Label>
                                <Input
                                    id="lastName"
                                    value={formData.lastName}
                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="companyName">Empresa (opcional)</Label>
                            <Input
                                id="companyName"
                                value={formData.companyName}
                                onChange={(e) => handleInputChange('companyName', e.target.value)}
                                placeholder="Nombre de la empresa si aplica"
                            />
                        </div>
                    </div>

                    {/* Información de Contacto */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Información de Contacto</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleInputChange('email', e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                />
                            </div>
                            <div>
                                <Label htmlFor="phone">Teléfono Principal</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => handleInputChange('phone', e.target.value)}
                                    placeholder="+593 999 999 999"
                                />
                            </div>
                            <div>
                                <Label htmlFor="secondaryPhone">Teléfono Secundario</Label>
                                <Input
                                    id="secondaryPhone"
                                    value={formData.secondaryPhone}
                                    onChange={(e) => handleInputChange('secondaryPhone', e.target.value)}
                                    placeholder="+593 999 999 999"
                                />
                            </div>
                            <div>
                                <Label htmlFor="clientType">Tipo de Cliente</Label>
                                <Select
                                    value={formData.clientType}
                                    onValueChange={(value: ClientType) => handleInputChange('clientType', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="particular">Particular</SelectItem>
                                        <SelectItem value="empresa">Empresa</SelectItem>
                                        <SelectItem value="recurrente">Recurrente</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    {/* Dirección */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Dirección</h3>
                        <div>
                            <Label htmlFor="address">Dirección Completa</Label>
                            <Input
                                id="address"
                                value={formData.address}
                                onChange={(e) => handleInputChange('address', e.target.value)}
                                placeholder="Calle Principal #123, Sector"
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="city">Ciudad</Label>
                                <Input
                                    id="city"
                                    value={formData.city}
                                    onChange={(e) => handleInputChange('city', e.target.value)}
                                    placeholder="Quito"
                                />
                            </div>
                            <div>
                                <Label htmlFor="province">Provincia</Label>
                                <Input
                                    id="province"
                                    value={formData.province}
                                    onChange={(e) => handleInputChange('province', e.target.value)}
                                    placeholder="Pichincha"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Estado y Límite de Crédito */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Estado y Crédito</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="clientStatus">Estado del Cliente</Label>
                                <Select
                                    value={formData.clientStatus}
                                    onValueChange={(value: CRMClientStatus) => handleInputChange('clientStatus', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="active">Activo</SelectItem>
                                        <SelectItem value="inactive">Inactivo</SelectItem>
                                        <SelectItem value="pending">Pendiente</SelectItem>
                                        <SelectItem value="blacklisted">Lista Negra</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label htmlFor="creditLimit">Límite de Crédito</Label>
                                <Input
                                    id="creditLimit"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.creditLimit}
                                    onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Etiquetas */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Etiquetas</h3>
                        <div className="space-y-2">
                            <div className="flex gap-2">
                                <Input
                                    value={newTag}
                                    onChange={(e) => setNewTag(e.target.value)}
                                    placeholder="Agregar etiqueta personalizada"
                                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                                />
                                <Button type="button" onClick={handleAddTag} variant="outline">
                                    Agregar
                                </Button>
                            </div>
                            {tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                                            {tag}
                                            <X
                                                className="h-3 w-3 cursor-pointer"
                                                onClick={() => handleRemoveTag(tag)}
                                            />
                                        </Badge>
                                    ))}
                                </div>
                            )}
                            {availableTags.length > 0 && (
                                <div>
                                    <Label className="text-sm text-muted-foreground">Etiquetas disponibles:</Label>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        {availableTags.map(tag => (
                                            <Badge
                                                key={tag}
                                                variant="outline"
                                                className="cursor-pointer"
                                                onClick={() => handleSelectAvailableTag(tag)}
                                            >
                                                + {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notas */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold">Notas</h3>
                        <Textarea
                            value={formData.notes}
                            onChange={(e) => handleInputChange('notes', e.target.value)}
                            placeholder="Notas adicionales sobre el cliente..."
                            rows={3}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading || !isFormValid()}
                        >
                            {loading ? "Guardando..." : client ? "Actualizar Cliente" : "Crear Cliente"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}