FROM docker
COPY --from=docker/buildx-bin /buildx /usr/libexec/docker/cli-plugins/docker-buildx
RUN docker buildx version

FROM node:18 as client

WORKDIR /app/client

COPY client/package.json /app/client/

RUN npm install

COPY client /app/client/

RUN npm run build

FROM node:alpine

WORKDIR /app

COPY server/package.json /app

RUN npm install

COPY server /app

COPY --from=client /app/client/build /app/client

EXPOSE 8080

CMD [ "npm", "start" ]