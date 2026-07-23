import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage, langLabel, useT, type LangCode } from "@/lib/i18n";
import { translateMessage } from "@/lib/translate.functions";
import type { Site } from "@/components/site-selector-dialog";
import { Send, Languages, Loader2, Hash, User, Building2, Trash2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

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

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: Site | null;
}

export function ChatDialog({ open, onOpenChange, site }: ChatDialogProps) {
  const [tab, setTab] = useState<ChannelType>("general");
  const t = useT();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl max-w-md p-0 gap-0 overflow-hidden h-[85vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-center gap-2">
            <DialogTitle className="flex items-center gap-2 text-base">
              <LanguageSwitcher compact />
              {t("chat.title")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as ChannelType)}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-3 mx-4 mt-3 shrink-0">
            <TabsTrigger value="general" className="gap-1.5">
              <Hash className="h-3.5 w-3.5" /> {t("chat.tabGeneral")}
            </TabsTrigger>
            <TabsTrigger value="direct" className="gap-1.5">
              <User className="h-3.5 w-3.5" /> {t("chat.tabDirect")}
            </TabsTrigger>
            <TabsTrigger value="site" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" /> {t("chat.tabSite")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="flex-1 min-h-0 mt-2">
            <ChannelView
              channelType="general"
              channelId="general"
              channelTitle={t("chat.generalTitle")}
            />
          </TabsContent>

          <TabsContent value="direct" className="flex-1 min-h-0 mt-2">
            <ChannelView
              channelType="direct"
              channelId="team"
              channelTitle={t("chat.directTitle")}
              subtitle={t("chat.directSubtitle")}
            />
          </TabsContent>

          <TabsContent value="site" className="flex-1 min-h-0 mt-2">
            {site ? (
              <ChannelView
                channelType="site"
                channelId={site.id}
                channelTitle={t("chat.siteTitle", { name: site.name })}
                subtitle={site.address ?? undefined}
              />
            ) : (
              <EmptyState text={t("chat.selectSiteFirst")} />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="h-full grid place-items-center text-center p-6 text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function ChannelView({
  channelType,
  channelId,
  channelTitle,
  subtitle,
}: {
  channelType: ChannelType;
  channelId: string;
  channelTitle: string;
  subtitle?: string;
}) {
  const { user, roles } = useAuth();
  const isSuperAdmin = roles.includes("super_admin");
  const { lang } = useLanguage();
  const t = useT();
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function deleteMessage(id: string) {
    const { error } = await supabase.from("chat_messages").delete().eq("id", id);
    if (error) {
      toast.error(t("chat.deleteFailed"));
      console.error(error);
      return;
    }
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  async function clearChannel() {
    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("channel_type", channelType)
      .eq("channel_id", channelId);
    if (error) {
      toast.error(t("chat.deleteFailed"));
      console.error(error);
      return;
    }
    setMessages([]);
  }

  // Load history + subscribe to realtime
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
      .channel(`chat:${channelType}:${channelId}`)
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
        }
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
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [channelType, channelId]);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, loading]);

  async function send() {
    const text = input.trim();
    if (!text || !user || sending) return;
    setSending(true);
    const authorName =
      (user.user_metadata?.full_name as string | undefined) ??
      user.email ??
      "Сотрудник";
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

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{channelTitle}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {isSuperAdmin && messages.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive shrink-0"
                title={t("chat.clearAll")}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                <span className="text-xs">{t("chat.clearAll")}</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("chat.clearAllConfirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("chat.clearAllConfirmText")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void clearChannel()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {t("chat.clearAll")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 px-4 overflow-y-auto">
        <div className="space-y-3 pb-3">
          {loading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">
              {t("chat.noMessages")}
            </p>
          )}
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              m={m}
              mine={m.author_id === user?.id}
              targetLang={lang}
              canDelete={isSuperAdmin}
              onDelete={() => void deleteMessage(m.id)}
            />
          ))}
        </div>
      </div>


      <div className="border-t p-3 flex items-center gap-2 shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={t("chat.placeholder", { lang: langLabel(lang) })}
          className="h-11 rounded-xl"
          disabled={sending}
        />
        <Button
          onClick={() => void send()}
          disabled={sending || !input.trim()}
          className="h-11 rounded-xl px-3"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}

function MessageBubble({
  m,
  mine,
  targetLang,
  canDelete = false,
  onDelete,
}: {
  m: DbMessage;
  mine: boolean;
  targetLang: LangCode;
  canDelete?: boolean;
  onDelete?: () => void;
}) {
  const needsTranslate = m.source_lang !== targetLang;
  const [translated, setTranslated] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const translateFn = useServerFn(translateMessage);
  const t = useT();

  useEffect(() => {
    if (!needsTranslate) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    setTranslating(true);
    translateFn({
      data: {
        text: m.content,
        sourceLang: m.source_lang,
        targetLang,
      },
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
  }, [m.id, m.content, m.source_lang, targetLang, needsTranslate, translateFn]);

  const time = useMemo(
    () =>
      new Date(m.created_at).toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [m.created_at]
  );

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] space-y-0.5`}>
        {!mine && (
          <p className="text-[10px] font-semibold text-muted-foreground px-1">
            {m.author_name ?? "Сотрудник"}
          </p>
        )}
        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            mine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-muted text-foreground rounded-bl-sm"
          }`}
        >
          <p className="whitespace-pre-wrap break-words">{m.content}</p>
          {needsTranslate && (
            <div
              className={`mt-1.5 pt-1.5 border-t ${
                mine ? "border-primary-foreground/20" : "border-foreground/10"
              }`}
            >
              <div
                className={`flex items-center gap-1 text-[10px] mb-0.5 ${
                  mine ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                <Languages className="h-3 w-3" />
                <span>
                  {t("chat.autoTranslated", { lang: langLabel(targetLang) })}
                </span>
              </div>
              {translating && !translated ? (
                <span className="inline-flex items-center gap-2 opacity-80 text-xs italic">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  …
                </span>
              ) : (
                <p className="whitespace-pre-wrap break-words text-xs opacity-90">
                  {translated ?? ""}
                </p>
              )}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1.5 px-1 ${mine ? "justify-end" : "justify-start"}`}>
          <p className="text-[10px] text-muted-foreground">{time}</p>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[10px] text-destructive/70 hover:text-destructive"
              title="delete"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
