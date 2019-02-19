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
from threading import Thread

init_scale = 1
##init_scale = 0.005
radius = 2                         #Radius of tilemap in browser
filetype = "terrarium"
size = 256
index = 0
#tile_map = {}
#center = []
#current_center = []
max_search_radius = 6              #Maximum radius for pre-fetching
mutex = Lock()
identifier = 0
##Each server corresponds to a single zoom level
zoom = 10
connected = set()
num_threads = 5
        
#Request Handler
async def consumer_handler(websocket, path):
    connected.add(websocket)
    global identifier
    consumer_map = tile_map.TileMap(identifier)
    identifier = identifier + 1
    just_started = True
    
    while True:
        message = await websocket.recv()
        values = message.split(",")
        coordinates = (int(values[0]), int(values[1]))
        is_center = (str(values[2]))
        if just_started:
            print("starting threads")
            #Initiate pre-fetching threads
            for i in range(0, num_threads):
                consumer_map.threads.append(Thread(target=fetch_tiles_producer_consumer, args=(consumer_map, )))
                consumer_map.threads[i].start()
            just_started = False
        if not consumer_map.current_center or is_center == "True":
            consumer_map.current_center = coordinates
        if not consumer_map.center or abs(consumer_map.center[0] - coordinates[0]) > (max_search_radius - radius) or abs(consumer_map.center[1] - coordinates[1]) > (max_search_radius - radius):
            consumer_map.center = consumer_map.current_center
            consumer_map.clear_coordinates()
            with mutex:
                consumer_map.reset_counter()
                consumer_map.reset_map(max_search_radius)
                consumer_map.find_tiles_concentric(max_search_radius)
                print(len(consumer_map.tile_coordinates))
            if consumer_map.center not in consumer_map.tile_map:
                center_tile = tile.Tile(consumer_map.center, zoom, init_scale, filetype, size)
                consumer_map.tile_map[consumer_map.center] = center_tile
                center_tile.decode()
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

#Pre-fetch tiles using producer consumer paradigm
def fetch_tiles_producer_consumer(consumer_map):
    print("hello form thread")
    while True:
        if not len(consumer_map.tile_coordinates) == 0 and consumer_map.tile_coordinate_counter < len(consumer_map.tile_coordinates):
            with mutex:
                coordinate = consumer_map.tile_coordinates[consumer_map.tile_coordinate_counter]
                consumer_map.tile_coordinate_counter+=1
                print("Counter right now: " + str(consumer_map.tile_coordinate_counter))
            new_tile = tile.Tile(coordinate, zoom, init_scale, filetype, size)
            consumer_map.tile_map[coordinate] = new_tile
            new_tile.decode()
        
#Pre-fetch all tiles at distance radius from center
def fetch_tiles_with_coordinates(num_threads, thread_id, consumer_map):
    for i in range(thread_id, len(consumer_map.tile_coordinates), num_threads):
        coordinate = consumer_map.tile_coordinates[i]
        if coordinate not in consumer_map.tile_map:
            new_tile = tile.Tile(coordinate, zoom, init_scale, filetype, size)
            #Prevent race condition of adding to tile_map at same time
            with mutex:
                consumer_map.tile_map[coordinate] = new_tile
            new_tile.decode()
            
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
