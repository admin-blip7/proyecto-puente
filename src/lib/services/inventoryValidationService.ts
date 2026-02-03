import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";

const log = getLogger("inventoryValidationService");

export interface InventoryValidationResult {
  isValid: boolean;
  issues: InventoryIssue[];
  summary: {
    totalProducts: number;
    productsWithIssues: number;
    totalDiscrepancy: number;
  };
}

export interface InventoryIssue {
  productId: string;
  productName: string;
  type: 'negative_stock' | 'log_mismatch' | 'duplicate_logs' | 'missing_logs';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  currentValue?: number;
  expectedValue?: number;
  discrepancy?: number;
  details?: any;
}

export class InventoryValidationService {

  // Validación completa del inventario
  static async validateInventory(): Promise<InventoryValidationResult> {
    log.info("🔍 INICIANDO VALIDACIÓN COMPLETA DE INVENTARIO");

    const issues: InventoryIssue[] = [];
    const supabase = getSupabaseServerClient();

    try {
      // 1. Obtener todos los productos
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, stock, sku, cost, ownershipType")
        .eq("type", "Venta");

      if (productsError) {
        log.error("Error obteniendo productos:", productsError);
        throw productsError;
      }

      log.info(`✅ Obtenidos ${products.length} productos para validación`);

      // 2. Validar stock negativo
      const negativeStockIssues = await this.validateNegativeStock(products);
      issues.push(...negativeStockIssues);

      // 3. Validar consistencia de logs
      const logMismatchIssues = await this.validateLogConsistency(products);
      issues.push(...logMismatchIssues);

      // 4. Validar logs duplicados recientes
      const duplicateLogIssues = await this.validateDuplicateLogs();
      issues.push(...duplicateLogIssues);

      // 5. Calcular resumen
      const summary = {
        totalProducts: products.length,
        productsWithIssues: new Set(issues.map(i => i.productId)).size,
        totalDiscrepancy: issues.reduce((sum, issue) => sum + (issue.discrepancy || 0), 0)
      };

      log.info(`📊 VALIDACIÓN COMPLETADA: ${issues.length} problemas encontrados`);

      return {
        isValid: issues.length === 0,
        issues,
        summary
      };

    } catch (error) {
      log.error("Error en validación de inventario:", error);
      throw error;
    }
  }

  // Validar stock negativo
  private static async validateNegativeStock(products: any[]): Promise<InventoryIssue[]> {
    log.info("🔍 Validando stock negativo...");
    const issues: InventoryIssue[] = [];

    products.forEach(product => {
      const stock = Number(product.stock || 0);
      if (stock < 0) {
        issues.push({
          productId: product.id,
          productName: product.name,
          type: 'negative_stock',
          severity: 'critical',
          description: `Stock negativo: ${stock} unidades`,
          currentValue: stock,
          expectedValue: 0,
          discrepancy: Math.abs(stock),
          details: {
            sku: product.sku,
            cost: product.cost,
            ownershipType: product.ownershipType
          }
        });
      }
    });

    log.info(`📊 Encontrados ${issues.length} productos con stock negativo`);
    return issues;
  }

