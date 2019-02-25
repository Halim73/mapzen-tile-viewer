class TileMap {
	constructor(zoom, origin, radius) {
		this.zoom = zoom;
		this.origin = origin;
		this.radius = radius;
		this.map = new HashTable({});
		this.currentCenter = null;
	}
	
	addTile(tile) {
		this.map.setItem(tile.coordinates, tile);
	}
	
	//Removes old tiles no longer in frame
	update() {
		if(this.map.length != 0) {
			console.log("performing update");
			for(var i in this.map.items) {
				if(Math.abs(this.map.getItem(i).coordinates[0] - this.currentCenter.coordinates[0]) > this.radius || Math.abs(this.map.getItem(i).coordinates[1] - this.currentCenter.coordinates[1]) > this.radius) {
					this.map.getItem(i).remove();
					this.map.removeItem(i);
				}
			}
		}
	}
	
	//Check for neighbors in the map
	addNeighbors(tile) {
		for(var i in this.map.items) {
			tile.checkNeighbor(this.map.getItem(i));
		}
	}
	
	//delete all tiles in map
	deleteMap() {
		for(var i in this.map.items) {
			this.map.getItem(i).remove();
		}
		this.map = null;
	}
	
	//get tile at coordinates
	get(coordinates) {
		console.log("RETURNING TILE: ");
		console.log(this.map.getItem(coordinates));
		return this.map.getItem(coordinates);
	}
	
	contains(coordinates) {
		return this.map.hasItem(coordinates);
	}
}
