/* Preço Fechado — service worker (PWA instalável + abertura rápida + avisos com o app fechado).
 * - Páginas (navegação): rede primeiro; sem rede, usa a última cópia do index.html.
 * - Arquivos /assets/ (nomes com hash, imutáveis) e ícones: cache primeiro.
 * - Nada do Firebase passa por aqui: dados sempre vêm da rede.
 */
const VERSAO = "orcaja-v2";
const CACHE_PAGINAS = `${VERSAO}-paginas`;
const CACHE_ARQUIVOS = `${VERSAO}-arquivos`;

self.addEventListener("install", (evento) => {
  evento.waitUntil(
    caches.open(CACHE_PAGINAS).then((cache) => cache.add("/index.html").catch(() => undefined)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((n) => !n.startsWith(VERSAO)).map((n) => caches.delete(n))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (evento) => {
  const req = evento.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Firebase, Google etc.: direto na rede

  if (req.mode === "navigate") {
    evento.respondWith(
      fetch(req)
        .then((resposta) => {
          const copia = resposta.clone();
          caches.open(CACHE_PAGINAS).then((cache) => cache.put("/index.html", copia));
          return resposta;
        })
        .catch(() => caches.match("/index.html")),
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icones/") || url.pathname.endsWith(".svg")) {
    evento.respondWith(
      caches.match(req).then(
        (emCache) =>
          emCache ||
          fetch(req).then((resposta) => {
            if (resposta.ok) {
              const copia = resposta.clone();
              caches.open(CACHE_ARQUIVOS).then((cache) => cache.put(req, copia));
            }
            return resposta;
          }),
      ),
    );
  }
});

// ---------- Avisos (Web Push) ----------
// O servidor manda { titulo, texto, link, tag } criptografado; o navegador entrega aqui já aberto.
self.addEventListener("push", (evento) => {
  let dados = {};
  try {
    dados = evento.data ? evento.data.json() : {};
  } catch {
    dados = { titulo: "Preço Fechado", texto: evento.data ? evento.data.text() : "" };
  }
  const titulo = dados.titulo || "Preço Fechado";
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: dados.texto || "",
      icon: "/icones/icone-192.png",
      tag: dados.tag || undefined,
      renotify: Boolean(dados.tag),
      data: { link: dados.link || "/" },
    }),
  );
});

// Toque na notificação: abre (ou foca) o app na tela certa.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const destino = new URL((evento.notification.data && evento.notification.data.link) || "/", self.location.origin).href;
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) {
        if (new URL(j.url).origin === self.location.origin && "focus" in j) {
          return j.focus().then((f) => (f && "navigate" in f ? f.navigate(destino) : f));
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
