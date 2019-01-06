#!/usr/bin/env python

# WS server that decodes terrain tiles

from PIL import Image
from io import BytesIO
import asyncio
import datetime
import random
import websockets
import json
import requests
import math
import threading
from threading import Lock

init_scale = 1
##init_scale = 0.005
radius = 2                         #Radius of tilemap in browser
filetype = "terrarium"
size = 256
index = 0
tile_map = {}
center = []
center_changed = False
counter = 0
max_search_radius = 6              #Maximum radius for pre-fetching
mutex = Lock()
print_count = 0

##Each server corresponds to a single zoom level
zoom = 10

#Represents a single mapzen tile
class Tile:
    def __init__(self, coordinates):
        self.coordinates = coordinates
        self.data = []
        self.im = None
        self.done_decoding = False

    def __eq__(self, other):
        if self.coordinates == other.coordinates:
            return True

    #Retrieve and decode tile data
    def decode(self):
        scale = (2 ** (zoom - 10)) * init_scale
        self.im = retrieve_image(self.coordinates, zoom, filetype, size)
        for i in range(0, self.im.size[1]):
            for j in range(0, self.im.size[0]):
                self.data.append(scale * decode_pixel(self.im.getpixel((j, i))))
        self.done_decoding = True
    
#Convert lat, lon, and zoom to Web Mercator coordinates
def convert_to_coords(lat, lon, zoom):
    assert zoom >= 0 and zoom <= 20
    n = 2 ** zoom
    x = int(math.floor(n * ((lon + 180) / 360)))
    y = int(math.floor(n * (1 - (math.log(math.tan(lat * math.pi / 180) + (1 / math.cos(lat * math.pi / 180))) / math.pi)) / 2))
    coords = [x, y]
    return coords

#Generate tile URL from coordinates, zoom, filetype, and size
def generate_URL(coordinates, zoom, filetype, size):
    apiKey = "aLCQdfwuRaCCNQi4JrInMQ"
    url = ""
    
    if filetype == "normal" or filetype == "terrarium":
        url = "https://tile.nextzen.org/tilezen/terrain/v1/" + str(size) + "/" + filetype + "/" + str(zoom) + "/" + str(coordinates[0]) + "/" + str(coordinates[1]) + ".png?api_key=" + apiKey
	
    elif filetype == "geotiff":
        url = "https://s3.amazonaws.com/elevation-tiles-prod/" + filetype + "/" + str(zoom) + "/" + str(coordinates[0]) + "/" + str(coordinates[1]) + ".tif"
    
    else:
        raise ValueError('Unsupported format')

    return url

#Retrieve image from URL
def retrieve_image(coordinates, zoom, filetype, size):
    global print_count
    try:
        URL = generate_URL(coordinates, zoom, filetype, size)
        print(URL)
        print_count = print_count + 1 
        response = requests.get(URL)
        img = Image.open(BytesIO(response.content))
        return img
    except ValueError:
        print('Invalid url')

#Decode tile pixel
def decode_pixel(pixel):
    return (pixel[0] * 256 + pixel[1] + pixel[2] / 256) - 32768
        
#Request Handler
async def consumer_handler(websocket, path):
    global tile_map
    global center
    global center_changed
    global counter
    while True:
        message = await websocket.recv()
        values = message.split(",")
        coordinates = (int(values[0]), int(values[1]))
        if not center or abs(center[0] - coordinates[0]) > (max_search_radius - radius) or abs(center[1] - coordinates[1]) > (max_search_radius - radius):
            center = coordinates
            tile_map.clear()
            if center not in tile_map:
                center_tile = Tile(center)
                tile_map[center] = center_tile
                center_tile.decode()
            #Initiate pre-fetching threads
            for i in range(0, max_search_radius):
                threading.Thread(target=fetch_tiles_at_radius, args=(i, )).start()
        if coordinates in tile_map:
            new_tile = tile_map.get(coordinates)
            if new_tile.done_decoding:
                jsonTile = {"Coordinates": new_tile.coordinates, "Data": new_tile.data}
                await websocket.send(json.dumps(jsonTile))
            else:
                jsonTile = {"Coordinates": new_tile.coordinates, "Data": "Still decoding"}
                await websocket.send(json.dumps(jsonTile))
        else:
            jsonTile = {"Coordinates": coordinates, "Data": "Still fetching"}
            await websocket.send(json.dumps(jsonTile))

#Coordinate communication between client, server, and pre-fetching threads
def coordinator(loop):
    asyncio.set_event_loop(loop)
    start_server = websockets.serve(consumer_handler, port=3010)
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

#Pre-fetch all tiles at distance radius from center
def fetch_tiles_at_radius(radius):
    global tile_map
    global center
    for i in range(center[0] - radius, center[0] + radius + 1):
        for j in range(center[1] - radius, center[1] + radius + 1):
            coordinate = (i, j)
            if (abs(coordinate[0] - center[0]) == radius and abs(coordinate[1] - center[1]) <= radius) or (abs(coordinate[1] - center[1]) == radius and abs(coordinate[0] - center[0]) <= radius):
                if coordinate not in tile_map:
                    new_tile = Tile(coordinate)
                    #Prevent race condition of adding to tile_map at same time
                    with mutex:
                        tile_map[coordinate] = new_tile
                    new_tile.decode()

    
def main():
    coordinator_loop = asyncio.new_event_loop()
    threading.Thread(target=coordinator, args=(coordinator_loop,)).start()

if __name__ == "__main__":
    main()
