#Represents a map of mapzen tiles
class TileMap:
    def __init__(self, identifier):
        self.identifier = identifier
        self.tile_map = {}
        self.center = []
        self.current_center = []
        self.is_current_tile_center = False
        self.threads = []
