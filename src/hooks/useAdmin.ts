import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAllDoubtsWithIdentity() {
  return useQuery({
    queryKey: ["admin-doubts"],
    queryFn: async () => {
      const { data: doubts, error } = await supabase
        .from("doubts")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!doubts) return [];

      const userIds = Array.from(new Set(doubts.map(d => d.created_by).filter(Boolean))) as string[];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, branch, section")
        .in("user_id", userIds);
      const pmap = new Map((profiles || []).map(p => [p.user_id, p]));

      return doubts.map(d => ({ ...d, profiles: pmap.get(d.created_by) }));
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data: reports, error } = await supabase
        .from("reports")
        .select("*, doubts(topic, anonymous_id, created_by)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!reports) return [];

      const userIds = Array.from(
        new Set(
          reports
            .flatMap(r => [r.reported_by, (r as any).doubts?.created_by])
            .filter(Boolean)
        )
      ) as string[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, email, branch, section, is_blocked")
        .in("user_id", userIds);
      const pmap = new Map((profiles || []).map(p => [p.user_id, p]));

      return reports.map(r => ({
        ...r,
        reporter: pmap.get(r.reported_by),
        author: pmap.get((r as any).doubts?.created_by),
      }));
    },
  });
}

export function useBlockUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_blocked: block }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-doubts"] }),
  });
}

export function useReportDoubt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ doubtId, reportedBy, reason }: { doubtId: string; reportedBy: string; reason: string }) => {
      await supabase.from("doubts").update({ is_reported: true }).eq("id", doubtId);
      const { error } = await supabase.from("reports").insert({ doubt_id: doubtId, reported_by: reportedBy, reason });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doubts"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useUpdateReportStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["reports"] }),
  });
}

export function useAllProfiles() {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });
}
