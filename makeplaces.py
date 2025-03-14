#!/usr/bin/env python3

# makeplaces.py
#
# Copyright 2025 Social Web Foundation
#
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at

#      http://www.apache.org/licenses/LICENSE-2.0

#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.

import xml.etree.ElementTree as ET
import json

def make_place(elem):
  place = dict()
  place['@context'] = 'https://www.w3.org/ns/activitystreams'
  place['type'] = 'Place'
  tags = elem.findall('tag')
  place['id'] = 'https://places.pub/osm/n' + elem.attrib.get('id')
  if elem.attrib.get('lat') is not None:
    place['latitude'] = float(elem.attrib.get('lat'))
  if elem.attrib.get('lon') is not None:
    place['longitude'] = float(elem.attrib.get('lon'))
  place['updated'] = elem.attrib.get('timestamp')
  nametag = next((t for t in tags if t.attrib.get('k') == 'name'), None)
  if nametag is not None:
    place['name'] = nametag.attrib.get('v')
  return place

def write_place(place, outputdir):
  place_id = place['id'].split('/')[-1]
  with open(f"{outputdir}/{place_id}", "w") as f:
    json.dump(place, f, indent=2)


def make_places(filename, outputdir):
  # Parse the XML file
  tree = ET.parse(filename)
  root = tree.getroot()

  for elem in root.iter():
    match (elem.tag):
      case 'node':
        if elem.find('tag') is not None:
          place = make_place(elem)
          write_place(place, outputdir)


if __name__ == "__main__":
  import sys
  filename = sys.argv[1]
  outputdir = sys.argv[2]
  make_places(filename, outputdir)