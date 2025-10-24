import { v4 as uuidv4 } from "uuid";
import {
    CRMClient,
    CRMInteraction,
    CRMTag,
    CRMTask,
    CRMDocument,
    CRMClientStats,
    IdentificationType,
    ClientType,
    CRMClientStatus,
    InteractionType,
    TaskStatus,
    TaskPriority,
    DocumentType
} from "@/types";
import { getSupabaseClientWithAuth, isAuthenticated } from "@/lib/supabaseClientWithAuth"; // Cliente de Supabase mejorado con autenticación
import { toDate, nowIso } from "@/lib/supabase/utils";
import { getLogger } from "@/lib/logger";

const log = getLogger("crmClientService");

// Table names
const CRM_CLIENTS_TABLE = "crm_clients";
const CRM_INTERACTIONS_TABLE = "crm_interactions";
const CRM_TAGS_TABLE = "crm_tags";
const CRM_TASKS_TABLE = "crm_tasks";
const CRM_DOCUMENTS_TABLE = "crm_documents";

// Mapping functions
const mapCRMClient = (row: any): CRMClient => ({
    id: row?.firestore_id ?? row?.id ?? "",
    firestore_id: row?.firestore_id ?? row?.id ?? "",
    _dbId: row?.id ? (typeof row.id === 'number' ? row.id : parseInt(row.id)) : undefined,
    clientCode: row?.client_code ?? row?.clientcode ?? row?.clientCode ?? "",
    identificationType: (row?.identification_type ?? row?.identificationtype ?? row?.identificationType ?? "cedula") as IdentificationType,
    identificationNumber: row?.identification_number ?? row?.identificationnumber ?? row?.identificationNumber ?? "",
    firstName: row?.first_name ?? row?.firstname ?? row?.firstName ?? "",
    lastName: row?.last_name ?? row?.lastname ?? row?.lastName ?? "",
    companyName: row?.company_name ?? row?.companyname ?? row?.companyName ?? undefined,
    email: row?.email ?? undefined,
    phone: row?.phone ?? undefined,
    secondaryPhone: row?.secondary_phone ?? row?.secondaryphone ?? row?.secondaryPhone ?? undefined,
    address: row?.address ?? undefined,
    city: row?.city ?? undefined,
    province: row?.province ?? undefined,
    clientType: (row?.client_type ?? row?.clienttype ?? row?.clientType ?? "particular") as ClientType,
    clientStatus: (row?.client_status ?? row?.clientstatus ?? row?.clientStatus ?? "active") as CRMClientStatus,
    registrationDate: toDate(row?.registration_date ?? row?.registrationdate ?? row?.registrationDate),
    lastContactDate: row?.last_contact_date || row?.lastcontactdate || row?.lastContactDate ? toDate(row?.last_contact_date ?? row?.lastcontactdate ?? row?.lastContactDate) : undefined,
    totalPurchases: Number(row?.total_purchases ?? row?.totalpurchases ?? row?.totalPurchases ?? 0),
    outstandingBalance: Number(row?.outstanding_balance ?? row?.outstandingbalance ?? row?.outstandingBalance ?? 0),
    creditLimit: Number(row?.credit_limit ?? row?.creditlimit ?? row?.creditLimit ?? 0),
    tags: row?.tags ?? [],
    notes: row?.notes ?? undefined,
    createdBy: row?.created_by ?? row?.createdby ?? row?.createdBy ?? undefined,
    createdAt: toDate(row?.created_at ?? row?.createdat ?? row?.createdAt),
    updatedAt: toDate(row?.updated_at ?? row?.updatedat ?? row?.updatedAt),
});

// Generate client code
const generateClientCode = async (): Promise<string> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }
    
    const year = new Date().getFullYear();
    const prefix = `CLI-${year}`;

    try {
        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("client_code")
            .like("client_code", `${prefix}%`)
            .order("client_code", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return `${prefix}-0001`;
        }

        const lastCode = data[0].client_code;
        const lastNumber = parseInt(lastCode.split("-")[2] || "0");
        const nextNumber = lastNumber + 1;

        return `${prefix}-${nextNumber.toString().padStart(4, "0")}`;
    } catch (error) {
        log.error("Error generating client code", error);
        return `${prefix}-${Math.floor(Math.random() * 9999).toString().padStart(4, "0")}`;
    }
};

