export function clearAdminSession() {
  if (typeof window === "undefined") return;
  const keys = Object.keys(window.sessionStorage);
  for (const k of keys) {
    if (k.startsWith("dmag_admin_")) {
      window.sessionStorage.removeItem(k);
    }
  }
  window.sessionStorage.removeItem("adminActiveTab"); // for backwards compat during reload
}
