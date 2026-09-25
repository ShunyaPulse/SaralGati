async function triggerWorkflow(env) {
  const url =
    "https://api.github.com/repos/ShunyaPulse/SaralGati/actions/workflows/self_learning_flywheel.yml/dispatches";

  console.log(
    `Triggering GitHub Actions workflow at ${new Date().toISOString()}`,
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github.v3+json",
      Authorization: `Bearer ${env.GITHUB_PAT}`,
      "User-Agent": "Cloudflare-Cron-Worker/1.0",
    },
    body: JSON.stringify({
      ref: "main",
    }),
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, body: text };
}

export default {
  async fetch(request, env, ctx) {
    const result = await triggerWorkflow(env);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.ok ? 200 : result.status,
      headers: { "Content-Type": "application/json" },
    });
  },

  async scheduled(event, env, ctx) {
    const result = await triggerWorkflow(env);
    if (!result.ok) {
      console.error(
        `Failed to trigger workflow. Status: ${result.status}`,
        result.body,
      );
    } else {
      console.log("Successfully triggered GitHub Actions workflow_dispatch!");
    }
  },
};
