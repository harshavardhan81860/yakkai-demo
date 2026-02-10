# -----------------------------
# Stage 1: Build
# -----------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Script to run (only this is configurable)
ARG BUILD_SCRIPT=build:dev

COPY package*.json ./
RUN npm install

COPY . .

# Run the build script (vite already knows the mode)
RUN echo "Running build script: $BUILD_SCRIPT" && npm run $BUILD_SCRIPT

# Extract Vite mode from package.json script
RUN MODE=$(node -e "const s=require('./package.json').scripts['$BUILD_SCRIPT']; const m=s.match(/--mode\\s+(\\S+)/); console.log(m?m[1]:'development')") \
 && echo "Detected Vite mode: $MODE" \
 && ENV_FILE=".env.$MODE" \
 && echo "Reading $ENV_FILE" \
 && grep VITE_APP_BASE_PATH "$ENV_FILE" | cut -d '=' -f2 > basepath.txt \
 && cat basepath.txt


# -----------------------------
# Stage 2: Nginx
# -----------------------------
FROM nginx:alpine

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

# Copy build output
COPY --from=build /app/dist/ ./
COPY --from=build /app/basepath.txt /basepath.txt

# Create base-path folder and nginx config
RUN BASE_PATH=$(cat /basepath.txt | sed 's/^\/\|\/$//g') && \
    echo "Using BASE_PATH=$BASE_PATH" && \
    mkdir -p "$BASE_PATH" && \
    mv assets index.html "$BASE_PATH"/ && \
    printf "server {\n\
    listen 80;\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    location /%s {\n\
        try_files \$uri \$uri/ /%s/index.html;\n\
    }\n\
    location /%s/ {\n\
        try_files \$uri /%s/index.html;\n\
    }\n\
    location ~* \\\.(ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg)$ {\n\
        expires 1y;\n\
        access_log off;\n\
        add_header Cache-Control \"public\";\n\
    }\n\
    }\n" "$BASE_PATH" "$BASE_PATH" "$BASE_PATH" "$BASE_PATH"\
    > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
