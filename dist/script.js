// Sequenza di apertura: caricamento (min. 2s) → sipario → quadro → "scorri"
const LOADER_MS = 2000;

const MAX_WAIT_MS = 20000; // su rete molto lenta non si resta bloccati per sempre sul caricamento

// Durante il caricamento si prepara TUTTO: ogni immagine viene scaricata e decodificata,
// così nessuna schermata successiva compare in ritardo. La barra avanza davvero.
const SFONDI = ["img/sfondo.jpg", "img/intonaco.jpg", "img/ninfee.jpg",
  "img/cenacolo-gesu.jpg", "img/cenacolo-largo.jpg"]; // immagini usate come sfondo o alternativa
const barra = document.querySelector(".loader__bar span");
const daPreparare = [
  ...[...document.images].map((img) => img.currentSrc || img.src),
  ...SFONDI.map((src) => new URL(src, location.href).href),
].filter((src, i, tutte) => tutte.indexOf(src) === i);
let pronte = 0;
const avanza = () => { pronte++; barra.style.width = `${Math.round((pronte / daPreparare.length) * 100)}%`; };
const prepara = (src) => {
  const img = new Image();
  img.src = src;
  const caricata = img.decode
    ? img.decode().catch(() => new Promise((r) => { img.onload = img.onerror = r; if (img.complete) r(); }))
    : new Promise((r) => { img.onload = img.onerror = r; });
  return caricata.then(avanza, avanza);
};
const tuttoPronto = Promise.race([
  Promise.all([
    ...daPreparare.map(prepara),
    document.fonts ? document.fonts.ready : Promise.resolve(),
  ]),
  new Promise((resolve) => setTimeout(resolve, MAX_WAIT_MS)),
]);
const minDelay = new Promise((resolve) => setTimeout(resolve, LOADER_MS));

// Porta una schermata esattamente nello schermo visibile del telefono (barra del browser compresa):
// "inizio" allinea il bordo alto, "fine" il bordo basso (es. Gesù con i tasti dei giorni)
function portaA(el, dove = "inizio") {
  requestAnimationFrame(() => {
    const top = el.getBoundingClientRect().top + window.scrollY;
    const y = dove === "fine" ? top + el.offsetHeight - window.innerHeight : top;
    window.scrollTo({ top: Math.max(0, Math.round(y)), behavior: "smooth" });
  });
}

Promise.all([minDelay, tuttoPronto]).then(() => {
  barra.style.width = "100%";
  const body = document.body;
  body.classList.add("is-loaded");

  setTimeout(() => body.classList.add("is-open"), 400);

  setTimeout(() => {
    body.classList.add("is-ready");
    body.classList.remove("is-locked");
  }, 4800); // quando la telecamera è arrivata davanti al quadro
});

// ---------- La domanda: Sì apre la schermata successiva, No... non è disponibile ----------
const MESSAGGI_NO = [
  "Qualcosa è andato storto... Riprovare con SÌ",
  "Inutile tentare, il servizio NO non è disponibile",
  "Ehi, mi avevi già detto di sì, non puoi cambiare idea così",
  "Daiii per piacereee", // dal quarto No in poi
];

const btnSi = document.getElementById("btn-si");
const btnNo = document.getElementById("btn-no");
const errore = document.getElementById("errore");
const dopo = document.getElementById("dopo");
let tentativiNo = 0;

btnNo.addEventListener("click", () => {
  errore.textContent = MESSAGGI_NO[Math.min(tentativiNo, MESSAGGI_NO.length - 1)];
  tentativiNo++;
  notifica(`Tentativo di No n° ${tentativiNo}`,
    `Ha premuto NO per la ${tentativiNo}ª volta.\nHa visto: "${errore.textContent}"`, { tag: "no_good" });
  errore.hidden = false;
  errore.classList.remove("is-shaking");
  void errore.offsetWidth; // fa ripartire l'animazione a ogni click
  errore.classList.add("is-shaking");
});

btnSi.addEventListener("click", () => {
  if (!stato.si) {
    stato.si = true;
    notifica("HA DETTO SÌ", tentativiNo
      ? `Ha premuto Sì dopo ${tentativiNo} tentativ${tentativiNo === 1 ? "o" : "i"} di No.`
      : "Ha premuto Sì al primo colpo, senza tentare il No.", { tag: "tada,heart", priorita: 4 });
  }
  errore.hidden = true;
  dopo.hidden = false;
  portaA(dopo, "fine"); // fino ai tasti dei giorni
});

