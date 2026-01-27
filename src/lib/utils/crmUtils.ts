import { CRMClient, IdentificationType, ClientType, CRMClientStatus } from "@/types";
import { getCRMClientByIdentification, createCRMClient, updateCRMClient, addSaleInteraction, getCRMClientByPhone, getCRMClientByName } from "@/lib/services/crmService";
import { v4 as uuidv4 } from "uuid";

/**
 * Busca un cliente por identificación o lo crea si no existe
 * Search priority:
 * 1. By phone number (if provided)
 * 2. By identification number
 * 3. By name (exact match, case insensitive)
 * 4. Create new if none found
 */
export const findOrCreateClient = async (
    identificationType: IdentificationType,
    identificationNumber: string,
    clientData: {
        firstName: string;
        lastName: string;
        phone?: string;
        email?: string;
        company?: string;
    }
): Promise<CRMClient> => {
    try {
        let existingClient: CRMClient | null = null;

        // 1. First, try to find by phone (most reliable for returning customers)
        if (clientData.phone) {
            existingClient = await getCRMClientByPhone(clientData.phone);
            if (existingClient) {
                console.log(`Found existing client by phone: ${existingClient.id}`);
            }
        }

        // 2. If not found by phone, try by identification number (skip temp IDs)
        if (!existingClient && identificationNumber && !identificationNumber.startsWith('temp-') && !identificationNumber.startsWith('TEMP-')) {
            existingClient = await getCRMClientByIdentification(identificationType, identificationNumber);
            if (existingClient) {
                console.log(`Found existing client by identification: ${existingClient.id}`);
            }
        }

        // 3. If still not found, try by name
        if (!existingClient && clientData.firstName && clientData.lastName && clientData.lastName !== 'Sin Apellido') {
            existingClient = await getCRMClientByName(clientData.firstName, clientData.lastName);
            if (existingClient) {
                console.log(`Found existing client by name: ${existingClient.id}`);
            }
        }

        if (existingClient) {
            // Update with new information if available
            const needsUpdate =
                (!existingClient.phone && clientData.phone) ||
                (!existingClient.email && clientData.email) ||
                (!existingClient.companyName && clientData.company) ||
                // Update identification if current one is temporary
                (existingClient.identificationNumber?.startsWith('temp-') && identificationNumber && !identificationNumber.startsWith('temp-'));

            if (needsUpdate) {
                const updates: any = {};
                if (!existingClient.phone && clientData.phone) updates.phone = clientData.phone;
                if (!existingClient.email && clientData.email) updates.email = clientData.email;
                if (!existingClient.companyName && clientData.company) updates.companyName = clientData.company;
                // Update temp identification with real one
                if (existingClient.identificationNumber?.startsWith('temp-') && identificationNumber && !identificationNumber.startsWith('temp-')) {
                    updates.identificationNumber = identificationNumber;
                    updates.identificationType = identificationType;
                }

                existingClient = await updateCRMClient(existingClient.id, updates);
                console.log(`Updated existing client ${existingClient.id} with new info`);
            }

            return existingClient;
        } else {
            // Create new client - use phone as identification if no real ID provided
            const finalIdentificationNumber = (!identificationNumber || identificationNumber.startsWith('temp-') || identificationNumber.startsWith('TEMP-'))
                ? (clientData.phone || `temp-${Date.now()}`)
                : identificationNumber;

            const newClient = await createCRMClient({
                identificationType,
                identificationNumber: finalIdentificationNumber,
                firstName: clientData.firstName,
                lastName: clientData.lastName,
                phone: clientData.phone || undefined,
                email: clientData.email || undefined,
                companyName: clientData.company || undefined,
                registrationDate: new Date(),
                clientType: "particular" as ClientType,
                clientStatus: "active" as CRMClientStatus,
                creditLimit: 0,
                tags: [],
                notes: "Cliente creado automáticamente desde venta",
            });

            console.log(`Created new CRM client: ${newClient.id}`);
            return newClient;
        }
    } catch (error) {
        console.error("Error in findOrCreateClient:", error);
        throw error;
    }
};

