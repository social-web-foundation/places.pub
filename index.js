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

const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery();

const MAX_SEARCH_RESULTS = 100;

function tagArrayToObject(all_tags) {
  const tags = {};
  for (const { key, value } of all_tags) {
    tags[key] = value;
  }
  return tags;
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

exports.getPlace = async (req, res) => {
  let match = null;
  if (match = req.path.match(/^\/node\/(\d+)$/)) {
    return getNode(req, res, match.slice(1));
  } else if (match = req.path.match(/^\/way\/(\d+)$/)) {
    return getWay(req, res, match.slice(1));
  } else if (match = req.path.match(/^\/relation\/(\d+)$/)) {
    return getRelation(req, res, match.slice(1));
  } else if (match = req.path.match(/^\/search$/)) {
    return search(req, res);
  } else if (match = req.path.match(/^\/$/)) {
    return getRoot(req, res);
  } else {
    return res.status(404).send('Not Found');
  }
}

async function getRoot(req, res) {
  res.status(501).send('Not Implemented');
}

async function exactMatchSearch(query, type, limit = MAX_SEARCH_RESULTS) {

  if (limit <= 0) {
    return [];
  }

  const queryString = `
    SELECT
      id,
      all_tags
    FROM \`bigquery-public-data.geo_openstreetmap.planet_${type}s\`
    WHERE EXISTS (
      SELECT 1 FROM UNNEST(all_tags) t
      WHERE t.key = 'name' AND LOWER(t.value) = @query
    )
    LIMIT @limit
  `;

  const [rows] = await bq.query({
    query: queryString,
    params: {
      query: query.toLowerCase(),
      limit
    }
  });

  return rows.map(row => {
    const tags = tagArrayToObject(row.all_tags);
    return {
      type: 'Place',
      id: `https://places.pub/${type}/${row.id}`,
      name: tags.name
    };
  });
}

async function partialMatchSearch(query, type, limit = MAX_SEARCH_RESULTS) {

  if (limit <= 0) {
    return [];
  }

  const queryString = `
    SELECT
      id,
      all_tags
    FROM \`bigquery-public-data.geo_openstreetmap.planet_${type}s\`
    WHERE EXISTS (
      SELECT 1 FROM UNNEST(all_tags) t
      WHERE t.key = 'name' AND LOWER(t.value) LIKE @query
    )
  `;

  const [rows] = await bq.query({
    query: queryString,
    params: {
      query: `%${query.toLowerCase()}%`,
      limit
    }
  });

  return rows.map(row => {
    const tags = tagArrayToObject(row.all_tags);
    return {
      type: 'Place',
      id: `https://places.pub/${type}/${row.id}`,
      name: tags.name
    };
  });
}

async function search(req, res) {
  const { q } = req.query;
  if (!q) return res.status(400).send('Bad Request');
  if (q.length < 3) return res.status(400).send('Bad Request');

  let items = [];

  for (const type of ['node', 'way', 'relation']) {
    items = items.concat(await exactMatchSearch(q, type, MAX_SEARCH_RESULTS - items.length));
  }

  for (const type of ['node', 'way', 'relation']) {
    items = items.concat(await partialMatchSearch(q, type, MAX_SEARCH_RESULTS - items.length));
  }

  const context = 'https://www.w3.org/ns/activitystreams';

  const results = {
    '@context': context,
    type: 'Collection',
    id: `https://places.pub/search?q=${encodeURIComponent(q)}`,
    name: `places.pub search results for "${q}"`,
    totalItems: items.length,
    items: items
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(results);
}

async function getWay(req, res, match) {
  const [wayId] = match;

  const query = `
    SELECT
      id,
      all_tags,
      osm_timestamp,
      ST_Y(ST_CENTROID(geometry)) AS lat,
      ST_X(ST_CENTROID(geometry)) AS lon,
      ST_AsGeoJSON(geometry) AS geojson
    FROM \`bigquery-public-data.geo_openstreetmap.planet_ways\`
    WHERE id = @id
    LIMIT 1
  `;

  let rows;
  try {
    [rows] = await bq.query({
      query,
      params: { id: Number(wayId) }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }

  if (!rows.length) return res.status(404).send('Not Found');

  const row = rows[0];
  const tags = tagArrayToObject(row.all_tags);
  const geometry = JSON.parse(row.geojson);

  const context = [
    'https://www.w3.org/ns/activitystreams',
    {
      dcterms: 'http://purl.org/dc/terms/',
      geojson: 'https://purl.org/geojson/vocab#'
    }
  ];

  const place = {
    '@context': context,
    type: ["Place", "geojson:Feature"],
    id: `https://places.pub/way/${wayId}`,
    name: tags.name,
    nameMap: extractNameMap(tags),
    summary: tags.description,
    latitude: parseFloat(row.lat),
    longitude: parseFloat(row.lon),
    'dcterms:license': {
      type: 'Link',
      href: 'https://opendatacommons.org/licenses/odbl/1-0/',
      name: 'Open Database License (ODbL) v1.0'
    },
    'dcterms:source': {
      type: 'Link',
      href: `https://www.openstreetmap.org/way/${wayId}`,
      name: `OpenStreetMap way ${wayId}`
    },
    'geojson:hasGeometry': geometry,
    ...osmTagsToVCardAddress(tags)
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(place);
}

async function getRelation(req, res, match) {
  const [relationId] = match;

  const query = `
    SELECT
      id,
      all_tags,
      osm_timestamp,
      ST_Y(ST_CENTROID(geometry)) AS lat,
      ST_X(ST_CENTROID(geometry)) AS lon,
      ST_AsGeoJSON(geometry) AS geojson
    FROM \`bigquery-public-data.geo_openstreetmap.planet_relations\`
    WHERE id = @id
    LIMIT 1
  `;

  let rows;
  try {
    [rows] = await bq.query({
      query,
      params: { id: Number(relationId) }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }

  if (!rows.length) return res.status(404).send('Not Found');

  const row = rows[0];
  const tags = tagArrayToObject(row.all_tags);
  const geometry = JSON.parse(row.geojson);

  const context = [
    'https://www.w3.org/ns/activitystreams',
    {
      dcterms: 'http://purl.org/dc/terms/',
      geojson: 'https://purl.org/geojson/vocab#'
    }
  ];

  const place = {
    '@context': context,
    type: ["Place", "geojson:Feature"],
    id: `https://places.pub/relation/${relationId}`,
    name: tags.name,
    nameMap: extractNameMap(tags),
    summary: tags.description,
    latitude: parseFloat(row.lat),
    longitude: parseFloat(row.lon),
    'dcterms:license': {
      type: 'Link',
      href: 'https://opendatacommons.org/licenses/odbl/1-0/',
      name: 'Open Database License (ODbL) v1.0'
    },
    'dcterms:source': {
      type: 'Link',
      href: `https://www.openstreetmap.org/relation/${relationId}`,
      name: `OpenStreetMap relation ${relationId}`
    },
    'geojson:hasGeometry': geometry,
    ...osmTagsToVCardAddress(tags)
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(place);
}

async function getNode(req, res, match) {
  const [nodeId] = match;

  const query = `
    SELECT id, latitude, longitude, osm_timestamp, all_tags
    FROM \`bigquery-public-data.geo_openstreetmap.planet_nodes\`
    WHERE id = @id
    LIMIT 1
  `;

  const [rows] = await bq.query({
    query,
    params: { id: Number(nodeId) }
  });

  if (!rows.length) return res.status(404).send('Not Found');

  const row = rows[0];
  const tags = tagArrayToObject(row.all_tags);

  const context = [
    'https://www.w3.org/ns/activitystreams',
    {
      dcterms: 'http://purl.org/dc/terms/'
    }
  ];

  const place = {
    '@context': context,
    type: 'Place',
    id: `https://places.pub/node/${nodeId}`,
    name: tags.name,
    nameMap: extractNameMap(tags),
    summary: tags.description,
    latitude: parseFloat(row.latitude),
    longitude: parseFloat(row.longitude),
    'dcterms:license': {
      type: 'Link',
      href: 'https://opendatacommons.org/licenses/odbl/1-0/',
      name: 'Open Database License (ODbL) v1.0'
    },
    'dcterms:source': {
      type: 'Link',
      href: `https://www.openstreetmap.org/node/${nodeId}`,
      name: `OpenStreetMap node ${nodeId}`
    },
    ...osmTagsToVCardAddress(tags)
  };

  res.setHeader('Content-Type', 'application/activity+json');
  res.status(200).json(place);
};
