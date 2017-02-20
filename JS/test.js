var gm = require('gm').subClass({imageMagick: true});
var async = require('async');
var path = require('path');
var AWS = require('aws-sdk');
var util = require('util');
var getPixels = require("get-pixels");

var grayLevels10 = '@%#*+=-:. ';
var grayLevels70 = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ';

var scale = 0.43;
var cols = 100;

var s3 = new AWS.S3();

var MAX_WIDTH = 1200;

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

function computeAverage(image, width, height, x1, y1, x2, y2) {
    var average = 0;
    var count = 0;
    for (var x = x1; x < x2; x++) {
        for (var y = y1; y < y2; y++) {
            average += image[y * width + x];
            count++;
        }
    }
    return count === 0 ? 0 : average / count;
}

function reduce(image, n) {
    var result = [];
    for (var i = 0; i < image.length; i += n) {
        var sum = 0;
        var count = 0;
        for (var j = 0; j < Math.min(3, n) && i + j < image.length; j++) {
            sum += image[i + j];
            count++;
        }
        result.push(count === 0 ? 0 : sum / count);
    }
    return result;
}

exports.handler = function(event, context, callback) {
    // Read options from the event.
    console.log("Reading options from event:\n", util.inspect(event, {depth: 5}));
    var srcBucket = event.Records[0].s3.bucket.name;
    // Object key may have spaces or unicode non-ASCII characters.
    var srcKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

    // Infer the image type.
    var typeMatch = srcKey.match(/\.([^.]*)$/);
    if (!typeMatch) {
        console.error('Unable to infer image type for key ' + srcKey);
        return;
    }
    var imageType = typeMatch[1];
    if (imageType != 'jpg' && imageType != 'png' && imageType != 'jpeg') {
        console.log('Skipping non-image ' + srcKey);
        return;
    }

    // Download the image from S3, transform, and upload to a different S3 bucket.
    async.waterfall([
        function download(next) {
            // Download the image from S3 into a buffer.
            s3.getObject({
                Bucket: srcBucket,
                Key: srcKey
            }, next);
        },
        function transform(response, next) {
            gm(response.Body).size(function(err, size) {
                var maxW   = Math.max(MAX_WIDTH, cols);
                var width  = size.width > maxW ? maxW : size.width;
                var height = size.height;
                // Transform the image buffer in memory.
                this.channel("gray").resize(width).toBuffer('PNG', function(err, buffer) {
                    if (err) {
                        next(err);
                    } else {
                        next(null, 'image/png', buffer, width, height);
                    }
                });
            });
        },
        function getPixels(contentType, buffer, width, height, next) {
            getPixels(buffer, contentType, function(err, pixels) {
                if (err) {
                    next(err);
                } else {
                    width           = pixels.shape[0];
                    height          = pixels.shape[1];
                    var nComponents = pixels.shape[2];
                    next(null, contentType, reduce(pixels.data, nComponents), width, height);
                }
            });
        },
        function getCharImage(contentType, buffer, width, height, next) {
            var levels = grayLevels10;

            var tilewidth  = width / cols;
            var tileheight = tilewidth / scale;
            var rows        = Math.floor(height / tileheight);

            var charImage = '';

            for (var j = 0; j < rows; j++) {
                var y1 = Math.floor(j * tileheight);
                var y2 = j === rows - 1 ? height : Math.floor((j + 1) * tileheight);

                for (var i = 0; i < cols; i++) {
                    var x1 = Math.floor(i * tilewidth);
                    var x2 = i === cols - 1 ? width : Math.floor((i + 1) * tilewidth);

                    var average = computeAverage(buffer, width, height, x1, y1, x2, y2);
                    var gchar = levels.charAt(clamp(Math.floor(average / 255 * (levels.length - 1)), 0, levels.length - 1));

                    charImage += gchar;
                }

                charImage += '\n';
            }
            callback(null, charImage);
            next(null);
        }
    ], function(err) {
        if (err) {
            console.error('Unable to convert ' + srcBucket + '/' + srcKey + ' to ascii due to an error: ' + err);
            callback(err, '');
        } else {
            console.log('Successfully converted ' + srcBucket + '/' + srcKey + ' to ascii');
        }

        context.done();
    });
};
