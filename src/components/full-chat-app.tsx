import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage, useT, langLabel } from "@/lib/i18n";
import { translateMessage } from "@/lib/translate.functions";
import type { Site } from "@/components/site-selector-dialog";
import {
  Send,
  Loader2,
  Hash,
  User,
  Building2,
  Trash2,
  ArrowLeft,
  Search,
  MoreVertical,
  Plus,
  Camera,
  Pencil,
  X,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PhotoReportDialog } from "@/components/photo-report-dialog";

type ChannelType = "general" | "direct" | "site";

interface DbMessage {
  id: string;
  channel_type: ChannelType;
  channel_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  source_lang: string;
  created_at: string;
}

interface FullChatAppProps {
  onClose?: () => void;
  sites?: Site[];
  initialChannelType?: ChannelType;
  initialChannelId?: string;
}

export function FullChatApp({
  onClose,
  sites = [],
  initialChannelType = "general",
  initialChannelId = "general",
}: FullChatAppProps) {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const { lang, tName } = useLanguage();
  const t = useT();

  const [activeChannelType, setActiveChannelType] = useState<ChannelType>(initialChannelType);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mutedChannels, setMutedChannels] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingPhotoReportMessage, setEditingPhotoReportMessage] = useState<DbMessage | null>(
    null,
  );

  const editingPhotoReportInitialData = useMemo(() => {
    if (!editingPhotoReportMessage) return null;
    const parts = editingPhotoReportMessage.content.replace("[PHOTO_REPORT] ", "").split(" | ");
    return {
      photoPath: parts[0] || null,
      criticality: parts[1] || "info",
      description: parts.length >= 3 ? parts.slice(2).join(" | ") : "",
    };
  }, [editingPhotoReportMessage]);

  useEffect(() => {
    const saved = localStorage.getItem("muted_channels");
    if (saved) {
      try {
        setMutedChannels(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  function toggleMute() {
    const cid = activeChannelId;
    let newMuted = [...mutedChannels];
    if (newMuted.includes(cid)) {
      newMuted = newMuted.filter((x) => x !== cid);
    } else {
      newMuted.push(cid);
    }
    setMutedChannels(newMuted);
    toast.success(
      newMuted.includes(cid) ? t("chat.notifications.disabled") : t("chat.notifications.enabled"),
    );
  }

  async function handleClearHistory() {
    if (!user) return;
    if (activeChannelType !== "direct" && !isSuperAdmin) {
      toast.error("Только супер-админ может очищать историю общих чатов");
      return;
    }

    // In direct chat, allow users to delete it.
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("channel_type", activeChannelType)
      .eq("channel_id", activeChannelId);

    if (error) {
      toast.error("Ошибка при удалении истории");
      console.error(error);
    } else {
      toast.success("История чата очищена");
      setRefreshKey((prev) => prev + 1);
    }
  }

  async function handleDeleteChat(chatId: string) {
    if (!user) return;

    // Optimistic update
    setDmMessages((prev) => prev.filter((m) => m.channel_id !== chatId));

    if (activeChannelType === "direct" && activeChannelId === chatId) {
      setActiveChannelType("general");
      setActiveChannelId("general");
    }

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("channel_type", "direct")
      .eq("channel_id", chatId);

    if (error) {
      toast.error("Ошибка при удалении чата");
      console.error(error);
    } else {
      toast.success("Чат удален");
    }
  }

  async function handlePhotoReportSuccess(data: {
    photoPath: string | null;
    description: string;
    criticality: string;
  }) {
    if (!user) return;
    const authorName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      t("admin.users.employee", { defaultValue: "Сотрудник" });
    const text = `[PHOTO_REPORT] ${data.photoPath || ""} | ${data.criticality} | ${data.description}`;
    const { error } = await supabase.from("chat_messages").insert({
      channel_type: activeChannelType,
      channel_id: activeChannelId,
      author_id: user.id,
      author_name: authorName,
      content: text,
      source_lang: lang,
    });
    if (error) {
      toast.error(t("chat.sendFailed"));
      console.error(error);
    }
  }

  // Auto-close sidebar on mobile when selecting a channel
  function handleSelectChannel(type: ChannelType, id: string) {
    setActiveChannelType(type);
    setActiveChannelId(id);
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }

  const [profiles, setProfiles] = useState<
    { id: string; full_name: string | null; avatar_url: string | null }[]
  >([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const [dmMessages, setDmMessages] = useState<{ channel_id: string }[]>([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("is_active", true)
      .then((res) => {
        if (res.data) setProfiles(res.data);
      });

    // We only need channel_id to extract unique chats
    if (user) {
      setLoadingChannels(true);
      supabase
        .from("chat_messages")
        .select("channel_id")
        .eq("channel_type", "direct")
        .like("channel_id", `%${user.id}%`)
        .then((res) => {
          if (res.data) setDmMessages(res.data as { channel_id: string }[]);
          setLoadingChannels(false);
        });
    } else {
      setLoadingChannels(false);
    }
  }, [user]);

  const dmChannels = useMemo(() => {
    if (!user) return [];
    const uniqueIds = Array.from(new Set(dmMessages.map((m) => m.channel_id)));
    return uniqueIds.map((cid) => {
      const parts = cid.split("_");
      const otherId = parts[1] === user.id ? parts[2] : parts[1];
      const otherProfile = profiles.find((p) => p.id === otherId);
      return {
        id: cid,
        otherId,
        name: tName(otherProfile?.full_name || "Unknown"),
        avatarUrl: otherProfile?.avatar_url || null,
      };
    });
  }, [dmMessages, user, profiles]);

  const availableUsers = useMemo(() => {
    return profiles.filter((p) => p.id !== user?.id);
  }, [profiles, user]);

  function startDm(otherId: string) {
    if (!user) return;
    const ids = [user.id, otherId].sort();
    const cid = `dm_${ids[0]}_${ids[1]}`;
    // Add locally to update UI instantly without waiting for db fetch
    setDmMessages((prev) => [...prev, { channel_id: cid }]);
    handleSelectChannel("direct", cid);
    setShowNewChat(false);
  }

  const activeChannelTitle = useMemo(() => {
    if (activeChannelType === "general") return t("chat.generalTitle");
    if (activeChannelType === "direct") {
      const dm = dmChannels.find((d) => d.id === activeChannelId);
      return dm ? tName(dm.name) : t("chat.directTitle");
    }
    if (activeChannelType === "site") {
      const s = sites.find((x) => x.id === activeChannelId);
      return s ? t("chat.siteTitle", { name: tName(s.name) }) : t("chat.tabSite");
    }
    return "";
  }, [activeChannelType, activeChannelId, sites, t, dmChannels]);

  const activeChannelSubtitle = useMemo(() => {
    if (activeChannelType === "direct") return t("chat.directTitle");
    if (activeChannelType === "site") {
      const s = sites.find((x) => x.id === activeChannelId);
      return s?.address ?? undefined;
    }
    return undefined;
  }, [activeChannelType, activeChannelId, sites, t]);

  return (
    <div className="flex h-full w-full bg-background overflow-hidden relative">
      {/* SIDEBAR */}
      <div
        className={cn(
          "absolute md:relative z-20 flex-col w-full md:w-80 h-full bg-card border-r transition-transform duration-200",
          sidebarOpen ? "flex translate-x-0" : "hidden md:flex -translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center p-4 border-b h-14 shrink-0 gap-2">
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h2 className="font-semibold text-lg flex-1">{t("chat.title")}</h2>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0 hidden md:flex"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-4">
            {/* General & Direct */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                {t("chat.sidebar.main")}
              </h3>
              <div className="space-y-1">
                <ChannelButton
                  active={activeChannelType === "general"}
                  icon={<Hash className="h-4 w-4" />}
                  title={t("chat.generalTitle")}
                  onClick={() => handleSelectChannel("general", "general")}
                />
              </div>
            </div>

            {/* Direct Messages */}
            <div>
              <div className="flex items-center justify-between mb-2 px-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t("chat.directTitle")}
                </h3>
                <button
                  onClick={() => setShowNewChat(!showNewChat)}
                  className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {showNewChat && (
                <div className="px-2 pb-2 mb-2 space-y-0.5 max-h-40 overflow-y-auto border-b border-muted">
                  {availableUsers.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startDm(p.id)}
                      className="w-full flex items-center gap-3 px-3 py-1.5 text-sm rounded-lg hover:bg-muted text-foreground transition-colors"
                    >
                      <User className="h-3.5 w-3.5 opacity-50" />
                      <span className="truncate flex-1 text-left">
                        {tName(p.full_name || "Unknown")}
                      </span>
                    </button>
                  ))}
                  {availableUsers.length === 0 && (
                    <div className="text-xs text-muted-foreground px-3 py-2">
                      {t("chat.sidebar.noUsers")}
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {dmChannels.length === 0 && !showNewChat && !loadingChannels && (
                  <div className="text-xs text-muted-foreground px-3 py-2 italic opacity-60">
                    {t("chat.sidebar.noActiveChats")}
                  </div>
                )}
                {dmChannels.length === 0 && loadingChannels && (
                  <div className="text-xs text-muted-foreground px-3 py-2 italic opacity-60 animate-pulse">
                    {t("chat.sidebar.loading")}
                  </div>
                )}
                {dmChannels.map((dm) => (
                  <ChannelButton
                    key={dm.id}
                    active={activeChannelType === "direct" && activeChannelId === dm.id}
                    icon={<User className="h-4 w-4" />}
                    title={tName(dm.name)}
                    onClick={() => handleSelectChannel("direct", dm.id)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(dm.id);
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Sites */}
            {sites.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  {t("chat.sidebar.sites")} ({sites.length})
                </h3>
                <div className="space-y-1">
                  {sites.map((s) => (
                    <ChannelButton
                      key={s.id}
                      active={activeChannelType === "site" && activeChannelId === s.id}
                      icon={<Building2 className="h-4 w-4" />}
                      title={tName(s.name)}
                      onClick={() => handleSelectChannel("site", s.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col h-full bg-muted/20 min-w-0">
        <div className="h-14 border-b bg-card flex items-center px-4 shrink-0 gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden shrink-0 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex flex-col flex-1 min-w-0">
            <h3 className="font-semibold truncate leading-tight">{activeChannelTitle}</h3>
            {activeChannelSubtitle && (
              <span className="text-xs text-muted-foreground truncate leading-tight">
                {activeChannelSubtitle}
              </span>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setInfoDialogOpen(true)}>
                {t("chat.info.title")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMediaDialogOpen(true)}>
                {t("chat.media.title")}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleMute}>
                {mutedChannels.includes(activeChannelId)
                  ? t("chat.menu.enableNotif")
                  : t("chat.menu.disableNotif")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleClearHistory}
                className="text-destructive"
                disabled={activeChannelType !== "direct" && !isSuperAdmin}
              >
                {t("chat.menu.clearHistory")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex-1 min-h-0 relative">
          <ChannelContent
            key={`${activeChannelType}-${activeChannelId}-${refreshKey}`}
            channelType={activeChannelType}
            channelId={activeChannelId}
            profiles={profiles}
            onOpenReport={() => setReportOpen(true)}
            onEditPhotoReport={(msg) => setEditingPhotoReportMessage(msg)}
          />
        </div>
      </div>

      <PhotoReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        site={sites.find((s) => s.id === activeChannelId) || sites[0] || null}
        skipDbInsert={activeChannelType !== "site"}
        onSuccess={handlePhotoReportSuccess}
      />

      <PhotoReportDialog
        open={!!editingPhotoReportMessage}
        onOpenChange={(o) => !o && setEditingPhotoReportMessage(null)}
        site={sites.find((s) => s.id === activeChannelId) || sites[0] || null}
        skipDbInsert={true}
        initialData={editingPhotoReportInitialData}
        onSuccess={async (data) => {
          if (!editingPhotoReportMessage) return;
          const newContent = `[PHOTO_REPORT] ${data.photoPath || ""} | ${data.criticality} | ${data.description}`;
          const { data: updatedData, error } = await supabase
            .from("chat_messages")
            .update({ content: newContent, source_lang: lang })
            .eq("id", editingPhotoReportMessage.id)
            .select();

          if (error) {
            throw error;
          }

          if (data.photoPath) {
            await supabase.from("photo_reports").update({
              description: data.description || null,
              criticality: data.criticality
            }).eq("photo_url", data.photoPath);
          }
          if (!updatedData || updatedData.length === 0) {
            throw new Error(
              "Не удалось применить изменения: возможно, нет прав на редактирование.",
            );
          }

          document.dispatchEvent(
            new CustomEvent("localMessageUpdate", {
              detail: { id: editingPhotoReportMessage.id, content: newContent },
            }),
          );

          setEditingPhotoReportMessage(null);
        }}
      />

      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("chat.info.title")}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {t("chat.info.name")}
              </p>
              <p className="font-semibold text-lg">{activeChannelTitle}</p>
            </div>
            {activeChannelSubtitle && (
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">
                  {t("chat.info.additional")}
                </p>
                <p className="text-sm">{activeChannelSubtitle}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {t("chat.info.type")}
              </p>
              <p className="text-sm">
                {activeChannelType === "general"
                  ? t("chat.type.general")
                  : activeChannelType === "direct"
                    ? t("chat.type.direct")
                    : t("chat.type.site")}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">
                {t("chat.info.notifications")}
              </p>
              <p className="text-sm">
                {mutedChannels.includes(activeChannelId)
                  ? t("chat.info.notif.disabled")
                  : t("chat.info.notif.enabled")}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ChatMediaDialog
        open={mediaDialogOpen}
        onOpenChange={setMediaDialogOpen}
        channelType={activeChannelType}
        channelId={activeChannelId}
      />
    </div>
  );
}

function ChannelButton({
  active,
  icon,
  title,
  onClick,
  onDelete,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  return (
    <div className="relative group flex items-center">
      <button
        onClick={onClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left",
          active
            ? "bg-primary text-primary-foreground font-medium shadow-sm"
            : "hover:bg-muted text-foreground",
          onDelete ? "pr-10" : "",
        )}
      >
        <div className={cn("shrink-0 opacity-80", active && "opacity-100")}>{icon}</div>
        <span className="truncate flex-1">{title}</span>
      </button>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute right-2 p-1.5 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Message Logic (Extracted from old ChatDialog)
// ----------------------------------------------------------------------

function ChannelContent({
  channelType,
  channelId,
  profiles,
  onOpenReport,
  onEditPhotoReport,
}: {
  channelType: ChannelType;
  channelId: string;
  profiles: { id: string; avatar_url: string | null }[];
  onOpenReport?: () => void;
  onEditPhotoReport?: (m: DbMessage) => void;
}) {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const { lang } = useLanguage();
  const t = useT();

  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<DbMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleLocalUpdate = (e: any) => {
      setMessages((prev) =>
        prev.map((x) => (x.id === e.detail.id ? { ...x, content: e.detail.content } : x)),
      );
    };
    const handleLocalDelete = (e: any) => {
      if (e.detail?.ids) {
        setMessages((prev) => prev.filter((x) => !e.detail.ids.includes(x.id)));
      }
    };
    document.addEventListener("localMessageUpdate", handleLocalUpdate);
    document.addEventListener("localMessageDelete", handleLocalDelete);

    setLoading(true);
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    (async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("channel_type", channelType)
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (!cancelled) {
        if (error) console.error(error);
        setMessages((data ?? []) as DbMessage[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`chat_full:${channelType}:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const m = payload.new as DbMessage;
          if (m.channel_type !== channelType) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const m = payload.new as DbMessage;
          if (m.channel_type !== channelType) return;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chat_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          setMessages((prev) => prev.filter((x) => x.id !== old.id));
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      document.removeEventListener("localMessageUpdate", handleLocalUpdate);
      document.removeEventListener("localMessageDelete", handleLocalDelete);
      supabase.removeChannel(channel);
    };
  }, [channelType, channelId]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  async function send() {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);

    if (editingMessage) {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content: text, source_lang: lang })
        .eq("id", editingMessage.id);

      setSending(false);
      if (error) {
        toast.error("Ошибка при редактировании");
        console.error(error);
        return;
      }
      setInput("");
      setEditingMessage(null);
      return;
    }

    const authorName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      t("admin.users.employee", { defaultValue: "Сотрудник" });
    const { error } = await supabase.from("chat_messages").insert({
      channel_type: channelType,
      channel_id: channelId,
      author_id: user.id,
      author_name: authorName,
      content: text,
      source_lang: lang,
    });
    setSending(false);
    if (error) {
      toast.error(t("chat.sendFailed"));
      console.error(error);
      return;
    }
    setInput("");
  }

  async function deleteMessage(id: string) {
    if (!confirm("Удалить сообщение?")) return;

    const msg = messages.find((m) => m.id === id);

    // Optimistic delete
    setMessages((prev) => prev.filter((x) => x.id !== id));

    const { error } = await supabase.from("chat_messages").delete().eq("id", id);

    if (!error && msg?.content.startsWith("[PHOTO_REPORT] ")) {
      const parts = msg.content.replace("[PHOTO_REPORT] ", "").split(" | ");
      const photoPath = parts[0];
      if (photoPath) {
        await supabase.from("photo_reports").delete().eq("photo_url", photoPath);
      }
    }

    if (error) {
      toast.error("Ошибка при удалении");
    }
  }

  if (loading) {
    return (
      <div className="h-full grid place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground opacity-50" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full absolute inset-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full grid place-items-center text-center text-sm text-muted-foreground opacity-70">
            {t("chat.noMessages")}
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              onDelete={deleteMessage}
              onEdit={(msg) => {
                if (msg.content.startsWith("[PHOTO_REPORT] ")) {
                  onEditPhotoReport?.(msg);
                } else {
                  setEditingMessage(msg);
                  setInput(msg.content);
                }
              }}
              avatarUrl={profiles.find((p) => p.id === m.author_id)?.avatar_url || null}
            />
          ))
        )}
      </div>
      <div className="p-3 bg-card border-t shrink-0">
        <div className="flex flex-col gap-2 max-w-4xl mx-auto">
          {editingMessage && (
            <div className="flex items-center justify-between bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-sm mb-1">
              <span className="flex items-center gap-2 truncate font-medium">
                <Pencil className="h-3.5 w-3.5 shrink-0" />
                Редактирование сообщения
              </span>
              <button
                onClick={() => {
                  setEditingMessage(null);
                  setInput("");
                }}
                className="p-1 hover:bg-black/5 rounded-full transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted/50"
              onClick={() => onOpenReport?.()}
              title={t("report.create")}
              disabled={!!editingMessage}
            >
              <Camera className="h-5 w-5" />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={t("chat.placeholder", { lang: langLabel(lang) })}
              className="rounded-full bg-muted/50 border-transparent focus-visible:ring-1"
              disabled={sending}
            />
            <Button
              size="icon"
              className="rounded-full shrink-0"
              disabled={!input.trim() || sending}
              onClick={send}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  m,
  onDelete,
  onEdit,
  avatarUrl,
}: {
  m: DbMessage;
  onDelete: (id: string) => void;
  onEdit: (m: DbMessage) => void;
  avatarUrl: string | null;
}) {
  const { user, roles } = useAuth();
  const { lang, tName } = useLanguage();
  const t = useT();
  const isMine = m.author_id === user?.id;
  const isSuperAdmin = roles.includes("super_admin");
  const timeStr = new Date(m.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const needsTranslate = m.source_lang !== lang;
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);

  useEffect(() => {
    if (!needsTranslate) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    setTranslating(true);
    translateMessage({
      text: m.content,
      sourceLang: m.source_lang,
      targetLang: lang,
    })
      .then((res) => {
        if (!cancelled) setTranslated(res.translated);
      })
      .catch((e) => {
        console.error("translate failed", e);
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });
    return () => {
      cancelled = true;
    };
  }, [m.id, m.content, m.source_lang, lang, needsTranslate]);

  const isPhotoReport = m.content.startsWith("[PHOTO_REPORT] ");
  let photoPath = "";
  let criticality = "";
  let description = m.content;
  if (isPhotoReport) {
    const parts = m.content.replace("[PHOTO_REPORT] ", "").split(" | ");
    if (parts.length >= 3) {
      photoPath = parts[0];
      criticality = parts[1];
      description = parts.slice(2).join(" | ");
    }
  }

  return (
    <div className={cn("flex w-full gap-2", isMine ? "justify-end" : "justify-start")}>
      {!isMine && (
        <Avatar className="h-8 w-8 mt-auto shrink-0">
          <AvatarImage src={avatarUrl || ""} />
          <AvatarFallback>
            {tName(m.author_name || "")
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={cn("flex flex-col gap-1 w-full", isMine ? "items-end" : "items-start")}>
        <div
          className={cn(
            "max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2 relative group",
            isMine
              ? "bg-primary text-primary-foreground rounded-br-none"
              : "bg-card border rounded-bl-none shadow-sm",
          )}
        >
          {!isMine && (
            <div className="text-[11px] font-semibold opacity-70 mb-0.5">
              {tName(m.author_name || "")}
            </div>
          )}

          {isPhotoReport && photoPath && (
            <>
              <div
                className="mb-2 rounded-lg overflow-hidden border bg-black/5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setImagePreviewOpen(true)}
              >
                <img
                  src={
                    supabase.storage.from("photo-reports").getPublicUrl(photoPath).data.publicUrl
                  }
                  alt="report"
                  className="w-full h-auto object-cover max-h-64"
                />
              </div>
              <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
                <DialogContent
                  className="max-w-4xl bg-transparent border-none shadow-none p-0 flex justify-center cursor-pointer"
                  onClick={() => setImagePreviewOpen(false)}
                >
                  <DialogTitle className="sr-only">Предпросмотр фото</DialogTitle>
                  <img
                    src={
                      supabase.storage.from("photo-reports").getPublicUrl(photoPath).data.publicUrl
                    }
                    alt="report"
                    className="max-w-full max-h-[85vh] object-contain rounded-xl pointer-events-none"
                  />
                </DialogContent>
              </Dialog>
            </>
          )}
          <div className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
            {description}
          </div>

          {needsTranslate && (
            <div
              className={cn(
                "mt-1.5 pt-1.5 border-t",
                isMine ? "border-primary-foreground/20" : "border-foreground/10",
              )}
            >
              {translating && !translated ? (
                <span className="inline-flex items-center gap-2 opacity-80 text-xs italic">
                  <Loader2 className="h-3 w-3 animate-spin" />…
                </span>
              ) : (
                <p className="whitespace-pre-wrap wrap-break-word text-xs opacity-90">
                  {translated ?? ""}
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              "text-[10px] mt-1 flex items-center justify-end gap-1 opacity-60",
              isMine ? "text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {timeStr}
          </div>

          {(isSuperAdmin || isMine) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "absolute top-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all p-1.5 rounded-full bg-background border shadow-sm z-10",
                    isMine
                      ? "-left-10 text-foreground hover:bg-accent"
                      : "-right-10 text-foreground hover:bg-accent",
                  )}
                  title="Опции"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isMine ? "end" : "start"}>
                {isMine && (
                  <DropdownMenuItem onClick={() => onEdit(m)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Редактировать
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(m.id)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Удалить
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      {isMine && (
        <Avatar className="h-8 w-8 mt-auto shrink-0">
          <AvatarImage src={avatarUrl || ""} />
          <AvatarFallback>
            {tName(m.author_name || "")
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}

function ChatMediaDialog({
  open,
  onOpenChange,
  channelType,
  channelId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelType: "general" | "direct" | "site";
  channelId: string;
}) {
  const t = useT();
  const [photos, setPhotos] = useState<{ id: string; url: string; path: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSelectionMode(false);
      setSelected([]);
      setPreviewUrl(null);
      return;
    }
    setLoading(true);
    supabase
      .from("chat_messages")
      .select("id, content")
      .eq("channel_type", channelType)
      .eq("channel_id", channelId)
      .like("content", "[PHOTO_REPORT]%")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          const loaded = data.map((m) => {
            const parts = m.content.replace("[PHOTO_REPORT] ", "").split(" | ");
            const photoPath = parts[0];
            return {
              id: m.id,
              path: photoPath,
              url: supabase.storage.from("photo-reports").getPublicUrl(photoPath).data.publicUrl,
            };
          });
          setPhotos(loaded);
        }
        setLoading(false);
      });
  }, [open, channelType, channelId]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    if (!confirm(t("chat.media.deleteConfirm").replace("{{count}}", selected.length.toString())))
      return;

    const pathsToDelete = photos.filter((p) => selected.includes(p.id)).map((p) => p.path);
    if (pathsToDelete.length > 0) {
      await supabase.storage.from("photo-reports").remove(pathsToDelete);
    }

    const { error } = await supabase.from("chat_messages").delete().in("id", selected);
    if (error) {
      toast.error("Ошибка при удалении");
    } else {
      toast.success("Удалено");
      document.dispatchEvent(new CustomEvent("localMessageDelete", { detail: { ids: selected } }));
      setPhotos((prev) => prev.filter((p) => !selected.includes(p.id)));
      setSelected([]);
      setSelectionMode(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 bg-background overflow-hidden">
          <div className="p-4 border-b flex flex-row items-center justify-between shadow-sm">
            <DialogTitle className="text-lg">{t("chat.media.title")}</DialogTitle>
            <div className="flex items-center gap-2 mr-8">
              {selectionMode ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectionMode(false);
                      setSelected([]);
                    }}
                  >
                    {t("chat.media.cancel")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={selected.length === 0}
                    onClick={handleDelete}
                  >
                    {t("chat.media.delete")} ({selected.length})
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                  disabled={photos.length === 0}
                >
                  {t("chat.media.select")}
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="flex-1 p-4">
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
                <Camera className="h-12 w-12 mb-2 opacity-20" />
                <p>{t("chat.media.noMedia")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 pb-4">
                {photos.map((photo) => {
                  const isSelected = selected.includes(photo.id);
                  return (
                    <button
                      key={photo.id}
                      onClick={() => {
                        if (selectionMode) {
                          toggleSelect(photo.id);
                        } else {
                          setPreviewUrl(photo.url);
                        }
                      }}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden border bg-muted group",
                        selectionMode && isSelected && "ring-2 ring-primary",
                      )}
                    >
                      <img
                        src={photo.url}
                        alt="media"
                        className={cn(
                          "w-full h-full object-cover transition-all",
                          selectionMode && isSelected && "scale-90 rounded-lg",
                        )}
                        loading="lazy"
                      />
                      {selectionMode && (
                        <div className="absolute top-1.5 right-1.5 z-10">
                          <CheckCircle2
                            className={cn(
                              "h-5 w-5",
                              isSelected ? "text-primary fill-background" : "text-white/70",
                            )}
                          />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!previewUrl}
        onOpenChange={(o) => {
          if (!o) setPreviewUrl(null);
        }}
      >
        <DialogContent
          className="max-w-4xl p-0 overflow-hidden bg-black/90 border-none flex items-center justify-center h-[90vh] cursor-pointer"
          onClick={() => setPreviewUrl(null)}
        >
          {previewUrl && (
            <img
              src={previewUrl}
              alt="preview"
              className="max-w-full max-h-[90vh] object-contain pointer-events-none"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
