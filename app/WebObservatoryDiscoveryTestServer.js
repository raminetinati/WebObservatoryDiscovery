var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var ioOut = require('socket.io-client');
var socket = ioOut.connect('http://socpub.cloudapp.net:9876');
var microdata = require('node-microdata-scraper');
var fs = require('fs');

var server_url;
var dataset_url;
var vis_url;
var wo_name;

var active_wo = []; 

//set the http
app.listen(3091);

function handler (req, res) {
    res.writeHead(200);
    res.end(""); 
}


//Load the config!
fs.readFile( __dirname + '/wo_discovery.config', function (err, data) {
  if (err) {
    throw err; 
  }
    var filedata = JSON.parse(data);
    wo_name = filedata.wo_name;
    server_url = filedata.wo_url;
    dataset_url = server_url+"/wo/dataset";
    vis_url = server_url+"/wo/visualisation";
    console.log("---CONFIG: wo_name: "+wo_name);
    console.log("---CONFIG: wo_url: "+server_url);
    console.log("---CONFIG: dataset_url: "+dataset_url);
    console.log("---CONFIG: vis_url: "+vis_url);
    console.log("---CONFIG: lighthouse_url: "+filedata.wo_lighthouse_url);

});


socket.on('heartbeat_lighthouse', function (data) {
    
    if(data.heartbeat){
       console.log("got heartbeat from lighthouse");
       //and send a pulse back
       socket.emit('wo_pulse', { wo_url: server_url});
    }

});


socket.on('data_list_request', function(data) {

    //console.log("Being asked for my dataset list");
    //send back the dataset (might be big... HACK for now)
    socket.emit('data_list_response', getDataList());

});


socket.on('active_wo_list', function(data) {

    console.log("Current active WOs:");
      for(i in data){
        //console.log("  "+data[i]);
      }
    //send back the dataset (might be big... HACK for now)
    //socket.emit('dataset_list_response', getDatasetList());

});


socket.on('search_for_data', function(data) {

    console.log("Search Request for:"+data);
      
    var datasets_found = searchForDatasetNaieve(data);
    var vis_found = searchForVisNaieve(data);
     
    var found = datasets_found.concat(vis_found);

    if(found){
          socket.emit('search_results', found);
    }

});



//Package up the dataset with the wo_url
function getDataList(){

  //var data = {datasetID1: "NOTHING HERE YET", datasetID2: "NOTHING HERE EITHER"};
  var packed = {"wo_name": wo_name, 
                "wo_url": server_url, 
                "datasets": lookupDatasetList(),
                "visualisations": lookupVisList()
                };
  return packed;


}


var dataset_list = []; 
//console.log("datset_url:" +dataset_url);
function lookupDatasetList(){ 
    microdata.parseUrl(dataset_url, function(err, json) {
    if (!err && json) {
      dataset_list = JSON.parse(json)
      //console.log(dataset_list);
    }else{
      console.log(err);
    }
    });
 
    return dataset_list;

}


var vis_list = [];
//console.log("datset_url:" +dataset_url);
function lookupVisList(){

  
    microdata.parseUrl(vis_url, function(err, json) {
    if (!err && json) {
      vis_list = JSON.parse(json)
      //console.log(vis_list);
    }
    });
 
    return vis_list;

}





function searchForDatasetNaieve(searchQuery){

  matched_datasets = [];
  for(i in dataset_list)
  {
    var doc = JSON.stringify(dataset_list[i].properties);
    console.log(dataset_list[i].properties)
    if(isStringFound(searchQuery, doc)){
      console.log("match");
      matched_datasets.push(dataset_list[i]);
    }
  }

  return matched_datasets;
}



function searchForVisNaieve(searchQuery){

  matched_datasets = [];
  for(i in vis_list)
  {
    // var doc = vis_list[i].properties.http\:\/\/schema.org\/name + " " +
    //           vis_list[i].properties.http\:\/\/schema.org\/provider + " " +
    //           vis_list[i].properties.http\:\/\/schema.org\/description; 
    var doc = JSON.stringify(vis_list[i]);
    if(isStringFound(searchQuery, doc)){
      console.log("match");
      matched_datasets.push(vis_list[i]);
    }
  }

  return matched_datasets;
}

function isStringFound(string, doc){

  if(doc.toLowerCase().indexOf(string.toLowerCase()) != -1){
    return true;
  }else{
    return false;
  }

}
