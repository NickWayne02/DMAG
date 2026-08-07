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
  const { lang } = useLanguage();
  const t = useT();

  const [activeChannelType, setActiveChannelType] = useState<ChannelType>(initialChannelType);
  const [activeChannelId, setActiveChannelId] = useState<string>(initialChannelId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [mutedChannels, setMutedChannels] = useState<string[]>([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [editingPhotoReportMessage, setEditingPhotoReportMessage] = useState<DbMessage | null>(null);

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
    localStorage.setItem("muted_channels", JSON.stringify(newMuted));
    toast.success(newMuted.includes(cid) ? "Уведомления отключены" : "Уведомления включены");
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

  async function handlePhotoReportSuccess(data: { photoPath: string | null; description: string; criticality: string }) {
    if (!user) return;
    const authorName = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Сотрудник";
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
      supabase
        .from("chat_messages")
        .select("channel_id")
        .eq("channel_type", "direct")
        .like("channel_id", `%${user.id}%`)
        .then((res) => {
          if (res.data) setDmMessages(res.data as { channel_id: string }[]);
        });
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
        name: otherProfile?.full_name || "Unknown",
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
      return dm ? dm.name : t("chat.directTitle");
    }
    if (activeChannelType === "site") {
      const s = sites.find((x) => x.id === activeChannelId);
      return s ? t("chat.siteTitle", { name: s.name }) : t("chat.tabSite");
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
                Основные
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
                      <span className="truncate flex-1 text-left">{p.full_name || "Unknown"}</span>
                    </button>
                  ))}
                  {availableUsers.length === 0 && (
                    <div className="text-xs text-muted-foreground px-3 py-2">Нет пользователей</div>
                  )}
                </div>
              )}

              <div className="space-y-1">
                {dmChannels.length === 0 && !showNewChat && (
                  <div className="text-xs text-muted-foreground px-3 py-2 italic opacity-60">
                    Нет активных чатов
                  </div>
                )}
                {dmChannels.map((dm) => (
                  <ChannelButton
                    key={dm.id}
                    active={activeChannelType === "direct" && activeChannelId === dm.id}
                    icon={<User className="h-4 w-4" />}
                    title={dm.name}
                    onClick={() => handleSelectChannel("direct", dm.id)}
                  />
                ))}
              </div>
            </div>

            {/* Sites */}
            {sites.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                  Объекты ({sites.length})
                </h3>
                <div className="space-y-1">
                  {sites.map((s) => (
                    <ChannelButton
                      key={s.id}
                      active={activeChannelType === "site" && activeChannelId === s.id}
                      icon={<Building2 className="h-4 w-4" />}
                      title={s.name}
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
                Информация о чате
              </DropdownMenuItem>
              <DropdownMenuItem onClick={toggleMute}>
                {mutedChannels.includes(activeChannelId)
                  ? "Включить уведомления"
                  : "Отключить уведомления"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleClearHistory}
                className="text-destructive"
                disabled={activeChannelType !== "direct" && !isSuperAdmin}
              >
                Очистить историю
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
        site={sites.find(s => s.id === activeChannelId) || sites[0] || null}
        onSuccess={handlePhotoReportSuccess}
      />

      <PhotoReportDialog
        open={!!editingPhotoReportMessage}
        onOpenChange={(o) => !o && setEditingPhotoReportMessage(null)}
        site={sites.find(s => s.id === activeChannelId) || sites[0] || null}
        skipDbInsert={true}
        initialData={editingPhotoReportInitialData}
        onSuccess={async (data) => {
          if (!editingPhotoReportMessage) return;
          const newContent = `[PHOTO_REPORT] ${data.photoPath || ""} | ${data.criticality} | ${data.description}`;
          const { error } = await supabase
            .from("chat_messages")
            .update({ content: newContent, source_lang: lang })
            .eq("id", editingPhotoReportMessage.id);
          
          if (error) {
            throw error;
          }
          setEditingPhotoReportMessage(null);
        }}
      />

      <Dialog open={infoDialogOpen} onOpenChange={setInfoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Информация о чате</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Название</p>
              <p className="font-semibold text-lg">{activeChannelTitle}</p>
            </div>
            {activeChannelSubtitle && (
              <div>
                <p className="text-sm text-muted-foreground font-medium mb-1">Дополнительно</p>
                <p className="text-sm">{activeChannelSubtitle}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Тип чата</p>
              <p className="text-sm">
                {activeChannelType === "general"
                  ? "Общий канал (для всей команды)"
                  : activeChannelType === "direct"
                    ? "Личные сообщения (приватный)"
                    : "Чат объекта"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-1">Уведомления</p>
              <p className="text-sm">
                {mutedChannels.includes(activeChannelId) ? "Отключены" : "Включены"}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ChannelButton({
  active,
  icon,
  title,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors text-left",
        active
          ? "bg-primary text-primary-foreground font-medium shadow-sm"
          : "hover:bg-muted text-foreground",
      )}
    >
      <div className={cn("shrink-0 opacity-80", active && "opacity-100")}>{icon}</div>
      <span className="truncate flex-1">{title}</span>
    </button>
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
      (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Сотрудник";
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
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) {
      toast.error(t("chat.deleteFailed"));
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
              <button onClick={() => { setEditingMessage(null); setInput(""); }} className="p-1 hover:bg-black/5 rounded-full transition-colors">
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
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
  const { lang } = useLanguage();
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
          <AvatarFallback>{(m.author_name || "").substring(0, 2).toUpperCase()}</AvatarFallback>
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
            <div className="text-[11px] font-semibold opacity-70 mb-0.5">{m.author_name}</div>
          )}
          
          {isPhotoReport && photoPath && (
            <>
              <div 
                className="mb-2 rounded-lg overflow-hidden border bg-black/5 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setImagePreviewOpen(true)}
              >
                <img src={supabase.storage.from("photo-reports").getPublicUrl(photoPath).data.publicUrl} alt="report" className="w-full h-auto object-cover max-h-64" />
              </div>
              <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
                <DialogContent className="max-w-4xl bg-transparent border-none shadow-none p-0 flex justify-center">
                  <DialogTitle className="sr-only">Предпросмотр фото</DialogTitle>
                  <img src={supabase.storage.from("photo-reports").getPublicUrl(photoPath).data.publicUrl} alt="report" className="max-w-full max-h-[85vh] object-contain rounded-xl" />
                </DialogContent>
              </Dialog>
            </>
          )}
          {isPhotoReport && criticality && (
            <div className={cn("mb-1 text-[10px] font-bold uppercase tracking-wider", criticality === "urgent" ? "text-red-500" : criticality === "important" ? "text-amber-500" : "opacity-70")}>
              {criticality === "info" ? "Информация" : criticality === "important" ? "Важно" : "Срочно"}
            </div>
          )}
          <div className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">{description}</div>

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
                    "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full",
                    isMine
                      ? "-left-8 text-muted-foreground hover:bg-black/10 hover:text-foreground"
                      : "-right-8 text-muted-foreground hover:bg-black/10 hover:text-foreground",
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
          <AvatarFallback>{(m.author_name || "").substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