  // Validar consistencia de logs
  private static async validateLogConsistency(products: any[]): Promise<InventoryIssue[]> {
    log.info("🔍 Validando consistencia de logs...");
    const issues: InventoryIssue[] = [];
    const supabase = getSupabaseServerClient();

    for (const product of products) {
      try {
        // Obtener logs de inventario para este producto
        const { data: logs, error: logsError } = await supabase
          .from("inventory_logs")
          .select("*")
          .eq("productId", product.id)
          .order("createdAt", { ascending: false });

        if (logsError) {
          log.warn(`Error obteniendo logs para producto ${product.name}:`, logsError);
          continue;
        }

        if (!logs || logs.length === 0) continue;

        // Calcular cambio total desde logs
        const totalChange = logs.reduce((sum, log) => sum + log.change, 0);

        // Obtener stock inicial (primera venta) y calcular stock esperado
        const stockFromLogs = this.calculateExpectedStock(logs);
        const currentStock = Number(product.stock || 0);
        const discrepancy = currentStock - stockFromLogs;

        // Si hay discrepancia significativa
        if (Math.abs(discrepancy) > 1) {
          issues.push({
            productId: product.id,
            productName: product.name,
            type: 'log_mismatch',
            severity: Math.abs(discrepancy) > 10 ? 'high' : 'medium',
            description: `Discrepancia entre stock actual (${currentStock}) y calculado desde logs (${stockFromLogs})`,
            currentValue: currentStock,
            expectedValue: stockFromLogs,
            discrepancy: Math.abs(discrepancy),
            details: {
              totalLogs: logs.length,
              totalChange,
              lastLogDate: logs[0]?.createdAt
            }
          });
        }

      } catch (error) {
        log.warn(`Error validando producto ${product.name}:`, error);
      }
    }

    log.info(`📊 Encontradas ${issues.length} inconsistencias de logs`);
    return issues;
  }

  // Validar logs duplicados recientes
  private static async validateDuplicateLogs(): Promise<InventoryIssue[]> {
    log.info("🔍 Validando logs duplicados recientes...");
    const issues: InventoryIssue[] = [];
    const supabase = getSupabaseServerClient();

    try {
      // Obtener logs de las últimas 24 horas
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { data: recentLogs, error: logsError } = await supabase
        .from("inventory_logs")
        .select("*")
        .eq("reason", "Venta")
        .gte("createdAt", twentyFourHoursAgo)
        .order("createdAt", { ascending: false });

      if (logsError) {
        log.error("Error obteniendo logs recientes:", logsError);
        return issues;
      }

      // Agrupar por saleId y productId
      const logsBySaleProduct: Record<string, any[]> = {};

      recentLogs.forEach(log => {
        const saleId = log.metadata?.saleId;
        const productId = log.productId;

        if (saleId && productId) {
          const key = `${saleId}-${productId}`;
          if (!logsBySaleProduct[key]) {
            logsBySaleProduct[key] = [];
          }
          logsBySaleProduct[key].push(log);
        }
      });

      // Identificar duplicados
      Object.entries(logsBySaleProduct).forEach(([key, logs]) => {
        if (logs.length > 1) {
          const [saleId, productId] = key.split('-');
          const product = logs[0] as any;

          issues.push({
            productId,
            productName: product.productName,
            type: 'duplicate_logs',
            severity: logs.length > 10 ? 'critical' : 'high',
            description: `Logs duplicados para venta ${saleId}: ${logs.length} logs (debería ser 1)`,
            currentValue: logs.length,
            expectedValue: 1,
            discrepancy: logs.length - 1,
            details: {
              saleId,
              totalLogs: logs.length,
              logs: logs.map(log => ({
                id: log.id,
                createdAt: log.createdAt,
                change: log.change
              }))
            }
          });
        }
      });

      log.info(`📊 Encontrados ${issues.length} casos de logs duplicados`);

    } catch (error) {
      log.error("Error validando logs duplicados:", error);
    }

    return issues;
  }

  // Calcular stock esperado basado en logs
  private static calculateExpectedStock(logs: any[]): number {
    if (!logs || logs.length === 0) return 0;

    // Encontrar el log más antiguo para calcular stock inicial
    const sortedLogs = [...logs].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    // Calcular stock actual basado en cambios
    const totalChange = logs.reduce((sum, log) => sum + log.change, 0);

    // Asumir que el stock más reciente es el correcto
    // y calcular cuál debería ser basado en los cambios
    const mostRecentLog = sortedLogs[sortedLogs.length - 1];
    const estimatedCurrentStock = totalChange;

    return estimatedCurrentStock;
  }

