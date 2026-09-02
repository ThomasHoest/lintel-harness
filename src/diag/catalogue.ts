/**
 * Code -> message template. T-0104.
 *
 * **The only place user-facing CLI text exists in the product.** Not a
 * convention: F1 §Error States makes the CODE the stable contract and the
 * prose free to change, so a caller that composes its own sentence has
 * created a second contract nobody versions, and a test that string-matches
 * one is asserting something F1 explicitly does not promise.
 *
 * Templates are **verbatim from F1 §Error States**, derived rather than
 * transcribed, and `catalogue.test.ts` re-derives them on every run — the
 * same drift guard `codes.ts` carries, for the same reason.
 *
 * Shape, and it is checked rather than trusted: line 1 begins `lintel: `;
 * every continuation line is indented two spaces; a remedy line begins
 * with the arrow. Interpolation is `{name}` and nothing else — no
 * expressions, no formatting, no nesting.
 */
import type { DiagnosticCode } from './codes.js';
import { escapeLine, escapeValue } from './escape.js';

/** One entry per code. Lines, not a blob: the caller joins with newlines,
 *  and the array shape is what lets the shape rules be asserted. */
export const MESSAGES: Readonly<Record<DiagnosticCode, readonly string[]>> = {
  'E-ALREADY-APPLIED': ["lintel: this project already has {pack}@{version} applied.", "  init applies a pack to a project that has none.", "  → lintel harness update   to move this project to a newer {pack}", "  → Or apply into a fresh directory, or remove .harness/ by hand if you mean to start over."],
  'E-ANATOMY-EMPTY': ["lintel: anatomy part \"{part}\" in pack {name} matches no files.", "  Patterns: {globs}", "  → Fix the paths, or mark the part absent with a reason."],
  'E-ANATOMY-MISSING': ["lintel: pack {name} does not declare the anatomy part \"{part}\".", "  A pack must declare all nine parts. Declare it, or mark it absent with a reason:", "    \"{part}\": { \"status\": \"absent\", \"reason\": \"…\" }"],
  'E-ANATOMY-NO-NOTE': ["lintel: anatomy part \"{part}\" in pack {name} is provisional without a note.", "  A provisional part must say what is unsettled about it.", "  → \"{part}\": { \"paths\": […], \"status\": \"provisional\", \"note\": \"…\" }"],
  'E-ANATOMY-NO-REASON': ["lintel: anatomy part \"{part}\" in pack {name} is absent without a reason.", "  An absent part must say why it is absent.", "  → \"{part}\": { \"status\": \"absent\", \"reason\": \"…\" }"],
  'E-ANATOMY-SOURCE-ON-ABSENT': ["lintel: anatomy part \"{part}\" in pack {name} is declared absent but also declares content (\"{sourceKey}\").", "  A part cannot both not exist and have content, and lintel will not guess which was meant.", "  → Remove \"{sourceKey}\", or drop \"status\": \"absent\"."],
  'E-ANCHOR-INVALID': ["lintel: step {index} declares anchor \"{id}\", which {reason} in the rendered \"{to}\".", "  An anchor is the exact line <!-- harness:region id={id} --> closed by <!-- harness:end -->, and each declared anchor must appear once.", "  → Fix the template, or drop the anchor from the step."],
  'E-CLAUDE-PERMISSION-MODE': ["lintel: \"{path}\" selects permission mode \"{value}\" (line {line}).", "  A pack may not widen the permission envelope of the project it is applied to, and lintel will not guess at a mode it does not recognise.", "  Permitted: {modes}", "  → Use a mode that does not widen the envelope, or remove the key."],
  'E-CLAUDE-TOOL-GRANT': ["lintel: \"{path}\" declares a permission decision (\"{key}\", line {line}).", "  A pack may not pre-authorize tools or select a permission mode for the project it is applied to. A command file's frontmatter is a permission declaration, and its !-prefixed lines execute shell under it.", "  → Remove the key. A pack contributing permissions is deferred to v1.1 with the settings story."],
  'E-CLI-ARG-UNEXPECTED': ["lintel: \"lintel harness {command}\" does not take the argument \"{arg}\".", "  {usage}"],
  'E-CLI-FLAG-VALUE-MISSING': ["lintel: --{flag} needs a value.", "  {usage}"],
  'E-CLI-PACK-MISSING': ["lintel: \"lintel harness {command}\" needs a pack name.", "  Packs: {packs}", "  {usage}"],
  'E-CLI-UNKNOWN-COMMAND': ["lintel: \"{arg}\" is not a lintel harness command.", "  Commands: init, update, skill, validate, verify, pack", "  → lintel harness --help"],
  'E-CLI-UNKNOWN-FLAG': ["lintel: \"lintel harness {command}\" does not accept --{flag}.", "  It accepts: {flags}", "  → lintel harness {command} --help"],
  'E-CLI-UNKNOWN-PACK': ["lintel: \"{name}\" is not a pack bundled with lintel {cliVersion}.", "  Packs: {packs}", "  → lintel harness pack info <pack>   to see what one contains"],
  'E-CONTENT-TOO-LARGE': ["lintel: \"{path}\" is {size}; the limit for a pack file is 4 MB."],
  'E-DEST-SYMLINK': ["lintel: \"{component}\" on the way to \"{path}\" is a symbolic link.", "  lintel does not traverse or create through a link, because where a link points is not something this project controls.", "  → Replace the link with a real directory, or apply into a tree that has none."],
  'E-DISCLOSURE-FORGERY': ["lintel: \"{path}\" contains a line that would end the security disclosure early.", "  A pack may not emit lintel's own output delimiters.", "  → Remove the line. The disclosure must be readable in full before anything is written."],
  'E-EXEC-DEST-FORBIDDEN': ["lintel: \"{path}\" may not be executable.", "  A pack may never write an executable file inside any .claude, .git, .hg or .svn directory at any depth, or under .harness/.", "  → Ship the script as an ordinary 0644 file, or place it elsewhere in the project."],
  'E-EXEC-ROOT-UNDECLARED': ["lintel: step {index} sets the executable bit on \"{to}\", outside every declared executableRoots prefix.", "  Declared: {roots}", "  → Add the destination's prefix to \"executableRoots\", or drop \"executable\": true."],
  'E-EXEC-TOO-MANY': ["lintel: this apply would write {n} executable files; the limit is 32.", "  → Reduce the number of executables, or raise the limit in an ADR of its own."],
  'E-FLAG-NOT-PERMITTED': ["lintel: --{flag} is not available on \"lintel harness {command}\".", "  It is accepted on: {commands}", "  → Remove it, or run the command that accepts it."],
  'E-JOURNAL-PRESENT': ["lintel: a previous {command} did not finish.", "  {n} files were being written when it stopped.", "  → lintel harness {command} --rollback   undo exactly what that run did"],
  'E-JOURNAL-UNREADABLE': ["lintel: .harness/journal.json is not a journal this CLI can act on ({detail}).", "  lintel will not guess what a previous apply was doing.", "  → Remove .harness/journal.json by hand once you have checked the project, or restore it from version control."],
  'E-JSON-DUPLICATE-KEY': ["lintel: {file} declares \"{key}\" more than once (lines {first} and {second}).", "  A duplicate key means the file a reviewer reads is not the file the CLI runs.", "  → Remove the duplicate."],
  'E-LOCK-HELD': ["lintel: another lintel harness command is running in this project (pid {pid} on {host}, since {startedAt}).", "  → Wait for it to finish, or remove .harness/lock if you are certain it is not running."],
  'E-MANIFEST-ANSWER-INVALID': ["lintel: the recorded answer for \"{id}\" is not valid against the pack's own declaration ({reason}).", "  Recorded: {value}", "  Nobody typed this: the manifest was edited, or the pack's declaration changed under it.", "  → Restore .harness/manifest.json from version control, or re-apply into a fresh directory."],
  'E-MANIFEST-CORRUPT': ["lintel: .harness/manifest.json is not readable ({detail}).", "  → Restore it from version control, or re-apply into a fresh directory. lintel will not repair a manifest."],
  'E-MANIFEST-MISSING': ["lintel: no manifest at .harness/manifest.json — this project has no pack applied.", "  → lintel harness init <pack>   to apply one"],
  'E-MANIFEST-NEWER': ["lintel: .harness/manifest.json was written by a newer lintel (manifest version {n}; this CLI reads up to {m}).", "  → Upgrade: npm i -g @lintel/cli@latest"],
  'E-MAP-CASE-COLLISION': ["lintel: \"{a}\" and \"{b}\" differ only by letter case.", "  On macOS and Windows these are the same file.", "  → Rename one of them in the pack."],
  'E-MAP-COLLISION': ["lintel: two steps both write \"{path}\".", "  step {a}: {opA} {fromA}", "  step {b}: {opB} {fromB}", "  → A recipe may write each applied path exactly once."],
  'E-MAP-ESCAPES-ROOT': ["lintel: step {index} writes \"{to}\", which resolves outside the project root.", "  → Applied paths must be relative and must stay inside the project."],
  'E-MAP-NORM-COLLISION': ["lintel: \"{a}\" and \"{b}\" are two byte sequences for the same filename.", "  They differ only in Unicode normalization (NFC vs NFD), so macOS stores them as one file.", "  → Write both \"to\" values in NFC, using the same code points."],
  'E-MAP-PATH-GRAMMAR': ["lintel: step {index} writes \"{to}\", which is not a legal applied path.", "  {construct}", "  → An applied path is one or more \"/\"-separated segments, relative, NFC, with no \"..\", no backslash, no drive letter, no control character, and no segment ending in \".\" or whitespace."],
  'E-MAP-RESERVED-DEST': ["lintel: step {index} writes \"{path}\", which is a reserved destination (\"{reserved}\").", "  Reserved at any segment: .git .hg .svn .github .vscode .idea node_modules .circleci .devcontainer", "  Reserved as a first segment: .harness/", "  Reserved by basename: package.json .envrc .npmrc .yarnrc.yml Makefile GNUmakefile justfile .justfile .mcp.json .gitlab-ci.yml Jenkinsfile azure-pipelines.yml bitbucket-pipelines.yml", "  Reserved under any .claude segment: settings.json settings.local.json", "  Also reserved: the directory lintel itself is installed in.", "  A recipe step may never write under .harness/ — that is where the payload it reads from lives.", "  No pack writes project settings, MCP server declarations, CI pipelines, editor tasks or package manifests at v1.0.", "  → Choose a destination inside the project that lintel does not own."],
  'E-PACK-CLI-TOO-OLD': ["lintel: pack {name}@{version} needs lintel {minCliVersion} or newer.", "  You are running {cliVersion}.", "  → Upgrade with: npm i -g @lintel/cli@latest"],
  'E-PACK-FORMAT-NEWER': ["lintel: pack {name} uses pack format {n}; this CLI understands up to {m}.", "  → Upgrade the CLI, or use a pack built for format {m}."],
  'E-PACK-INVALID': ["lintel: {path} is not a usable pack declaration ({detail}).", "  A pack.json is an object declaring at least name, version, minCliVersion, recipe and anatomy.", "  → Fix the file, then re-run validate."],
  'E-PARAM-COMBINATORICS': ["lintel: pack {name} has {n} parameter combinations to validate; the limit is 32.", "  → Reduce step-selecting parameters, or split the pack."],
  'E-PARAM-FLAG-INVALID': ["lintel: parameter \"{id}\" declares the flag alias \"--{flag}\", which {reason}.", "  Reserved: --set, --scaffold, --json, --strict, --force, --rollback, --all, --dry-run", "  → Choose a kebab-case alias that is not reserved and not already used by another parameter."],
  'E-PARAM-INVALID': ["lintel: \"{value}\" is not a valid answer for \"{id}\".", "  Allowed: {values}"],
  'E-PARAM-MISSING': ["lintel: parameter \"{id}\" is required and has no answer.", "  {prompt}"],
  'E-PARAM-NO-PATTERN': ["lintel: parameter \"{id}\" is a string and declares no \"pattern\".", "  Every string answer is recorded verbatim in a committed manifest and replayed on every verify, so its shape must be declared.", "  → Add an anchored pattern, e.g. \"pattern\": \"^[\\p{L}\\p{N} ._-]{1,64}$\""],
  'E-PARAM-PATTERN-INVALID': ["lintel: the \"pattern\" on parameter \"{id}\" is not usable ({reason}).", "  A pattern must start ^, end $, be at most 200 characters, and use no backreference and no lookaround.", "  → Simplify it, or drop it if the parameter is an enum or a boolean."],
  'E-PARAM-SECRET-SUSPECTED': ["lintel: parameter \"{id}\" looks like it asks for a credential.", "  Every answer is written verbatim into .harness/manifest.json, which this project commits to version control. An answer is exactly as public as the repository.", "  → Remove the parameter, or declare \"notASecret\": true if the name is a false alarm."],
  'E-PARAM-UNANSWERABLE': ["lintel: \"{id}\" has no answer and no default, and there is nowhere to ask.", "  Non-interactive: stdin and stderr are not both a terminal.", "  → Pass --set {id}=<value>, or run where lintel can prompt."],
  'E-PARAM-UNDECIDABLE': ["lintel: parameter \"{id}\" selects recipe steps but is neither required nor given a default.", "  → Add \"required\": true, or a \"default\"."],
  'E-PAYLOAD-DIGEST-MISMATCH': ["lintel: .harness/pack/ does not match the payload this project recorded.", "  recorded {recorded}", "  computed {computed}", "  The applied tree cannot be checked against an edited payload.", "  → Restore .harness/pack/ from version control, or re-apply into a fresh directory."],
  'E-PAYLOAD-PATH-INVALID': ["lintel: \"{path}\" in pack {name} is not a legal pack path.", "  {construct}", "  → Rename it. Pack paths are \"/\"-separated, NFC, relative, with no \"..\", no backslash, no drive letter, no control character, and no segment ending in \".\" or whitespace."],
  'E-PAYLOAD-TOO-LARGE': ["lintel: pack {name} totals {size}; the limit for a pack payload is 32 MB.", "  The payload is copied into and committed by every project that applies the pack.", "  → Remove content, or split the pack."],
  'E-RECIPE-FORMAT-NEWER': ["lintel: {pack}'s recipe declares format version {declared}; this CLI supports {supported}.", "  → Upgrade lintel, or use a pack built for this version."],
  'E-RECIPE-INVALID': ["lintel: {path} is not a usable recipe ({detail}).", "  A recipe is { \"formatVersion\": <int>, \"steps\": [ … ], \"scaffolds\"?: { … } }.", "  → Fix the file, then re-run validate."],
  'E-RECIPE-MISSING': ["lintel: pack {name} declares \"recipe\": \"{path}\", which is not in the pack.", "  Phase 2 has nothing to run, so applying this pack would produce a payload and nothing else.", "  → Add {path}, or correct the \"recipe\" path."],
  'E-RECIPE-PRIMITIVE-UNKNOWN': ["lintel: step {index} declares op \"{op}\", which is not a lintel harness primitive.", "  The six primitives are: copy, rename, strip-suffix, rewrite-path, substitute, generate.", "  The set is closed. A pack cannot add a step type; a new primitive is a change to the CLI.", "  {note}", "  → Express the step with an existing primitive, or open it as a CLI change."],
  'E-RECIPE-SOURCE-MISSING': ["lintel: step {index} (\"{op}\") reads \"{path}\" from \"{field}\", which is not in the pack.", "  Phase 2 reads only .harness/pack/, so every declared source must exist in the pack itself.", "  → Correct the path, or add the file to the pack."],
  'E-RECIPE-STEP-INVALID': ["lintel: step {index} (\"{op}\") is not usable: {reason}.", "  {usage}", "  → Fix the step."],
  'E-RECIPE-TOO-MANY-STEPS': ["lintel: pack {name} declares {n} recipe steps; the limit is 256.", "  pack info prints every step so that an apply can be read before it runs, and a list nobody finishes reading is not a control.", "  → Reduce the step count, or raise the limit in an ADR that supersedes this one."],
  'E-REWRITE-UNUSED': ["lintel: step {index} rewrites \"{find}\" → \"{replace}\", which matched nothing in {globs}.", "  A rewrite that no longer applies is stale.", "  → Remove the step, or fix its \"in\" patterns."],
  'E-SCAFFOLD-COLLISION': ["lintel: scaffolds \"{a}\" and \"{b}\" both write \"{path}\".", "  They are in different categories, so a user may select both.", "  → Give them one category if they are alternatives, or move the shared file into the base recipe."],
  'E-SCAFFOLD-EXCLUSIVE': ["lintel: \"{a}\" and \"{b}\" are alternatives, not additions — both are \"{category}\" scaffolds.", "  Pick one.", "  Available {category} scaffolds: {ids}"],
  'E-SCAFFOLD-UNKNOWN': ["lintel: pack {name} has no scaffold \"{id}\".", "  Available: {ids}"],
  'E-SET-UNKNOWN-PARAM': ["lintel: {pack}@{version} declares no parameter \"{id}\".", "  Declared: {ids}", "  → lintel harness pack info {pack}   to see the parameters and their defaults"],
  'E-SUBST-NEWLINE': ["lintel: the answer for \"{id}\" contains a line break and cannot be substituted into \"{path}\".", "  A single answer may not become two lines of a generated file.", "  → Answer on one line, or tighten the parameter's \"pattern\"."],
  'E-SUBST-UNRESOLVED': ["lintel: unresolved {{harness:{token}}} in {path}:{line}.", "  → Declare a parameter named \"{id}\", add the token to the step's \"tokens\" list, or remove the token."],
  'E-SYMLINK-IN-PACK': ["lintel: \"{path}\" is a symbolic link. Pack content must be regular files."],
  'E-TARGET-EXISTS': ["lintel: {n} files already exist where this pack would write.", "  {paths}", "  → Apply into an empty directory, or re-run with --force to keep byte-identical files and stop on the rest."],
  'E-TARGET-RACE': ["lintel: \"{path}\" changed while lintel was writing.", "  {detail}", "  Nothing further was written; the journal is intact.", "  → lintel harness init --rollback, then re-run."],
  'E-TRAVERSAL-LIMIT': ["lintel: the walk of \"{root}\" exceeded the {limit} limit ({n}).", "  Limits: depth 32, 10,000 entries per walk.", "  → Narrow the content, or split the pack."],
  'E-UNKNOWN-VALUE': ["lintel: \"{value}\" is not a valid {field}.", "  Allowed: {allowed}", "  → Fix the value, or upgrade to a lintel that understands it."],
  'E-UPDATE-AVAILABLE': ["lintel: {pack}@{applied} is applied; lintel {cliVersion} bundles {bundled}.", "  → lintel harness update   to see what would change"],
  'E-UPDATE-NOT-NEWER': ["lintel: {pack}@{applied} is applied; lintel {cliVersion} bundles {bundled}, which is not newer.", "  → Upgrade the CLI: npm i -g @lintel/cli@latest"],
  'E-UPDATE-PARAM-UNANSWERED': ["lintel: {pack}@{bundled} declares \"{id}\", which {pack}@{applied} did not.", "  {prompt}", "  Recorded answers cannot supply it, and there is no way to answer it now.", "  → The pack must give \"{id}\" a \"default\". Until it does, re-apply into a fresh directory."],
  'E-UPDATE-SCAFFOLD-DROPPED': ["lintel: {pack}@{bundled} no longer declares the scaffold \"{name}\", which this project selected.", "  update will not silently drop the files it placed.", "  → Re-apply into a fresh directory, or remove the scaffold's files by hand first."],
  'E-VERIFY-MISMATCH': ["lintel: {n} of {total} applied paths do not match what this pack and these answers produce.", "  {paths}", "  → Inspect the differences, or re-apply into a fresh directory."],
  'E-WRITE-FAILED': ["lintel: could not write \"{path}\" ({errno}).", "  Nothing further was written; the project is mid-apply.", "  → lintel harness init --rollback"],
  'W-ANATOMY-ABSENT': ["lintel: pack {name} declares no {part}.", "  Reason given: {reason}"],
  'W-ANATOMY-PROVISIONAL': ["lintel: pack {name} ships {part} as provisional.", "  Note: {note}"],
  'W-ANSWER-LOOKS-SECRET': ["lintel: the answer for \"{id}\" looks like a credential.", "  It will be written into .harness/manifest.json, which this project commits."],
  'W-FOLDER-README-MISSING': ["lintel: {pack} creates {dir} but writes no {basename} into it.", "  combination: {combination}", "  → Add a step producing {dir}{basename} in the same condition branch, or make {dir} unnecessary."],
  'W-HOOK-SCRIPT-INERT': ["lintel: \"{path}\" is shipped as an ordinary file and is registered by nothing.", "  No v1.0 mechanism registers a hook, so this script does not run until something registers it by hand."],
  'W-LINK-DANGLING': ["lintel: {path}:{line} refers to \"{target}\", which this pack does not produce.", "  → Fix the reference, or add the file to the pack."],
  'W-LINK-FALLBACK': ["lintel: \"{path}\" was copied rather than linked ({errno}).", "  The write is still atomic; the space saving is not."],
  'W-LOCK-STALE-BROKEN': ["lintel: removed a stale lock left by pid {pid}, which is no longer running."],
  'W-MANIFEST-NEWER-CLI': ["lintel: this project was last touched by lintel {recorded}; you are running {current}."],
  'W-PACK-NEWER-THAN-CLI': ["lintel: this project has {pack}@{version}; the newest {pack} bundled with lintel {cliVersion} is {bundled}.", "  verify still works — it reads .harness/pack/, not the bundle."],
  'W-PATH-NON-NFC': ["lintel: \"{path}\" is not in Unicode NFC; its applied path has been normalized.", "  An NFD name would not match the same file on Linux."],
  'W-ROLLBACK-KEPT': ["lintel: kept \"{path}\" — {reason}."],
  'W-SCAN-SYMLINK-SKIPPED': ["lintel: skipped \"{path}\" — it is a symbolic link, and lintel does not follow links out of the project."],
  'W-UNKNOWN-KEY': ["lintel: {where} declares an unknown key \"{key}\".", "  It is ignored — this lintel does not know what it means.", "  → Remove it, or upgrade to a lintel that understands it."],
} as const;

