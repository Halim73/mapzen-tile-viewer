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

init_scale = 1
##init_scale = 0.005
radius = 1
tile_map = None
filetype = "terrarium"
size = 256

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
    try:
        URL = generate_URL(coordinates, zoom, filetype, size)
        print(URL)
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
    while True:
        message = await websocket.recv()
        values = message.split(",")
        coordinates = [values[0], values[1]]
        new_tile = Tile(coordinates)
        new_tile.decode()
        jsonTile = {"Coordinates": new_tile.coordinates, "Data": new_tile.data}
        await websocket.send(json.dumps(jsonTile))
        
start_server = websockets.serve(consumer_handler, port=3010)

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
