# A Materials-Science Model of Egg Fried Rice

_A ChatGPT conversation, originally created 2023-10-05._

Author: [ktwu01](https://github.com/ktwu01)

Source: https://chat.openai.com/share/33bbea16-9508-4c8c-b300-198880b8d434

📼 **[The original 2023 saved page](original-2023/蛋炒饭的材料学模型.html)** — the actual browser-saved snapshot from 2023-10-05, byte-for-byte, framework bundles and all. That's the artifact; this README is commentary on it.

## What's in the conversation

A back-and-forth with ChatGPT trying to answer a deliberately over-engineered question: how do you fry rice so that *every* grain is bonded to egg, with no bare rice and no isolated egg bits? The conversation runs through molecular-gastronomy framings, gets momentarily confused between egg fried rice and egg-*wrapped* rice, and lands on a first-pass materials-science model: egg coagulation as a phase transition, an adhesion energy proportional to coagulated fraction, and a stirring-dependent contact probability, multiplied together into a "binding probability." Read the full exchange in [the original page](original-2023/蛋炒饭的材料学模型.html).

## Extended model: percolation–coagulation with competing stirring effects

The original conversation left three gaps: the coagulation kinetics were a bare first-order guess, the stirring term `P = P₀e^(−I/I₀)` implies *more* stirring always means *less* egg–rice contact (no mechanism given, and it conflicts with kitchen experience), and there was no criterion for actually deciding when "no isolated rice grains, no isolated egg" has been achieved.

**1. Coagulation as nucleation-and-growth (Avrami), not first-order decay.** Protein coagulation, like crystallization, nucleates and grows rather than relaxing exponentially from t=0:

\[ \phi(t) = 1 - \exp\!\big[-(k(T)\,t)^n\big], \qquad k(T) = A\,e^{-E_a/RT} \]

**2. Stirring has two competing effects, which is what actually produces an optimum.** Collision frequency between rice and egg grows with stirring intensity \(I\); so does the shear that tears already-bonded film back off. Per-grain surface coverage \(\theta\) obeys:

\[ \frac{d\theta}{dt} = \beta_0 I(\theta_{\max}-\theta)\phi(t) - \gamma_0 I^2\theta \]

Because fragmentation scales as \(I^2\) against collision's \(I^1\), there is a genuine optimal stirring intensity \(I^*\) for a given cook time — too little stirring never spreads the egg, too much shreds it back off. This replaces the original model's unexplained monotonic decay with a mechanism, and matches the real failure modes of over- and under-stirred fried rice.

**3. A stoichiometric ceiling — kinetics cannot substitute for enough egg.** Coverage is capped by how much egg mass is actually available per unit rice surface:

\[ \theta_{\max}(r) = \min\!\left(1, \frac{r}{r_c}\right) \]

where \(r\) is the egg:rice mass ratio and \(r_c\) is the ratio required to give every grain a full monolayer.

**4. A percolation criterion for "bonded."** The literal requirement — no isolated rice grains, no isolated egg — is a statement about the *distribution* of \(\theta\) across grains, not just its mean. Three conditions have to hold together: enough coverage on average, low spread, and an explicit bound on the fraction of grains left bare:

\[ \text{bonded} \iff \langle\theta\rangle \ge \theta_c \ \text{ and } \ \mathrm{Var}(\theta) \le \mathrm{Var}_c \ \text{ and } \ f_{\mathrm{bare}} \le f_c \]

where \(f_{\mathrm{bare}}\) is the fraction of grains below a coverage threshold \(\theta_{\mathrm{bare}}\). A high mean with low variance can still hide a tail of uncoated grains, so the bare-fraction bound is the term that actually enforces "no isolated rice grains." Because grains differ in how exposed they are to egg–grain collisions, coverage is a genuine distribution rather than one number — that spread is what the variance and bare-fraction terms measure.

Choosing the stirring intensity then means optimizing the whole distribution, not the mean alone. The demo's I* sweep maximizes a score \( \langle\theta\rangle - \lambda\,\mathrm{Var}(\theta) - \mu\,f_{\mathrm{bare}} \), so the optimum trades a little mean coverage away when doing so buys a more even coat.

## Interactive demo

[**demo.html**](demo.html) simulates a population of rice grains under this model, animates their coverage in a wok, and numerically sweeps stirring intensity to find \(I^*\) live as you adjust temperature, stirring, egg:rice ratio, and cook time. Open it directly in a browser (needs network access once, to load MathJax for the equations).
