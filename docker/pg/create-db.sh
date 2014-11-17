#!/bin/bash
echo "******CREATING TESTDB DATABASE******"
gosu postgres postgres --single <<- EOSQL
   CREATE DATABASE testdb;
   CREATE USER testdb with password 'password';
   GRANT ALL PRIVILEGES ON DATABASE testdb to testdb;
EOSQL
echo ""
echo "******TESTDB DATABASE CREATED******"
