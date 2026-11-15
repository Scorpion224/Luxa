# Peinture Pro Guinée — image de production
FROM node:20-alpine AS base

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app

# Dépendances d'exécution uniquement
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Code de l'application
COPY server.js ./
COPY server ./server
COPY data ./data
COPY public ./public
COPY docs ./docs

# La base locale doit être inscriptible par l'utilisateur non privilégié.
# En production, montez un volume sur /app/data (ou définissez DB_FILE).
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/health > /dev/null || exit 1

CMD ["node", "server.js"]
