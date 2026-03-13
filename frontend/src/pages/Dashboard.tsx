import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getMyPages, deletePage, updatePage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  MessageSquare,
  Copy,
  LogOut,
  Share2,
  Star,
  TrendingUp,
  ShieldCheck,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface FeedbackPage {
  id: string;
  title: string;
  slug: string;
  question: string;
  response_count: number;
}

const Dashboard = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [pages, setPages] = useState<FeedbackPage[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<FeedbackPage | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editQuestion, setEditQuestion] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<FeedbackPage | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    getMyPages()
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, []);

  const copyLink = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast("Link copied — now share it somewhere real.");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const openEdit = (e: React.MouseEvent, page: FeedbackPage) => {
    e.stopPropagation();
    setEditTitle(page.title);
    setEditQuestion(page.question);
    setEditTarget(page);
  };

  const openDelete = (e: React.MouseEvent, page: FeedbackPage) => {
    e.stopPropagation();
    setDeleteTarget(page);
  };

  const handleEditSave = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    try {
      await updatePage(editTarget.slug, {
        title: editTitle,
        question: editQuestion,
      });
      setPages((prev) =>
        prev.map((p) =>
          p.id === editTarget.id
            ? { ...p, title: editTitle, question: editQuestion }
            : p,
        ),
      );
      toast("Page updated.");
      setEditTarget(null);
    } catch (e: any) {
      toast(e.message || "Failed to update page.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await deletePage(deleteTarget.slug);
      setPages((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      toast("Page deleted.");
      setDeleteTarget(null);
    } catch (e: any) {
      toast(e.message || "Failed to delete page.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalResponses = pages.reduce(
    (sum, p) => sum + (p.response_count || 0),
    0,
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container flex items-center justify-between h-14 max-w-3xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm tracking-wide uppercase">Openlet</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="gap-1.5">
              <Link to="/create">
                <Plus className="w-3.5 h-3.5" />
                New page
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-3xl py-12">
        {/* Stats bar */}
        {!loading && pages.length > 0 && (
          <div className="flex items-center gap-8 mb-10 pb-10 border-b border-border">
            <div>
              <p className="text-2xl">{pages.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pages.length === 1 ? "Feedback page" : "Feedback pages"}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div>
              <p className="text-2xl">{totalResponses}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {totalResponses === 1 ? "Total response" : "Total responses"}
              </p>
            </div>
            <Separator orientation="vertical" className="h-8" />
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground">100% anonymous</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl">Your feedback pages</h1>
        </div>

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : pages.length === 0 ? (
          <div className="space-y-6">
            <Card>
              <CardContent className="py-14 px-8 text-center">
                <div className="w-12 h-12 rounded-full border border-border flex items-center justify-center mx-auto mb-5">
                  <MessageSquare className="w-5 h-5 text-muted-foreground" />
                </div>
                <h3 className="text-lg mb-2">
                  You haven't created any pages yet
                </h3>
                <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                  A feedback page takes 30 seconds to create. Share the link and
                  start hearing what people actually think.
                </p>
                <Button asChild className="gap-1.5">
                  <Link to="/create">
                    <Plus className="w-3.5 h-3.5" />
                    Create your first page
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              {[
                {
                  icon: Share2,
                  title: "Share anywhere",
                  body: "A link works in any bio, email, or doc. No app to download.",
                },
                {
                  icon: Star,
                  title: "Rated + written",
                  body: "Star ratings tell you how people feel. Written answers tell you why.",
                },
                {
                  icon: TrendingUp,
                  title: "Honest by design",
                  body: "Anonymity changes what people say. You'll learn things you never would otherwise.",
                },
              ].map(({ icon: Icon, title, body }) => (
                <Card key={title}>
                  <CardContent className="pt-5 pb-5 px-4">
                    <Icon className="w-4 h-4 text-primary mb-3" />
                    <p className="text-sm mb-1">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {body}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <Card
                key={page.id}
                className="group hover:border-foreground/20 transition-colors cursor-pointer"
                onClick={() => navigate(`/p/${page.slug}/responses`)}
              >
                <CardContent className="py-5 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm truncate">{page.title}</h3>
                        {page.response_count === 0 && (
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            No responses yet
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mb-3">
                        {page.question}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {page.response_count === 0
                            ? "Share your link to get your first response"
                            : `${page.response_count} ${page.response_count === 1 ? "response" : "responses"}`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => copyLink(e, page.slug)}
                        className="gap-1.5 text-xs"
                      >
                        <Copy className="w-3 h-3" />
                        Copy link
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={(e) => openEdit(e, page)}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive"
                            onClick={(e) => openDelete(e, page)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground mb-3">
                Different audiences, different questions. Each page gives you a
                new angle.
              </p>
              <Button variant="outline" size="sm" asChild className="gap-1.5">
                <Link to="/create">
                  <Plus className="w-3.5 h-3.5" />
                  Create another page
                </Link>
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* ── Edit dialog ───────────────────────────────────────────────────── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(o) => !o && setEditTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit page</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-question">Question</Label>
              <Textarea
                id="edit-question"
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleEditSave}
              disabled={editSaving || !editTitle.trim() || !editQuestion.trim()}
            >
              {editSaving ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ───────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the page and all{" "}
              {deleteTarget?.response_count ?? 0} response
              {(deleteTarget?.response_count ?? 0) !== 1 ? "s" : ""} associated
              with it. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete page"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;