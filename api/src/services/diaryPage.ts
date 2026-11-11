export type DiaryPageEntry = {
  description: string;
  captured_at: string;
  capture_timezone: string;
  photoUrl: string;
};

export function validDiaryToken(value: string) {
  return /^[a-f0-9]{64}$/.test(value);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]!);
}

function captureDate(entry: DiaryPageEntry) {
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: "medium", timeStyle: "short", timeZone: entry.capture_timezone,
  };
  const date = new Date(entry.captured_at);
  if (!Number.isFinite(date.getTime())) return "Data indisponível";
  try {
    return new Intl.DateTimeFormat("pt-BR", options).format(date);
  } catch {
    return new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(date);
  }
}

export function renderDiary(title: string, entries: DiaryPageEntry[]) {
  const cards = entries.map((entry) => `
    <article><time datetime="${escapeHtml(entry.captured_at)}">${escapeHtml(captureDate(entry))}</time>
    <p>${escapeHtml(entry.description)}</p>
    <img src="${escapeHtml(entry.photoUrl)}" alt="Foto da atualização da obra" loading="lazy"></article>
  `).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="robots" content="noindex,nofollow"><title>Diário da obra | Pocket Obras</title>
    <style>body{margin:0;background:#f6f4ef;color:#142c43;font:1rem/1.5 system-ui,sans-serif}
    header{background:#142c43;color:#fff;border-bottom:4px solid #f2a33a}
    .wrap,main{box-sizing:border-box;max-width:48rem;margin:auto;padding:1.25rem}
    h1{margin:.2rem 0}article{padding:1rem;margin-bottom:1rem;background:#fff;border-radius:12px}
    time{color:#52616d}article p{white-space:pre-wrap;overflow-wrap:anywhere}
    img{display:block;max-width:100%;max-height:32rem;border-radius:8px}</style></head>
    <body><header><div class="wrap"><strong>Pocket Obras</strong><h1>Diário da obra</h1></div></header>
    <main><h2>${escapeHtml(title)}</h2>${cards || "<p>Nenhuma atualização publicada ainda.</p>"}</main></body></html>`;
}
