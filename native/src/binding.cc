#include <node_api.h>
#include "../include/maybefetch.h"
#include <string>

napi_value CreateFetchConfig(napi_env env, napi_callback_info info) {
    size_t argc = 5;
    napi_value args[5];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    int32_t max_retries, initial_delay_ms, max_delay_ms, timeout_ms;
    double backoff_factor;

    napi_get_value_int32(env, args[0], &max_retries);
    napi_get_value_int32(env, args[1], &initial_delay_ms);
    napi_get_value_int32(env, args[2], &max_delay_ms);
    napi_get_value_double(env, args[3], &backoff_factor);
    napi_get_value_int32(env, args[4], &timeout_ms);

    FetchConfig* config = new FetchConfig{
        max_retries,
        initial_delay_ms,
        max_delay_ms,
        backoff_factor,
        timeout_ms
    };

    napi_value result;
    napi_create_external(env, config, [](napi_env env, void* finalize_data, void* finalize_hint) {
        delete static_cast<FetchConfig*>(finalize_data);
    }, nullptr, &result);

    return result;
}

napi_value MaybeFetch(napi_env env, napi_callback_info info) {
    size_t argc = 2;
    napi_value args[2];
    napi_get_cb_info(env, info, &argc, args, nullptr, nullptr);

    size_t url_length;
    napi_get_value_string_utf8(env, args[0], nullptr, 0, &url_length);

    char* url = new char[url_length + 1];
    napi_get_value_string_utf8(env, args[0], url, url_length + 1, &url_length);

    FetchConfig* config;
    napi_get_value_external(env, args[1], reinterpret_cast<void**>(&config));

    FetchResponse* response = maybefetch(url, config);
    delete[] url;

    if (!response) {
        napi_value result;
        napi_get_null(env, &result);
        return result;
    }

    napi_value result;
    napi_create_string_utf8(env, response->data, response->size, &result);

    free_fetch_response(response);
    return result;
}

napi_value Init(napi_env env, napi_value exports) {
    napi_value create_config_fn, maybe_fetch_fn;

    napi_create_function(env, "createFetchConfig", NAPI_AUTO_LENGTH, CreateFetchConfig, nullptr, &create_config_fn);
    napi_create_function(env, "maybeFetch", NAPI_AUTO_LENGTH, MaybeFetch, nullptr, &maybe_fetch_fn);

    napi_set_named_property(env, exports, "createFetchConfig", create_config_fn);
    napi_set_named_property(env, exports, "maybeFetch", maybe_fetch_fn);

    return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, Init)