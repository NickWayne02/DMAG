import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, LogOut, Play, Pause, Square, MapPin, Coffee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentPosition, reverseGeocodeCity } from "@/lib/geocode";

export const Route = createFileRoute("/employee")({
  ssr: false,
  component: EmployeeDemoRoute,
});

function EmployeeDemoRoute() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);
  const [geoLabel, setGeoLabel] = useState("—");

  useEffect(() => {
    const ok = window.sessionStorage.getItem("dmag_demo_employee") === "true";
    if (!ok) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    setAllowed(true);
  }, [navigate]);

  useEffect(() => {
    if (!allowed) return;
    let cancelled = false;
    getCurrentPosition().then(async (coords) => {
      if (!coords || cancelled) return;
      const city = await reverseGeocodeCity(coords);
      if (cancelled) return;
      const label = city
        ? `${city} · GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`
        : `GPS: ${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}`;
      setGeoLabel(label);
    });
    return () => {
      cancelled = true;
    };
  }, [allowed]);

  function signOut() {
    window.sessionStorage.removeItem("dmag_demo_employee");
    navigate({ to: "/auth", replace: true });
  }

  if (!allowed) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Сотрудник</p>
            <h1 className="text-xl font-bold">Иван Иванов</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" /> Выйти
          </Button>
        </div>

        <Card className="p-5 rounded-2xl">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <MapPin className="h-4 w-4" /> Объект: {geoLabel}
          </div>
          <div className="text-3xl font-black tabular-nums mb-1">00:00:00</div>
          <p className="text-xs text-muted-foreground">Смена не начата</p>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <Button className="h-16 rounded-2xl text-base font-semibold">
            <Play className="h-5 w-5 mr-2" /> Начать работу
          </Button>
          <Button variant="secondary" className="h-16 rounded-2xl text-base font-semibold">
            <Pause className="h-5 w-5 mr-2" /> Пауза
          </Button>
          <Button variant="secondary" className="h-16 rounded-2xl text-base font-semibold">
            <Coffee className="h-5 w-5 mr-2" /> Обед
          </Button>
          <Button variant="destructive" className="h-16 rounded-2xl text-base font-semibold">
            <Square className="h-5 w-5 mr-2" /> Завершить
          </Button>
        </div>

        <Card className="p-4 rounded-2xl text-sm text-muted-foreground">
          Демонстрационный режим. Доступ к административной панели отключён.
        </Card>
      </div>
    </div>
  );
}
