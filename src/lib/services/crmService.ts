"use server";

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
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { toDate, nowIso } from "@/lib/supabase/utils";
import { uploadFile } from "./documentService";
import { getLogger } from "@/lib/logger";

const log = getLogger("crmService");

// Table names
const CRM_CLIENTS_TABLE = "crm_clients";
const CRM_INTERACTIONS_TABLE = "crm_interactions";
const CRM_TAGS_TABLE = "crm_tags";
const CRM_TASKS_TABLE = "crm_tasks";
const CRM_DOCUMENTS_TABLE = "crm_documents";
const STORAGE_DOCUMENTS_PATH = "crm_documents";

// Mapping functions
const mapCRMClient = (row: any): CRMClient => ({
    id: row?.id ?? "",
    clientCode: row?.client_code ?? row?.clientCode ?? row?.clientcode ?? "",
    identificationType: (row?.identification_type ?? row?.identificationType ?? row?.identificationtype ?? "cedula") as IdentificationType,
    identificationNumber: row?.identification_number ?? row?.identificationNumber ?? row?.identificationnumber ?? "",
    firstName: row?.first_name ?? row?.firstName ?? row?.firstname ?? "",
    lastName: row?.last_name ?? row?.lastName ?? row?.lastname ?? "",
    companyName: row?.company_name ?? row?.companyName ?? row?.companyname ?? undefined,
    email: row?.email ?? undefined,
    phone: row?.phone ?? undefined,
    secondaryPhone: row?.secondary_phone ?? row?.secondaryPhone ?? row?.secondaryphone ?? undefined,
    address: row?.address ?? undefined,
    city: row?.city ?? undefined,
    province: row?.province ?? undefined,
    clientType: (row?.client_type ?? row?.clientType ?? row?.clienttype ?? "particular") as ClientType,
    clientStatus: (row?.client_status ?? row?.clientStatus ?? row?.clientstatus ?? "active") as CRMClientStatus,
    registrationDate: toDate(row?.registration_date ?? row?.registrationDate ?? row?.registrationdate),
    lastContactDate: row?.last_contact_date || row?.lastContactDate || row?.lastcontactdate
        ? toDate(row?.last_contact_date ?? row?.lastContactDate ?? row?.lastcontactdate)
        : undefined,
    totalPurchases: Number(row?.total_purchases ?? row?.totalPurchases ?? row?.totalpurchases ?? 0),
    outstandingBalance: Number(row?.outstanding_balance ?? row?.outstandingBalance ?? row?.outstandingbalance ?? 0),
    creditLimit: Number(row?.credit_limit ?? row?.creditLimit ?? row?.creditlimit ?? 0),
    tags: row?.tags ?? [],
    notes: row?.notes ?? undefined,
    createdBy: row?.created_by ?? row?.createdBy ?? row?.createdby ?? undefined,
    createdAt: toDate(row?.created_at ?? row?.createdAt ?? row?.createdat),
    updatedAt: toDate(row?.updated_at ?? row?.updatedAt ?? row?.updatedat),
});

const mapCRMInteraction = (row: any): CRMInteraction => ({
    id: row?.id ?? "",
    clientId: row?.client_id ?? row?.clientId ?? row?.clientid ?? "",
    interactionType: (row?.interaction_type ?? row?.interactionType ?? row?.interactiontype ?? "contact") as InteractionType,
    relatedId: row?.related_id ?? row?.relatedId ?? row?.relatedid ?? undefined,
    relatedTable: row?.related_table ?? row?.relatedTable ?? row?.relatedtable ?? undefined,
    interactionDate: toDate(row?.interaction_date ?? row?.interactionDate ?? row?.interactiondate),
    description: row?.description ?? undefined,
    amount: row?.amount ? Number(row.amount) : undefined,
    status: row?.status ?? undefined,
    employeeId: row?.employee_id ?? row?.employeeId ?? row?.employeeid ?? undefined,
    metadata: row?.metadata ?? {},
    createdAt: toDate(row?.created_at ?? row?.createdAt ?? row?.createdat),
    updatedAt: toDate(row?.updated_at ?? row?.updatedAt ?? row?.updatedat),
});

