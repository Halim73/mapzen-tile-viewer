function convertToCoordinates(latLon, zoom) {
	var n = Math.pow(2, zoom);
	var x = Math.floor(n * ((latLon[1] + 180) / 360));
	var y = Math.floor(n * (1 - (Math.log(Math.tan(latLon[0] * Math.PI / 180) + (1 / Math.cos(latLon[0] * Math.PI / 180))) / Math.PI)) / 2);
	var coordinates = [x, y];
	return coordinates;
}

function convertToLatLon(coordinates, zoom) {
	var n = Math.pow(2, zoom);
	var longitude = coordinates[0] / n * 360.0 - 180.0;
	var latitude = (Math.atan(Math.sinh(Math.PI * (1 - 2 * coordinates[1] / n)))) * (180 / Math.PI);
	var latLong = [latitude, longitude];
	return latLong;
}

function findTiles(tileMap, radius) {
	console.log("called");
	var center = tileMap.currentCenter;
	var tileCoords = [];

	for(var i = 1; i <= radius; i++) {
		for(var j = center.coordinates[0] - i; j <= center.coordinates[0] + i; j++) {
			for(var k = center.coordinates[1] - i; k <= center.coordinates[1] + i; k++){
				var coordinate = [j, k];
				if ((Math.abs(coordinate[0] - center.coordinates[0]) == i && 
						Math.abs(coordinate[1] - center.coordinates[1]) <= i) || 
						(Math.abs(coordinate[1] - center.coordinates[1]) == i && 
						Math.abs(coordinate[0] - center.coordinates[0]) <= i)) {
					if(!(tileMap.contains(coordinate))) {
						tileCoords.push(coordinate);
					}
				}
			}
		}
	}
	return tileCoords;
}

function initiateWebSockets() {
	var webSockets = new HashTable({});
	//webSockets.setItem(0, new WebSocket("ws://54.245.3.233:" + String(3000) + "/"));
	// webSockets.setItem(1, new WebSocket("ws://54.245.3.233:" + String(3001) + "/"));
	// webSockets.setItem(2, new WebSocket("ws://54.190.44.187:" + String(3002) + "/"));
	// webSockets.setItem(3, new WebSocket("ws://52.33.201.238:" + String(3003) + "/"));
	// webSockets.setItem(4, new WebSocket("ws://54.213.222.165:" + String(3004) + "/"));
	// webSockets.setItem(5, new WebSocket("ws://54.202.84.132:" + String(3005) + "/"));
	// webSockets.setItem(6, new WebSocket("ws://52.35.191.0:" + String(3006) + "/"));
	// webSockets.setItem(7, new WebSocket("ws://34.219.68.81:" + String(3007) + "/"));
	// webSockets.setItem(8, new WebSocket("ws://34.222.160.48:" + String(3008) + "/"));
	// webSockets.setItem(9, new WebSocket("ws://54.200.243.5:" + String(3009) + "/"));
	webSockets.setItem(10, new WebSocket("ws://52.39.176.88:" + String(3010) + "/"));
	webSockets.setItem(11, new WebSocket("ws://54.184.79.157:" + String(3010) + "/"));
	webSockets.setItem(12, new WebSocket("ws://34.213.173.68:" + String(3010) + "/"));
	webSockets.setItem(13, new WebSocket("ws://34.222.135.248:" + String(3010) + "/"));
	webSockets.setItem(14, new WebSocket("ws://34.217.75.17:" + String(3010) + "/"));
	webSockets.setItem(15, new WebSocket("ws://54.186.95.97:" + String(3010) + "/"));

	// for(var i = 0; i < 16; i++) {
	// 	var ws = new WebSocket("ws://54.184.2.148:" + String(3000 + i) + "/");
	// 	webSockets.setItem(i, ws);
	// }
	return webSockets;
}

function calculateGroundResolution(coordinates, zoom) {
	var groundResolution = (Math.cos(convertToLatLon(coordinates, zoom)[0] * Math.PI/180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, zoom));
	return groundResolution;
}

//Retrieve the vertex indices of the right side of tile
function findRightVertexIndices(worldWidth, worldDepth) {
	var rightIndices = [];
	var numVertices = worldWidth * worldDepth * 3;
	for(var i = 0, j = 0; i < numVertices; i++) {
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
function findLeftVertexIndices(worldWidth, worldDepth) {
	var numVertices = worldWidth * worldDepth * 3;
	var leftIndices = [];
	for(var i = 0; i < numVertices; i++) {
		if(i % ((worldWidth) * 3) == 0) {
			leftIndices.push(i);
			leftIndices.push(i + 1);
			leftIndices.push(i + 2);
		}
	}
	
	return leftIndices;
}

//Retrieve the vertex indices of the top of tile
function findUpVertexIndices(worldWidth) {
	var upIndices = [];
	for(var i = 0; i < worldWidth * 3; i++) {
		upIndices.push(i);
	}
	
	return upIndices;
}

//Retrieve the vertex indices of the bottom of tile
function findDownVertexIndices(worldWidth, worldDepth) {
	var numVertices = worldWidth * worldDepth * 3;
	var downIndices = [];
	for(var i = worldWidth * (worldDepth - 1) * 3; i < numVertices; i++) {
		downIndices.push(i);
	}
	
	return downIndices;
}

function getUserValues(values) {
	var userSpecs = new HashTable({});
	userSpecs.setItem("latitude", values[0]);
	userSpecs.setItem("longitude", values[1]);
	userSpecs.setItem("zoom", values[2]);
	userSpecs.setItem("filetype", values[3]);
	userSpecs.setItem("size", values[4]);
	return userSpecs;
}