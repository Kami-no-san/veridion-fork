import { describe, expect, it } from 'vitest';

import { FindingSeverity } from '@veridion/shared';

import { ShortAddressPlugin } from './index';

const context = (sourceCode: string, language = 'solidity') => ({
  contractName: 'Test',
  sourceCode,
  chain: 'ethereum',
  language,
  compilerVersion: '0.8.19',
  metadata: {},
});

describe('ShortAddressPlugin', () => {
  const plugin = new ShortAddressPlugin();

  it('exposes the expected metadata', () => {
    expect(plugin.metadata.id).toBe('short-address');
    expect(plugin.metadata.category).toBe('SHORT_ADDRESS');
    expect(plugin.metadata.languages).toContain('solidity');
  });

  it('detects msg.sender in ABI encoding without a length check', async () => {
    const source = `
contract Test {
    function forward() public {
        bytes memory payload = abi.encodePacked(msg.sender, uint256(1));
        (bool ok, ) = address(this).call(payload);
        require(ok);
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings.some((f) => f.title === 'Unvalidated msg.sender in ABI Encoding')).toBe(true);
  });

  it('does not flag ABI encoding when msg.data.length is validated', async () => {
    const source = `
contract Test {
    function forward() public {
        require(msg.data.length == 36, "bad length");
        bytes memory payload = abi.encodePacked(msg.sender, uint256(1));
        (bool ok, ) = address(this).call(payload);
        require(ok);
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings).toHaveLength(0);
  });

  it('detects external functions with an address argument but no length validation', async () => {
    const source = `
contract Test {
    mapping(address => uint256) balances;
    function transfer(address to, uint256 amount) external {
        balances[to] += amount;
    }
}`;

    const findings = await plugin.analyze(context(source));

    const finding = findings.find((f) => f.title === 'Missing Calldata Length Validation');
    expect(finding).toBeDefined();
    expect(finding?.lineStart).toBe(4);
  });

  it('does not flag external address functions that validate calldata length', async () => {
    const source = `
contract Test {
    mapping(address => uint256) balances;
    function transfer(address to, uint256 amount) external {
        require(msg.data.length == 68, "bad length");
        balances[to] += amount;
    }
}`;

    const findings = await plugin.analyze(context(source));

    expect(findings).toHaveLength(0);
  });

  it('returns the recommendation for a finding', () => {
    const recommendation = plugin.getFixRecommendation({
      pluginId: 'short-address',
      title: 'Missing Calldata Length Validation',
      description: 'test',
      severity: FindingSeverity.MEDIUM,
      filePath: 'Test.sol',
      lineStart: 1,
      lineEnd: 1,
      codeSnippet: '',
      recommendation: 'Check msg.data.length.',
      confidence: 0.65,
      references: [],
    });

    expect(recommendation).toBe('Check msg.data.length.');
  });

  it('only supports solidity contexts', () => {
    expect(plugin.supportsContext(context('contract A {}'))).toBe(true);
    expect(plugin.supportsContext(context('fn main() {}', 'rust'))).toBe(false);
  });
});