// ---------- I due giorni sotto le mani di Gesù ----------
// La schermata successiva resta nascosta (e quindi non si scorre oltre) finché non sceglie un giorno
const giorni = document.querySelectorAll(".giorno");
const attivita = document.getElementById("attivita");
giorni.forEach((btn) => {
  btn.addEventListener("click", () => {
    const prima = stato.giorno;
    stato.giorno = btn.dataset.giorno;
    if (prima !== stato.giorno) {
      notifica(`Giorno: ${stato.giorno}`, prima
        ? `Ha cambiato idea: da ${prima} a ${stato.giorno}.`
        : `Ha scelto ${stato.giorno}.`, { tag: "date" });
    }
    giorni.forEach((b) => b.classList.toggle("is-scelto", b === btn));
    attivita.hidden = false;
    portaA(attivita);
    avviaVetrina();
  });
});

// ---------- Cosa fare: immagini che si alternano, scelte multiple, "Altro" con casella ----------
const vetrina = document.querySelectorAll(".vetrina__img");
let vetrinaTimer = null;
function avviaVetrina() {
  if (vetrinaTimer) return;
  let i = 0;
  vetrinaTimer = setInterval(() => {
    vetrina[i].classList.remove("is-attiva");
    i = (i + 1) % vetrina.length;
    vetrina[i].classList.add("is-attiva");
  }, 3500);
}

// La schermata delle Ninfee resta nascosta finché non sceglie un'attività (o scrive la sua e preme Invio)
const invio = document.getElementById("invio");
function mostraInvio() {
  invio.hidden = false;
  portaA(invio);
}

const altroTesto = document.getElementById("altro-testo");
const altroConferma = document.getElementById("altro-conferma");
document.querySelectorAll(".attivita__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const scelto = btn.classList.toggle("is-scelto");
    const nome = btn.textContent.trim();
    if (scelto) stato.attivita.add(nome); else stato.attivita.delete(nome);
    notifica(`${scelto ? "Scelta" : "Tolta"}: ${nome}`,
      `Attività scelte ora: ${[...stato.attivita].join(", ") || "nessuna"}.`, { tag: "dart" });
    if (btn.classList.contains("attivita__btn--altro")) {
      btn.setAttribute("aria-expanded", String(scelto));
      altroTesto.hidden = !scelto;
      altroConferma.hidden = !scelto;
      if (scelto) altroTesto.focus();
    } else if (scelto) {
      mostraInvio();
    }
  });
});

// "Altro": conferma con Invio (Maiusc+Invio va a capo) o con il tasto Conferma
function confermaAltro() {
  if (!altroTesto.value.trim()) { altroTesto.focus(); return; }
  altroTesto.blur(); // chiude la tastiera sul telefono
  if (altroTesto.value.trim() !== stato.altro) {
    stato.altro = altroTesto.value.trim();
    notifica("Ha scritto in \"Altro\"", stato.altro, { tag: "writing_hand" });
  }
  mostraInvio();
}
let maiuscPremuto = false;
altroTesto.addEventListener("keydown", (e) => {
  maiuscPremuto = e.shiftKey;
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    confermaAltro();
  }
});
// alcune tastiere Android non segnalano il tasto Invio: lo si riconosce dall'a capo inserito
altroTesto.addEventListener("beforeinput", (e) => {
  if (e.inputType === "insertLineBreak" && !maiuscPremuto) {
    e.preventDefault();
    confermaAltro();
  }
});
altroConferma.addEventListener("click", confermaAltro);

// ---------- Notifiche sul telefono di Valerio (ntfy) ----------
// Ogni passo dell'invito manda una notifica all'argomento ntfy. Aprendo il sito con "?prova"
// in fondo al link, le notifiche arrivano con l'etichetta [PROVA] (per distinguere i test).
const NTFY_TOPIC = "Invito-CavalierAripino71003";
const PROVA = new URLSearchParams(location.search).has("prova");
const SESSIONE = Math.random().toString(36).slice(2, 6).toUpperCase();
const inizio = Date.now();
const stato = { si: false, giorno: null, attivita: new Set(), altro: "", tappa: "il sipario" };

