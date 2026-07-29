export function renderErrorPage(errorStr?: string) {
  const errorDetails = errorStr ? `<div style="margin-top: 2rem; padding: 1rem; background: #fee2e2; color: #991b1b; border-radius: 8px; text-align: left; font-family: monospace; white-space: pre-wrap; font-size: 12px; overflow-x: auto;">${escapeHtml(errorStr)}</div>` : '';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Application Error</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 1rem; }
    .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 500px; width: 100%; text-align: center; }
    h1 { margin-top: 0; font-size: 1.5rem; color: #ef4444; }
    p { color: #64748b; line-height: 1.5; }
    .btn { display: inline-block; margin-top: 1.5rem; padding: 0.5rem 1rem; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; transition: background 0.2s; }
    .btn:hover { background: #dc2626; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Server Error</h1>
    <p>Something went wrong on our end while rendering this page.</p>
    ${errorDetails}
    <a href="/" class="btn">Return to Home</a>
  </div>
</body>
</html>`;
}

function escapeHtml(unsafe: string) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}
