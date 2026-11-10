import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const mobileRequire = createRequire(new URL('../../mobile/package.json', import.meta.url));
const React = mobileRequire('react');
const { renderToStaticMarkup } = mobileRequire('react-dom/server');
const ts = mobileRequire('typescript');

// Render the actual gate and navigator together. The router double records
// screen mounting; a hidden View does not prevent these child effects.
function renderStartup(user, status, bypass = false) {
  const mounted = [];
  const View = ({ children }) => React.createElement('div', null, children);
  const Stack = ({ children }) => React.createElement(React.Fragment, null, children);
  Stack.Protected = ({ guard, children }) => guard ? children : null;
  Stack.Screen = ({ name }) => { mounted.push(name); return null; };
  let stateIndex = 0;
  const mocks = {
    react: { ...React, useState: initial => React.useState(stateIndex++ === 0 ? status : initial) },
    'react-native': { View, Text: View, TouchableOpacity: View, StyleSheet: { create: s => s } },
    'expo-router': { Stack, useRouter: () => ({ replace() {} }), useSegments: () => ['(auth)', 'login'] },
    './KeyboardForm': { KeyboardForm: View },
    '../src/lib/supabase': { supabase: {} },
    './MfaSettings': { default: View, __esModule: true },
    '../../shared/user-error.mjs': { userError: () => 'Could not check access.' },
  };
  function load(file) {
    const source = readFileSync(new URL(`../../mobile/components/${file}.tsx`, import.meta.url), 'utf8');
    const { outputText } = ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true,
    } });
    const module = { exports: {} };
    vm.runInNewContext(outputText, {
      module, exports: module.exports, require: id => {
        assert.ok(id in mocks, `Unexpected dependency: ${id}`);
        return mocks[id];
      },
    }, { filename: file });
    return module.exports;
  }
  const gate = load('EligibilityGate');
  mocks['./EligibilityGate'] = gate;
  const Navigator = load('AppNavigator').default;
  renderToStaticMarkup(React.createElement(gate.default, { user, bypass }, React.createElement(Navigator, { accent: '#0EA5E9' })));
  return mounted;
}

for (const [name, user, status, bypass] of [
  ['signed out', null, null, false],
  ['checking member access', { id: 'alice' }, null, false],
  ['incomplete registration', { id: 'alice' }, { account: 'alice', setup_required: true }, false],
  ['MFA required', { id: 'alice' }, { account: 'alice', mfa_required: true }, false],
  ['guardian approval pending', { id: 'alice' }, { account: 'alice', ready: false }, false],
  ['stale eligibility after account switch', { id: 'bob' }, { account: 'alice', ready: true }, false],
  ['public route bypass while blocked', { id: 'alice' }, null, true],
]) {
  test(`startup does not mount member screens when ${name}`, () => {
    const mounted = renderStartup(user, status, bypass);
    assert.ok(mounted.includes('(auth)'));
    assert.ok(mounted.includes('auth/confirm'));
    assert.ok(mounted.includes('policies/[slug]'));
    assert.ok(mounted.includes('help/[slug]'));
    assert.equal(mounted.includes('(tabs)'), false);
    assert.equal(mounted.includes('post/[id]'), false);
    assert.equal(mounted.includes('chat/[id]'), false);
    assert.equal(mounted.includes('settings/account'), false);
  });
}
test('eligible current account mounts member screens', () => {
  const mounted = renderStartup({ id: 'alice' }, { account: 'alice', ready: true });
  assert.ok(mounted.includes('(tabs)'));
  assert.ok(mounted.includes('post/[id]'));
  assert.ok(mounted.includes('chat/[id]'));
  assert.ok(mounted.includes('settings/account'));
});
