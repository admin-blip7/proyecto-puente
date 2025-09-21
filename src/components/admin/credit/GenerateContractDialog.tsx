
"use client";

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ClientProfile, ContractTemplateSettings } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown } from "lucide-react";
import { getContractTemplate } from "@/lib/services/settingsService";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface GenerateContractDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    client: ClientProfile;
}

export default function GenerateContractDialog({ isOpen, onOpenChange, client }: GenerateContractDialogProps) {
    const [template, setTemplate] = useState<ContractTemplateSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            getContractTemplate()
                .then(setTemplate)
                .catch(() => toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la plantilla." }))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen, toast]);

    const processedContent = useMemo(() => {
        if (!template || !client.creditAccount) return "";
        
        let content = template.content;
        const replacements = {
            "{{CLIENT_NAME}}": client.name,
            "{{CLIENT_ADDRESS}}": client.address,
            "{{CLIENT_PHONE}}": client.phone,
            "{{CREDIT_LIMIT}}": `$${client.creditAccount.creditLimit.toFixed(2)} MXN`,
            "{{INTEREST_RATE}}": `${client.creditAccount.interestRate || 0}%`,
            "{{PAYMENT_DUE_DAY}}": format(client.creditAccount.paymentDueDate, "do", { locale: es }),
            "{{STORE_NAME}}": "Storefront Swift", // Placeholder, ideally from settings
            "{{STORE_ADDRESS}}": "Dirección de la Tienda", // Placeholder
            "{{STORE_CITY}}": "Tu Ciudad", // Placeholder
            "{{CURRENT_DATE}}": format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es }),
        };

        for (const [key, value] of Object.entries(replacements)) {
            content = content.replace(new RegExp(key, 'g'), value);
        }

        return content;
    }, [template, client]);

    const handleDownloadPdf = () => {
        if (!processedContent) return;

        const doc = new jsPDF();
        
        doc.setFont("Helvetica", "normal");
        doc.setFontSize(11);
        
        // El método .text() de jsPDF maneja automáticamente los saltos de línea y el ajuste de texto.
        const splitText = doc.splitTextToSize(processedContent, 180); // 180mm is the max width
        doc.text(splitText, 15, 20); // 15mm from left, 20mm from top

        doc.save(`contrato-credito-${client.name.replace(/ /g, '_')}.pdf`);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Generar Contrato de Crédito para {client.name}</DialogTitle>
                    <DialogDescription>
                        Revisa el contrato generado a partir de la plantilla y los datos del cliente.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-grow min-h-0 border rounded-md bg-muted/30">
                    <ScrollArea className="h-full">
                        <div className="p-6 whitespace-pre-wrap font-mono text-sm">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-48">
                                    <Loader2 className="animate-spin" />
                                </div>
                            ) : (
                                processedContent
                            )}
                        </div>
                    </ScrollArea>
                </div>
                

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                    <Button onClick={handleDownloadPdf} disabled={isLoading || !processedContent}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Descargar PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
