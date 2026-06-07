package dev.madsens.friskr;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

@CapacitorPlugin(name = "ExpiryTextRecognizer")
public class ExpiryTextRecognizerPlugin extends Plugin {
    private TextRecognizer recognizer;

    @Override
    public void load() {
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    @Override
    protected void handleOnDestroy() {
        if (recognizer != null) {
            recognizer.close();
        }
    }

    @PluginMethod
    public void recognize(PluginCall call) {
        String encoded = call.getString("base64");
        if (encoded == null || encoded.isEmpty()) {
            call.reject("Missing image data");
            return;
        }

        try {
            int comma = encoded.indexOf(',');
            if (comma >= 0) {
                encoded = encoded.substring(comma + 1);
            }
            byte[] bytes = Base64.decode(encoded, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
            if (bitmap == null) {
                call.reject("Could not decode image");
                return;
            }

            Bitmap scanBitmap = cropToDateReticle(bitmap);
            recognizer.process(InputImage.fromBitmap(scanBitmap, 0))
                .addOnSuccessListener(result -> {
                    JSObject response = new JSObject();
                    response.put("text", result.getText());
                    call.resolve(response);
                    if (scanBitmap != bitmap) {
                        scanBitmap.recycle();
                    }
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    if (scanBitmap != bitmap) {
                        scanBitmap.recycle();
                    }
                    bitmap.recycle();
                    call.reject("Text recognition failed", error);
                });
        } catch (Exception error) {
            call.reject("Could not process image", error);
        }
    }

    private Bitmap cropToDateReticle(Bitmap bitmap) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        if (width <= 0 || height <= 0) {
            return bitmap;
        }

        int cropWidth = Math.max(1, Math.round(width * 0.72f));
        int cropHeight = Math.max(1, Math.round(height * 0.36f));
        int x = Math.max(0, (width - cropWidth) / 2);
        int centerY = Math.round(height * 0.38f);
        int y = Math.max(0, Math.min(height - cropHeight, centerY - (cropHeight / 2)));

        try {
            return Bitmap.createBitmap(
                bitmap,
                x,
                y,
                Math.min(cropWidth, width - x),
                Math.min(cropHeight, height - y)
            );
        } catch (Exception ignored) {
            return bitmap;
        }
    }
}
