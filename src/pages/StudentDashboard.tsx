import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import DoubtCard from "@/components/DoubtCard";
import DoubtDetail from "@/components/DoubtDetail";
import Leaderboard from "@/components/Leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useDoubts, useCreateDoubt, useVoteDoubt, useUserVotes, type DoubtSort } from "@/hooks/useDoubts";
import { useReportDoubt } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, BookOpen, HelpCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function StudentDashboard() {
  const { user, profile } = useAuth();
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDoubt, setSelectedDoubt] = useState<Tables<"doubts"> | null>(null);
  const [tab, setTab] = useState("unsolved");
  const [sort, setSort] = useState<DoubtSort>("unsolved");

  const { data: doubts } = useDoubts(selectedSubject, tab === "all" ? undefined : tab, sort);
  const { data: userVotes } = useUserVotes(selectedSubject);
  const createDoubt = useCreateDoubt();
  const voteDoubt = useVoteDoubt();
  const reportDoubt = useReportDoubt();

  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [askOpen, setAskOpen] = useState(false);

  const handleAsk = () => {
    if (!topic.trim() || !description.trim() || !selectedSubject) return;
    createDoubt.mutate(
      { subjectId: selectedSubject, topic, description },
      {
        onSuccess: () => {
          toast.success("Doubt posted anonymously!");
          setTopic("");
          setDescription("");
          setAskOpen(false);
        },
        onError: (e) => toast.error(e.message),
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-4 sm:py-6 px-3 sm:px-4">
        <div className="grid lg:grid-cols-[1fr_300px] gap-4 sm:gap-6">
          {/* Main content */}
          <div className="min-w-0">
            {/* Subject selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Select value={selectedSubject || ""} onValueChange={setSelectedSubject}>
                <SelectTrigger className="w-full sm:w-[220px] h-11">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5" />{s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSubject && (
                <Dialog open={askOpen} onOpenChange={setAskOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full sm:w-auto h-11">
                      <Plus className="w-4 h-4 mr-1" />Ask Doubt
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <HelpCircle className="w-5 h-5" />Ask a Doubt
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>Topic</Label>
                        <Input placeholder="e.g. Binary Search Trees" value={topic} onChange={e => setTopic(e.target.value)} className="h-11 text-base" />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Textarea placeholder="Describe your doubt in detail..." value={description} onChange={e => setDescription(e.target.value)} rows={4} className="text-base" />
                      </div>
                      <p className="text-xs text-muted-foreground">Your identity will be hidden. You'll appear as an anonymous student.</p>
                      <Button onClick={handleAsk} className="w-full h-11" disabled={createDoubt.isPending}>
                        {createDoubt.isPending ? "Posting..." : "Post Anonymously"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {!selectedSubject ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a subject to view doubts</p>
              </Card>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-4">
                  <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
                    <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:flex">
                      <TabsTrigger value="all">All</TabsTrigger>
                      <TabsTrigger value="solved">Solved</TabsTrigger>
                      <TabsTrigger value="unsolved">Unsolved</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <Select value={sort} onValueChange={(v) => setSort(v as DoubtSort)}>
                    <SelectTrigger className="w-full sm:w-[180px] h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unsolved">Unsolved first</SelectItem>
                      <SelectItem value="discussed">Most discussed</SelectItem>
                      <SelectItem value="latest">Latest</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  {doubts?.length === 0 && (
                    <Card className="p-8 text-center">
                      <p className="text-muted-foreground">No doubts yet. Be the first to ask!</p>
                    </Card>
                  )}
                  <AnimatePresence>
                    {doubts?.map(d => (
                      <DoubtCard
                        key={d.id}
                        doubt={d}
                        hasVoted={userVotes?.has(d.id)}
                        onVote={() => voteDoubt.mutate({ doubtId: d.id, hasVoted: userVotes?.has(d.id) || false })}
                        onOpen={() => setSelectedDoubt(d)}
                        onReport={() => {
                          reportDoubt.mutate({ doubtId: d.id, reportedBy: user!.id, reason: "Inappropriate content" });
                          toast.success("Doubt reported");
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Sidebar — visible on desktop, stacks below on mobile */}
          <div className="lg:block">
            <Leaderboard />
          </div>
        </div>
      </div>

      {/* Doubt Detail Panel */}
      <AnimatePresence>
        {selectedDoubt && (
          <DoubtDetail doubt={selectedDoubt} onClose={() => setSelectedDoubt(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