/**
 * Extrae información de identificación de un texto (nombre, cédula, etc.)
 */
export const parseCustomerInfo = (customerInfo: {
    name?: string | null;
    phone?: string | null;
}): {
    firstName: string;
    lastName: string;
    identificationType: IdentificationType;
    identificationNumber: string;
    phone?: string;
} => {
    const fullName = customerInfo.name?.trim() || "Cliente";
    const phone = customerInfo.phone?.trim();

    // Extraer nombre y apellido
    const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
    const firstName = nameParts[0] || "Cliente";
    const lastName = nameParts.slice(1).join(" ") || "Sin Apellido";

    // Extraer posible cédula del nombre o teléfono
    let identificationNumber = "";
    let identificationType: IdentificationType = "cedula";

    // Buscar patrones de cédula en el nombre
    const cedulaPattern = /\b(\d{10})\b/;
    const cedulaMatch = fullName.match(cedulaPattern);
    if (cedulaMatch) {
        identificationNumber = cedulaMatch[1];
    }

    // Si no hay cédula, usar el teléfono como identificador temporal
    if (!identificationNumber && phone) {
        const phonePattern = /\b(\d{10})\b/;
        const phoneMatch = phone.match(phonePattern);
        if (phoneMatch) {
            identificationNumber = phoneMatch[1];
        }
    }

    // Si todavía no hay identificación, generar un ID temporal
    if (!identificationNumber) {
        identificationNumber = `TEMP-${uuidv4().substring(0, 8).toUpperCase()}`;
        identificationType = "cedula";
    }

    return {
        firstName,
        lastName,
        identificationType,
        identificationNumber,
        phone: phone || undefined
    };
};

/**
 * Registra una venta en el historial del cliente CRM
 */
export const registerSaleInCRM = async (
    saleId: string,
    amount: number,
    customerInfo: {
        name?: string | null;
        phone?: string | null;
    }
): Promise<void> => {
    try {
        if (!customerInfo.name && !customerInfo.phone) {
            // No hay información del cliente, no registrar en CRM
            return;
        }

        // Parsear información del cliente
        const parsedInfo = parseCustomerInfo(customerInfo);

        // Buscar o crear cliente
        const client = await findOrCreateClient(
            parsedInfo.identificationType,
            parsedInfo.identificationNumber,
            {
                firstName: parsedInfo.firstName,
                lastName: parsedInfo.lastName,
                phone: parsedInfo.phone
            }
        );

        // Registrar la interacción de venta
        await addSaleInteraction(
            client.id,
            saleId,
            amount,
            `Venta #${saleId} por $${amount.toFixed(2)}`
        );

        console.log(`Sale ${saleId} registered in CRM for client ${client.id}`);
    } catch (error) {
        console.error("Error registering sale in CRM:", error);
        // No lanzar error para no interrumpir el flujo de venta
    }
};

/**
 * Registra una reparación en el historial del cliente CRM
 */
export const registerRepairInCRM = async (
    repairId: string,
    customerInfo: {
        name: string;
        phone: string;
        deviceBrand: string;
        deviceModel: string;
        reportedIssue: string;
    }
): Promise<void> => {
    try {
        // Parsear información del cliente
        const parsedInfo = parseCustomerInfo(customerInfo);

        // Buscar o crear cliente
        const client = await findOrCreateClient(
            parsedInfo.identificationType,
            parsedInfo.identificationNumber,
            {
                firstName: parsedInfo.firstName,
                lastName: parsedInfo.lastName,
                phone: parsedInfo.phone
            }
        );

        // Registrar la interacción de reparación
        const { addRepairInteraction } = await import("@/lib/services/crmService");
        await addRepairInteraction(
            client.id,
            repairId,
            `Reparación de ${customerInfo.deviceBrand} ${customerInfo.deviceModel}: ${customerInfo.reportedIssue}`
        );

        console.log(`Repair ${repairId} registered in CRM for client ${client.id}`);
    } catch (error) {
        console.error("Error registering repair in CRM:", error);
        // No lanzar error para no interrumpir el flujo de reparación
    }
};