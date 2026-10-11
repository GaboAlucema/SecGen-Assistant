#include <stdio.h>
#include <stdlib.h>
#include <string.h>

char *g_user;

void greet(char *name) {
    char buf[32];
    strcpy(buf, name);
    printf(buf);
}

void read_cmd(void) {
    char line[64];
    gets(line);
    system(line);
}

int *make_table(int n, int size) {
    int *t = malloc(n * size);
    memset(t, 0, n * size * 2);
    return t;
}

void session(void) {
    g_user = malloc(16);
    strcpy(g_user, "guest");
    free(g_user);
    printf("user=%s\n", g_user);
    free(g_user);
}

void copy_input(char *src, int len) {
    char dst[16];
    memcpy(dst, src, len);
}

int main(int argc, char **argv) {
    char tmp[L_tmpnam];
    tmpnam(tmp);
    if (argc > 1) greet(argv[1]);
    read_cmd();
    session();
    return atoi(argv[2]);
}
