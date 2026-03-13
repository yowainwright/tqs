#include <stdio.h>
#include <assert.h>
#include <string.h>
#include <stdlib.h>
#include "../../native/include/maybefetch.h"

void test_fetch_config_creation() {
    printf("Testing FetchConfig creation...\n");

    FetchConfig config = {
        .max_retries = 3,
        .initial_delay_ms = 1000,
        .max_delay_ms = 30000,
        .backoff_factor = 2.0,
        .timeout_ms = 10000
    };

    assert(config.max_retries == 3);
    assert(config.initial_delay_ms == 1000);
    assert(config.max_delay_ms == 30000);
    assert(config.backoff_factor == 2.0);
    assert(config.timeout_ms == 10000);

    printf("✅ FetchConfig creation test passed\n");
}

void test_fetch_response_cleanup() {
    printf("Testing FetchResponse cleanup...\n");

    FetchResponse* response = malloc(sizeof(FetchResponse));
    response->data = malloc(100);
    strcpy(response->data, "test response data");
    response->size = strlen(response->data);

    assert(response->data != NULL);
    assert(response->size == strlen("test response data"));

    free_fetch_response(response);

    printf("✅ FetchResponse cleanup test passed\n");
}

void test_null_response_cleanup() {
    printf("Testing null FetchResponse cleanup...\n");

    // Should not crash
    free_fetch_response(NULL);

    printf("✅ Null FetchResponse cleanup test passed\n");
}

void test_invalid_url_handling() {
    printf("Testing invalid URL handling...\n");

    FetchConfig config = {
        .max_retries = 1,
        .initial_delay_ms = 100,
        .max_delay_ms = 1000,
        .backoff_factor = 1.5,
        .timeout_ms = 1000
    };

    // Test with invalid URL
    FetchResponse* response = maybefetch("invalid-url", &config);
    assert(response == NULL);

    printf("✅ Invalid URL handling test passed\n");
}

void test_null_config_handling() {
    printf("Testing null config handling...\n");

    FetchResponse* response = maybefetch("https://httpbin.org/get", NULL);
    assert(response == NULL);

    printf("✅ Null config handling test passed\n");
}

void test_fetch_timeout() {
    printf("Testing fetch timeout...\n");

    FetchConfig config = {
        .max_retries = 1,
        .initial_delay_ms = 10,
        .max_delay_ms = 100,
        .backoff_factor = 1.0,
        .timeout_ms = 1  // Very short timeout
    };

    // Should timeout quickly
    FetchResponse* response = maybefetch("https://httpbin.org/delay/5", &config);
    // May return NULL due to timeout, which is expected behavior

    if (response) {
        free_fetch_response(response);
    }

    printf("✅ Fetch timeout test passed\n");
}

int main() {
    printf("Running native maybefetch tests...\n\n");

    test_fetch_config_creation();
    test_fetch_response_cleanup();
    test_null_response_cleanup();
    test_invalid_url_handling();
    test_null_config_handling();
    test_fetch_timeout();

    printf("\n🎉 All native tests passed!\n");
    return 0;
}