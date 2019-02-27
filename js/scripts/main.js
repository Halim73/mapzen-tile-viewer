if ( ! Detector.webgl ) {

	Detector.addGetWebGLMessage();
	document.getElementById( 'container' ).innerHTML = "";

}

//The currently active websocket
var ws;			
var container, stats;
var camera, controls, scene, renderer, raycaster;			
var tileSize = 256;			
var worldWidth = tileSize, 
	worldDepth = tileSize,
worldHalfWidth = worldWidth / 2, worldHalfDepth = worldDepth / 2;			
var type = "terrarium";
var scale = 1;
var clock = new THREE.Clock();
var radius = 3;
var tileMap;
var webSockets = initiateWebSockets();
var currentCenter;
var INTERSECTED;
var firstRender = true;
var rightVertexIndices;
var leftVertexIndices;
var upVertexIndices;
var downVertexIndices;
var zoom;
var mouse = new THREE.Vector2();
var tileCoords = [];					//Coordinates to be fetched

renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );

//Make sure all parameters of openfunc are defined above or in call to init
init();

function onButtonClick() {
	//Prompt user for initial location
	var values = prompt("Please enter latitude, longitude, zoom, filetype, size: ", "");
	initiateMap(values);
}

function init() {
	//Get document container
	container = document.getElementById( 'container' );

	//Create scene
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xbfd1e5 );
	
	//Add lights
	var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);
	
	var pointLight = new THREE.PointLight(0xffffff, 0.5);
	scene.add(pointLight);
	
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	scene.add( directionalLight );

	//Create raycaster
	raycaster = new THREE.Raycaster();

	//Compute locations of edge vertices in tile data arrays for seam resolving
	rightVertexIndices = findRightVertexIndices(worldWidth, worldDepth);
	leftVertexIndices = findLeftVertexIndices(worldWidth, worldDepth);
	upVertexIndices = findUpVertexIndices(worldWidth);
	downVertexIndices = findDownVertexIndices(worldWidth, worldDepth);
}

function initiateMap(values) {
	if(values === null || values === "") {
		console.log("User cancelled prompt");
	}
	else {
		//Set up camera and controls
		camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1/99, 100000000000000 );
		if(controls) {
			controls.dispose();
		}
		controls = new THREE.OrbitControls( camera, renderer.domElement );
		controls.minPolarAngle = 0;
		controls.maxPolarAngle = 0.2 * Math.PI;
		controls.panSpeed = 0.5;

		//User is entering a new destination -- delete tileMap
		if(tileMap != null && tileMap.map != null) {
			tileMap.deleteMap();
		}

		var userSpecs = getUserValues(values.split(","));
		zoom = userSpecs.getItem("zoom");
		var origin = convertToCoordinates([parseFloat(userSpecs.getItem("latitude")), parseFloat(userSpecs.getItem("longitude"))], zoom);
		
		//Create new tileMap at this zoom level centered at origin
		tileMap = new TileMap(Number(zoom), origin, radius);

		//Get webSocket corresponding to this zoom level
		ws = webSockets.getItem(tileMap.zoom);

		//Open connection to server
		openfunc(ws, tileMap, stats, camera, controls, clock, raycaster, scene, radius, renderer, container);

		//Send origin coordinates to all servers
		for(var loopZoom = 0; loopZoom <= 15; loopZoom++) {
			console.log("made it here");
			var otherOrigin = convertToCoordinates([parseFloat(userSpecs.getItem("latitude")), parseFloat(userSpecs.getItem("longitude"))], loopZoom);
			webSockets.getItem(loopZoom).send(otherOrigin + ",True");
		}
	}
}

function openfunc() {
	ws.onmessage = function (event) {
		console.log("got pinged");
		var jsonTile = JSON.parse(event.data);
		
		//Case in which tile has not been fetched or decoded -- query server again
		if(tileMap.currentCenter == null && jsonTile.Data == "Still fetching" || jsonTile.Data == "Still decoding") {
			//Wait a while before sending follow-up request
			setTimeout(function(){ws.send(jsonTile.Coordinates + ",False")}, 0);
			//ws.send(jsonTile.Coordinates + ",False")
		}

		else if(tileMap.currentCenter != null && (Math.abs(tileMap.currentCenter.coordinates[0] - jsonTile.Coordinates[0]) <= radius ||
			Math.abs(tileMap.currentCenter.coordinates[1] - jsonTile.Coordinates[1]) <= radius) &&
			jsonTile.Data == "Still fetching" || jsonTile.Data == "Still decoding") {
			setTimeout(function(){ws.send(jsonTile.Coordinates + ",False")}, 0);
		}
		
		else {
			var tile = new Tile(jsonTile.Data, jsonTile.Coordinates, tileMap.zoom, worldWidth, worldDepth, scale, tileMap.origin, rightVertexIndices, leftVertexIndices, upVertexIndices, downVertexIndices);
			
			//Initiate currentCenter
			if(tileMap.currentCenter == null) {
				tileMap.currentCenter = tile;

				//Add initial center to map
				if(!tileMap.contains(tileMap.currentCenter.coordinates)) {
					tileMap.addTile(tile);
					tile.createGeometry();
					
					//Set screen width and camera position based on central tile dimensions
					var screenWidth = ((2 * radius) + 1) * 256;
					camera.position.y = screenWidth / (2 * Math.tan((Math.PI * camera.fov)/(180 * 2)));

					tileMap.addNeighbors(tile);
					tile.resolveSeems();
					tile.createMesh();
				}

				//Retrieve tiles around initial center
				tileCoords = findTiles(tileMap.currentCenter, radius);
				// for(var i = 0; i < tileCoords.length; i++) {
				// 	if(!tileMap.contains(tileCoords[i])) {
				// 		ws.send(tileCoords[i] + ",False");
				// 	}
				// }
			}

			//Default case
			else if(!tileMap.contains(tile.coordinates)) {
				tileMap.addTile(tile);
				tile.createGeometry();
				tile.geometry.computeBoundingBox();   //Improve raycaster performance
				tileMap.addNeighbors(tile);
				tile.resolveSeems();
				tile.createMesh();
			}
		}
		
		setRenderer(renderer, container, stats);
		
		if(firstRender) {
			animate(stats, camera, controls, clock, raycaster, scene, tileMap, radius, ws);
			firstRender = false;
		}
	};
}

