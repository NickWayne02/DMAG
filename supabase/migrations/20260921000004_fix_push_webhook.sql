-- Удаляем старый триггер вебхука, если он был настроен неправильно
DROP TRIGGER IF EXISTS "push_on_new_message" ON "public"."chat_messages";

-- Создаем правильный триггер для отправки POST запроса на Edge-функцию
CREATE TRIGGER "push_on_new_message"
AFTER INSERT ON "public"."chat_messages"
FOR EACH ROW
EXECUTE FUNCTION "supabase_functions"."http_request"(
  'https://mqhdajaefuyifuqeudyh.supabase.co/functions/v1/send-chat-push',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xaGRhamFlZnV5aWZ1cWV1ZHloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ4MDIwNjIsImV4cCI6MjEwMDM3ODA2Mn0.-tpkwT18V53IvgqCVa8VghonHjBfTReDsBuPWBnHLEY"}',
  '{}',
  '1000'
);
