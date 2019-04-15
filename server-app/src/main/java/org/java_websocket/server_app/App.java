package org.java_websocket.server_app;

public class App 
{
    public static void main( String[] args )
    {
    	if(args.length != 5) {
    		System.out.println("Invalid parameters");
    		System.out.println("Usage: server port zoom MAX_WORKER_THREADS MAX_SEARCH_RADIUS");
    		System.exit(0);
    	}
    	try {
    		int port = Integer.parseInt(args[0]);
    		int zoom = Integer.parseInt(args[1]);
    		int max_worker_threads = Integer.parseInt(args[2]);
    		int max_search_radius = Integer.parseInt(args[3]);
    		int clientSearchRadius = Integer.parseInt(args[4]);
    		if(max_search_radius > clientSearchRadius) {
    			new WebsocketServer(port, zoom, max_worker_threads, max_search_radius, clientSearchRadius).start();
    		}
    		else {
    			throw new Exception("client search radius cannot be smaller than prefetching search radius");
    		}
    	}
    	catch(Exception e) {
    		System.out.println("Parameters of incorrect type");
    		System.exit(0);
    	}
    }
}
