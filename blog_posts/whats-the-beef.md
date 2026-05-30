---
draft: true
title: Under the Banner of Responsible AI
subtitle: Should we unite research on AI safety and AI ethics?
date: 2026-02-04
---

Underneath the umbrella of "responsible AI" sit two large, well-established research areas which agree on the risks of careless investment in AI capabilities and seemingly little else. 

These two fields—"AI safety" and "AI ethics"—could together form a critical mass for confronting runaway AI adoption but remain separated by divergent motivations and rhetorical frames. This schism is *deeply* unstrategic in a world where [safety constitutes 3% of all research activity](https://eto.tech/blog/state-of-global-ai-safety-research/) with a [similar proportion for ethics](https://arxiv.org/abs/2512.10058). Today, we see myriad incidents of [social bias](https://www.npr.org/2025/07/09/nx-s1-5462609/grok-elon-musk-antisemitic-racist-content), [security vulnerability](https://www.scworld.com/brief/reports-shed-light-on-more-openclaw-vulnerabilities), [misaligned behavior](https://www.bloomberg.com/opinion/newsletters/2026-02-02/crustafarianism-the-ai-church-of-molt-is-not-for-humans) or [human disempowerment](https://www.usatoday.com/story/opinion/2026/01/24/ai-chip-manufacturing-data-centers-humanity/88215945007/) caused by frontier models. These front-page news items draw public outrage, only to go unharnessed by disunited experts. Part of the problem comes from selective attention displayed by leaders in ethics or safety who disagree on the severity or implications of any given incident.

<div style="text-align: center;">
    <a href="https://icfg.eu/new-icfg-report-compute-governance/">
  <img src="static/blog/whats-the-beef/ICFG_7802_-_AAI_state_of_play_report_-_AI_safety_funding_infographic_-_1a-1024x1024.jpg" alt="AI Safety research is a drop in the bucket." width=400>
  </a>
  <figcaption>Sourced from International Center for Future Generations.</figcaption>
</div>

Building a "big tent" can help bridge this gap and direct public attention towards tractable guardrails. Some motivations: 

1. **Critical Mass**: in the status quo, it appears that collective social pressure is a proximate path to meaningful restraints on capabilities-at-all-cost development. We need the *complementary skills*, *diversity of audiences* and *raw numbers* from those in "ethics" and "safety" to effectuate this pressure.
2. **Regulatory Consistency**: [existing](https://csrc.nist.gov/projects/risk-management/about-rmf) [regulatory](https://www.unesco.org/en/articles/unescos-recommendation-ethics-artificial-intelligence-key-facts?hub=32618) [artifacts](https://artificialintelligenceact.eu/), guided by voices from one or the other community, show divergent priorities for what constitutes "high-risk" in deployments. As this becomes codified in hard law, so too will discordant defintions of "alignment".
3. **Methodological Convergence**: there are redundant bodies of research happening in parallel between communities which cross-collaboration could streamline, accelerate, and make normatively robust to critiques which impede the credibility of both fields. 
<!--4. Stop Infighting:
3. We need a coherent framework to do this that enables us to prioritize certain regulations that accomodate both present-day and future risks -- *without* making a value judgement on which is more important.-->

This serves a call to integrate the two fields. Common goals, technical tools, and semantics for "responsible AI"[^1] enable a critical mass that draws from the strengths of "ethics" and "safety" researchers while ensuring that we say the same words when we mean the same things. This is not to say that these fields should abandon their roots and original goals. 
The intellectual traditions and founding principles are the lifeblood for either community, and should be respected and preserved. 
But we should, at the very least, build a common lexicon, borrow each other's methods, converge on *some* baseline principles, and generally make a concerted effort to unite our fractured audiences.

I will roughly sketch impressions of "AI safety", "AI ethics", and the gap between them; for a more careful treatment, check out [our survey and network study](https://arxiv.org/abs/2512.10058). The bulk of this post will (i) show that these fields are not so different; (ii) justify why we need to work together, and; (iii) describe ways *you* can change the status quo. 

On that last point: you, dear reader, hold influence that you may not realize. If these network effects shape your worldview, your work may reinforce the silo and influence somebody else. On the other hand, expanding your definition of "trustworthiness" or "reliability" could render your work as a bridge between both worlds, widening your audience and enabling future cross-disciplinary initiatives.

[^1]: One important question is what to call such a unified field. Open to feedback?

### A quick disclaimer:

1. **Frontier labs are *not* the enemy**. It goes without saying that these groups produce or sponsor some of the most impactful and precise research in both areas. Many also walk the walk, incorporating demonstrable safeguards in training and deployment. The effort that goes into releasing aligned, safe and inclusive models should not go unacknowledged.
2. **The gap isn't personal**. Arguments below suggesting what made AI ethics and safety so distinct from one another should not be taken as comments on individual research. Network effects are *structural*, and do not make assumptions on the preferences of individuals subject to those effects.

# Two fields, a chasm, and a narrow bridge.

## A Sketch of "AI Safety"
The AI Safety paradigm begins, in large part, with the work of existential risk mitigation and effective altruism. In particular, *Superintelligence* by Nick Bostrom articulates many possible paths to catastrophic risks from superintelligence, stemming from some combination of loss of control, misuse from human actors, or value-misaligned intelligence. The task of "superalignment", then, requires finding mechanisms which guide an unforeseen superintelligent system in line with human values. While this task appears intractable, existential risk reduction suggests that even incremental efforts at superalignment yield such high *expected utility* that they justify immediate, urgent action. 

This framework of altruistic ends creates an interest convergence with many experts in machine learning, mathematics and software. For one, existential AI risk implicitly reinforces the legitimacy of these experts by suggesting that they might invent and train a superintelligent system [^2]. For another, AI safety endows technical progress with *moral authority* where it is otherwise associated with anti-social goals like financial success, power or status. In turn, alignment is bidirectional in its faith in technical progress -- ["getting it right"](https://darioamodei.com/machines-of-loving-grace) would endow humanity with radical transformations in well-being, prosperity, and social stability. It comes as no surprise, then, that a significant portion of the modern AI safety community has consolidated around adopting *technical approaches* [^3] to monitor, attribute, and unlearn the potentially detrimental behaviors of modern foundation models (especially LLMs).

It is important to note that AI Safety is heavily interlinked with "AI Security", which concerns technical machine learning research on subjects like user privacy, jailbreaking, agentic security, and other non-existential risks. While these fields share different motivations, their common technical profiles often bring them together with overlapping subjects of interest.

[^2]: In recent years, of course, this seems less far-fetched than ever. For more analysis on the feedback loop between existential AI safety and capability development, consider ["The TESCREAL Bundle"](https://www.dair-institute.org/projects/tescreal/) by Timnit Gebru.

[^3]: This includes advocating for legislation which mandates the use of such tools, or managing operations at the many organizations which facilitate and upskill such talent. 


## A Sketch of "AI Ethics"

In contrast against the relatively canonicalized history of AI Safety, there exists an older, more decentralized body of work which also contends with the harms of artificial intelligence. At the intersection of fields such as sociology, science and technology studies (STS) [^4], human-computer interaction and social choice theory, **AI Ethics** addresses *present-day* risks of artificial intelligence. These risks include the extrapolation of existing inequalities from data, the exploitative and exclusionary practices of developers, and especially real-world settings where minoritized groups are denied opportunity, surveilled, or targetted using AI. For those in this field, the danger; these concerns need not attend to estimating progress on capabilities in the future. The harms lie in concrete domain adoption -- not in theory or speculation -- and have been visible for longer than the "ChatGPT moment". 

Ethical failures in AI often demand societal -- not exclusively technical -- solutions. While AI Ethics has produced a substantial body of research on methods for algorithmic fairness and transparency, many would contend that such solutions face resistance in adoption, especially if they trade off with commercial goals. Many in AI Ethics see "technosolutionism" itself as a cultural device which obscures accountability for major stakeholders. Instead, progress is made by securing governance of private and public institutions, releasing system-wide audits, conducting field research on AI laborers or "users" (who are the "users" of an algorithm which allocates affordable housing or police presence?), or rebalancing objectives in a deployed algorithm. 

Some (certainly not all) important figures in AI Ethics: Timnit Gebru (founder of the Distributed AI Research Institute), Joy Buolamwini (founder of the Algorithmic Justice League), Sasha Luccioni, Maarten Sap, Margaret Mitchell, Ruha Benjamin.

[^4]: [Science and technology studies](https://en.wikipedia.org/wiki/Science_and_technology_studies) understands technology as an *object of study*, using historical methods to situate development against societal background.


## The gap in between.

These two fields  
Conceptually, 

1. **Distraction Argument**
2. **Scoping Argument**: are proposals in AI Ethics tractable? If implemented, would they help us tackle these biases should they persist future systems?
TESCREAL


# Quantifying the schism

# Why does this matter? What can we do about it?

## Fieldbuilding and Critical Mass

## Trailblazers under the Banner
IASEAI
# Concluding Remarks
---

What are your thoughts on LLM evaluation bias? Feel free to reach out if you're working on related problems.
