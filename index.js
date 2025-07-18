// places.pub - a service for using OpenStreetMap data in ActivityPub
//
// Copyright (C) 2025 Social Web Foundation <https://socialwebfoundation.org/>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

const fs = require('fs').promises;
const path = require('path');
const marked = require('marked');
const { ProblemDocument } = require('http-problem-details');

const MAX_SEARCH_RESULTS = 100;

let ReadMeHtml = null;

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

let version = null

async function getVersion() {
  if (!version) {
    const packagePath = path.join(__dirname, 'package.json');
    const packageContent = await fs.readFile(packagePath, 'utf8');
    const package = JSON.parse(packageContent)
    version = package.version
  }
  return version
}

async function runOverpass(query) {
  const version = await getVersion()
  const resp = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': `places.pub/${version} (https://places.pub/; https://github.com/social-web-foundation/places.pub; evan@socialwebfoundation.org)`
    },
    body: 'data=' + encodeURIComponent(query)
  });
  if (!resp.ok) throw new Error(`Overpass error ${resp.status}`);
  return resp.json();  // full envelope: { version, osm3s, elements, ... }
}

// Function to round coordinates to 5 decimal places
function roundCoord(coord) {
  return Math.round(coord * 1e5) / 1e5;
}

function extractNameMap(tags) {
  const nameMap = {};
  for (const [key, value] of Object.entries(tags)) {
    if (key.startsWith('name:')) {
      const lang = key.split(':')[1];
      if (lang && /^[a-z]{2,8}(-[A-Za-z0-9]+)*$/.test(lang)) {
        nameMap[lang] = value;
      }
    }
  }
  return Object.keys(nameMap).length ? nameMap : undefined;
}

function osmTagsToVCardAddress(tags) {
  const {
    'addr:housenumber': number,
    'addr:street': street,
    'addr:city': city,
    'addr:state': state,
    'addr:postcode': postcode,
    'addr:country': country
  } = tags;

  const address = {
    type: 'vcard:Address'
  };

  if (street || number) {
    address['vcard:street-address'] = number && street ? `${number} ${street}` : street || number;
  }
  if (city) address['vcard:locality'] = city;
  if (state) address['vcard:region'] = state;
  if (postcode) address['vcard:postal-code'] = postcode;
  if (country) address['vcard:country-name'] = country;

  return Object.keys(address).length > 1 ? { 'vcard:hasAddress': address } : undefined;
}

function isProblemDocument(err) {
  return err && err.constructor && err.constructor.name === 'ProblemDocument';
}

exports.getPlace = async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(204).send('');
  }

  try {
    let match = null;

    if (match = req.path.match(/^\/node\/(\d+)$/)) {
      return getPlaceObject(req, res, match[1], 'node');
    } else if (match = req.path.match(/^\/way\/(\d+)$/)) {
      return getPlaceObject(req, res, match[1], 'way');
    } else if (match = req.path.match(/^\/relation\/(\d+)$/)) {
      return getPlaceObject(req, res, match[1], 'relation');
    } else if (match = req.path.match(/^\/search$/)) {
      return search(req, res);
    } else if (match = req.path.match(/^\/$/)) {
      return getRoot(req, res);
    } else if (match = req.url.match(/^\/osm\/(.+)$/)) {
      return res.redirect(301, `https://places.pub/${match[1]}`);
    } else {
      throw new ProblemDocument({
        status: 404,
        title: 'Not Found',
        detail: 'No route for this URL',
        instance: req.originalUrl
      })
    }
  } catch (err) {
    if (isProblemDocument(err)) {
      res
        .status(err.status)
        .setHeader('Content-Type', 'application/problem+json')
        .json(err)
    } else {
      console.error(err);
      res
        .status(500)
        .setHeader('Content-Type', 'application/problem+json')
        .json(new ProblemDocument({
          status: 500,
          title: 'Internal Server Error',
          detail: 'An unexpected error occurred.',
          instance: req.originalUrl
        }));
    }
  }
}

async function getRoot(req, res) {
  if (ReadMeHtml === null) {
    try {
      const readmePath = path.join(__dirname, 'README.md');
      const readmeContent = await fs.readFile(readmePath, 'utf8');
      ReadMeHtml = marked.parse(readmeContent);
    } catch (error) {
      console.error('Error reading README.md:', error);
      throw new ProblemDocument({
        status: 500,
        instance: req.originalUrl,
        detail: "Error reading README.md"
      })
    }
  }
  const fullPage = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <title>places.pub</title>
    <style>
      body {
        margin: 0;
        padding: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        min-height: 100vh;
        font-family: sans-serif;
        background: #fff;
      }
      main {
        max-width: 80ch;
        width: 100%;
      }
    </style>
  </head>
  <body>
    <main>
      ${ReadMeHtml}
    </main>
  </body>
  </html>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(fullPage);
}

