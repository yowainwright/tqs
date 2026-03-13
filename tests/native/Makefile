CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -g
LDFLAGS = -lcurl

SRCDIR = ../../native/src
INCDIR = ../../native/include
TESTDIR = .

SOURCES = $(SRCDIR)/maybefetch.c $(TESTDIR)/maybefetch.c
TARGET = test_maybefetch

.PHONY: all test clean

all: $(TARGET)

$(TARGET): $(SOURCES)
	$(CC) $(CFLAGS) -I$(INCDIR) -o $@ $^ $(LDFLAGS)

test: $(TARGET)
	./$(TARGET)

clean:
	rm -f $(TARGET)

.DEFAULT_GOAL := test