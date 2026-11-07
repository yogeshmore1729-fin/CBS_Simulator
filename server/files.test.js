import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv, editEnv, parseProps, editProps } from "./files.js";

const SETENV = `#!/bin/bash

echo "Setting up Env for CBS Simulator"

export HSM_IP_PORT=\${HSM_IP_PORT:-10.128.19.201:1500}
export JDWP_BIND_ADDRESS=\${JDWP_BIND_ADDRESS:-$JDWP_PORT}
export RESTART_SERVICE=\${RESTART_SERVICE:1}
export CS_JVM_OPTIONS=\${CS_JVM_OPTIONS:-"-Xms512M -Xmx1G"}
#export CS_DEPLOY_KEY=\${CS_DEPLOY_KEY:-B0F442C55A3CB178}

#CBS RESPONSE
export DEBIT_RESP=\${DEBIT_RESP:-"00"}
export ENABLE_RND_010044=\${ENABLE_RND_010044:-"true"}   # DEBIT_TXN
export REDIS_PORT=\${REDIS_PORT:-6379}
`;

test("parseEnv reads defaults, comments and sections", () => {
  const v = Object.fromEntries(parseEnv(SETENV).map((e) => [e.key, e]));
  assert.equal(v.HSM_IP_PORT.value, "10.128.19.201:1500");
  assert.equal(v.CS_JVM_OPTIONS.value, "-Xms512M -Xmx1G");
  assert.equal(v.ENABLE_RND_010044.comment, "DEBIT_TXN");
  assert.equal(v.DEBIT_RESP.section, "CBS RESPONSE");
  assert.equal(v.REDIS_PORT.value, "6379");
  assert.equal(v.JDWP_BIND_ADDRESS.editable, false, "a default referencing another var is not a plain value");
  assert.equal(v.RESTART_SERVICE.editable, false, "non ${K:-v} forms are left alone");
  assert.equal(v.CS_DEPLOY_KEY, undefined, "commented-out exports are ignored");
});

test("editEnv changes only the targeted lines and keeps everything else", () => {
  const out = editEnv(SETENV, { DEBIT_RESP: "52", ENABLE_RND_010044: "false", NEW_VAR: 'a "b" $c' });
  const before = SETENV.split("\n"), after = out.split("\n");
  const changed = before.filter((l, i) => l !== after[i]);
  assert.deepEqual(changed, [
    'export DEBIT_RESP=${DEBIT_RESP:-"00"}',
    'export ENABLE_RND_010044=${ENABLE_RND_010044:-"true"}   # DEBIT_TXN',
  ]);
  assert.ok(out.includes('export DEBIT_RESP=${DEBIT_RESP:-"52"}'));
  assert.ok(out.includes('export ENABLE_RND_010044=${ENABLE_RND_010044:-"false"}   # DEBIT_TXN'));
  assert.ok(out.includes('export NEW_VAR=${NEW_VAR:-"a \\"b\\" \\$c"}'));
  const v = Object.fromEntries(parseEnv(out).map((e) => [e.key, e.value]));
  assert.equal(v.NEW_VAR, 'a "b" $c', "round trip through shell quoting");
  assert.equal(v.HSM_IP_PORT, "10.128.19.201:1500");
});

const PROPS = `#########################################################################
#DEBIT_TXN.last4AccNum=rc,delay,hold_response_flag DRC-102
010044.7789=00,100,false
#########################################################################
010044.0918=00,100,false
# dup : java.util.Properties keeps the last one
010044.0918=52,0,true
`;

test("parseProps keeps labels and last-wins duplicates", () => {
  const e = parseProps(PROPS);
  assert.deepEqual(e.map((x) => [x.key, x.value]), [["010044.7789", "00,100,false"], ["010044.0918", "52,0,true"]]);
  assert.equal(e[0].label, "DEBIT_TXN.last4AccNum=rc,delay,hold_response_flag DRC-102");
});

test("editProps updates in place, removes and appends with label", () => {
  const out = editProps(PROPS, { set: { "010044.7789": "91,0,true", "010045.1234": "00,0,false" }, remove: ["010044.0918"], labels: { "010045.1234": "CREDIT NEW" } });
  assert.ok(out.startsWith("#########################################################################\n#DEBIT_TXN.last4AccNum=rc,delay,hold_response_flag DRC-102\n010044.7789=91,0,true\n"));
  assert.ok(!out.includes("010044.0918="));
  assert.ok(out.trimEnd().endsWith("# CREDIT NEW\n010045.1234=00,0,false"));
  assert.deepEqual(parseProps(out).map((x) => x.key), ["010044.7789", "010045.1234"]);
});