function dispositivo() {
  const ua = navigator.userAgent;
  const iPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); // gli iPad recenti si dichiarano Mac
  const sistema = /iPhone/.test(ua) ? "iPhone" : iPad ? "iPad" : /Android/.test(ua) ? "Android"
    : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "PC Windows" : "altro dispositivo";
  const browser = /Edg\//.test(ua) ? "Edge" : /CriOS|Chrome/.test(ua) ? "Chrome" : /FxiOS|Firefox/.test(ua) ? "Firefox"
    : /Safari/.test(ua) ? "Safari" : "browser";
  return `${sistema}, ${browser}`;
}

function durata() {
  const sec = Math.round((Date.now() - inizio) / 1000);
  return sec < 60 ? `${sec} s` : `${Math.floor(sec / 60)} min ${sec % 60} s`;
}

function notifica(titolo, testo, { tag = "", priorita = 3, beacon = false } = {}) {
  const url = `https://ntfy.sh/${NTFY_TOPIC}?` + new URLSearchParams({
    title: (PROVA ? "[PROVA] " : "") + titolo,
    tags: tag,
    priority: String(priorita),
  });
  const ora = new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
  const corpo = `${testo}\n\n— sessione ${SESSIONE} · ore ${ora}`;
  // in uscita dalla pagina sendBeacon è l'unico invio che il browser garantisce
  if (beacon && navigator.sendBeacon && navigator.sendBeacon(url, corpo)) return Promise.resolve(true);
  return fetch(url, { method: "POST", body: corpo, keepalive: true })
    .then((r) => r.ok)
    .catch(() => false);
}

notifica("Invito aperto", `Ha aperto l'invito da ${dispositivo()}.`, { tag: "eyes" });

// fin dove è arrivata scorrendo
const tappe = [
  [document.querySelector(".cielo__schermo"), "la dedica", "Sta leggendo la dedica", "scroll"],
  [document.getElementById("domanda"), "la domanda", "È arrivata alla domanda", "question"],
  [document.getElementById("dopo"), "il Cenacolo (scelta del giorno)", null],
  [document.getElementById("attivita"), "le attività", null],
  [document.getElementById("invio"), "le Ninfee (Invia dati)", null],
];
const osservatore = new IntersectionObserver((voci) => {
  voci.forEach((v) => {
    if (!v.isIntersecting) return;
    const tappa = tappe.find((t) => t[0] === v.target);
    stato.tappa = tappa[1];
    if (tappa[2]) notifica(tappa[2], `È arrivata a ${tappa[1]} dopo ${durata()}.`, { tag: tappa[3] });
    osservatore.unobserve(v.target);
  });
}, { threshold: 0.5 });
tappe.forEach((t) => osservatore.observe(t[0]));

// quando lascia la pagina (chiude, cambia app, blocca il telefono) e quando torna
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    notifica("Ha lasciato l'invito", `Si è fermata a ${stato.tappa}, dopo ${durata()} sull'invito.`,
      { tag: "door", priorita: 2, beacon: true });
  } else {
    notifica("È tornata sull'invito", `Riprende da ${stato.tappa}.`, { tag: "repeat", priorita: 2 });
  }
});

// il riepilogo finale
const btnInvia = document.getElementById("btn-invia");
btnInvia.addEventListener("click", async () => {
  btnInvia.disabled = true;
  btnInvia.textContent = "Invio in corso…";
  const riepilogo = [
    `Uscita: ${stato.si ? "SÌ" : "—"}${tentativiNo ? ` (dopo ${tentativiNo} tentativ${tentativiNo === 1 ? "o" : "i"} di No)` : ""}`,
    `Giorno: ${stato.giorno || "non scelto"}`,
    `Attività: ${[...stato.attivita].join(", ") || "nessuna"}`,
    stato.altro ? `Altro: ${stato.altro}` : null,
    `Tempo sull'invito: ${durata()}`,
    `Dispositivo: ${dispositivo()}`,
  ].filter(Boolean).join("\n");
  const ok = await notifica("RIEPILOGO — Invia dati", riepilogo, { tag: "envelope_with_arrow,star", priorita: 5 });
  btnInvia.textContent = ok ? "Inviato ✓" : "Riprova";
  btnInvia.disabled = ok;
});
