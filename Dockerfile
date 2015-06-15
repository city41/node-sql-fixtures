FROM node:0.12

ENV LAST_UPDATED "2014-11-16-2:45"

RUN mkdir /sql-fixtures

ADD README.md /sql-fixtures/
ADD package.json /sql-fixtures/
ADD gulpfile.js /sql-fixtures/
ADD lib/ /sql-fixtures/lib/
ADD test/ /sql-fixtures/test/

WORKDIR /sql-fixtures

RUN npm install
RUN npm install -g gulp
RUN npm install -g node-inspector
