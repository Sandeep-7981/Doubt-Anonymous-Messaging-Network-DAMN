import { motion } from "framer-motion";
import { ChevronUp, MessageSquare, Flag, Clock, CheckCircle2, BookOpenCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

interface DoubtCardProps {
  doubt: Tables<"doubts"> & { message_count?: number; answer_count?: number };
  hasVoted?: boolean;
  onVote?: () => void;
  onOpen?: () => void;
  onReport?: () => void;
  showIdentity?: boolean;
  realName?: string;
  isTeacherView?: boolean;
  onMarkSolved?: () => void;
}

export default function DoubtCard({
  doubt, hasVoted, onVote, onOpen, onReport,
  showIdentity, realName, isTeacherView, onMarkSolved,
}: DoubtCardProps) {
  const isSolved = doubt.status === "solved";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card
        className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
          doubt.is_reported ? "admin-alert" : ""
        } ${isSolved ? "opacity-75" : ""}`}
        onClick={onOpen}
      >
        <div className="flex gap-3">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 min-w-[48px]">
            <Button
              variant={hasVoted ? "default" : "outline"}
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={(e) => { e.stopPropagation(); onVote?.(); }}
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <span className="text-sm font-bold text-foreground">{doubt.vote_count}</span>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">{doubt.topic}</h3>
              <div className="flex items-center gap-1.5 shrink-0">
                {isSolved ? (
                  <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                    <CheckCircle2 className="w-3 h-3 mr-1" />Solved
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="bg-destructive/10 text-destructive text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />Unsolved
                  </Badge>
                )}
                {doubt.is_reported && (
                  <Badge variant="destructive" className="text-xs">Flagged</Badge>
                )}
                {doubt.vote_count >= 5 && (
                  <Badge className="trending-badge text-xs">🔥 Trending</Badge>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{doubt.description}</p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="font-medium text-primary">{doubt.anonymous_id}</span>
                {showIdentity && realName && (
                  <span className="text-destructive font-medium">({realName})</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(doubt.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1" title="Discussions">
                  <MessageSquare className="w-3 h-3" />{doubt.message_count ?? 0}
                </span>
                <span className="flex items-center gap-1" title="Answers">
                  <BookOpenCheck className="w-3 h-3" />{doubt.answer_count ?? 0}
                </span>
                {isTeacherView && !isSolved && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-success"
                    onClick={(e) => { e.stopPropagation(); onMarkSolved?.(); }}
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />Mark Solved
                  </Button>
                )}
                {onReport && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onReport(); }}
                  >
                    <Flag className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onOpen?.(); }}>
                  <MessageSquare className="w-3 h-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
