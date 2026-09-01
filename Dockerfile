# Build the React/Vite client, then run the Node API and static assets in one
# same-origin container. Runtime secrets are supplied by the platform, never copied.
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY server ./server
COPY agent-runtime ./agent-runtime
COPY agent-spec ./agent-spec
COPY scripts ./scripts
COPY evals ./evals
COPY data ./data
COPY demo-seed ./demo-seed
COPY docs/creative-material-library ./docs/creative-material-library
COPY public ./public
EXPOSE 8789
CMD ["npm", "run", "server"]
