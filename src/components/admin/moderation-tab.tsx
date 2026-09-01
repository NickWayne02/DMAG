import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Edit2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/lib/i18n";

interface DbMessage {
  id: string;
  channel_type: "general" | "direct" | "site";
  channel_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  created_at: string;
}

export function ModerationTab() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  useEffect(() => {
    fetchMessages();

    const sub = supabase
      .channel("moderation_messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const newMsg = payload.new as DbMessage;
            if (newMsg.channel_type === "general" || newMsg.channel_type === "direct") {
              setMessages((prev) => [newMsg, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as DbMessage;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, []);

  async function fetchMessages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .in("channel_type", ["general", "direct"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMessages(data || []);

      const { data: profData } = await supabase.from("profiles").select("id, full_name");
      if (profData) {
        const map: Record<string, string> = {};
        profData.forEach(p => map[p.id] = p.full_name || "Без имени");
        setProfiles(map);
      }
    } catch (err: any) {
      toast.error("Ошибка загрузки сообщений: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function deleteMessage(id: string) {
    if (!confirm("Вы уверены, что хотите удалить это сообщение?")) return;
    try {
      const { error } = await supabase.from("chat_messages").delete().eq("id", id);
      if (error) throw error;
      toast.success("Сообщение удалено");
    } catch (err: any) {
      toast.error("Ошибка при удалении: " + err.message);
    }
  }

  async function saveEdit(id: string) {
    try {
      const { error } = await supabase.from("chat_messages").update({ content: editContent }).eq("id", id);
      if (error) throw error;
      toast.success("Сообщение обновлено");
      setEditingId(null);
    } catch (err: any) {
      toast.error("Ошибка при обновлении: " + err.message);
    }
  }

  function renderContent(msg: DbMessage) {
    if (editingId === msg.id) {
      return (
        <div className="mt-2 flex flex-col gap-2">
          <Textarea 
            value={editContent} 
            onChange={(e) => setEditContent(e.target.value)} 
            className="min-h-25 text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              <X className="w-4 h-4 mr-1" /> {t("admin.moderation.cancel")}
            </Button>
            <Button size="sm" onClick={() => saveEdit(msg.id)}>
              <Check className="w-4 h-4 mr-1" /> {t("admin.moderation.save")}
            </Button>
          </div>
        </div>
      );
    }

    const content = msg.content;
    const isPhotoReport = content.includes("[PHOTO_REPORT]") || content.includes("[ФОТО_ОТЧЕТ]");
    if (isPhotoReport) {
      let textToSplit = content;
      if (content.includes("[ФОТО_ОТЧЕТ]")) {
        textToSplit = content.substring(content.indexOf("[ФОТО_ОТЧЕТ]") + "[ФОТО_ОТЧЕТ]".length).trim();
      } else if (content.includes("[PHOTO_REPORT]")) {
        textToSplit = content.substring(content.indexOf("[PHOTO_REPORT]") + "[PHOTO_REPORT]".length).trim();
      }
      const parts = textToSplit.split(" | ");
      const photoPath = parts[0] || "";
      const criticality = parts[1] || "";
      const desc = parts.slice(2).join(" | ");

      let photoUrl = photoPath;
      if (photoUrl && !photoUrl.startsWith("http")) {
        photoUrl = supabase.storage.from("photo-reports").getPublicUrl(photoUrl).data.publicUrl;
      }

      return (
        <div className="flex flex-col gap-2 mt-2">
          {photoUrl && (
            <img src={photoUrl} alt="Report" className="w-48 h-48 object-cover rounded-xl border bg-muted" />
          )}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase">{criticality || "info"}</Badge>
            <span className="text-sm font-medium">{desc}</span>
          </div>
        </div>
      );
    }
    return <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>;
  }

  function getChatName(channelId: string) {
    if (!channelId.startsWith("dm_")) return channelId;
    const parts = channelId.replace("dm_", "").split("_");
    if (parts.length >= 2) {
      const name1 = profiles[parts[0]] || t("admin.moderation.unknown");
      const name2 = profiles[parts[1]] || t("admin.moderation.unknown");
      return `${name1} и ${name2}`;
    }
    return channelId;
  }

  const renderMessageList = (filterType: "general" | "direct") => {
    let filtered = messages.filter(m => m.channel_type === filterType);

    if (loading) {
      return (
        <div className="flex items-center justify-center h-[50vh] text-muted-foreground text-sm">
          Загрузка...
        </div>
      );
    }

    if (filterType === "direct" && !selectedChatId) {
      const chatIds = Array.from(new Set(filtered.map(m => m.channel_id)));
      
      if (chatIds.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">{t("admin.moderation.no_direct_chats")}</p>
          </div>
        );
      }

      return (
        <div className="space-y-3 p-1">
          {chatIds.map(chatId => {
            const lastMsg = filtered.find(m => m.channel_id === chatId);
            return (
              <div 
                key={chatId} 
                className="p-4 rounded-2xl border bg-background hover:bg-muted/30 transition-colors cursor-pointer flex justify-between items-center group"
                onClick={() => setSelectedChatId(chatId)}
              >
                <div>
                  <div className="font-semibold text-sm">{getChatName(chatId)}</div>
                  <div className="text-xs text-muted-foreground mt-1 opacity-70 truncate max-w-100">
                    {lastMsg?.content}
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  Смотреть
                </Button>
              </div>
            );
          })}
        </div>
      );
    }

    if (filterType === "direct" && selectedChatId) {
      filtered = filtered.filter(m => m.channel_id === selectedChatId);
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
          <p className="text-sm">{t("admin.moderation.no_messages")}</p>
          {selectedChatId && (
            <Button variant="link" onClick={() => setSelectedChatId(null)} className="mt-2">
              {t("admin.moderation.back")}
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col h-full">
        {filterType === "direct" && selectedChatId && (
          <div className="mb-4 sticky top-0 bg-card z-10 pb-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedChatId(null)}>
              &larr; {t("admin.moderation.back")}
            </Button>
            <span className="ml-4 text-sm font-semibold">{getChatName(selectedChatId)}</span>
          </div>
        )}
        <div className="space-y-3 p-1">
        {filtered.map((msg) => (
          <div key={msg.id} className="p-4 rounded-2xl border bg-background hover:bg-muted/30 transition-colors group">
            <div className="flex justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm truncate">{msg.author_name || t("admin.moderation.unknown")}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(msg.created_at), "d MMM, HH:mm", { locale: ru })}
                  </span>
                  {filterType === "direct" && (
                    <Badge variant="outline" className="text-[10px] ml-2 shrink-0">
                      {t("admin.moderation.chat")}: {getChatName(msg.channel_id)}
                    </Badge>
                  )}
                </div>
                {renderContent(msg)}
              </div>
              <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {editingId !== msg.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-blue-500 hover:text-blue-600 hover:bg-blue-50/10"
                    onClick={() => {
                      setEditContent(msg.content);
                      setEditingId(msg.id);
                    }}
                    title={t("admin.moderation.edit")}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50/10"
                  onClick={() => deleteMessage(msg.id)}
                  title={t("admin.moderation.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold tracking-tight">{t("admin.moderation.title")}</h3>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.moderation.desc")}</p>
      </div>

      <Card className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col h-[70vh]">
        <Tabs defaultValue="general" className="flex-1 flex flex-col h-full w-full">
          <div className="px-4 pt-4 border-b">
            <TabsList className="grid w-100 grid-cols-2">
              <TabsTrigger value="general" onClick={() => setSelectedChatId(null)}>{t("admin.moderation.general")}</TabsTrigger>
              <TabsTrigger value="direct" onClick={() => setSelectedChatId(null)}>{t("admin.moderation.direct")}</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <TabsContent value="general" className="m-0 h-full">
              {renderMessageList("general")}
            </TabsContent>
            <TabsContent value="direct" className="m-0 h-full">
              {renderMessageList("direct")}
            </TabsContent>
          </div>
        </Tabs>
      </Card>
    </div>
  );
}
