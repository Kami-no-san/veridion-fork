import type {
  AnalysisContext,
  FindingResult,
  IRulePlugin,
  PluginMetadata,
} from '@veridion/scanner-types';
import { FindingSeverity } from '@veridion/shared';

const metadata: PluginMetadata = {
  id: 'storage-pointer',
  name: 'Uninitialized Storage Pointer Detector',
  version: '1.0.0',
  description:
    'Detects uninitialized storage pointers in Solidity that can silently corrupt contract storage.',
  severity: FindingSeverity.HIGH,
  category: 'UNINITIALIZED_STORAGE',
  chains: ['ethereum', 'polygon', 'bsc', 'avalanche', 'arbitrum', 'optimism'],
  languages: ['solidity'],
  tags: ['storage', 'uninitialized-storage', 'storage-pointer', 'solidity', 'legacy'],
};

interface FunctionBody {
  start: number;
  end: number;
}

const STRUCT_DECLARATION = /^([A-Z]\w*)\s+(\w+)\s*(?:=|;)/;
const ARRAY_DECLARATION = /^([A-Za-z_]\w*)\s*(?:\[[^\]]*\]\s*)+(\w+)\s*(?:=|;)/;
const DYNAMIC_TYPE_DECLARATION = /^(string|bytes)\s+(\w+)\s*(?:=|;)/;
const MAPPING_DECLARATION = /^mapping\s*\([^)]*\)\s*(\w+)\s*(?:=|;)/;
const STORAGE_POINTER = /^([A-Za-z_]\w*(?:\s*\[[^\]]*\])*)\s+storage\s+(\w+)\s*;$/;

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

/** Locates the brace-delimited bodies of functions and constructors. */
function findFunctionBodies(source: string): FunctionBody[] {
  const bodies: FunctionBody[] = [];
  const signature = /\b(?:function|constructor|receive|fallback)\b[^{;]*\{/g;
  let match: RegExpExecArray | null;

  while ((match = signature.exec(source)) !== null) {
    const start = match.index + match[0].length;
    let depth = 1;
    let i = start;
    while (i < source.length && depth > 0) {
      const char = source[i];
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
      }
      i += 1;
    }
    bodies.push({ start, end: Math.max(start, i - 1) });
  }

  return bodies;
}

/**
 * Detects a local reference-type declaration that omits an explicit
 * `memory`/`storage`/`calldata` data location.
 */
function detectMissingLocation(line: string): { typeName: string; varName: string } | null {
  for (const pattern of [STRUCT_DECLARATION, ARRAY_DECLARATION, DYNAMIC_TYPE_DECLARATION]) {
    const match = pattern.exec(line);
    const typeName = match?.[1];
    const varName = match?.[2];
    if (typeName && varName) {
      return { typeName, varName };
    }
  }

  const mappingMatch = MAPPING_DECLARATION.exec(line);
  const varName = mappingMatch?.[1];
  if (varName) {
    return { typeName: 'mapping', varName };
  }

  return null;
}

export class UninitializedStoragePlugin implements IRulePlugin {
  readonly metadata = metadata;

  async initialize(): Promise<void> {
    // noop
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async analyze(context: AnalysisContext): Promise<FindingResult[]> {
    const findings: FindingResult[] = [];
    const filePath = `${context.contractName}.sol`;

    for (const body of findFunctionBodies(context.sourceCode)) {
      const lines = context.sourceCode.slice(body.start, body.end).split('\n');
      const baseLine = lineNumberAt(context.sourceCode, body.start);

      for (let i = 0; i < lines.length; i += 1) {
        const line = (lines[i] ?? '').trim();
        if (!line || line.startsWith('//') || line.startsWith('*') || line.startsWith('/*')) {
          continue;
        }

        const lineNo = baseLine + i;
        const hasDataLocation = /\b(?:memory|storage|calldata)\b/.test(line);

        if (!hasDataLocation) {
          const declaration = detectMissingLocation(line);
          if (declaration) {
            findings.push({
              pluginId: this.metadata.id,
              title: 'Uninitialized Storage Pointer',
              description:
                `Local ${declaration.typeName} "${declaration.varName}" is declared without an ` +
                'explicit data location. In Solidity <0.5.0 reference types default to storage, ' +
                'so this pointer aliases storage slot 0 and can corrupt unrelated state.',
              severity: FindingSeverity.HIGH,
              filePath,
              lineStart: lineNo,
              lineEnd: lineNo,
              codeSnippet: line,
              recommendation:
                `Add an explicit data location, e.g. "${declaration.typeName} memory ` +
                `${declaration.varName}" for in-memory values, or initialize the storage ` +
                'pointer from a known storage slot.',
              confidence: 0.75,
              references: ['https://swcregistry.io/docs/SWC-109'],
            });
            continue;
          }
        }

        const storagePointer = STORAGE_POINTER.exec(line);
        const pointerName = storagePointer?.[2];
        if (!pointerName) {
          continue;
        }

        const writePattern = new RegExp(`\\b${pointerName}\\s*(?:\\.\\w+|\\[[^\\]]*\\])\\s*=`);
        for (let j = i + 1; j < lines.length; j += 1) {
          const candidate = (lines[j] ?? '').trim();
          if (writePattern.test(candidate)) {
            const writeLine = baseLine + j;
            findings.push({
              pluginId: this.metadata.id,
              title: 'Write Through Uninitialized Storage Reference',
              description:
                `Storage pointer "${pointerName}" is declared without initialization and then ` +
                'written to. The write resolves against storage slot 0, overwriting unrelated ' +
                'contract state.',
              severity: FindingSeverity.CRITICAL,
              filePath,
              lineStart: writeLine,
              lineEnd: writeLine,
              codeSnippet: candidate,
              recommendation:
                `Initialize the storage pointer from a valid storage location before writing, ` +
                `e.g. "${storagePointer?.[1] ?? 'Type'} storage ${pointerName} = <stateVar>;".`,
              confidence: 0.85,
              references: ['https://swcregistry.io/docs/SWC-109'],
            });
            break;
          }
        }
      }
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
