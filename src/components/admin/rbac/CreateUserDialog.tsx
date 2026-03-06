"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { UserPlus } from "lucide-react";

// Available modules and actions matching the RBAC plan
const MODULES = [
    { id: 'pos', label: 'POS' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'sales', label: 'Ventas' },
    { id: 'finance', label: 'Finanzas' },
    { id: 'crm', label: 'CRM' },
    { id: 'repairs', label: 'Reparaciones' },
    { id: 'warranties', label: 'Garantías' },
    { id: 'products', label: 'Productos' },
    { id: 'users', label: 'Usuarios' },
    { id: 'settings', label: 'Configuración' },
];

const ACTIONS = [
    { id: 'view', label: 'Ver' },
    { id: 'create', label: 'Crear' },
    { id: 'edit', label: 'Editar' },
    { id: 'delete', label: 'Eliminar' },
    { id: 'approve', label: 'Aprobar' },
];

interface CreateUserDialogProps {
    partnerId: string;
    branches: { id: string; name: string }[];
    onCreateUser: (data: CreateUserPayload) => Promise<{ error?: string }>;
}

export interface CreateUserPayload {
    email: string;
    name: string;
    password: string;
    role: string;
    branchId: string;
    permissions: { module: string; action: string; scope: string }[];
}

export function CreateUserDialog({ partnerId, branches, onCreateUser }: CreateUserDialogProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("Cajero");
    const [branchId, setBranchId] = useState(branches[0]?.id || "");
    const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

    const togglePermission = (module: string, action: string) => {
        setPermissions(prev => ({
            ...prev,
            [module]: {
                ...(prev[module] || {}),
                [action]: !(prev[module]?.[action]),
            }
        }));
    };

    const toggleAllModule = (module: string) => {
        const allOn = ACTIONS.every(a => permissions[module]?.[a.id]);
        const newActions = Object.fromEntries(ACTIONS.map(a => [a.id, !allOn]));
        setPermissions(prev => ({ ...prev, [module]: newActions }));
    };

    const buildPermissionsList = () => {
        const list: { module: string; action: string; scope: string }[] = [];
        for (const [module, actions] of Object.entries(permissions)) {
            for (const [action, enabled] of Object.entries(actions)) {
                if (enabled) list.push({ module, action, scope: 'partner' });
            }
        }
        return list;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const result = await onCreateUser({
                email, name, password, role, branchId,
                permissions: buildPermissionsList(),
            });
            if (result?.error) {
                setError(result.error);
            } else {
                setSuccess(true);
                setTimeout(() => {
                    setOpen(false);
                    setSuccess(false);
                    setEmail(""); setName(""); setPassword(""); setPermissions({});
                }, 1500);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4" />
                    Nuevo Usuario
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                </DialogHeader>

                {success ? (
                    <div className="py-8 text-center text-green-500 font-semibold">
                        ✓ Usuario creado correctamente
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5 mt-2">
                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Nombre</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Email</Label>
                                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@email.com" required />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Contraseña temporal</Label>
                                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 caracteres" required minLength={8} />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Rol</Label>
                                <Select value={role} onValueChange={setRole}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Admin de Tienda">Admin de Tienda</SelectItem>
                                        <SelectItem value="Cajero">Cajero</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {branches.length > 0 && (
                                <div className="space-y-1.5 col-span-2">
                                    <Label>Sucursal asignada</Label>
                                    <Select value={branchId} onValueChange={setBranchId}>
                                        <SelectTrigger><SelectValue placeholder="Seleccionar sucursal" /></SelectTrigger>
                                        <SelectContent>
                                            {branches.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>

                        {/* Permissions Matrix */}
                        <div>
                            <Label className="text-base font-semibold">Permisos por Módulo</Label>
                            <p className="text-xs text-muted-foreground mb-3">Activa los permisos que tendrá este usuario. Solo puedes asignar permisos que tú mismo posees.</p>

                            <div className="border rounded-lg overflow-hidden">
                                {/* Header row */}
                                <div className="grid bg-muted/50 text-xs font-medium text-muted-foreground px-3 py-2" style={{ gridTemplateColumns: '1fr repeat(5, 64px)' }}>
                                    <span>Módulo</span>
                                    {ACTIONS.map(a => <span key={a.id} className="text-center">{a.label}</span>)}
                                </div>

                                {MODULES.map((mod, i) => {
                                    const allOn = ACTIONS.every(a => permissions[mod.id]?.[a.id]);
                                    return (
                                        <div
                                            key={mod.id}
                                            className={`grid items-center px-3 py-2 ${i % 2 === 0 ? '' : 'bg-muted/20'}`}
                                            style={{ gridTemplateColumns: '1fr repeat(5, 64px)' }}
                                        >
                                            <button
                                                type="button"
                                                className="text-left text-sm font-medium flex items-center gap-2"
                                                onClick={() => toggleAllModule(mod.id)}
                                            >
                                                {mod.label}
                                                {allOn && <Badge variant="outline" className="text-xs py-0 border-blue-400 text-blue-400">Todo</Badge>}
                                            </button>
                                            {ACTIONS.map(action => (
                                                <div key={action.id} className="flex justify-center">
                                                    <Switch
                                                        checked={!!permissions[mod.id]?.[action.id]}
                                                        onCheckedChange={() => togglePermission(mod.id, action.id)}
                                                        className="scale-75"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>

                            <p className="text-xs text-muted-foreground mt-2">
                                Permisos activos: <span className="font-semibold text-blue-400">{buildPermissionsList().length}</span>
                            </p>
                        </div>

                        {error && <p className="text-sm text-red-500">{error}</p>}

                        <div className="flex justify-end gap-3 pt-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                                {loading ? "Creando..." : "Crear Usuario"}
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
