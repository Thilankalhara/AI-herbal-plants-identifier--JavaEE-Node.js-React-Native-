package controller;

import com.google.gson.*;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

@WebServlet("/GenerateSuggestions")
public class GenerateSuggestions extends HttpServlet {

    private static final String GEMINI_API_KEY = "  "; // your gemini api key
    private static final String GEMINI_MODEL = "gemini-2.0-flash";  
    private static final String GEMINI_ENDPOINT =
            "https://generativelanguage.googleapis.com/v1/models/" + GEMINI_MODEL + ":generateContent";

    private static final boolean USE_PROXY = false;
    private static final String PROXY_HOST = "192.168.43.1";
    private static final int PROXY_PORT = 8080;

    private final Gson gson = new Gson();

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp)
            throws IOException {

        System.out.println("BACKEND: POST /GenerateSuggestions received");

        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");

        try {
            JsonObject input = gson.fromJson(req.getReader(), JsonObject.class);
            JsonArray images = input.getAsJsonArray("images");

            if (images == null || images.size() == 0 || images.size() > 2) {
                System.out.println("BACKEND: Invalid images array");
                sendError(resp, "Send 1 or 2 base64 images in 'images' array.");
                return;
            }

            System.out.println("BACKEND: Received " + images.size() + " image(s)");

            String geminiResponse = callGemini(images);
            JsonObject plant = parseGeminiResponse(geminiResponse);

            JsonObject result = new JsonObject();
            result.addProperty("ok", true);
            result.add("data", plant);

            System.out.println("BACKEND: Success → sending result");
            resp.getWriter().write(gson.toJson(result));

        } catch (Exception e) {
            System.out.println("BACKEND: ERROR → " + e.getMessage());
            e.printStackTrace();
            sendError(resp, e.getMessage());
        }
    }

    private String callGemini(JsonArray base64Images) throws IOException {
        URL url = new URL(GEMINI_ENDPOINT + "?key=" + GEMINI_API_KEY);
        HttpURLConnection conn = USE_PROXY
                ? (HttpURLConnection) url.openConnection(new Proxy(Proxy.Type.HTTP,
                        new InetSocketAddress(PROXY_HOST, PROXY_PORT)))
                : (HttpURLConnection) url.openConnection();

        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);

        JsonObject request = new JsonObject();
        JsonArray contents = new JsonArray();
        JsonObject content = new JsonObject();
        JsonArray parts = new JsonArray();

        // Add text prompt
        JsonObject textPart = new JsonObject();
        textPart.addProperty("text", getPlantPrompt());
        parts.add(textPart);

        // Add image(s)
        for (JsonElement el : base64Images) {
            String b64 = el.getAsString();
            JsonObject inline = new JsonObject();
            inline.addProperty("mime_type", "image/jpeg");
            inline.addProperty("data", b64);

            JsonObject imgPart = new JsonObject();
            imgPart.add("inline_data", inline);

            parts.add(imgPart);
        }

        content.add("parts", parts);
        contents.add(content);
        request.add("contents", contents);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(gson.toJson(request).getBytes(StandardCharsets.UTF_8));
        }

        int status = conn.getResponseCode();
        InputStream stream = (status >= 200 && status < 300) ? conn.getInputStream() : conn.getErrorStream();
        String response = readStream(stream);

        if (status != 200) {
            throw new IOException("Gemini error " + status + ": " + response);
        }
        return response;
    }

    private String getPlantPrompt() {
        return "You are Herbula, a plant identification expert.\n"
                + "Analyze the image(s) and return ONLY valid JSON (no markdown):\n"
                + "{\n"
                + " \"name\": \"Common or scientific name\",\n"
                + " \"description\": \"1-2 sentence description\",\n"
                + " \"uses\": \"Traditional or modern uses\",\n"
                + " \"health_benefits\": \"Known medicinal benefits\",\n"
                + " \"problems_solved\": \"Health issues it may help with\",\n"
                + " \"category\": \"herbal\" | \"poisonous\" | \"non_herbal\"\n"
                + "}\n";
    }

    private JsonObject parseGeminiResponse(String json) throws IOException {
        JsonObject root = gson.fromJson(json, JsonObject.class);
        JsonArray candidates = root.getAsJsonArray("candidates");
        if (candidates == null || candidates.size() == 0) {
            throw new IOException("No candidates from Gemini");
        }

        String text = candidates.get(0).getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
                .get(0).getAsJsonObject()
                .get("text").getAsString();

        text = text.trim();
        if (text.startsWith("```")) {
            int start = text.indexOf('\n') + 1;
            int end = text.lastIndexOf("```");
            text = text.substring(start, end > start ? end : text.length()).trim();
        }

        return gson.fromJson(text, JsonObject.class);
    }

    private String readStream(InputStream is) throws IOException {
        if (is == null) return "";
        StringBuilder sb = new StringBuilder();
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = br.readLine()) != null) sb.append(line);
        }
        return sb.toString();
    }

    private void sendError(HttpServletResponse resp, String msg) throws IOException {
        JsonObject err = new JsonObject();
        err.addProperty("ok", false);
        err.addProperty("message", msg);
        resp.setStatus(400);
        resp.getWriter().write(gson.toJson(err));
    }
}
