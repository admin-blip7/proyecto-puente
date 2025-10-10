'use server';

import { Client, CreditAccount, ClientProfile, Product, UserProfile, CartItem, Sale } from "@/types";
import { addInterestEarnings, generatePaymentPlan, generateContract } from "./financeService";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServerClient } from "@/lib/supabaseServerClient";
import { getLogger } from "@/lib/logger";
import { uploadFile } from "./documentService";
import { toDate, nowIso } from "@/lib/supabase/utils";

const log = getLogger("creditService");

const CLIENTS_TABLE = "clients";
const CREDIT_ACCOUNTS_TABLE = "credit_accounts";
const SALES_TABLE = "sales";
const PRODUCTS_TABLE = "products";
const INVENTORY_LOGS_TABLE = "inventory_logs";

const normalizeId = (row: any) => row?.firestore_id ?? row?.id ?? "";

const mapClient = (row: any): Client => ({
  id: normalizeId(row),
  clientId: row?.clientId ?? "",
  name: row?.name ?? "",
  phone: row?.phone ?? "",
  address: row?.address ?? "",
  curp: row?.curp ?? "",
  employmentInfo: row?.employmentInfo ?? null,
  socialMedia: row?.socialMedia ?? null,
  documents: row?.documents ?? {},
  createdAt: toDate(row?.createdAt),
});

const mapCreditAccount = (row: any): CreditAccount => ({
  id: normalizeId(row),
  accountId: row?.accountId ?? "",
  clientId: row?.clientId ?? "",
  creditLimit: Number(row?.creditLimit ?? 0),
  currentBalance: Number(row?.currentBalance ?? 0),
  status: row?.status ?? "Al Corriente",
  paymentDueDate: toDate(row?.paymentDueDate),
  interestRate: Number(row?.interestRate ?? 0),
});

const mapSale = (row: any): Sale => ({
  id: normalizeId(row),
  saleId: row?.saleId ?? "",
  items: Array.isArray(row?.items) ? row.items : [],
  totalAmount: Number(row?.totalAmount ?? 0),
  paymentMethod: row?.paymentMethod ?? "Efectivo",
  cashierId: row?.cashierId ?? "",
  cashierName: row?.cashierName ?? undefined,
  customerName: row?.customerName ?? null,
  customerPhone: row?.customerPhone ?? null,
  createdAt: toDate(row?.createdAt),
  sessionId: row?.sessionId ?? undefined,
});

