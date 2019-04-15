import org.jfree.chart.ChartFactory;
import org.jfree.chart.ChartUtilities;
import org.jfree.chart.JFreeChart;
import org.jfree.chart.axis.NumberAxis;
import org.jfree.chart.axis.NumberTickUnit;
import org.jfree.chart.axis.ValueAxis;
import org.jfree.chart.plot.PlotOrientation;
import org.jfree.chart.plot.XYPlot;
import org.jfree.data.category.DefaultCategoryDataset;
import org.jfree.data.general.SeriesException;
import org.jfree.data.time.RegularTimePeriod;
import org.jfree.chart.renderer.xy.XYLineAndShapeRenderer;
import org.jfree.data.time.Second;
import org.jfree.data.time.TimeSeries;
import org.jfree.data.time.TimeSeriesCollection;
import org.jfree.data.xy.XYDataset;
import org.jfree.data.xy.XYSeries;
import org.jfree.data.xy.XYSeriesCollection;

import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.io.*;
import java.net.URI;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.List;

public class Tester2 {
    private static final int sleepTime = 1000;

    private static void buffer(){
        try{
            Thread.sleep(10);
        }catch (InterruptedException e){
            e.printStackTrace();
        }
    }

    private static TimeSeries createTimeGraph(MapClient c,int x,Second current) {
        final TimeSeries series = new TimeSeries( "Data" );

        for(String s:c.getZooms().get(x).getInOrderInput()){
            double value = c.getZooms().get(x).getResponseValues().get(s);

            try {
                series.add(current, value);
                current = (Second) current.next();
            } catch (SeriesException e) {
                System.err.println("Error adding to series");
            }
        }
        return series;
    }

    private static void displayTimeGraph(List<MapClient> list,String fileName,String info){
        int index = 0;
        for(MapClient c:list){
            Second second = new Second();
            for(Integer x:c.getZooms().keySet()){
                XYDataset dataset = new TimeSeriesCollection(createTimeGraph(c,x,second));
                JFreeChart timechart = ChartFactory.createTimeSeriesChart(
                        info,
                        "Seconds",
                        "Response Times",
                        dataset,
                        false,
                        false,
                        false);
                XYPlot plot = timechart.getXYPlot();
                XYLineAndShapeRenderer renderer = new XYLineAndShapeRenderer(true, true);
                plot.setRenderer(renderer);
                renderer.setSeriesShape(0, new Ellipse2D.Double(-3, -3, 6, 6));
                renderer.setSeriesPaint(0, Color.gray);
                renderer.setUseFillPaint(true);
                renderer.setSeriesShapesFilled(0, true);
                renderer.setSeriesShapesVisible(0, true);
                renderer.setUseOutlinePaint(true);
                renderer.setSeriesOutlinePaint(0, Color.gray);
                //ValueAxis range = plot.getDomainAxis();
                //range.setRange(0,c.getZooms().get(x).getDuration());

                try{
                    File timeChart = new File( "outputPictures/TimeGraphs/"+"client "+index+"_Zoom"+x+"_"+fileName );
                    ChartUtilities.saveChartAsPNG( timeChart, timechart, 640, 480 );
                }catch (IOException e){
                    e.printStackTrace();
                }
            }
            index++;
        }
    }

    private static void average(List<MapClient> clients, DefaultCategoryDataset dataset,String info,boolean justOne){
        for(MapClient c:clients){
            for(Integer x:c.getZooms().keySet()){
                Double av = c.getAverage(x);
                dataset.addValue(av,"Average zoom "+x,info);
                if(justOne)break;
            }
        }
    }

    private static void averageTotal(List<MapClient> clients, DefaultCategoryDataset dataset,String info){
        int index = 0;
        for(MapClient c:clients){
            Double av = c.getAverageTotal();
            dataset.addValue(av,"Average response for client "+index++,info);
        }
    }

