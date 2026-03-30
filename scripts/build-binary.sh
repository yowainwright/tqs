#!/bin/bash
set -e

QUICKJS_DIR="quickjs-ng"
QUICKJS_REPO="https://github.com/quickjs-ng/quickjs.git"
BUILD_DIR="$QUICKJS_DIR/build"
ROOT_DIR="$(pwd)"

echo "Building QuickJS-NG with maybefetch extension..."

if [ ! -d "$QUICKJS_DIR" ]; then
    echo "Cloning QuickJS-NG..."
    git clone --depth=1 "$QUICKJS_REPO" "$QUICKJS_DIR"
fi

rm -rf "$BUILD_DIR"

echo "Copying maybefetch sources..."
cp native/include/maybefetch.h "$QUICKJS_DIR/"

sed 's|"../include/maybefetch.h"|"maybefetch.h"|' native/src/maybefetch.c > "$QUICKJS_DIR/maybefetch.c"
sed 's|"../include/maybefetch.h"|"maybefetch.h"|' native/src/quickjs_maybefetch.c > "$QUICKJS_DIR/quickjs_maybefetch.c"

cat > "$QUICKJS_DIR/tqs_main.c" << 'MAINEOF'
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "cutils.h"
#include "quickjs.h"
#include "quickjs-libc.h"
#include "maybefetch.h"

extern void js_std_add_maybefetch(JSContext *ctx);

static int eval_file(JSContext *ctx, const char *filename, int is_module)
{
    size_t buf_len;
    uint8_t *buf = js_load_file(ctx, &buf_len, filename);
    if (!buf) {
        fprintf(stderr, "tqs: could not load '%s'\n", filename);
        return -1;
    }

    int flags = is_module ? JS_EVAL_TYPE_MODULE : JS_EVAL_TYPE_GLOBAL;
    JSValue val = JS_Eval(ctx, (char *)buf, buf_len, filename, flags);
    js_free(ctx, buf);

    if (JS_IsException(val)) {
        JS_FreeValue(ctx, val);
        return -1;
    }
    JS_FreeValue(ctx, val);
    return 0;
}

int main(int argc, char **argv)
{
    JSRuntime *rt;
    JSContext *ctx;
    int r;

    if (argc < 2) {
        fprintf(stderr, "Usage: tqs <script.js>\n");
        return 1;
    }

    rt = JS_NewRuntime();
    if (!rt) {
        fprintf(stderr, "tqs: cannot allocate JS runtime\n");
        return 2;
    }

    js_std_init_handlers(rt);

    ctx = JS_NewContext(rt);
    if (!ctx) {
        fprintf(stderr, "tqs: cannot allocate JS context\n");
        return 2;
    }

    js_init_module_std(ctx, "qjs:std");
    js_init_module_os(ctx, "qjs:os");
    js_init_module_std(ctx, "std");
    js_init_module_os(ctx, "os");

    JS_SetModuleLoaderFunc2(rt, NULL, js_module_loader, js_module_check_attributes, NULL);
    JS_SetHostPromiseRejectionTracker(rt, js_std_promise_rejection_tracker, NULL);

    js_std_add_helpers(ctx, argc - 1, argv + 1);
    js_std_add_maybefetch(ctx);

    const char *filename = argv[1];

    size_t peek_len;
    uint8_t *peek_buf = js_load_file(ctx, &peek_len, filename);
    if (!peek_buf) {
        fprintf(stderr, "tqs: could not load '%s'\n", filename);
        js_std_free_handlers(rt);
        JS_FreeContext(ctx);
        JS_FreeRuntime(rt);
        return 1;
    }
    int is_module = JS_DetectModule((const char *)peek_buf, peek_len);
    js_free(ctx, peek_buf);

    if (eval_file(ctx, filename, is_module)) {
        js_std_dump_error(ctx);
        js_std_free_handlers(rt);
        JS_FreeContext(ctx);
        JS_FreeRuntime(rt);
        return 1;
    }

    r = js_std_loop(ctx);
    if (r) {
        js_std_dump_error(ctx);
    }

    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return r ? 1 : 0;
}
MAINEOF

if ! grep -q "tqs_exe" "$QUICKJS_DIR/CMakeLists.txt"; then
cat >> "$QUICKJS_DIR/CMakeLists.txt" << 'CMAKEEOF'

# --- tqs: QuickJS with maybefetch ---
find_library(CURL_LIB curl)
find_path(CURL_INCLUDE curl/curl.h)
if(CURL_LIB AND CURL_INCLUDE)
    add_executable(tqs_exe
        tqs_main.c
        maybefetch.c
        quickjs_maybefetch.c
    )
    target_include_directories(tqs_exe PRIVATE ${CURL_INCLUDE} ${CMAKE_CURRENT_SOURCE_DIR})
    target_compile_definitions(tqs_exe PRIVATE ${qjs_defines} _GNU_SOURCE)
    target_link_libraries(tqs_exe PRIVATE qjs qjs-libc ${CURL_LIB} m)
    set_target_properties(tqs_exe PROPERTIES OUTPUT_NAME "tqs")
else()
    message(WARNING "libcurl not found, skipping tqs build")
endif()
CMAKEEOF
fi

echo "Building with cmake..."
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"
cmake .. -DCMAKE_BUILD_TYPE=Release ${EXTRA_CMAKE_OPTS:-}
cmake --build . --target tqs_exe -j$(nproc 2>/dev/null || sysctl -n hw.ncpu)

echo "Copying binary..."
cd "$ROOT_DIR"
mkdir -p bin
cp "$BUILD_DIR/tqs" bin/

echo "QuickJS with maybefetch built successfully!"
echo "Binary: bin/tqs"
