import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n";
import { SettingsProvider } from "@/lib/settings";

if (typeof window !== 'undefined') {
  import('@ionic/pwa-elements/loader').then(({ defineCustomElements }) => {
    defineCustomElements(window);
  });
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    // Error logged to console
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

import dmagLogo from "@/assets/dmag-logo.png";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
      },
      { title: "DMAG" },
      { name: "description", content: "DMAG Dashboard" },
      { name: "author", content: "DMAG" },
      { property: "og:title", content: "DMAG" },
      { property: "og:description", content: "DMAG Dashboard" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: dmagLogo },
      { rel: "apple-touch-icon", href: dmagLogo },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const THEME_BOOT_SCRIPT = `(function(){try{var raw=localStorage.getItem('dmag.settings.v2');if(!raw)return;var s=JSON.parse(raw);var r=document.documentElement;var mode=s.mode||'light';r.classList.toggle('dark',mode==='dark'||mode==='neon');r.dataset.themeMode=mode;if(s.scale){r.style.setProperty('--ui-scale',String(s.scale));r.style.fontSize=(16*s.scale)+'px';}if(s.radius)r.style.setProperty('--radius',s.radius+'rem');var base={light:{background:'#f8fafc',foreground:'#0f172a',card:'#ffffff',cardForeground:'#0f172a',primary:'#0D47A1',primaryForeground:'#ffffff',muted:'#f1f5f9',border:'#e2e8f0'},dark:{background:'#0b1220',foreground:'#f8fafc',card:'#111a2e',cardForeground:'#f8fafc',primary:'#3b82f6',primaryForeground:'#ffffff',muted:'#1e293b',border:'#1f2a44'},neon:{background:'#000000',foreground:'#ffffff',card:'#000000',cardForeground:'#ffffff',primary:'#10b981',primaryForeground:'#000000',muted:'#111111',border:'#222222'}};var p=Object.assign({},base[mode]||base.light,s.panelColors||{});if(s.customAccent)p.primary=s.customAccent;r.style.setProperty('--background',p.background);r.style.setProperty('--foreground',p.foreground);r.style.setProperty('--card',p.card);r.style.setProperty('--card-foreground',p.cardForeground);r.style.setProperty('--primary',p.primary);r.style.setProperty('--primary-foreground',p.primaryForeground);r.style.setProperty('--muted',p.muted);r.style.setProperty('--border',p.border);r.style.setProperty('--neon-bg',p.background);r.style.setProperty('--neon-surface',p.card);r.style.setProperty('--neon-surface-2',p.muted);r.style.setProperty('--neon-text',p.foreground);}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" translate="no">
      <head>
        <HeadContent />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `document.addEventListener('gesturestart', function (e) { e.preventDefault(); });`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { useAppSettings } from "@/hooks/use-app-settings";

function AppBranding() {
  const { data: settings } = useAppSettings();

  useEffect(() => {
    if (settings) {
      document.title = settings.app_name;
      
      if (settings.app_logo_url) {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = settings.app_logo_url;
        
        let appleLink = document.querySelector("link[rel~='apple-touch-icon']") as HTMLLinkElement;
        if (!appleLink) {
          appleLink = document.createElement("link");
          appleLink.rel = "apple-touch-icon";
          document.head.appendChild(appleLink);
        }
        appleLink.href = settings.app_logo_url;
      }
    }
  }, [settings]);

  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Proactive geolocation request removed; permissions will be requested when needed.

  return (
    <QueryClientProvider client={queryClient}>
      <AppBranding />
      <LanguageProvider>
        <SettingsProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
          <Toaster position="top-center" richColors />
        </SettingsProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}