    private static void displayWithSameDataset(List<MapClient> clients, DefaultCategoryDataset dataset,String info){
        for(MapClient client:clients){
            for(Integer x:client.getZooms().keySet()){
                for(String s:client.getZooms().get(x).getResponseValues().keySet()){
                    Double value = client.getZooms().get(x).getResponseValues().get(s);
                    dataset.addValue(value,s,info);
                }
            }
        }
    }

    private static void displayBarChartAverage(DefaultCategoryDataset dataset,String file,boolean total){
        String title = (total)? "Clients ":"Coordinates Zoom levels";

        JFreeChart chart1 = ChartFactory.createBarChart(
                "Server Requests "+file,
                title,
                "Time (ms)",
                dataset, PlotOrientation.VERTICAL,
                false,true,false
        );

        String name1 = "outputPictures/BarGraphs/"+file+".png";

        File out = new File(name1);

        try{
            ChartUtilities.saveChartAsPNG(out,chart1,640,480);
        }catch (IOException e){
            e.printStackTrace();
        }
    }

    private static void displayBarChartPrefetch(DefaultCategoryDataset dataset){
        JFreeChart chart1 = ChartFactory.createBarChart(
                "Server Requests prefetching",
                "Coordinates Zoom levels",
                "Time (ms)",
                dataset, PlotOrientation.VERTICAL,
                false,true,false
        );

        String name1 = "outputPictures/BarGraphs/Pre_fetchingTest.png";

        File out = new File(name1);

        try{
            ChartUtilities.saveChartAsPNG(out,chart1,640,480);
        }catch (IOException e){
            e.printStackTrace();
        }
    }

    private static void displayBarChartBetweenZoomMove(DefaultCategoryDataset dataset){
        JFreeChart chart1 = ChartFactory.createBarChart(
                "Average Time Of Server Requests Between Zooms",
                "Coordinates Zoom levels",
                "Time (ms)",
                dataset, PlotOrientation.VERTICAL,
                false,true,false
        );

        String name1 = "outputPictures/BarGraphs/BetweenZoomTimes.png";

        File out = new File(name1);

        try{
            ChartUtilities.saveChartAsPNG(out,chart1,640,480);
        }catch (IOException e){
            e.printStackTrace();
        }
    }

    private static void displayBarChartMoveWithinPrefetch(List<MapClient> clients){
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        int index = 0;
        for(MapClient client:clients){
           for(Integer x:client.getZooms().keySet()){
               for(String s:client.getZooms().get(x).getResponseValues().keySet()){
                    Double value = client.getZooms().get(x).getResponseValues().get(s);
                    dataset.addValue(value,s,"Response Times ms");
               }
               break;
           }
           JFreeChart chart1 = ChartFactory.createBarChart(
                   "Average Time Of Server Requests Within Prefetch",
                   "Coordinates Zoom 10",
                   "Time (ms)",
                   dataset, PlotOrientation.VERTICAL,
                   true,true,false
           );

           String name1 = "outputPictures/BarGraphs/inside_prefetch_client_"+index+".png";

           File out = new File(name1);

           try{
               ChartUtilities.saveChartAsPNG(out,chart1,640,480);
           }catch (IOException e){
               e.printStackTrace();
           }
           index++;
        }
    }

    private static void displayBarChartMoveOutsidePrefetch(List<MapClient> clients){
        DefaultCategoryDataset dataset = new DefaultCategoryDataset();
        int index = 0;
        for(MapClient client:clients){
            for(Integer x:client.getZooms().keySet()){
                for(String s:client.getZooms().get(x).getResponseValues().keySet()){
                    Double value = client.getZooms().get(x).getResponseValues().get(s);
                    dataset.addValue(value,s,"Response Times ms");
                }
                break;
            }
            JFreeChart chart1 = ChartFactory.createBarChart(
                    "Average Time Of Server Requests Outside Prefetch",
                    "Coordinates Zoom 10",
                    "Time (ms)",
                    dataset, PlotOrientation.VERTICAL,
                    true,true,false
            );

            String name1 = "outputPictures/BarGraphs/outside_prefetch_client_"+index+".png";

            File out = new File(name1);

            try{
                ChartUtilities.saveChartAsPNG(out,chart1,640,480);
            }catch (IOException e){
                e.printStackTrace();
            }
            index++;
        }
    }

