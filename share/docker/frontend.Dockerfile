FROM node:20-alpine3.22 AS build-stage
ARG VITE_API_URL
ARG PNPM_VERSION=v10.19.0

ENV VITE_API_URL=${VITE_API_URL}

RUN npm install -g pnpm@${PNPM_VERSION}

WORKDIR /app
COPY . ./
RUN pnpm install

ENV NODE_ENV=production
RUN pnpm run build

FROM node:20-alpine3.19 AS production-stage
ARG PNPM_VERSION

RUN npm install -g pnpm@${PNPM_VERSION}
RUN apk add --no-cache nginx
RUN rm -rf /etc/nginx/http.d/*

WORKDIR /app

COPY --from=build-stage /app/dist /app
COPY --from=build-stage /app/etc/nginx /etc/nginx/http.d
COPY --from=build-stage /app/bin/docker/entrypoint.sh /entrypoint.sh

RUN chmod -R a+rwX /app /var/lib/nginx /var/log/nginx /run /etc/nginx && \
    chmod +x /entrypoint.sh

ENV NODE_ENV=production

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
