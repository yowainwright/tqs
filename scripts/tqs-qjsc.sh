#!/usr/bin/env bash
set -euo pipefail

cleanup_tmp_dir=""

cleanup() {
  if [ -n "${cleanup_tmp_dir:-}" ]; then
    rm -rf "$cleanup_tmp_dir"
  fi
}

usage() {
  cat <<'USAGE'
Usage: tqs-qjsc -o <output> <input.js>

Build a standalone QuickJS executable with the tqs maybefetch extension.
USAGE
}

script_dir() {
  cd "$(dirname "${BASH_SOURCE[0]}")" && pwd
}

root_dir() {
  cd "$(script_dir)/.." && pwd
}

quickjs_dir() {
  local root="${1:?root is required}"

  if [ -d "$root/deps/quickjs-ng" ]; then
    printf '%s\n' "$root/deps/quickjs-ng"
    return
  fi

  if [ -d "$root/quickjs-ng" ]; then
    printf '%s\n' "$root/quickjs-ng"
    return
  fi

  echo "tqs-qjsc: QuickJS-NG sources were not found." >&2
  echo "Expected $root/deps/quickjs-ng or $root/quickjs-ng." >&2
  return 1
}

require_file() {
  local file="${1:?file is required}"
  [ -f "$file" ] || {
    echo "tqs-qjsc: required file not found: $file" >&2
    return 1
  }
}

require_sources() {
  local root="${1:?root is required}"
  local qjs="${2:?qjs is required}"
  local file=""

  for file in \
    "$qjs/qjsc.c" \
    "$qjs/quickjs.c" \
    "$qjs/quickjs-libc.c" \
    "$qjs/libregexp.c" \
    "$qjs/libunicode.c" \
    "$qjs/dtoa.c" \
    "$root/native/include/maybefetch.h" \
    "$root/native/src/maybefetch.c" \
    "$root/native/src/quickjs_maybefetch.c"; do
    require_file "$file"
  done
}

cache_root() {
  if [ -n "${TQS_CACHE_DIR:-}" ]; then
    printf '%s\n' "$TQS_CACHE_DIR"
    return
  fi

  if [ -n "${XDG_CACHE_HOME:-}" ]; then
    printf '%s\n' "$XDG_CACHE_HOME/tqs"
    return
  fi

  if [ -n "${HOME:-}" ]; then
    printf '%s\n' "$HOME/.cache/tqs"
    return
  fi

  printf '%s\n' "${TMPDIR:-/tmp}/tqs-cache"
}

quickjs_identity() {
  local qjs="${1:?qjs is required}"

  if [ -f "$qjs/UPSTREAM_COMMIT" ]; then
    tr -d '\n' < "$qjs/UPSTREAM_COMMIT"
    return
  fi

  if git -C "$qjs" rev-parse --short HEAD >/dev/null 2>&1; then
    git -C "$qjs" rev-parse --short HEAD
    return
  fi

  cksum "$qjs/qjsc.c" | awk '{ print $1 }'
}

compiler_id() {
  local cc="${1:?cc is required}"
  local first_line=""

  first_line="$("$cc" --version 2>/dev/null | head -n 1 || true)"
  if [ -z "$first_line" ]; then
    first_line="$cc"
  fi

  printf '%s\n' "$first_line" | cksum | awk '{ print $1 }'
}

qjsc_path() {
  local qjs="${1:?qjs is required}"
  local cc="${2:?cc is required}"
  local system=""
  local machine=""
  local identity=""
  local cc_id=""

  system="$(uname -s)"
  machine="$(uname -m)"
  identity="$(quickjs_identity "$qjs")"
  cc_id="$(compiler_id "$cc")"

  printf '%s/bin/qjsc-%s-%s-%s-%s\n' "$(cache_root)" "$system" "$machine" "$identity" "$cc_id"
}

platform_libs() {
  case "$(uname -s)" in
    Linux)
      printf '%s\n' -lm -ldl -pthread
      ;;
    Darwin)
      printf '%s\n' -lm -pthread
      ;;
    *)
      printf '%s\n' -lm -pthread
      ;;
  esac
}

curl_cflags() {
  if command -v curl-config >/dev/null 2>&1; then
    curl-config --cflags
    return
  fi

  if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists libcurl; then
    pkg-config --cflags libcurl
  fi
}

curl_libs() {
  if command -v curl-config >/dev/null 2>&1; then
    curl-config --libs
    return
  fi

  if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists libcurl; then
    pkg-config --libs libcurl
    return
  fi

  printf '%s\n' -lcurl
}

