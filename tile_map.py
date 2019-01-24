#Represents a map of mapzen tiles
class TileMap:
    def __init__(self, identifier):
        self.identifier = identifier
        self.tile_map = {}
        self.tile_coordinates = []
        self.center = []
        self.current_center = []
        self.is_current_tile_center = False
        self.threads = []
        self.tile_coordinate_counter = 0

    def find_tiles(self, radius):
        if self.tile_coordinates:
            self.tile_coordinates.clear()
        left_corner_coords = ((self.center[0] - radius), (self.center[1] - radius))
        for i in range(0, (2 * radius) + 1):
            for j in range(0, (2 * radius) + 1):
                coords = ((left_corner_coords[0] + i), (left_corner_coords[1] + j))
                self.tile_coordinates.append(coords)

    def find_tiles_concentric(self, radius):
        for i in range(1, radius):
            for j in range(self.center[0] - i, self.center[0] + i + 1):
                for k in range(self.center[1] - i, self.center[1] + i + 1):
                    coordinate = (j, k)
                    if (abs(coordinate[0] - self.center[0]) == i and abs(coordinate[1] - self.center[1]) <= i) or (abs(coordinate[1] - self.center[1]) == i and abs(coordinate[0] - self.center[0]) <= i):
                        self.tile_coordinates.append(coordinate)
                        
    def reset_map(self):
        print("reseting map")
        self.tile_map.clear()

    def reset_coordinates(self):
        print("reseting coordinates")
        self.tile_coordinates.clear()
                            
    def reset_counter(self):
        print("counter reset")
        self.tile_coordinate_counter = 0
