#include "ascii_utils.h"

#include <string.h>
#include <stdio.h>

#define STB_IMAGE_IMPLEMENTATION
#include "stb/stb_image.h"

char *gray_levels_10 = "@%#*+=-:. ";
char *gray_levels_70 = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

int gra_to_grayscale(unsigned char **result, unsigned char *image, int width, int height) {
    int image_length = width * height * 2;
    int gr_length = width * height;
    *result = (unsigned char*) malloc(gr_length);
    if (result == NULL) {
        fprintf(stderr, "%s\n", "Malloc of grayscale image failed.");
        return 0;
    }

    unsigned char *iter = *result;
    //#pragma omp parallel for private(iter)
    for (int i = 0; i < image_length; i += 2) {
        *iter++ = image[i];
    }

    return 1;
}

int rgb_to_grayscale(unsigned char **result, unsigned char *image, int width, int height, int n) {
    if (n <= 2) return 0;

    int image_length = width * height * n;
    int gr_length = width * height;
    *result = (unsigned char*) malloc(gr_length);
    if (result == NULL) {
        fprintf(stderr, "%s\n", "Malloc of grayscale image failed.");
        return 0;
    }

    unsigned char *iter = *result;
    //#pragma omp parallel for
    for (int i = 0; i < image_length; i += n) {
        unsigned char red   = image[i];
        unsigned char green = image[i + 1];
        unsigned char blue  = image[i + 2];
        float intensity =  red * 0.3 + green * 0.59 + blue * 0.11;
        *iter++ = clamp((unsigned char) intensity, 0, 255);
    }

    return 1;
}

int image_to_greyscale(unsigned char **result, unsigned char *image, int width, int height, int n) {
    int ok = 1;
    if (n == 1) {
        *result = malloc(width * height);
        memcpy(*result, image, width * height);
    } else if (n == 2) {
        ok = gra_to_grayscale(result, image, width, height);
    } else if (n >= 3) {
        ok = rgb_to_grayscale(result, image, width, height, n);
    } else {
        fprintf(stderr, "%s\n", "Negative n is prohibited.");
        ok = 0;
    }
    return ok;
}

static int compute_average(unsigned char *image, int width, int height, int x1, int y1, int x2, int y2) {
    int average = 0;
    int count = 0;
    for (int x = x1; x < x2; x++) {
        for (int y = y1; y < y2; y++) {
            average += image[y * width + x];
            count++;
        }
    }
    return average / count;
}

int image_to_ascii(char **result, char *filename, int cols, float scale, char *levels) {
    int levels_length = strlen(levels);
    if (levels == NULL || levels_length == 0) return 0;
    int width, height, n;

    unsigned char *image = stbi_load(filename, &width, &height, &n, 0);
    if (image == NULL) {
        fprintf(stderr, "%s\n", "Image load failed - file may not exist or it isn't an image.");
        return 0;
    }

    float tile_width = ((float) width) / cols;
    float tile_height = tile_width / scale;
    int rows = (int) (height / tile_height);
    if (cols > width || rows > height) {
        fprintf(stderr, "%s\n", "Image too small for specified columns.");
        return 0;
    }

    unsigned char *gr = NULL;
    int ok = image_to_greyscale(&gr, image, width, height, n);

    if (!ok || gr == NULL) {
        fprintf(stderr, "%s\n", "Converting image to grayscale failed.");
        stbi_image_free(image);
        return 0;
    }

    *result = (char*) malloc(rows * cols + rows + 1);
    if (result == NULL) {
        fprintf(stderr, "%s\n", "Couldn't allocate string.");
        return 0;
    }

    char *iter = *result;
    //#pragma omp parallel for
    for (int j = 0; j < rows; j++) {
        int y1 = (int) (j * tile_height);
        int y2 = j == rows - 1 ? height : (int) ((j + 1) * tile_height);

        for (int i = 0; i < cols; i++) {
            int x1 = (int) (i * tile_width);
            int x2 = i == cols - 1 ? width : (int) ((i + 1) * tile_width);

            float average = compute_average(gr, width, height, x1, y1, x2, y2);
            char gs = levels[clamp((int) (average / 255 * (levels_length - 1)), 0, levels_length - 1)];
            *iter++ = gs;
        }
        *iter++ = '\n';
    }
    *iter = '\0';
    stbi_image_free(image);
    free(gr);
    return 1;
}
