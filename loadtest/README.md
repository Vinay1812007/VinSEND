# Load testing

`send-flow.js` is a small k6 scenario that measures the send API under
sustained concurrency. Thresholds fail the run if p95 latency exceeds
1.5 s or if the failure rate exceeds 2 %.

## Setup

1. Install k6: <https://k6.io/docs/get-started/installation/>
2. Point it at a **staging** environment. Never a production VinSEND you care
   about — this test will happily generate 100 s of thousands of send events.
3. Verify a sender domain and configure a provider that discards mail
   (Mailtrap Sandbox is ideal).
4. Create a `vs_live_` API key on that project.

## Run

```
VINSEND_URL=https://staging.your-app.example \
VINSEND_API_KEY=vs_live_... \
VINSEND_FROM=load@staging.your-domain.example \
VINSEND_TO=sink@sandbox.mailtrap.io \
k6 run --vus 25 --duration 60s loadtest/send-flow.js
```

Ramp up gradually. `--vus 50` is a reasonable second step; be aware of your
provider's per-second send rate before pushing further.