async function nameSearch(q) {
  const esc = q.replace(/["\\]/g, '\\$&');
  const query = `[out:json];
    (
      node["name"~"${esc}",i];
      way ["name"~"${esc}",i];
      relation["name"~"${esc}",i];
    );
    out tags;`;
  const json = await runOverpass(query)
  return json.elements
}

async function bboxSearch(parts) {
  const [w, s, e, n] = parts
  const query = `[out:json];
    (
      node(${s},${w},${n},${e})["name"];
      way (${s},${w},${n},${e})["name"];
      relation(${s},${w},${n},${e})["name"];
    ) -> .inside;

    is_in(${s},${w});
    rel(pivot);
    relation._["name"] -> .containers;
    (.inside; .containers;);
    out tags;`;
  const json = await runOverpass(query);
  return json.elements
}

async function nameBbboxSearch(q, parts) {
  const [w, s, e, n] = parts
  const esc = q.replace(/["\\]/g, '\\$&');
  const query = `[out:json];
    (
      node(${s},${w},${n},${e})["name"~"${esc}",i];
      way (${s},${w},${n},${e})["name"~"${esc}",i];
      relation(${s},${w},${n},${e})["name"~"${esc}",i];
    ) -> .inside;

    is_in(${s},${w});
    rel(pivot);
    relation._["name"~"${esc}",i] -> .containers;
    (.inside; .containers;);
    out tags;`;
  const json = await runOverpass(query);
  return json.elements
}

async function search(req, res) {

  const { q, bbox } = req.query;

  if (!q && !bbox) {
    throw new ProblemDocument({
      status: 400,
      detail: 'At least one of q or bbox argument required',
      instance: req.originalUrl
    })
  }

  if (q && q.length < 3) {
    throw new ProblemDocument({
      status: 400,
      detail: 'q parameter must be 3 characters or longer',
      instance: req.originalUrl
    })
  }

  let parts = [];

  if (bbox) {

    parts = bbox.split(',');

    if (parts.length !== 4) {
      throw new ProblemDocument({
        status: 400,
        detail: 'bbox parameter must be 4 comma-separated numbers',
        instance: req.originalUrl
      })
    }

    if (parts.some((p) => !/^-?\d+(\.\d+)?$/.test(p))) {
      throw new ProblemDocument({
        status: 400,
        detail: 'bbox parameter must be 4 comma-separated numbers',
        instance: req.originalUrl
      })
    }

    parts = parts.map((p) => parseFloat(p));

    if (parts.some((p) => isNaN(p))) {
      throw new ProblemDocument({
        status: 400,
        detail: 'bbox parameter must be 4 comma-separated numbers',
        instance: req.originalUrl
      })
    }

    if (parts[0] > 180 || parts[0] < -180 ||
      parts[1] > 90 || parts[1] < -90 ||
      parts[2] > 180 || parts[2] < -180 ||
      parts[3] > 90 || parts[3] < -90) {
      throw new ProblemDocument({
        status: 400,
        detail: 'longitude can be -180 to 180; latitude can be -90 to 90',
        instance: req.originalUrl
      })
    }
  }

  const items = (q && bbox)
    ? await nameBbboxSearch(q, parts)
    : (bbox)
      ? await bboxSearch(parts)
      : await nameSearch(q)

  const places = items.map(item => {
    return {
      id: `https://places.pub/${item.type}/${item.id}`,
      type: 'Place',
      name: item.tags.name
    }
  })

  const context = 'https://www.w3.org/ns/activitystreams';

  const results = {
    '@context': context,
    type: 'Collection',
    id: `https://places.pub${req.url}`,
    name: `places.pub search results${(q ? ` for query "${q}"` : '')} ${(bbox ? ` inside bounding box (${bbox})` : '')}`,
    totalItems: items.length,
    items: places
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(results);
}

async function getPlaceObject(req, res, placeId, type) {
  if (!placeId) {
    throw new ProblemDocument({
      status: 400,
      detail: 'Missing place ID parameter in URL',
      instance: req.originalUrl
    })
  }
  if (!/^\d+$/.test(placeId)) {
    throw new ProblemDocument({
      status: 400,
      detail: `Place ID parameter must be an integer; got ${placeId}`,
      instance: req.originalUrl
    })
  }
  if (type !== 'node' && type !== 'way' && type !== 'relation') {
     throw new ProblemDocument({
      status: 400,
      detail: `Place type parameter must be one of "node", "way" or "relation", got ${type}`,
      instance: req.originalUrl
    })
  }

  const query = `
    [out:json];
    ${type}(${placeId});
    out geom;
  `;

  const results = await runOverpass(query)

  if (!results.elements || results.elements.length === 0) {
    throw new ProblemDocument({
      status: 404,
      detail: `No object with type ${type} and id ${placeId} found`,
      instance: req.originalUrl
    })
  }

  const el = results.elements[0]

  const tags = el.tags || {};

  const context = [
    'https://www.w3.org/ns/activitystreams',
    {
      dcterms: 'http://purl.org/dc/terms/'
    }
  ];

  const place = {
    '@context': context,
    type: "Place",
    id: `https://places.pub/${type}/${placeId}`,
    to: 'as:Public',
    name: tags.name,
    nameMap: extractNameMap(tags),
    summary: tags.description,
    image: tags.image,
    latitude: roundCoord(parseFloat(el.lat)),
    longitude: roundCoord(parseFloat(el.lon)),
    altitude: (tags.ele) ? Math.round(parseFloat(tags.ele)) : undefined,
    units: (tags.ele) ? 'm' : undefined,
    'dcterms:license': {
      type: 'Link',
      href: 'https://opendatacommons.org/licenses/odbl/1-0/',
      name: 'Open Database License (ODbL) v1.0'
    },
    'dcterms:source': {
      type: 'Link',
      href: `https://www.openstreetmap.org/${type}/${placeId}`,
      name: `OpenStreetMap ${type} ${placeId}`
    },
    ...osmTagsToVCardAddress(tags)
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(place);
}
