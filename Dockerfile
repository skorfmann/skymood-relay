FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install

COPY index.ts .
COPY tsconfig.json .

ENV NODE_ENV production
CMD ["bun", "index.ts"]

EXPOSE 3000