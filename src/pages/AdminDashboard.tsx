import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Navbar from "@/components/Navbar";
import DoubtCard from "@/components/DoubtCard";
import DoubtDetail from "@/components/DoubtDetail";
import { useAllDoubtsWithIdentity, useReports, useBlockUser, useUpdateReportStatus, useAllProfiles } from "@/hooks/useAdmin";
import { useCreateSubject } from "@/hooks/useSubjects";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserRoundCheck as UserStar, Users, AlertTriangle, Eye, Ban, CheckCircle, XCircle, PlusCircle, Search } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const BRANCHES = ["CSE", "ECE", "IT", "EEE", "MECH", "CIVIL"];
const SECTIONS = ["A", "B", "C", "D"];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const { data: allDoubts } = useAllDoubtsWithIdentity();
  const { data: reports } = useReports();
  const { data: allProfiles } = useAllProfiles();
  const blockUser = useBlockUser();
  const updateReport = useUpdateReportStatus();
  const createSubject = useCreateSubject();
  const [selectedDoubt, setSelectedDoubt] = useState<Tables<"doubts"> | null>(null);
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectBranch, setNewSubjectBranch] = useState("");
  const [newSubjectSection, setNewSubjectSection] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const reportedDoubts = allDoubts?.filter(d => d.is_reported) || [];
  const blockedUsers = allProfiles?.filter(p => p.is_blocked) || [];

  const handleCreateSubject = () => {
    if (!newSubjectName.trim() || !newSubjectBranch || !newSubjectSection) return;
    createSubject.mutate(
      { name: newSubjectName, branch: newSubjectBranch, section: newSubjectSection },
      {
        onSuccess: () => {
          toast.success("Subject created!");
          setNewSubjectName("");
          setSubjectDialogOpen(false);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-4 sm:py-6 px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <UserStar className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Admin Panel</h1>
          <Dialog open={subjectDialogOpen} onOpenChange={setSubjectDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-10">
                <PlusCircle className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">New Subject</span>
                <span className="sm:hidden">New</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[calc(100vw-1.5rem)] sm:max-w-lg">
              <DialogHeader><DialogTitle>Create Subject</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Subject Name</Label><Input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} placeholder="e.g. Operating Systems" className="h-11 text-base" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Branch</Label><Select value={newSubjectBranch} onValueChange={setNewSubjectBranch}><SelectTrigger className="h-11"><SelectValue placeholder="Branch" /></SelectTrigger><SelectContent>{BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select></div>
                  <div><Label>Section</Label><Select value={newSubjectSection} onValueChange={setNewSubjectSection}><SelectTrigger className="h-11"><SelectValue placeholder="Section" /></SelectTrigger><SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
                </div>
                <Button onClick={handleCreateSubject} className="w-full h-11">Create</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Doubts", value: allDoubts?.length || 0, icon: Eye },
            { label: "Reported", value: reportedDoubts.length, icon: AlertTriangle },
            { label: "Pending Reports", value: reports?.filter(r => r.status === "pending").length || 0, icon: AlertTriangle },
            { label: "Blocked Users", value: blockedUsers.length, icon: Ban },
          ].map((s, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <s.icon className="w-4 h-4" />
                <span className="text-xs">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="doubts">
          <TabsList>
            <TabsTrigger value="doubts">All Doubts</TabsTrigger>
            <TabsTrigger value="reports">
              Reports
              {(reports?.filter(r => r.status === "pending").length || 0) > 0 && (
                <Badge variant="destructive" className="ml-1.5 text-xs h-5">{reports?.filter(r => r.status === "pending").length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          {/* All Doubts with identity — grouped by subject */}
          <TabsContent value="doubts" className="space-y-4 mt-4">
            {/* Filter bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by topic or description..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {(() => {
                    const seen = new Map<string, string>();
                    (allDoubts || []).forEach(d => {
                      const name = (d as any).subjects?.name;
                      if (name && !seen.has(d.subject_id)) seen.set(d.subject_id, name);
                    });
                    return Array.from(seen.entries()).map(([id, name]) => (
                      <SelectItem key={id} value={id}>{name}</SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const q = searchQuery.toLowerCase().trim();
              const filtered = (allDoubts || []).filter(d => {
                if (subjectFilter !== "all" && d.subject_id !== subjectFilter) return false;
                if (q && !d.topic.toLowerCase().includes(q) && !d.description.toLowerCase().includes(q) && !d.anonymous_id.toLowerCase().includes(q)) return false;
                return true;
              });

              const groups = new Map<string, { name: string; items: typeof filtered }>();
              filtered.forEach(d => {
                const name = (d as any).subjects?.name || "Unassigned";
                const key = d.subject_id || "unassigned";
                if (!groups.has(key)) groups.set(key, { name, items: [] as any });
                groups.get(key)!.items!.push(d);
              });

              if (filtered.length === 0) {
                return <Card className="p-8 text-center"><p className="text-muted-foreground">No doubts match your filters</p></Card>;
              }
              return Array.from(groups.entries()).map(([key, g]) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-sm font-semibold text-foreground">{g.name}</h3>
                    <Badge variant="secondary" className="text-xs h-5">{g.items!.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {g.items!.map(d => (
                      <DoubtCard
                        key={d.id}
                        doubt={d}
                        showIdentity
                        realName={(d as any).profiles?.name}
                        onOpen={() => setSelectedDoubt(d)}
                      />
                    ))}
                  </div>
                </div>
              ));
            })()}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-3 mt-4">
            {reports?.length === 0 && <Card className="p-8 text-center"><p className="text-muted-foreground">No reports</p></Card>}
            {reports?.map((r: any) => (
              <Card key={r.id} className={`p-4 ${r.status === "pending" ? "admin-alert" : ""}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[220px]">
                    <p className="font-medium text-foreground">{r.doubts?.topic}</p>
                    <p className="text-sm text-muted-foreground">Anon ID: {r.doubts?.anonymous_id}</p>
                    <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason || "No reason provided"}</p>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      <div className="p-2 rounded-md bg-muted/50 border border-border">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold">Reported by</p>
                        <p className="text-sm font-medium text-foreground">{r.reporter?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground break-all">{r.reporter?.email}</p>
                        <p className="text-xs text-muted-foreground">{r.reporter?.branch}-{r.reporter?.section}</p>
                      </div>
                      <div className="p-2 rounded-md bg-destructive/5 border border-destructive/20">
                        <p className="text-[10px] uppercase text-destructive font-semibold">Flagged user (author)</p>
                        <p className="text-sm font-medium text-foreground">{r.author?.name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground break-all">{r.author?.email}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.author?.branch}-{r.author?.section}
                          {r.author?.is_blocked && <Badge variant="destructive" className="ml-2 text-[10px] h-4">Blocked</Badge>}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => { updateReport.mutate({ reportId: r.id, status: "reviewed" }); toast.success("Report reviewed"); }}>
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />Review
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { updateReport.mutate({ reportId: r.id, status: "dismissed" }); toast.info("Report dismissed"); }}>
                          <XCircle className="w-3.5 h-3.5 mr-1" />Dismiss
                        </Button>
                        {r.author?.user_id && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              blockUser.mutate({ userId: r.author.user_id, block: !r.author.is_blocked });
                              toast.success(r.author.is_blocked ? "User unblocked" : "User blocked");
                            }}
                          >
                            <Ban className="w-3.5 h-3.5 mr-1" />{r.author.is_blocked ? "Unblock" : "Block author"}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          {/* Users */}
          <TabsContent value="users" className="space-y-2 mt-4">
            {allProfiles?.map(p => (
              <Card key={p.id} className={`p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 ${p.is_blocked ? "admin-alert" : ""}`}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground break-all">{(p as any).email}</p>
                    <p className="text-xs text-muted-foreground">{p.role} • {p.branch}-{p.section}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:shrink-0">
                  {p.is_blocked && <Badge variant="destructive">Blocked</Badge>}
                  <Button
                    variant={p.is_blocked ? "outline" : "destructive"}
                    size="sm"
                    className="h-10 flex-1 sm:flex-initial"
                    onClick={() => {
                      blockUser.mutate({ userId: p.user_id, block: !p.is_blocked });
                      toast.success(p.is_blocked ? "User unblocked" : "User blocked");
                    }}
                  >
                    <Ban className="w-3.5 h-3.5 mr-1" />
                    {p.is_blocked ? "Unblock" : "Block"}
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      <AnimatePresence>
        {selectedDoubt && <DoubtDetail doubt={selectedDoubt} onClose={() => setSelectedDoubt(null)} />}
      </AnimatePresence>
    </div>
  );
}
