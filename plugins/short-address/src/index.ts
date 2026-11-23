import type {
  AnalysisContext,
  FindingResult,
  IRulePlugin,
  PluginMetadata,
} from '@veridion/scanner-types';
import { FindingSeverity } from '@veridion/shared';

const metadata: PluginMetadata = {
  id: 'short-address',
  name: 'Short Address Attack Detector',
  version: '1.0.0',
  description:
    'Detects contracts vulnerable to short address attacks on EVM chains, where malformed ' +
    'calldata can shift ABI-encoded arguments.',
  severity: FindingSeverity.HIGH,
  category: 'SHORT_ADDRESS',
  chains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
  languages: ['solidity'],
  tags: ['short-address', 'calldata', 'abi-encoding', 'input-validation', 'evm'],
};

/** Matches ABI encoding helpers; longer names are listed first. */
const ABI_ENCODING =
  /\babi\.(?:encodeWithSelector|encodeWithSignature|encodePacked|encodeCall|encode)\s*\(/g;

/** Matches externally reachable functions with a body. */
const EXTERNAL_FUNCTION = /\bfunction\s+(\w+)\s*\(([^)]*)\)\s*(?:external|public)[^{;]*\{/g;

/** Returns the 1-based line number containing `index`. */
function lineNumberAt(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < source.length; i += 1) {
    if (source[i] === '\n') {
      line += 1;
    }
  }
  return line;
}

/** Returns the index of the closing delimiter matching the opening one. */
function findMatching(
  source: string,
  openIndex: number,
  openChar: string,
  closeChar: string,
): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === openChar) {
      depth += 1;
    } else if (char === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    }
  }
  return -1;
}

/** Heuristic: does the contract validate calldata length anywhere? */
function hasCalldataLengthCheck(source: string): boolean {
  return /\bmsg\.data\.length\b/.test(source) || /\.length\s*==\s*(?:20|32)\b/.test(source);
}

export class ShortAddressPlugin implements IRulePlugin {
  readonly metadata = metadata;

  async initialize(): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async analyze(context: AnalysisContext): Promise<FindingResult[]> {
    const findings: FindingResult[] = [];
    const filePath = `${context.contractName}.sol`;
    const source = context.sourceCode;
    const hasLengthCheck = hasCalldataLengthCheck(source);

    // Check 1: msg.sender embedded in ABI-encoded calldata without length checks.
    ABI_ENCODING.lastIndex = 0;
    let encodeMatch: RegExpExecArray | null;
    while ((encodeMatch = ABI_ENCODING.exec(source)) !== null) {
      const openIndex = encodeMatch.index + encodeMatch[0].length - 1;
      const closeIndex = findMatching(source, openIndex, '(', ')');
      if (closeIndex === -1) {
        continue;
      }

      const args = source.slice(openIndex + 1, closeIndex);
      if (!/\bmsg\.sender\b/.test(args) || hasLengthCheck) {
        continue;
      }

      const line = lineNumberAt(source, encodeMatch.index);
      findings.push({
        pluginId: this.metadata.id,
        title: 'Unvalidated msg.sender in ABI Encoding',
        description:
          'msg.sender is packed into ABI-encoded calldata without validating msg.data.length. ' +
          'A short address argument can shift encoded parameters and corrupt the call.',
        severity: FindingSeverity.HIGH,
        filePath,
        lineStart: line,
        lineEnd: line,
        codeSnippet: encodeMatch[0],
        recommendation:
          'Validate calldata length (e.g. require(msg.data.length == expectedLength)) before ' +
          'using msg.sender in ABI encoding.',
        confidence: 0.7,
        references: ['https://swcregistry.io/docs/SWC-134'],
      });
    }

    // Check 2: external/public functions taking an address without length validation.
    EXTERNAL_FUNCTION.lastIndex = 0;
    let functionMatch: RegExpExecArray | null;
    while ((functionMatch = EXTERNAL_FUNCTION.exec(source)) !== null) {
      const params = functionMatch[2] ?? '';
      if (!/\baddress\b/.test(params)) {
        continue;
      }

      const openIndex = functionMatch.index + functionMatch[0].length - 1;
      const closeIndex = findMatching(source, openIndex, '{', '}');
      const body = closeIndex === -1 ? '' : source.slice(openIndex + 1, closeIndex);

      if (/\bmsg\.data\.length\b/.test(body)) {
        continue;
      }

      const line = lineNumberAt(source, functionMatch.index);
      const functionName = functionMatch[1] ?? 'function';
      findings.push({
        pluginId: this.metadata.id,
        title: 'Missing Calldata Length Validation',
        description:
          `Externally reachable function "${functionName}" accepts an address argument but does ` +
          'not validate msg.data.length, leaving it open to short address attacks.',
        severity: FindingSeverity.MEDIUM,
        filePath,
        lineStart: line,
        lineEnd: line,
        codeSnippet: functionMatch[0].replace(/\s*\{$/, ''),
        recommendation:
          'Add a calldata length check such as require(msg.data.length == <expected>, "bad length") ' +
          'before decoding arguments.',
        confidence: 0.65,
        references: ['https://swcregistry.io/docs/SWC-134'],
      });
    }

    return findings;
  }

  getFixRecommendation(finding: FindingResult): string {
    return finding.recommendation;
  }

  supportsContext(context: AnalysisContext): boolean {
    return this.metadata.languages.includes(context.language);
  }
}
