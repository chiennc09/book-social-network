import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';
import { COLORS } from '../../constants/theme';
import { bookApi } from '../../api/bookApi';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

const ReaderScreen = ({ route, navigation }: any) => {
  const { bookId, url, lastPosition } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const webViewRef = useRef<WebView>(null);
  
  // Thay đổi: Nhận token từ Redux
  const { token } = useSelector((state: RootState) => state.auth);
  
  const [errorText, setErrorText] = useState<string>('');
  
  // Biến cờ lưu vị trí mới nhất
  const currentPosition = useRef<string | undefined>(lastPosition);

  // Xử lý URL (Thêm prefix nếu chỉ là tên file)
  let loadUrl = url || '';
  if (loadUrl && !loadUrl.startsWith('http')) {
     loadUrl = `http://10.0.2.2:8085/books/files/epubs/${loadUrl}`;
  }
  
  // Quan trọng: Mã hoá URI để xử lý các khoảng trắng (spaces) trong tên file
  loadUrl = encodeURI(loadUrl);

  const isPdf = loadUrl?.toLowerCase().endsWith('.pdf');

  // HTML inject epubjs với logic fetch thủ công để kèm Header Auth
  const epubViewerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.5/jszip.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js"></script>
        <style>
            body { margin: 0; padding: 0; display: flex; text-align: center; background-color: #f5f5f5; color: #333; }
            #viewer { width: 100vw; height: 100vh; overflow: hidden; }
        </style>
    </head>
    <body>
        <div id="viewer"></div>
        <script>
            try {
                var fileUrl = "${loadUrl}";
                var accessToken = "${token || ''}";
                
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: "Fetching " + fileUrl }));

                var headers = {};
                if (accessToken) {
                    headers["Authorization"] = "Bearer " + accessToken;
                }

                fetch(fileUrl, { headers: headers })
                .then(function(response) {
                    if (!response.ok) {
                        throw new Error("HTTP Status " + response.status + " " + response.statusText);
                    }
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: "Fetch OK, reading ArrayBuffer..." }));
                    return response.arrayBuffer();
                })
                .then(function(buffer) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'debug', message: "Buffer loaded, parsing EPUB..." }));
                    
                    var book = ePub();
                    book.open(buffer).then(function() {
                        var rendition = book.renderTo("viewer", { 
                            width: "100%", height: "100%", spread: "none" 
                        });
                        
                        var startPosition = "${lastPosition}" !== "undefined" && "${lastPosition}" !== "null" ? "${lastPosition}" : undefined;
                        rendition.display(startPosition);

                        rendition.on("relocated", function(location) {
                            var percent = book.locations.percentageFromCfi(location.start.cfi);
                            var percentNum = percent ? Math.round(percent * 100) : 0;
                            
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'relocated',
                                position: location.start.cfi,
                                percent: percentNum
                            }));
                        });

                        book.ready.then(function() {
                            return book.locations.generate(1600);
                        }).then(function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
                        }).catch(function(err) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "Locations error: " + err.toString() }));
                        });

                        // Swipe handler
                        var xDown = null;
                        document.addEventListener('touchstart', function(evt) { xDown = evt.touches[0].clientX; }, false);
                        document.addEventListener('touchend', function(evt) {
                            if (!xDown) return;
                            var xUp = evt.changedTouches[0].clientX;
                            var xDiff = xDown - xUp;
                            if (xDiff > 50) rendition.next(); 
                            else if (xDiff < -50) rendition.prev(); 
                            else {
                                 if (xUp < window.innerWidth * 0.3) rendition.prev();
                                 else if (xUp > window.innerWidth * 0.7) rendition.next();
                            }
                            xDown = null;
                        }, false);
                    }).catch(function(err) {
                        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "Book open error: " + err.toString() }));
                    });
                })
                .catch(function(err) {
                    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "Network/Fetch error: " + err.toString() }));
                });
            } catch (e) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', error: "Init error: " + e.toString() }));
            }
        </script>
    </body>
    </html>
  `;

  // Xử lý message gửi từ WebView (epubjs)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        setLoading(false);
      } else if (data.type === 'relocated') {
        setLoading(false); // Dòng này dự phòng trường hợp 'ready' không được gọi
        currentPosition.current = data.position;
        setProgressPercent(data.percent);
      } else if (data.type === 'error') {
        console.warn('WebView EPUB Error:', data.error);
        setErrorText(data.error);
        setLoading(false); 
      } else if (data.type === 'debug') {
        console.log('EPUB Debug:', data.message);
      }
    } catch(e) {}
  };

  // Nút Back - lưu tiến trình trước khi thoát
  const handleBack = async () => {
    if (currentPosition.current && bookId) {
       try {
           // Gửi tiến trình mới nhất lên server
           await bookApi.updateProgress(bookId, currentPosition.current, progressPercent);
       } catch (error) {
           console.error("Lỗi khi lưu tiến trình", error);
       }
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
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{progressPercent}%</Text>
        </View>
      </View>

      {/* Loading */}
      {loading && !errorText && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{color: 'white', marginTop: 10}}>Đang tải nội dung sách...</Text>
        </View>
      )}

      {/* Error View */}
      {errorText ? (
         <View style={[styles.loadingOverlay, { backgroundColor: '#ffebe6', padding: 20 }]}>
             <Icon name="alert-triangle" size={40} color="red" style={{marginBottom: 10}} />
             <Text style={{color: 'red', fontWeight: 'bold', fontSize: 16, textAlign: 'center'}}>
                 Không thể tải sách
             </Text>
             <Text style={{color: '#333', textAlign: 'center', marginTop: 10}}>
                 Chi tiết lỗi: {errorText}
             </Text>
             <Text style={{color: '#666', fontSize: 10, textAlign: 'center', marginTop: 10}}>
                 URL: {loadUrl}
             </Text>
         </View>
      ) : null}

      {/* Viewer */}
      {isPdf ? (
         <WebView
           source={{ uri: `https://docs.google.com/viewer?url=${encodeURIComponent(loadUrl)}&embedded=true` }}
           style={styles.webview}
           onLoadEnd={() => setLoading(false)}
           onError={(e) => {
              console.warn("PDF Webview load error", e.nativeEvent);
              setLoading(false);
           }}
           startInLoadingState={true}
           renderLoading={() => <View />} // Đã custom loading ở trên
         />
      ) : (
         <WebView
           ref={webViewRef}
           originWhitelist={['*', 'http://*', 'https://*', 'file://*']}
           source={{ html: epubViewerHtml, baseUrl: 'http://10.0.2.2:8085' }} // Cần baseUrl để CORS
           style={styles.webview}
           onMessage={handleMessage}
           javaScriptEnabled={true}
           domStorageEnabled={true}
           allowFileAccess={true}
           allowUniversalAccessFromFileURLs={true}
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
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  backBtn: {
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 20
  },
  progressBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15
  },
  progressText: { color: 'white', fontWeight: 'bold' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center', alignItems: 'center', zIndex: 5
  }
});

export default ReaderScreen;

