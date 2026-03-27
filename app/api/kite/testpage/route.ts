import { NextResponse } from "next/server";

export async function GET() {
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Kite Raw Test</title></head>
<body style="background:#000;color:#eee;font-family:monospace;padding:40px">
  <h2 style="color:#AEDD00">Raw Fetch Test (no React)</h2>
  <button id="btn" style="background:#AEDD00;color:#000;padding:12px 24px;border:none;border-radius:8px;font-size:14px;cursor:pointer;font-weight:bold">
    Fetch /api/kite/holdings
  </button>
  <pre id="out" style="margin-top:20px;background:#111;padding:16px;border-radius:8px;white-space:pre-wrap;word-break:break-all">waiting…</pre>
  <script>
    document.getElementById('btn').addEventListener('click', function() {
      document.getElementById('out').textContent = 'fetching…';
      fetch('/api/kite/holdings')
        .then(function(r) {
          document.getElementById('out').textContent += '\\nstatus: ' + r.status;
          return r.text();
        })
        .then(function(t) {
          document.getElementById('out').textContent += '\\nbody: ' + t.slice(0, 500);
        })
        .catch(function(e) {
          document.getElementById('out').textContent += '\\nERROR: ' + e.message;
        });
    });
    document.getElementById('out').textContent = 'ready — click the button';
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
