# Use Node.js with a slim base image
FROM node:20-bookworm-slim

WORKDIR /app

RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=package-lock.json,target=package-lock.json \
    --mount=type=cache,target=/root/.npm \
    npm ci

# RUN addgroup --system --gid 1001 nodep
# RUN adduser --system --uid 1001 apijs

# RUN mkdir src/data
# RUN chown apijs:nodep src/data

COPY . .

CMD ["npm", "run", "start"]
