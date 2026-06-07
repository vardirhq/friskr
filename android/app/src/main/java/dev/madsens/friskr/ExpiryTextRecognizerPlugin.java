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

            recognizer.process(InputImage.fromBitmap(bitmap, 0))
                .addOnSuccessListener(result -> {
                    JSObject response = new JSObject();
                    response.put("text", result.getText());
                    call.resolve(response);
                    bitmap.recycle();
                })
                .addOnFailureListener(error -> {
                    bitmap.recycle();
                    call.reject("Text recognition failed", error);
                });
        } catch (Exception error) {
            call.reject("Could not process image", error);
        }
    }
}