const mapCRMTag = (row: any): CRMTag => ({
    id: row?.id ?? "",
    name: row?.name ?? "",
    color: row?.color ?? "#6B7280",
    description: row?.description ?? undefined,
    isActive: row?.is_active ?? row?.isActive ?? row?.isactive ?? true,
    createdAt: toDate(row?.created_at ?? row?.createdAt ?? row?.createdat),
    updatedAt: toDate(row?.updated_at ?? row?.updatedAt ?? row?.updatedat),
});

const mapCRMTask = (row: any): CRMTask => ({
    id: row?.id ?? "",
    clientId: row?.client_id ?? row?.clientId ?? row?.clientid ?? "",
    title: row?.title ?? "",
    description: row?.description ?? undefined,
    dueDate: row?.due_date || row?.dueDate || row?.duedate ? toDate(row?.due_date ?? row?.dueDate ?? row?.duedate) : undefined,
    status: (row?.status ?? "pending") as TaskStatus,
    priority: (row?.priority ?? "medium") as TaskPriority,
    assignedTo: row?.assigned_to ?? row?.assignedTo ?? row?.assignedto ?? undefined,
    completedAt: row?.completed_at || row?.completedAt || row?.completedat
        ? toDate(row?.completed_at ?? row?.completedAt ?? row?.completedat)
        : undefined,
    completionNotes: row?.completion_notes ?? row?.completionNotes ?? row?.completionnotes ?? undefined,
    createdAt: toDate(row?.created_at ?? row?.createdAt ?? row?.createdat),
    updatedAt: toDate(row?.updated_at ?? row?.updatedAt ?? row?.updatedat),
});

const mapCRMDocument = (row: any): CRMDocument => ({
    id: row?.id ?? "",
    clientId: row?.client_id ?? row?.clientId ?? row?.clientid ?? "",
    documentType: (row?.document_type ?? row?.documentType ?? row?.documenttype ?? "other") as DocumentType,
    documentName: row?.document_name ?? row?.documentName ?? row?.documentname ?? "",
    fileUrl: row?.file_url ?? row?.fileUrl ?? row?.fileurl ?? "",
    fileSize: row?.file_size || row?.fileSize || row?.filesize ? Number(row?.file_size ?? row?.fileSize ?? row?.filesize) : undefined,
    mimeType: row?.mime_type ?? row?.mimeType ?? row?.mimetype ?? undefined,
    uploadDate: toDate(row?.upload_date ?? row?.uploadDate ?? row?.uploaddate),
    uploadedBy: row?.uploaded_by ?? row?.uploadedBy ?? row?.uploadedby ?? undefined,
    createdAt: toDate(row?.created_at ?? row?.createdAt ?? row?.createdat),
});

// Generate client code
const generateClientCode = async (): Promise<string> => {
    const supabase = getSupabaseServerClient();
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
    clientData: Omit<CRMClient, "id" | "clientCode" | "createdAt" | "updatedAt" | "totalPurchases" | "outstandingBalance">
): Promise<CRMClient> => {
    const supabase = getSupabaseServerClient();

    try {
        const clientCode = await generateClientCode();

        const now = nowIso();

        const payload = {

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
            registration_date: clientData.registrationDate,
            last_contact_date: clientData.lastContactDate || null,
            total_purchases: 0,
            outstanding_balance: 0,
            credit_limit: clientData.creditLimit || 0,
            tags: clientData.tags || [],
            notes: clientData.notes || null,
            created_by: clientData.createdBy || null,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return mapCRMClient(data);
    } catch (error) {
        log.error("Error creating CRM client", error);
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
    const supabase = getSupabaseServerClient();

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
    const supabase = getSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            if (error.code === "PGRST116") return null;
            throw error;
        }

        return mapCRMClient(data);
    } catch (error) {
        log.error("Error getting CRM client by ID", error);
        return null;
    }
};

