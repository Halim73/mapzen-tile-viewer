import org.jfree.data.category.DefaultCategoryDataset;

import java.net.URI;
import java.util.HashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;

public class MapClient {
   private Map<Integer,WebClient> zooms;
   private Map<Integer,List<List<String>>> requests;

   private Integer currentZoom;
   private Utilities util;

   private int waitTime = 1000;

   private float centerLat;
   private float centerLon;
   private int viewRadius;
   private boolean setClosed = false;

   public MapClient(Integer[]zooms, URI[]uris,String[] locations,int viewRadius){
       this.zooms = new HashMap<>();
       this.util = new Utilities();
       this.requests = new HashMap<>();

       String[]jsonTile = locations[0].split(",");

       float lat = Float.parseFloat(jsonTile[0]);
       float lon = Float.parseFloat(jsonTile[1]);

       int index = 0;
       for(Integer x:zooms){
           System.out.println(uris[index].toString()+","+locations[index]+","+x.toString());
           this.zooms.put(x,new WebClient(uris[index],locations[index],x.toString()));
           this.zooms.get(x).connect();
           this.requests.put(x,makeRequests(lat,lon,x,viewRadius));
           index++;
       }
       this.currentZoom = this.zooms.keySet().iterator().next();

       this.centerLat = lat;
       this.centerLon = lon;
       this.viewRadius = viewRadius;

       for(Integer x:this.zooms.keySet()){
           while(!this.zooms.get(x).isOpen()){
               try{
                   Thread.sleep(100);
               }catch (InterruptedException e){
                   e.printStackTrace();
               }
           }
       }
   }

   public void moveWithinPrefetch(){
       moveWithinPrefetch(this.centerLat,this.centerLon,this.currentZoom,this.viewRadius);
   }
   private void moveWithinPrefetch(float lat, float lon, int zoom,int radius){
       List<Integer> coords = this.util.convert_to_coords(lat,lon,zoom);
       List<String> requests = new LinkedList<>();

       int tiles = 1;
       for(int i=0;i<tiles;i++){
           List<Integer[]> neighbors = util.findTiles(coords,radius);

           String add = coords.get(0)+","+coords.get(1)+","+true;
           requests.add(add);
           for(Integer[] x:neighbors){
               add = x[0]+","+x[1]+","+false;
               requests.add(add);
           }
           coords.add(0,coords.get(0)+radius);
           coords.add(1,coords.get(1)+radius);
       }
       move(requests,zoom);
       this.setClosed = true;
       //this.zooms.get(zoom).close();
   }

   public void moveOutsidePrefetch(){
       moveOutsidePrefetch(this.centerLat,this.centerLon,this.currentZoom,this.viewRadius);
   }
   private void moveOutsidePrefetch(float lat, float lon, int zoom,int radius){
       List<Integer> coords = this.util.convert_to_coords(lat,lon,zoom);
       List<String> requests = new LinkedList<>();

       int tiles = (int)Math.pow(radius,3);
       int offset = 2;
       for(int i=0;i<tiles;i++){
           String add = coords.get(0)+","+coords.get(1)+","+true;
           requests.add(add);

           coords.add(0,coords.get(0)+(radius+offset));
           coords.add(1,coords.get(1)-(radius+offset));
       }
       move(requests,zoom);
       this.zooms.get(zoom).close();
   }

   private void move(List<String> requests,int zoom){
       this.zooms.get(zoom).setRequests(requests);
       this.zooms.get(zoom).start();

       while(this.zooms.get(zoom).getState().get()) {
           try {
               Thread.sleep(waitTime);
           } catch (InterruptedException e) {
               e.printStackTrace();
           }
       }
   }

   private void move(int zoom,boolean wait){
       this.zooms.get(zoom).start();

       if(wait){
           while(this.zooms.get(zoom).getState().get()) {
               try {
                   Thread.sleep(waitTime);
               } catch (InterruptedException e) {
                   e.printStackTrace();
               }
           }
       }
   }

   public void moveBetweenZooms(int waitTime){
       int offset = 0;

       for(Integer x:getZooms().keySet()){
           for(int i=0;i<2;i++){
               List<Integer> coords = this.util.convert_to_coords(this.centerLat,this.centerLon,x);
               List<String>requests = new LinkedList<>();

               coords.add(0,coords.get(0)+offset);
               coords.add(1,coords.get(1)+offset);

               String add = coords.get(0)+","+coords.get(1)+","+(offset == 0);
               requests.add(add);
               this.zooms.get(x).setRequests(requests);
               offset += viewRadius;

               move(x,false);
               try{
                   Thread.sleep(waitTime);
               }catch (InterruptedException e){
                   e.printStackTrace();
               }
           }
       }
       for(Integer x:this.zooms.keySet()){
           while(this.getZooms().get(x).getState().get()){
               try{
                   Thread.sleep(100);
               }catch (InterruptedException e){
                   e.printStackTrace();
               }
           }
       }
       setClosed = true;
   }

   private List<List<String>> makeRequests(float lat, float lon, int zoom,int radius){
        List<Integer> coords = this.util.convert_to_coords(lat,lon,zoom);
        int tiles = 2;
        int offset = 1;

        List<Integer[]> neighbors = util.findTiles(coords,radius);
        List<List<String>> requests = new LinkedList<>();

        requests.add(0,new LinkedList<>());//centers
        requests.add(1,new LinkedList<>());//non-centers

        for(int i=0;i<tiles;i++){
            for(Integer[] x:neighbors){
                String add = x[0]+","+x[1]+","+false;
                requests.get(1).add(add);

                String data = "["+x[0]+","+x[1]+"]";
            }

            int x = coords.get(0)+offset;
            int y = coords.get(1)-offset;

            String message = x+","+y+","+true;
            requests.get(0).add(message);
        }
        return requests;
    }

   public Map<Integer,WebClient> getZooms(){
       return this.zooms;
   }

   public void resetData(){
       for(Integer x:this.getZooms().keySet()){
           this.getZooms().get(x).getResponseValues().clear();
       }
   }

   public void reset(){
       for(Integer x:this.zooms.keySet()){
           this.zooms.get(x).reconnect();
           while(!this.zooms.get(x).isOpen()){
               try{
                   Thread.sleep(1000);
               }catch (InterruptedException e){
                   e.printStackTrace();
               }
           }
       }
   }

   public void clear(){
       setClosed = false;
       for(Integer x:this.zooms.keySet()){
           //this.zooms.get(x).clear();
           requests.get(x).get(0).clear();
           requests.get(x).get(1).clear();
           //requests.get(x).clear();
       }

   }

   public void close(){
       for(Integer x:this.zooms.keySet()){
           this.zooms.get(x).close();
       }
   }

   public boolean isClosed(){
       if(setClosed)return true;

       for(Integer x:this.zooms.keySet()){
           if(this.zooms.get(x).isClosed())return true;
       }
       return false;
   }

   public double getAverage(int zoom){
       double average = 0;
       int den = 1;
       for(String s:getZooms().get(zoom).getResponseValues().keySet()){
           average += getZooms().get(zoom).getResponseValues().get(s);
           den++;
       }
       return (average/den);
   }

   public double getAverageTotal(){
       double av = 0;
       int den = 1;
       for(Integer x:getZooms().keySet()){
           av += getAverage(x);
           den++;
       }
       return av/den;
   }
}
