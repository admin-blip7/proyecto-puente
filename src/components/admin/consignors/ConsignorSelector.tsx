"use client";

import { useState, useEffect } from "react";
import { Consignor } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, BarChart3, User } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConsignorSelectorProps {
  consignors: Consignor[];
}

export default function ConsignorSelector({ consignors }: ConsignorSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedConsignor, setSelectedConsignor] = useState<string>("");
  const [filteredConsignors, setFilteredConsignors] = useState<Consignor[]>(consignors);
  const router = useRouter();

  useEffect(() => {
    const filtered = consignors.filter(consignor =>
      consignor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consignor.contactInfo.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredConsignors(filtered);
  }, [searchTerm, consignors]);

  const handleViewReport = () => {
    if (selectedConsignor) {
      router.push(`/admin/consignors/${selectedConsignor}/sales-report`);
    }
  };

  const handleConsignorSelect = (consignorId: string) => {
    setSelectedConsignor(consignorId);
  };

  const selectedConsignorData = consignors.find(c => c.id === selectedConsignor);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reporte de Ventas por Consignador
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Buscar Consignador
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="search"
              placeholder="Buscar por nombre o información de contacto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="consignor-select" className="text-sm font-medium">
            Seleccionar Consignador
          </label>
          <Select value={selectedConsignor} onValueChange={handleConsignorSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un consignador..." />
            </SelectTrigger>
            <SelectContent>
              {filteredConsignors.map((consignor, index) => {
                // Create a unique key combining index and name to avoid duplicates
                const uniqueKey = `${consignor.name}-${consignor.contactInfo}-${index}`;
                return (
                  <SelectItem key={uniqueKey} value={consignor.id}>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <div>
                        <div className="font-medium">{consignor.name}</div>
                        <div className="text-sm text-gray-500">{consignor.contactInfo}</div>
                      </div>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {selectedConsignorData && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Consignador Seleccionado:</h3>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">Nombre:</span> {selectedConsignorData.name}</p>
              <p><span className="font-medium">Contacto:</span> {selectedConsignorData.contactInfo}</p>
              <p><span className="font-medium">Saldo Pendiente:</span> ${selectedConsignorData.balanceDue.toFixed(2)}</p>
            </div>
          </div>
        )}

        <Button 
          onClick={handleViewReport} 
          disabled={!selectedConsignor}
          className="w-full"
        >
          <BarChart3 className="mr-2 h-4 w-4" />
          Ver Reporte de Ventas
        </Button>
      </CardContent>
    </Card>
  );
}