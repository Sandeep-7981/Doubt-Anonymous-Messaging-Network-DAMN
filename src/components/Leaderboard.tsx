import { motion } from "framer-motion";
import { useTrendingDoubts } from "@/hooks/useDoubts";
import { Card } from "@/components/ui/card";
import { TrendingUp, Flame, MessageSquare, BookOpenCheck } from "lucide-react";

export default function Leaderboard() {
  const { data: trending } = useTrendingDoubts();

  if (!trending?.length) return null;

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-5 h-5 text-warning" />
        <h3 className="font-bold text-foreground">Trending Doubts</h3>
      </div>
      <div className="space-y-2">
        {trending.map((d, i) => (
          <motion.div
            key={d.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <span className="text-lg font-bold text-muted-foreground w-6 text-center">
              {i < 3 ? <Flame className="w-4 h-4 text-warning inline" /> : i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{d.topic}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="truncate">{(d as any).subjects?.name}</span>
                <span className="flex items-center gap-0.5">
                  <MessageSquare className="w-3 h-3" />{(d as any).message_count ?? 0}
                </span>
                <span className="flex items-center gap-0.5">
                  <BookOpenCheck className="w-3 h-3" />{(d as any).answer_count ?? 0}
                </span>
              </div>
            </div>
            <span className="text-sm font-bold text-primary">{d.vote_count}↑</span>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
