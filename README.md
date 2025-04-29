# places.pub

[places.pub](https://places.pub) is a service that makes OpenStreetMap geographical data available as [ActivityPub](https://activitypub.rocks/) objects.

It is a project of the [Social Web Foundation](https://socialwebfoundation.org/), a non-profit organization that promotes the development of the ActivityPub protocol and the social web.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
  - [Places](#places)
    - [URL](#url)
    - [Properties](#properties)
    - [Examples](#examples)
      - [Fetching a place](#fetching-a-place)
      - [Location for an actor](#location-for-an-actor)
      - [Location for a content object](#location-for-a-content-object)
      - [Location for an activity](#location-for-an-activity)
      - [Geosocial activities](#geosocial-activities)
  - [Search](#search)
    - [Example](#example)
- [Contributing](#contributing)
- [License](#license)


## Install

Most developers can use the live web service at [places.pub](https://places.pub) without installing any software.

If you want to run your own instance, you need to use [Google Cloud Run functions](https://cloud.google.com/run) or a compatible service (if those exist). We'd love to have mirrors, especially managed by other non-profit organizations and hosted on other cloud providers. Please let us know if you do this!

## Usage

### Places

Places in the places.pub service are represented as ActivityPub objects. You can use the [ActivityPub API](https://www.w3.org/TR/activitypub/) to interact with them.

#### URL

Each OpenStreetMap place is represented as an ActivityPub object, with an http URL as its `id`. OpenStreetMaps places have one of three types: `node`, `way`, or `relation`. The `type` field in the ActivityPub object URL is set to the type of the OpenStreetMap place. So, the URL for a place matches the URL template:

```
https://places.pub/{type}/{id}
```

Where `{type}` is the type of the OpenStreetMap place (`node`, `way`, or `relation`) and `{id}` is the OpenStreetMap numerical ID of the place.

The `id` field is not unique across types. For example, the node with ID 123456 and the way with ID 123456 are two different places. The `type` field in the ActivityPub object URL is used to disambiguate between them.

#### Properties

The ActivityPub object returned uses at least these vocabularies:

- [Activity Streams](https://www.w3.org/TR/activitystreams/)
- [GeoJSON](https://geojson.org/)
- [Dublin Core Terms](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/)
- [vCard](https://www.w3.org/TR/vcard-rdf/)

The ActivityPub object has at least the following properties:

- `id`: The URL of the place.
- `type`: The Activity Streams type `Place` and the geojson type `Feature`. This means that `type` is an array.
- `latitude`: The latitude of the place, or the latitude of the centroid of the place.
- `longitude`: The longitude of the place, or the longitude of the centroid of the place.
- `name`: The default name of the place, if provided.
- `summary`: The default description of the place, if provided.
- `nameMap`: A map of names in different languages, if provided.
- `dcterms:license`: The license of the place data, which for current places is the Open Database License (ODbL) used by OpenStreetMap.
- `dcterms:source`: The source of the place data, which is the OpenStreetMap page for the place.
- `geojson:hasGeometry`: The geometry of the place, which is a GeoJSON object. This is an array of coordinates for the place.
- `vcard:hasAddress`: The address of the place, if provided. This is an anonymous vCard `Address` object, with the following properties:
  - `vcard:street-address`: The street address of the place, if provided.
  - `vcard:locality`: The locality of the place, if provided.
  - `vcard:region`: The region of the place, if provided.
  - `vcard:postal-code`: The postal code of the place, if provided.
  - `vcard:country-name`: The country of the place, if provided.

Note that, as of this version, places.pub places do not have an `inbox` or `outbox` property. This means that they are not ActivityPub actors, and can't be followed remotely.

#### Examples

##### Fetching a place

You should be able to fetch a place using the URL template above. For example, the following command fetches the place with ID 27005:

```bash
curl -H 'Accept: application/activity+json' https://places.pub/relation/27005
```

places.pub does not require [HTTP Signature](https://swicg.github.io/activitypub-http-signature/)
authentication, so you can use the `curl` command above without any authentication.

##### Location for an actor

A `Place` makes a good value for the `location` property of an actor. For example, the following JSON-LD object is a minimal valid ActivityPub actor with a `location` property:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/person/john-doe",
  "type": "Person",
  "name": "John Doe",
  "location": {
    "id": "https://places.pub/relation/1224652",
    "type": "Place",
    "name": "Buenos Aires"
  },
  "inbox": "https://example.com/person/john-doe/inbox",
  "outbox": "https://example.com/person/john-doe/outbox"
}
```

##### Location for a content object

The `location` property can represent the location where a content object was created. For example, the following JSON-LD object is a minimal valid ActivityPub object with a `location` property:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/note/123456",
  "type": "Note",
  "content": "<p>This place is great!</p>",
  "location": {
    "id": "https://places.pub/way/132605490",
    "type": "Place",
    "name": "DNA Lounge"
  }
}
```

Sometimes content is made in one place, but is *about* a different place. In this case, use the `tag` property to represent the place that the content is about. For example, the following JSON-LD object is a minimal valid ActivityPub object with a `tag` property:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/image/789101112",
  "type": "Image",
  "summary": "<p>This is a painting I made of Limantour Beach while at the Sorbonne.</p>",
  "location": {
    "id": "https://places.pub/relation/4064150",
    "type": "Place",
    "name": "Sorbonne University"
  },
  "tag": {
    "id": "https://places.pub/way/445950449",
    "type": "Place",
    "name": "Limantour Beach"
  },
  "url": {
    "type": "Link",
    "href": "https://example.com/image/789101112.jpg",
    "mediaType": "image/jpeg"
  }
}
```

##### Location for an activity

The `location` property can represent the location where an activity took place. For example, the following JSON-LD object is a minimal valid ActivityPub object with a `location` property:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/activity/123456",
  "type": "Listen",
  "summary": "<p>Listening to a band at DNA Lounge.</p>",
  "object": {
    "id": "https://music.example/band/123456",
    "type": "Organization",
    "name": "Some Cool Band",
  },
  "location": {
    "id": "https://places.pub/way/132605490",
    "type": "Place",
    "name": "DNA Lounge"
  }
}
```

##### Geosocial activities

Several activity types are specifically about interacting with places.

The [`Arrive`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-arrive) activity is used to indicate that an actor has arrived at a place. It's great for a "checkin" activity. The `location` property of the `Arrive` activity indicates the place where the actor has arrived.

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/activity/123456",
  "type": "Arrive",
  "actor": {
    "id": "https://example.com/person/john-doe",
    "type": "Person",
    "name": "John Doe"
  },
  "summary": "<p>John Doe has arrived at DNA Lounge.</p>",
  "location": {
    "id": "https://places.pub/way/132605490",
    "type": "Place",
    "name": "DNA Lounge"
  }
}
```

The [`Leave`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-leave) activity is used to indicate that an actor has left a place. This can provide an additional level of user safety, since it does not indicate the user's current location. The `location` property of the `Leave` activity indicates the place where the actor has left.

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/activity/123456",
  "type": "Leave",
  "actor": {
    "id": "https://example.com/person/john-doe",
    "type": "Person",
    "name": "John Doe"
  },
  "summary": "<p>John Doe has left DNA Lounge.</p>",
  "object": {
    "id": "https://places.pub/way/132605490",
    "type": "Place",
    "name": "DNA Lounge"
  }
}
```

The [`Travel`](https://www.w3.org/TR/activitystreams-vocabulary/#dfn-travel) activity type indicates that an actor has traveled from one place to another. The `origin` and `target` proeprties of the `Travel` activity indicates the places where the actor has traveled from and to, respectively. This is a good way to indicate that an actor has traveled from one place to another, without indicating the actor's current location.

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://example.com/activity/123456",
  "type": "Travel",
  "actor": {
    "id": "https://example.com/person/john-doe",
    "type": "Person",
    "name": "John Doe"
  },
  "summary": "<p>John Doe has traveled from Amsterdam to Montreal.</p>",
  "origin": {
    "id": "https://places.pub/relation/271110",
    "type": "Place",
    "name": "Amsterdam"
  },
  "target": {
    "id": "https://places.pub/relation/1634158",
    "type": "Place",
    "name": "Montreal"
  }
}
```

### Search

The places.pub service provides a rudimentary search API for finding places. The search API is a simple HTTP GET request to the following URL:

```
https://places.pub/search?q={query}(&bbox={minLatitude},{minLongitude},{maxLatitude},{maxLongitude})
```

Here `{query}` is the search query and `{bbox}` is an optional bounding box for the search. The bounding box is specified as a comma-separated list of four values: `minLatitude`, `minLongitude`, `maxLatitude`, and `maxLongitude`. The bounding box is used to limit the search results to places within the specified area.

The search API does case-insenstive search of the place's default name. No other tags or properties are searched.

The API returns an Activity Streams 2.0 `Collection` object with the following properties:
- `id`: The URL of the search results.
- `type`: The Activity Streams type `Collection`.
- `totalItems`: The total number of items in the collection.
- `items`: An array of objects that match the search query. Each object in the array is an ActivityPub object representing a place, with these properties:
  - `id`: The URL of the place.
  - `type`: The Activity Streams type `Place`.
  - `name`: The default name of the place, if provided.

The search API is slow and not very accurate. [Nominatim](https://nominatim.org/) is a better search API for OpenStreetMap data. It's possible to construct places.pub object URLs from the Nominatim search results, but this is not done automatically.

#### Example

To search for the Montreal bar "Bily Kun", you can use the following command:

```bash
curl -H 'Accept: application/activity+json' 'https://places.pub/search?q=bily%20kun&bbox=-74.0,45.0,-73.0,46.0'
```

This will return the following JSON-LD object:

```json
{
  "@context": "https://www.w3.org/ns/activitystreams",
  "id": "https://places.pub/search?q=bily%20kun&bbox=-74.0,45.0,-73.0,46.0",
  "type": "Collection",
  "totalItems": 1,
  "items": [
    {
      "id": "https://places.pub/way/810790669",
      "type": "Place",
      "name": "Bily Kun"
    }
  ]
}
```

## Contributing

We welcome contributions to the places.pub project! If you have an idea for a new feature, bug fix, or improvement, please open an issue or pull request on GitHub at [https://github.com/social-web-foundation/places.pub](https://github.com/social-web-foundation/places.pub).

The service is provided by a [Google Cloud Run function](https://cloud.google.com/run) written in JavaScript. It uses the [OpenStreetMap](https://www.openstreetmap.org/) [public dataset](https://console.cloud.google.com/marketplace/product/openstreetmap/geo-openstreetmap) as its data source.

## License

The data served from the places.pub service is licensed under the Open Database License (ODbL) used by OpenStreetMap. The source code for the places.pub service is licensed under the [GNU Affero General Public License v3.0](https://www.gnu.org/licenses/agpl-3.0.html).