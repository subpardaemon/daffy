FROM node:12-alpine
LABEL maintainer="subpardaemon@gmail.com"
RUN mkdir /home/node/daffy && chown -R node:node /home/node/daffy
WORKDIR /home/node/daffy
USER node
COPY --chown=node:node ./package*.json daffy.js index.html ./
RUN npm i
ARG DAFFY_PORT=8033
ENV DAFFY_PORT=${DAFFY_PORT}
EXPOSE ${DAFFY_PORT}
CMD ["node", "daffy.js"]