export const getCRMClientByIdentification = async (
    identificationType: IdentificationType,
    identificationNumber: string
): Promise<CRMClient | null> => {
    const supabase = getSupabaseServerClient();

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
    updates: Partial<Omit<CRMClient, "id" | "clientCode" | "createdAt" | "updatedAt">>
): Promise<CRMClient> => {
    const supabase = getSupabaseServerClient();

    try {
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
        if (updates.lastContactDate !== undefined) payload.last_contact_date = updates.lastContactDate || null;
        if (updates.totalPurchases !== undefined) payload.total_purchases = updates.totalPurchases;
        if (updates.outstandingBalance !== undefined) payload.outstanding_balance = updates.outstandingBalance;
        if (updates.creditLimit !== undefined) payload.credit_limit = updates.creditLimit;
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .update(payload)
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return mapCRMClient(data);
    } catch (error) {
        log.error("Error updating CRM client", error);
        throw error;
    }
};

export const deleteCRMClient = async (id: string): Promise<void> => {
    const supabase = getSupabaseServerClient();

    try {
        const { error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .delete()
            .eq("id", id);

        if (error) throw error;
    } catch (error) {
        log.error("Error deleting CRM client", error);
        throw error;
    }
};

// Interaction operations
export const createCRMInteraction = async (
    interactionData: Omit<CRMInteraction, "id" | "createdAt" | "updatedAt">
): Promise<CRMInteraction> => {
    const supabase = getSupabaseServerClient();

    try {
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(interactionData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {

            client_id: parseInt(client.id),
            interaction_type: interactionData.interactionType,
            related_id: interactionData.relatedId || null,
            related_table: interactionData.relatedTable || null,
            interaction_date: interactionData.interactionDate,
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

        return mapCRMInteraction(data);
    } catch (error) {
        log.error("Error creating CRM interaction", error);
        throw error;
    }
};

export const getCRMInteractions = async (
    clientId: string,
    limit: number = 50
): Promise<CRMInteraction[]> => {
    const supabase = getSupabaseServerClient();

    try {
        // Find the client database ID
        const client = await getCRMClientById(clientId);
        if (!client) return [];

        const { data, error } = await supabase
            .from(CRM_INTERACTIONS_TABLE)
            .select("*")
            .eq("client_id", parseInt(client.id))
            .order("interaction_date", { ascending: false })
            .limit(limit);

        if (error) throw error;

        return (data || []).map(mapCRMInteraction);
    } catch (error) {
        log.error("Error getting CRM interactions", error);
        return [];
    }
};

// Task operations
export const createCRMTask = async (
    taskData: Omit<CRMTask, "id" | "createdAt" | "updatedAt">
): Promise<CRMTask> => {
    const supabase = getSupabaseServerClient();

    try {
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(taskData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {

            client_id: parseInt(client.id),
            title: taskData.title,
            description: taskData.description || null,
            due_date: taskData.dueDate || null,
            status: taskData.status,
            priority: taskData.priority,
            assigned_to: taskData.assignedTo || null,
            completed_at: taskData.completedAt || null,
            completion_notes: taskData.completionNotes || null,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabase
            .from(CRM_TASKS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return mapCRMTask(data);
    } catch (error) {
        log.error("Error creating CRM task", error);
        throw error;
    }
};

export const updateCRMTask = async (
    id: string,
    updates: Partial<Omit<CRMTask, "id" | "createdAt" | "updatedAt">>
): Promise<CRMTask> => {
    const supabase = getSupabaseServerClient();

    try {
        const payload: any = {
            updated_at: nowIso(),
        };

        if (updates.title !== undefined) payload.title = updates.title;
        if (updates.description !== undefined) payload.description = updates.description || null;
        if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
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
            .eq("id", id)
            .select()
            .single();

        if (error) throw error;

        return mapCRMTask(data);
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
    const supabase = getSupabaseServerClient();

    try {
        let query = supabase
            .from(CRM_TASKS_TABLE)
            .select("*")
            .order("created_at", { ascending: false });

        if (filters?.clientId) {
            const client = await getCRMClientById(filters.clientId);
            if (client) {
                query = query.eq("client_id", parseInt(client.id));
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

        return (data || []).map(mapCRMTask);
    } catch (error) {
        log.error("Error getting CRM tasks", error);
        return [];
    }
};

// Tag operations
export const getCRMTags = async (): Promise<CRMTag[]> => {
    const supabase = getSupabaseServerClient();

    try {
        const { data, error } = await supabase
            .from(CRM_TAGS_TABLE)
            .select("*")
            .eq("is_active", true)
            .order("name");

        if (error) throw error;

        return (data || []).map(mapCRMTag);
    } catch (error) {
        log.error("Error getting CRM tags", error);
        return [];
    }
};

export const createCRMTag = async (
    tagData: Omit<CRMTag, "id" | "createdAt" | "updatedAt" | "isActive">
): Promise<CRMTag> => {
    const supabase = getSupabaseServerClient();

    try {

        const now = nowIso();

        const payload = {

            name: tagData.name,
            color: tagData.color || "#6B7280",
            description: tagData.description || null,
            is_active: true,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabase
            .from(CRM_TAGS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return mapCRMTag(data);
    } catch (error) {
        log.error("Error creating CRM tag", error);
        throw error;
    }
};

// Document operations
export const uploadCRMDocument = async (
    clientId: string,
    documentType: DocumentType,
    file: File,
    uploadedBy?: string
): Promise<CRMDocument> => {
    const supabase = getSupabaseServerClient();

    try {
        // Find the client database ID
        const client = await getCRMClientById(clientId);
        if (!client) throw new Error("Client not found");

        const now = nowIso();

        // Sanitize filename
        const sanitizeFilename = (filename: string): string => {
            return filename
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9._-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_+|_+$/g, '');
        };

        const sanitizedFilename = sanitizeFilename(file.name);
        // Use random UUID for storage path, but let DB generate ID for record
        const storageId = uuidv4();
        const filePath = `${STORAGE_DOCUMENTS_PATH}/${clientId}/${storageId}-${sanitizedFilename}`;
        const fileUrl = await uploadFile(file, filePath);

        const payload = {

            client_id: parseInt(client.id),
            document_type: documentType,
            document_name: file.name,
            file_url: fileUrl,
            file_size: file.size,
            mime_type: file.type,
            upload_date: now,
            uploaded_by: uploadedBy || null,
            created_at: now,
        };

        const { data, error } = await supabase
            .from(CRM_DOCUMENTS_TABLE)
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return mapCRMDocument(data);
    } catch (error) {
        log.error("Error uploading CRM document", error);
        throw error;
    }
};

export const getCRMDocuments = async (clientId: string): Promise<CRMDocument[]> => {
    const supabase = getSupabaseServerClient();

    try {
        // Find the client database ID
        const client = await getCRMClientById(clientId);
        if (!client) return [];

        const { data, error } = await supabase
            .from(CRM_DOCUMENTS_TABLE)
            .select("*")
            .eq("client_id", parseInt(client.id))
            .order("upload_date", { ascending: false });

        if (error) throw error;

        return (data || []).map(mapCRMDocument);
    } catch (error) {
        log.error("Error getting CRM documents", error);
        return [];
    }
};

// Statistics
export const getCRMStats = async (): Promise<CRMClientStats> => {
    const supabase = getSupabaseServerClient();

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

        const recentInteractions = (recentInteractionsData || []).map(mapCRMInteraction);

        return {
            totalClients: totalClients || 0,
            activeClients: activeClients || 0,
            newClientsThisMonth: newClientsThisMonth || 0,
            totalPurchases,
            averagePurchaseValue: (totalClients || 0) > 0 ? totalPurchases / (totalClients || 1) : 0,
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
        description: description || `Venta por $${amount.toFixed(2)}`,
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
        description: `Pago de crédito por $${amount.toFixed(2)}`,
        amount,
        metadata: { paymentId },
    });
};