function setRenderer() {
	container.innerHTML = "";

	container.appendChild( renderer.domElement );

	stats = new Stats();
	container.appendChild( stats.dom );

	window.addEventListener('resize', onWindowResize, false);
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
	requestAnimationFrame(animate);
	controls.update();
	renderScene(camera, controls, clock, raycaster, scene, tileMap, radius, ws);
	stats.update();
}

function renderScene() {
	controls.update(clock.getDelta());

	//Remove tiles outside of view range
	if(tileMap.map != null && tileMap.map.length > Math.pow((radius * 2) + 1, 2)) {
		tileMap.update();   
	}  

	//Set raycaseter
	raycaster.setFromCamera( mouse, camera );  
	var intersects = raycaster.intersectObjects( scene.children );

	if ( intersects.length > 0 ) {
		//New tile intersected
		if ( INTERSECTED != intersects[ 0 ].object || intersects[0].distance < 5 * INTERSECTED.geometry.boundingBox.max.y ||
			intersects[0].distance > 50 * INTERSECTED.geometry.boundingBox.max.y) {
			//Set color of intersected tile -- Purely for debugging, REMOVE LATER
			if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
			INTERSECTED = intersects[ 0 ].object; 
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( 0xff0000 );

			var potentialNewCenter = INTERSECTED.userData.coordinates;

			//User has scrolled to next zoom level
			if(zoom <= 15 && intersects[0].distance < 500) {//5 * INTERSECTED.geometry.boundingBox.max.y) {
				console.log("zooming in");
				console.log("distance: " + intersects[0].distance);
				//Clear tileMap and tileCoords
				tileMap.deleteMap();
				tileCoords = [];
				var zoomLatLon = convertToLatLon(potentialNewCenter, zoom);
				zoom++;
				var zoomValues = zoomLatLon[0] + "," + zoomLatLon[1] + "," + zoom + "," + tileSize;
				//currentCenter = null;
				camera.position.y = 10000;
				controls.update();
				initiateMap(zoomValues);
			}

			//User has scrolled to previous zoom level
			else if(zoom >= 0 && intersects[0].distance > 5000) { //1000 * INTERSECTED.geometry.boundingBox.max.y) {
				console.log("zooming out");
				console.log("distance " + intersects[0].distance);
				//console.log("distance away");
				//console.log(intersects[0].distance);
				tileMap.deleteMap();
				//console.log("potential new center");
				//console.log(potentialNewCenter);
				var zoomLatLon = convertToLatLon(potentialNewCenter, zoom);
				zoom--;
				var zoomValues = zoomLatLon[0] + "," + zoomLatLon[1] + "," + zoom + "," + tileSize;
				//console.log("zoom values");
				//console.log(zoomValues);
				//currentCenter = null;
				camera.position.y = 10000;
				controls.update();
				initiateMap(zoomValues);
			}

			//User has moved from current center
			else if(!tileMap.currentCenter.equals(potentialNewCenter)) {
				//Set intersected tile as new center
				tileMap.currentCenter = tileMap.get(potentialNewCenter);
				
				//Alert all servers to change in center
				var currentCenterLatLon = convertToLatLon(tileMap.currentCenter.coordinates, zoom);
				console.log("current center lat lon");
				console.log(currentCenterLatLon);
				for(var loopZoom = 0; loopZoom <= 15; loopZoom++) {
					var otherCenter = convertToCoordinates([currentCenterLatLon[0], currentCenterLatLon[1]], loopZoom);
					console.log("sending: " + otherCenter[0] + "," + otherCenter[1]);
					webSockets.getItem(loopZoom).send(otherCenter + ",True");
				}

				//Add tiles within new view range
				tileCoords = findTiles(tileMap.currentCenter, radius);
			}      
		}
	}

	//Nothing intersected 
	else {
		if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
		INTERSECTED = null;
	}

	//Send a coordinate to server
	if(tileCoords.length > 0) {
		var coordinate = tileCoords.pop();
		if(!tileMap.contains(coordinate)) {
			console.log("Tile map length: " + tileMap.map.length);
			ws.send(coordinate + ",False");
		}
	}

	renderer.render( scene, camera );
}