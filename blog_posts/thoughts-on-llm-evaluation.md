---
draft: true
title: Thoughts on LLM Evaluation Bias
subtitle: What our recent work on self-preference reveals
date: 2026-01-15
tags: LLMs, Evaluation, Interpretability
---

Evaluating large language models is hard. As these systems become more capable and are deployed in more contexts, we increasingly rely on LLMs themselves to serve as evaluators—judging outputs, ranking responses, and providing feedback for further training.[^1]

But what happens when models prefer their own outputs?

[^1]: This is particularly common in RLHF pipelines, where LLMs are used to generate preference labels for training reward models.

## The Self-Preference Problem

In our recent work, "[Breaking the Mirror](https://arxiv.org/abs/2509.03647)," we investigated a subtle but important bias: LLMs acting as judges tend to favor their own outputs over those of other models, even when the quality is comparable or worse.

This matters because:

1. **It undermines fairness** in automated evaluation pipelines
2. **It creates feedback loops** in preference tuning and RLHF
3. **It biases model selection** and routing decisions

## Two Kinds of Self-Preference

One of our key findings was distinguishing between:

- **Justified self-preference**: Cases where a model's output genuinely is better
- **Unjustified self-preference**: Cases where a model favors its own output despite comparable or worse quality

This distinction is crucial. We don't want to eliminate all self-preference—sometimes a model's output really is best. We want to reduce the systematic bias that occurs independent of quality.

## Can We Fix It?

We explored lightweight interventions using steering vectors—activation-based representations that can shift model behavior at inference time without retraining. The results were promising: we could reduce unjustified self-preference by up to 97%.

But the approach had limitations. Steering vectors proved unstable on cases of legitimate self-preference and unbiased agreement, suggesting that self-preference bias spans multiple or nonlinear directions in the model's representation space.

## Looking Ahead

This work raises more questions than it answers:

- How do different evaluation contexts (pairwise comparison vs. scoring) affect self-preference?
- Can we develop more robust methods for detecting and mitigating this bias?
- What are the implications for using LLMs in high-stakes evaluation scenarios?

I'm excited to continue exploring these questions, and I'm curious to hear from others working on evaluation, interpretability, and alignment.

---

What are your thoughts on LLM evaluation bias? Feel free to reach out if you're working on related problems.
