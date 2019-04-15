package org.java_websocket.server_app;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.util.ArrayList;

public class Tile {
	private ArrayList<Integer> coordinates;
	private int zoom;
	private int initScale;
	private String filetype;
	private int size;
	private ArrayList<Double> data;
	private BufferedImage im;
	private boolean doneDecoding;
	private Utilities utilities;
	
	//Constructor
	public Tile(ArrayList<Integer> coordinates, int zoom, int initScale, String filetype, int size) {
		this.coordinates = coordinates;
		this.zoom = zoom;
		this.initScale = initScale;
		this.filetype = filetype;
		this.size = size;
		this.data = new ArrayList<Double>();
		this.im = null;
		this.doneDecoding = false;
		this.utilities = new Utilities();
	}
	
	@Override
	public boolean equals(Object other) {
		if(other instanceof Tile) {
			if(((Tile) other).coordinates.equals(this.coordinates)) {
				return true;
			}
		}
		return false;
	}
	
	//Retrieve and decode tile data
	public void decode() {
        double scale = Math.pow(2, (this.zoom - 10)) * this.initScale;
        
        try {
        	this.im = utilities.retrieveImage(this.coordinates, this.zoom, this.filetype, this.size);
        
	        for(int i = this.im.getMinY(); i < this.im.getHeight(); i++) {
	            for(int j = this.im.getMinX(); j < this.im.getWidth(); j++) {
	                this.data.add(scale * utilities.decodePixel(new Color(this.im.getRGB(j, i), true)));
	            }
	        }
	        
	        this.setDoneDecoding();
        }
        catch(Exception e) {
        	System.out.println("File could not be found");
        }
	}
	
	//Set tile state as done decoding
	public synchronized void setDoneDecoding() {
		this.doneDecoding = true;
	}
	
	//Check if tile is done decoding
	public synchronized boolean isDoneDecoding() {
		return this.doneDecoding;
	}
	
	//Return the coordinates of this tile
	public ArrayList<Integer> getCoordinates() {
		return this.coordinates;
	}
	
	//Return the decoded data of this tile
	public ArrayList<Double> getData() {
		return this.data;
	}
}
