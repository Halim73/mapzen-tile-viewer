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
var radius = 2;
var tileMap;
var webSockets = initiateWebSockets();
var currentCenter;
var INTERSECTED;
var firstRender = true;

renderer = new THREE.WebGLRenderer();
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize( window.innerWidth, window.innerHeight );



//Make sure all parameters of openfunc are defined above or in call to init
init();

function onButtonClick() {
	var txt;
	var values = prompt("Please enter latitude, longitude, zoom, filetype, size: ", "");
	initiateMap(values);
}

function initiateMap(values) {
	var valueSplit = values.split(",");
	zoom = valueSplit[2];
	if(tileMap != null && tileMap.map != null) {
		tileMap.deleteMap();
	}
	var origin = convertToCoordinates([parseFloat(valueSplit[0]), parseFloat(valueSplit[1])], zoom);
	console.log("origin: ");
	console.log(origin);
	tileMap = new TileMap(Number(zoom), origin);
	ws = webSockets.getItem(tileMap.zoom);
	//Make current center tile with coordinates origin
	// tileSize = valueSplit[4];
	// screenWidth = (radius + 1) * tileSize * calculateGroundResolution(tileMap.origin, zoom);
	// camera.position.y = screenWidth / (2 * Math.tan((Math.PI * camera.fov)/(180 * 2)));
	//camera.position.y = 120000;
	openfunc(ws, tileMap, stats, camera, controls, clock, raycaster, scene, currentCenter, radius, renderer, container);
	
	if (values == null || values == "") {
		ws.send("User cancelled prompt");
	} else {
		container.innerHTML = "<br></br>Generating world..."
		ws.send(origin);
		//camera.position.x = 0;
		//camera.position.z = 0;
	}
}

function init() {
	console.log("initializing...");
	container = document.getElementById( 'container' );

	camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1/99, 100000000000000 );
	//camera.position.y = 120000; //12000;
	scene = new THREE.Scene();
	scene.background = new THREE.Color( 0xbfd1e5 );
	
	var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
	scene.add(ambientLight);
	
	var pointLight = new THREE.PointLight(0xffffff, 0.5);
	scene.add(pointLight);
	
	var directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
	scene.add( directionalLight );

	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.minPolarAngle = 0;
	controls.maxPolarAngle = 0.2 * Math.PI;

	raycaster = new THREE.Raycaster();
}

function openfunc() {
	ws.onmessage = function (event) {
		var jsonTile = JSON.parse(event.data);
		var tile = new Tile(jsonTile.Data, jsonTile.Coordinates, tileMap.zoom, worldWidth, worldDepth, scale);
		console.log("adding tile");
		console.log(tile);
		//Initiate currentCenter
		if(currentCenter == null) {
			currentCenter = tile;
			
			if(!tileMap.contains(currentCenter.coordinates)) {
				tileMap.addTile(tile);
				tile.createGeometry();
				var screenWidth = ((2 * radius) + 1) * currentCenter.geometry.parameters.width;
				console.log("screen width");
				console.log(screenWidth);
				camera.position.y = screenWidth / (2 * Math.tan((Math.PI * camera.fov)/(180 * 2)));
				console.log("the camera is at position: ");
				console.log(camera.position.y);
				tileMap.addNeighbors(tile);
				tile.resolveSeems();
				tile.createMesh()
			}
			var tileCoords = findTiles(currentCenter, radius);
			for(var i = 0; i < tileCoords.length; i++) {
				if(tileMap.contains(tileCoords[i])) {
					console.log("map contains tile with coordinates: ");
					console.log(tileCoords[i]);
				}
				else {
					ws.send(tileCoords[i]);
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
		
		setRenderer(renderer, container, stats);
		
		if(firstRender) {
			animate(stats, camera, controls, clock, raycaster, scene, currentCenter, tileMap, radius, ws);
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

	renderScene(camera, controls, clock, raycaster, scene, currentCenter, tileMap, radius, ws);
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
			if(!currentCenter.equals(potentialNewCenter)) {
				console.log("current center is being changed");
				console.log("tileMap at this point: ");
				console.log(tileMap.map);
				//Set intersected tile as new center
				currentCenter = tileMap.get(potentialNewCenter);
	
				//Remove tiles outside of view range
				tileMap.update(currentCenter, radius);
				
				//Add tiles within new view range
				var tileCoords = findTiles(currentCenter, radius);

				for(var i = 0; i < tileCoords.length; i++) {
					if(!tileMap.contains(tileCoords[i])) {
						console.log("sending tile coordinates: ");
						console.log(tileCoords[i]);
						ws.send(tileCoords[i]);
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
				initiateMap(zoomValues);
			}
			
			tileMap.update(currentCenter, radius);               //Update gets called too early in above conditional!
		}
	} 
	else {
		if ( INTERSECTED ) INTERSECTED.material.emissive.setHex( INTERSECTED.currentHex );
		INTERSECTED = null;
	}
	
	renderer.render( scene, camera );
}