// Client CRUD operations
export const createCRMClient = async (
    clientData: Omit<CRMClient, "id" | "firestore_id" | "clientCode" | "createdAt" | "updatedAt" | "totalPurchases" | "outstandingBalance">
): Promise<CRMClient> => {
    // Verificar autenticación
    const authenticated = await isAuthenticated();
    if (!authenticated) {
        throw new Error("User not authenticated. Cannot create client.");
    }

    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Verificar si ya existe un cliente con el mismo número de identificación o email
        if (clientData.identificationNumber) {
            const { data: existingClientByIdentification, error: checkError } = await supabase
                .from(CRM_CLIENTS_TABLE)
                .select("id")
                .eq("identification_number", clientData.identificationNumber)
                .single();
                
            if (existingClientByIdentification && !checkError) {
                throw new Error(`Ya existe un cliente con el número de identificación: ${clientData.identificationNumber}`);
            }
        }
        
        if (clientData.email) {
            const { data: existingClientByEmail, error: emailCheckError } = await supabase
                .from(CRM_CLIENTS_TABLE)
                .select("id")
                .eq("email", clientData.email)
                .single();
                
            if (existingClientByEmail && !emailCheckError) {
                throw new Error(`Ya existe un cliente con el email: ${clientData.email}`);
            }
        }

        // Obtener información del usuario actual para el campo createdby
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("User session not available. Cannot create client.");
        }
        
        const userId = session.user.id;
        log.info("Creating client for user ID:", userId);

        const clientCode = await generateClientCode();
        const firestoreId = uuidv4();
        const now = nowIso();

        const payload = {
            firestore_id: firestoreId,
            client_code: clientCode,
            identification_type: clientData.identificationType,
            identification_number: clientData.identificationNumber,
            first_name: clientData.firstName,
            last_name: clientData.lastName,
            company_name: clientData.companyName || null,
            email: clientData.email || null,
            phone: clientData.phone || null,
            secondary_phone: clientData.secondaryPhone || null,
            address: clientData.address || null,
            city: clientData.city || null,
            province: clientData.province || null,
            client_type: clientData.clientType,
            client_status: clientData.clientStatus,
            registration_date: clientData.registrationDate ? clientData.registrationDate.toISOString() : new Date().toISOString(),
            last_contact_date: clientData.lastContactDate ? clientData.lastContactDate.toISOString() : null,
            total_purchases: 0,
            outstanding_balance: 0,
            credit_limit: clientData.creditLimit || 0,
            tags: clientData.tags || [],
            notes: clientData.notes || null,
            created_by: userId,
            created_at: now,
            updated_at: now,
        };

        log.info("Attempting to insert client with payload:", JSON.stringify({
            ...payload,
            created_by: "[HIDDEN]" // Ocultar ID de usuario en logs
        }, null, 2));

        const { data, error, status, statusText } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) {
            log.error("Supabase error details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                status: status,
                statusText: statusText
            });
            throw error;
        }

        log.info("Successfully created CRM client with ID:", data?.firestore_id);
        return mapCRMClient(data);
    } catch (error: any) {
        log.error("Full error creating CRM client:", error);
        if (error.status) {
            log.error("Error status code:", error.status);
        }
        if (error.message) {
            log.error("Error message:", error.message);
        }
        throw error;
    }
};

export const getCRMClients = async (
    filters?: {
        search?: string;
        clientType?: ClientType;
        clientStatus?: CRMClientStatus;
        tags?: string[];
        limit?: number;
        offset?: number;
    }
): Promise<CRMClient[]> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        let query = supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .order("registration_date", { ascending: false });

        // Apply filters
        if (filters?.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(`
                first_name.ilike.${searchTerm},
                last_name.ilike.${searchTerm},
                company_name.ilike.${searchTerm},
                email.ilike.${searchTerm},
                phone.ilike.${searchTerm},
                identification_number.ilike.${searchTerm},
                client_code.ilike.${searchTerm}
            `);
        }

        if (filters?.clientType) {
            query = query.eq("client_type", filters.clientType);
        }

        if (filters?.clientStatus) {
            query = query.eq("client_status", filters.clientStatus);
        }

        if (filters?.tags && filters.tags.length > 0) {
            query = query.contains("tags", filters.tags);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        if (filters?.offset) {
            query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map(mapCRMClient);
    } catch (error) {
        log.error("Error getting CRM clients", error);
        return [];
    }
};

export const getCRMClientById = async (id: string): Promise<CRMClient | null> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Verificar que el usuario esté autenticado
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("User not authenticated. Cannot retrieve client.");
        }
        
        log.info("Attempting to fetch CRM client with ID:", id);

        const { data, error, status, statusText } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .eq("firestore_id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") {
                log.info("Client not found with ID:", id);
                return null;
            }
            log.error("Supabase fetch error details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                status: status,
                statusText: statusText
            });
            throw error;
        }

        log.info("Successfully retrieved CRM client with ID:", data?.firestore_id);
        return mapCRMClient(data);
    } catch (error: any) {
        log.error("Full error getting CRM client by ID:", error);
        if (error.status) {
            log.error("Error status code:", error.status);
        }
        if (error.message) {
            log.error("Error message:", error.message);
        }
        return null;
    }
};

export const getCRMClientByIdentification = async (
    identificationType: IdentificationType,
    identificationNumber: string
): Promise<CRMClient | null> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .eq("identification_type", identificationType)
            .eq("identification_number", identificationNumber)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        return mapCRMClient(data);
    } catch (error) {
        log.error("Error getting CRM client by identification", error);
        return null;
    }
};

