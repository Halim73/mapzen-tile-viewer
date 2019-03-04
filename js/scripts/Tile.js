class Tile {
	constructor(data, coordinates, zoom, worldWidth, worldDepth, scale, origin, rightVertexIndices, leftVertexIndices, upVertexIndices, downVertexIndices) {
		this.data = data;
		this.coordinates = coordinates;
		this.zoom = zoom;
		this.worldWidth = worldWidth;
		this.worldDepth = worldDepth;
		this.scale = scale;
		this.origin = origin;
		this.geometry = null;
		this.mesh = null;
		this.texture = null;
		this.neighbors = new HashTable({});
		this.rightVertexIndices = rightVertexIndices;
		this.leftVertexIndices = leftVertexIndices;
		this.upVertexIndices = upVertexIndices;
		this.downVertexIndices = downVertexIndices;
		this.hasResolvedRight = false;
		this.hasResolvedLeft = false;
		this.hasResolvedUp = false;
		this.hasResolvedDown = false;
	}
	
	createGeometry() {
		//Define parameters of geometry
		var groundResolution = calculateGroundResolution(this.coordinates, this.zoom);
		var tileWidth = this.worldWidth * this.scale;
		var tileHeight = this.worldDepth * this.scale;

		//Create geometry and rotate to face camera
		this.geometry = new THREE.PlaneBufferGeometry(tileWidth, tileHeight, worldWidth - 1, worldDepth - 1);
		this.geometry.rotateX( - Math.PI / 2 );
		
		//Update geometry vertices with elevation data as y values
		var vertices = this.geometry.attributes.position.array;
		for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3) {
			vertices[j + 1] = this.data[ i ] / groundResolution;
		}
		
		//Translate tile relative to original center
		this.geometry.translate((this.coordinates[0] - this.origin[0]) * tileWidth, 0, (this.coordinates[1] - this.origin[1]) * tileHeight);
		
		//Compute normals and apply texture
		this.geometry.computeBoundingBox();   		//necessary?
		this.geometry.computeFaceNormals();
		this.geometry.computeVertexNormals();
	}
	
	createMesh() {
		var material = new THREE.MeshPhongMaterial({
			color:  0x8B4513,
		});
		
		//Create mesh
		this.mesh = new THREE.Mesh(this.geometry, material);
		this.mesh.updateMatrix();				//necessary
		scene.add(this.mesh);
		
		//User data for raycasting
		this.mesh.userData = {coordinates: this.coordinates};
	}
	
	//Add neighbor to neighbors set
	addNeighbor(direction, neighbor) {
		if(!(direction == "left" || direction == "right" || direction == "up" || direction == "down")) {
			throw new Exception("Unsupported direction");
		}
		
		this.neighbors.setItem(direction, neighbor);
	}
	
	//Determine direction of neighbor and add to set with appropriate key
	// checkNeighbor(tile) {
	// 	if(tile.coordinates[0] == this.coordinates[0] + 1 && tile.coordinates[1] == this.coordinates[1]) {
	// 		this.addNeighbor("right", tile);
	// 	}
	// 	else if (tile.coordinates[0] == this.coordinates[0] - 1 && tile.coordinates[1] == this.coordinates[1]) {
	// 		this.addNeighbor("left", tile);
	// 	}
	// 	else if (tile.coordinates[0] == this.coordinates[0] && tile.coordinates[1] == this.coordinates[1] - 1) {
	// 		this.addNeighbor("up", tile);
	// 	}
	// 	else if (tile.coordinates[0] == this.coordinates[0] && tile.coordinates[1] == this.coordinates[1] + 1) {
	// 		this.addNeighbor("down", tile);
	// 	}
	// }
	
	//Resolve seems between this tile and its neighbors
	resolveSeems() {
		for (var k in this.neighbors.items) {
			if (this.neighbors.hasItem(k)) {
				if (k == "right" && !this.neighbors.items[k].hasResolvedLeft) {
					this.resolveSeemsRight(this.neighbors.items[k]);
					this.hasResolvedRight = true;
				}
				else if (k == "left" && !this.neighbors.items[k].hasResolvedRight) {
					this.resolveSeemsLeft(this.neighbors.items[k]);
					this.hasResolvedLeft = true;
				}
				else if (k == "up" && !this.neighbors.items[k].hasResolvedDown) {
					this.resolveSeemsUp(this.neighbors.items[k]);
					this.hasResolvedUp = true;
				}
				else if(k == "down" && !this.neighbors.items[k].hasResolvedUp) {
					this.resolveSeemsDown(this.neighbors.items[k]);
					this.hasResolvedDown = true;
				}
			}
		}
	}
	
	resolveSeemsRight(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesRight = this.rightVertexIndices;
		var indicesLeft = tile.leftVertexIndices;
		
		for(var i = 0; i < indicesRight.length; i++) {
			var rightTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesRight[i]] = rightTileVertices[indicesLeft[i]];
		}
	}
	
	resolveSeemsLeft(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesRight = tile.rightVertexIndices;
		var indicesLeft = this.leftVertexIndices;

		for(var i = 0; i < indicesLeft.length; i++) {
			var leftTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesLeft[i]] = leftTileVertices[indicesRight[i]];
		}
	}
	
	resolveSeemsUp(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesUp = this.upVertexIndices;
		var indicesDown = tile.downVertexIndices;

		for(var i = 0; i < indicesUp.length; i++) {
			var upTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesUp[i]] = upTileVertices[indicesDown[i]];
		}
	}
	
	resolveSeemsDown(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesUp = tile.upVertexIndices;
		var indicesDown = this.downVertexIndices;

		for(var i = 0; i < indicesDown.length; i++) {
			var downTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesDown[i]] = downTileVertices[indicesUp[i]];
		}
	}
	
	remove() {
		if(this.mesh != null) {
			scene.remove(this.mesh);
			this.geometry.dispose();
			this.mesh.material.dispose();
			this.mesh = undefined;
		}
		else {
			console.log("yo mesh iz null");
		}
	}
	
	//Compare for equality against coordinates
	equals(that) {
		return (this.coordinates[0] == that[0] && this.coordinates[1] == that[1]);
	}
}