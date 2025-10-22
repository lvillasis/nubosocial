ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Next.js/Prisma"

WORKDIR /app
ENV NODE_ENV="production"

FROM base AS build
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp openssl pkg-config python-is-python3 && \
    rm -rf /var/lib/apt/lists/*

COPY package-lock.json package.json ./
COPY prisma ./prisma
RUN npm ci --include=dev

RUN npx prisma generate

COPY . .
RUN npx next build --experimental-build-mode compile
RUN npm prune --omit=dev

FROM base
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y openssl && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/archives

COPY --from=build /app /app

EXPOSE 3000
CMD ["npm", "run", "start"]