export const updateCRMClient = async (
    id: string,
    updates: Partial<Omit<CRMClient, "id" | "firestore_id" | "clientCode" | "createdAt" | "updatedAt">>
): Promise<CRMClient> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Verificar que el usuario esté autenticado
        const authenticated = await isAuthenticated();
        if (!authenticated) {
            throw new Error("User not authenticated. Cannot update client.");
        }
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            throw new Error("User session not available. Cannot update client.");
        }

        // Verificar si se está actualizando el número de identificación o email
        if (updates.identificationNumber || updates.email) {
            // Primero, obtener el cliente actual para saber si está cambiando
            const currentClient = await getCRMClientById(id);
            
            if (currentClient) {
                // Si se está actualizando la identificación y no es la misma
                if (updates.identificationNumber && updates.identificationNumber !== currentClient.identificationNumber) {
                    const { data: existingClient, error } = await supabase
                        .from(CRM_CLIENTS_TABLE)
                        .select("id")
                        .eq("identification_number", updates.identificationNumber)
                        .single();
                        
                    if (existingClient && !error) {
                        throw new Error(`Ya existe un cliente con el número de identificación: ${updates.identificationNumber}`);
                    }
                }
                
                // Si se está actualizando el email y no es el mismo
                if (updates.email && updates.email !== currentClient.email) {
                    const { data: existingClient, error } = await supabase
                        .from(CRM_CLIENTS_TABLE)
                        .select("id")
                        .eq("email", updates.email)
                        .single();
                        
                    if (existingClient && !error) {
                        throw new Error(`Ya existe un cliente con el email: ${updates.email}`);
                    }
                }
            }
        }

        const payload: any = {
            updated_at: nowIso(),
        };

        if (updates.identificationType !== undefined) payload.identification_type = updates.identificationType;
        if (updates.identificationNumber !== undefined) payload.identification_number = updates.identificationNumber;
        if (updates.firstName !== undefined) payload.first_name = updates.firstName;
        if (updates.lastName !== undefined) payload.last_name = updates.lastName;
        if (updates.companyName !== undefined) payload.company_name = updates.companyName || null;
        if (updates.email !== undefined) payload.email = updates.email || null;
        if (updates.phone !== undefined) payload.phone = updates.phone || null;
        if (updates.secondaryPhone !== undefined) payload.secondary_phone = updates.secondaryPhone || null;
        if (updates.address !== undefined) payload.address = updates.address || null;
        if (updates.city !== undefined) payload.city = updates.city || null;
        if (updates.province !== undefined) payload.province = updates.province || null;
        if (updates.clientType !== undefined) payload.client_type = updates.clientType;
        if (updates.clientStatus !== undefined) payload.client_status = updates.clientStatus;
        if (updates.lastContactDate !== undefined) payload.last_contact_date = updates.lastContactDate ? updates.lastContactDate.toISOString() : null;
        if (updates.totalPurchases !== undefined) payload.total_purchases = updates.totalPurchases;
        if (updates.outstandingBalance !== undefined) payload.outstanding_balance = updates.outstandingBalance;
        if (updates.creditLimit !== undefined) payload.credit_limit = updates.creditLimit;
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        log.info("Attempting to update client with ID:", id);

        const { data, error, status, statusText } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .update(payload)
            .eq("firestore_id", id)
            .select()
            .single();

        if (error) {
            log.error("Supabase update error details:", {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
                status: status,
                statusText: statusText
            });
            throw error;
        }

        log.info("Successfully updated CRM client with ID:", data?.firestore_id);
        return mapCRMClient(data);
    } catch (error: any) {
        log.error("Full error updating CRM client:", error);
        if (error.status) {
            log.error("Error status code:", error.status);
        }
        if (error.message) {
            log.error("Error message:", error.message);
        }
        throw error;
    }
};

export const deleteCRMClient = async (id: string): Promise<void> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Try to delete by firestore_id first (it's unique)
        const { error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .delete()
            .eq('firestore_id', id);

        if (error) throw error;
        log.info(`Deleted CRM client with ID: ${id}`);
    } catch (error) {
        log.error("Error deleting CRM client", error);
        throw error;
    }
};

// Document operations
export const getCRMDocuments = async (clientId: string): Promise<CRMDocument[]> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Find the client database ID
        const client = await getCRMClientById(clientId);
        if (!client) return [];

        const { data, error } = await supabase
            .from(CRM_DOCUMENTS_TABLE)
            .select("*")
            .eq("client_id", client._dbId || parseInt(client.id))
            .order("upload_date", { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row?.firestore_id ?? row?.id ?? "",
            firestore_id: row?.firestore_id ?? row?.id ?? "",
            clientId: row?.clientid ?? row?.clientId ?? "",
            documentType: (row?.documenttype ?? row?.documentType ?? "other") as DocumentType,
            documentName: row?.documentname ?? row?.documentName ?? "",
            fileUrl: row?.fileurl ?? row?.fileUrl ?? "",
            fileSize: row?.filesize || row?.fileSize ? Number(row?.filesize ?? row?.fileSize) : undefined,
            mimeType: row?.mimetype ?? row?.mimeType ?? undefined,
            uploadDate: toDate(row?.uploaddate ?? row?.uploadDate),
            uploadedBy: row?.uploadedby ?? row?.uploadedBy ?? undefined,
            createdAt: toDate(row?.createdat ?? row?.createdAt),
        }));
    } catch (error) {
        log.error("Error getting CRM documents", error);
        return [];
    }
};

