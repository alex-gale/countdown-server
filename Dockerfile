FROM node:latest

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY . /usr/src/app

ENV NODE_ENV production
ENV MONGODB_ADDRESS 172.17.0.1

EXPOSE 3005
RUN npm install
CMD ["npm", "start"]
