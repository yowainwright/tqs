#include "quickjs.h"
#include "../include/maybefetch.h"
#include <stdlib.h>

static void free_headers(JSContext *ctx, const char** headers, size_t header_count) {
    if (!headers) return;
    for (size_t i = 0; i < header_count; i++) {
        if (headers[i]) JS_FreeCString(ctx, headers[i]);
    }
    free(headers);
}

static int read_headers(JSContext *ctx, JSValueConst value, const char*** headers, size_t* header_count) {
    int64_t length;

    *headers = NULL;
    *header_count = 0;

    if (JS_IsUndefined(value) || JS_IsNull(value)) return 0;

    if (!JS_IsArray(value)) {
        JS_ThrowTypeError(ctx, "maybefetch headers must be an array");
        return -1;
    }

    if (JS_GetLength(ctx, value, &length)) return -1;
    if (length <= 0) return 0;

    const char** result = calloc((size_t)length, sizeof(char*));
    if (!result) {
        JS_ThrowOutOfMemory(ctx);
        return -1;
    }

    for (int64_t i = 0; i < length; i++) {
        JSValue item = JS_GetPropertyUint32(ctx, value, (uint32_t)i);
        if (JS_IsException(item)) {
            free_headers(ctx, result, (size_t)i);
            return -1;
        }

        result[i] = JS_ToCString(ctx, item);
        JS_FreeValue(ctx, item);
        if (!result[i]) {
            free_headers(ctx, result, (size_t)i);
            return -1;
        }
    }

    *headers = result;
    *header_count = (size_t)length;
    return 0;
}

static JSValue js_maybefetch(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv) {
    (void)this_val;
    const char* url;
    const char** headers = NULL;
    size_t header_count = 0;
    int32_t max_retries, initial_delay_ms, max_delay_ms, timeout_ms;
    double backoff_factor;

    if (argc != 6 && argc != 7) {
        return JS_ThrowTypeError(ctx, "maybefetch requires 6 or 7 arguments: url, maxRetries, initialDelayMs, maxDelayMs, backoffFactor, timeoutMs, headers");
    }

    url = JS_ToCString(ctx, argv[0]);
    if (!url) {
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &max_retries, argv[1])) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &initial_delay_ms, argv[2])) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &max_delay_ms, argv[3])) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    if (JS_ToFloat64(ctx, &backoff_factor, argv[4])) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    if (JS_ToInt32(ctx, &timeout_ms, argv[5])) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    if (read_headers(ctx, argc == 7 ? argv[6] : JS_UNDEFINED, &headers, &header_count)) {
        JS_FreeCString(ctx, url);
        return JS_EXCEPTION;
    }

    FetchConfig config = {
        .max_retries = max_retries,
        .initial_delay_ms = initial_delay_ms,
        .max_delay_ms = max_delay_ms,
        .backoff_factor = backoff_factor,
        .timeout_ms = timeout_ms,
        .headers = headers,
        .header_count = header_count
    };

    FetchResponse* response = maybefetch(url, &config);
    free_headers(ctx, headers, header_count);
    JS_FreeCString(ctx, url);

    if (!response) {
        return JS_NULL;
    }

    JSValue result = JS_NewString(ctx, response->data);
    free_fetch_response(response);
    return result;
}

void js_std_add_maybefetch(JSContext *ctx) {
    JSValue global_obj = JS_GetGlobalObject(ctx);
    JS_SetPropertyStr(ctx, global_obj, "maybefetch", JS_NewCFunction(ctx, js_maybefetch, "maybefetch", 7));
    JS_FreeValue(ctx, global_obj);
}