const PLACEHOLDER = /(?<!\\[pP])\{([A-Za-z][A-Za-z0-9]*)\}/g;

/**
 * **Empty, and the concept is retired.** F1 v5.2.
 *
 * This recorded codes whose message lines F1 described in prose instead
 * of naming — `{first ten paths, one per line, …}` — which the identifier
 * rule leaves **literal**, so an emitter would print those words where the
 * content belongs. There were three. `E-RECIPE-STEP-INVALID`'s was closed
 * at v4.7 by naming it `{usage}`; the other two were left because they are
 * genuinely multi-line and `escapeValue` escapes `\n` (C-50), so a
 * multi-line value cannot pass through a placeholder.
 *
 * **E-10 then built one of them** and `E-VERIFY-MISMATCH` was about to
 * print its own description to a user. So `render` gained the expansion
 * rule below instead, and both became `{paths}`.
 *
 * Kept as an empty export rather than deleted: `catalogue.test.ts` asserts
 * it is empty, which is a stronger statement than the absence of a symbol
 * nobody looks for.
 */
export const DESCRIPTIVE_SLOTS: Readonly<Record<string, string>> = {} as const;

/** Placeholder names a template expects, in order of first appearance. */
export function placeholdersOf(code: DiagnosticCode): readonly string[] {
  const seen = new Set<string>();
  for (const line of MESSAGES[code]) {
    for (const m of line.matchAll(PLACEHOLDER)) seen.add(m[1] as string);
  }
  return [...seen];
}

