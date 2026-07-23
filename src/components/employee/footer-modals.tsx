import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

export function PrivacyModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        style={{
          background: "var(--neon-surface)",
          borderColor: "var(--neon-border)",
          color: "var(--neon-text)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {tr("footer.privacy") === "footer.privacy"
              ? "Политика конфиденциальности"
              : tr("footer.privacy")}
          </DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm dark:prose-invert max-w-none mt-4 max-h-[60vh] overflow-y-auto"
          style={{ color: "var(--neon-text-dim)" }}
        >
          <p className="mb-4">{tr("modal.privacy.p1")}</p>
          <h3 className="font-semibold mb-2 mt-4" style={{ color: "var(--neon-text)" }}>
            {tr("modal.privacy.h1")}
          </h3>
          <p className="mb-4">{tr("modal.privacy.p2")}</p>
          <h3 className="font-semibold mb-2 mt-4" style={{ color: "var(--neon-text)" }}>
            {tr("modal.privacy.h2")}
          </h3>
          <p className="mb-4">{tr("modal.privacy.p3")}</p>
          <h3 className="font-semibold mb-2 mt-4" style={{ color: "var(--neon-text)" }}>
            {tr("modal.privacy.h3")}
          </h3>
          <p>{tr("modal.privacy.p4")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TermsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl"
        style={{
          background: "var(--neon-surface)",
          borderColor: "var(--neon-border)",
          color: "var(--neon-text)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">
            {tr("footer.terms") === "footer.terms" ? "Условия использования" : tr("footer.terms")}
          </DialogTitle>
        </DialogHeader>
        <div
          className="prose prose-sm dark:prose-invert max-w-none mt-4 max-h-[60vh] overflow-y-auto"
          style={{ color: "var(--neon-text-dim)" }}
        >
          <p className="mb-4">{tr("modal.terms.p1")}</p>
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>{tr("modal.terms.li1")}</li>
            <li>{tr("modal.terms.li2")}</li>
            <li>{tr("modal.terms.li3")}</li>
          </ul>
          <p>{tr("modal.terms.p2")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SupportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const tr = useT();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md text-center"
        style={{
          background: "var(--neon-surface)",
          borderColor: "var(--neon-border)",
          color: "var(--neon-text)",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl mb-2 text-center">
            {tr("modal.support.title") === "modal.support.title"
              ? "Служба поддержки"
              : tr("modal.support.title")}
          </DialogTitle>
        </DialogHeader>
        <div className="py-6 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </div>
          <p className="text-lg font-medium">
            {tr("modal.support.title") === "modal.support.title"
              ? "Нужна помощь?"
              : tr("modal.support.title")}
          </p>
          <p className="text-sm" style={{ color: "var(--neon-text-dim)" }}>
            {tr("modal.support.desc")}
          </p>
          <div
            className="mt-4 p-4 rounded-xl w-full"
            style={{ background: "rgba(128,128,128,0.1)", border: "1px solid var(--neon-border)" }}
          >
            <p className="text-sm opacity-80 mb-1">{tr("modal.support.hotline")}</p>
            <p
              className="text-xl font-bold font-mono tracking-wider"
              style={{ color: "var(--neon-text)" }}
            >
              +49 800 123 4567
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
