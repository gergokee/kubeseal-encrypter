# Use the official lightweight Node.js 20 image.
# https://hub.docker.com/_/node
FROM node:20-slim

WORKDIR /usr/src/app

COPY package*.json ./

# Install production dependencies.
RUN npm install --only=production

# Install wget
RUN apt-get update && apt-get install -y wget curl

# Install kubectl
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x ./kubectl && mv ./kubectl /usr/local/bin/kubectl

# Install yq
RUN wget https://github.com/mikefarah/yq/releases/download/v4.9.6/yq_linux_amd64 -O /usr/bin/yq && chmod +x /usr/bin/yq

# Install kubeseal
RUN apt-get update && apt-get install -y wget && \
    wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.16.0/kubeseal-linux-amd64 -O kubeseal && \
    install -m 755 kubeseal /usr/local/bin/kubeseal && \
    rm -f kubeseal

COPY . .
EXPOSE 8080
CMD [ "npm", "start" ]
