// Keep the original game's pageview identity; exclude local and preview editions.
(() => {
  const page = new URL(window.location.href);
  if (page.protocol !== 'https:' || page.hostname !== 'yawatosho.github.io' ||
      !['/karuta_heroes/', '/karuta_heroes/index.html'].includes(page.pathname)) return;
  if (window.karutaAnalyticsEnabled) return;

  const measurementId = 'G-J6NS8CCNWN';
  page.search = '';
  page.hash = '';
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.karutaAnalyticsEnabled = true;
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: false,
    page_title: 'NDC Karuta Heroes',
    page_location: page.href
  });
  window.gtag('event', 'page_view', {
    page_title: 'NDC Karuta Heroes',
    page_location: page.href,
    page_path: page.pathname,
    game_mode: 'fighters'
  });

  const tag = document.createElement('script');
  tag.async = true;
  tag.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(tag);
})();