    private static void testWithinVersionOne(List<MapClient>list){
        int index = 0;
        Thread[]threads = new Thread[list.size()];
        for(MapClient c:list){
            final int add = index;
            Runnable runnable = ()->{
                c.moveWithinPrefetch();
                while(!c.isClosed()){
                    try{
                        Thread.sleep(sleepTime);
                    }catch (InterruptedException e){
                        e.printStackTrace();
                    }
                }
                //System.out.println("Finished moving within pre fetch index "+add);
            };
            threads[index++] = new Thread(runnable);
        }
        index = 0;
        for(Thread t:threads){
            t.start();
            //System.out.println("Started client "+index++);
            //buffer();
        }
        for(Thread t:threads){
            try{
                t.join();
            }catch (InterruptedException e){
                e.printStackTrace();
            }
        }
    }

    private static void TestWithinPrefetchMove(List<MapClient> list,int waitTime){
        testWithinVersionOne(list);
    }

    private static void testOutsideVersionOne(List<MapClient>list){
        int index = 0;
        Thread[]threads = new Thread[list.size()];
        for(MapClient c:list){
            final int add = index;
            Runnable runnable = ()->{
                c.moveOutsidePrefetch();
                while(!c.isClosed()){
                    try{
                        Thread.sleep(sleepTime);
                    }catch (InterruptedException e){
                        e.printStackTrace();
                    }
                }
                System.out.println("Finished moving within pre fetch index "+add);
            };
            threads[index++] = new Thread(runnable);
        }
        index = 0;
        for(Thread t:threads){
            t.start();
            System.out.println("Started client "+index++);
            buffer();
        }
        for(Thread t:threads){
            try{
                t.join();
            }catch (InterruptedException e){
                e.printStackTrace();
            }
        }
    }

    private static void TestOutsidePrefetchMove(List<MapClient>list){
        testOutsideVersionOne(list);
    }

    private static void testBetweenZoomVersionOne(List<MapClient>list,int waitTime){
        int index = 0;
        Thread[]threads = new Thread[list.size()];
        for(MapClient c:list){
            Runnable runnable = ()->{
                c.moveBetweenZooms(waitTime);
            };
            threads[index++] = new Thread(runnable);
        }
        for(Thread t:threads){
            t.start();
            buffer();
        }
        for(Thread t:threads){
            try{
                t.join();
            }catch (InterruptedException e ){
                e.printStackTrace();
            }
        }
    }

    private static void TestBetweenZoomMove(List<MapClient> list,int waitTime){
        testBetweenZoomVersionOne(list,waitTime);
    }

    private static List<String[]> readFromFile(){
        File file = new File("config.txt");
        List<String[]> ret = new LinkedList<>();
        try{
            BufferedReader reader = new BufferedReader(new FileReader(file));
            StringBuilder builder = new StringBuilder();
            String input = "";

            while((input = reader.readLine()) != null){
                builder.append(input).append("\n");
            }
            String[]values = builder.toString().split("\n");
            System.out.println(builder.toString());
            String[] ip = values[0].split(",");
            String[] zooms = values[1].split(":");
            String[] params = values[2].split(",");

            ret.add(0,ip);
            ret.add(1,zooms);
            ret.add(2,params);
        }catch(FileNotFoundException e){
            e.printStackTrace();
            System.out.println("config.txt not present");
        }catch (IOException e){
            e.printStackTrace();
        }
        return ret;
    }

    private static String append(List<MapClient>list,String info){
        StringBuilder ret = new StringBuilder();
        int index = 0;
        for(MapClient c:list){
            ret.append("For client "+index+++" "+info+" ").append(c.getAverageTotal()).append("\n");
        }
        return ret.toString();
    }

