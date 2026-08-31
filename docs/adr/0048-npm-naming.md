# ADR 0048: This ships scoped; `engramport` on npm is left alone

**Status:** accepted
**Date:** 2026-08-31
**Decided by:** DeVere

## Decision

**This repository publishes as `@engramport/sdk`. The existing unscoped `engramport` package is not replaced.**

## The fact that decided it

DeVere owns `engramport` on npm — currently 2.2.1, seven versions, created 2026-06-02, **90 downloads last month and 17 last week.** It is an MCP-native persistent-memory server: *"give any AI agent persistent memory, bring-your-own-LLM via OpenRouter, graph-RAG."*

The initial intent was to treat this repository as its successor. **Checking rather than assuming showed it is not one.** This repository contains **zero** references to `modelcontextprotocol`, **zero** graph-RAG, embedding or retrieval code in any package, and no vector columns in any migration. `pgvector` is enabled and unused.

**So a 2.x user upgrading to 3.0.0 would lose the feature they installed it for and receive a git coordination log they did not ask for.** "Successor" is a claim about what a user receives, not about what the author intended.

## The rule this establishes

**A major version may break an interface. It may not replace the product.** The test for taking an existing name: **can an existing user upgrade and still do what they came for?** Today the answer is no.

## The relationship, which is coherent rather than confused

Both descend from one idea, durable memory for AI work, and diverge on scope. **`engramport` remembers for one agent. `@engramport/sdk` records between many builders.** That is a family, and the site should say so in a sentence rather than leave a visitor to discover two differently-shaped things under one brand.

## When this is revisited

**If the coordination substrate grows a memory surface**, which `pgvector` is already enabled for, then `engramport@3.0.0` becomes honest, because a 2.x user would receive their feature plus more. **Until then, publishing over working software on an uncertainty is the one move that cannot be undone.**
