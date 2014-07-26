var express = require('express');
var router = express.Router();
var request = require("request");
var sha1 = require('sha1');
var fs = require('fs');

var cacheDir = 'public/cache/';
var imageUrl = 'cache/';

var imageCount = 3;

var kimonoAPIKey = process.env.KIMONO_API_KEY || '';

var kimonoUrl = 'https://www.kimonolabs.com/api/';
var positionAPIMap = {
  'K': 'c92exr5s',
  'TE': '3qu6o7wc',
  'WR': '762jgppk',
  'RB': '4r7ietm4',
  'QB': 'dxgvvqge',
  'DEF': '4tszoqe0'
};

var YaBoss = require('yaboss');
var YaBossClient = new YaBoss(
  process.env.YAHOO_BOSS_CLIENT_ID || '',
  process.env.YAHOO_BOSS_CLIENT_SECRET|| ''
);

function getImages(queryHash) {
  return fs.readdirSync(cacheDir + queryHash).map(function(fn) {
    return imageUrl + queryHash + '/' + fn;
  });
}

function getFilename(url) {
  var fn = sha1(url);
  var ext = /(\.png|\.jpg|\.jpeg|\.gif)/i.exec(url);
  return fn + (ext ? ext[1] : '.jpg');
}

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Auction Draft' });
});

/* GET player or team images */
router.get('/images', function(req, res) {
  var query = req.query.q;
  var queryHash = sha1(query);

  if (!fs.existsSync(cacheDir + queryHash)) {
    YaBossClient.searchImages(req.query.q, {count: imageCount, dimensions: 'medium'}, function(err, dataFound, response) {
      var jsonData = JSON.parse(dataFound);
      var images = jsonData.bossresponse.images.results;

      fs.mkdirSync(cacheDir + queryHash);
      images.map(function (image) {
        var imgPath = cacheDir + queryHash + '/' + getFilename(image.url);

        count = 0;
        request(image.url).pipe(fs.createWriteStream(imgPath)).on('close', function() {
          count++;

          if (count == imageCount) {
            res.json({ images: getImages(queryHash) });
          }
        });
      });
    });
  } else {
    console.log('Used cached images for query: ' + query);
    res.json({ images: getImages(queryHash) });
  }
});

/* GET data from Kimono NFL API */
router.get('/nflData', function(req, res) {
  var position = req.query.position;
  if (position) {
    var api = positionAPIMap[position];

    request(kimonoUrl + api + "?apikey=" + kimonoAPIKey, function(err, response, body) {
      if (err) {
        res.json({error: error});
      } else {
        res.json(JSON.parse(body));
      }
    });
  } else {
    res.json({error: 'No position specified'});
  }
});

module.exports = router;