// Tag operations
export const getCRMTags = async (): Promise<CRMTag[]> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const { data, error } = await supabase
            .from(CRM_TAGS_TABLE)
            .select("*")
            .eq("is_active", true)
            .order("name");

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row?.firestore_id ?? row?.id ?? "",
            firestore_id: row?.firestore_id ?? row?.id ?? "",
            name: row?.name ?? "",
            color: row?.color ?? "#6B7280",
            description: row?.description ?? undefined,
            isActive: row?.isactive ?? row?.isActive ?? true,
            createdAt: toDate(row?.createdat ?? row?.createdAt),
            updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
        }));
    } catch (error) {
        log.error("Error getting CRM tags", error);
        return [];
    }
};

// Interaction operations
export const getCRMInteractions = async (
    clientId: string,
    limit: number = 50
): Promise<CRMInteraction[]> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        // Find the client database ID
        const client = await getCRMClientById(clientId);
        if (!client) return [];

        const { data, error } = await supabase
            .from(CRM_INTERACTIONS_TABLE)
            .select("*")
            .eq("client_id", client._dbId || parseInt(client.id))
            .order("interaction_date", { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row?.firestore_id ?? row?.id ?? "",
            firestore_id: row?.firestore_id ?? row?.id ?? "",
            clientId: row?.client_id ?? row?.clientId ?? "",
            interactionType: (row?.interaction_type ?? row?.interactionType ?? "contact") as InteractionType,
            relatedId: row?.related_id ?? row?.relatedId ?? undefined,
            relatedTable: row?.related_table ?? row?.relatedTable ?? undefined,
            interactionDate: toDate(row?.interaction_date ?? row?.interactionDate),
            description: row?.description ?? undefined,
            amount: row?.amount ? Number(row.amount) : undefined,
            status: row?.status ?? undefined,
            employeeId: row?.employee_id ?? row?.employeeId ?? undefined,
            metadata: row?.metadata ?? {},
            createdAt: toDate(row?.created_at ?? row?.createdAt),
            updatedAt: toDate(row?.updated_at ?? row?.updatedAt),
        }));
    } catch (error) {
        log.error("Error getting CRM interactions", error);
        return [];
    }
};

// Task operations
export const createCRMTask = async (
    taskData: Omit<CRMTask, "id" | "firestore_id" | "createdAt" | "updatedAt">
): Promise<CRMTask> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const firestoreId = uuidv4();
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(taskData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {
            firestore_id: firestoreId,
            client_id: client._dbId || parseInt(client.id),
            title: taskData.title,
            description: taskData.description || null,
            due_date: taskData.dueDate ? taskData.dueDate.toISOString() : null,
            status: taskData.status,
            priority: taskData.priority,
            assigned_to: taskData.assignedTo || null,
            completed_at: taskData.completedAt ? taskData.completedAt.toISOString() : null,
            completion_notes: taskData.completionNotes || null,
            createdat: now,
            updatedat: now,
        };

        const { data, error } = await supabase
            .from(CRM_TASKS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data?.firestore_id ?? data?.id ?? "",
            firestore_id: data?.firestore_id ?? data?.id ?? "",
            clientId: data?.clientid ?? data?.clientId ?? "",
            title: data?.title ?? "",
            description: data?.description ?? undefined,
            dueDate: data?.due_date || data?.dueDate ? toDate(data?.due_date ?? data?.dueDate) : undefined,
            status: (data?.status ?? "pending") as TaskStatus,
            priority: (data?.priority ?? "medium") as TaskPriority,
            assignedTo: data?.assigned_to ?? data?.assignedTo ?? undefined,
            completedAt: data?.completed_at || data?.completedAt ? toDate(data?.completed_at ?? data?.completedAt) : undefined,
            completionNotes: data?.completion_notes ?? data?.completionNotes ?? undefined,
            createdAt: toDate(data?.createdat ?? data?.createdAt),
            updatedAt: toDate(data?.updatedat ?? data?.updatedAt),
        };
    } catch (error) {
        log.error("Error creating CRM task", error);
        throw error;
    }
};

export const updateCRMTask = async (
    id: string,
    updates: Partial<Omit<CRMTask, "id" | "firestore_id" | "createdAt" | "updatedAt">>
): Promise<CRMTask> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const payload: any = {
            updatedat: nowIso(),
        };

        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description || null;
        if (updates.dueDate !== undefined) payload.due_date = updates.dueDate ? updates.dueDate.toISOString() : null;
        if (updates.status !== undefined) {
            payload.status = updates.status;
            if (updates.status === "completed") {
                payload.completed_at = nowIso();
            }
        }
        if (updates.priority !== undefined) payload.priority = updates.priority;
        if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo || null;
        if (updates.completionNotes !== undefined) payload.completion_notes = updates.completionNotes || null;

        const { data, error } = await supabase
            .from(CRM_TASKS_TABLE)
            .update(payload)
            .eq("firestore_id", id)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data?.firestore_id ?? data?.id ?? "",
            firestore_id: data?.firestore_id ?? data?.id ?? "",
            clientId: data?.clientid ?? data?.clientId ?? "",
            title: data?.title ?? "",
            description: data?.description ?? undefined,
            dueDate: data?.due_date || data?.dueDate ? toDate(data?.due_date ?? data?.dueDate) : undefined,
            status: (data?.status ?? "pending") as TaskStatus,
            priority: (data?.priority ?? "medium") as TaskPriority,
            assignedTo: data?.assigned_to ?? data?.assignedTo ?? undefined,
            completedAt: data?.completed_at || data?.completedAt ? toDate(data?.completed_at ?? data?.completedAt) : undefined,
            completionNotes: data?.completion_notes ?? data?.completionNotes ?? undefined,
            createdAt: toDate(data?.createdat ?? data?.createdAt),
            updatedAt: toDate(data?.updatedat ?? data?.updatedAt),
        };
    } catch (error) {
        log.error("Error updating CRM task", error);
        throw error;
    }
};

