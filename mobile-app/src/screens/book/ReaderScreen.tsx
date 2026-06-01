import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../../constants/theme';
import { bookApi } from '../../api/bookApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { EventNames, eventEmitter } from '../../utils/eventEmitter';
import { resolveReaderUrl, API_GATEWAY_URL } from '../../config/env';

const PROGRESS_SYNC_INTERVAL_MS = 30_000; // auto-sync every 30s

const ReaderScreen = ({ route, navigation }: any) => {
  const { bookId, url, lastPosition } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const webViewRef = useRef<WebView>(null);

  const { token } = useSelector((state: RootState) => state.auth);
  const [errorText, setErrorText] = useState<string>('');

  // Refs: always track the LATEST values without causing re-renders
  const currentPosition = useRef<string | undefined>(lastPosition);
  const currentPercent  = useRef<number>(0);
  const locationsReady  = useRef<boolean>(false);   // true once epubjs locations are generated

  // Resolve & encode URL
  let loadUrl = resolveReaderUrl(url);
  loadUrl = encodeURI(loadUrl);
  const isPdf = loadUrl?.toLowerCase().endsWith('.pdf');

  // ── EPUB viewer HTML ──────────────────────────────────────────────────────
  // Key changes vs old version:
  //   1. Generate locations FIRST, THEN display(startPosition).
  //      This ensures the "relocated" event fires with correct percent from page 1.
  //   2. Tap left 50% → prev() ; tap right 50% → next()  (no dead center zone)
  //   3. After every page turn, post message with type='progress' so RN can sync.
  //   4. Post 'locationsReady' once generate() finishes so we know percent is valid.
  const epubViewerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"></script>
        <style>
            * { box-sizing: border-box; }
            body { margin: 0; padding: 0; background-color: #f5f5f5; color: #333; }
            #viewer { width: 100vw; height: 100vh; overflow: hidden; }
        </style>
    </head>
    <body>
        <div id="viewer"></div>
        <script>
        (function() {
            var fileUrl      = "${loadUrl}";
            var accessToken  = "${token || ''}";
            var startCfi     = ${lastPosition ? `"${lastPosition}"` : 'null'};

            function log(msg) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: msg }));
            }

            var headers = accessToken ? { "Authorization": "Bearer " + accessToken } : {};

            fetch(fileUrl, { headers: headers })
            .then(function(r) {
                if (!r.ok) throw new Error("HTTP " + r.status);
                return r.arrayBuffer();
            })
            .then(function(buffer) {
                var book = ePub();
                book.open(buffer).then(function() {

                    var rendition = book.renderTo("viewer", {
                        width: "100%", height: "100%", spread: "none"
                    });

                    // ── Step 1: Generate locations first ──────────────────
                    //   Generating before display() ensures that when the
                    //   'relocated' event fires, percentageFromCfi is accurate.
                    log("Generating locations...");
                    book.ready
                    .then(function() { return book.locations.generate(1600); })
                    .then(function() {
                        log("Locations ready, displaying...");
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'locationsReady' }));

                        // ── Step 2: Display at saved position ─────────────
                        rendition.display(startCfi || undefined);
                    })
                    .catch(function(e) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "Locations: " + e }));
                        rendition.display(startCfi || undefined);
                    });

                    // ── Relocated handler ─────────────────────────────────
                    rendition.on("relocated", function(location) {
                        var pct = 0;
                        try {
                            var raw = book.locations.percentageFromCfi(location.start.cfi);
                            pct = raw ? Math.round(raw * 100) : 0;
                        } catch(e) {}

                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'relocated',
                            position: location.start.cfi,
                            percent: pct
                        }));
                    });

                    // ── Touch / Swipe navigation ──────────────────────────
                    //   Swipe: dx > 50 → next, dx < -50 → prev
                    //   Tap:   left 50% → prev, right 50% → next
                    var xDown = null, yDown = null;

                    rendition.on("touchstart", function(ev) {
                        xDown = ev.changedTouches[0].clientX;
                        yDown = ev.changedTouches[0].clientY;
                    });

                    rendition.on("touchend", function(ev) {
                        if (xDown === null) return;
                        var xUp   = ev.changedTouches[0].clientX;
                        var yUp   = ev.changedTouches[0].clientY;
                        var xDiff = xDown - xUp;
                        var yDiff = Math.abs(yDown - yUp);

                        // Ignore mostly-vertical movements (scroll inside iframe)
                        if (yDiff > Math.abs(xDiff) * 1.5) { xDown = null; return; }

                        if (xDiff > 50) {
                            rendition.next();
                        } else if (xDiff < -50) {
                            rendition.prev();
                        } else {
                            // Tap: split screen 50/50 — LEFT = prev, RIGHT = next
                            if (xUp < window.innerWidth * 0.5) rendition.prev();
                            else rendition.next();
                        }
                        xDown = null; yDown = null;
                    });

                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));

                }).catch(function(e) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "open: " + e }));
                });
            })
            .catch(function(e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "fetch: " + e }));
            });
        })();
        </script>
    </body>
    </html>
  `;

  // ── Message handler ───────────────────────────────────────────────────────
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'locationsReady') {
        locationsReady.current = true;
      } else if (data.type === 'ready') {
        setLoading(false);
      } else if (data.type === 'relocated') {
        setLoading(false);
        currentPosition.current = data.position;
        currentPercent.current  = data.percent;
        // Only show non-zero percent once locations are generated
        if (locationsReady.current || data.percent > 0) {
          setProgressPercent(data.percent);
        }
      } else if (data.type === 'error') {
        console.warn('ReaderScreen EPUB error:', data.error);
        setErrorText(data.error);
        setLoading(false);
      } else if (data.type === 'debug') {
        console.log('EPUB:', data.message);
      }
    } catch (_) {}
  }, []);

  // ── Periodic auto-save (every 30s) ───────────────────────────────────────
  useEffect(() => {
    if (!bookId) return;
    const timer = setInterval(async () => {
      if (currentPosition.current && locationsReady.current) {
        try {
          await bookApi.updateProgress(bookId, currentPosition.current, currentPercent.current);
        } catch (_) {}
      }
    }, PROGRESS_SYNC_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [bookId]);

  // ── Back button — save before exit ───────────────────────────────────────
  const handleBack = async () => {
    if (bookId) {
      if (currentPosition.current) {
        try {
          await bookApi.updateProgress(bookId, currentPosition.current, currentPercent.current);
        } catch (e) {
          console.error('Failed to save progress', e);
        }
      }
      eventEmitter.emit(EventNames.BOOK_PROGRESS_UPDATED, {
        bookId,
        progressPercent: currentPercent.current || 0,
      });
    }
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* Header Overlay */}
      <View style={styles.headerOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Icon name="arrow-left" size={24} color="#FFF" />
        </TouchableOpacity>
        {locationsReady.current || progressPercent > 0 ? (
          <View style={styles.progressBadge}>
            <Text style={styles.progressText}>{progressPercent}%</Text>
          </View>
        ) : null}
      </View>

      {/* Loading overlay */}
      {loading && !errorText && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: 'white', marginTop: 10 }}>Đang tải nội dung sách...</Text>
        </View>
      )}

      {/* Error view */}
      {!!errorText && (
        <View style={[styles.loadingOverlay, { backgroundColor: '#ffebe6', padding: 20 }]}>
          <Icon name="alert-triangle" size={40} color="red" style={{ marginBottom: 10 }} />
          <Text style={{ color: 'red', fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
            Không thể tải sách
          </Text>
          <Text style={{ color: '#333', textAlign: 'center', marginTop: 10 }}>
            {errorText}
          </Text>
          <Text style={{ color: '#666', fontSize: 10, textAlign: 'center', marginTop: 10 }}>
            URL: {loadUrl}
          </Text>
        </View>
      )}

      {/* Viewer */}
      {isPdf ? (
        <WebView
          source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(loadUrl)}&embedded=true` }}
          style={styles.webview}
          onLoadEnd={() => setLoading(false)}
          onError={() => setLoading(false)}
          startInLoadingState
          renderLoading={() => <View />}
        />
      ) : (
        <WebView
          ref={webViewRef}
          originWhitelist={['*', 'http://*', 'https://*', 'file://*']}
          source={{ html: epubViewerHtml, baseUrl: API_GATEWAY_URL }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          allowFileAccess
          allowUniversalAccessFromFileURLs
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  webview: { flex: 1, backgroundColor: 'transparent' },
  headerOverlay: {
    position: 'absolute', top: 30, left: 10, right: 10, zIndex: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  backBtn: { backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20 },
  progressBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15,
  },
  progressText: { color: 'white', fontWeight: 'bold' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', zIndex: 5,
  },
});

export default ReaderScreen;
