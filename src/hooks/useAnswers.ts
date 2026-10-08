import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export function useAnswers(doubtId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!doubtId) return;
    const channel = supabase
      .channel(`answers-${doubtId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "answers", filter: `doubt_id=eq.${doubtId}` }, () => {
        qc.invalidateQueries({ queryKey: ["answers", doubtId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [doubtId, qc]);

  return useQuery({
    queryKey: ["answers", doubtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("answers")
        .select("*")
        .eq("doubt_id", doubtId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!doubtId,
  });
}

export async function uploadAnswerAttachment(userId: string, file: Blob, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const path = `${userId}/answers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("chat-attachments").upload(path, file, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return data.publicUrl;
}

export function useCreateAnswer() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      doubtId,
      content,
      attachment_url,
      attachment_type,
      attachment_name,
    }: {
      doubtId: string;
      content: string;
      attachment_url?: string;
      attachment_type?: string;
      attachment_name?: string;
    }) => {
      const isTeacherAnswer = profile?.role === "teacher" || profile?.role === "admin";
      const { error } = await supabase.from("answers").insert({
        doubt_id: doubtId,
        content,
        answered_by: user!.id,
        is_teacher_answer: isTeacherAnswer,
        attachment_url: attachment_url ?? null,
        attachment_type: attachment_type ?? null,
        attachment_name: attachment_name ?? null,
      });
      if (error) throw error;
      if (isTeacherAnswer) {
        await supabase.from("doubts").update({ status: "solved" }).eq("id", doubtId);
      }
    },
    onSuccess: (_, { doubtId }) => {
      qc.invalidateQueries({ queryKey: ["answers", doubtId] });
      qc.invalidateQueries({ queryKey: ["doubts"] });
      qc.invalidateQueries({ queryKey: ["admin-doubts"] });
    },
  });
}

export function usePromoteChatToAnswer() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      doubtId,
      content,
      attachment_url,
      attachment_type,
      attachment_name,
    }: {
      doubtId: string;
      content: string;
      attachment_url?: string | null;
      attachment_type?: string | null;
      attachment_name?: string | null;
    }) => {
      if (profile?.role !== "teacher" && profile?.role !== "admin") {
        throw new Error("Only teachers can promote messages");
      }
      const { error } = await supabase.from("answers").insert({
        doubt_id: doubtId,
        content: content || "(promoted from chat)",
        answered_by: user!.id,
        is_teacher_answer: true,
        attachment_url: attachment_url ?? null,
        attachment_type: attachment_type ?? null,
        attachment_name: attachment_name ?? null,
      });
      if (error) throw error;
      await supabase.from("doubts").update({ status: "solved" }).eq("id", doubtId);
    },
    onSuccess: (_, { doubtId }) => {
      qc.invalidateQueries({ queryKey: ["answers", doubtId] });
      qc.invalidateQueries({ queryKey: ["doubts"] });
    },
  });
}
