#!/bin/sh

aws --profile=personal \
  s3 rm \
  s3://places-pub/ \
  --recursive \
  --exclude "index.html" \
  --exclude "404.json"