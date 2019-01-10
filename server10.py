#!/usr/bin/env python

# WS server that decodes terrain tiles
import asyncio
import datetime
import random
import websockets
import json
import math
import threading
import stoppable_thread
import tile
import tile_map
from threading import Lock

init_scale = 1
##init_scale = 0.005
radius = 2                         #Radius of tilemap in browser
filetype = "terrarium"
size = 256
index = 0
#tile_map = {}
#center = []
#current_center = []
max_search_radius = 8              #Maximum radius for pre-fetching
mutex = Lock()
identifier = 0
##Each server corresponds to a single zoom level
zoom = 10
connected = set()
        
#Request Handler
async def consumer_handler(websocket, path):
    connected.add(websocket)
    global identifier
    consumer_map = tile_map.TileMap(identifier)
    identifier = identifier + 1
    
    while True:
        message = await websocket.recv()
        values = message.split(",")
        coordinates = (int(values[0]), int(values[1]))
        is_center = (str(values[2]))
        if not consumer_map.current_center or is_center == "True":
            consumer_map.current_center = coordinates
        if not consumer_map.center or abs(consumer_map.center[0] - coordinates[0]) > (max_search_radius - radius) or abs(consumer_map.center[1] - coordinates[1]) > (max_search_radius - radius):
            #Stop currently running threads and clear consumer_map thread list
            for i in range(0, len(consumer_map.threads)):
                consumer_map.threads[i].stop()
                consumer_map.threads[i].join()
            consumer_map.threads.clear()
            consumer_map.center = consumer_map.current_center
            consumer_map.tile_map.clear()
            if consumer_map.center not in consumer_map.tile_map:
                center_tile = tile.Tile(consumer_map.center, zoom, init_scale, filetype, size)
                consumer_map.tile_map[consumer_map.center] = center_tile
                center_tile.decode()
            #Initiate pre-fetching threads
            for i in range(0, max_search_radius):
                consumer_map.threads.append(stoppable_thread.StoppableThread(target=fetch_tiles_at_radius, args=(i, consumer_map.tile_map, consumer_map.center, )))
                consumer_map.threads[i].start()
        if coordinates in consumer_map.tile_map:
            new_tile = consumer_map.tile_map.get(coordinates)
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
def fetch_tiles_at_radius(radius, tile_map, center):
    #while not threading.current_thread().stopped:
    for i in range(center[0] - radius, center[0] + radius + 1):
        for j in range(center[1] - radius, center[1] + radius + 1):
            coordinate = (i, j)
            if (abs(coordinate[0] - center[0]) == radius and abs(coordinate[1] - center[1]) <= radius) or (abs(coordinate[1] - center[1]) == radius and abs(coordinate[0] - center[0]) <= radius):
                if coordinate not in tile_map:
                    new_tile = tile.Tile(coordinate, zoom, init_scale, filetype, size)
                    #Prevent race condition of adding to tile_map at same time
                    with mutex:
                        tile_map[coordinate] = new_tile
                    new_tile.decode()

    
def main():
    coordinator_loop = asyncio.new_event_loop()
    threading.Thread(target=coordinator, args=(coordinator_loop,)).start()

if __name__ == "__main__":
    main()
