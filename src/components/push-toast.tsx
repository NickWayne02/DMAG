import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendHorizontal } from "lucide-react";

interface PushToastProps {
  title: string;
  body: string;
  avatarUrl?: string;
  photoUrl?: string;
  onReply?: (text: string) => void;
  onClick?: () => void;
  onClose?: () => void;
}

export const PushToast: React.FC<PushToastProps> = ({ 
  title, 
  body, 
  avatarUrl, 
  photoUrl,
  onReply, 
  onClick,
  onClose
}) => {
  const [replyText, setReplyText] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  const handleReplySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (replyText.trim() && onReply) {
      onReply(replyText);
      setReplyText("");
      setIsReplying(false);
      if (onClose) onClose();
    }
  };

  return (
    <div 
      className="w-[320px] rounded-xl bg-card border border-border shadow-lg overflow-hidden flex flex-col"
      style={{
        animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div 
        className="flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => {
          if (!isReplying && onClick) onClick();
        }}
      >
        <Avatar className="h-10 w-10 border shadow-sm">
          <AvatarImage src={avatarUrl} alt={title} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {title.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground truncate">{title}</h4>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{body}</p>
        </div>
      </div>
      
      {photoUrl && (
        <div className="px-4 pb-3" onClick={() => { if (!isReplying && onClick) onClick(); }}>
          <img src={photoUrl} alt="Фотоотчет" className="w-full h-auto max-h-[160px] object-cover rounded-lg border shadow-sm cursor-pointer" />
        </div>
      )}

      {onReply && (
        <div className="px-4 pb-3 pt-1 bg-muted/20">
          {!isReplying ? (
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full text-xs text-primary font-medium h-7 justify-start px-2 hover:bg-primary/10 hover:text-primary"
              onClick={(e) => {
                e.stopPropagation();
                setIsReplying(true);
              }}
            >
              Быстрый ответ...
            </Button>
          ) : (
            <form onSubmit={handleReplySubmit} className="flex gap-2 items-center" onClick={(e) => e.stopPropagation()}>
              <Input
                autoFocus
                size={1}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Сообщение..."
                className="h-8 text-xs bg-background border-input"
              />
              <Button type="submit" size="icon" className="h-8 w-8 rounded-full shrink-0">
                <SendHorizontal className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
