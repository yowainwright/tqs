{
  "targets": [
    {
      "target_name": "tqs_native",
      "sources": [
        "native/src/binding.cc",
        "native/src/maybefetch.c"
      ],
      "include_dirs": [
        "native/include",
        "<!@(node -p \"require('node-addon-api').include\")"
      ],
      "libraries": [
        "-lcurl"
      ],
      "defines": [
        "NAPI_DISABLE_CPP_EXCEPTIONS"
      ],
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": {
        "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7"
      },
      "msvs_settings": {
        "VCCLCompilerTool": { "ExceptionHandling": 1 }
      }
    }
  ]
}