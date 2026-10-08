import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export type AttachmentType = "image" | "video" | "audio";

export function useChatMessages(doubtId: string | null) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!doubtId) return;
    const channel = supabase
      .channel(`chat-${doubtId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages", filter: `doubt_id=eq.${doubtId}` }, () => {
        qc.invalidateQueries({ queryKey: ["chat", doubtId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [doubtId, qc]);

  return useQuery({
    queryKey: ["chat", doubtId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("doubt_id", doubtId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!doubtId,
  });
}

export async function uploadChatAttachment(userId: string, file: Blob, filename: string) {
  const ext = filename.includes(".") ? filename.split(".").pop() : "bin";
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("chat-attachments").upload(path, file, {
    contentType: (file as File).type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("chat-attachments").getPublicUrl(path);
  return data.publicUrl;
}

export function useSendMessage() {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      doubtId,
      message,
      attachment_url,
      attachment_type,
      attachment_name,
    }: {
      doubtId: string;
      message?: string;
      attachment_url?: string;
      attachment_type?: AttachmentType;
      attachment_name?: string;
    }) => {
      const { error } = await supabase.from("chat_messages").insert({
        doubt_id: doubtId,
        sender_id: user!.id,
        sender_role: profile!.role!,
        message: message ?? "",
        attachment_url: attachment_url ?? null,
        attachment_type: attachment_type ?? null,
        attachment_name: attachment_name ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, { doubtId }) => qc.invalidateQueries({ queryKey: ["chat", doubtId] }),
  });
}

export function useUnsendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId }: { messageId: string; doubtId: string }) => {
      const { error } = await supabase.from("chat_messages").delete().eq("id", messageId);
      if (error) throw error;
    },
    onSuccess: (_, { doubtId }) => qc.invalidateQueries({ queryKey: ["chat", doubtId] }),
  });
}
