#include <stdio.h>
#include <stdlib.h>
#include <errno.h>
#include <limits.h>
#include "ascii_utils.h"

int main(int argc, char **argv) {
    if (argc >= 2) {
        char *ptr;
        errno = 0;
        long cols = argc >= 3 ? strtol(argv[2], &ptr, 10) : 100;
        if (errno != 0 || *ptr != '\0' || cols < INT_MIN || cols > INT_MAX) {
            cols = 100;
            fprintf(stderr, "%s\n", "Invalid value for number of columns - using default option 100.");
        }
        errno = 0;
        long levels = argc >= 4 ? strtol(argv[3], &ptr, 10) : 70;
        if (errno != 0 || *ptr != '\0' || (levels != 10L && levels != 70L)) {
            levels = 10L;
            fprintf(stderr, "%s\n", "Number of levels must be 10 or 70 - using default option 10.");
        }
        errno = 0;
        float scale = argc >= 5 ? (float) strtod(argv[4], &ptr) : 0.43;
        if (errno != 0 || *ptr != '\0' || scale < 0.05) {
            scale = 0.43;
            fprintf(stderr, "%s\n", "Invalid value for scale - using default option 0.43.");
        }

        char *ascii = NULL;
        image_to_ascii(&ascii, argv[1], (int) cols, scale, levels == 10L ? gray_levels_10 : gray_levels_70);
        if (ascii != NULL) {
            fputs(ascii, stdout);
            free(ascii);
        }
    }
}
