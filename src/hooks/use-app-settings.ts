import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppSettings = {
  id: number;
  app_name: string;
  app_logo_url: string | null;
};

export function useAppSettings() {
  return useQuery({
    queryKey: ["app_settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await (supabase as any)
        .from("app_settings")
        .select("*")
        .eq("id", 1)
        .single();

      if (error) {
        // Fallback if table doesn't exist yet or fails
        console.warn("Failed to fetch app_settings, using defaults:", error);
        return {
          id: 1,
          app_name: "DMAG",
          app_logo_url: null,
        };
      }

      return data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdateAppSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newSettings: Partial<AppSettings>) => {
      const { error } = await (supabase as any)
        .from("app_settings")
        .update(newSettings)
        .eq("id", 1);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings"] });
    },
  });
}