export const getClientsWithCredit = async (): Promise<ClientProfile[]> => {
  const supabase = getSupabaseServerClient();

  const { data: clientRows, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select("*")
    .order("name", { ascending: true });

  if (clientError) {
    log.error("Error fetching clients", clientError);
    return [];
  }

  const clients = (clientRows ?? []).map(mapClient);
  if (clients.length === 0) {
    return [];
  }

  const clientIds = clients.map((client) => client.id);
  const { data: accountRows, error: accountError } = await supabase
    .from(CREDIT_ACCOUNTS_TABLE)
    .select("*")
    .in("clientId", clientIds);

  if (accountError) {
    log.warn("Error fetching credit accounts", accountError);
  }

  const accountsByClient = new Map<string, CreditAccount>();
  (accountRows ?? []).forEach((row) => {
    const account = mapCreditAccount(row);
    accountsByClient.set(account.clientId, account);
  });

  return clients.map((client) => ({
    ...client,
    creditAccount: accountsByClient.get(client.id),
  }));
};

export const addClient = async (
  clientData: Omit<Client, "id" | "clientId" | "createdAt" | "documents">,
  creditLimit: number,
  paymentDueDate: Date,
  interestRate?: number
): Promise<ClientProfile> => {
  const supabase = getSupabaseServerClient();
  const firestoreId = uuidv4();
  const accountFirestoreId = uuidv4();
  const clientId = `CLIENT-${uuidv4().substring(0, 8).toUpperCase()}`;
  const accountId = `ACC-${uuidv4().substring(0, 8).toUpperCase()}`;
  const createdAt = nowIso();

  const clientPayload = {
    firestore_id: firestoreId,
    clientId,
    name: clientData.name,
    phone: clientData.phone ?? "",
    address: clientData.address ?? "",
    curp: clientData.curp ?? "",
    employmentInfo: clientData.employmentInfo ?? null,
    socialMedia: clientData.socialMedia ?? null,
    documents: {},
    createdAt,
  };

  const { data: insertedClient, error: clientInsertError } = await supabase
    .from(CLIENTS_TABLE)
    .insert(clientPayload)
    .select("*")
    .single();

  if (clientInsertError) {
    log.error("Error inserting client", clientInsertError);
    throw new Error("No se pudo crear el cliente.");
  }

  const accountPayload = {
    firestore_id: accountFirestoreId,
    accountId,
    clientId: firestoreId,
    creditLimit,
    currentBalance: 0,
    status: "Al Corriente",
    paymentDueDate: paymentDueDate.toISOString(),
    interestRate: interestRate ?? 0,
  };

  const { data: insertedAccount, error: accountInsertError } = await supabase
    .from(CREDIT_ACCOUNTS_TABLE)
    .insert(accountPayload)
    .select("*")
    .single();

  if (accountInsertError) {
    log.error("Error inserting credit account", accountInsertError);
    throw new Error("No se pudo crear la cuenta de crédito.");
  }

  return {
    ...mapClient(insertedClient),
    creditAccount: mapCreditAccount(insertedAccount),
  };
};

export const uploadClientDocument = async (
  clientId: string,
  documentType: "idUrl" | "proofOfAddressUrl",
  file: File
): Promise<string> => {
  const supabase = getSupabaseServerClient();
  const filePath = `client_documents/${clientId}/${documentType}-${file.name}`;
  const downloadURL = await uploadFile(file, filePath);

  const { data: existingClient, error: fetchError } = await supabase
    .from(CLIENTS_TABLE)
    .select("documents")
    .eq("firestore_id", clientId)
    .maybeSingle();

  if (fetchError) {
    log.error("Error fetching client documents", fetchError);
    throw new Error("No se pudo actualizar el documento del cliente.");
  }

  const currentDocs = (existingClient?.documents ?? {}) as Record<string, string>;
  const updatedDocs = {
    ...currentDocs,
    [documentType]: downloadURL,
  };

  const { error: updateError } = await supabase
    .from(CLIENTS_TABLE)
    .update({ documents: updatedDocs })
    .eq("firestore_id", clientId);

  if (updateError) {
    log.error("Error updating client documents", updateError);
    throw new Error("No se pudo guardar el documento del cliente.");
  }

  return downloadURL;
};

interface CreateCreditSaleParams {
  items: CartItem[];
  clientId: string;
  totalAmount: number;
  serials?: string[];
  userId: string;
  customerName?: string;
  customerPhone?: string;
}

export const createCreditSale = async (params: CreateCreditSaleParams): Promise<Sale> => {
  const { items, clientId, totalAmount, userId, customerName, customerPhone } = params;
  const supabase = getSupabaseServerClient();
  const saleFirestoreId = uuidv4();
  const saleId = `SALE-${uuidv4().split("-")[0].toUpperCase()}`;

  const { data: clientRow, error: clientError } = await supabase
    .from(CLIENTS_TABLE)
    .select("*")
    .eq("firestore_id", clientId)
    .maybeSingle();

  if (clientError || !clientRow) {
    throw new Error("Cliente no encontrado");
  }

  const customerDisplayName = clientRow.name ?? customerName ?? "";
  const customerPhoneValue = clientRow.phone ?? customerPhone ?? null;

  const { data: creditAccountRow, error: creditAccountError } = await supabase
    .from(CREDIT_ACCOUNTS_TABLE)
    .select("*")
    .eq("clientId", clientId)
    .maybeSingle();

  if (creditAccountError || !creditAccountRow) {
    throw new Error("Cuenta de crédito no encontrada");
  }

  const creditAccount = mapCreditAccount(creditAccountRow);
  if (creditAccount.currentBalance + totalAmount > creditAccount.creditLimit) {
    throw new Error("Límite de crédito insuficiente");
  }

  for (const item of items) {
    const { data: productRow, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select("firestore_id, stock, cost, name")
      .eq("firestore_id", item.id)
      .maybeSingle();

    if (productError || !productRow) {
      throw new Error(`Producto ${item.name} no encontrado.`);
    }

    const currentStock = Number(productRow.stock ?? 0);
    const newStock = currentStock - item.quantity;
    if (newStock < 0) {
      throw new Error(`Stock insuficiente para ${item.name}`);
    }

    const { error: updateProductError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({ stock: newStock })
      .eq("firestore_id", productRow.firestore_id ?? item.id);

    if (updateProductError) {
      throw new Error(`No se pudo actualizar el stock de ${item.name}.`);
    }

    const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert({
      firestore_id: uuidv4(),
      productId: productRow.firestore_id ?? item.id,
      productName: productRow.name ?? item.name,
      change: -item.quantity,
      reason: "Venta a Crédito",
      updatedBy: userId,
      createdAt: nowIso(),
      metadata: { saleId, cost: item.cost ?? productRow.cost ?? 0 },
    });

    if (logError) {
      throw new Error("No se pudo registrar el movimiento de inventario.");
    }
  }

  const newBalance = creditAccount.currentBalance + totalAmount;
  const { error: accountUpdateError } = await supabase
    .from(CREDIT_ACCOUNTS_TABLE)
    .update({ currentBalance: newBalance })
    .eq("firestore_id", creditAccount.id);

  if (accountUpdateError) {
    throw new Error("No se pudo actualizar la cuenta de crédito.");
  }

  if (creditAccount.interestRate > 0) {
    const interestAmount = totalAmount * (creditAccount.interestRate / 100);
    await addInterestEarnings(
      interestAmount,
      clientId,
      customerDisplayName,
      `Ganancia por intereses de venta a crédito - ${saleId}`
    );

    const defaultTermInMonths = 12;
    await generatePaymentPlan(clientId, totalAmount, creditAccount.interestRate, defaultTermInMonths);
  }

  await generateContract(
    clientId,
    customerDisplayName,
    clientRow.address ?? "",
    customerPhoneValue ?? "",
    creditAccount.creditLimit,
    creditAccount.interestRate ?? 0,
    creditAccount.paymentDueDate
  );

  const salePayload = {
    firestore_id: saleFirestoreId,
    saleId,
    items: items.map((item) => ({
      productId: item.id,
      name: item.name,
      quantity: item.quantity,
      priceAtSale: item.price,
      cost: item.cost ?? 0,
    })),
    totalAmount,
    paymentMethod: "Crédito",
    cashierId: userId,
    cashierName: customerName ?? "POS User",
    customerName: customerDisplayName,
    customerPhone: customerPhoneValue,
    createdAt: nowIso(),
    sessionId: null,
  };

  const { data: insertedSale, error: saleInsertError } = await supabase
    .from(SALES_TABLE)
    .insert(salePayload)
    .select("*")
    .single();

  if (saleInsertError) {
    throw new Error("No se pudo registrar la venta a crédito.");
  }

  return mapSale(insertedSale);
};

interface CreateFinancedSaleParams {
  product: Product;
  client: ClientProfile;
  user: UserProfile;
  terms: {
    downPayment: number;
    annualInterestRate: number;
    paymentFrequency: "Semanal" | "Mensual";
    term: number;
  };
}

export const createFinancedSale = async (params: CreateFinancedSaleParams): Promise<void> => {
  const { product, client, user, terms } = params;
  const supabase = getSupabaseServerClient();

  const saleFirestoreId = uuidv4();
  const saleId = `SALE-${uuidv4().split("-")[0].toUpperCase()}`;
  const accountFirestoreId = uuidv4();
  const accountId = `ACC-${uuidv4().substring(0, 8).toUpperCase()}`;
  const amountToFinance = product.price - terms.downPayment;

  const { data: productRow, error: productError } = await supabase
    .from(PRODUCTS_TABLE)
    .select("firestore_id, stock, cost, name")
    .eq("firestore_id", product.id)
    .maybeSingle();

  if (productError || !productRow) {
    throw new Error(`Producto ${product.name} no encontrado.`);
  }

  const currentStock = Number(productRow.stock ?? 0);
  if (currentStock < 1) {
    throw new Error(`Stock insuficiente para ${product.name}.`);
  }

  const { error: updateProductError } = await supabase
    .from(PRODUCTS_TABLE)
    .update({ stock: currentStock - 1 })
    .eq("firestore_id", productRow.firestore_id ?? product.id);

  if (updateProductError) {
    throw new Error("No se pudo actualizar el stock del producto.");
  }

  const salePayload = {
    firestore_id: saleFirestoreId,
    saleId,
    items: [
      {
        productId: product.id,
        name: product.name,
        quantity: 1,
        priceAtSale: product.price,
        cost: product.cost,
      },
    ],
    totalAmount: product.price,
    paymentMethod: "Crédito",
    cashierId: user.uid,
    cashierName: user.name,
    customerName: client.name,
    customerPhone: client.phone ?? null,
    createdAt: nowIso(),
    sessionId: null,
  };

  const { error: saleInsertError } = await supabase.from(SALES_TABLE).insert(salePayload);
  if (saleInsertError) {
    throw new Error("No se pudo registrar la venta financiada.");
  }

  const accountPayload = {
    firestore_id: accountFirestoreId,
    accountId,
    clientId: client.id,
    creditLimit: product.price,
    currentBalance: amountToFinance,
    status: "Al Corriente",
    paymentDueDate: nowIso(),
    interestRate: terms.annualInterestRate,
    financeTerms: {
      productId: product.id,
      productName: product.name,
      productPrice: product.price,
      ...terms,
    },
  };

  const { error: accountInsertError } = await supabase
    .from(CREDIT_ACCOUNTS_TABLE)
    .insert(accountPayload);

  if (accountInsertError) {
    throw new Error("No se pudo crear la cuenta de financiamiento.");
  }

  const { error: logError } = await supabase.from(INVENTORY_LOGS_TABLE).insert({
    firestore_id: uuidv4(),
    productId: product.id,
    productName: product.name,
    change: -1,
    reason: "Venta a Crédito",
    updatedBy: user.uid,
    createdAt: nowIso(),
    metadata: { saleId, cost: product.cost },
  });

  if (logError) {
    throw new Error("No se pudo registrar el movimiento de inventario.");
  }
};
