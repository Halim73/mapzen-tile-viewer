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

function findTiles(center, radius) {
	var tileCoords = [];
	
	var leftCornerCoords = [(center.coordinates[0] - radius), (center.coordinates[1] - radius)];
	for(var i = 0; i < (2 * radius) + 1; i++) {
		for(var j = 0; j < (2 * radius) + 1; j++) {
			var coords = [(leftCornerCoords[0] + i), (leftCornerCoords[1] + j)];
			tileCoords.push(coords);
		}
	}
	return tileCoords;
}

function initiateWebSockets() {
	var webSockets = new HashTable({});
	webSockets.setItem(0, new WebSocket("ws://35.160.124.235:" + String(3000) + "/"));
	webSockets.setItem(1, new WebSocket("ws://34.217.52.13:" + String(3001) + "/"));
	webSockets.setItem(2, new WebSocket("ws://54.213.32.30:" + String(3002) + "/"));
	webSockets.setItem(3, new WebSocket("ws://54.190.161.169:" + String(3003) + "/"));
	webSockets.setItem(4, new WebSocket("ws://52.38.191.75:" + String(3004) + "/"));
	webSockets.setItem(5, new WebSocket("ws://54.213.93.59:" + String(3005) + "/"));
	webSockets.setItem(6, new WebSocket("ws://54.218.55.179:" + String(3006) + "/"));
	webSockets.setItem(7, new WebSocket("ws://54.244.144.103:" + String(3007) + "/"));
	webSockets.setItem(8, new WebSocket("ws://34.219.250.102:" + String(3008) + "/"));
	webSockets.setItem(9, new WebSocket("ws://54.245.168.94:" + String(3009) + "/"));
	webSockets.setItem(10, new WebSocket("ws://54.187.126.61:" + String(3010) + "/"));
	webSockets.setItem(11, new WebSocket("ws://54.212.228.248:" + String(3011) + "/"));
	webSockets.setItem(12, new WebSocket("ws://34.220.191.27:" + String(3012) + "/"));
	webSockets.setItem(13, new WebSocket("ws://52.24.222.164:" + String(3013) + "/"));
	webSockets.setItem(14, new WebSocket("ws://34.222.4.183:" + String(3014) + "/"));
	webSockets.setItem(15, new WebSocket("ws://34.211.7.120:" + String(3015) + "/"));

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