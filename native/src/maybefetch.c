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

static size_t WriteMemoryCallback(void* contents, size_t size, size_t nmemb, void* userp) {
    const size_t realsize = size * nmemb;
    MemoryStruct* mem = (MemoryStruct*)userp;

    char* ptr = realloc(mem->memory, mem->size + realsize + 1);
    if (!ptr) {
        return 0;
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = 0;

    return realsize;
}

static int sleep_ms(int milliseconds) {
    return usleep(milliseconds * 1000);
}

static int calculate_delay(int attempt, const FetchConfig* config) {
    const double delay = config->initial_delay_ms * pow(config->backoff_factor, attempt);
    const int delay_ms = (int)delay;
    return delay_ms > config->max_delay_ms ? config->max_delay_ms : delay_ms;
}

FetchResponse* maybefetch(const char* url, const FetchConfig* config) {
    if (!url || !config) {
        return NULL;
    }

    CURL* curl_handle = curl_easy_init();
    if (!curl_handle) {
        return NULL;
    }

    FetchResponse* response = malloc(sizeof(FetchResponse));
    if (!response) {
        curl_easy_cleanup(curl_handle);
        return NULL;
    }

    response->data = NULL;
    response->size = 0;

    for (int attempt = 0; attempt < config->max_retries; attempt++) {
        MemoryStruct chunk;
        chunk.memory = malloc(1);
        chunk.size = 0;

        if (!chunk.memory) {
            free(response);
            curl_easy_cleanup(curl_handle);
            return NULL;
        }

        curl_easy_setopt(curl_handle, CURLOPT_URL, url);
        curl_easy_setopt(curl_handle, CURLOPT_WRITEFUNCTION, WriteMemoryCallback);
        curl_easy_setopt(curl_handle, CURLOPT_WRITEDATA, (void*)&chunk);
        curl_easy_setopt(curl_handle, CURLOPT_USERAGENT, "tqs-maybefetch/1.0");
        curl_easy_setopt(curl_handle, CURLOPT_FOLLOWLOCATION, 1L);
        curl_easy_setopt(curl_handle, CURLOPT_TIMEOUT_MS, config->timeout_ms);
        curl_easy_setopt(curl_handle, CURLOPT_CONNECTTIMEOUT_MS, config->timeout_ms);

        const CURLcode res = curl_easy_perform(curl_handle);

        if (res == CURLE_OK) {
            long response_code;
            curl_easy_getinfo(curl_handle, CURLINFO_RESPONSE_CODE, &response_code);

            if (response_code >= 200 && response_code < 300) {
                response->data = chunk.memory;
                response->size = chunk.size;
                curl_easy_cleanup(curl_handle);
                return response;
            }
        }

        free(chunk.memory);

        if (attempt < config->max_retries - 1) {
            const int delay_ms = calculate_delay(attempt, config);
            sleep_ms(delay_ms);
        }
    }

    curl_easy_cleanup(curl_handle);
    free(response);
    return NULL;
}

void free_fetch_response(FetchResponse* response) {
    if (response) {
        if (response->data) {
            free(response->data);
        }
        free(response);
    }
}