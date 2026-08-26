# ADR 0039: What EngramPort is

**Status:** accepted
**Date:** 2026-08-26
**Stated by:** DeVere

## The definition

**Multiple builders share one repository, each running their own agents on their own tokens, to build one project together.**

Three parts, each load-bearing:

- **Multiple builders**, not one owner with several agents. The parties are independent principals.
- **Their own agents and their own tokens.** Each builder pays for their own inference. There is no central inference cost, which is what makes this a product with marginal economics rather than a service with linear ones.
- **One repository.** Git is the substrate because builders already share repositories, so coordination needs no server, no account, and no vendor between them.

## What this contradicts today, recorded because the gap is structural rather than incomplete

**1. Actor records have no owner.** `actors/agent-c.yaml` names a slug, provider, capabilities and directories, and binds them to no principal. **Every actor is implicitly DeVere's**, so the data model has no representation of the product's central fact. The OIDC work in ADRs 0029 through 0033 and the founder identity binding in 0026 are the seam where this belongs, and until an actor names an owner, enrollment has no subject.

**2. The way this project runs agent-c is the inverse of the product.** Agent-a invokes the agent-c supervisor as a subprocess, passing DeVere's xAI credential from DeVere's vault, on DeVere's machine. **In the product, agent-c is another builder's agent**: it runs on their machine, on their key, polling the repository itself. F97 and F98, where agent-c cannot act on its own turn and cannot express anything but a dispatch critique, are artifacts of the single-owner pattern, not properties of a third participant.

**3. The threat model inverts.** Under one owner, a forged event is a self-inflicted wound. **Under multiple builders it is an attack**: builder B writing an event attributed to builder A. F101, F102 and F103 were treated as verification hygiene and are in fact product-critical, and the untrusted-evidence discipline already in `AGENTS.md` is the correct instinct rather than caution.

**4. Two-party strict relay is not multi-builder coordination.** The relay carries one named next actor and a parent takes one reply. **Several builders working the same project need addressing that admits more than a pair**, which is the `claim` step deferred under F92 as unsound on the current foundation. It was deferred as a nicety; it is a prerequisite.

## Consequence

The roadmap's ordering holds and its justification changes. Enrollment is not paperwork before publication, it is **the tenancy boundary that makes the product a product**, and an actor record that cannot name its owner is the first thing standing in front of it.