build_qjsc() {
  local qjsc="${1:?qjsc is required}"
  local qjs="${2:?qjs is required}"
  local cc="${3:?cc is required}"
  local tmp_dir=""
  local platform=()
  local lib=""

  if [ -x "$qjsc" ]; then
    return
  fi

  mkdir -p "$(dirname "$qjsc")"
  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tqs-qjsc-build.XXXXXX")"
  while IFS= read -r lib; do
    platform+=("$lib")
  done < <(platform_libs)

  "$cc" \
    -O2 \
    -D_GNU_SOURCE \
    -DQUICKJS_NG_BUILD \
    -I "$qjs" \
    "$qjs/qjsc.c" \
    "$qjs/quickjs.c" \
    "$qjs/quickjs-libc.c" \
    "$qjs/libregexp.c" \
    "$qjs/libunicode.c" \
    "$qjs/dtoa.c" \
    -o "$tmp_dir/qjsc" \
    "${platform[@]}"

  chmod 755 "$tmp_dir/qjsc"
  mv "$tmp_dir/qjsc" "$qjsc"
  rm -rf "$tmp_dir"
}

patch_generated_c() {
  local generated="${1:?generated is required}"
  local patched="${2:?patched is required}"

  awk '
    BEGIN {
      added_decl = 0
      added_init = 0
      in_custom_context = 0
    }
    /^#include "quickjs-libc.h"$/ {
      print
      print "#include \"maybefetch.h\""
      print ""
      print "extern void js_std_add_maybefetch(JSContext *ctx);"
      added_decl = 1
      next
    }
    /^static JSContext \*JS_NewCustomContext\(JSRuntime \*rt\)$/ {
      in_custom_context = 1
      print
      next
    }
    in_custom_context && /^  return ctx;$/ {
      print "  js_std_add_maybefetch(ctx);"
      print
      added_init = 1
      next
    }
    in_custom_context && /^}$/ {
      in_custom_context = 0
    }
    {
      print
    }
    END {
      if (!added_decl) {
        print "tqs-qjsc: generated C is missing quickjs-libc include" > "/dev/stderr"
        exit 1
      }
      if (!added_init) {
        print "tqs-qjsc: generated C is missing JS_NewCustomContext return hook" > "/dev/stderr"
        exit 1
      }
    }
  ' "$generated" > "$patched"
}

parse_args() {
  output_file=""
  input_file=""

  while [ "$#" -gt 0 ]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      -o)
        shift
        output_file="${1:-}"
        ;;
      -o=*)
        output_file="${1#-o=}"
        ;;
      --output=*)
        output_file="${1#--output=}"
        ;;
      --output)
        shift
        output_file="${1:-}"
        ;;
      -*)
        echo "tqs-qjsc: unsupported option: $1" >&2
        usage >&2
        exit 1
        ;;
      *)
        if [ -n "$input_file" ]; then
          echo "tqs-qjsc: only one input file is supported" >&2
          usage >&2
          exit 1
        fi
        input_file="$1"
        ;;
    esac
    shift
  done

  if [ -z "$output_file" ] || [ -z "$input_file" ]; then
    usage >&2
    exit 1
  fi
}

compile_binary() {
  local root="${1:?root is required}"
  local qjs="${2:?qjs is required}"
  local cc="${3:?cc is required}"
  local patched_c="${4:?patched_c is required}"
  local output="${5:?output is required}"
  local cflags=()
  local libs=()
  local platform=()
  local curl_cflags_output=""
  local curl_libs_output=""
  local lib=""

  curl_cflags_output="$(curl_cflags)"
  curl_libs_output="$(curl_libs)"
  if [ -n "$curl_cflags_output" ]; then
    # shellcheck disable=SC2206
    cflags=($curl_cflags_output)
  fi
  if [ -n "$curl_libs_output" ]; then
    # shellcheck disable=SC2206
    libs=($curl_libs_output)
  fi
  while IFS= read -r lib; do
    platform+=("$lib")
  done < <(platform_libs)

  set +u
  mkdir -p "$(dirname "$output")"
  "$cc" \
    -O2 \
    -D_GNU_SOURCE \
    -DQUICKJS_NG_BUILD \
    "${cflags[@]}" \
    -I "$qjs" \
    -I "$root/native/include" \
    "$patched_c" \
    "$qjs/quickjs.c" \
    "$qjs/quickjs-libc.c" \
    "$qjs/libregexp.c" \
    "$qjs/libunicode.c" \
    "$qjs/dtoa.c" \
    "$root/native/src/maybefetch.c" \
    "$root/native/src/quickjs_maybefetch.c" \
    -o "$output" \
    "${libs[@]}" \
    "${platform[@]}"
  set -u
}

main() {
  local root=""
  local qjs=""
  local cc="${CC:-cc}"
  local qjsc=""
  local tmp_dir=""

  parse_args "$@"

  root="$(root_dir)"
  qjs="$(quickjs_dir "$root")"
  require_sources "$root" "$qjs"

  qjsc="$(qjsc_path "$qjs" "$cc")"
  build_qjsc "$qjsc" "$qjs" "$cc"

  tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/tqs-qjsc.XXXXXX")"
  cleanup_tmp_dir="$tmp_dir"
  trap cleanup EXIT

  "$qjsc" -e -o "$tmp_dir/program.c" "$input_file"
  patch_generated_c "$tmp_dir/program.c" "$tmp_dir/program-patched.c"
  compile_binary "$root" "$qjs" "$cc" "$tmp_dir/program-patched.c" "$output_file"
  chmod 755 "$output_file"
}

main "$@"
