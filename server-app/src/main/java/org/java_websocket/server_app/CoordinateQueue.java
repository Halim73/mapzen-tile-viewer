package org.java_websocket.server_app;

import java.util.LinkedList;

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
	
	public synchronized void clearQueue() {
		this.coordinateQueue.clear();
	}
}
