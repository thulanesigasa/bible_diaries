FROM node:22-bookworm-slim
WORKDIR /workspace/mobile
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
ENV CI=1 EXPO_NO_TELEMETRY=1
RUN chown -R node:node /workspace
USER node
CMD ["npx","expo","export","--platform","android","--output-dir","/workspace/mobile/dist"]
