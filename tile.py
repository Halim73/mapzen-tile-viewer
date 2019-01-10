from PIL import Image
from io import BytesIO
import tile_utilities

#Represents a single mapzen tile
class Tile:
    def __init__(self, coordinates, zoom, init_scale, filetype, size):
        self.coordinates = coordinates
        self.zoom = zoom
        self.init_scale = init_scale
        self.filetype = filetype
        self.size = size
        self.data = []
        self.im = None
        self.done_decoding = False

    def __eq__(self, other):
        if self.coordinates == other.coordinates:
            return True

    #Retrieve and decode tile data
    def decode(self):
        scale = (2 ** (self.zoom - 10)) * self.init_scale
        self.im = tile_utilities.retrieve_image(self.coordinates, self.zoom, self.filetype, self.size)
        for i in range(0, self.im.size[1]):
            for j in range(0, self.im.size[0]):
                self.data.append(scale * tile_utilities.decode_pixel(self.im.getpixel((j, i))))
        self.done_decoding = True
