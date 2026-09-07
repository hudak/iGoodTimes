/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  // Only configure SMTP where RESEND_TOKEN is actually set (i.e. Railway).
  // Local dev has no SMTP configured on purpose - PocketBase logs the OTP
  // code to its own console instead (see mise.toml's pb:serve task / README).
  const resendToken = $os.getenv("RESEND_TOKEN");
  if (!resendToken) {
    return;
  }

  const settings = app.settings();
  settings.smtp = {
    ...settings.smtp,
    enabled: true,
    host: "smtp.resend.com",
    // 2465 (implicit TLS), not the standard 465/587: Railway blocks outbound
    // 587 (verified - a direct connection attempt timed out), and Resend
    // documents 2465/2587 as the alternate ports for exactly this case.
    port: 2465,
    username: "resend",
    password: resendToken,
    authMethod: "PLAIN",
    tls: true,
  };
  settings.meta = {
    ...settings.meta,
    // goodtimes@nhudak3.dev is the domain Resend is configured to send from.
    senderAddress: $os.getenv("SMTP_SENDER_ADDRESS") || "goodtimes@nhudak3.dev",
    senderName: $os.getenv("SMTP_SENDER_NAME") || "GoodTimes",
  };

  return app.save(settings);
}, (app) => {
  const settings = app.settings();
  settings.smtp = { ...settings.smtp, enabled: false };
  return app.save(settings);
})
