var gm = require('gm').subClass({imageMagick: true});
var get_pixels = require("get-pixels");

function clamp(val, min, max) {
    return val > max ? max : val < min ? min : val;
}

function compute_average(image, width, height, x1, y1, x2, y2) {
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
    for (let i = 0; i < image.length; i += n) {
        var sum = 0;
        var count = 0;
        for (let j = 0; j < Math.min(3, n) && i + j < image.length; j++) {
            sum += image[i + j];
            count++;
        }
        result.push(count === 0 ? 0 : sum / count);
    }
    return result;
}

var gray_levels_10 = '@%#*+=-:. ';
var gray_levels_70 = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ';

var scale = 0.43;
var cols = 100;

var MAX_WIDTH = 1200;

gm('robot.png').resize(Math.max(MAX_WIDTH, cols)).type("Grayscale").toBuffer('PNG', function(err, data) {
    if (err) {
        console.error(err);
    } else {
        get_pixels(data, 'image/png', function(err, pixels) {
            var width  = pixels.shape[0];
            var height = pixels.shape[1];
            var nComp  = pixels.shape[2];
            var buffer = reduce(pixels.data, nComp);

            var levels = gray_levels_10;

            var tile_width  = width / cols;
            var tile_height = tile_width / scale;
            var rows        = Math.floor(height / tile_height);

            var char_image = '';

            for (var j = 0; j < rows; j++) {
                var y1 = Math.floor(j * tile_height);
                var y2 = j === rows - 1 ? height : Math.floor((j + 1) * tile_height);

                for (var i = 0; i < cols; i++) {
                    var x1 = Math.floor(i * tile_width);
                    var x2 = i === cols - 1 ? width : Math.floor((i + 1) * tile_width);

                    var average = compute_average(buffer, width, height, x1, y1, x2, y2);
                    var gchar = levels.charAt(clamp(Math.floor(average / 255 * (levels.length - 1)), 0, levels.length - 1));

                    char_image += gchar;
                }

                char_image += '\n';
            }
            console.log(char_image);
        });
    }
});