export const getCRMTasks = async (
    filters?: {
        clientId?: string;
        status?: TaskStatus;
        priority?: TaskPriority;
        assignedTo?: string;
        limit?: number;
    }
): Promise<CRMTask[]> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        let query = supabase
            .from(CRM_TASKS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (filters?.clientId) {
            const client = await getCRMClientById(filters.clientId);
            if (client) {
                query = query.eq("client_id", client._dbId || parseInt(client.id));
            } else {
                return [];
            }
        }

        if (filters?.status) {
            query = query.eq("status", filters.status);
        }

        if (filters?.priority) {
            query = query.eq("priority", filters.priority);
        }

        if (filters?.assignedTo) {
            query = query.eq("assigned_to", filters.assignedTo);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        const { data, error } = await query;

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row?.firestore_id ?? row?.id ?? "",
            firestore_id: row?.firestore_id ?? row?.id ?? "",
            clientId: row?.clientid ?? data?.clientId ?? "",
            title: row?.title ?? "",
            description: row?.description ?? undefined,
            dueDate: row?.due_date || row?.dueDate ? toDate(row?.due_date ?? row?.dueDate) : undefined,
            status: (row?.status ?? "pending") as TaskStatus,
            priority: (row?.priority ?? "medium") as TaskPriority,
            assignedTo: row?.assigned_to ?? row?.assignedTo ?? undefined,
            completedAt: row?.completed_at || row?.completedAt ? toDate(row?.completed_at ?? row?.completedAt) : undefined,
            completionNotes: row?.completion_notes ?? row?.completionNotes ?? undefined,
            createdAt: toDate(row?.createdat ?? row?.createdAt),
            updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
        }));
    } catch (error) {
        log.error("Error getting CRM tasks", error);
        return [];
    }
};

// Tag operations
export const createCRMTag = async (
    tagData: Omit<CRMTag, "id" | "firestore_id" | "createdAt" | "updatedAt" | "isActive">
): Promise<CRMTag> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const firestoreId = uuidv4();
        const now = nowIso();

        const payload = {
            firestore_id: firestoreId,
            name: tagData.name,
            color: tagData.color || "#6B7280",
            description: tagData.description || null,
            is_active: true,
            createdat: now,
            updatedat: now,
        };

        const { data, error } = await supabase
            .from(CRM_TAGS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data?.firestore_id ?? data?.id ?? "",
            firestore_id: data?.firestore_id ?? data?.id ?? "",
            name: data?.name ?? "",
            color: data?.color ?? "#6B7280",
            description: data?.description ?? undefined,
            isActive: data?.is_active ?? data?.isActive ?? true,
            createdAt: toDate(data?.createdat ?? data?.createdAt),
            updatedAt: toDate(data?.updatedat ?? data?.updatedAt),
        };
    } catch (error) {
        log.error("Error creating CRM tag", error);
        throw error;
    }
};

// Statistics
export const getCRMStats = async (): Promise<CRMClientStats> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get total clients
        const { count: totalClients } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*", { count: "exact", head: true });

        // Get active clients
        const { count: activeClients } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*", { count: "exact", head: true })
            .eq("client_status", "active");

        // Get new clients this month
        const { count: newClientsThisMonth } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*", { count: "exact", head: true })
            .gte("registration_date", firstDayOfMonth.toISOString());

        // Get total purchases
        const { data: purchasesData } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("total_purchases");

        const totalPurchases = purchasesData?.reduce((sum, client) => sum + Number(client.total_purchases || 0), 0) || 0;

        // Get top clients
        const { data: topClientsData } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .order("total_purchases", { ascending: false })
            .limit(5);

        const topClients = (topClientsData || []).map(mapCRMClient);

        // Get recent interactions
        const { data: recentInteractionsData } = await supabase
            .from(CRM_INTERACTIONS_TABLE)
            .select("*")
            .order("interaction_date", { ascending: false })
            .limit(10);

        const recentInteractions = (recentInteractionsData || []).map((row: any) => ({
            id: row?.firestore_id ?? row?.id ?? "",
            firestore_id: row?.firestore_id ?? row?.id ?? "",
            clientId: row?.client_id ?? row?.clientId ?? "",
            interactionType: (row?.interaction_type ?? row?.interactionType ?? "contact") as InteractionType,
            relatedId: row?.related_id ?? row?.relatedId ?? undefined,
            relatedTable: row?.related_table ?? row?.relatedTable ?? undefined,
            interactionDate: toDate(row?.interaction_date ?? row?.interactionDate),
            description: row?.description ?? undefined,
            amount: row?.amount ? Number(row.amount) : undefined,
            status: row?.status ?? undefined,
            employeeId: row?.employeeid ?? row?.employeeId ?? undefined,
            metadata: row?.metadata ?? {},
            createdAt: toDate(row?.createdat ?? row?.createdAt),
            updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
        }));

        return {
            totalClients: totalClients || 0,
            activeClients: activeClients || 0,
            newClientsThisMonth: newClientsThisMonth || 0,
            totalPurchases,
            averagePurchaseValue: totalClients > 0 ? totalPurchases / totalClients : 0,
            topClients,
            recentInteractions,
        };
    } catch (error) {
        log.error("Error getting CRM stats", error);
        return {
            totalClients: 0,
            activeClients: 0,
            newClientsThisMonth: 0,
            totalPurchases: 0,
            averagePurchaseValue: 0,
            topClients: [],
            recentInteractions: [],
        };
    }
};

