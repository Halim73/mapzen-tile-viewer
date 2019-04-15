package org.java_websocket.server_app;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Hashtable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class WebsocketServer extends WebSocketServer {

    private int zoom;
    private int max_worker_threads;
    private int max_search_radius;
    private int clientSearchRadius;
    private final int INIT_SCALE = 1;
    private final int SIZE = 256;
    private final String FILETYPE = "terrarium";
    private ExecutorService workerThreadPool;
    private Hashtable<WebSocket, Client> connections;
    private CoordinateQueue coordinateQueue;

    //Where should the worker threads be started? From constructor, or upon first connection?
    public WebsocketServer(int tcp_port, int zoom, int max_worker_threads, int max_search_radius, int clientSearchRadius) {
        super(new InetSocketAddress(tcp_port));
        this.zoom = zoom;
        this.max_worker_threads = max_worker_threads;
        this.max_search_radius = max_search_radius;
        this.clientSearchRadius = clientSearchRadius;
        this.connections = new Hashtable<WebSocket, Client>();
        this.workerThreadPool = Executors.newFixedThreadPool(max_worker_threads);
        this.coordinateQueue = new CoordinateQueue();
    }

    @Override
    public void onOpen(WebSocket connection, ClientHandshake handshake) {
    	Client newClient = new Client(connection, this.max_search_radius, this.clientSearchRadius, this.coordinateQueue);
    	
    	//If first connection, add worker threads to thread pool and execute
        if(this.connections.isEmpty()) {
        	System.out.println("Executing workers");
        	for(int i = 0; i < this.max_worker_threads; i++) {
        		Worker worker = new Worker(this.coordinateQueue, this.connections, this.zoom, INIT_SCALE, FILETYPE, SIZE);
        		this.workerThreadPool.execute(worker);
        	}
        }
        
        this.connections.put(connection, newClient);
        System.out.println("New connection from " + connection.getRemoteSocketAddress().getAddress().getHostAddress());
    }

    @Override
    public void onClose(WebSocket connection, int code, String reason, boolean remote) {
    	//Remove client from connections
        this.connections.remove(connection);
        System.out.println("Closed connection to " + connection.getRemoteSocketAddress().getAddress().getHostAddress());
    }

    @Override
    public void onMessage(WebSocket connection, String message) {
        //System.out.println("Message from client: " + message);
        
        //Parse message
        String[] messageValues = message.split(",");
        ArrayList<Integer> currentCoordinate = new ArrayList<Integer>(Arrays.asList(Integer.parseInt(messageValues[0]), Integer.parseInt(messageValues[1])));
        boolean isCenter = Boolean.parseBoolean(messageValues[2]);
        
        //Update tileMap of this client and send decoded tile data
        Client currentClient = connections.get(connection);
        currentClient.updateTileMap(currentCoordinate, isCenter);
        connection.send(currentClient.getRequestedTile(currentCoordinate, isCenter).toString());
    }

    @Override
    public void onError(WebSocket connection, Exception ex) {
        ex.printStackTrace();
        if (connection != null) {
            connections.remove(connection);
        }
        System.out.println("ERROR from " + connection.getRemoteSocketAddress().getAddress().getHostAddress());
        System.out.println("Removed from connections set");
    }
}


