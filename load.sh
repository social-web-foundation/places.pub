#!/bin/sh

aws --profile=personal \
  s3 cp \
  --acl public-read \
  --content-type text/html \
  index.html s3://places-pub/

aws --profile=personal \
  s3 cp \
  --acl public-read \
  --content-type application/problem+json \
  404.json s3://places-pub/

aws --profile=personal \
  s3 sync \
  --acl public-read \
  --content-type application/activity+json \
  output s3://places-pub/osm