/** Names the caller did not supply. Empty is the only acceptable answer at
 *  a call site, and the tests assert it. */
export function missingPlaceholders(
  code: DiagnosticCode,
  data: Readonly<Record<string, string>>,
): readonly string[] {
  return placeholdersOf(code).filter((n) => !(n in data));
}

/**
 * Render a message.
 *
 * Every interpolated value passes `escapeValue` and every finished line
 * passes `escapeLine` (C-50), in that order: the value is escaped before it
 * can contribute a structural character to the line it lands in.
 *
 * An unsupplied placeholder is **left visible as `{name}`** rather than
 * throwing. Failing while reporting a failure would replace a diagnostic
 * the user needs with one they do not, and a visible `{path}` is a defect
 * anybody can see — `missingPlaceholders` is how tests refuse to ship one.
 */
export function render(
  code: DiagnosticCode,
  data: Readonly<Record<string, string>> = {},
  lists: Readonly<Record<string, readonly string[]>> = {},
): readonly string[] {
  const out: string[] = [];
  for (const line of MESSAGES[code]) {
    // A LIST slot expands to one output line per item, keeping the
    // template line's indentation. F1 v5.2.
    //
    // **Opt-in, and that is the security property.** The first attempt
    // expanded any value that happened to contain a newline, and the C-50
    // test caught it immediately: that rule would let *any* interpolated
    // value — a path out of a pack, a token out of a template — forge a
    // remedy line, which is precisely what C-50 forbids. Expansion is a
    // decision the EMITTER makes about a slot it constructed, never a
    // property the value can claim for itself.
    //
    // So `values` is escaped whole, newlines and all, exactly as before;
    // only a name passed in `lists` expands, and each of its items is
    // escaped as a value and then as a line.
    const listName = onlyPlaceholder(line);
    if (listName !== null && listName in lists) {
      const indent = /^\s*/.exec(line)?.[0] ?? '';
      for (const item of lists[listName] as readonly string[]) {
        out.push(escapeLine(indent + escapeValue(item)));
      }
      continue;
    }

    let had = false;
    const filled = line.replace(PLACEHOLDER, (whole, name: string) => {
      had = true;
      const v = data[name];
      // C-50, unchanged and unnegotiable: a value is escaped WHOLE,
      // newlines included, so no interpolated value can forge a line.
      return v === undefined ? whole : escapeValue(v);
    });
    // A line whose placeholders ALL rendered empty is omitted (F1 v4.7).
    // This is what makes a conditional line expressible: the `merge-json`
    // note on E-RECIPE-PRIMITIVE-UNKNOWN is one message line with two
    // declared values, one of them "". The alternative was a blank line in
    // every unknown-op diagnostic, or the CLI inventing prose the
    // catalogue does not govern.
    //
    // Guarded on `had`, so a template line that is deliberately blank —
    // there are none today — would still survive.
    if (had && filled.trim() === '') continue;
    out.push(escapeLine(filled));
  }
  return out;
}

/** The rendered message as one string, newline-joined — what reaches stderr. */
export function renderText(
  code: DiagnosticCode,
  data: Readonly<Record<string, string>> = {},
  lists: Readonly<Record<string, readonly string[]>> = {},
): string {
  return render(code, data, lists).join('\n');
}

/**
 * The one placeholder on a line that holds nothing else, or `null`.
 *
 * A list slot must be **the entire content** of its line: expanding one
 * placeholder inside a line of prose would produce a first line with the
 * prose and nine without it, which is not a message anybody wrote.
 */
function onlyPlaceholder(line: string): string | null {
  const m = /^\s*\{([A-Za-z][A-Za-z0-9]*)\}\s*$/.exec(line);
  return m === null ? null : (m[1] as string);
}
