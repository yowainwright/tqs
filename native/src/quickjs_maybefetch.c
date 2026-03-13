#include "quickjs.h"
#include "../include/maybefetch.h"

static JSValue js_maybefetch(JSContext *ctx, JSValueConst this_val,
                             int argc, JSValueConst *argv) {
    const char* url;
    int32_t max_retries, initial_delay_ms, max_delay_ms, timeout_ms;
    double backoff_factor;

    if (argc != 6) {
        return JS_ThrowTypeError(ctx, "maybefetch requires 6 arguments: url, maxRetries, initialDelayMs, maxDelayMs, backoffFactor, timeoutMs");
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

    FetchConfig config = {
        .max_retries = max_retries,
        .initial_delay_ms = initial_delay_ms,
        .max_delay_ms = max_delay_ms,
        .backoff_factor = backoff_factor,
        .timeout_ms = timeout_ms
    };

    FetchResponse* response = maybefetch(url, &config);
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
    JS_SetPropertyStr(ctx, global_obj, "maybefetch", JS_NewCFunction(ctx, js_maybefetch, "maybefetch", 6));
    JS_FreeValue(ctx, global_obj);
}