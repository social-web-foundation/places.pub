#!/bin/sh

aws --profile=personal \
  s3 sync \
  --acl public-read \
  --content-type application/activity+json \
  output s3://places-pub/osm