  // Corregir automáticamente problemas simples
  static async autoFixIssues(issues: InventoryIssue[]): Promise<{
    fixed: number;
    failed: number;
    details: string[];
  }> {
    log.info(`🔧 INICIANDO CORRECCIÓN AUTOMÁTICA DE ${issues.length} PROBLEMAS`);

    const details: string[] = [];
    let fixed = 0;
    let failed = 0;

    for (const issue of issues) {
      try {
        switch (issue.type) {
          case 'negative_stock':
            const result = await this.fixNegativeStock(issue);
            if (result.success) {
              fixed++;
              details.push(`✅ Stock negativo corregido: ${issue.productName} (${issue.currentValue} → 0)`);
            } else {
              failed++;
              details.push(`❌ Error corrigiendo stock negativo: ${issue.productName} - ${result.error}`);
            }
            break;

          case 'duplicate_logs':
            // No corregir duplicados automáticamente por seguridad
            details.push(`⚠️ Logs duplicados requieren corrección manual: ${issue.productName}`);
            break;

          default:
            details.push(`ℹ️ Tipo de problema ${issue.type} requiere corrección manual`);
        }
      } catch (error) {
        failed++;
        details.push(`❌ Error corrigiendo ${issue.productName}: ${(error as Error).message}`);
      }
    }

    log.info(`📊 CORRECCIÓN COMPLETADA: ${fixed} arreglados, ${failed} fallidos`);

    return { fixed, failed, details };
  }

  // Corregir stock negativo
  private static async fixNegativeStock(issue: InventoryIssue): Promise<{
    success: boolean;
    error?: string;
  }> {
    const supabase = getSupabaseServerClient();

    try {
      const { error } = await supabase
        .from("products")
        .update({ stock: 0 })
        .eq("id", issue.productId);

      if (error) {
        return { success: false, error: (error as Error).message };
      }

      // Registrar corrección
      await supabase.from("inventory_logs").insert({
        productId: issue.productId,
        productName: issue.productName,
        change: Math.abs(issue.currentValue || 0),
        reason: "Corrección Automática",
        updatedBy: "system",
        createdAt: new Date().toISOString(),
        metadata: {
          originalStock: issue.currentValue,
          correctionType: "negative_stock_fix",
          severity: issue.severity
        }
      });

      return { success: true };

    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  // Generar reporte de validación
  static generateValidationReport(result: InventoryValidationResult): string {
    const { isValid, issues, summary } = result;

    let report = `# REPORTE DE VALIDACIÓN DE INVENTARIO\n\n`;
    report += `**Fecha:** ${new Date().toLocaleString()}\n`;
    report += `**Estado:** ${isValid ? '✅ VÁLIDO' : '❌ PROBLEMAS DETECTADOS'}\n\n`;

    report += `## Resumen\n`;
    report += `- Total productos: ${summary.totalProducts}\n`;
    report += `- Productos con problemas: ${summary.productsWithIssues}\n`;
    report += `- Discrepancia total: ${summary.totalDiscrepancy} unidades\n\n`;

    if (issues.length > 0) {
      report += `## Problemas Detectados\n\n`;

      // Agrupar por severidad
      const bySeverity = issues.reduce((acc, issue) => {
        if (!acc[issue.severity]) acc[issue.severity] = [];
        acc[issue.severity].push(issue);
        return acc;
      }, {} as Record<string, InventoryIssue[]>);

      Object.entries(bySeverity).forEach(([severity, severityIssues]) => {
        const icon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '⚡' : 'ℹ️';
        report += `### ${icon} ${severity.toUpperCase()} (${severityIssues.length})\n\n`;

        severityIssues.forEach(issue => {
          report += `- **${issue.productName}**\n`;
          report += `  - ${issue.description}\n`;
          if (issue.discrepancy) {
            report += `  - Discrepancia: ${issue.discrepancy} unidades\n`;
          }
          report += `\n`;
        });
      });
    }

    report += `## Recomendaciones\n\n`;

    if (!isValid) {
      report += `- Ejecutar corrección de datos inmediatamente\n`;
      report += `- Revisar procesos de venta para identificar causa raíz\n`;
      report += `- Implementar monitoreo continuo\n`;
    } else {
      report += `- Mantener monitoreo regular\n`;
      report += `- Considerar validaciones automáticas periódicas\n`;
    }

    return report;
  }
}