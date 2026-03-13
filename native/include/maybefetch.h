#ifndef MAYBEFETCH_H
#define MAYBEFETCH_H

#include <stddef.h>

typedef struct {
    char* data;
    size_t size;
} FetchResponse;

typedef struct {
    int max_retries;
    int initial_delay_ms;
    int max_delay_ms;
    double backoff_factor;
    int timeout_ms;
} FetchConfig;

FetchResponse* maybefetch(const char* url, const FetchConfig* config);
void free_fetch_response(FetchResponse* response);

/* QuickJS integration */
#ifdef QUICKJS_H
void js_std_add_maybefetch(JSContext *ctx);
#endif

#endif