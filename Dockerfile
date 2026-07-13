# syntax=docker/dockerfile:1
# Minimal placeholder deployment — the repo has no source code yet.
# Serves a static index.html on port 80 via nginx.
FROM nginx:1.27-alpine
COPY index.html /usr/share/nginx/html/index.html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
