"use client"

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Debt } from "@/types";
import { Bot, Loader2, Snowflake, Mountain } from "lucide-react";
import { generateDebtStrategy } from "@/ai/flows/generate-debt-strategy";
import { GenerateDebtStrategyOutput } from "@/ai/flows/types";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

interface DebtStrategyDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    debts: Debt[];
}

export default function DebtStrategyDialog({ isOpen, onOpenChange, debts }: DebtStrategyDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [strategy, setStrategy] = useState<GenerateDebtStrategyOutput | null>(null);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setIsLoading(true);
        setStrategy(null);
        try {
            const creditCardDebtsForAI = debts.map(d => ({
                id: d.id,
                creditorName: d.creditorName,
                currentBalance: d.currentBalance,
                interestRate: d.interestRate
            }));

            const result = await generateDebtStrategy({ creditCardDebts: creditCardDebtsForAI });
            setStrategy(result);
        } catch (error) {
            console.error("Error generating debt strategy:", error);
            toast({ variant: 'destructive', title: "Error de IA", description: "No se pudo generar la estrategia." });
        } finally {
            setIsLoading(false);
        }
    }


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Generador de Estrategia de Pago de Deudas con IA</DialogTitle>
                    <DialogDescription>
                       Analiza tus tarjetas de crédito y obtén un plan de acción para liquidarlas de la manera más inteligente.
                    </DialogDescription>
                </DialogHeader>

                {!strategy && (
                    <div className="flex flex-col items-center justify-center text-center p-8 space-y-4">
                        <p className="text-muted-foreground">La IA analizará tus deudas con tarjeta de crédito para crear dos planes de pago personalizados: Bola de Nieve y Avalancha.</p>
                        <Button onClick={handleGenerate} disabled={isLoading || debts.length === 0}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Bot className="mr-2 h-4 w-4"/>}
                            {isLoading ? "Analizando..." : "Generar Estrategias"}
                        </Button>
                        {debts.length === 0 && <p className="text-xs text-destructive">No tienes deudas de tipo "Tarjeta de Crédito" para analizar.</p>}
                    </div>
                )}

                {strategy && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 max-h-[60vh] overflow-y-auto p-2">
                        {/* Snowball */}
                        <div className="rounded-lg border p-4 space-y-3">
                             <div className="flex items-center gap-3">
                                <Snowflake className="h-8 w-8 text-blue-400" />
                                <div>
                                    <h3 className="text-lg font-semibold">{strategy.snowball.name}</h3>
                                    <p className="text-sm text-muted-foreground">Enfoque en la motivación</p>
                                </div>
                             </div>
                             <p className="text-xs">{strategy.snowball.description}</p>
                             <Separator />
                             <h4 className="font-semibold">Plan de Acción:</h4>
                             <ol className="list-decimal list-inside space-y-2 text-sm">
                                {strategy.snowball.plan.map((step, index) => (
                                    <li key={index}>
                                        <span className="font-semibold">{step.creditorName}</span>: <span className="text-muted-foreground">{step.reason}</span>
                                    </li>
                                ))}
                             </ol>
                        </div>
                         {/* Avalanche */}
                        <div className="rounded-lg border p-4 space-y-3">
                             <div className="flex items-center gap-3">
                                <Mountain className="h-8 w-8 text-green-500" />
                                <div>
                                    <h3 className="text-lg font-semibold">{strategy.avalanche.name}</h3>
                                    <p className="text-sm text-muted-foreground">Enfoque en el ahorro</p>
                                </div>
                             </div>
                             <p className="text-xs">{strategy.avalanche.description}</p>
                              <Separator />
                             <h4 className="font-semibold">Plan de Acción:</h4>
                              <ol className="list-decimal list-inside space-y-2 text-sm">
                                {strategy.avalanche.plan.map((step, index) => (
                                    <li key={index}>
                                        <span className="font-semibold">{step.creditorName}</span>: <span className="text-muted-foreground">{step.reason}</span>
                                    </li>
                                ))}
                             </ol>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
