package org.java_websocket.server_app;

import java.util.Hashtable;
import org.java_websocket.WebSocket;

public class Worker implements Runnable{
	private CoordinateQueue coordinateQueue;
	private volatile Hashtable<WebSocket, Client> connections;
	private int zoom;
	private int initScale;
	private int size;
	private String filetype;
	
	public Worker(CoordinateQueue coordinateQueue, Hashtable<WebSocket, Client> connections, int zoom, int initScale, String filetype, int size) {
		this.coordinateQueue = coordinateQueue;
		this.connections = connections;
		this.zoom = zoom;
		this.initScale = initScale;
		this.size = size;
		this.filetype = filetype;
	}
	
	public void run() {
		while(true) {
			//System.out.println("Worker running");
			try {
				CoordinateQueueItem coordinateQueueItem = this.coordinateQueue.dequeue();
				
				//Make sure client is still connected
				if(coordinateQueueItem.getClient() != null) {
					Tile tile = new Tile(coordinateQueueItem.getCoordinate(), this.zoom, this.initScale, this.filetype, this.size);
					
					//Add tile to tileMap of this client
					this.connections.get(coordinateQueueItem.getClient()).getTileMap().addTile(tile);
					
					//Retrieve and decode tile
					tile.decode();
				}
			} catch (Exception e) {
				System.out.println("Client no longer active - terminating job");
			}
		}
	}
}
