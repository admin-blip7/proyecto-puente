"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Ruler } from "lucide-react";
import { Product } from "@/types";
import { getProducts } from "@/lib/services/productService";
import { useToast } from "@/hooks/use-toast";

interface CompatibilityCheckResult {
  isCompatible: boolean;
  reason: string;
  details: {
    widthOk: boolean;
    heightOk: boolean;
    cornerOk: boolean;
    notchOk: boolean;
    protectorWidth: number;
    protectorHeight: number;
    phoneWidth: number;
    phoneHeight: number;
    protectorCorner?: number;
    phoneCorner?: number;
    protectorNotch?: string;
    phoneNotch?: string;
  };
}

export default function CompatibilityChecker() {
  const [protectors, setProtectors] = useState<Product[]>([]);
  const [selectedProtector, setSelectedProtector] = useState<string>("");
  const [phoneModel, setPhoneModel] = useState<string>("");
  const [phoneWidth, setPhoneWidth] = useState<string>("");
  const [phoneHeight, setPhoneHeight] = useState<string>("");
  const [phoneCornerRadius, setPhoneCornerRadius] = useState<string>("");
  const [phoneNotchType, setPhoneNotchType] = useState<string>("");
  const [result, setResult] = useState<CompatibilityCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedResults, setSavedResults] = useState<Array<{
    model: string;
    protectorName: string;
    compatible: boolean;
  }>>([]);

  const { toast } = useToast();

  useEffect(() => {
    loadProtectors();
  }, []);

  const loadProtectors = async () => {
    try {
      const products = await getProducts();
      const protectorProducts = products.filter(p => 
        p.name.toLowerCase().includes("película") || 
        p.name.toLowerCase().includes("protector") ||
        p.name.toLowerCase().includes("vidrio") ||
        p.name.toLowerCase().includes("screen")
      );
      setProtectors(protectorProducts);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los protectores",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheck = async () => {
    if (!selectedProtector || !phoneModel || !phoneWidth || !phoneHeight) {
      toast({
        title: "Campos requeridos",
        description: "Seleccione un protector e ingrese el modelo y las dimensiones del teléfono",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    try {
      const protector = protectors.find(p => p.id === selectedProtector);
      if (!protector) return;

      // Manual compatibility check
      const phoneData = {
        width: parseFloat(phoneWidth),
        height: parseFloat(phoneHeight),
        cornerRadius: phoneCornerRadius ? parseFloat(phoneCornerRadius) : undefined,
        notchType: phoneNotchType || undefined
      };

      // Check if dimensions are available
       if (!protector.screenWidth || !protector.screenHeight) {
         toast({
           title: "Error",
           description: "Este protector no tiene dimensiones registradas",
           variant: "destructive",
         });
         return;
       }

       const widthOk = protector.screenWidth <= phoneData.width;
       const heightOk = protector.screenHeight <= phoneData.height;
       let cornerOk = true;
       let notchOk = true;

       // Check corner radius if both have it
       if (protector.cornerRadius && phoneData.cornerRadius) {
         cornerOk = protector.cornerRadius <= phoneData.cornerRadius;
       }

       // Check notch compatibility
       if (protector.notchType && phoneData.notchType) {
         notchOk = protector.notchType === phoneData.notchType ||
                   protector.notchType === "none" ||
                   (protector.notchType === "notch" && phoneData.notchType === "dynamic-island");
       }

       const isCompatible = widthOk && heightOk && cornerOk && notchOk;

       let reason = isCompatible ? "Compatible" : "No Compatible";
       if (!widthOk) reason += " - Protector más ancho que la pantalla";
       if (!heightOk) reason += " - Protector más alto que la pantalla";
       if (!cornerOk) reason += " - Radio de esquinas muy grande";
       if (!notchOk) reason += " - Tipo de notch incompatible";

       const compatibilityResult: CompatibilityCheckResult = {
         isCompatible,
         reason,
         details: {
           widthOk,
           heightOk,
           cornerOk,
           notchOk,
           protectorWidth: protector.screenWidth,
           protectorHeight: protector.screenHeight,
           phoneWidth: phoneData.width,
           phoneHeight: phoneData.height,
           protectorCorner: protector.cornerRadius,
           phoneCorner: phoneData.cornerRadius,
           protectorNotch: protector.notchType,
           phoneNotch: phoneData.notchType,
         },
       };
      
      setResult(compatibilityResult);

      // Save to results list
      if (compatibilityResult) {
        const isCompatible = compatibilityResult.isCompatible;
        setSavedResults(prev => {
          const existing = prev.findIndex(r => r.model === phoneModel && r.protectorName === protector.name);
          if (existing > -1) {
            const updated = [...prev];
            updated[existing] = {
              model: phoneModel,
              protectorName: protector.name,
              compatible: isCompatible
            };
            return updated;
          } else {
            return [...prev, {
              model: phoneModel,
              protectorName: protector.name,
              compatible: isCompatible
            }];
          }
        });

        toast({
          title: "Verificación completada",
          description: `Compatibilidad para ${phoneModel} guardada en la lista`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo verificar la compatibilidad",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const selectedProtectorProduct = protectors.find(p => p.id === selectedProtector);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Ruler className="w-6 h-6" />
        <h1 className="text-3xl font-bold">Verificador de Compatibilidad</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verificar Compatibilidad de Protector de Pantalla</CardTitle>
          <CardDescription>
            Compare las dimensiones de un protector de pantalla con las de un teléfono para verificar si son compatibles
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Protector Selection */}
          <div className="space-y-2">
            <Label htmlFor="protector">Protector de Pantalla</Label>
            <Select value={selectedProtector} onValueChange={setSelectedProtector}>
              <SelectTrigger id="protector">
                <SelectValue placeholder="Seleccione un protector" />
              </SelectTrigger>
              <SelectContent>
                {protectors.map((protector) => (
                  <SelectItem key={protector.id} value={protector.id}>
                    {protector.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProtectorProduct && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Dimensiones:</strong>{" "}
                  {selectedProtectorProduct.screenWidth && selectedProtectorProduct.screenHeight
                    ? `${selectedProtectorProduct.screenWidth} x ${selectedProtectorProduct.screenHeight} cm`
                    : "⚠ Este protector no tiene dimensiones registradas"
                  }
                </p>
              </div>
            )}
          </div>

          {/* Phone Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model">Modelo del Teléfono</Label>
              <Input
                id="model"
                value={phoneModel}
                onChange={(e) => setPhoneModel(e.target.value)}
                placeholder="Ej: iPhone 14 Pro"
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium mb-3">Dimensiones del Teléfono (cm):</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="width">Ancho</Label>
                  <Input
                    id="width"
                    type="number"
                    step="0.1"
                    value={phoneWidth}
                    onChange={(e) => setPhoneWidth(e.target.value)}
                    placeholder="7.15"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Alto</Label>
                  <Input
                    id="height"
                    type="number"
                    step="0.1"
                    value={phoneHeight}
                    onChange={(e) => setPhoneHeight(e.target.value)}
                    placeholder="14.75"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="corner">Radio de Esquinas (mm)</Label>
                <Input
                  id="corner"
                  type="number"
                  step="0.1"
                  value={phoneCornerRadius}
                  onChange={(e) => setPhoneCornerRadius(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notch">Tipo de Notch</Label>
                <Select value={phoneNotchType} onValueChange={setPhoneNotchType}>
                  <SelectTrigger id="notch">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin notch</SelectItem>
                    <SelectItem value="teardrop">Gota</SelectItem>
                    <SelectItem value="punch-hole">Perforación</SelectItem>
                    <SelectItem value="wide">Notch ancho</SelectItem>
                    <SelectItem value="dynamic-island">Dynamic Island</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Button 
            onClick={handleCheck} 
            disabled={checking || !selectedProtector || !phoneModel || !phoneWidth || !phoneHeight}
            className="w-full"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verificando...
              </>
            ) : (
              "Verificar Compatibilidad"
            )}
          </Button>

          {/* Results */}
          {result && (
            <Alert className={result.isCompatible ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center gap-2">
                {result.isCompatible ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className="font-medium">
                  {result.isCompatible ? "✅ Compatible" : "❌ No Compatible"}
                </AlertDescription>
              </div>
              
              {result.details && (
                <div className="mt-3 space-y-2">
                  <Card className="p-3">
                    <CardTitle className="text-sm">Detalles de la Comparación</CardTitle>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium mb-2">Protector ({selectedProtectorProduct?.name}):</p>
                          <p>• Ancho: {result.details.protectorWidth}cm</p>
                          <p>• Alto: {result.details.protectorHeight}cm</p>
                        </div>
                        <div>
                          <p className="font-medium mb-2">Teléfono ({phoneModel}):</p>
                          <p>• Ancho: {result.details.phoneWidth}cm</p>
                          <p>• Alto: {result.details.phoneHeight}cm</p>
                        </div>
                      </div>
                      
                      {result.details.protectorCorner && result.details.phoneCorner && (
                        <div className="pt-2 border-t">
                          <p className="text-xs">
                            <strong>Radio de esquinas:</strong>
                            {" "}Protector {result.details.protectorCorner}mm vs Teléfono {result.details.phoneCorner}mm
                          </p>
                        </div>
                      )}
                      
                      {result.details.protectorNotch && result.details.phoneNotch && (
                        <div className="pt-1">
                          <p className="text-xs">
                            <strong>Tipo de notch:</strong>
                            {" "}Protector {result.details.protectorNotch} vs Teléfono {result.details.phoneNotch}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Saved Results */}
      {savedResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Verificaciones Guardadas</CardTitle>
            <CardDescription>
              Historial de compatibilidades verificadas en esta sesión
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedResults.map((saved, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{saved.model}</p>
                    <p className="text-sm text-muted-foreground">{saved.protectorName}</p>
                  </div>
                  <Badge variant={saved.compatible ? "default" : "destructive"}>
                    {saved.compatible ? "Compatible" : "No Compatible"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {savedResults.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No hay verificaciones guardadas aún</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}