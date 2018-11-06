class TileMap {
	constructor(zoom, origin) {
		this.zoom = zoom;
		this.origin = origin;
		this.map = [];
	}
	
	addTile(tile) {
		this.map.push(tile);
	}
	
	//Removes old tiles no longer in frame
	update(center, radius) {
		//console.log("current center: ");
		//console.log(center);'
		for(var i = 0; i < this.map.length; i++) {
			//console.log("testing tile: ");
			//console.log(this.map[i]);
			if(Math.abs(this.map[i].coordinates[0] - center.coordinates[0]) > radius || Math.abs(this.map[i].coordinates[1] - center.coordinates[1]) > radius) {
				this.map[i].remove();
				//console.log("removing tile: ");
				//console.log(this.map[i]);
				this.map.splice(i, 1);
			}
		}
		//console.log("tileMap after update: ");
		//console.log(this.map);
	}
	
	//Check for neighbors in the map
	addNeighbors(tile) {
		for(var i = 0; i < this.map.length; i++) {
			tile.checkNeighbor(this.map[i]);
		}
	}
	
	//delete all tiles in map
	deleteMap() {
		for(var i = 0; i < this.map.length; i++) {
			this.map[i].remove();
		}
		tileMap.map = null;
	}
	
	//get tile at coordinates
	get(coordinates) {
		console.log("attempting to get tile with coordinates:")
		console.log(coordinates[0] + " " + coordinates[1]);
		console.log("tilemap length at this time: ");
		console.log(this.map.length);
		for(var i = 0; i < this.map.length; i++) {
			if(this.map[i].equals(coordinates)) {
				console.log("RETURNING TILE: ");
				console.log(this.map[i]);
				return this.map[i];
			}
		}
		console.log("RETURNING NULL");
		console.log("TILE MAP: ");
		console.log(this.map);
		return null;
	}
	
	contains(coordinates) {
		for(var i = 0; i < this.map.length; i++) {
			if(this.map[i].equals(coordinates)) {
				return true;
			}
		}
		return false;
	}
}
