#ifndef ASCII_UTILS_H
#define ASCII_UTILS_H

#define clamp(x, low, high)  (((x) > (high)) ? (high) : (((x) < (low)) ? (low) : (x)))

extern char *gray_levels_10;
extern char *gray_levels_70;

int gra_to_grayscale(unsigned char **result, unsigned char *image, int width, int height);
int rgb_to_grayscale(unsigned char **result, unsigned char *image, int width, int height, int n);
int image_to_greyscale(unsigned char **result, unsigned char *image, int width, int height, int n);
int image_to_ascii(char **result, char *filename, int cols, float scale, char *levels);

#endif
