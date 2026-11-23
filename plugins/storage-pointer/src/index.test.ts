import { describe, expect, it } from 'vitest';

import { FindingSeverity } from '@veridion/shared';

import { UninitializedStoragePlugin } from './index';

const context = (sourceCode: string, language = 'solidity') => ({
  contractName: 'Test',
  sourceCode,
  chain: 'ethereum',
  language,
  compilerVersion: '0.4.24',
  metadata: {},
});

describe('UninitializedStoragePlugin', () => {
  const plugin = new UninitializedStoragePlugin();

  it('exposes the expected metadata', () => {
    expect(plugin.metadata.id).toBe('storage-pointer');
    expect(plugin.metadata.category).toBe('UNINITIALIZED_STORAGE');
    expect(plugin.metadata.languages).toContain('solidity');
  });

  it('detects a struct declaration without an explicit data location', async () => {
    const source = `
contract Test {
    struct User { uint256 id; }
    function update() public {
        User u;
        u.id = 1;
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings.some((f) => f.title === 'Uninitialized Storage Pointer')).toBe(true);
  });

  it('detects an array declaration without an explicit data location', async () => {
    const source = `
contract Test {
    function update() public {
        uint256[] values;
        values[0] = 1;
    }
}`;

    const findings = await plugin.analyze(context(source));

    const finding = findings.find((f) => f.title === 'Uninitialized Storage Pointer');
    expect(finding).toBeDefined();
    expect(finding?.lineStart).toBe(4);
  });

  it('does not flag declarations that specify memory', async () => {
    const source = `
contract Test {
    struct User { uint256 id; }
    function update() public {
        User memory u;
        uint256[] memory values;
        u.id = 1;
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings).toHaveLength(0);
  });

  it('detects writes through an uninitialized storage reference', async () => {
    const source = `
contract Test {
    struct User { uint256 id; }
    function update() public {
        User storage u;
        u.id = 1;
    }
}`;

    const findings = await plugin.analyze(context(source));

    const finding = findings.find(
      (f) => f.title === 'Write Through Uninitialized Storage Reference',
    );
    expect(finding).toBeDefined();
    expect(finding?.severity).toBe('CRITICAL');
    expect(finding?.lineStart).toBe(6);
  });

  it('does not flag writes through an initialized storage reference', async () => {
    const source = `
contract Test {
    struct User { uint256 id; }
    User current;
    function update() public {
        User storage u = current;
        u.id = 1;
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings).toHaveLength(0);
  });

  it('returns the recommendation for a finding', () => {
    const recommendation = plugin.getFixRecommendation({
      pluginId: 'storage-pointer',
      title: 'Uninitialized Storage Pointer',
      description: 'test',
      severity: FindingSeverity.HIGH,
      filePath: 'Test.sol',
      lineStart: 1,
      lineEnd: 1,
      codeSnippet: '',
      recommendation: 'Add memory.',
      confidence: 0.75,
      references: [],
    });

    expect(recommendation).toBe('Add memory.');
  });

  it('only supports solidity contexts', () => {
    expect(plugin.supportsContext(context('contract A {}'))).toBe(true);
    expect(plugin.supportsContext(context('fn main() {}', 'rust'))).toBe(false);
  });
});
