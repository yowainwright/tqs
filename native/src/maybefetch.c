#include "../include/maybefetch.h"
#include <curl/curl.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <math.h>

typedef struct {
    char* memory;
    size_t size;
} MemoryStruct;

static size_t write_memory_callback(void* contents, size_t size, size_t nmemb, void* userp) {
    const size_t realsize = size * nmemb;
    MemoryStruct* mem = (MemoryStruct*)userp;

    char* ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) return 0;

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

static void sleep_ms(int milliseconds) {
    usleep(milliseconds * 1000);
}

static int calculate_delay(int attempt, const FetchConfig* config) {
    const double delay = config->initial_delay_ms * pow(config->backoff_factor, attempt);
    const int delay_ms = (int)delay;
    return delay_ms > config->max_delay_ms ? config->max_delay_ms : delay_ms;
}

static struct curl_slist* build_headers(const FetchConfig* config) {
    struct curl_slist* headers = NULL;
    if (!config->headers) return NULL;

    for (size_t i = 0; i < config->header_count; i++) {
        if (!config->headers[i]) continue;
        struct curl_slist* next = curl_slist_append(headers, config->headers[i]);
        if (!next) {
            if (headers) curl_slist_free_all(headers);
            return NULL;
        }
        headers = next;
    }

    return headers;
}

static void configure_curl(CURL* handle, const char* url, MemoryStruct* chunk, const FetchConfig* config, struct curl_slist* headers) {
    curl_easy_setopt(handle, CURLOPT_URL, url);
    curl_easy_setopt(handle, CURLOPT_WRITEFUNCTION, write_memory_callback);
    curl_easy_setopt(handle, CURLOPT_WRITEDATA, (void*)chunk);
    curl_easy_setopt(handle, CURLOPT_USERAGENT, "tqs-maybefetch/1.0");
    curl_easy_setopt(handle, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(handle, CURLOPT_TIMEOUT_MS, config->timeout_ms);
    curl_easy_setopt(handle, CURLOPT_CONNECTTIMEOUT_MS, config->timeout_ms);
    if (headers) curl_easy_setopt(handle, CURLOPT_HTTPHEADER, headers);
}

static int is_success(CURL* handle, CURLcode res) {
    if (res != CURLE_OK) return 0;

    long response_code;
    curl_easy_getinfo(handle, CURLINFO_RESPONSE_CODE, &response_code);
    return response_code >= 200 && response_code < 300;
}

static MemoryStruct* try_fetch(CURL* handle, const char* url, const FetchConfig* config) {
    MemoryStruct* chunk = malloc(sizeof(MemoryStruct));
    if (!chunk) return NULL;

    chunk->memory = malloc(1);
    chunk->size = 0;

    if (!chunk->memory) {
        free(chunk);
        return NULL;
    }

    struct curl_slist* headers = build_headers(config);
    configure_curl(handle, url, chunk, config, headers);
    const CURLcode res = curl_easy_perform(handle);
    if (headers) curl_slist_free_all(headers);

    if (is_success(handle, res)) return chunk;

    free(chunk->memory);
    free(chunk);
    return NULL;
}

FetchResponse* maybefetch(const char* url, const FetchConfig* config) {
    if (!url || !config) return NULL;

    CURL* handle = curl_easy_init();
    if (!handle) return NULL;

    for (int attempt = 0; attempt < config->max_retries; attempt++) {
        MemoryStruct* result = try_fetch(handle, url, config);

        if (result) {
            FetchResponse* response = malloc(sizeof(FetchResponse));
            if (!response) {
                free(result->memory);
                free(result);
                curl_easy_cleanup(handle);
                return NULL;
            }
            response->data = result->memory;
            response->size = result->size;
            free(result);
            curl_easy_cleanup(handle);
            return response;
        }

        const int is_last_attempt = attempt >= config->max_retries - 1;
        if (!is_last_attempt) sleep_ms(calculate_delay(attempt, config));
    }

    curl_easy_cleanup(handle);
    return NULL;
}

void free_fetch_response(FetchResponse* response) {
    if (!response) return;
    free(response->data);
    free(response);
}
