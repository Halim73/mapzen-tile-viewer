package org.java_websocket.server_app;

import java.util.ArrayList;

import org.java_websocket.WebSocket;

public class CoordinateQueueItem {
	private WebSocket connection;
	private ArrayList<Integer> coordinate;
	
	public CoordinateQueueItem(WebSocket connection, ArrayList<Integer> coordinate) {
		this.connection = connection;
		this.coordinate = coordinate;
	}
	
	public WebSocket getClient() {
		return this.connection;
	}
	
	public ArrayList<Integer> getCoordinate() {
		return this.coordinate;
	}
}
