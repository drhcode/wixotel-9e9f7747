import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyRequest {
  token: string;
  action: string;
}

interface RecaptchaResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  "error-codes"?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RECAPTCHA_SECRET_KEY = Deno.env.get("RECAPTCHA_SECRET_KEY");
    if (!RECAPTCHA_SECRET_KEY) {
      console.error("RECAPTCHA_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "reCAPTCHA not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, action }: VerifyRequest = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Missing reCAPTCHA token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Allow dev mode to bypass reCAPTCHA verification
    if (token === 'dev-mode-skip-recaptcha') {
      console.log("[DEV] Skipping reCAPTCHA verification for development mode");
      return new Response(
        JSON.stringify({
          success: true,
          passed: true,
          score: 1.0,
          action: action,
          message: "Development mode - reCAPTCHA bypassed",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify token with Google reCAPTCHA API
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verifyResponse = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const result: RecaptchaResponse = await verifyResponse.json();

    console.log("reCAPTCHA verification result:", {
      success: result.success,
      score: result.score,
      action: result.action,
      expectedAction: action,
    });

    if (!result.success) {
      console.error("reCAPTCHA verification failed:", result["error-codes"]);
      return new Response(
        JSON.stringify({
          success: false,
          error: "reCAPTCHA verification failed",
          details: result["error-codes"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if action matches (optional but recommended)
    if (result.action !== action) {
      console.warn(`Action mismatch: expected ${action}, got ${result.action}`);
    }

    // Score threshold (0.0 - 1.0, where 1.0 is very likely a good interaction)
    const SCORE_THRESHOLD = 0.5;
    const passed = result.score >= SCORE_THRESHOLD;

    return new Response(
      JSON.stringify({
        success: true,
        passed,
        score: result.score,
        action: result.action,
        message: passed
          ? "reCAPTCHA verification passed"
          : "reCAPTCHA score too low - possible bot activity",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error verifying reCAPTCHA:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
