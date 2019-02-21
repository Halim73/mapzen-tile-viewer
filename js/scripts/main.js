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

		//Send origin coordinates to server
		ws.send(origin + ",True");
	}
}

function openfunc() {
	ws.onmessage = function (event) {
		console.log("got pinged");
		var jsonTile = JSON.parse(event.data);
		
		//Case in which tile has not been fetched or decoded -- query server again
		if(jsonTile.Data == "Still fetching" || jsonTile.Data == "Still decoding") {
			//Do not mark tile as center, as this would cause unecessary center update on server <-- this update happened with first request
			ws.send(jsonTile.Coordinates + ",False");
		}
		
		else {
			var tile = new Tile(jsonTile.Data, jsonTile.Coordinates, tileMap.zoom, worldWidth, worldDepth, scale, tileMap.origin, rightVertexIndices, leftVertexIndices, upVertexIndices, downVertexIndices);

			//Initiate currentCenter
			if(tileMap.currentCenter == null) {
				tileMap.currentCenter = tile;
				
				if(!tileMap.contains(tileMap.currentCenter.coordinates)) {
					tileMap.addTile(tile);
					tile.createGeometry();
					var screenWidth = ((2 * radius) + 1) * tileMap.currentCenter.geometry.parameters.width;
					console.log("screen width");
					console.log(screenWidth);
					camera.position.y = screenWidth / (2 * Math.tan((Math.PI * camera.fov)/(180 * 2)));
					console.log("the camera is at position: ");
					console.log(camera.position.y);
					tileMap.addNeighbors(tile);
					tile.resolveSeems();
					tile.createMesh()
				}
				var tileCoords = findTiles(tileMap.currentCenter, radius);
				for(var i = 0; i < tileCoords.length; i++) {
					if(tileMap.contains(tileCoords[i])) {
						console.log("map contains tile with coordinates: ");
						console.log(tileCoords[i]);
					}
					else {
						ws.send(tileCoords[i] + ",False");
					}
				}
			}
			
			if(!tileMap.contains(tile.coordinates)) {
				tileMap.addTile(tile);
				tile.createGeometry();
				tile.geometry.computeBoundingBox();   //Improve raycaster performance
				tileMap.addNeighbors(tile);
				//tileMap.update(currentCenter, radius);
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

	raycaster.setFromCamera( new THREE.Vector2(), camera );  
	var intersects = raycaster.intersectObjects( scene.children );
	if ( intersects.length > 0 ) {
		if ( INTERSECTED != intersects[ 0 ].object ) {
			if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
			INTERSECTED = intersects[ 0 ].object; 
			INTERSECTED.currentHex = INTERSECTED.material.emissive.getHex();
			INTERSECTED.material.emissive.setHex( 0xff0000 );
	
			console.log(INTERSECTED.geometry.boundingBox.max.y);
			console.log(INTERSECTED.userData.coordinates);
		}
		
		if(INTERSECTED != null) {
			var potentialNewCenter = INTERSECTED.userData.coordinates;
			if(!tileMap.currentCenter.equals(potentialNewCenter)) {
				console.log("current center is being changed");
				console.log("tileMap at this point: ");
				console.log(tileMap.map);
				//Set intersected tile as new center
				tileMap.currentCenter = tileMap.get(potentialNewCenter);
				
				//Alert server to change in center
				ws.send(tileMap.currentCenter.coordinates + ",True");
				
				console.log("Intersecting tile: " + tileMap.currentCenter.coordinates[0] + ", " + tileMap.currentCenter.coordinates[1]);
				
				//Remove tiles outside of view range
				tileMap.update();
				
				//Add tiles within new view range
				var tileCoords = findTiles(tileMap.currentCenter, radius);
			
				for(var i = 0; i < tileCoords.length; i++) {
					if(!tileMap.contains(tileCoords[i])) {
						console.log("sending tile coordinates: ");
						console.log(tileCoords[i]);
						ws.send(tileCoords[i] + ",False");
					}
				}
			}
			
			if(intersects[0].distance < 5 * INTERSECTED.geometry.boundingBox.max.y) {
				tileMap.deleteMap();
				console.log("potential new center");
				console.log(potentialNewCenter);
				var zoomLatLon = convertToLatLon(potentialNewCenter, zoom);
				zoom++;
				var zoomValues = zoomLatLon[0] + "," + zoomLatLon[1] + "," + zoom + "," + tileSize;
				console.log("zoom values");
				console.log(zoomValues);
				//currentCenter = null;
				camera.position.y = 120000;
				controls.update();
				initiateMap(zoomValues);
			}
			
			// if(intersects[0].distance > 50 * INTERSECTED.geometry.boundingBox.max.y) {
				// console.log("distance away");
				// console.log(intersects[0].distance);
				// tileMap.deleteMap();
				// console.log("potential new center");
				// console.log(potentialNewCenter);
				// var zoomLatLon = convertToLatLon(potentialNewCenter, zoom);
				// zoom--;
				// var zoomValues = zoomLatLon[0] + "," + zoomLatLon[1] + "," + zoom + "," + tileSize;
				// console.log("zoom values");
				// console.log(zoomValues);
				//currentCenter = null;
				// camera.position.y = 120000;
				// controls.update();
				// initiateMap(zoomValues);
			// }
			
			tileMap.update();               //Update gets called too early in above conditional!
		}
	} 
	else {
		if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
		INTERSECTED = null;
	}

	renderer.render( scene, camera );
}