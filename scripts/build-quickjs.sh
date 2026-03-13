#!/bin/bash
set -e

QUICKJS_DIR="quickjs-ng"
QUICKJS_REPO="https://github.com/quickjs-ng/quickjs.git"

echo "Building QuickJS-NG with maybefetch extension..."

# Clone QuickJS-NG if not exists
if [ ! -d "$QUICKJS_DIR" ]; then
    echo "Cloning QuickJS-NG..."
    git clone --depth=1 "$QUICKJS_REPO" "$QUICKJS_DIR"
fi

# Copy our C files to QuickJS directory
echo "Adding maybefetch extension..."
cp native/src/maybefetch.c "$QUICKJS_DIR/"
cp native/src/quickjs_maybefetch.c "$QUICKJS_DIR/"
cp native/include/maybefetch.h "$QUICKJS_DIR/"

# Create modified qjs.c that includes maybefetch
cat > "$QUICKJS_DIR/qjs_with_maybefetch.c" << 'EOF'
/*
 * QuickJS command line compiler and interpreter with maybefetch
 */
#include "quickjs-libc.h"
#include "maybefetch.h"

int main(int argc, char **argv)
{
    JSRuntime *rt;
    JSContext *ctx;
    int status = 0;

    rt = JS_NewRuntime();
    if (!rt) {
        fprintf(stderr, "qjs: cannot allocate JS runtime\n");
        exit(1);
    }

    ctx = JS_NewContext(rt);
    if (!ctx) {
        fprintf(stderr, "qjs: cannot allocate JS context\n");
        exit(1);
    }

    /* Add standard modules */
    js_std_add_helpers(ctx, argc, argv);

    /* Add maybefetch global function */
    js_std_add_maybefetch(ctx);

    /* Evaluate files */
    if (argc > 1) {
        status = js_std_eval_file(ctx, argv[1], JS_EVAL_TYPE_GLOBAL);
    } else {
        /* Interactive mode */
        js_std_loop(ctx);
    }

    js_std_free_handlers(rt);
    JS_FreeContext(ctx);
    JS_FreeRuntime(rt);
    return status;
}
EOF

# Update Makefile to include our files and link curl
cd "$QUICKJS_DIR"

# Backup original Makefile
cp Makefile Makefile.bak

# Add our custom target
cat >> Makefile << 'EOF'

# TQS custom build with maybefetch
tqs: $(OBJDIR)/qjs_with_maybefetch.o $(OBJDIR)/maybefetch.o $(OBJDIR)/quickjs_maybefetch.o libquickjs$(LIB_SUFFIX)
	$(CC) $(LDFLAGS) -o $@ $^ $(LIBS) -lcurl

$(OBJDIR)/qjs_with_maybefetch.o: qjs_with_maybefetch.c $(QUICKJS_LIB_OBJ)
	$(CC) $(CFLAGS_OPT) -c -o $@ $<

$(OBJDIR)/maybefetch.o: maybefetch.c
	$(CC) $(CFLAGS_OPT) -c -o $@ $<

$(OBJDIR)/quickjs_maybefetch.o: quickjs_maybefetch.c
	$(CC) $(CFLAGS_OPT) -c -o $@ $<

.PHONY: tqs
EOF

echo "Building QuickJS with maybefetch..."
make tqs

echo "Moving binary to bin directory..."
cd ..
mkdir -p bin
cp "$QUICKJS_DIR/tqs" bin/

echo "QuickJS with maybefetch built successfully!"
echo "Binary available at: bin/tqs"