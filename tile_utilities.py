from PIL import Image
from io import BytesIO
from math import floor, log, cos, tan, pi
import requests

#Convert lat, lon, and zoom to Web Mercator coordinates
def convert_to_coords(lat, lon, zoom):
    assert zoom >= 0 and zoom <= 20
    n = 2 ** zoom
    x = int(floor(n * ((lon + 180) / 360)))
    y = int(floor(n * (1 - (log(tan(lat * pi / 180) + (1 / cos(lat * pi / 180))) / pi)) / 2))
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
        #print(URL) 
        response = requests.get(URL)
        img = Image.open(BytesIO(response.content))
        return img
    except ValueError:
        print('Invalid url')

#Decode tile pixel
def decode_pixel(pixel):
    return (pixel[0] * 256 + pixel[1] + pixel[2] / 256) - 32768
