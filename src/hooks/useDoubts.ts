import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type DoubtSort = "unsolved" | "discussed" | "latest";

export type DoubtWithCounts = {
  id: string;
  topic: string;
  description: string;
  subject_id: string;
  status: string;
  vote_count: number;
  is_reported: boolean;
  anonymous_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  answer_count: number;
};

async function fetchDoubtsWithCounts(subjectId: string, statusFilter?: string) {
  let q = supabase.from("doubts").select("*").eq("subject_id", subjectId);
  if (statusFilter) q = q.eq("status", statusFilter);
  const { data: doubts, error } = await q;
  if (error) throw error;
  if (!doubts || doubts.length === 0) return [] as DoubtWithCounts[];

  const ids = doubts.map((d) => d.id);
  const [msgRes, ansRes] = await Promise.all([
    supabase.from("chat_messages").select("doubt_id").in("doubt_id", ids),
    supabase.from("answers").select("doubt_id").in("doubt_id", ids),
  ]);

  const msgCounts = new Map<string, number>();
  (msgRes.data || []).forEach((r) => msgCounts.set(r.doubt_id, (msgCounts.get(r.doubt_id) || 0) + 1));
  const ansCounts = new Map<string, number>();
  (ansRes.data || []).forEach((r) => ansCounts.set(r.doubt_id, (ansCounts.get(r.doubt_id) || 0) + 1));

  return doubts.map((d) => ({
    ...d,
    message_count: msgCounts.get(d.id) || 0,
    answer_count: ansCounts.get(d.id) || 0,
  })) as DoubtWithCounts[];
}

function sortDoubts(items: DoubtWithCounts[], sort: DoubtSort) {
  const arr = [...items];
  if (sort === "latest") {
    arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === "discussed") {
    arr.sort((a, b) => b.message_count + b.answer_count - (a.message_count + a.answer_count));
  } else {
    // unsolved first, then by votes
    arr.sort((a, b) => {
      const aSolved = a.status === "solved" ? 1 : 0;
      const bSolved = b.status === "solved" ? 1 : 0;
      if (aSolved !== bSolved) return aSolved - bSolved;
      return b.vote_count - a.vote_count;
    });
  }
  return arr;
}

export function useDoubts(subjectId: string | null, status?: string, sort: DoubtSort = "unsolved") {
  const qc = useQueryClient();

  useEffect(() => {
    if (!subjectId) return;
    const channel = supabase
      .channel(`doubts-${subjectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "doubts", filter: `subject_id=eq.${subjectId}` }, () => {
        qc.invalidateQueries({ queryKey: ["doubts", subjectId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["doubts", subjectId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        qc.invalidateQueries({ queryKey: ["doubts", subjectId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [subjectId, qc]);

  return useQuery({
    queryKey: ["doubts", subjectId, status, sort],
    queryFn: async () => {
      const items = await fetchDoubtsWithCounts(subjectId!, status);
      return sortDoubts(items, sort);
    },
    enabled: !!subjectId,
  });
}

export function useCreateDoubt() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ subjectId, topic, description }: { subjectId: string; topic: string; description: string }) => {
      const { count } = await supabase
        .from("doubts")
        .select("*", { count: "exact", head: true })
        .eq("subject_id", subjectId);
      const anonId = `Student_${(count || 0) + 1}`;

      const { error } = await supabase.from("doubts").insert({
        subject_id: subjectId,
        topic,
        description,
        anonymous_id: anonId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doubts"] }),
  });
}

export function useVoteDoubt() {
  const qc = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ doubtId, hasVoted }: { doubtId: string; hasVoted: boolean }) => {
      if (hasVoted) {
        await supabase.from("doubt_votes").delete().eq("doubt_id", doubtId).eq("user_id", user!.id);
      } else {
        await supabase.from("doubt_votes").insert({ doubt_id: doubtId, user_id: user!.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["doubts"] });
      qc.invalidateQueries({ queryKey: ["votes"] });
    },
  });
}

export function useUserVotes(subjectId: string | null) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["votes", user?.id, subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doubt_votes")
        .select("doubt_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map(v => v.doubt_id));
    },
    enabled: !!user && !!subjectId,
  });
}

export function useMarkSolved() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doubtId: string) => {
      const { error } = await supabase.from("doubts").update({ status: "solved" }).eq("id", doubtId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["doubts"] }),
  });
}

export function useTrendingDoubts() {
  const qc = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("trending-doubts")
      .on("postgres_changes", { event: "*", schema: "public", table: "doubts" }, () => {
        qc.invalidateQueries({ queryKey: ["trending"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        qc.invalidateQueries({ queryKey: ["trending"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "answers" }, () => {
        qc.invalidateQueries({ queryKey: ["trending"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  return useQuery({
    queryKey: ["trending"],
    queryFn: async () => {
      const { data: doubts, error } = await supabase
        .from("doubts")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      if (!doubts || doubts.length === 0) return [];

      const ids = doubts.map((d) => d.id);
      const [msgRes, ansRes] = await Promise.all([
        supabase.from("chat_messages").select("doubt_id").in("doubt_id", ids),
        supabase.from("answers").select("doubt_id").in("doubt_id", ids),
      ]);
      const msgCounts = new Map<string, number>();
      (msgRes.data || []).forEach((r) => msgCounts.set(r.doubt_id, (msgCounts.get(r.doubt_id) || 0) + 1));
      const ansCounts = new Map<string, number>();
      (ansRes.data || []).forEach((r) => ansCounts.set(r.doubt_id, (ansCounts.get(r.doubt_id) || 0) + 1));

      const enriched = doubts.map((d) => {
        const m = msgCounts.get(d.id) || 0;
        const a = ansCounts.get(d.id) || 0;
        return {
          ...d,
          message_count: m,
          answer_count: a,
          activity_score: m + a * 2 + d.vote_count,
        };
      });
      enriched.sort((a, b) => b.activity_score - a.activity_score);
      return enriched.slice(0, 10);
    },
  });
}