    private static void writeToFile(String data){
        File file = new File("outputText/output.txt");

        try{
            PrintWriter writer = new PrintWriter(file);
            writer.write(data);
            writer.close();
        }catch (FileNotFoundException e){
            e.printStackTrace();
        }
    }

    private static void writeAllOutput(List<MapClient> list,String fileName){
        File file = new File(fileName);

        try{
            PrintWriter writer = new PrintWriter(file);
            StringBuilder data = new StringBuilder();

            int index = 0;
            for(MapClient c:list){
                for(Integer x:c.getZooms().keySet()){
                    data.append("Zoom level "+x).append(" client "+index).append("\n");
                    for(String s:c.getZooms().get(x).getResponseValues().keySet()){
                        data.append("\tCoordinates").append(s)
                                .append("\tResponse Time ms "+c.getZooms().get(x).getResponseValues().get(s)).append("\n");
                    }
                }
                index++;
            }
            writer.write(data.toString());
            writer.close();
        }catch (FileNotFoundException e){
            e.printStackTrace();
        }
    }

    private static void run(List<String[]>values){
        List<URI> uriList = new LinkedList<>();
        List<Integer>zoomList = new LinkedList<>();
        List<String> locationsList = new LinkedList<>();

        int numClients = Integer.parseInt(values.get(2)[0]);
        int viewRadius = Integer.parseInt(values.get(2)[1]);

        StringBuilder data = new StringBuilder();

        for(int i=0;i<values.get(0).length;i++){
            String socket = "ws://"+values.get(0)[i]+":30"+values.get(1)[i];
            try{
                uriList.add(i,new URI(socket));
            }catch(URISyntaxException e){
                e.printStackTrace();
            }
        }
        for(String s:values.get(1)){
            zoomList.add(Integer.parseInt(s));
            locationsList.add("36.056595,-112.125092,"+s+",terrarium,256");
        }

        int waitTime = Integer.parseInt(values.get(2)[2]);
        int loopCount = Integer.parseInt(values.get(2)[3]);

        URI[] uris = uriList.toArray(new URI[uriList.size()]);//{uri10,uri11,uri12};
        String[] locs = locationsList.toArray(new String[locationsList.size()]);//{location10,location11,location12};
        Integer[]zooms = zoomList.toArray(new Integer[zoomList.size()]);//{10,11,12};

        //Start Test One
        System.out.println("Starting Test One Move Within Prefetch");
        List<MapClient>list = new LinkedList<>();
        for(int i=0;i<numClients;i++){
            MapClient client = new MapClient(zooms,uris,locs,viewRadius);
            list.add(client);
        }
        TestWithinPrefetchMove(list,waitTime);
        for(MapClient c:list){
            if(c.isClosed()){
                c.close();
            }
        }
        displayBarChartMoveWithinPrefetch(list);
        //End Test One

        DefaultCategoryDataset set2 = new DefaultCategoryDataset();
        displayWithSameDataset(list,set2,"Move within prefetch");

        System.out.println("End Test One\n");
        System.out.println("Start Test Two move between zoom with up to "+waitTime+" hundred ms wait");

        List<MapClient>list2 = new LinkedList<>();
        XYSeriesCollection xySeriesCollection = new XYSeriesCollection();

        int x = 0;
        double[][]averages = new double[numClients][waitTime+1];
        for(int j=0;j<=waitTime;j++){
            int step = 0;
            for(int k=0;k<loopCount;k++){
                for(int i=0;i<numClients;i++){
                    MapClient client = new MapClient(zooms,uris,locs,viewRadius);
                    list2.add(client);
                }

                TestBetweenZoomMove(list2,j*100);

                for(MapClient c:list2){
                    if(c.isClosed()){
                        c.close();
                    }
                    averages[step++][j] += c.getAverageTotal();
                }
                list2.clear();
                step = 0;
            }
            for(x=0;x<numClients;x++){
                averages[x][j] /= loopCount;
                data.append("Prefetch Response Average for ").append(j)
                        .append("00 seconds wait").append(" client ").append(x).append(": ")
                        .append(averages[x][j]).append("\n");
            }
            buffer();
        }

        XYSeries xySeries = new XYSeries(""+
                (numClients > 1?"Average Of Client Response Times":"Client Response Times"));

        for(int k=0;k<=waitTime;k++){
            double av = 0;
            for(int i=0;i<numClients;i++){
                av += averages[i][k];
            }
            xySeries.add(k,av/numClients);
        }
        xySeriesCollection.addSeries(xySeries);
        JFreeChart xylineChart = ChartFactory.createXYLineChart(
                "Prefetch Response Times With Wait",
                "Wait In Seconds",
                "Response Time ms",
                xySeriesCollection,
                PlotOrientation.VERTICAL,
                true, true, false);

        File XYChart = new File( "outputPictures/BarGraphs/BetweenZoomTimes.png" );
        NumberAxis axis = new NumberAxis("Wait Time Hundreds Of Milliseconds");
        axis.setTickUnit(new NumberTickUnit(1));
        XYPlot plot = (XYPlot)xylineChart.getPlot();
        plot.setDomainAxis(axis);

        try{
            ChartUtilities.saveChartAsPNG( XYChart, xylineChart, 640, 480);
        }catch (IOException e){
            e.printStackTrace();
        }

        //Start Test Four move outside of the prefetch range
        System.out.println("End Test Two\n");
        System.out.println("Start Test Three move outside of the prefetch range");
        List<MapClient>list4 = new LinkedList<>();
        for(int i=0;i<numClients;i++){
            MapClient client = new MapClient(zooms,uris,locs,viewRadius);
            list4.add(client);
        }
        TestOutsidePrefetchMove(list4);
        for(MapClient c:list4){
            if(c.isClosed()){
                c.close();
            }
        }
        System.out.println("End Test Three");
        System.out.println("Finished All Tests");
        displayWithSameDataset(list4,set2,"Move Outside Prefetch");
        displayBarChartPrefetch(set2);
        displayBarChartMoveOutsidePrefetch(list4);

        DefaultCategoryDataset set3 = new DefaultCategoryDataset();
        average(list,set3,"Average Within Prefetch",true);
        average(list4,set3,"Average Outside Prefetch",true);
        displayBarChartAverage(set3,"Averages For Prefetch Move With "+numClients+(numClients > 1?" Clients":" Client"),false);


        data.append("").append(append(list,"Within Prefetch Move Average")).append("\n");
        data.append("").append(append(list4,"Outside Prefetch Move Average")).append("\n");
        //fileData.add(data.toString());

        writeToFile(data.toString());

        writeAllOutput(list,"outputText/Within_Prefetch_Data.txt");
        writeAllOutput(list4,"outputText/Outside_Prefetch_Data.txt");

        displayTimeGraph(list,"Within_Prefetch_time.png","Time Graph For Move Within Prefetch");
        displayTimeGraph(list4,"Outside_Prefetch_time.png","Time Graph For Move Outside Prefetch");
    }

    public static void main(String[]args){
        final List<String[]>values = readFromFile();

        String fileName = "outputPictures";
        String fileName2 = "outputText";

        String sub = "outputPictures/TimeGraphs";
        String sub2 = "outputPictures/BarGraphs";

        Path path = Paths.get(fileName);
        Path path2 = Paths.get(fileName2);
        Path path3 = Paths.get(sub);
        Path path4 = Paths.get(sub2);

        if (!Files.exists(path)) {
            try{
                Files.createDirectory(path);
            }catch (IOException e){
                e.printStackTrace();
            }
        }
        if (!Files.exists(path2)) {
            try{
                Files.createDirectory(path2);
            }catch (IOException e){
                e.printStackTrace();
            }
        }
        if (!Files.exists(path3)) {
            try{
                Files.createDirectory(path3);
            }catch (IOException e){
                e.printStackTrace();
            }
        }
        if (!Files.exists(path4)) {
            try{
                Files.createDirectory(path4);
            }catch (IOException e){
                e.printStackTrace();
            }
        }
        run(values);
    }
}
