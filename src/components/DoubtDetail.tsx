import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useAnswers, useCreateAnswer, uploadAnswerAttachment, usePromoteChatToAnswer } from "@/hooks/useAnswers";
import { useChatMessages, useSendMessage, uploadChatAttachment, useUnsendMessage } from "@/hooks/useChatMessages";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Send, MessageSquare, BookOpenCheck, Sparkles, ArrowUpCircle, Trash2 } from "lucide-react";
import ChatAttachment, { type StagedAttachment } from "@/components/ChatAttachment";
import ChatAttachmentView from "@/components/ChatAttachmentView";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

interface DoubtDetailProps {
  doubt: Tables<"doubts">;
  onClose: () => void;
}

function RoleBadge({ role }: { role: string }) {
  if (role === "teacher") {
    return <Badge className="text-[10px] py-0 px-1.5 h-4 bg-primary text-primary-foreground">Teacher</Badge>;
  }
  if (role === "admin") {
    return <Badge className="text-[10px] py-0 px-1.5 h-4 bg-destructive text-destructive-foreground">Admin</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] py-0 px-1.5 h-4">Student</Badge>;
}

const LONG_PRESS_MS = 500;

export default function DoubtDetail({ doubt, onClose }: DoubtDetailProps) {
  const { profile, user } = useAuth();
  const { data: answers } = useAnswers(doubt.id);
  const { data: messages } = useChatMessages(doubt.id);
  const createAnswer = useCreateAnswer();
  const sendMessage = useSendMessage();
  const promote = usePromoteChatToAnswer();
  const unsend = useUnsendMessage();

  const [answerText, setAnswerText] = useState("");
  const [answerStaged, setAnswerStaged] = useState<StagedAttachment | null>(null);
  const [answerUploading, setAnswerUploading] = useState(false);

  const [chatText, setChatText] = useState("");
  const [staged, setStaged] = useState<StagedAttachment | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirmUnsendId, setConfirmUnsendId] = useState<string | null>(null);
  const longPressTimer = useRef<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isOwner = user?.id === doubt.created_by;
  const isTeacherOrAdmin = profile?.role === "teacher" || profile?.role === "admin";
  const canChat = isOwner || isTeacherOrAdmin;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const startPress = (messageId: string, ownerId: string) => {
    if (ownerId !== user?.id) return; // only sender can unsend
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setConfirmUnsendId(messageId);
    }, LONG_PRESS_MS);
  };
  const cancelPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleAnswer = async () => {
    if (!answerText.trim() && !answerStaged) return;
    try {
      let attachment_url: string | undefined;
      if (answerStaged && user) {
        setAnswerUploading(true);
        attachment_url = await uploadAnswerAttachment(user.id, answerStaged.file, answerStaged.filename);
      }
      await createAnswer.mutateAsync({
        doubtId: doubt.id,
        content: answerText.trim(),
        attachment_url,
        attachment_type: answerStaged?.type,
        attachment_name: answerStaged?.filename,
      });
      setAnswerText("");
      setAnswerStaged(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to post answer");
    } finally {
      setAnswerUploading(false);
    }
  };

  const handleSendChat = async () => {
    if (!chatText.trim() && !staged) return;
    try {
      let attachment_url: string | undefined;
      if (staged && user) {
        setUploading(true);
        attachment_url = await uploadChatAttachment(user.id, staged.file, staged.filename);
      }
      await sendMessage.mutateAsync({
        doubtId: doubt.id,
        message: chatText.trim() || undefined,
        attachment_url,
        attachment_type: staged?.type,
        attachment_name: staged?.filename,
      });
      setChatText("");
      setStaged(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setUploading(false);
    }
  };

  const handlePromote = async (m: any) => {
    try {
      await promote.mutateAsync({
        doubtId: doubt.id,
        content: m.message || "",
        attachment_url: m.attachment_url,
        attachment_type: m.attachment_type,
        attachment_name: m.attachment_name,
      });
      toast.success("Promoted to verified answer");
    } catch (err: any) {
      toast.error(err.message || "Failed to promote");
    }
  };

  const handleUnsend = async () => {
    if (!confirmUnsendId) return;
    try {
      await unsend.mutateAsync({ messageId: confirmUnsendId, doubtId: doubt.id });
      toast.success("Message unsent");
    } catch (err: any) {
      toast.error(err.message || "Failed to unsend");
    } finally {
      setConfirmUnsendId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25 }}
        className="w-full sm:max-w-lg bg-card sm:border-l border-border h-full overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-border flex items-start justify-between sticky top-0 bg-card z-10">
          <div className="min-w-0 flex-1 mr-2">
            <h2 className="font-bold text-base sm:text-lg text-foreground truncate">{doubt.topic}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 break-words">{doubt.description}</p>
            <p className="text-xs text-primary font-medium mt-2">{doubt.anonymous_id}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 shrink-0">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="answers" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-3 sm:mx-4 mt-2 self-start">
            <TabsTrigger value="answers" className="flex items-center gap-1">
              <BookOpenCheck className="w-3.5 h-3.5" />Answers
            </TabsTrigger>
            {canChat && (
              <TabsTrigger value="chat" className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />Discussion
              </TabsTrigger>
            )}
          </TabsList>

          {/* Answers Tab */}
          <TabsContent value="answers" className="flex-1 flex flex-col overflow-hidden m-0 p-3 sm:p-4">
            <ScrollArea className="flex-1 -mx-1 px-1">
              <div className="space-y-3 pr-1">
                {answers?.length === 0 && (
                  <div className="text-center py-12">
                    <BookOpenCheck className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No answers yet.</p>
                    <p className="text-xs text-muted-foreground mt-1">Be the first to share a verified answer.</p>
                  </div>
                )}
                {answers?.map(a => (
                  <Card key={a.id} className={`p-3 ${a.is_teacher_answer ? "teacher-highlight" : ""}`}>
                    {a.is_teacher_answer && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs teacher-badge">
                          <Sparkles className="w-3 h-3" />
                          Verified Teacher Answer
                        </span>
                      </div>
                    )}
                    {a.content && <p className="text-sm text-foreground whitespace-pre-wrap break-words">{a.content}</p>}
                    {(a as any).attachment_url && (a as any).attachment_type && (
                      <ChatAttachmentView
                        url={(a as any).attachment_url}
                        type={(a as any).attachment_type}
                        name={(a as any).attachment_name}
                      />
                    )}
                    <div className="flex items-center justify-between mt-2 flex-wrap gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {a.is_teacher_answer ? "📚 Verified by Teacher" : "Student"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-3 pt-3 border-t border-border space-y-2 sticky bottom-0 bg-card">
              {answerStaged && <ChatAttachment staged={answerStaged} onStage={setAnswerStaged} />}
              <div className="flex gap-2 items-end">
                {!answerStaged && (
                  <ChatAttachment staged={null} onStage={setAnswerStaged} disabled={answerUploading} />
                )}
                <Textarea
                  placeholder="Write your answer..."
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  className="min-h-[64px] resize-none text-base"
                  disabled={answerUploading}
                />
                <Button
                  onClick={handleAnswer}
                  disabled={(!answerText.trim() && !answerStaged) || answerUploading}
                  size="icon"
                  className="shrink-0 h-11 w-11"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Chat Tab */}
          {canChat && (
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden m-0 p-3 sm:p-4">
              <ScrollArea className="flex-1 -mx-1 px-1">
                <div className="space-y-3 pr-1">
                  {messages?.length === 0 && (
                    <div className="text-center py-12">
                      <MessageSquare className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">No messages yet.</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Be the first to discuss or clarify this doubt.
                      </p>
                    </div>
                  )}
                  {messages?.map(m => {
                    const isMine = m.sender_id === user?.id;
                    const isTeacherSide = m.sender_role === "teacher" || m.sender_role === "admin";
                    const alignRight = isTeacherSide;
                    return (
                      <div key={m.id} className={`flex ${alignRight ? "justify-end" : "justify-start"}`}>
                        <div className="max-w-[85%] flex flex-col gap-1">
                          <div className={`flex items-center gap-1.5 ${alignRight ? "justify-end" : "justify-start"}`}>
                            <RoleBadge role={m.sender_role} />
                            {isMine && <span className="text-[10px] text-muted-foreground">you</span>}
                          </div>
                          <div
                            onMouseDown={() => startPress(m.id, m.sender_id)}
                            onMouseUp={cancelPress}
                            onMouseLeave={cancelPress}
                            onTouchStart={() => startPress(m.id, m.sender_id)}
                            onTouchEnd={cancelPress}
                            onTouchCancel={cancelPress}
                            onContextMenu={(e) => {
                              if (m.sender_id === user?.id) {
                                e.preventDefault();
                                setConfirmUnsendId(m.id);
                              }
                            }}
                            className={`px-3 py-2 rounded-2xl text-sm select-none ${
                              alignRight
                                ? "bg-primary text-primary-foreground rounded-br-md"
                                : "bg-muted text-foreground rounded-bl-md"
                            } ${isMine ? "cursor-pointer" : ""}`}
                            title={isMine ? "Hold to unsend" : undefined}
                          >
                            {m.message && <p className="whitespace-pre-wrap break-words">{m.message}</p>}
                            {m.attachment_url && m.attachment_type && (
                              <ChatAttachmentView
                                url={m.attachment_url}
                                type={m.attachment_type}
                                name={m.attachment_name}
                              />
                            )}
                            <p className="text-[10px] mt-1 opacity-60 text-right">
                              {new Date(m.created_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                            </p>
                          </div>
                          <div className={`flex items-center gap-2 ${alignRight ? "self-end" : "self-start"}`}>
                            {isMine && (
                              <button
                                type="button"
                                onClick={() => setConfirmUnsendId(m.id)}
                                className="text-[10px] inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                                title="Unsend"
                              >
                                <Trash2 className="w-3 h-3" />
                                Unsend
                              </button>
                            )}
                            {isTeacherOrAdmin && (m.message || m.attachment_url) && (
                              <button
                                type="button"
                                onClick={() => handlePromote(m)}
                                disabled={promote.isPending}
                                className="text-[10px] inline-flex items-center gap-1 text-primary hover:underline"
                              >
                                <ArrowUpCircle className="w-3 h-3" />
                                Promote to Answer
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>

              <div className="mt-3 pt-3 border-t border-border space-y-2 sticky bottom-0 bg-card">
                {staged && <ChatAttachment staged={staged} onStage={setStaged} />}
                <div className="flex gap-2 items-end">
                  {!staged && <ChatAttachment staged={null} onStage={setStaged} disabled={uploading} />}
                  <Textarea
                    placeholder={staged ? "Add a caption (optional)..." : "Type a message..."}
                    value={chatText}
                    onChange={e => setChatText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey && !uploading) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    disabled={uploading}
                    rows={2}
                    className="min-h-[52px] resize-none text-base"
                  />
                  <Button
                    onClick={handleSendChat}
                    disabled={(!chatText.trim() && !staged) || uploading}
                    size="icon"
                    className="h-11 w-11 shrink-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground hidden sm:block">
                  Press Enter to send · Shift+Enter for new line · Hold a message to unsend
                </p>
                <p className="text-[10px] text-muted-foreground sm:hidden">Hold your message to unsend</p>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </motion.div>

      {/* Unsend confirmation */}
      <AlertDialog open={!!confirmUnsendId} onOpenChange={(open) => !open && setConfirmUnsendId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsend this message?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the message from the discussion. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnsend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unsend
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
