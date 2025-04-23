const { BigQuery } = require('@google-cloud/bigquery');
const bq = new BigQuery();

function tagArrayToObject(all_tags) {
  const tags = {};
  for (const { key, value } of all_tags) {
    tags[key] = value;
  }
  return tags;
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
  const match = req.path.match(/^\/node\/(\d+)$/);
  if (!match) return res.status(404).send('Not Found');
  const nodeId = match[1];

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
      vcard: 'http://www.w3.org/2006/vcard/ns#',
      dcterms: 'http://purl.org/dc/terms/'
    }
  ];

  const place = {
    '@context': context,
    type: 'Place',
    id: `https://places.pub/node/${nodeId}`,
    name: tags.name,
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
