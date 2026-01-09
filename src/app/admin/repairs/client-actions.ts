"use server";

import { getCRMClients } from "@/lib/services/crmClientService";
import { getRepairsByClient } from "@/lib/services/repairService";
import { CRMClient, RepairOrder } from "@/types";

export async function searchClients(query: string): Promise<CRMClient[]> {
    if (!query || query.length < 2) return [];

    try {
        const clients = await getCRMClients({
            search: query,
            limit: 10
        });
        return clients;
    } catch (error) {
        console.error("Error searching clients:", error);
        return [];
    }
}

export async function getClientRepairs(phone: string): Promise<RepairOrder[]> {
    if (!phone) return [];

    try {
        const repairs = await getRepairsByClient(phone);
        return repairs;
    } catch (error) {
        console.error("Error fetching client repairs:", error);
        return [];
    }
}
