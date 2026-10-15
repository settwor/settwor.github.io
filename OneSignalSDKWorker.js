/* One service worker for the whole site (it must be the only one at the root):
   1) OneSignal: receives push notifications about new articles and shows them
   2) /sw.js: the site's own cache (pictures, fonts, styles, pages)
   Do not rename or delete this file. */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");
importScripts("/sw.js");
