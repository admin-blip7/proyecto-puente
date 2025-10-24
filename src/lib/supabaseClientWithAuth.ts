"use client";

import { type SupabaseClient, type User } from "@supabase/supabase-js";
import { getLogger } from "@/lib/logger";
import { supabase as supabaseClient } from "@/lib/supabaseClient";

const log = getLogger("supabaseClientWithAuth");

// Función para obtener un cliente de Supabase con la sesión actualizada
export const getSupabaseClientWithAuth = async (): Promise<SupabaseClient<any, "public", any> | undefined> => {
  if (!supabaseClient) {
    log.error("Supabase client not initialized");
    return undefined;
  }

  try {
    // Intentar obtener la sesión actual
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    
    if (sessionError) {
      log.error("Error getting session:", sessionError);
      // No lanzamos error aquí, ya que puede ser una sesión expirada
    }

    // La sesión ya está integrada en el cliente, solo necesitamos asegurarnos que esté actualizada
    return supabaseClient;
  } catch (error) {
    log.error("Error in getSupabaseClientWithAuth:", error);
    return supabaseClient; // Devolver el cliente base aún si hay errores
  }
};

// Función para verificar si el usuario está autenticado
export const isAuthenticated = async (): Promise<boolean> => {
  if (!supabaseClient) {
    return false;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    
    log.info("Auth check - User ID:", user?.id, "Email:", user?.email);
    
    return !!user && !!(user.id);
  } catch (error) {
    log.error("Error checking authentication:", error);
    return false;
  }
};

// Función para obtener el usuario actual
export const getCurrentUser = async (): Promise<User | null> => {
  if (!supabaseClient) {
    return null;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session?.user || null;
  } catch (error) {
    log.error("Error getting current user:", error);
    return null;
  }
};

export default supabaseClient;