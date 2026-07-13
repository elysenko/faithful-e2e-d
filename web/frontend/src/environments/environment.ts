export const environment = {
  production: false,
  // Book notes JSON API. In dev, ng serve proxies /api to the FastAPI backend
  // (see proxy.conf.json); in production nginx proxies /api to the backend service.
  apiUrl: '/api',
};
