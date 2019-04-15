import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.*;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.atomic.AtomicBoolean;

public class WebClient extends WebSocketClient{
    private String location;
    private String id;

    private Utilities util;

    private List<Integer[]> neighbors;
    private Queue<String>tR;
    private Queue<String> inOrderInput;
    private long start;
    private long end;

    private long programStart;
    private double duration;

    private Map<String,Double> responses;
    private Map<String,Boolean>isDecoded;

    private Set<String> hasBeenServiced;
    private Set<String> hasRequested;
    private Set<String> stillFetching;

    private Map<String,Double> requests;
    private Map<String,Integer> toDiscard;
    //private Map<String,Integer> zooms;

    private Map<Integer,Map<String,Double>> data;

    private static long SLEEP_TIME = 1000;

    private AtomicBoolean isReady = new AtomicBoolean(true);

    private String firstPoint;
    private int startSize = 0;

    public WebClient(URI uri,String location,String id){
        super(uri);
        this.location = location;
        util = new Utilities();
        this.id = id;
        zeroData();
    }

    private void zeroData(){
        this.neighbors = new ArrayList<>();
        this.tR = new LinkedBlockingQueue<>();
        this.inOrderInput = new LinkedBlockingQueue<>();

        this.start = 0L;
        this.end = 0L;

        this.responses = new HashMap<>();
        this.requests = new HashMap<>();
        this.isDecoded = new HashMap<>();
        this.toDiscard = new HashMap<>();

        this.data = new HashMap<>();

        this.hasBeenServiced = new HashSet<>();
        this.hasRequested = new HashSet<>();
        this.stillFetching = new HashSet<>();
    }

    @Override
    public void onOpen(ServerHandshake handshake){
        openTest2();
    }

    private void openTest2(){
        this.programStart = System.nanoTime();
        this.start = System.nanoTime();
    }

    @Override
    public void send(String text) {
        if(text == null)return;
        if(!super.getConnection().isOpen())return;

        String[] d = text.split(",");
        String log = "["+d[0]+","+d[1]+"]";

        this.isDecoded.putIfAbsent(log,false);
        this.requests.putIfAbsent(log,((Long)System.nanoTime()).doubleValue());
        super.send(text);
    }

    @Override
    public void onMessage(String message){
        //test1(message);
        test2(message);
    }

    public void start(){
        this.startSize = this.tR.size();
        String m = this.tR.poll();
        String[]data = m.split(",");

        addRequest(m);
        this.firstPoint = "["+data[0]+","+data[1]+"]";
        send(m);
    }

    public void setRequests(List<String> requests){
        this.tR.addAll(requests);
    }

    private void test2(String message){
        this.end = System.nanoTime();

        String[] split = message.split(":");
        String[] coords = split[split.length-1].replaceAll("}","")
                .replaceAll("]","")
                .replace("[","")
                .split(",");
        String state = split[1].split(",")[0].replaceAll("\"","").toLowerCase().trim();
        String data = "["+coords[0]+","+coords[1]+"]";
        String isCenter = split[2].split(",")[0];

        if(this.requests.containsKey(data)){
            if(!state.equalsIgnoreCase("still fetching") && !state.equalsIgnoreCase("still decoding")){
                this.isDecoded.replace(data,true);
            }
        }

        if(this.isDecoded.get(data) != null){
            if(this.isDecoded.get(data)){
                double time = (this.end-this.requests.get(data))/1e6;
                if(!this.firstPoint.equalsIgnoreCase(data) || this.startSize == 1){
                    this.responses.put(data,time);
                    this.hasBeenServiced.add(data);
                    this.inOrderInput.offer(data);
                }

                //System.out.println(data);
                //System.out.println("\t"+message);

                String m = tR.poll();

                if(tR.isEmpty()){
                    this.isReady.set(false);
                }else{
                    if(m != null){
                        addRequest(m);
                        send(m);
                    }
                }
            }else{
                if(!this.toDiscard.containsKey(data)){
                    this.toDiscard.put(data,0);
                }
                if(state.equalsIgnoreCase("still fetching ")){
                    this.toDiscard.replace(data,this.toDiscard.get(data)+1);
                    if(this.toDiscard.get(data) >= 200){
                        this.isReady.set(false);
                        System.out.println("\tProblems with getting data");
                    }
                }
                String s = coords[0]+","+coords[1]+","+isCenter;
                try{
                    Thread.sleep(SLEEP_TIME);
                }catch(InterruptedException e){
                    e.printStackTrace();
                }
                send(s);
            }
        }
    }

    @Override
    public void onClose(int n,String s,boolean b){
        this.duration = Math.max(duration,(System.nanoTime()-this.programStart)/1e9);
        for(Integer x:this.data.keySet()){
            for(String str:this.responses.keySet()){
                this.data.get(x).putIfAbsent(str,this.responses.get(str));
            }
        }
    }

    @Override
    public void onError(Exception e){
        e.printStackTrace();
    }

    public Queue<String> getQueue() {
        return tR;
    }

    public void printResponseTimes(){
        StringBuilder ret = new StringBuilder("\nZoom Level ").append(id).append("\n");
        for(String s:this.responses.keySet()){
            ret.append("\tCoordinates: ").append(s).append("\t, Time taken: ").append(this.responses.get(s)).append(" ms\n");
        }
        System.out.println(ret.toString());
    }

    public Map<String,Double> getResponseValues(){
        return this.responses;
    }

    public void addRequest(String request){
        this.hasRequested.add(request);
    }

    public void clear(){
        zeroData();
        openTest2();
    }

    public AtomicBoolean getState(){return this.isReady;}

    public double getDuration(){return this.duration;}

    public Map<Integer,Map<String,Double>> getData(){return this.data;}

    public Set<String>getHasBeenServiced(){return this.hasBeenServiced;}

    public Queue<String> getInOrderInput(){return this.inOrderInput;}
}
