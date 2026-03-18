self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'رحلاتي', body: 'تحديث جديد من رحلاتي!' };
  
  const options = {
    body: data.body,
    icon: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
