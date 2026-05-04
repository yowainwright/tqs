#!/bin/bash
set -e

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/common.sh"

quickjs_repo_url() {
  printf '%s\n' "${1:-https://github.com/quickjs-ng/quickjs.git}"
}

quickjs_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/quickjs-ng"
}

build_dir() {
  local qjs_dir="${1:-$(quickjs_dir)}"
  printf '%s\n' "$qjs_dir/build"
}

native_include_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/native/include"
}

native_src_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/native/src"
}

bin_dir() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  printf '%s\n' "$root_dir/bin"
}

ensure_quickjs_repo() {
  local qjs_dir="${1:-$(quickjs_dir)}"
  local repo_url="${2:-$(quickjs_repo_url)}"
  if [ ! -d "$qjs_dir" ]; then
    echo "Cloning QuickJS-NG..."
    git clone --depth=1 "$repo_url" "$qjs_dir"
  fi
}

reset_build_dir() {
  local bd="${1:-$(build_dir)}"
  rm -rf "$bd"
  mkdir -p "$bd"
}

require_native_file() {
  local file_path="${1:?file_path is required}"
  [ -f "$file_path" ] || {
    echo "Error: required source file not found: $file_path" >&2
    return 1
  }
}

copy_maybefetch_header() {
  local include_dir="${1:-$(native_include_dir)}"
  local dest_dir="${2:-$(quickjs_dir)}"
  require_native_file "$include_dir/maybefetch.h"
  cp "$include_dir/maybefetch.h" "$dest_dir/"
}

rewrite_include() {
  local src="${1:?src is required}"
  local dest="${2:?dest is required}"
  require_native_file "$src"
  sed 's|"../include/maybefetch.h"|"maybefetch.h"|' "$src" > "$dest"
}

copy_maybefetch_sources() {
  local native_src="${1:-$(native_src_dir)}"
  local qjs_dir="${2:-$(quickjs_dir)}"
  local include_dir="${3:-$(native_include_dir)}"
  copy_maybefetch_header "$include_dir" "$qjs_dir"
  rewrite_include "$native_src/maybefetch.c" "$qjs_dir/maybefetch.c"
  rewrite_include "$native_src/quickjs_maybefetch.c" "$qjs_dir/quickjs_maybefetch.c"
}

write_tqs_main() {
  local dest_dir="${1:-$(quickjs_dir)}"
  cat > "$dest_dir/tqs_main.c" << 'EOF'
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
    if (!rt) { fprintf(stderr, "tqs: cannot allocate JS runtime\n"); return 2; }
    js_std_init_handlers(rt);

    ctx = JS_NewContext(rt);
    if (!ctx) { fprintf(stderr, "tqs: cannot allocate JS context\n"); return 2; }

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
        js_std_free_handlers(rt); JS_FreeContext(ctx); JS_FreeRuntime(rt);
        return 1;
    }
    int is_module = JS_DetectModule((const char *)peek_buf, peek_len);
    js_free(ctx, peek_buf);

    if (eval_file(ctx, filename, is_module)) {
        js_std_dump_error(ctx);
        js_std_free_handlers(rt); JS_FreeContext(ctx); JS_FreeRuntime(rt);
        return 1;
    }

    r = js_std_loop(ctx);
    if (r) js_std_dump_error(ctx);
    js_std_free_handlers(rt); JS_FreeContext(ctx); JS_FreeRuntime(rt);
    return r ? 1 : 0;
}
EOF
}

patch_cmakelists() {
  local cmake_file="${1:-$(quickjs_dir)/CMakeLists.txt}"
  grep -q "tqs_exe" "$cmake_file" && return 0
  cat >> "$cmake_file" << 'EOF'

# --- tqs: QuickJS with maybefetch ---
find_library(CURL_LIB curl)
find_path(CURL_INCLUDE curl/curl.h)
if(CURL_LIB AND CURL_INCLUDE)
    add_executable(tqs_exe tqs_main.c maybefetch.c quickjs_maybefetch.c)
    target_include_directories(tqs_exe PRIVATE ${CURL_INCLUDE} ${CMAKE_CURRENT_SOURCE_DIR})
    target_compile_definitions(tqs_exe PRIVATE ${qjs_defines} _GNU_SOURCE)
    target_link_libraries(tqs_exe PRIVATE qjs qjs-libc ${CURL_LIB} m)
    set_target_properties(tqs_exe PROPERTIES OUTPUT_NAME "tqs")
else()
    message(WARNING "libcurl not found, skipping tqs build")
endif()
EOF
}

cmake_configure() {
  local bd="${1:-$(build_dir)}"
  local extra_opts="${2:-${EXTRA_CMAKE_OPTS:-}}"
  cmake "$(dirname "$bd")" -DCMAKE_BUILD_TYPE=Release $extra_opts
}

cmake_build() {
  local bd="${1:-$(build_dir)}"
  local jobs="${2:-$(nproc 2>/dev/null || sysctl -n hw.ncpu)}"
  cmake --build "$bd" --target tqs_exe -j"$jobs"
}

copy_binary() {
  local bd="${1:-$(build_dir)}"
  local out_dir="${2:-$(bin_dir)}"
  mkdir -p "$out_dir"
  cp "$bd/tqs" "$out_dir/"
}

main() {
  local root_dir="${1:-$(repo_root "${BASH_SOURCE[0]}")}"
  local qjs_dir
  qjs_dir="$(quickjs_dir "$root_dir")"
  local bd
  bd="$(build_dir "$qjs_dir")"

  echo "Building QuickJS-NG with maybefetch extension..."
  ensure_quickjs_repo "$qjs_dir"
  reset_build_dir "$bd"
  echo "Copying maybefetch sources..."
  copy_maybefetch_sources "$(native_src_dir "$root_dir")" "$qjs_dir" "$(native_include_dir "$root_dir")"
  write_tqs_main "$qjs_dir"
  patch_cmakelists "$qjs_dir/CMakeLists.txt"
  echo "Building with cmake..."
  (cd "$bd" && cmake_configure "$bd" && cmake_build "$bd")
  echo "Copying binary..."
  copy_binary "$bd" "$(bin_dir "$root_dir")"
  echo "QuickJS with maybefetch built successfully!"
  echo "Binary: $(bin_dir "$root_dir")/tqs"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  main "$@"
fi
