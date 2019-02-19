package org.java_websocket.server_app;

import java.awt.Color;
import java.awt.image.BufferedImage;
import java.net.URL;
import java.util.ArrayList;

public class Utilities {
	
	//Constructor
	public Utilities() {
		
	}
	
	//Convert lat, lon, and zoom to Web Mercator coordinates
	public ArrayList<Integer> convert_to_coords(double lat, double lon, int zoom) {
	    assert zoom >= 0 && zoom <= 20: "Invalid zoom";
	    int n = (int) Math.pow(2, zoom);
	    int x = (int) Math.floor(n * ((lon + 180) / 360));
	    int y = (int) Math.floor(n * (1 - (Math.log(Math.tan(lat * Math.PI / 180) + (1 / Math.cos(lat * Math.PI / 180))) / Math.PI)) / 2);
	    ArrayList<Integer> coords = new ArrayList<Integer>();
	    coords.add(x);
	    coords.add(y);
	    return coords;
	}
	
	//Generate tile URL from coordinates, zoom, filetype, and size
	public String generateURL(ArrayList<Integer> coordinates, int zoom, String filetype, int size) throws Exception {
		String apiKey = "aLCQdfwuRaCCNQi4JrInMQ";
		String url = "";
			    
		if(filetype.equals("normal") || filetype.equals("terrarium")) {
			url = "https://tile.nextzen.org/tilezen/terrain/v1/" + size + "/" + filetype + "/" + zoom + "/" + coordinates.get(0) + "/" + coordinates.get(1)+ ".png?api_key=" + apiKey;
		}	
		else if(filetype == "geotiff") {
			url = "https://s3.amazonaws.com/elevation-tiles-prod/" + filetype + "/" + zoom + "/" + coordinates.get(0) + "/" + coordinates.get(1) + ".tif";
		}
	    else {
	    	throw new Exception("Unsupported format");
	    }

		return url;
	}
	
	public BufferedImage retrieveImage(ArrayList<Integer> coordinates, int zoom, String filetype, int size) {
		BufferedImage tile = null;
		try {
			String filename = generateURL(coordinates, zoom, filetype, size);
			URL url = new URL(filename);
			tile = javax.imageio.ImageIO.read(url);
		}
		catch(Exception e) {
			System.out.println("Invalid filename");
		}
		return tile;
	}
	
	//Decode tile pixel
	public double decodePixel(Color pixel) {
		int red = pixel.getRed();
		int green = pixel.getGreen();
		int blue = pixel.getBlue();
		return (red * 256 + green + blue / 256) - 32768;
	}
}
