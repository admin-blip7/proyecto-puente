export const TIENDA_MARGIN_RATE = 0.15
export const TIENDA_DEFAULT_SOCIO_MARGIN_PERCENT = TIENDA_MARGIN_RATE * 100
export const TIENDA_SOCIO_PACKAGE_QTY = 5
export const TIENDA_FREE_SHIPPING_THRESHOLD = 15000
export const TIENDA_SHIPPING_FLAT_RATE = 150

const roundToCurrency = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function calculateRegularUnitPrice(
  cost: number | null | undefined,
  fallbackPrice = 0,
  marginPercent: number = TIENDA_DEFAULT_SOCIO_MARGIN_PERCENT,
): number {
  const normalizedMarginPercent = Number.isFinite(marginPercent) && marginPercent >= 0
    ? marginPercent
    : TIENDA_DEFAULT_SOCIO_MARGIN_PERCENT
  const marginRate = normalizedMarginPercent / 100

  if (typeof cost === 'number' && Number.isFinite(cost) && cost > 0) {
    return roundToCurrency(cost * (1 + marginRate))
  }

  if (typeof fallbackPrice === 'number' && Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return roundToCurrency(fallbackPrice)
  }

  return 0
}

export function calculateSocioUnitPrice(regularUnitPrice: number): number {
  return roundToCurrency(regularUnitPrice)
}

export function isSocioPackageQuantity(quantity: number): boolean {
  return quantity === TIENDA_SOCIO_PACKAGE_QTY
}

export interface TiendaLinePricing {
  regularUnitPrice: number
  socioUnitPrice: number
  effectiveUnitPrice: number
  quantity: number
  isSocioApplied: boolean
  regularLineTotal: number
  finalLineTotal: number
  lineSavings: number
}

export function calculateTiendaLinePricing(
  regularUnitPrice: number,
  quantity: number,
  socioUnitPriceOverride?: number,
): TiendaLinePricing {
  const normalizedQty = Number.isFinite(quantity) && quantity > 0 ? Math.floor(quantity) : 0
  const safeRegularUnit = Number.isFinite(regularUnitPrice) && regularUnitPrice > 0 ? regularUnitPrice : 0
  const hasSocioOverride = typeof socioUnitPriceOverride === 'number' && Number.isFinite(socioUnitPriceOverride) && socioUnitPriceOverride > 0
  const socioUnitPrice = hasSocioOverride
    ? roundToCurrency(socioUnitPriceOverride)
    : calculateSocioUnitPrice(safeRegularUnit)
  const isSocioApplied = isSocioPackageQuantity(normalizedQty)
  const effectiveUnitPrice = isSocioApplied ? socioUnitPrice : safeRegularUnit

  const regularLineTotal = roundToCurrency(safeRegularUnit * normalizedQty)
  const finalLineTotal = roundToCurrency(effectiveUnitPrice * normalizedQty)
  const lineSavings = roundToCurrency(regularLineTotal - finalLineTotal)

  return {
    regularUnitPrice: safeRegularUnit,
    socioUnitPrice,
    effectiveUnitPrice,
    quantity: normalizedQty,
    isSocioApplied,
    regularLineTotal,
    finalLineTotal,
    lineSavings,
  }
}

export function qualifiesForFreeShipping(subtotal: number): boolean {
  return subtotal > TIENDA_FREE_SHIPPING_THRESHOLD
}
