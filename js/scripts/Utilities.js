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
	for(var i = 0; i < 16; i++) {
		var ws = new WebSocket("ws://127.0.0.1:" + String(3000 + i) + "/");
		webSockets.setItem(i, ws);
	}
	return webSockets;
}

function calculateGroundResolution(coordinates, zoom) {
	var groundResolution = (Math.cos(convertToLatLon(coordinates, zoom)[0] * Math.PI/180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, zoom));
	return groundResolution;
}