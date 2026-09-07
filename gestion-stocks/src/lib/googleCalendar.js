// Synchronisation d'une commande avec Google Agenda.
// Utilise Google Identity Services (OAuth) + l'API Calendar côté client.
// Nécessite un Client ID OAuth Google configuré dans VITE_GOOGLE_CLIENT_ID (voir .env.example).

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient = null;
let accessToken = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureGapi() {
  if (gapiLoaded) return;
  await loadScript("https://apis.google.com/js/api.js");
  await new Promise((resolve) => window.gapi.load("client", resolve));
  await window.gapi.client.init({
    discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"],
  });
  gapiLoaded = true;
}

async function ensureGis() {
  if (gisLoaded) return;
  await loadScript("https://accounts.google.com/gsi/client");
  gisLoaded = true;
}

export function isGoogleCalendarConfigured() {
  return Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);
}

async function getAccessToken() {
  await ensureGapi();
  await ensureGis();

  if (accessToken) return accessToken;

  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      scope: "https://www.googleapis.com/auth/calendar.events",
      callback: (resp) => {
        if (resp.error) return reject(resp);
        accessToken = resp.access_token;
        window.gapi.client.setToken({ access_token: accessToken });
        resolve(accessToken);
      },
    });
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
}

// Crée (ou met à jour, si eventId déjà connu) un événement Google Agenda pour une commande.
// Retourne l'ID de l'événement créé, à sauvegarder sur la commande (champ googleEventId).
export async function syncCommandeToGoogleCalendar(commande) {
  await getAccessToken();

  const event = {
    summary: `${commande.produit} — ${commande.clientNom || "Client"}`,
    description: [
      commande.clientTelephone ? `Tél : ${commande.clientTelephone}` : "",
      commande.clientEmail ? `Email : ${commande.clientEmail}` : "",
      commande.tempsRealisation ? `Temps de réalisation : ${commande.tempsRealisation}` : "",
      commande.prixVente ? `Prix de vente : ${commande.prixVente} €` : "",
      commande.coutMatiere ? `Coût matière : ${commande.coutMatiere} €` : "",
      `Statut : ${commande.statut}`,
    ].filter(Boolean).join("\n"),
    start: { date: commande.dateDebut },
    end: { date: commande.dateFin },
  };

  if (commande.googleEventId) {
    const res = await window.gapi.client.calendar.events.update({
      calendarId: "primary",
      eventId: commande.googleEventId,
      resource: event,
    });
    return res.result.id;
  }

  const res = await window.gapi.client.calendar.events.insert({
    calendarId: "primary",
    resource: event,
  });
  return res.result.id;
}
