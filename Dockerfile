FROM node:20-alpine AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["/bin/sh", "-c", "find /usr/share/nginx/html -type f -name '*.js' -exec sed -i 's|MYPAAS_GEMINI_API_KEY_PLACEHOLDER|'\"$VITE_GEMINI_API_KEY\"'|g' {} + && nginx -g 'daemon off;'"]

