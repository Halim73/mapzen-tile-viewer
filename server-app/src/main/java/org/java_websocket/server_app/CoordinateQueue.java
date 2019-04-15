package org.java_websocket.server_app;

import java.util.Iterator;
import java.util.LinkedList;

import org.java_websocket.WebSocket;

public class CoordinateQueue {
	private LinkedList<CoordinateQueueItem> coordinateQueue;
	
	public CoordinateQueue() {
		this.coordinateQueue = new LinkedList<CoordinateQueueItem>();
	}
	
	public synchronized void enqueue(CoordinateQueueItem coordinate) {
		if(this.coordinateQueue.isEmpty()) {
			notifyAll();
		}
		this.coordinateQueue.add(coordinate);
	}
	
	public synchronized CoordinateQueueItem dequeue() throws InterruptedException {
		while(this.coordinateQueue.isEmpty()) {
			System.out.println(Thread.currentThread().getName() + " : Buffer is empty, waiting");
			wait();
		}

		return this.coordinateQueue.removeFirst();
	}
	
	public synchronized void clearQueue(WebSocket client) {
		Iterator<CoordinateQueueItem> itr = this.coordinateQueue.iterator();
		while(itr.hasNext()) {
			CoordinateQueueItem item = itr.next();
			if(item.getClient().equals(client)) {
				itr.remove();
			}
		}
	}
}
