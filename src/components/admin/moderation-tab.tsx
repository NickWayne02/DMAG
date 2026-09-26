import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, MessageSquare, Edit2, Check, X, Search, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useLanguage } from "@/lib/i18n";
import { translateMessage } from "@/lib/translate.functions";

interface DbMessage {
  id: string;
  channel_type: "general" | "direct" | "site";
  channel_id: string;
  author_id: string;
  author_name: string | null;
  content: string;
  source_lang: string | null;
  created_at: string;
}

export function ModerationTab() {
  const { t, lang, tName } = useLanguage();
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sites, setSites] = useState<Record<string, string>>({});
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [translatedTexts, setTranslatedTexts] = useState<Record<string, string>>({});
  
  // New features state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(100);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<"general" | "direct" | "site">("general");

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
            if (newMsg.channel_type === "general" || newMsg.channel_type === "direct" || newMsg.channel_type === "site") {
              setMessages((prev) => [newMsg, ...prev]);
            }
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            setSelectedIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(payload.old.id);
              return newSet;
            });
          } else if (payload.eventType === "UPDATE") {
            const updated = payload.new as DbMessage;
            setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [limit]);

  useEffect(() => {
    setTranslatedTexts({});
  }, [lang]);

  useEffect(() => {
    messages.forEach((m) => {
      if (m.source_lang && m.source_lang !== lang && translatedTexts[m.id] === undefined) {
        setTranslatedTexts((prev) => ({ ...prev, [m.id]: "" }));
        translateMessage({ text: m.content, sourceLang: m.source_lang, targetLang: lang })
          .then((res) => {
            setTranslatedTexts((prev) => ({ ...prev, [m.id]: res.translated }));
          })
          .catch(console.error);
      }
    });
  }, [messages, lang, translatedTexts]);

  async function fetchMessages() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("chat_messages")
        .select(
          "id, channel_type, channel_id, author_id, author_name, content, created_at, source_lang",
        )
        .in("channel_type", ["general", "direct", "site"])
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      setMessages(data || []);

      const { data: profData } = await supabase.from("profiles").select("id, full_name");
      if (profData) {
        const map: Record<string, string> = {};
        profData.forEach((p) => (map[p.id] = p.full_name || t("admin.moderation.unknown")!));
        setProfiles(map);
      }
      
      const { data: sitesData } = await supabase.from("sites").select("id, name");
      if (sitesData) {
        const sMap: Record<string, string> = {};
        sitesData.forEach((s) => (sMap[s.id] = s.name));
        setSites(sMap);
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

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Вы уверены, что хотите удалить ${selectedIds.size} сообщений?`)) return;
    
    try {
      setLoading(true);
      const { error } = await supabase
        .from("chat_messages")
        .delete()
        .in("id", Array.from(selectedIds));
        
      if (error) throw error;
      toast.success(`Удалено ${selectedIds.size} сообщений`);
      setSelectedIds(new Set());
      fetchMessages();
    } catch (err: any) {
      toast.error("Ошибка при массовом удалении: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const selectAll = (messagesToSelect: DbMessage[]) => {
    if (messagesToSelect.every(m => selectedIds.has(m.id))) {
      // Deselect all
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        messagesToSelect.forEach(m => newSet.delete(m.id));
        return newSet;
      });
    } else {
      // Select all
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        messagesToSelect.forEach(m => newSet.add(m.id));
        return newSet;
      });
    }
  };

  async function saveEdit(id: string) {
    try {
      const { error } = await supabase
        .from("chat_messages")
        .update({ content: editContent })
        .eq("id", id);
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
            className="min-h-25 text-sm resize-none"
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
              <X className="w-4 h-4 mr-1" /> {t("admin.sites.dlgCancel") || "Отмена"}
            </Button>
            <Button size="sm" onClick={() => saveEdit(msg.id)}>
              <Check className="w-4 h-4 mr-1" /> {t("admin.sites.dlgSave") || "Сохранить"}
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

      let translatedDesc = null;
      if (msg.source_lang && msg.source_lang !== lang && translatedTexts[msg.id]) {
        const trText = translatedTexts[msg.id];
        let trTextToSplit = trText;
        if (trText.includes("[ФОТО_ОТЧЕТ]"))
          trTextToSplit = trText.substring(trText.indexOf("[ФОТО_ОТЧЕТ]") + "[ФОТО_ОТЧЕТ]".length).trim();
        else if (trText.includes("[PHOTO_REPORT]"))
          trTextToSplit = trText.substring(trText.indexOf("[PHOTO_REPORT]") + "[PHOTO_REPORT]".length).trim();
        const trParts = trTextToSplit.split(" | ");
        if (trParts.length >= 3) {
          translatedDesc = trParts.slice(2).join(" | ");
        } else {
          translatedDesc = trText;
        }
      }

      return (
        <div className="flex items-start gap-4 mt-2">
          {photoUrl && (
            <div 
              className="relative group shrink-0 cursor-pointer overflow-hidden rounded-xl border bg-muted"
              onClick={() => setSelectedPhoto(photoUrl)}
            >
              <img
                src={photoUrl}
                alt="Report"
                className="w-24 h-24 object-cover transition-transform duration-300 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Maximize2 className="w-6 h-6 text-white" />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="text-[10px] uppercase">
                {t(`crit.${(criticality || "info").toLowerCase()}`) || criticality || "info"}
              </Badge>
              <span className="text-sm font-medium">{desc}</span>
            </div>
            {translatedDesc && (
              <div className="text-sm text-muted-foreground italic border-l-2 pl-2 mt-1">
                {translatedDesc}
              </div>
            )}
          </div>
        </div>
      );
    }

    const translated = msg.source_lang && msg.source_lang !== lang ? translatedTexts[msg.id] : null;
    return (
      <div className="mt-1 max-w-4xl">
        <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
        {translated && (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground italic border-l-2 pl-2 mt-2 leading-relaxed">
            {translated}
          </p>
        )}
      </div>
    );
  }

  function getChatName(channelId: string) {
    if (sites[channelId]) return sites[channelId];
    if (!channelId.startsWith("dm_")) return channelId;
    const parts = channelId.replace("dm_", "").split("_");
    if (parts.length >= 2) {
      const name1 = tName(profiles[parts[0]] || t("admin.moderation.unknown")!);
      const name2 = tName(profiles[parts[1]] || t("admin.moderation.unknown")!);
      return `${name1} ${t("admin.moderation.and")} ${name2}`;
    }
    return channelId;
  }

  const renderMessageList = (filterType: "general" | "direct" | "site") => {
    let filtered = messages.filter((m) => m.channel_type === filterType);
    
    // Apply search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(m => 
        (m.content?.toLowerCase() || '').includes(q) || 
        (m.author_name?.toLowerCase() || '').includes(q)
      );
    }

    if (loading && messages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
          Загрузка...
        </div>
      );
    }

    if ((filterType === "direct" || filterType === "site") && !selectedChatId) {
      const chatIds = Array.from(new Set(filtered.map((m) => m.channel_id)));

      if (chatIds.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
            <p className="text-sm">{filterType === "direct" ? "Нет личных сообщений" : "Нет сообщений объектов"}</p>
          </div>
        );
      }

      return (
        <div className="space-y-3 p-1">
          {chatIds.map((chatId) => {
            const chatMessages = filtered.filter(m => m.channel_id === chatId);
            const lastMsg = chatMessages[0]; // because it's ordered by created_at DESC
            
            return (
              <div
                key={chatId}
                className="p-4 rounded-2xl border bg-card hover:border-primary/50 hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                onClick={() => {
                  setSelectedChatId(chatId);
                  setSearchQuery("");
                }}
              >
                <div className="flex-1 min-w-0 mr-4">
                  <div className="font-semibold text-sm mb-1">{getChatName(chatId)}</div>
                  <div className="text-sm text-muted-foreground truncate opacity-80 flex items-center gap-2">
                    <span className="truncate">{lastMsg?.content.includes('[PHOTO_REPORT]') ? `📷 ${t("chat.media_title") || "Фотоотчет"}` : lastMsg?.content}</span>
                    <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full shrink-0">
                      {chatMessages.length} {chatMessages.length === 1 ? (t("admin.moderation.message") || "сообщение") : (t("admin.moderation.messages") || "сообщений")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground font-medium">
                    {lastMsg ? new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(lastMsg.created_at)) : ''}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  >{t("chat.showTranslation", { lang: lang.toUpperCase() }) || "Смотреть"}</Button>
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    if ((filterType === "direct" || filterType === "site") && selectedChatId) {
      filtered = filtered.filter((m) => m.channel_id === selectedChatId);
    }

    if (filtered.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <MessageSquare className="h-10 w-10 mb-2 opacity-20" />
          <p className="text-sm">Ничего не найдено</p>
          {selectedChatId && (
            <Button variant="outline" onClick={() => setSelectedChatId(null)} className="mt-4 rounded-xl">
              Вернуться назад
            </Button>
          )}
        </div>
      );
    }

    const allSelected = filtered.length > 0 && filtered.every(m => selectedIds.has(m.id));

    return (
      <div className="flex flex-col h-full">
        <div className="mb-4 sticky top-0 bg-background/95 backdrop-blur z-10 pb-4 border-b flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {(filterType === "direct" || filterType === "site") && selectedChatId ? (
              <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => setSelectedChatId(null)}>
                &larr; {t("admin.moderation.back") || "Назад"}
              </Button>
            ) : null}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder={t("reports.search") || "Поиск..."} 
                className="pl-9 rounded-xl h-9" 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {selectedIds.size > 0 && (
              <Button variant="destructive" size="sm" className="rounded-xl" onClick={bulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить ({selectedIds.size})
              </Button>
            )}
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={allSelected} 
                onCheckedChange={() => selectAll(filtered)} 
              />
              <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">{t("admin.moderation.select_all") || "Выбрать все"}</label>
            </div>
          </div>
        </div>

        <div className="space-y-4 pb-12">
          {filtered.map((msg) => (
            <div
              key={msg.id}
              className={`p-4 rounded-2xl border transition-all group ${selectedIds.has(msg.id) ? 'bg-primary/5 border-primary/30' : 'bg-card hover:border-primary/20'}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="pt-1 shrink-0">
                  <Checkbox 
                    checked={selectedIds.has(msg.id)} 
                    onCheckedChange={() => toggleSelect(msg.id)} 
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-semibold text-sm">
                      {tName(msg.author_name || t("admin.moderation.unknown")!)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat(lang, {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(msg.created_at))}
                    </span>
                    {(filterType === "direct" || filterType === "site") && !selectedChatId && (
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        Чат: {getChatName(msg.channel_id)}
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
                      className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg"
                      onClick={() => {
                        setEditContent(msg.content);
                        setEditingId(msg.id);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                    onClick={() => deleteMessage(msg.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {filtered.length >= limit && (
            <div className="flex justify-center mt-6">
              <Button variant="outline" className="rounded-xl" onClick={() => setLimit(p => p + 50)}>
                Загрузить еще
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">{t("admin.moderation.title")}</h3>
          <p className="text-sm text-muted-foreground mt-1">{t("admin.moderation.desc")}</p>
        </div>
      </div>

      <Card className="rounded-3xl border bg-background/50 backdrop-blur shadow-sm overflow-hidden flex flex-col h-[75vh]">
        <Tabs value={currentTab} onValueChange={(v: any) => {
          setCurrentTab(v);
          setSelectedChatId(null);
          setSelectedIds(new Set());
          setSearchQuery("");
        }} className="flex-1 flex flex-col h-full w-full">
          <div className="px-6 pt-6 border-b bg-card/50">
            <TabsList className="grid w-full max-w-2xl grid-cols-3 h-11 rounded-xl">
              <TabsTrigger value="general" className="rounded-lg">{t("chat.general_channel") || "Общий чат"}</TabsTrigger>
              <TabsTrigger value="direct" className="rounded-lg">{t("chat.private_chats") || "Личные чаты"}</TabsTrigger>
              <TabsTrigger value="site" className="rounded-lg">{t("chat.objects") || "Чат объектов"}</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
            <TabsContent value="general" className="m-0 h-full">
              {renderMessageList("general")}
            </TabsContent>
            <TabsContent value="direct" className="m-0 h-full">
              {renderMessageList("direct")}
            </TabsContent>
            <TabsContent value="site" className="m-0 h-full">
              {renderMessageList("site")}
            </TabsContent>
          </div>
        </Tabs>
      </Card>

      <Dialog open={!!selectedPhoto} onOpenChange={(o) => !o && setSelectedPhoto(null)}>
        <DialogContent className="max-w-4xl p-1 bg-transparent border-none shadow-none">
          {selectedPhoto && (
            <img 
              src={selectedPhoto} 
              alt="Preview" 
              className="w-full max-h-[85vh] object-contain rounded-xl"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
