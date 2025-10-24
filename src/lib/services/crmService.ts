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
    id: row?.firestore_id ?? row?.id ?? "",
    firestore_id: row?.firestore_id ?? row?.id ?? "",
    clientCode: row?.clientcode ?? row?.clientCode ?? "",
    identificationType: (row?.identificationtype ?? row?.identificationType ?? "cedula") as IdentificationType,
    identificationNumber: row?.identificationnumber ?? row?.identificationNumber ?? "",
    firstName: row?.firstname ?? row?.firstName ?? "",
    lastName: row?.lastname ?? row?.lastName ?? "",
    companyName: row?.companyname ?? row?.companyName ?? undefined,
    email: row?.email ?? undefined,
    phone: row?.phone ?? undefined,
    secondaryPhone: row?.secondaryphone ?? row?.secondaryPhone ?? undefined,
    address: row?.address ?? undefined,
    city: row?.city ?? undefined,
    province: row?.province ?? undefined,
    clientType: (row?.clienttype ?? row?.clientType ?? "particular") as ClientType,
    clientStatus: (row?.clientstatus ?? row?.clientStatus ?? "active") as CRMClientStatus,
    registrationDate: toDate(row?.registrationdate ?? row?.registrationDate),
    lastContactDate: row?.lastcontactdate || row?.lastContactDate ? toDate(row?.lastcontactdate ?? row?.lastContactDate) : undefined,
    totalPurchases: Number(row?.totalpurchases ?? row?.totalPurchases ?? 0),
    outstandingBalance: Number(row?.outstandingbalance ?? row?.outstandingBalance ?? 0),
    creditLimit: Number(row?.creditlimit ?? row?.creditLimit ?? 0),
    tags: row?.tags ?? [],
    notes: row?.notes ?? undefined,
    createdBy: row?.createdby ?? row?.createdBy ?? undefined,
    createdAt: toDate(row?.createdat ?? row?.createdAt),
    updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
});

const mapCRMInteraction = (row: any): CRMInteraction => ({
    id: row?.firestore_id ?? row?.id ?? "",
    firestore_id: row?.firestore_id ?? row?.id ?? "",
    clientId: row?.clientid ?? row?.clientId ?? "",
    interactionType: (row?.interactiontype ?? row?.interactionType ?? "contact") as InteractionType,
    relatedId: row?.relatedid ?? row?.relatedId ?? undefined,
    relatedTable: row?.relatedtable ?? row?.relatedTable ?? undefined,
    interactionDate: toDate(row?.interactiondate ?? row?.interactionDate),
    description: row?.description ?? undefined,
    amount: row?.amount ? Number(row.amount) : undefined,
    status: row?.status ?? undefined,
    employeeId: row?.employeeid ?? row?.employeeId ?? undefined,
    metadata: row?.metadata ?? {},
    createdAt: toDate(row?.createdat ?? row?.createdAt),
    updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
});

const mapCRMTag = (row: any): CRMTag => ({
    id: row?.firestore_id ?? row?.id ?? "",
    firestore_id: row?.firestore_id ?? row?.id ?? "",
    name: row?.name ?? "",
    color: row?.color ?? "#6B7280",
    description: row?.description ?? undefined,
    isActive: row?.isactive ?? row?.isActive ?? true,
    createdAt: toDate(row?.createdat ?? row?.createdAt),
    updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
});

const mapCRMTask = (row: any): CRMTask => ({
    id: row?.firestore_id ?? row?.id ?? "",
    firestore_id: row?.firestore_id ?? row?.id ?? "",
    clientId: row?.clientid ?? row?.clientId ?? "",
    title: row?.title ?? "",
    description: row?.description ?? undefined,
    dueDate: row?.duedate || row?.dueDate ? toDate(row?.duedate ?? row?.dueDate) : undefined,
    status: (row?.status ?? "pending") as TaskStatus,
    priority: (row?.priority ?? "medium") as TaskPriority,
    assignedTo: row?.assignedto ?? row?.assignedTo ?? undefined,
    completedAt: row?.completedat || row?.completedAt ? toDate(row?.completedat ?? row?.completedAt) : undefined,
    completionNotes: row?.completionnotes ?? row?.completionNotes ?? undefined,
    createdAt: toDate(row?.createdat ?? row?.createdAt),
    updatedAt: toDate(row?.updatedat ?? row?.updatedAt),
});

