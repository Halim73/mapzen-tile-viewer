package org.java_websocket.server_app;

import java.util.ArrayList;
import java.util.Hashtable;
import java.util.Iterator;


public class TileMap {
	private Hashtable<ArrayList<Integer>, Tile> tileMap;
	
	//Constructor
	public TileMap() {
		this.tileMap = new Hashtable<ArrayList<Integer>, Tile>();
	}
	
	//Determine if map contains tile at coordinate
	public synchronized boolean containsTile(ArrayList<Integer> coordinate) {
		return this.tileMap.containsKey(coordinate);
	}
	
	public synchronized int getSize() {
		return this.tileMap.size();
	}
	
	//Add tile to TileMap
	public synchronized void addTile(Tile tile) {
		this.tileMap.put(tile.getCoordinates(), tile);
	}
	
	//Get tile from TileMap
	public synchronized Tile getTile(ArrayList<Integer> coordinate) {
		return this.tileMap.get(coordinate);
	}
	
	//Clear TileMap
	public synchronized void clearMap() {
		this.tileMap.clear();
	}
	
	//Remove tiles from Map falling outside of the search window
	public synchronized void resetMap(ArrayList<Integer> center, int maxSearchRadius) {
		Iterator<ArrayList<Integer>> iterate = this.tileMap.keySet().iterator();
        while(iterate.hasNext()) {
        	ArrayList<Integer> coordinates = iterate.next();
            if(Math.abs(coordinates.get(0) - center.get(0)) > maxSearchRadius || Math.abs(coordinates.get(1) - center.get(1)) > maxSearchRadius){
                iterate.remove();
            }
        }
	}
}
