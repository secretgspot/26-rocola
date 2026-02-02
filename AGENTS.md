# 🤖 Agent Operating Manual: Rocola Project

This document outlines the operational protocols and toolbelt for AI agents working on the **Rocola** repository.

## ⚡ Primary Directive: Svelte 5 & SvelteKit 2

**Context:** This project uses **SvelteKit 2** and **Svelte 5 (Runes)**.
**Mandate:** You must adhere strictly to Svelte 5 patterns.

### Core Skill: `svelte-skill`
**Status:** 🌟 **CRITICAL**
**Trigger:** Any task involving `.svelte`, `.svelte.js`, or SvelteKit routing.
**Instructions:**
- Use `$state`, `$derived`, `$effect`, `$props` (Runes) for all reactivity.
- Use `{#snippet}` instead of `<slot>`.
- Use event attributes like `onclick` instead of `on:click`.
- Use `+page.server.ts` for secure server-side logic and `+server.ts` for APIs.

---

## 🛠️ Specialized Agent Skills

You have access to a suite of specialized skills. You **MUST** activate the relevant skill via `activate_skill` when your task matches its description.

### 🎨 Frontend, Design & UI
| Skill | Use Case |
|-------|----------|
| **`web-design-reviewer`** | Reviewing UI, finding layout bugs, checking visual consistency. |
| **`responsive-design`** | Implementing mobile views, fixing viewport issues (e.g., `100dvh`), media queries. |
| **`frontend-design`** | Creating new UI components, designing the "futuristic/arcade" aesthetic. |
| **`interaction-design`** | Adding animations (FLIP transitions), micro-interactions, and user feedback. |
| **`accessibility`** | Ensuring A11y compliance (ARIA labels, keyboard nav, contrast). |
| **`canvas-design`** | If generating static assets or programmatic graphics. |

### 🚀 Performance & SEO
| Skill | Use Case |
|-------|----------|
| **`performance`** | Optimizing runtime code (e.g., `requestAnimationFrame`), bundle size, and loading. |
| **`core-web-vitals`** | Specific optimizations for LCP, CLS, and INP metrics. |
| **`seo`** | Managing meta tags, structured data (JSON-LD), and crawler visibility. |
| **`chrome-devtools`** | Deep debugging and profiling (if available in your runtime). |

### 🏗️ Engineering & Architecture
| Skill | Use Case |
|-------|----------|
| **`nodejs-backend-patterns`** | Writing backend logic in SvelteKit `+server.js` or WebSocket handlers. |
| **`modern-javascript-patterns`** | General JS/TS refactoring and logic implementation. |
| **`refactor`** | Cleaning up existing code, improving readability, extracting functions. |
| **`simplify`** | Reducing code complexity after implementation. |
| **`git-commit`** | Generating semantic, conventional commit messages. |

### ✅ Quality Assurance
| Skill | Use Case |
|-------|----------|
| **`verification-before-completion`** | **MANDATORY** before marking complex tasks as done. Verify your work. |
| **`test-driven-development`** | When implementing complex logic (e.g., queue algorithms, payment flows). |
| **`javascript-testing-patterns`** | Writing unit or integration tests (Vitest). |

### 🧠 Planning & Strategy
| Skill | Use Case |
|-------|----------|
| **`brainstorming`** | Before starting a new "Phase" (e.g., Payments), explore requirements. |
| **`prd`** | Creating Product Requirement Documents for major features. |
| **`content-strategy`** | Planning text content or documentation structure. |

---

## Workflow Example

**Task:** "Improve the mobile layout of the queue."

1.  **Activate** `svelte-skill` (for code context) and `responsive-design` (for mobile best practices).
2.  **Plan** using the skills' advice (e.g., use container queries or `dvh`).
3.  **Implement** the changes.
4.  **Activate** `web-design-reviewer` to simulate a review.
5.  **Verify** using `verification-before-completion`.