#!/usr/bin/env bash
#
# kill-criteria-guard.sh — INERT AT v1.0. READ THIS BEFORE ASSUMING IT RUNS.
#
# WHAT THIS FILE IS
#   A documented guard that would refuse a write marking a bet `committed`
#   while its `Kill criteria` field is empty or still at the template
#   placeholder.
#
# WHAT THIS FILE DOES AT v1.0
#   Nothing. It is REGISTERED BY NOTHING and EXECUTED BY NOTHING.
#   It ships mode 0644 — not executable — and no pack may register an agent
#   hook at v1.0, so there is no settings file in which this could be wired
#   up and no event on which it could fire. `lintel harness validate` names
#   it with W-HOOK-SCRIPT-INERT for exactly this reason, and `pack info`
#   lists it as inert.
#
#   It is shipped as CONTENT so that a later version which gains a
#   hook-registration mechanism has something to register, rather than
#   something to write from scratch. Do not read its presence as
#   enforcement.
#
# WHERE THE RULE ACTUALLY LIVES AT v1.0
#   - `/bet` refuses to mark a bet committed while `Kill criteria` is empty
#     or at its placeholder, and prints the block message below.
#   - `/review` re-checks kill criteria for every bet it reviews, which is
#     what catches a bet that reached `committed` by hand-editing brief.md.
#   - `CLAUDE.md` and `.harness/pack/conventions.md` state the rule.
#   That is the whole of it. The block does NOT fire on the file write, and
#   the pack says so rather than implying a mechanism it does not have.
#
# WHY IT IS NOT REGISTERED, IN ONE LINE
#   A hook is arbitrary shell run on events the user does not initiate, and
#   v1.0 has no surface on which a user could be asked to agree to one —
#   nor a way to re-ask when an update changes the command string.
#
# IF A LATER VERSION REGISTERS THIS
#   Expect the tool-call payload on stdin as JSON, decide from the target
#   path and the proposed content, and exit non-zero with the block message
#   on stderr to refuse the write. The body below is the shape that would
#   take, written out so the intent survives; it is not wired to anything.

set -euo pipefail

BLOCK_MESSAGE='Blocked — a bet cannot be committed without kill criteria. Fill "Kill criteria" in bets/<slug>/brief.md, then retry.'

# The placeholder a brief carries before its kill criteria are filled in.
PLACEHOLDER_MARKER='| K1 | `<...>` |'

main() {
  echo "kill-criteria-guard.sh is inert at v1.0: registered by nothing," >&2
  echo "executed by nothing. The kill-criteria rule is carried by the" >&2
  echo "/bet command's instruction and re-checked by /review." >&2
  echo "" >&2
  echo "The message it would emit:" >&2
  echo "${BLOCK_MESSAGE}" >&2
  echo "" >&2
  echo "The placeholder it would look for: ${PLACEHOLDER_MARKER}" >&2
  return 0
}

main "$@"
