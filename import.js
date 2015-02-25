var mkdirp = require('mkdirp');
var probe = require('node-ffprobe');
var wav = require('wav');



var fs = require('fs');
var path = require('path');
var config = require('./config.json');
var Db = require('mongodb').Db,
  Connection = require('mongodb').Connection,
  Server = require('mongodb').Server;

var host = process.env['MONGO_NODE_DRIVER_HOST'] != null ? process.env['MONGO_NODE_DRIVER_HOST'] : 'localhost';
var port = process.env['MONGO_NODE_DRIVER_PORT'] != null ? process.env['MONGO_NODE_DRIVER_PORT'] : Connection.DEFAULT_PORT;
var scanner = new Db('scanner', new Server(host, port, {}));
var db;
var channels = {};

function compile(str, path) {
  return stylus(str)
    .set('filename', path)
    .use(nib())
}

function add_file(files, i) {
    if ( i< files.length) {
    var f = path.join(source_path, files[i]);
    console.log("Trying: " +f);
    

    if ((path.extname(f) == '.mp3')) {
      var name = path.basename(f, '.mp3');
    //if ((path.extname(f) == '.wav')) {
    //  var name = path.basename(f, '.wav');
      var regex = /([0-9]*)-([0-9]*)/
      var result = name.match(regex);
      var tg = parseInt(result[1]);
      var time = new Date(parseInt(result[2]) * 1000);
      var base_path = config.baseDir;
      var local_path = "/" + time.getFullYear() + "/" + time.getMonth() + "/" + time.getDate() + "/";
      var target_path = base_path + local_path;
      console.log("Target Path: " + target_path);

      mkdirp.sync(base_path + local_path, function(err) {
        if (err) console.log(err);
      });
      var target_file = base_path + local_path + path.basename(f);
      console.log("Target File: " + target_file + " Source: " + f);
      fs.renameSync(f, target_file);
      console.log('Moved: ' + f);

      /*var reader = new wav.Reader();
      var input = fs.createReadStream(target_file);
      input.pipe(reader);
      reader.on('format', function() {
      */
      probe(target_file, function(err, probeData) {
        transItem = {
          talkgroup: tg,
          time: time,
          name: path.basename(f),
          path: local_path
        };

        //transItem.len = reader.chunkSize / reader.byteRate;
          if (err) {
            console.log("Error with FFProbe: " + err);
            transItem.len = 3;
          } else {
            transItem.len = probeData.format.duration;
          }
        
        db.collection('transmissions', function(err, transCollection) {
          transCollection.insert(transItem);
          console.log("Added: " + f);
          add_file(files,i+1);
        });

      });

      /*
      reader.on('data', function(chunk) {
        //console.log('got %d bytes of data', chunk.length);
      });
      reader.on('end', function() {
        console.log('end');
          input.unpipe(reader);
          add_file(files,i+1);
      });*/
    } else {
      add_file(files,i+1);
    }

  }
}



var source_path = config.watchDir;

scanner.open(function(err, scannerDb) {
  db = scannerDb;
  scannerDb.authenticate(config.dbUser, config.dbPass, function() {});


  var files = fs.readdirSync(source_path);
  console.log("Found " + files.length + " Files");
  add_file(files,0);
});
