# places.pub

Places.pub is an online vocabulary of Activity Streams 2.0 Place objects, suitable for use with ActivityPub.

## Code license

   Copyright 2025 Social Web Foundation

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.

## Data license

Sample data in the sample-data/ directory is provided by [OpenStreetMap](https://openstreetmap.org/) and licensed under the [Open Database License](https://opendatacommons.org/licenses/odbl/1.0/).

See https://www.openstreetmap.org/copyright for more details.

## Overview

places.pub provides live, [ActivityPub](https://www.w3.org/TR/activitypub/) compatible JSON-LD data for places from the [OpenStreetMap](https://openstreetmap.org/) database.

An OSM `node` with any id is given an URL of the form `https://places.pub/osm/n{id}`. The JSON-LD representation of the node is available at that URL, as required by ActivityPub.

For example, the Bibliothèque de la Plateau Mont-Royal in Montreal, Canada, has the OSM id `4723279250`. The URL for the JSON-LD representation of this place is `https://places.pub/osm/n4723279250`.

## Process

The data import from OSM to places.pub uses a three-step process:

- **Extract**: The data is extracted from the [planet OSM](https://planet.openstreetmap.org/) data dump.
- **Transform**: The data is transformed into a JSON-LD representation suitable for ActivityPub using the `makeplaces.py` script.
- **Load**: The data is loaded to [Amazon S3](https://aws.amazon.com/s3/) and served via [CloudFront](https://aws.amazon.com/cloudfront/).

Serving static files from S3 via CloudFront is a cost-effective way to serve large amounts of data with low latency.

## Issues

Please report any issues with the data or the process in the [GitHub issue tracker](https://github.com/social-web-foundation/places.pub/issues).