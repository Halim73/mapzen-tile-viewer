class Tile {
	constructor(data, coordinates, zoom, worldWidth, worldDepth, scale) {
		this.data = data;
		this.coordinates = coordinates;
		this.zoom = zoom;
		this.worldWidth = worldWidth;
		this.worldDepth = worldDepth;
		this.scale = scale;
		this.geometry = null;
		this.mesh = null;
		this.texture = null;
		this.neighbors = new HashTable({});
	}
	
	createGeometry() {
		//Define parameters of geometry
		var groundResolution = calculateGroundResolution(this.coordinates, this.zoom);
		var tileWidth = groundResolution * this.worldWidth * this.scale;
		var tileHeight = groundResolution * this.worldDepth * this.scale;

		//Create geometry and rotate to face camera
		this.geometry = new THREE.PlaneBufferGeometry(tileWidth, tileHeight, worldWidth - 1, worldDepth - 1);
		this.geometry.rotateX( - Math.PI / 2 );
		
		//Update geometry vertices with elevation data as y values
		var vertices = this.geometry.attributes.position.array;
		for ( var i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3) {
			vertices[j + 1] = this.data[ i ];
		}
		
		//Translate tile relative to original center
		this.geometry.translate((this.coordinates[0] - tileMap.origin[0]) * tileWidth, 0, (this.coordinates[1] - tileMap.origin[1]) * tileHeight);
		
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
	
	addNeighbor(direction, neighbor) {
		if(!(direction == "left" || direction == "right" || direction == "up" || direction == "down")) {
			throw new Exception("Unsupported direction");
		}
		
		this.neighbors.setItem(direction, neighbor);
	}
	
	//Determine if incoming tile is a a neighbor of this tile
	checkNeighbor(tile) {
		if(tile.coordinates[0] == this.coordinates[0] + 1 && tile.coordinates[1] == this.coordinates[1]) {
			this.addNeighbor("right", tile);
		}
		else if (tile.coordinates[0] == this.coordinates[0] - 1 && tile.coordinates[1] == this.coordinates[1]) {
			this.addNeighbor("left", tile);
		}
		else if (tile.coordinates[0] == this.coordinates[0] && tile.coordinates[1] == this.coordinates[1] - 1) {
			this.addNeighbor("up", tile);
		}
		else if (tile.coordinates[0] == this.coordinates[0] && tile.coordinates[1] == this.coordinates[1] + 1) {
			this.addNeighbor("down", tile);
		}
	}
	
	//Resolve seems between this tile and its neighbors
	resolveSeems() {
		for (var k in this.neighbors.items) {
			if (this.neighbors.hasItem(k)) {
				if (k == "right") {
					this.resolveSeemsRight(this.neighbors.items[k]);
				}
				else if (k == "left") {
					this.resolveSeemsLeft(this.neighbors.items[k]);
				}
				else if (k == "up") {
					this.resolveSeemsUp(this.neighbors.items[k]);
				}
				else if(k == "down") {
					this.resolveSeemsDown(this.neighbors.items[k]);
				}
			}
		}
	}
	
	resolveSeemsRight(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesRight = this.rightVertexIndices();
		var indicesLeft = tile.leftVertexIndices();

		if(indicesRight.length != indicesLeft.length) {
			console.log('indicesRight length: ' + indicesRight.length);
			console.log('indicesLeft length: ' + indicesLeft.length);
			console.log("indicesRight not equal to indicesLeft for tile");
			console.log(this);
		}
		
		for(var i = 0; i < indicesRight.length; i++) {
			var rightTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesRight[i]] = rightTileVertices[indicesLeft[i]];
		}
	}
	
	resolveSeemsLeft(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesRight = tile.rightVertexIndices();
		var indicesLeft = this.leftVertexIndices();

		if(indicesRight.length != indicesLeft.length) {
			console.log('indicesRight length: ' + indicesRight.length);
			console.log('indicesLeft length: ' + indicesLeft.length);
			console.log("indicesRight not equal to indicesLeft for tile");
			console.log(this);
		}

		for(var i = 0; i < indicesLeft.length; i++) {
			var leftTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesLeft[i]] = leftTileVertices[indicesRight[i]];
		}
	}
	
	resolveSeemsUp(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesUp = this.upVertexIndices();
		var indicesDown = tile.downVertexIndices();

		if(indicesUp.length != indicesDown.length) {
			console.log('indicesUp length: ' + indicesUp.length);
			console.log('indicesDown length: ' + indicesDown.length);
			console.log("indicesUp not equal to indicesDown for tile");
			console.log(this);
		}
		for(var i = 0; i < indicesUp.length; i++) {
			var upTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesUp[i]] = upTileVertices[indicesDown[i]];
		}
	}
	
	resolveSeemsDown(tile) {
		var vertices = this.geometry.attributes.position.array;
		var indicesUp = tile.upVertexIndices();
		var indicesDown = this.downVertexIndices();

		if(indicesUp.length != indicesDown.length) {
			console.log('indicesUp length: ' + indicesUp.length);
			console.log('indicesDown length: ' + indicesDown.length);
			console.log("indicesUp not equal to indicesDown for tile");
			console.log(this);
		}
		for(var i = 0; i < indicesDown.length; i++) {
			var downTileVertices = tile.geometry.attributes.position.array;
			vertices[indicesDown[i]] = downTileVertices[indicesUp[i]];
		}
	}
	
	//Retrieve the vertex indices of the right side of tile
	rightVertexIndices() {
		var vertices = this.geometry.attributes.position.array;
		var rightIndices = [];
		for(var i = 0, j = 0; i < vertices.length; i++) {
			if(i != 0 && i % (((worldWidth - 1) + (j * worldWidth)) * 3) == 0) {
				rightIndices.push(i);
				rightIndices.push(i + 1);
				rightIndices.push(i + 2);
				j++;
			}
		}
		
		return rightIndices;
	}
	
	//Retrieve the vertex indices of the left side of tile
	leftVertexIndices() {
		var vertices = this.geometry.attributes.position.array;
		var leftIndices = [];
		for(var i = 0; i < vertices.length; i++) {
			if(i % ((worldWidth) * 3) == 0) {
				leftIndices.push(i);
				leftIndices.push(i + 1);
				leftIndices.push(i + 2);
			}
		}
		
		return leftIndices;
	}
	
	//Retrieve the vertex indices of the top of tile
	upVertexIndices() {
		var upIndices = [];
		for(var i = 0; i < worldWidth * 3; i++) {
			upIndices.push(i);
		}
		
		return upIndices;
	}
	
	//Retrieve the vertex indices of the bottom of tile
	downVertexIndices() {
		var vertices = this.geometry.attributes.position.array;
		var downIndices = [];
		for(var i = worldWidth * (worldDepth - 1) * 3; i < vertices.length; i++) {
			downIndices.push(i);
		}
		
		return downIndices;
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