const mapCRMDocument = (row: any): CRMDocument => ({
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
});

// Generate client code
const generateClientCode = async (): Promise<string> => {
    const supabase = getSupabaseServerClient();
    const year = new Date().getFullYear();
    const prefix = `CLI-${year}`;

    try {
        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("clientcode")
            .like("clientcode", `${prefix}%`)
            .order("clientcode", { ascending: false })
            .limit(1);

        if (error) throw error;

        if (!data || data.length === 0) {
            return `${prefix}-0001`;
        }

        const lastCode = data[0].clientcode;
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
    const supabase = getSupabaseServerClient();

    try {
        const clientCode = await generateClientCode();
        const firestoreId = uuidv4();
        const now = nowIso();

        const payload = {
            firestore_id: firestoreId,
            clientcode: clientCode,
            identificationtype: clientData.identificationType,
            identificationnumber: clientData.identificationNumber,
            firstname: clientData.firstName,
            lastname: clientData.lastName,
            companyname: clientData.companyName || null,
            email: clientData.email || null,
            phone: clientData.phone || null,
            secondaryphone: clientData.secondaryPhone || null,
            address: clientData.address || null,
            city: clientData.city || null,
            province: clientData.province || null,
            clienttype: clientData.clientType,
            clientstatus: clientData.clientStatus,
            registrationdate: clientData.registrationDate,
            lastcontactdate: clientData.lastContactDate || null,
            totalpurchases: 0,
            outstandingbalance: 0,
            creditlimit: clientData.creditLimit || 0,
            tags: clientData.tags || [],
            notes: clientData.notes || null,
            createdby: clientData.createdBy || null,
            createdat: now,
            updatedat: now,
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
            .order("registrationdate", { ascending: false });

        // Apply filters
        if (filters?.search) {
            const searchTerm = `%${filters.search}%`;
            query = query.or(`
                firstname.ilike.${searchTerm},
                lastname.ilike.${searchTerm},
                companyname.ilike.${searchTerm},
                email.ilike.${searchTerm},
                phone.ilike.${searchTerm},
                identificationnumber.ilike.${searchTerm},
                clientcode.ilike.${searchTerm}
            `);
        }

        if (filters?.clientType) {
            query = query.eq("clienttype", filters.clientType);
        }

        if (filters?.clientStatus) {
            query = query.eq("clientstatus", filters.clientStatus);
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
            .or(`firestore_id.eq.${id},id.eq.${id}`)
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
            .eq("identificationtype", identificationType)
            .eq("identificationnumber", identificationNumber)
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
    const supabase = getSupabaseServerClient();

    try {
        const payload: any = {
            updatedat: nowIso(),
        };

        if (updates.identificationType !== undefined) payload.identificationtype = updates.identificationType;
        if (updates.identificationNumber !== undefined) payload.identificationnumber = updates.identificationNumber;
        if (updates.firstName !== undefined) payload.firstname = updates.firstName;
        if (updates.lastName !== undefined) payload.lastname = updates.lastName;
        if (updates.companyName !== undefined) payload.companyname = updates.companyName || null;
        if (updates.email !== undefined) payload.email = updates.email || null;
        if (updates.phone !== undefined) payload.phone = updates.phone || null;
        if (updates.secondaryPhone !== undefined) payload.secondaryphone = updates.secondaryPhone || null;
        if (updates.address !== undefined) payload.address = updates.address || null;
        if (updates.city !== undefined) payload.city = updates.city || null;
        if (updates.province !== undefined) payload.province = updates.province || null;
        if (updates.clientType !== undefined) payload.clienttype = updates.clientType;
        if (updates.clientStatus !== undefined) payload.clientstatus = updates.clientStatus;
        if (updates.lastContactDate !== undefined) payload.lastcontactdate = updates.lastContactDate || null;
        if (updates.totalPurchases !== undefined) payload.totalpurchases = updates.totalPurchases;
        if (updates.outstandingBalance !== undefined) payload.outstandingbalance = updates.outstandingBalance;
        if (updates.creditLimit !== undefined) payload.creditlimit = updates.creditLimit;
        if (updates.tags !== undefined) payload.tags = updates.tags;
        if (updates.notes !== undefined) payload.notes = updates.notes || null;

        const { data, error } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .update(payload)
            .or(`firestore_id.eq.${id},id.eq.${id}`)
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
            .or(`firestore_id.eq.${id},id.eq.${id}`);

        if (error) throw error;
    } catch (error) {
        log.error("Error deleting CRM client", error);
        throw error;
    }
};

// Interaction operations
export const createCRMInteraction = async (
    interactionData: Omit<CRMInteraction, "id" | "firestore_id" | "createdAt" | "updatedAt">
): Promise<CRMInteraction> => {
    const supabase = getSupabaseServerClient();

    try {
        const firestoreId = uuidv4();
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(interactionData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {
            firestore_id: firestoreId,
            client_id: parseInt(client.id),
            interactiontype: interactionData.interactionType,
            related_id: interactionData.relatedId || null,
            related_table: interactionData.relatedTable || null,
            interactiondate: interactionData.interactionDate,
            description: interactionData.description || null,
            amount: interactionData.amount || null,
            status: interactionData.status || null,
            employee_id: interactionData.employeeId || null,
            metadata: interactionData.metadata || {},
            createdat: now,
            updatedat: now,
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
            .order("interactiondate", { ascending: false })
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
    taskData: Omit<CRMTask, "id" | "firestore_id" | "createdAt" | "updatedAt">
): Promise<CRMTask> => {
    const supabase = getSupabaseServerClient();

    try {
        const firestoreId = uuidv4();
        const now = nowIso();

        // Find the client database ID
        const client = await getCRMClientById(taskData.clientId);
        if (!client) throw new Error("Client not found");

        const payload = {
            firestore_id: firestoreId,
            client_id: parseInt(client.id),
            title: taskData.title,
            description: taskData.description || null,
            due_date: taskData.dueDate || null,
            status: taskData.status,
            priority: taskData.priority,
            assigned_to: taskData.assignedTo || null,
            completed_at: taskData.completedAt || null,
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

        return mapCRMTask(data);
    } catch (error) {
        log.error("Error creating CRM task", error);
        throw error;
    }
};

export const updateCRMTask = async (
    id: string,
    updates: Partial<Omit<CRMTask, "id" | "firestore_id" | "createdAt" | "updatedAt">>
): Promise<CRMTask> => {
    const supabase = getSupabaseServerClient();

    try {
        const payload: any = {
            updatedat: nowIso(),
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
            .or(`firestore_id.eq.${id},id.eq.${id}`)
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
            .order("createdat", { ascending: false });

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
    tagData: Omit<CRMTag, "id" | "firestore_id" | "createdAt" | "updatedAt" | "isActive">
): Promise<CRMTag> => {
    const supabase = getSupabaseServerClient();

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

        const firestoreId = uuidv4();
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
        const filePath = `${STORAGE_DOCUMENTS_PATH}/${clientId}/${firestoreId}-${sanitizedFilename}`;
        const fileUrl = await uploadFile(file, filePath);

        const payload = {
            firestore_id: firestoreId,
            client_id: parseInt(client.id),
            documenttype: documentType,
            documentname: file.name,
            fileurl: fileUrl,
            filesize: file.size,
            mimetype: file.type,
            uploaddate: now,
            uploadedby: uploadedBy || null,
            createdat: now,
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
            .order("uploaddate", { ascending: false });

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
            .eq("clientstatus", "active");

        // Get new clients this month
        const { count: newClientsThisMonth } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*", { count: "exact", head: true })
            .gte("registrationdate", firstDayOfMonth.toISOString());

        // Get total purchases
        const { data: purchasesData } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("totalpurchases");

        const totalPurchases = purchasesData?.reduce((sum, client) => sum + Number(client.totalpurchases || 0), 0) || 0;

        // Get top clients
        const { data: topClientsData } = await supabase
            .from(CRM_CLIENTS_TABLE)
            .select("*")
            .order("totalpurchases", { ascending: false })
            .limit(5);

        const topClients = (topClientsData || []).map(mapCRMClient);

        // Get recent interactions
        const { data: recentInteractionsData } = await supabase
            .from(CRM_INTERACTIONS_TABLE)
            .select("*")
            .order("interactiondate", { ascending: false })
            .limit(10);

        const recentInteractions = (recentInteractionsData || []).map(mapCRMInteraction);

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