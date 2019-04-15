package org.java_websocket.server_app;

import java.util.ArrayList;

import org.java_websocket.WebSocket;
import org.json.JSONObject;

public class Client {
	private TileMap tileMap;
	private CoordinateQueue coordinateQueue;
	private WebSocket connection;
	private int maxSearchRadius;
	private int clientSearchRadius;
	private ArrayList<Integer> currentPrefetchingCenter;
	//private ArrayList<Integer> potentialNewCenter;
	
	public Client(WebSocket connection, int maxSearchRadius, int clientSearchRadius, CoordinateQueue coordinateQueue) {
		this.connection = connection;
		this.maxSearchRadius = maxSearchRadius;
		this.clientSearchRadius = clientSearchRadius;
		this.tileMap = new TileMap();
		this.coordinateQueue = coordinateQueue;
		this.currentPrefetchingCenter = new ArrayList<Integer>();
		//this.potentialNewCenter = new ArrayList<Integer>();
	}
	
	public void updateTileMap(ArrayList<Integer> requestedTileCoordinates, boolean isCenter) {
		//Determine if requested tile is intersected by client ray caster
//		if(this.potentialNewCenter.isEmpty() || isCenter) {
//			updatePotentialNewPrefetchingCenter(requestedTileCoordinates);
//		}

		//Determine if potentialNewCenter is far enough away from currentPrefetching center to warrant reassignment
		if(this.currentPrefetchingCenter.isEmpty() || isCenter && (
				Math.abs(this.currentPrefetchingCenter.get(0) - requestedTileCoordinates.get(0)) >= this.maxSearchRadius - this.clientSearchRadius || 
				Math.abs(this.currentPrefetchingCenter.get(1) - requestedTileCoordinates.get(1)) >= this.maxSearchRadius - this.clientSearchRadius)) {
			//Set new pre-fetching center and find pre-fetching coordinates
			System.out.println("Updating Center");
			
			/*PROBLEM HERE: HOW CAN WE GUARANTEE THAT THIS HAS ALREADY HAPPENED BEFORE NEW REQUEST IS RECEIVED?*/
			updateCurrentPrefetchingCenter(requestedTileCoordinates);
			
			System.out.println("Current center: [" + this.currentPrefetchingCenter.get(0) + ", " + this.currentPrefetchingCenter.get(1) + "]");
			System.out.println("Requested tile: [" + requestedTileCoordinates.get(0) + ", " + requestedTileCoordinates.get(1) + "]");
			
			//Remove all tiles in coordinate queue belonging to this client
			this.coordinateQueue.clearQueue(this.connection);
			
			//CAUSING CONCURRENT MODIFICATION ERROR - WHY?!!!!!
			this.tileMap.resetMap(this.currentPrefetchingCenter, this.maxSearchRadius);
			
			//Enqueue center tile
			CoordinateQueueItem centerQueueItem = new CoordinateQueueItem(this.connection, this.currentPrefetchingCenter);
			this.coordinateQueue.enqueue(centerQueueItem);
			
			//Find and enqueue tiles around center withing pre fetching radius
			findTilesConcentric();
		}
	}
	
	public JSONObject getRequestedTile(ArrayList<Integer> requestedTileCoordinates, boolean isCenter) {
		JSONObject response = new JSONObject();
		response.put("Coordinates", requestedTileCoordinates);
		response.put("isCenter", isCenter);
		
		//System.out.println("Size of tileMap " + this.tileMap.getSize());
		ArrayList<Integer> test = new ArrayList<Integer>();
		test.add(167);
		test.add(359);
		
		//System.out.println("Map contains [" + test.get(0) + ", " + test.get(1) + "]: " + this.tileMap.containsTile(test));
		if(this.tileMap.containsTile(requestedTileCoordinates)) {
			Tile requestedTile = this.tileMap.getTile(requestedTileCoordinates);
			response.put("Coordinates", requestedTile.getCoordinates());
			if(requestedTile.isDoneDecoding()) {
				response.put("Data", requestedTile.getData());
			}
			else {
				response.put("Data", "Still decoding");
			}
		}
		else {
			response.put("Data", "Still fetching");
		}
		
		//System.out.println("Returning " + response.toString());
		return response;
	}
	
	//Update the current potential new pre-fetching center coordinates
	//PROBABLY DOESN'T NEED TO BE SYNCHRONIZED, BECAUSE WORKER THREADS SHOULDN'T HAVE ANYTHING TO DO WITH THE CENTER OF A GIVEN CLIENT
//	public synchronized void updatePotentialNewPrefetchingCenter(ArrayList<Integer> newPotentialPrefetchingCenter) {
//		this.potentialNewCenter = newPotentialPrefetchingCenter;
//	}
	
	//Update the current pre-fetching center coordinates
	public synchronized void updateCurrentPrefetchingCenter(ArrayList<Integer> newPrefetchingCenter) {
		this.currentPrefetchingCenter = newPrefetchingCenter;
	}
	
	public void findTilesConcentric() {
        for(int i = 1; i < this.maxSearchRadius; i++) {
            for(int j = this.currentPrefetchingCenter.get(0) - i; j <= this.currentPrefetchingCenter.get(0) + i; j++) {
                for(int k = this.currentPrefetchingCenter.get(1) - i; k <= this.currentPrefetchingCenter.get(1) + i; k++){
                    ArrayList<Integer> coordinate = new ArrayList<Integer>();
                    coordinate.add(j);
                    coordinate.add(k);
                    if ((Math.abs(coordinate.get(0) - this.currentPrefetchingCenter.get(0)) == i && 
                    		Math.abs(coordinate.get(1) - this.currentPrefetchingCenter.get(1)) <= i) || 
                    		(Math.abs(coordinate.get(1) - this.currentPrefetchingCenter.get(1)) == i && 
                    		Math.abs(coordinate.get(0) - this.currentPrefetchingCenter.get(0)) <= i)) {
                        if(!(this.tileMap.containsTile(coordinate))) {
                        	CoordinateQueueItem queueItem = new CoordinateQueueItem(this.connection, coordinate);
                        	
                        	//System.out.println("putting coordinate [" + queueItem.getCoordinate().get(0) + ", " + queueItem.getCoordinate().get(1) + "] into queue");
                            this.coordinateQueue.enqueue(queueItem);
                        }
                    }
                }
            }
        }
	}
	
	public TileMap getTileMap() {
		return this.tileMap;
	}
}