// Search operations
export const searchCRMClients = async (query: string): Promise<CRMClient[]> => {
    return getCRMClients({ search: query, limit: 20 });
};

// Integration functions
export const addSaleInteraction = async (
    clientId: string,
    saleId: string,
    amount: number,
    description?: string
): Promise<void> => {
    await createCRMInteraction({
        clientId,
        interactionType: "sale",
        relatedId: saleId,
        relatedTable: "sales",
        interactionDate: new Date(),
        description: description || `Venta por ${amount.toFixed(2)}`,
        amount,
        metadata: { saleId },
    });

    // Update client total purchases
    const client = await getCRMClientById(clientId);
    if (client) {
        await updateCRMClient(clientId, {
            totalPurchases: client.totalPurchases + amount,
        });
    }
};

export const addRepairInteraction = async (
    clientId: string,
    repairId: string,
    description: string,
    amount?: number
): Promise<void> => {
    await createCRMInteraction({
        clientId,
        interactionType: "repair",
        relatedId: repairId,
        relatedTable: "repair_orders",
        interactionDate: new Date(),
        description,
        amount,
        metadata: { repairId },
    });
};

export const addWarrantyInteraction = async (
    clientId: string,
    warrantyId: string,
    description: string
): Promise<void> => {
    await createCRMInteraction({
        clientId,
        interactionType: "warranty",
        relatedId: warrantyId,
        relatedTable: "warranties",
        interactionDate: new Date(),
        description,
        metadata: { warrantyId },
    });
};

export const addCreditPaymentInteraction = async (
    clientId: string,
    paymentId: string,
    amount: number
): Promise<void> => {
    await createCRMInteraction({
        clientId,
        interactionType: "credit_payment",
        relatedId: paymentId,
        relatedTable: "client_payments",
        interactionDate: new Date(),
        description: `Pago de crédito por ${amount.toFixed(2)}`,
        amount,
        metadata: { paymentId },
    });
};

