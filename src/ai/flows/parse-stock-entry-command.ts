export async function parseStockEntryCommand(params: { command: string }) {
    console.log("Mock parseStockEntryCommand called with:", params);
    // Return a dummy result or simple parsed result
    return {
        productName: "Producto Desconocido",
        quantity: 1
    };
}
