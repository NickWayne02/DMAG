// This file should be placed in the public folder
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// REPLACE THESE WITH YOUR ACTUAL FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyD0XrPyZCR5kG3fN8gErQgwvR5iek2sUsQ",
  authDomain: "dmag-cfbd4.firebaseapp.com",
  projectId: "dmag-cfbd4",
  storageBucket: "dmag-cfbd4.firebasestorage.app",
  messagingSenderId: "48873415968",
  appId: "1:48873415968:android:9e23a0323d44ed1d962345"
};

// Only initialize if config has been set
if (firebaseConfig.apiKey !== "YOUR_API_KEY") {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);

    let title = payload.notification?.title;
    let body = payload.notification?.body;
    let data = payload.data;

    // Handle data-only messages (e.g. Chat pushes)
    if (!title && data && data.title) {
      title = data.title;
      body = data.body;
    } else if (!title && data && data.sender_name) {
      title = data.sender_name;
      body = data.body || "";
    }

    if (!title) title = "Уведомление";

    const notificationOptions = {
      body: body,
      icon: "/favicon.ico", // Adjust if you have a different icon
      data: data,
      actions: [{ action: "open_chat", title: "Открыть приложение" }],
    };

    // Check if window is visible, if so, send postMessage instead of system notification
    return clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      let isAnyWindowVisible = false;
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.visibilityState === 'visible') {
          isAnyWindowVisible = true;
          client.postMessage({
            type: 'foreground_push',
            payload: {
              notification: { title, body },
              data: data
            }
          });
        }
      }
      
      if (!isAnyWindowVisible) {
        return self.registration.showNotification(title, notificationOptions);
      }
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // Can extract channelId from event.notification.data and navigate to a specific chat route if needed
      const url = self.location.origin;

      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