// Create interaction function
export const createCRMInteraction = async (
    interactionData: Omit<CRMInteraction, "id" | "firestore_id" | "createdAt" | "updatedAt">
): Promise<CRMInteraction> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        const firestoreId = uuidv4();
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(interactionData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {
            firestore_id: firestoreId,
            client_id: client._dbId || parseInt(client.id),
            interaction_type: interactionData.interactionType,
            related_id: interactionData.relatedId || null,
            related_table: interactionData.relatedTable || null,
            interaction_date: interactionData.interactionDate.toISOString(),
            description: interactionData.description || null,
            amount: interactionData.amount || null,
            status: interactionData.status || null,
            employee_id: interactionData.employeeId || null,
            metadata: interactionData.metadata || {},
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabase
            .from(CRM_INTERACTIONS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        // Update last contact date for client
        await updateCRMClient(interactionData.clientId, {
            lastContactDate: interactionData.interactionDate,
        });

        return {
            id: data?.firestore_id ?? data?.id ?? "",
            firestore_id: data?.firestore_id ?? data?.id ?? "",
            clientId: data?.clientid ?? data?.clientId ?? "",
            interactionType: (data?.interactiontype ?? data?.interactionType ?? "contact") as InteractionType,
            relatedId: data?.relatedid ?? data?.relatedId ?? undefined,
            relatedTable: data?.relatedtable ?? data?.relatedTable ?? undefined,
            interactionDate: toDate(data?.interactiondate ?? data?.interactionDate),
            description: data?.description ?? undefined,
            amount: data?.amount ? Number(data?.amount) : undefined,
            status: data?.status ?? undefined,
            employeeId: data?.employeeid ?? data?.employeeId ?? undefined,
            metadata: data?.metadata ?? {},
            createdAt: toDate(data?.createdat ?? data?.createdAt),
            updatedAt: toDate(data?.updatedat ?? data?.updatedAt),
        };
    } catch (error) {
        log.error("Error creating CRM interaction", error);
        throw error;
    }
};

// Create CRM Client from Sale or Repair information
export const createCRMClientFromSale = async (saleInfo: {
    name: string;
    phone: string;
    email?: string;
    saleAmount?: number;
    saleId?: string;
    interactionType?: 'sale' | 'repair' | 'warranty';
}): Promise<CRMClient | null> => {
    const supabase = await getSupabaseClientWithAuth();
    if (!supabase) {
        throw new Error("Supabase client not initialized");
    }

    try {
        log.info(`Creating CRM client from sale info: ${saleInfo.name}`);

        // Check if client already exists by phone or email
        let existingClient: CRMClient | null = null;
        if (saleInfo.phone) {
            const { data: existingByPhone } = await supabase
                .from(CRM_CLIENTS_TABLE)
                .select("id, firestore_id")
                .eq("phone", saleInfo.phone)
                .single();

            if (existingByPhone) {
                log.info(`Client already exists with phone ${saleInfo.phone}`);
                existingClient = await getCRMClientById(existingByPhone.firestore_id);
                
                // Create interaction for existing client if amount or warranty type
                const intType = saleInfo.interactionType || 'sale';
                const shouldCreateInteraction = (saleInfo.saleAmount !== undefined && saleInfo.saleAmount > 0) || intType === 'warranty';
                
                if (shouldCreateInteraction && existingClient && existingByPhone.id) {
                    try {
                        const interactionFirestoreId = `interaction-${intType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const now = nowIso();
                        const relatedTable = intType === 'repair' ? 'repair_orders' : intType === 'warranty' ? 'warranties_new' : 'sales';
                        
                        log.info(`Creating ${intType} interaction for existing client: client_id=${existingByPhone.id}, amount=${saleInfo.saleAmount}`);
                        const { error: interactionError } = await supabase
                            .from(CRM_INTERACTIONS_TABLE)
                            .insert({
                                firestore_id: interactionFirestoreId,
                                client_id: existingByPhone.id,
                                interaction_type: intType,
                                interaction_date: now,
                                amount: saleInfo.saleAmount,
                                description: `${intType}: ${saleInfo.saleId || 'POS'}`,
                                related_table: relatedTable,
                                status: 'completed'
                            });

                        if (interactionError) {
                            log.warn(`Failed to create ${intType} interaction for existing client:`, interactionError);
                        } else {
                            log.info(`Created ${intType} interaction for existing client`);
                            
                            // Update total_purchases if there's an amount
                            if (saleInfo.saleAmount && saleInfo.saleAmount > 0) {
                                const { error: updateError } = await supabase
                                    .from(CRM_CLIENTS_TABLE)
                                    .update({
                                        total_purchases: saleInfo.saleAmount + (existingClient.totalPurchases || 0),
                                        last_contact_date: now
                                    })
                                    .eq('id', existingByPhone.id);
                                
                                if (updateError) {
                                    log.warn(`Failed to update total_purchases for existing client:`, updateError);
                                }
                            } else {
                                // Still update last_contact_date
                                const { error: updateError } = await supabase
                                    .from(CRM_CLIENTS_TABLE)
                                    .update({
                                        last_contact_date: now
                                    })
                                    .eq('id', existingByPhone.id);
                                
                                if (updateError) {
                                    log.warn(`Failed to update last_contact_date for existing client:`, updateError);
                                }
                            }
                        }
                    } catch (interactionError) {
                        log.warn(`Error creating interaction for existing client`, interactionError);
                    }
                }
                
                return existingClient;
            }
        }

        if (saleInfo.email) {
            const { data: existingByEmail } = await supabase
                .from(CRM_CLIENTS_TABLE)
                .select("id, firestore_id")
                .eq("email", saleInfo.email)
                .single();

            if (existingByEmail && !existingClient) {
                log.info(`Client already exists with email ${saleInfo.email}`);
                existingClient = await getCRMClientById(existingByEmail.firestore_id);
                
                // Create interaction for existing client if amount or warranty type
                const intType = saleInfo.interactionType || 'sale';
                const shouldCreateInteraction = (saleInfo.saleAmount !== undefined && saleInfo.saleAmount > 0) || intType === 'warranty';
                
                if (shouldCreateInteraction && existingClient && existingByEmail.id) {
                    try {
                        const interactionFirestoreId = `interaction-${intType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                        const now = nowIso();
                        const relatedTable = intType === 'repair' ? 'repair_orders' : intType === 'warranty' ? 'warranties_new' : 'sales';
                        
                        log.info(`Creating ${intType} interaction for existing client: client_id=${existingByEmail.id}, amount=${saleInfo.saleAmount}`);
                        const { error: interactionError } = await supabase
                            .from(CRM_INTERACTIONS_TABLE)
                            .insert({
                                firestore_id: interactionFirestoreId,
                                client_id: existingByEmail.id,
                                interaction_type: intType,
                                interaction_date: now,
                                amount: saleInfo.saleAmount,
                                description: `${intType}: ${saleInfo.saleId || 'POS'}`,
                                related_table: relatedTable,
                                status: 'completed'
                            });

                        if (interactionError) {
                            log.warn(`Failed to create ${intType} interaction for existing client:`, interactionError);
                        } else {
                            log.info(`Created ${intType} interaction for existing client`);
                            
                            // Update total_purchases if there's an amount
                            if (saleInfo.saleAmount && saleInfo.saleAmount > 0) {
                                const { error: updateError } = await supabase
                                    .from(CRM_CLIENTS_TABLE)
                                    .update({
                                        total_purchases: saleInfo.saleAmount + (existingClient.totalPurchases || 0),
                                        last_contact_date: now
                                    })
                                    .eq('id', existingByEmail.id);
                                
                                if (updateError) {
                                    log.warn(`Failed to update total_purchases for existing client:`, updateError);
                                }
                            } else {
                                // Still update last_contact_date
                                const { error: updateError } = await supabase
                                    .from(CRM_CLIENTS_TABLE)
                                    .update({
                                        last_contact_date: now
                                    })
                                    .eq('id', existingByEmail.id);
                                
                                if (updateError) {
                                    log.warn(`Failed to update last_contact_date for existing client:`, updateError);
                                }
                            }
                        }
                    } catch (interactionError) {
                        log.warn(`Error creating interaction for existing client`, interactionError);
                    }
                }
                
                return existingClient;
            }
        }

        // Parse name into first and last name
        const nameParts = saleInfo.name.trim().split(" ");
        const firstName = nameParts[0] || "Cliente";
        const lastName = nameParts.slice(1).join(" ") || "Venta POS";

        // Generate client code
        const clientCode = await generateClientCode();

        // Create new client
        const firestoreId = `sale-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const now = nowIso();

        const { data: newClient, error: createError } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .insert({
                firestore_id: firestoreId,
                client_code: clientCode,
                identification_type: "cedula",
                identification_number: `temp-${Date.now()}`,
                first_name: firstName,
                last_name: lastName,
                email: saleInfo.email || null,
                phone: saleInfo.phone,
                client_type: "particular",
                client_status: "active",
                registration_date: now,
                created_at: now,
                updated_at: now,
            })
            .select()
            .single();

        if (createError) {
            log.error("Error creating client from sale", createError);
            throw createError;
        }

        log.info(`Created new CRM client from sale: ${newClient.firestore_id}`);
        const mappedClient = mapCRMClient(newClient);

        // If amount information is provided, create the initial interaction
        const intType = saleInfo.interactionType || 'sale';
        log.info(`Creating initial interaction - type: ${intType}, amount: ${saleInfo.saleAmount}, id: ${saleInfo.saleId}`);
        
        // Create interaction if amount > 0 OR if it's a warranty (warranty can be $0 initially)
        const shouldCreateInteraction = (saleInfo.saleAmount !== undefined && saleInfo.saleAmount > 0) || intType === 'warranty';
        
        if (shouldCreateInteraction) {
            try {
                const interactionFirestoreId = `interaction-${intType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                log.info(`Inserting interaction: client_id=${newClient.id}, amount=${saleInfo.saleAmount}, type=${intType}, firestore_id=${interactionFirestoreId}`);
                
                const relatedTable = intType === 'repair' ? 'repair_orders' : intType === 'warranty' ? 'warranties_new' : 'sales';
                const { data: interactionData, error: interactionError } = await supabase
                    .from(CRM_INTERACTIONS_TABLE)
                    .insert({
                        firestore_id: interactionFirestoreId,
                        client_id: newClient.id, // Use the numeric BIGINT ID
                        interaction_type: intType,
                        interaction_date: now,
                        amount: saleInfo.saleAmount,
                        description: `Initial ${intType}: ${saleInfo.saleId || 'POS'}`,
                        related_table: relatedTable,
                        status: 'completed'
                    })
                    .select();

                if (interactionError) {
                    log.warn(`Failed to create initial ${intType} interaction for client ${newClient.firestore_id}:`, interactionError);
                } else {
                    log.info(`Created initial ${intType} interaction for new client ${newClient.firestore_id}:`, interactionData);
                    
                    // Update total_purchases if there's an amount (warranties might be $0 initially)
                    if (saleInfo.saleAmount && saleInfo.saleAmount > 0) {
                        const { error: updateTotalError } = await supabase
                            .from(CRM_CLIENTS_TABLE)
                            .update({
                                total_purchases: saleInfo.saleAmount,
                                last_contact_date: now
                            })
                            .eq('id', newClient.id);
                        
                        if (updateTotalError) {
                            log.warn(`Failed to update total_purchases for new client:`, updateTotalError);
                        } else {
                            log.info(`Updated total_purchases for new client to: ${saleInfo.saleAmount}`);
                            mappedClient.totalPurchases = saleInfo.saleAmount;
                        }
                    } else {
                        // Still update last_contact_date even if no amount
                        const { error: updateContactError } = await supabase
                            .from(CRM_CLIENTS_TABLE)
                            .update({
                                last_contact_date: now
                            })
                            .eq('id', newClient.id);
                        
                        if (updateContactError) {
                            log.warn(`Failed to update last_contact_date for new client:`, updateContactError);
                        }
                    }
                }
            } catch (interactionError) {
                log.warn(`Error creating initial ${intType} interaction`, interactionError);
            }
        } else {
            log.warn(`Skipping ${intType} interaction creation - amount: ${saleInfo.saleAmount}, shouldCreate: ${shouldCreateInteraction}`);
        }

        return mappedClient;

    } catch (error) {
        log.error("Error in createCRMClientFromSale", error);
        return null;
    }
};