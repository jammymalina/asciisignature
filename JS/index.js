var gm = require('gm').subClass({ imageMagick: true });

var gray_levels_10 = '@%#*+=-:. ';
var gray_levels_70 = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`\'. ';

function image_to_greyscale()
