"use client";

import { useEffect, useState } from "react";
import { getWholesaleProfitForCategory } from "@/lib/services/wholesaleProfitService";
import { supabase } from "@/lib/supabaseClient";

export function useWholesaleProfitForCategory(categoryId: string): number | null {
  const [profit, setProfit] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProfit = async () => {
      if (!categoryId) {
        if (isMounted) {
          setProfit(null);
        }
        return;
      }

      const value = await getWholesaleProfitForCategory(categoryId);
      if (isMounted) {
        setProfit(value);
      }
    };

    void loadProfit();

    if (!supabase || !categoryId) {
      return () => {
        isMounted = false;
      };
    }

    const channel = supabase
      .channel(`wholesale-profit:${categoryId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "wholesale_profit_settings",
          filter: `category_id=eq.${categoryId}`,
        },
        () => {
          void loadProfit();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      void supabase.removeChannel(channel);
    };
  }, [categoryId]);

  return profit;
}
