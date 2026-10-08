import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import DoubtCard from "@/components/DoubtCard";
import DoubtDetail from "@/components/DoubtDetail";
import Leaderboard from "@/components/Leaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { useSubjects, useCreateSubject } from "@/hooks/useSubjects";
import { useDoubts, useVoteDoubt, useUserVotes, useMarkSolved, type DoubtSort } from "@/hooks/useDoubts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, BookOpen, PlusCircle } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export default function TeacherDashboard() {
  const { profile } = useAuth();
  const { data: subjects } = useSubjects();
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedDoubt, setSelectedDoubt] = useState<Tables<"doubts"> | null>(null);
  const [tab, setTab] = useState("unsolved");
  const [sort, setSort] = useState<DoubtSort>("unsolved");

  const { data: doubts } = useDoubts(selectedSubject, tab === "all" ? undefined : tab, sort);
  const { data: userVotes } = useUserVotes(selectedSubject);
  const voteDoubt = useVoteDoubt();
  const markSolved = useMarkSolved();
  const createSubject = useCreateSubject();

  const [newSubjectName, setNewSubjectName] = useState("");
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);

  const handleCreateSubject = () => {
    if (!newSubjectName.trim() || !profile?.branch || !profile?.section) return;
    createSubject.mutate(
      { name: newSubjectName, branch: profile.branch, section: profile.section },
      {
        onSuccess: () => {
          toast.success("Subject created!");
          setNewSubjectName("");
          setSubjectDialogOpen(false);
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
          <div className="min-w-0">
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

              <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-auto h-11">
                    <PlusCircle className="w-4 h-4 mr-1" />New Subject
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
                  <DialogHeader><DialogTitle>Create Subject</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Subject Name</Label>
                      <Input placeholder="e.g. Data Structures" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="h-11 text-base" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will be created for {profile?.branch}-{profile?.section}
                    </p>
                    <Button onClick={handleCreateSubject} className="w-full h-11">Create</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {!selectedSubject ? (
              <Card className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Select a subject to view student doubts</p>
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
                      <p className="text-muted-foreground">No doubts in this section</p>
                    </Card>
                  )}
                  <AnimatePresence>
                    {doubts?.map(d => (
                      <DoubtCard
                        key={d.id}
                        doubt={d}
                        isTeacherView
                        hasVoted={userVotes?.has(d.id)}
                        onVote={() => voteDoubt.mutate({ doubtId: d.id, hasVoted: userVotes?.has(d.id) || false })}
                        onOpen={() => setSelectedDoubt(d)}
                        onMarkSolved={() => {
                          markSolved.mutate(d.id);
                          toast.success("Marked as solved!");
                        }}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          <div className="lg:block">
            <Leaderboard />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedDoubt && (
          <DoubtDetail doubt={selectedDoubt} onClose={() => setSelectedDoubt(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
