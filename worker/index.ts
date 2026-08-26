// @ts-nocheck
/// <reference lib="webworker" />
export { };

declare const self: ServiceWorkerGlobalScope;

// Forzar actualización
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Recibir notificación PUSH
self.addEventListener('push', (event) => {
    let data: any = {};

    try {
        data = event.data?.json() ?? {};
    } catch (e) {
        console.error("Error al procesar la notificación PUSH", e);
    }

    const title = data.title || "Notificación de Raptor Burger";
    const options = {
        body: data.body || "Tienes una nueva actualización en tu pedido.",
        icon: "/logo.png",
        badge: "/logo.png",
        vibrate: [200, 100, 200, 100, 200],
        data: {
            url: data.url || "/",
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Click en la notificación
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});